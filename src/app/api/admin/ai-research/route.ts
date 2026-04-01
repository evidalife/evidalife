// src/app/api/admin/ai-research/route.ts
// GET  — Research Engine stats (study counts by source, embedding coverage, last job)
// POST — Trigger a new ingestion job (source, limit, dryRun)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60;

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

// ── GET: stats ────────────────────────────────────────────────────────────────
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  // ── Aggregation via dedicated RPC functions (avoids Supabase 1,000-row default limit) ──

  // Source counts — server-side GROUP BY
  const { data: sourceCounts } = await supabase
    .rpc('studies_count_by_source')
    .then(({ data, error }) => ({ data: error ? [] : (data as { source: string; count: number }[]) }));

  // Total / embedding counts (head: true with count: 'exact' is fine — no row limit issue)
  const { count: totalStudies } = await supabase
    .from('studies')
    .select('*', { count: 'exact', head: true });

  const { count: withEmbeddings } = await supabase
    .from('studies')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const { count: withoutEmbeddings } = await supabase
    .from('studies')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);

  // Last 10 ingestion jobs
  const { data: recentJobs } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Quality tier breakdown — server-side GROUP BY
  const { data: tierRows } = await supabase
    .rpc('studies_count_by_tier')
    .then(({ data, error }) => ({ data: error ? [] : (data as { tier: number; count: number }[]) }));

  // Disease tag breakdown — server-side unnest + GROUP BY
  const { data: diseaseRows } = await supabase
    .rpc('studies_count_by_disease')
    .then(({ data, error }) => ({ data: error ? [] : (data as { tag: string; count: number }[]) }));

  // Per-book citation progress
  const { data: bookStats } = await supabase
    .rpc('studies_count_by_book')
    .then(({ data, error }) => ({ data: error ? [] : (data as { book_id: string; title: string; total_citations: number; resolved_studies: number }[]) }));

  // Biomarker coverage
  const { count: withBiomarkers } = await supabase
    .from('studies')
    .select('*', { count: 'exact', head: true })
    .not('biomarker_slugs', 'eq', '{}');

  const { count: withDiseaseTags } = await supabase
    .from('studies')
    .select('*', { count: 'exact', head: true })
    .not('disease_tags', 'eq', '{}');

  // Estimated cost
  const avgAbstractTokens = 300;
  const costPer1M = 0.02;
  const estimatedCost = ((withoutEmbeddings ?? 0) * avgAbstractTokens / 1_000_000 * costPer1M).toFixed(4);

  return NextResponse.json({
    totalStudies: totalStudies ?? 0,
    withEmbeddings: withEmbeddings ?? 0,
    withoutEmbeddings: withoutEmbeddings ?? 0,
    sourceCounts: sourceCounts ?? [],
    tierCounts: tierRows ?? [],
    diseaseCounts: diseaseRows ?? [],
    bookStats: bookStats ?? [],
    withBiomarkers: withBiomarkers ?? 0,
    withDiseaseTags: withDiseaseTags ?? 0,
    recentJobs: recentJobs ?? [],
    estimatedEmbeddingCostUsd: estimatedCost,
  });
}

// ── POST: trigger ingestion ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { source = 'greger', limit = 100, dryRun = false, action } = body;

  const supabase = createAdminClient();

  // Handle manual study update actions (tag biomarkers / delete)
  if (action === 'tag_study') {
    const { studyId, biomarkerSlugs, heDomains } = body;
    if (!studyId) return NextResponse.json({ error: 'studyId required' }, { status: 400 });
    const { error } = await supabase
      .from('studies')
      .update({ biomarker_slugs: biomarkerSlugs ?? [], he_domains: heDomains ?? [] })
      .eq('id', studyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete_studies') {
    const { ids } = body;
    if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
    const { error } = await supabase.from('studies').delete().in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: ids.length });
  }

  // Validate source
  const validSources = ['greger', 'pubmed_nutrition', 'pubmed_longevity'];
  if (!validSources.includes(source)) {
    return NextResponse.json({ error: `Invalid source. Use: ${validSources.join(', ')}` }, { status: 400 });
  }

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('ingestion_jobs')
    .insert({
      source,
      status: 'pending',
      dry_run: dryRun,
      limit_count: limit,
      created_by: user.id,
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? 'Failed to create job' }, { status: 500 });
  }

  // Kick off ingestion in the background (fire-and-forget within Edge Runtime)
  // The actual ingestion runs server-side; we return the job ID immediately.
  runIngestionInBackground(job.id, source, limit, dryRun);

  return NextResponse.json({ jobId: job.id, status: 'started' });
}

// ── Background ingestion runner ───────────────────────────────────────────────
// Runs after response is sent. Uses service role key to update job progress.
async function runIngestionInBackground(
  jobId: string,
  source: string,
  limit: number,
  dryRun: boolean
) {
  const supabase = createAdminClient();
  const logLines: string[] = [];

  const log = async (msg: string) => {
    logLines.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    await supabase
      .from('ingestion_jobs')
      .update({ log_lines: logLines })
      .eq('id', jobId);
  };

  try {
    await supabase
      .from('ingestion_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', jobId);

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const PUBMED_API_KEY = process.env.PUBMED_API_KEY;

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required env vars: OPENAI_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY');
    }

    // Collect PMIDs based on source
    let pmids: string[] = [];

    if (source === 'greger') {
      const { collectGregerPmids } = await import('@/lib/research/ingest-greger');
      await log('Collecting PMIDs from Greger/NutritionFacts.org...');
      const { pmids: collected, stats } = await collectGregerPmids({ includeVideos: false });
      pmids = collected;
      await log(`Collected ${pmids.length} PMIDs. Stats: ${JSON.stringify(stats)}`);
    } else {
      const { searchPubMed } = await import('@/lib/research/pubmed-api');
      const queries = source === 'pubmed_nutrition'
        ? ['plant-based diet cardiovascular', 'dietary intervention inflammation', 'nutrition longevity mortality', 'omega-3 fatty acids outcomes', 'whole food plant diet biomarkers']
        : ['caloric restriction longevity', 'exercise mortality prediction', 'epigenetic clock aging', 'VO2max mortality', 'biological age intervention'];

      for (const q of queries) {
        await log(`Searching PubMed: "${q}"`);
        const results = await searchPubMed(q, { maxResults: Math.ceil(limit / queries.length), apiKey: PUBMED_API_KEY, minYear: 2004 });
        pmids.push(...results);
        await log(`  Found ${results.length} PMIDs`);
      }
      pmids = [...new Set(pmids)];
    }

    pmids = pmids.slice(0, limit);
    await supabase.from('ingestion_jobs').update({ total_found: pmids.length }).eq('id', jobId);
    await log(`Processing ${pmids.length} PMIDs (limit: ${limit})`);

    // Run ingestion pipeline
    const { ingestPmids } = await import('@/lib/research/ingest-pipeline');
    const result = await ingestPmids(pmids, {
      supabaseUrl: SUPABASE_URL,
      supabaseServiceKey: SUPABASE_SERVICE_KEY,
      openaiApiKey: OPENAI_API_KEY,
      pubmedApiKey: PUBMED_API_KEY,
      source,
      dryRun,
      onProgress: async (msg: string) => { await log(msg); },
    });

    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'completed',
        total_fetched: result.total,
        total_embedded: result.inserted,
        total_stored: result.inserted,
        total_skipped: result.skipped,
        completed_at: new Date().toISOString(),
        log_lines: logLines,
      })
      .eq('id', jobId);

  } catch (err: any) {
    await supabase
      .from('ingestion_jobs')
      .update({
        status: 'failed',
        error_message: err.message,
        completed_at: new Date().toISOString(),
        log_lines: logLines,
      })
      .eq('id', jobId);
  }
}
