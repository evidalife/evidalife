// src/app/api/cron/nf-sync/route.ts
// Weekly cron job: sync new NutritionFacts.org content + auto-ingest cited PMIDs.
// Called by Vercel cron every Sunday at 04:00 UTC, or manually via admin panel.
// Protected by CRON_SECRET header.
//
// Pipeline:
//   1. Fetch new videos/blogs/questions from NF WordPress API
//   2. Scrape each page for transcript + PubMed citations
//   3. Generate embeddings + detect biomarker/disease tags
//   4. Insert into nf_content
//   5. Auto-ingest any new PMIDs into studies table
//
// Records results in nf_sync_jobs table for admin panel visibility.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 300; // 5 min

// ── WordPress REST API helpers (same as admin nf-sync route) ────────────────

const NF_BASE = 'https://nutritionfacts.org';
const WP_API = `${NF_BASE}/wp-json/wp/v2`;

interface WpPost {
  slug: string;
  title: { rendered: string };
  date: string;
  link: string;
}

async function fetchNewWpPosts(
  endpoint: string,
  existingSlugs: Set<string>,
  perPage = 20,
  maxPages = 5
): Promise<WpPost[]> {
  const newPosts: WpPost[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${WP_API}/${endpoint}?per_page=${perPage}&page=${page}&orderby=date&order=desc`, {
      headers: { 'User-Agent': 'Evidalife Research Engine/1.0 (weekly cron)' },
    });
    if (!res.ok) break;
    const posts: WpPost[] = await res.json();
    if (posts.length === 0) break;
    let foundExisting = false;
    for (const post of posts) {
      if (existingSlugs.has(post.slug)) { foundExisting = true; break; }
      newPosts.push(post);
    }
    if (foundExisting) break;
  }
  return newPosts;
}

function extractTranscript(html: string): string {
  const transcriptMatch = html.match(/id="collapseTranscript"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (transcriptMatch) return transcriptMatch[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<footer|<\/article)/i);
  if (contentMatch) return contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  return '';
}

function extractPmids(html: string): string[] {
  const pmidSet = new Set<string>();
  const regex = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{5,})/g;
  let match;
  while ((match = regex.exec(html)) !== null) pmidSet.add(match[1]);
  return [...pmidSet];
}

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000), dimensions: 1536 }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

const BIOMARKER_KEYWORDS: Record<string, string[]> = {
  ldl_c: ['ldl cholesterol', 'low-density lipoprotein', 'ldl-c'],
  hdl_c: ['hdl cholesterol', 'high-density lipoprotein', 'hdl-c'],
  triglycerides: ['triglycerides'], hba1c: ['hemoglobin a1c', 'hba1c'],
  fasting_glucose: ['fasting glucose', 'fasting blood glucose'],
  crp: ['c-reactive protein', 'crp'], homocysteine: ['homocysteine'],
  vitamin_d: ['vitamin d', '25-hydroxyvitamin'], vitamin_b12: ['vitamin b12', 'cobalamin'],
  iron: ['iron', 'ferritin'], omega3_index: ['omega-3', 'epa', 'dha'],
};

const DISEASE_KEYWORDS: Record<string, string[]> = {
  cardiovascular: ['cardiovascular', 'heart disease', 'coronary'],
  hypertension: ['hypertension', 'blood pressure'], diabetes_t2: ['type 2 diabetes', 'insulin resistance'],
  obesity: ['obesity', 'overweight', 'bmi', 'weight loss'], cancer: ['cancer', 'tumor', 'carcinoma'],
  alzheimers: ['alzheimer', 'dementia'], depression: ['depression', 'depressive'],
  inflammation: ['inflammation', 'inflammatory'], aging: ['aging', 'longevity', 'lifespan'],
  gut_microbiome: ['microbiome', 'gut bacteria', 'probiotics'],
};

function detectKeywords(text: string, map: Record<string, string[]>): string[] {
  const lower = text.toLowerCase();
  return Object.entries(map).filter(([, terms]) => terms.some(t => lower.includes(t))).map(([slug]) => slug);
}

// ── GET handler (Vercel cron calls GET) ─────────────────────────────────────

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  const supabase = createAdminClient();

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('nf_sync_jobs')
    .insert({ status: 'running', started_at: new Date().toISOString() })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create sync job' }, { status: 500 });
  }

  const jobId = job.id;
  const logLines: string[] = [];
  const log = (msg: string) => { logLines.push(msg); console.log(`[nf-cron] ${msg}`); };

  try {
    log('Weekly NF sync started (cron)');

    // Get existing slugs (paginated)
    const allSlugs: string[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page } = await supabase
        .from('nf_content').select('slug')
        .order('created_at', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (!page || page.length === 0) break;
      allSlugs.push(...page.map((r: any) => r.slug));
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    const existingSlugs = new Set(allSlugs);
    log(`Existing NF content: ${existingSlugs.size} items`);

    // Fetch new content (5 pages per type — covers ~100 new items/week max)
    const [newVideos, newBlogs, newQuestions] = await Promise.all([
      fetchNewWpPosts('video', existingSlugs, 20, 5),
      fetchNewWpPosts('posts', existingSlugs, 20, 5),
      fetchNewWpPosts('questions', existingSlugs, 10, 3),
    ]);

    log(`New: ${newVideos.length} videos, ${newBlogs.length} blogs, ${newQuestions.length} questions`);

    const allNew = [
      ...newVideos.map(p => ({ ...p, content_type: 'video' })),
      ...newBlogs.map(p => ({ ...p, content_type: 'blog' })),
      ...newQuestions.map(p => ({ ...p, content_type: 'question' })),
    ];

    if (allNew.length === 0) {
      log('No new content — sync complete');
      await supabase.from('nf_sync_jobs').update({
        status: 'completed', log_lines: logLines, completed_at: new Date().toISOString(),
      }).eq('id', jobId);
      return NextResponse.json({ jobId, status: 'completed', newContent: 0, newPmids: 0, pmidsIngested: 0 });
    }

    // Scrape each page for transcript + PMIDs
    const newPmidsSet = new Set<string>();
    const insertRows: any[] = [];

    for (const item of allNew) {
      try {
        const pageRes = await fetch(item.link, { headers: { 'User-Agent': 'Evidalife Research Engine/1.0 (cron)' } });
        if (!pageRes.ok) { log(`  Skip ${item.slug}: HTTP ${pageRes.status}`); continue; }
        const html = await pageRes.text();

        const transcript = extractTranscript(html);
        const pmids = extractPmids(html);

        if (!transcript && item.content_type === 'video') { log(`  Skip ${item.slug}: no transcript`); continue; }

        const embeddingText = `${item.title.rendered}\n\n${transcript}`;
        let embedding: number[] | null = null;
        try { embedding = await embedText(embeddingText, OPENAI_API_KEY); } catch (e: any) { log(`  Embed fail ${item.slug}: ${e.message}`); }

        const biomarkerSlugs = detectKeywords(embeddingText, BIOMARKER_KEYWORDS);
        const diseaseTags = detectKeywords(embeddingText, DISEASE_KEYWORDS);

        insertRows.push({
          slug: item.slug,
          title: item.title.rendered.replace(/&#8217;/g, "'").replace(/&#8211;/g, '–').replace(/&amp;/g, '&').replace(/&#8230;/g, '…'),
          content_type: item.content_type,
          transcript: transcript || item.title.rendered,
          pmids: pmids.length > 0 ? pmids : null,
          url: item.link,
          embedding: embedding ? JSON.stringify(embedding) : null,
          biomarker_slugs: biomarkerSlugs.length > 0 ? biomarkerSlugs : null,
          disease_tags: diseaseTags.length > 0 ? diseaseTags : null,
        });

        for (const pmid of pmids) newPmidsSet.add(pmid);
        log(`  ${item.content_type}: ${item.slug} — ${pmids.length} PMIDs`);
        await new Promise(r => setTimeout(r, 300));
      } catch (e: any) { log(`  Error ${item.slug}: ${e.message}`); }
    }

    // Insert new content
    if (insertRows.length > 0) {
      const { error: insertError } = await supabase
        .from('nf_content').upsert(insertRows, { onConflict: 'slug' });
      if (insertError) log(`Insert error: ${insertError.message}`);
      else log(`Inserted ${insertRows.length} new content items`);
    }

    // Check which PMIDs are new
    const newPmidArr = [...newPmidsSet];
    let trulyNewPmids: string[] = [];
    if (newPmidArr.length > 0) {
      const { data: existingStudies } = await supabase
        .from('studies').select('pmid').in('pmid', newPmidArr);
      const existingPmidSet = new Set((existingStudies ?? []).map((s: any) => s.pmid));
      trulyNewPmids = newPmidArr.filter(p => !existingPmidSet.has(p));
    }
    log(`PMIDs found: ${newPmidsSet.size} total, ${trulyNewPmids.length} new`);

    // Auto-ingest new PMIDs into studies table
    let pmidsIngested = 0;
    if (trulyNewPmids.length > 0) {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        try {
          log(`Auto-ingesting ${trulyNewPmids.length} new PMIDs...`);
          const { ingestPmids } = await import('@/lib/research/ingest-pipeline');
          const result = await ingestPmids(trulyNewPmids, {
            supabaseUrl: SUPABASE_URL,
            supabaseServiceKey: SUPABASE_SERVICE_KEY,
            openaiApiKey: OPENAI_API_KEY,
            pubmedApiKey: process.env.PUBMED_API_KEY,
            source: 'nutritionfacts',
            onProgress: (msg: string) => log(msg),
          });
          pmidsIngested = result.inserted;
          log(`Auto-ingest done: ${result.inserted} inserted, ${result.skipped} skipped, ${result.errors} errors`);
        } catch (e: any) { log(`Auto-ingest error: ${e.message}`); }
      }
    }

    // Update job
    await supabase.from('nf_sync_jobs').update({
      status: 'completed',
      new_videos: newVideos.length, new_blogs: newBlogs.length, new_questions: newQuestions.length,
      new_pmids_found: trulyNewPmids.length, new_pmids_ingested: pmidsIngested,
      total_embedded: insertRows.filter(r => r.embedding).length,
      log_lines: logLines, completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return NextResponse.json({
      jobId, status: 'completed',
      newContent: insertRows.length, newPmids: trulyNewPmids.length, pmidsIngested,
    });

  } catch (err: any) {
    log(`Fatal error: ${err.message}`);
    await supabase.from('nf_sync_jobs').update({
      status: 'failed', error_message: err.message, log_lines: logLines, completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    return NextResponse.json({ jobId, status: 'failed', error: err.message }, { status: 500 });
  }
}
