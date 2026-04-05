#!/usr/bin/env npx tsx
// scripts/sync-all-nf-content.ts
// One-time deep scrape of ALL NutritionFacts.org content (videos, blogs, questions).
// Uses the WordPress REST API to paginate through ALL pages, not just the most recent 3.
// Run this once to fill gaps from the initial scrape, then rely on the weekly cron sync.
//
// Usage:
//   npx tsx scripts/sync-all-nf-content.ts
//   npx tsx scripts/sync-all-nf-content.ts --dry-run   (preview without inserting)

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
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY)');
  process.exit(1);
}

const NF_BASE = 'https://nutritionfacts.org';
const WP_API = `${NF_BASE}/wp-json/wp/v2`;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface WpPost {
  slug: string;
  title: { rendered: string };
  date: string;
  link: string;
}

function extractTranscript(html: string): string {
  // Video transcripts
  const transcriptMatch = html.match(/id="collapseTranscript"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (transcriptMatch) {
    return transcriptMatch[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Blog posts / questions — main content area
  const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<footer|<\/article)/i);
  if (contentMatch) {
    return contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

function extractPmids(html: string): string[] {
  const pmidSet = new Set<string>();
  const regex = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{5,})/g;
  let match;
  while ((match = regex.exec(html)) !== null) pmidSet.add(match[1]);
  return [...pmidSet];
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000), dimensions: 1536 }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

const BIOMARKER_KEYWORDS: Record<string, string[]> = {
  ldl_c: ['ldl cholesterol', 'low-density lipoprotein', 'ldl-c'],
  hdl_c: ['hdl cholesterol', 'high-density lipoprotein', 'hdl-c'],
  triglycerides: ['triglycerides', 'hypertriglyceridemia'],
  hba1c: ['hemoglobin a1c', 'glycated hemoglobin', 'hba1c'],
  fasting_glucose: ['fasting glucose', 'blood sugar fasting', 'fasting blood glucose'],
  crp: ['c-reactive protein', 'crp', 'inflammation marker'],
  homocysteine: ['homocysteine', 'hyperhomocysteinemia'],
  vitamin_d: ['vitamin d', '25-hydroxyvitamin', '25(oh)d'],
  vitamin_b12: ['vitamin b12', 'cobalamin', 'methylcobalamin'],
  iron: ['iron', 'ferritin', 'iron deficiency', 'hemoglobin'],
  omega3_index: ['omega-3', 'epa', 'dha', 'fish oil'],
};

const DISEASE_KEYWORDS: Record<string, string[]> = {
  cardiovascular: ['cardiovascular', 'heart disease', 'coronary', 'cardiac'],
  hypertension: ['hypertension', 'blood pressure', 'high blood pressure'],
  diabetes_t2: ['type 2 diabetes', 'insulin resistance', 'diabetes mellitus'],
  obesity: ['obesity', 'overweight', 'body mass index', 'bmi', 'weight loss'],
  cancer: ['cancer', 'tumor', 'carcinoma', 'malignant'],
  alzheimers: ['alzheimer', 'dementia', 'cognitive decline'],
  depression: ['depression', 'depressive', 'mental health'],
  inflammation: ['inflammation', 'inflammatory', 'anti-inflammatory'],
  aging: ['aging', 'longevity', 'lifespan', 'anti-aging'],
  gut_microbiome: ['microbiome', 'gut bacteria', 'probiotics', 'prebiotic'],
};

function detectKeywords(text: string, map: Record<string, string[]>): string[] {
  const lower = text.toLowerCase();
  return Object.entries(map).filter(([, terms]) => terms.some(t => lower.includes(t))).map(([slug]) => slug);
}

function cleanTitle(title: string): string {
  return title.replace(/&#8217;/g, "'").replace(/&#8211;/g, '–').replace(/&amp;/g, '&').replace(/&#8230;/g, '…').replace(/&#038;/g, '&');
}

// ── Fetch existing slugs from Supabase (paginated) ─────────────────────────

async function fetchExistingSlugs(): Promise<Set<string>> {
  const slugs = new Set<string>();
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nf_content?select=slug&offset=${offset}&limit=${PAGE}`,
      { headers }
    );
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const rows: { slug: string }[] = await res.json();
    for (const r of rows) slugs.add(r.slug);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return slugs;
}

// ── Fetch ALL posts from a WP endpoint ──────────────────────────────────────

async function fetchAllWpPosts(endpoint: string, perPage = 50): Promise<WpPost[]> {
  const allPosts: WpPost[] = [];
  let page = 1;
  let totalPages = 999;

  while (page <= totalPages) {
    const url = `${WP_API}/${endpoint}?per_page=${perPage}&page=${page}&orderby=date&order=desc`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Evidalife Research Engine/1.0' },
    });

    if (!res.ok) {
      if (res.status === 400) break; // Past last page
      console.error(`  WP API error on ${endpoint} page ${page}: ${res.status}`);
      break;
    }

    // Read total pages from header on first request
    if (page === 1) {
      const wpTotal = res.headers.get('X-WP-Total');
      const wpPages = res.headers.get('X-WP-TotalPages');
      totalPages = wpPages ? parseInt(wpPages) : 999;
      console.log(`  ${endpoint}: ${wpTotal} total items across ${totalPages} pages`);
    }

    const posts: WpPost[] = await res.json();
    if (posts.length === 0) break;
    allPosts.push(...posts);

    if (page % 10 === 0) console.log(`  ${endpoint}: fetched ${allPosts.length} items (page ${page}/${totalPages})`);

    page++;
    await sleep(200); // Be polite to NF servers
  }

  return allPosts;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('============================================================');
  console.log('NutritionFacts.org — Deep Re-Scrape (ALL content)');
  console.log('============================================================');
  if (DRY_RUN) console.log('[DRY RUN MODE — no inserts will be made]\n');

  // Step 1: Get existing slugs
  console.log('Loading existing slugs from database...');
  const existingSlugs = await fetchExistingSlugs();
  console.log(`  ${existingSlugs.size} items already in DB\n`);

  // Step 2: Fetch ALL posts from WP API
  console.log('Fetching all content from NutritionFacts.org WordPress API...');
  const [allVideos, allBlogs, allQuestions] = await Promise.all([
    fetchAllWpPosts('video', 50),
    fetchAllWpPosts('posts', 50),
    fetchAllWpPosts('questions', 50),
  ]);

  console.log(`\nTotal from WP API: ${allVideos.length} videos, ${allBlogs.length} blogs, ${allQuestions.length} questions`);

  // Step 3: Filter to new items
  const newItems = [
    ...allVideos.filter(p => !existingSlugs.has(p.slug)).map(p => ({ ...p, content_type: 'video' as const })),
    ...allBlogs.filter(p => !existingSlugs.has(p.slug)).map(p => ({ ...p, content_type: 'blog' as const })),
    ...allQuestions.filter(p => !existingSlugs.has(p.slug)).map(p => ({ ...p, content_type: 'question' as const })),
  ];

  const newVideos = newItems.filter(i => i.content_type === 'video').length;
  const newBlogs = newItems.filter(i => i.content_type === 'blog').length;
  const newQuestions = newItems.filter(i => i.content_type === 'question').length;

  console.log(`New items to scrape: ${newVideos} videos, ${newBlogs} blogs, ${newQuestions} questions (${newItems.length} total)\n`);

  if (newItems.length === 0) {
    console.log('Nothing new to add — database is fully synced!');
    return;
  }

  if (DRY_RUN) {
    console.log('[DRY RUN] Would process these new items. Run without --dry-run to insert.');
    return;
  }

  // Step 4: Scrape each new item (transcript + PMIDs) and insert
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  let totalNewPmids = 0;
  const batchRows: any[] = [];
  const BATCH_SIZE = 10; // Insert in batches of 10

  for (const item of newItems) {
    processed++;
    const pct = Math.round((processed / newItems.length) * 100);
    try {
      // Fetch full page
      const pageRes = await fetch(item.link, {
        headers: { 'User-Agent': 'Evidalife Research Engine/1.0' },
      });
      if (!pageRes.ok) {
        console.log(`  [${pct}%] SKIP ${item.slug}: HTTP ${pageRes.status}`);
        errors++;
        continue;
      }
      const html = await pageRes.text();

      const transcript = extractTranscript(html);
      const pmids = extractPmids(html);

      if (!transcript && item.content_type === 'video') {
        console.log(`  [${pct}%] SKIP ${item.slug}: no transcript`);
        errors++;
        continue;
      }

      // Generate embedding
      const embeddingText = `${cleanTitle(item.title.rendered)}\n\n${transcript}`;
      let embedding: number[] | null = null;
      try {
        embedding = await embedText(embeddingText);
      } catch (e: any) {
        console.log(`  [${pct}%] WARN ${item.slug}: embedding failed — ${e.message}`);
      }

      // Detect tags
      const biomarkerSlugs = detectKeywords(embeddingText, BIOMARKER_KEYWORDS);
      const diseaseTags = detectKeywords(embeddingText, DISEASE_KEYWORDS);

      batchRows.push({
        slug: item.slug,
        title: cleanTitle(item.title.rendered),
        content_type: item.content_type,
        transcript: transcript || cleanTitle(item.title.rendered),
        pmids: pmids.length > 0 ? pmids : null,
        url: item.link,
        embedding: embedding ? JSON.stringify(embedding) : null,
        biomarker_slugs: biomarkerSlugs.length > 0 ? biomarkerSlugs : null,
        disease_tags: diseaseTags.length > 0 ? diseaseTags : null,
      });

      totalNewPmids += pmids.length;
      console.log(`  [${pct}%] ${item.content_type}: ${item.slug} — ${pmids.length} PMIDs, ${transcript.length} chars`);

      // Insert batch
      if (batchRows.length >= BATCH_SIZE) {
        await insertBatch(batchRows.splice(0, BATCH_SIZE));
        inserted += BATCH_SIZE;
      }

      await sleep(300); // Be polite to NF servers
    } catch (e: any) {
      console.log(`  [${pct}%] ERROR ${item.slug}: ${e.message}`);
      errors++;
    }
  }

  // Insert remaining
  if (batchRows.length > 0) {
    await insertBatch(batchRows);
    inserted += batchRows.length;
  }

  console.log('\n============================================================');
  console.log(`Done! Processed: ${processed}, Inserted: ${inserted}, Errors: ${errors}`);
  console.log(`New PMID references found: ${totalNewPmids}`);
  console.log('============================================================');
  console.log('\nNext step: run the pending PMIDs ingestion to fetch abstracts:');
  console.log('  npx tsx scripts/ingest-pending-nf-pmids.ts');
}

async function insertBatch(rows: any[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/nf_content?on_conflict=slug`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  INSERT ERROR: ${err}`);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
