#!/usr/bin/env npx tsx
// scripts/ingest-pending-nf-pmids.ts
// Fetches all PMIDs cited in nf_content that are NOT yet in the studies table,
// then runs the full ingest pipeline: PubMed metadata → embedding → biomarker/disease tags → insert.
//
// Usage:
//   npx tsx scripts/ingest-pending-nf-pmids.ts
//   npx tsx scripts/ingest-pending-nf-pmids.ts --dry-run   (preview counts only)

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
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
} catch { /* .env.local not found */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const PUBMED_API_KEY = process.env.PUBMED_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY)');
  process.exit(1);
}

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('============================================================');
  console.log('Ingest Pending NutritionFacts PMIDs');
  console.log('============================================================');
  if (DRY_RUN) console.log('[DRY RUN MODE]\n');

  // Step 1: Get all PMIDs from nf_content
  console.log('Collecting PMIDs from nf_content...');
  const allNfPmids = new Set<string>();
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nf_content?select=pmids&pmids=not.is.null&offset=${offset}&limit=${PAGE}`,
      { headers }
    );
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const rows: { pmids: string[] }[] = await res.json();
    for (const r of rows) {
      if (r.pmids) for (const p of r.pmids) allNfPmids.add(p);
    }
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`  Total unique PMIDs cited in NF content: ${allNfPmids.size}`);

  // Step 2: Get existing PMIDs from studies
  console.log('Checking which PMIDs are already in studies table...');
  const existingPmids = new Set<string>();
  offset = 0;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/studies?select=pmid&offset=${offset}&limit=${PAGE}`,
      { headers }
    );
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const rows: { pmid: string }[] = await res.json();
    for (const r of rows) existingPmids.add(r.pmid);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`  Total studies in DB: ${existingPmids.size}`);

  // Step 3: Find pending PMIDs
  const pendingPmids = [...allNfPmids].filter(p => !existingPmids.has(p));
  console.log(`  Pending PMIDs to ingest: ${pendingPmids.length}\n`);

  if (pendingPmids.length === 0) {
    console.log('All NF-cited PMIDs are already in the studies table!');
    return;
  }

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would ingest ${pendingPmids.length} studies. Run without --dry-run to proceed.`);
    return;
  }

  // Step 4: Run the ingest pipeline
  console.log(`Ingesting ${pendingPmids.length} studies from PubMed...\n`);

  // Dynamic import to use the project's pipeline
  const { ingestPmids } = await import('../src/lib/research/ingest-pipeline');
  const result = await ingestPmids(pendingPmids, {
    supabaseUrl: SUPABASE_URL,
    supabaseServiceKey: SUPABASE_KEY,
    openaiApiKey: OPENAI_API_KEY,
    pubmedApiKey: PUBMED_API_KEY,
    source: 'nutritionfacts',
    batchSize: 100,
    embedBatchSize: 50,
    pubmedDelayMs: 120,
    embedDelayMs: 200,
    onProgress: (msg) => console.log(msg),
  });

  console.log('\n============================================================');
  console.log(`Done! Total: ${result.total}, Inserted: ${result.inserted}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
  console.log('============================================================');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
