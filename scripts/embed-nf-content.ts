#!/usr/bin/env npx tsx
// scripts/embed-nf-content.ts
// Generates OpenAI embeddings for nf_content records (NutritionFacts.org videos, blogs, Q&A)
// and applies biomarker/disease tagging.
//
// Usage:
//   npx tsx scripts/embed-nf-content.ts [--batch-size 20] [--limit 100] [--dry-run]
//
// Environment variables required (loaded from .env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   OPENAI_API_KEY

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch {
  // rely on environment
}

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasFlag = (flag: string) => args.includes(flag);

const BATCH_SIZE = parseInt(getArg('--batch-size') ?? '20', 10);
const LIMIT = getArg('--limit') ? parseInt(getArg('--limit')!, 10) : undefined;
const DRY_RUN = hasFlag('--dry-run');

// ── Validate env ─────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error('Missing env vars. Add NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY to .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Biomarker keywords (simplified from biomarker-mapper.ts) ─────────────────
import { BIOMARKER_MAP } from '../src/lib/research/biomarker-mapper';
import { DISEASE_MAP } from '../src/lib/research/disease-mapper';

function detectBiomarkers(text: string): string[] {
  const lower = text.toLowerCase();
  const slugs: string[] = [];
  for (const bm of BIOMARKER_MAP) {
    if (bm.searchTerms.some(term => lower.includes(term.toLowerCase()))) {
      slugs.push(bm.slug);
    }
  }
  return slugs;
}

function detectDiseases(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  for (const dm of DISEASE_MAP) {
    if (dm.searchTerms.some(term => lower.includes(term.toLowerCase()))) {
      tags.push(dm.tag);
    }
  }
  return tags;
}

// ── OpenAI embedding ─────────────────────────────────────────────────────────
async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts.map(t => t.slice(0, 8000)),
      dimensions: 1536,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((d: any) => d.embedding as number[]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('NutritionFacts.org Content — Embedding Pipeline');
  console.log('='.repeat(60));
  console.log(`Batch size: ${BATCH_SIZE}`);
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  if (DRY_RUN) console.log('DRY RUN — no writes');
  console.log('');

  // Fetch ALL records that need embedding (paginate to avoid Supabase 1000-row limit)
  const PAGE_SIZE = 1000;
  let records: any[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from('nf_content')
      .select('id, slug, title, content_type, transcript')
      .is('embedding', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    const { data: page, error: pageError } = await query;
    if (pageError) {
      console.error('Error fetching records:', pageError.message);
      process.exit(1);
    }
    if (!page || page.length === 0) break;
    records.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (LIMIT) records = records.slice(0, LIMIT);

  if (records.length === 0) {
    console.log('All nf_content records already have embeddings!');
    return;
  }

  console.log(`Found ${records.length} records needing embeddings\n`);

  let processed = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    // Build embedding text: title + transcript (truncated to 8000 chars)
    const texts = batch.map(r => {
      const parts = [r.title];
      if (r.transcript) parts.push(r.transcript);
      return parts.join('\n\n');
    });

    try {
      const embeddings = await embedBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        const record = batch[j];
        const embedding = embeddings[j];

        // Detect biomarkers and diseases from title + transcript
        const fullText = texts[j];
        const biomarkerSlugs = detectBiomarkers(fullText);
        const diseaseTags = detectDiseases(fullText);

        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('nf_content')
            .update({
              embedding: JSON.stringify(embedding),
              biomarker_slugs: biomarkerSlugs.length > 0 ? biomarkerSlugs : null,
              disease_tags: diseaseTags.length > 0 ? diseaseTags : null,
            })
            .eq('id', record.id);

          if (updateError) {
            console.error(`  Error updating ${record.slug}: ${updateError.message}`);
            errors++;
            continue;
          }
        }

        processed++;
      }

      const pct = Math.round((i + batch.length) / records.length * 100);
      console.log(`  ${i + batch.length}/${records.length} (${pct}%) — batch of ${batch.length} embedded` +
        (DRY_RUN ? ' [dry run]' : ''));

      // Small delay to respect OpenAI rate limits
      if (i + BATCH_SIZE < records.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err: any) {
      console.error(`  Batch error at offset ${i}: ${err.message}`);
      errors++;
      // Wait longer on error (probably rate limit)
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Done! Processed: ${processed}, Errors: ${errors}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
