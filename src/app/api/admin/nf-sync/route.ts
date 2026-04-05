// src/app/api/admin/nf-sync/route.ts
// GET  — NutritionFacts sync status (nf_content stats + recent sync jobs)
// POST — Trigger a new NutritionFacts.org content sync

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 300; // 5 min — sync can take a while

// ── Auth guard ────────────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) return null;
  return user;
}

// ── WordPress REST API helpers ────────────────────────────────────────────────

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
  maxPages = 3
): Promise<WpPost[]> {
  const newPosts: WpPost[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${WP_API}/${endpoint}?per_page=${perPage}&page=${page}&orderby=date&order=desc`, {
      headers: { 'User-Agent': 'Evidalife Research Engine/1.0' },
    });
    if (!res.ok) break;

    const posts: WpPost[] = await res.json();
    if (posts.length === 0) break;

    let foundExisting = false;
    for (const post of posts) {
      if (existingSlugs.has(post.slug)) {
        foundExisting = true;
        break; // Hit known content — stop paginating
      }
      newPosts.push(post);
    }

    if (foundExisting) break;
  }

  return newPosts;
}

// Extract transcript from NF video/blog page HTML
function extractTranscript(html: string): string {
  // Video transcripts
  const transcriptMatch = html.match(/id="collapseTranscript"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (transcriptMatch) {
    return transcriptMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Blog posts — main content area
  const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<footer|<\/article)/i);
  if (contentMatch) {
    return contentMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return '';
}

// Extract PMIDs from page HTML (PubMed links in citations)
function extractPmids(html: string): string[] {
  const pmidSet = new Set<string>();
  const regex = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{5,})/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    pmidSet.add(match[1]);
  }
  return [...pmidSet];
}

// ── OpenAI Embedding ──────────────────────────────────────────────────────────

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
      dimensions: 1536,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

// ── Simple biomarker/disease keyword detection ────────────────────────────────

// Subset of high-value biomarker terms
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
  return Object.entries(map)
    .filter(([, terms]) => terms.some(t => lower.includes(t)))
    .map(([slug]) => slug);
}

// ── GET: NF sync status ──────────────────────────────────────────────────────

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  // NF content counts by type (video, blog, question)
  const { count: videoCount } = await supabase.from('nf_content').select('*', { count: 'exact', head: true }).eq('content_type', 'video');
  const { count: blogCount } = await supabase.from('nf_content').select('*', { count: 'exact', head: true }).eq('content_type', 'blog');
  const { count: questionCount } = await supabase.from('nf_content').select('*', { count: 'exact', head: true }).eq('content_type', 'question');
  const typeCounts = [
    { content_type: 'video', count: videoCount ?? 0 },
    { content_type: 'blog', count: blogCount ?? 0 },
    { content_type: 'question', count: questionCount ?? 0 },
  ];

  // Total NF content
  const { count: totalNfContent } = await supabase
    .from('nf_content')
    .select('*', { count: 'exact', head: true });

  // With embeddings
  const { count: withEmbeddings } = await supabase
    .from('nf_content')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  // Most recent content
  const { data: recentContent } = await supabase
    .from('nf_content')
    .select('slug, title, content_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // Recent sync jobs
  const { data: recentJobs } = await supabase
    .from('nf_sync_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    totalNfContent: totalNfContent ?? 0,
    withEmbeddings: withEmbeddings ?? 0,
    typeCounts: typeCounts ?? [],
    recentContent: recentContent ?? [],
    recentJobs: recentJobs ?? [],
  });
}

// ── POST: trigger NF sync ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const log = (msg: string) => { logLines.push(msg); console.log(`[nf-sync] ${msg}`); };

  // Run sync synchronously (Vercel kills background tasks after response is sent)
  try {
    // Get existing slugs — paginate to avoid 1000-row default limit
    const allSlugs: string[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page } = await supabase
        .from('nf_content')
        .select('slug')
        .order('created_at', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (!page || page.length === 0) break;
      allSlugs.push(...page.map((r: any) => r.slug));
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    const existingSlugs = new Set(allSlugs);
    log(`Existing NF content: ${existingSlugs.size} items`);

    // Fetch new content from WP REST API
    const [newVideos, newBlogs, newQuestions] = await Promise.all([
      fetchNewWpPosts('video', existingSlugs),
      fetchNewWpPosts('posts', existingSlugs),
      fetchNewWpPosts('questions', existingSlugs, 10, 2),
    ]);

    log(`New videos: ${newVideos.length}, blogs: ${newBlogs.length}, questions: ${newQuestions.length}`);

    const allNew = [
      ...newVideos.map(p => ({ ...p, content_type: 'video' })),
      ...newBlogs.map(p => ({ ...p, content_type: 'blog' })),
      ...newQuestions.map(p => ({ ...p, content_type: 'question' })),
    ];

    if (allNew.length === 0) {
      log('No new content found — sync complete');
      await supabase.from('nf_sync_jobs').update({
        status: 'completed',
        log_lines: logLines,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
      return NextResponse.json({ jobId, status: 'completed', newContent: 0 });
    }

    // For each new item, fetch the full page to get transcript + PMIDs
    let newPmidsSet = new Set<string>();
    const insertRows: any[] = [];

    for (const item of allNew) {
      try {
        const pageRes = await fetch(item.link, {
          headers: { 'User-Agent': 'Evidalife Research Engine/1.0' },
        });
        if (!pageRes.ok) {
          log(`  Skipped ${item.slug}: HTTP ${pageRes.status}`);
          continue;
        }
        const html = await pageRes.text();

        const transcript = extractTranscript(html);
        const pmids = extractPmids(html);

        if (!transcript && item.content_type === 'video') {
          log(`  Skipped ${item.slug}: no transcript found`);
          continue;
        }

        // Generate embedding
        const embeddingText = `${item.title.rendered}\n\n${transcript}`;
        let embedding: number[] | null = null;
        try {
          embedding = await embedText(embeddingText, OPENAI_API_KEY);
        } catch (e: any) {
          log(`  Embedding failed for ${item.slug}: ${e.message}`);
        }

        // Detect biomarkers and diseases
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
        log(`  ${item.content_type}: ${item.slug} — ${pmids.length} PMIDs, ${transcript.length} chars`);

        // Small delay to be polite to NF servers
        await new Promise(r => setTimeout(r, 300));
      } catch (e: any) {
        log(`  Error on ${item.slug}: ${e.message}`);
      }
    }

    // Insert new content
    if (insertRows.length > 0) {
      const { error: insertError } = await supabase
        .from('nf_content')
        .upsert(insertRows, { onConflict: 'slug' });

      if (insertError) {
        log(`Insert error: ${insertError.message}`);
      } else {
        log(`Inserted ${insertRows.length} new content items`);
      }
    }

    // Check which PMIDs are new (not in studies table)
    const newPmidArr = [...newPmidsSet];
    let trulyNewPmids: string[] = [];
    if (newPmidArr.length > 0) {
      const { data: existingStudies } = await supabase
        .from('studies')
        .select('pmid')
        .in('pmid', newPmidArr);

      const existingPmidSet = new Set((existingStudies ?? []).map((s: any) => s.pmid));
      trulyNewPmids = newPmidArr.filter(p => !existingPmidSet.has(p));
    }
    log(`PMIDs found: ${newPmidsSet.size} total, ${trulyNewPmids.length} new`);

    // Update job with results
    await supabase.from('nf_sync_jobs').update({
      status: 'completed',
      new_videos: newVideos.length,
      new_blogs: newBlogs.length,
      new_questions: newQuestions.length,
      new_pmids_found: trulyNewPmids.length,
      total_embedded: insertRows.filter(r => r.embedding).length,
      log_lines: logLines,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return NextResponse.json({
      jobId,
      status: 'completed',
      newContent: insertRows.length,
      newPmids: trulyNewPmids.length,
    });

  } catch (err: any) {
    log(`Fatal error: ${err.message}`);
    await supabase.from('nf_sync_jobs').update({
      status: 'failed',
      error_message: err.message,
      log_lines: logLines,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    return NextResponse.json({ jobId, status: 'failed', error: err.message }, { status: 500 });
  }
}
