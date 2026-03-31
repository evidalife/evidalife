#!/usr/bin/env npx tsx
// scripts/ingest-studies.ts
// CLI script to run the study ingestion pipeline
//
// Usage:
//   npx tsx scripts/ingest-studies.ts [options]
//
// Options:
//   --source greger|pubmed_nutrition|pubmed_longevity  (default: greger)
//   --include-videos    Also scrape NutritionFacts.org video citations
//   --dry-run           Fetch + embed but don't write to DB
//   --limit N           Only process first N PMIDs (for testing)
//   --pmids 1234,5678   Ingest specific PMIDs directly
//
// Environment variables required:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   OPENAI_API_KEY
//   PUBMED_API_KEY (optional, but increases rate limit to 10 req/sec)

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (avoids dotenv dependency)
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
  // .env.local not found — rely on environment variables already set
}

import { collectGregerPmids } from '../src/lib/research/ingest-greger';
import { searchPubMed } from '../src/lib/research/pubmed-api';
import { ingestPmids } from '../src/lib/research/ingest-pipeline';

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasFlag = (flag: string) => args.includes(flag);

const source = getArg('--source') ?? 'greger';
const includeVideos = hasFlag('--include-videos');
const dryRun = hasFlag('--dry-run');
const limit = getArg('--limit') ? parseInt(getArg('--limit')!, 10) : undefined;
const specificPmids = getArg('--pmids')?.split(',').map(p => p.trim());

// ── Validate env ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBMED_API_KEY = process.env.PUBMED_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required env vars:');
  if (!SUPABASE_URL) console.error('  NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('  SUPABASE_SERVICE_ROLE_KEY');
  if (!OPENAI_API_KEY) console.error('  OPENAI_API_KEY');
  console.error('\nAdd them to .env.local');
  process.exit(1);
}

// ── PubMed nutrition/longevity search queries ─────────────────────────────────
const PUBMED_NUTRITION_QUERIES = [
  'plant-based diet cardiovascular disease',
  'whole food plant-based diet biomarkers',
  'dietary intervention inflammation CRP',
  'nutrition longevity all-cause mortality',
  'omega-3 fatty acids cardiovascular outcomes',
  'Mediterranean diet health outcomes',
  'fiber intake gut microbiome health',
  'vitamin D supplementation health outcomes',
  'magnesium deficiency disease',
  'processed food chronic disease',
];

const PUBMED_LONGEVITY_QUERIES = [
  'caloric restriction longevity humans',
  'exercise all-cause mortality epidemiology',
  'sleep duration health outcomes',
  'intermittent fasting metabolic health',
  'telomere length aging lifestyle',
  'epigenetic clock biological age intervention',
  'VO2max mortality prediction',
  'strength training older adults outcomes',
  'blue zones longevity diet',
  'sirtuins NAD aging',
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('Evidalife Research Engine — Study Ingestion Pipeline');
  console.log('='.repeat(60));
  console.log(`Source:         ${source}`);
  console.log(`Include videos: ${includeVideos}`);
  console.log(`Dry run:        ${dryRun}`);
  console.log(`PubMed API key: ${PUBMED_API_KEY ? 'yes' : 'no (rate limited to 3/sec)'}`);
  if (limit) console.log(`Limit:          ${limit} PMIDs`);
  console.log('');

  let pmids: string[] = [];

  // Collect PMIDs from the appropriate source
  if (specificPmids?.length) {
    pmids = specificPmids;
    console.log(`Using ${pmids.length} directly specified PMIDs`);
  } else if (source === 'greger') {
    console.log('Collecting PMIDs from Greger/NutritionFacts.org sources...');
    const { pmids: collected, stats } = await collectGregerPmids({
      includeVideos,
      maxVideoPages: 30,
    });
    pmids = collected;
    console.log('\nCollection stats:');
    for (const [label, count] of Object.entries(stats)) {
      console.log(`  ${label}: ${count} PMIDs found`);
    }
  } else if (source === 'pubmed_nutrition') {
    console.log('Searching PubMed for nutrition studies...');
    for (const query of PUBMED_NUTRITION_QUERIES) {
      console.log(`  Searching: "${query}"`);
      const results = await searchPubMed(query, {
        maxResults: 500,
        apiKey: PUBMED_API_KEY,
        minYear: 2004,
      });
      pmids.push(...results);
      console.log(`    Found ${results.length} PMIDs`);
    }
    pmids = [...new Set(pmids)]; // deduplicate
  } else if (source === 'pubmed_longevity') {
    console.log('Searching PubMed for longevity studies...');
    for (const query of PUBMED_LONGEVITY_QUERIES) {
      console.log(`  Searching: "${query}"`);
      const results = await searchPubMed(query, {
        maxResults: 500,
        apiKey: PUBMED_API_KEY,
        minYear: 2004,
      });
      pmids.push(...results);
      console.log(`    Found ${results.length} PMIDs`);
    }
    pmids = [...new Set(pmids)];
  } else {
    console.error(`Unknown source: ${source}. Use greger, pubmed_nutrition, or pubmed_longevity`);
    process.exit(1);
  }

  console.log(`\nTotal unique PMIDs collected: ${pmids.length}`);

  if (limit) {
    pmids = pmids.slice(0, limit);
    console.log(`Limited to first ${pmids.length} PMIDs for this run`);
  }

  if (pmids.length === 0) {
    console.log('No PMIDs to process. Exiting.');
    return;
  }

  // Estimate cost
  const avgTokensPerStudy = 300; // title + abstract
  const totalTokens = pmids.length * avgTokensPerStudy;
  const costUsd = (totalTokens / 1_000_000) * 0.02;
  console.log(`\nEstimated embedding cost: ~$${costUsd.toFixed(2)} USD`);
  console.log(`Estimated time: ~${Math.ceil(pmids.length / 100 * 2)} minutes`);
  console.log('');

  // Run ingestion
  const startTime = Date.now();
  const result = await ingestPmids(pmids, {
    supabaseUrl: SUPABASE_URL!,
    supabaseServiceKey: SUPABASE_SERVICE_KEY!,
    openaiApiKey: OPENAI_API_KEY!,
    pubmedApiKey: PUBMED_API_KEY,
    source,
    batchSize: 100,
    embedBatchSize: 50,
    pubmedDelayMs: PUBMED_API_KEY ? 110 : 350, // 9/sec with key, ~3/sec without
    embedDelayMs: 200,
    dryRun,
    onProgress: console.log,
  });

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n' + '='.repeat(60));
  console.log('Ingestion Complete');
  console.log('='.repeat(60));
  console.log(`Total PMIDs:  ${result.total}`);
  console.log(`Inserted:     ${result.inserted}`);
  console.log(`Skipped:      ${result.skipped} (already in DB)`);
  console.log(`Errors:       ${result.errors}`);
  console.log(`Time elapsed: ${elapsed}s`);
  if (dryRun) console.log('\n⚠️  Dry run — no data was written to the database');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
