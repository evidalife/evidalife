'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SourceCount { source: string; count: number }
interface TierCount { tier: number; count: number }
interface DiseaseCount { tag: string; count: number }

interface BookStat { book_id: string; title: string; total_citations: number; resolved_studies: number }
interface BookContentStat { book_id: string; title: string; slug: string; chunks: number; total_chars: number }

interface StatsData {
  totalStudies: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  sourceCounts: SourceCount[];
  tierCounts: TierCount[];
  diseaseCounts: DiseaseCount[];
  bookStats: BookStat[];
  bookContentStats: BookContentStat[];
  totalBookChunks: number;
  totalBookChars: number;
  withBiomarkers: number;
  withDiseaseTags: number;
  recentJobs: IngestionJob[];
  estimatedEmbeddingCostUsd: string;
  // NF content
  totalNfContent: number;
  nfWithEmbeddings: number;
  nfVideos: number;
  nfBlogs: number;
  nfQuestions: number;
}

interface IngestionJob {
  id: string;
  source: string;
  status: string;
  dry_run: boolean;
  limit_count: number | null;
  total_found: number;
  total_fetched: number;
  total_stored: number;
  total_skipped: number;
  error_message: string | null;
  log_lines: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string[];
  journal: string | null;
  publication_year: number | null;
  abstract: string | null;
  mesh_terms: string[];
  doi: string | null;
  source: string;
  biomarker_slugs: string[];
  he_domains: string[];
  embedding: string | null;
  created_at: string;
}

type Tab = 'overview' | 'studies' | 'ingest' | 'nf-sync' | 'jobs';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  greger: 'Greger / NutritionFacts',
  greger_epub: 'Greger Books (EPUB)',
  nutritionfacts: 'NutritionFacts.org',
  pubmed_nutrition: 'PubMed Nutrition',
  pubmed_longevity: 'PubMed Longevity',
};

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Tier 0 — Book Content (Author Analysis)', color: 'bg-purple-600' },
  1: { label: 'Tier 1 — Greger-cited', color: 'bg-emerald-500' },
  2: { label: 'Tier 2 — Systematic Review / Meta-analysis', color: 'bg-teal-500' },
  3: { label: 'Tier 3 — RCT', color: 'bg-blue-500' },
  4: { label: 'Tier 4 — Cohort / Observational', color: 'bg-amber-500' },
  5: { label: 'Tier 5 — Other', color: 'bg-gray-400' },
};

const DISEASE_LABELS: Record<string, string> = {
  cardiovascular: 'Cardiovascular Disease', atherosclerosis: 'Atherosclerosis',
  hypertension: 'Hypertension', stroke: 'Stroke',
  diabetes_t2: 'Type 2 Diabetes', obesity: 'Obesity',
  metabolic_syndrome: 'Metabolic Syndrome', nafld: 'NAFLD',
  colorectal_cancer: 'Colorectal Cancer', breast_cancer: 'Breast Cancer',
  prostate_cancer: 'Prostate Cancer', lung_cancer: 'Lung Cancer',
  alzheimers: "Alzheimer's", parkinsons: "Parkinson's",
  depression: 'Depression', cognitive_decline: 'Cognitive Decline',
  ibd: 'IBD', ibs: 'IBS', gut_microbiome: 'Gut Microbiome',
  osteoporosis: 'Osteoporosis', arthritis: 'Arthritis', sarcopenia: 'Sarcopenia',
  ckd: 'Chronic Kidney Disease', kidney_stones: 'Kidney Stones',
  copd: 'COPD', asthma: 'Asthma',
  autoimmune: 'Autoimmune Disease', lupus: 'Lupus',
  multiple_sclerosis: 'Multiple Sclerosis',
  aging: 'Aging / Longevity', frailty: 'Frailty',
  telomere: 'Telomere Length', oxidative_stress: 'Oxidative Stress',
  inflammation: 'Chronic Inflammation',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  running: 'bg-blue-50 text-blue-700 ring-blue-500/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  failed: 'bg-red-50 text-red-700 ring-red-500/20',
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${STATUS_COLORS[status] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20'}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#0e393d]/8 bg-white p-5">
      <p className="text-xs text-[#1c2a2b]/40 font-medium mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#0e393d] tabular-nums">{value.toLocaleString()}</p>
      {sub && <p className="text-[11px] text-[#1c2a2b]/35 mt-1">{sub}</p>}
    </div>
  );
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-CH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Overview tab ──────────────────────────────────────────────────────────────

// ── Ingestion Roadmap — planned sources and targets ──────────────────────────
// This defines the full ingestion plan: all sources, tiers, and target study counts.

interface RoadmapSource {
  key: string;
  label: string;
  tier: number;
  target: number;
  description: string;
}

const INGESTION_ROADMAP: RoadmapSource[] = [
  // Tier 0 — Book content (Greger's prose, analysis, conclusions)
  { key: 'book_content', label: 'Book Content (Prose & Analysis)', tier: 0, target: 2353, description: "Greger's synthesized conclusions from 6 books" },
  // Tier 1 — Greger-cited (all citations from books + videos)
  { key: 'greger_epub', label: 'Greger Books (EPUB)', tier: 1, target: 9000, description: '6 books: How Not to Age/Die/Diet, Lower LDL, Ozempic, Ultra-Processed' },
  { key: 'nutritionfacts', label: 'NutritionFacts.org', tier: 1, target: 10000, description: 'Cited studies from 4,000+ videos, blogs & Q&As' },
  { key: 'greger', label: 'Greger / NutritionFacts (Legacy)', tier: 1, target: 300, description: 'Initial hand-curated Greger citations' },
  // Tier 2 — Systematic Reviews & Meta-analyses
  { key: 'pubmed_sr_nutrition', label: 'PubMed — Nutrition Reviews', tier: 2, target: 8000, description: 'Systematic reviews on dietary interventions and nutrition' },
  { key: 'pubmed_sr_longevity', label: 'PubMed — Longevity Reviews', tier: 2, target: 5000, description: 'Meta-analyses on aging, mortality, biological age' },
  // Tier 3 — RCTs
  { key: 'pubmed_rct_nutrition', label: 'PubMed — Nutrition RCTs', tier: 3, target: 12000, description: 'Randomized controlled trials: diet, supplements, fasting' },
  { key: 'pubmed_rct_exercise', label: 'PubMed — Exercise RCTs', tier: 3, target: 6000, description: 'RCTs on exercise, VO2max, fitness and health outcomes' },
  { key: 'pubmed_rct_biomarker', label: 'PubMed — Biomarker RCTs', tier: 3, target: 8000, description: 'RCTs measuring biomarker changes from interventions' },
  // Tier 4 — Cohort / Observational
  { key: 'pubmed_cohort_cardio', label: 'PubMed — Cardiovascular Cohorts', tier: 4, target: 8000, description: 'Large cohort studies on heart disease, stroke, hypertension' },
  { key: 'pubmed_cohort_cancer', label: 'PubMed — Cancer Prevention Cohorts', tier: 4, target: 6000, description: 'Observational studies on diet and cancer risk' },
  { key: 'pubmed_cohort_metabolic', label: 'PubMed — Metabolic Cohorts', tier: 4, target: 5000, description: 'Cohort studies on diabetes, obesity, metabolic syndrome' },
  { key: 'pubmed_cohort_neuro', label: 'PubMed — Neurological Cohorts', tier: 4, target: 4000, description: "Cohort studies on Alzheimer's, cognitive decline, depression" },
  // Tier 5 — Other
  { key: 'pubmed_general', label: 'PubMed — General Health & Longevity', tier: 5, target: 5000, description: 'Broader research on lifestyle, environment, and health' },
];

const TOTAL_TARGET = INGESTION_ROADMAP.reduce((sum, s) => sum + s.target, 0);

function RoadmapSection({ stats }: { stats: StatsData }) {
  // Map actual study counts by source key — include book_content from chunk stats
  const sourceMap = new Map(stats.sourceCounts.map(s => [s.source, s.count]));
  sourceMap.set('book_content', stats.totalBookChunks ?? 0);
  const totalIngested = stats.totalStudies + (stats.totalBookChunks ?? 0);
  const overallPct = TOTAL_TARGET > 0 ? Math.round((totalIngested / TOTAL_TARGET) * 100) : 0;

  // Group by tier
  const tiers = [0, 1, 2, 3, 4, 5];

  return (
    <div className="rounded-xl border border-[#0e393d]/8 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-[#0e393d]/8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0e393d]">Ingestion Roadmap</p>
            <p className="text-[11px] text-[#1c2a2b]/35 mt-0.5">
              Target: {TOTAL_TARGET.toLocaleString()} studies across {INGESTION_ROADMAP.length} sources
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-[#0e393d] tabular-nums">{overallPct}%</p>
            <p className="text-[11px] text-[#1c2a2b]/35">{totalIngested.toLocaleString()} / {TOTAL_TARGET.toLocaleString()} items</p>
          </div>
        </div>
        {/* Overall progress bar */}
        <div className="mt-3 h-3 rounded-full bg-[#0e393d]/8 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className="divide-y divide-[#0e393d]/[.04]">
        {tiers.map(tier => {
          const tierSources = INGESTION_ROADMAP.filter(s => s.tier === tier);
          const tierInfo = TIER_LABELS[tier];
          const tierTarget = tierSources.reduce((sum, s) => sum + s.target, 0);
          const tierActual = tierSources.reduce((sum, s) => sum + (sourceMap.get(s.key) ?? 0), 0);
          const tierPct = tierTarget > 0 ? Math.round((tierActual / tierTarget) * 100) : 0;

          return (
            <div key={tier} className="px-5 py-4">
              {/* Tier header */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${tierInfo.color} shrink-0`} />
                <p className="text-[13px] font-semibold text-[#0e393d] flex-1">{tierInfo.label}</p>
                <span className="text-[12px] font-semibold text-[#1c2a2b]/50 tabular-nums">
                  {tierActual.toLocaleString()} / {tierTarget.toLocaleString()} {tier === 0 ? 'chunks' : 'studies'}
                </span>
                <span className={`text-[11px] font-bold tabular-nums rounded-full px-2 py-0.5 ${
                  tierPct === 0 ? 'bg-gray-100 text-gray-400' :
                  tierPct < 50 ? 'bg-amber-50 text-amber-600' :
                  tierPct < 100 ? 'bg-blue-50 text-blue-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  {tierPct}%
                </span>
              </div>

              {/* Sources within tier */}
              <div className="space-y-2 ml-5">
                {tierSources.map(src => {
                  const actual = sourceMap.get(src.key) ?? 0;
                  const pct = src.target > 0 ? Math.min((actual / src.target) * 100, 100) : 0;
                  const isActive = actual > 0;

                  return (
                    <div key={src.key}>
                      <div className={`flex items-center gap-3 ${isActive ? '' : 'opacity-50'}`}>
                        {/* Status indicator */}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          actual >= src.target ? 'bg-emerald-500' :
                          actual > 0 ? 'bg-blue-500 animate-pulse' :
                          'bg-gray-300'
                        }`} />

                        {/* Source label + bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className="text-[12px] font-medium text-[#0e393d] truncate">{src.label}</p>
                            <p className="text-[10px] text-[#1c2a2b]/30 shrink-0">{src.description}</p>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-[#0e393d]/6 overflow-hidden w-full max-w-xs">
                            <div className={`h-full rounded-full transition-all ${
                              actual >= src.target ? 'bg-emerald-500' :
                              actual > 0 ? 'bg-blue-400' :
                              'bg-transparent'
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Count */}
                        <p className="text-[11px] text-[#1c2a2b]/40 tabular-nums shrink-0 w-28 text-right">
                          {actual > 0 ? `${actual.toLocaleString()} / ` : ''}{src.target.toLocaleString()}
                        </p>
                      </div>

                      {/* Per-book breakdown for Book Content (Tier 0) */}
                      {src.key === 'book_content' && (stats.bookContentStats ?? []).some((b: BookContentStat) => b.chunks > 0) && (
                        <div className="ml-6 mt-2 space-y-1.5 pb-1">
                          {(stats.bookContentStats ?? []).filter((b: BookContentStat) => b.chunks > 0).map((book: BookContentStat) => (
                            <div key={book.book_id} className="flex items-center gap-2.5">
                              <span className="w-1 h-1 rounded-full shrink-0 bg-purple-500" />
                              <p className="text-[11px] text-[#1c2a2b]/60 flex-1 truncate">{book.title}</p>
                              <div className="w-16 h-1 rounded-full bg-purple-100 overflow-hidden shrink-0">
                                <div className="h-full rounded-full bg-purple-500" style={{ width: '100%' }} />
                              </div>
                              <p className="text-[10px] text-[#1c2a2b]/35 tabular-nums shrink-0 w-28 text-right">
                                {book.chunks} chunks · {Math.round(book.total_chars / 1000)}k chars
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Per-book breakdown for Greger EPUB source */}
                      {src.key === 'greger_epub' && stats.bookStats.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1.5 pb-1">
                          {stats.bookStats.map(book => {
                            const bookPct = book.total_citations > 0
                              ? Math.round((book.resolved_studies / book.total_citations) * 100)
                              : 0;
                            return (
                              <div key={book.book_id} className="flex items-center gap-2.5">
                                <span className={`w-1 h-1 rounded-full shrink-0 ${
                                  bookPct >= 90 ? 'bg-emerald-400' :
                                  bookPct >= 50 ? 'bg-amber-400' :
                                  'bg-gray-300'
                                }`} />
                                <p className="text-[11px] text-[#1c2a2b]/60 flex-1 truncate">{book.title}</p>
                                <div className="w-16 h-1 rounded-full bg-[#0e393d]/6 overflow-hidden shrink-0">
                                  <div className={`h-full rounded-full ${
                                    bookPct >= 90 ? 'bg-emerald-400' :
                                    bookPct >= 50 ? 'bg-amber-400' :
                                    'bg-gray-300'
                                  }`} style={{ width: `${bookPct}%` }} />
                                </div>
                                <p className="text-[10px] text-[#1c2a2b]/35 tabular-nums shrink-0 w-24 text-right">
                                  {book.resolved_studies.toLocaleString()} / {book.total_citations.toLocaleString()} ({bookPct}%)
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: StatsData }) {
  const biomarkerPct = stats.totalStudies > 0
    ? Math.round((stats.withBiomarkers / stats.totalStudies) * 100)
    : 0;
  const diseasePct = stats.totalStudies > 0
    ? Math.round((stats.withDiseaseTags / stats.totalStudies) * 100)
    : 0;

  const [showAllDiseases, setShowAllDiseases] = useState(false);
  const visibleDiseases = showAllDiseases ? stats.diseaseCounts : stats.diseaseCounts.slice(0, 12);

  return (
    <div className="p-8 space-y-8">
      {/* Ingestion Roadmap — full plan with targets */}
      <RoadmapSection stats={stats} />

      {/* Tagging coverage — compact inline */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white p-5">
        <p className="text-xs font-semibold tracking-wider uppercase text-[#ceab84] mb-4">Tagging Coverage</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium text-[#0e393d]">Biomarker Tags</p>
              <p className="text-sm font-semibold text-[#0e393d] tabular-nums">{biomarkerPct}%</p>
            </div>
            <div className="h-2 rounded-full bg-[#0e393d]/8 overflow-hidden">
              <div className="h-full rounded-full bg-[#0e393d] transition-all" style={{ width: `${biomarkerPct}%` }} />
            </div>
            <p className="text-[11px] text-[#1c2a2b]/40 mt-1">{stats.withBiomarkers.toLocaleString()} / {stats.totalStudies.toLocaleString()} studies</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium text-[#0e393d]">Disease Tags</p>
              <p className="text-sm font-semibold text-[#0e393d] tabular-nums">{diseasePct}%</p>
            </div>
            <div className="h-2 rounded-full bg-[#0e393d]/8 overflow-hidden">
              <div className="h-full rounded-full bg-[#ceab84] transition-all" style={{ width: `${diseasePct}%` }} />
            </div>
            <p className="text-[11px] text-[#1c2a2b]/40 mt-1">{stats.withDiseaseTags.toLocaleString()} / {stats.totalStudies.toLocaleString()} studies</p>
          </div>
        </div>
      </div>

      {/* Disease/condition distribution */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#0e393d]/8">
          <p className="text-sm font-semibold text-[#0e393d]">Disease & Condition Coverage</p>
          <p className="text-[11px] text-[#1c2a2b]/35 mt-0.5">
            {stats.diseaseCounts.length} conditions indexed across {stats.withDiseaseTags.toLocaleString()} studies
          </p>
        </div>
        {stats.diseaseCounts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#1c2a2b]/35">No disease tags assigned yet.</div>
        ) : (
          <>
            <div className="px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {visibleDiseases.map(({ tag, count }) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0e393d]/[.04] px-3 py-1.5 text-[12px]">
                    <span className="font-medium text-[#0e393d]">{DISEASE_LABELS[tag] ?? tag}</span>
                    <span className="text-[#1c2a2b]/30 tabular-nums">{count.toLocaleString()}</span>
                  </span>
                ))}
              </div>
              {stats.diseaseCounts.length > 12 && (
                <button
                  onClick={() => setShowAllDiseases(!showAllDiseases)}
                  className="mt-3 text-[11px] font-medium text-[#0e393d]/50 hover:text-[#0e393d] transition-colors"
                >
                  {showAllDiseases ? 'Show fewer' : `Show all ${stats.diseaseCounts.length} conditions`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Studies tab ───────────────────────────────────────────────────────────────

type SortField = 'created_at' | 'title' | 'publication_year' | 'journal' | 'source';
type SortDir = 'asc' | 'desc';

function StudiesTab() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const PAGE_SIZE = 50;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'title' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const loadStudies = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from('studies')
      .select('id,pmid,title,authors,journal,publication_year,abstract,mesh_terms,doi,source,biomarker_slugs,he_domains,created_at')
      .order(sortField, { ascending: sortDir === 'asc' })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (sourceFilter) q = q.eq('source', sourceFilter);
    if (search.trim()) {
      // Support PMID search (numeric) and title search
      const term = search.trim();
      if (/^\d+$/.test(term)) {
        q = q.eq('pmid', term);
      } else {
        q = q.ilike('title', `%${term}%`);
      }
    }

    const { data } = await q;
    setStudies((data ?? []) as Study[]);

    // Get total count for pagination info
    let countQ = supabase.from('studies').select('*', { count: 'exact', head: true });
    if (sourceFilter) countQ = countQ.eq('source', sourceFilter);
    if (search.trim()) {
      const term = search.trim();
      if (/^\d+$/.test(term)) {
        countQ = countQ.eq('pmid', term);
      } else {
        countQ = countQ.ilike('title', `%${term}%`);
      }
    }
    const { count } = await countQ;
    setTotalCount(count);

    setLoading(false);
  }, [search, sourceFilter, page, sortField, sortDir]);

  useEffect(() => { loadStudies(); }, [loadStudies]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0 || !confirm(`Delete ${selected.size} studies? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch('/api/admin/ai-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_studies', ids: Array.from(selected) }),
    });
    setSelected(new Set());
    setDeleting(false);
    loadStudies();
  };

  return (
    <div className="p-8 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by title or PMID..."
          className="flex-1 rounded-lg border border-[#0e393d]/15 px-3 py-2 text-sm text-[#1c2a2b] placeholder-[#1c2a2b]/30 focus:outline-none focus:border-[#0e393d]/40"
        />
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-[#0e393d]/15 px-3 py-2 text-sm text-[#1c2a2b] focus:outline-none focus:border-[#0e393d]/40"
        >
          <option value="">All sources</option>
          <option value="greger">Greger / NutritionFacts</option>
          <option value="greger_epub">Greger Books (EPUB)</option>
          <option value="nutritionfacts">NutritionFacts.org</option>
          <option value="pubmed_nutrition">PubMed Nutrition</option>
          <option value="pubmed_longevity">PubMed Longevity</option>
        </select>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="px-3 py-2 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : `Delete ${selected.size}`}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[.02]">
              <th className="w-8 px-4 py-3 text-left">
                <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(studies.map(s => s.id)) : new Set())} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide cursor-pointer select-none hover:text-[#0e393d]" onClick={() => toggleSort('title')}>
                Title {sortField === 'title' && <span className="text-[#0e393d]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide hidden lg:table-cell cursor-pointer select-none hover:text-[#0e393d]" onClick={() => toggleSort('journal')}>
                Journal {sortField === 'journal' && <span className="text-[#0e393d]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide cursor-pointer select-none hover:text-[#0e393d]" onClick={() => toggleSort('publication_year')}>
                Year {sortField === 'publication_year' && <span className="text-[#0e393d]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide cursor-pointer select-none hover:text-[#0e393d]" onClick={() => toggleSort('source')}>
                Source {sortField === 'source' && <span className="text-[#0e393d]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide hidden md:table-cell">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/[.03]">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#1c2a2b]/35">Loading...</td></tr>
            ) : studies.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#1c2a2b]/35">No studies found</td></tr>
            ) : studies.map(study => (
              <Fragment key={study.id}>
                <tr
                  className="hover:bg-[#0e393d]/[.01] cursor-pointer"
                  onClick={() => setExpanded(expanded === study.id ? null : study.id)}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(study.id)}
                      onChange={() => toggleSelect(study.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="text-[#0e393d]/25 text-xs mt-0.5">{expanded === study.id ? '▼' : '▶'}</span>
                      <div>
                        <p className="text-[13px] text-[#0e393d] font-medium line-clamp-2">{study.title}</p>
                        <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">PMID: {study.pmid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 hidden lg:table-cell max-w-[180px] truncate">{study.journal ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#1c2a2b]/50 tabular-nums">{study.publication_year ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0e393d]/8 text-[#0e393d]">
                      {SOURCE_LABELS[study.source] ?? study.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(study.biomarker_slugs ?? []).slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[#ceab84]/20 text-[#7a5e20]">{s}</span>
                      ))}
                      {(study.biomarker_slugs ?? []).length > 3 && (
                        <span className="text-[10px] text-[#1c2a2b]/30">+{study.biomarker_slugs.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded === study.id && (
                  <tr key={`${study.id}-exp`} className="bg-[#fafaf8]">
                    <td colSpan={6} className="px-8 py-5">
                      <StudyExpandedView study={study} onUpdate={loadStudies} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#1c2a2b]/40">
          Page {page + 1}{totalCount !== null ? ` of ${Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}` : ''} · {totalCount !== null ? `${totalCount.toLocaleString()} total` : `${studies.length} shown`}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#0e393d]/15 disabled:opacity-30 hover:bg-[#0e393d]/[.03]">← Prev</button>
          <button onClick={() => setPage(p => p + 1)} disabled={studies.length < PAGE_SIZE}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#0e393d]/15 disabled:opacity-30 hover:bg-[#0e393d]/[.03]">Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Expanded study row ────────────────────────────────────────────────────────

function StudyExpandedView({ study, onUpdate }: { study: Study; onUpdate: () => void }) {
  const [slugInput, setSlugInput] = useState((study.biomarker_slugs ?? []).join(', '));
  const [domainInput, setDomainInput] = useState((study.he_domains ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch('/api/admin/ai-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'tag_study',
        studyId: study.id,
        biomarkerSlugs: slugInput.split(',').map(s => s.trim()).filter(Boolean),
        heDomains: domainInput.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onUpdate();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h3 className="text-sm font-semibold text-[#0e393d] mb-1">{study.title}</h3>
        <p className="text-xs text-[#1c2a2b]/50">
          {study.authors?.slice(0, 4).join(', ')}{(study.authors?.length ?? 0) > 4 ? ' et al.' : ''} ·{' '}
          {study.journal ?? '—'} · {study.publication_year ?? '—'}
        </p>
        <div className="flex gap-3 mt-1.5">
          <a href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#0C9C6C] hover:underline">PubMed →</a>
          {study.doi && (
            <a href={`https://doi.org/${study.doi}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#1c2a2b]/40 hover:underline">DOI →</a>
          )}
        </div>
      </div>

      {study.abstract && (
        <p className="text-xs text-[#1c2a2b]/60 leading-relaxed bg-white rounded-lg p-3 border border-[#0e393d]/8">
          {study.abstract}
        </p>
      )}

      {(study.mesh_terms?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {study.mesh_terms.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0e393d]/8 text-[#0e393d]/60">{t}</span>
          ))}
        </div>
      )}

      {/* Tagging */}
      <div className="bg-white rounded-lg border border-[#0e393d]/8 p-4 space-y-3">
        <p className="text-xs font-semibold text-[#0e393d]">Biomarker Tagging</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#1c2a2b]/50 mb-1 block">Biomarker slugs (comma-separated)</label>
            <input value={slugInput} onChange={e => setSlugInput(e.target.value)}
              placeholder="ldl_c, crp, vitamin_d"
              className="w-full rounded-lg border border-[#0e393d]/15 px-3 py-1.5 text-xs focus:outline-none focus:border-[#0e393d]/40" />
          </div>
          <div>
            <label className="text-[11px] text-[#1c2a2b]/50 mb-1 block">HE domains (comma-separated)</label>
            <input value={domainInput} onChange={e => setDomainInput(e.target.value)}
              placeholder="heart_vessels, inflammation"
              className="w-full rounded-lg border border-[#0e393d]/15 px-3 py-1.5 text-xs focus:outline-none focus:border-[#0e393d]/40" />
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-[#0e393d] text-white text-xs font-medium hover:bg-[#0e393d]/80 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Tags'}
        </button>
      </div>
    </div>
  );
}

// ── Ingestion tab ─────────────────────────────────────────────────────────────

function IngestTab({ onJobStarted }: { onJobStarted: () => void }) {
  const [source, setSource] = useState('pubmed_nutrition');
  const [limit, setLimit] = useState(100);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ jobId: string } | null>(null);
  const [error, setError] = useState('');

  const trigger = async () => {
    if (!confirm(`${dryRun ? 'Dry run' : 'LIVE ingestion'}: ${limit} studies from "${source}"?`)) return;
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/ai-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, limit, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setResult(data);
      onJobStarted();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const estCost = (limit * 300 / 1_000_000 * 0.02).toFixed(4);

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Phase 1 — completed */}
      <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600">completed</span>
          <p className="text-sm font-semibold text-[#0e393d]">Phase 1 — Greger / NutritionFacts</p>
        </div>
        <p className="text-xs text-[#1c2a2b]/60">
          18,253 studies from 6 books + NutritionFacts.org · 4,027 NF content items · 2,353 book chunks — all embedded and searchable.
          Weekly auto-sync checks for new NutritionFacts.org content (see NutritionFacts tab).
        </p>
      </div>

      {/* Phase 2/3 — planned */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-600">next</span>
          <p className="text-sm font-semibold text-[#0e393d]">Phase 2 & 3 — PubMed Expansion</p>
        </div>
        <p className="text-xs text-[#1c2a2b]/60 leading-relaxed">
          Expand the research database with targeted PubMed searches: systematic reviews, meta-analyses, RCTs,
          and cohort studies on nutrition, longevity, biomarkers, and disease prevention.
          This requires targeted search queries with article-type filters and quality classification — best done
          together via the CLI for control over what gets ingested.
        </p>
        <div className="space-y-2">
          {[
            { label: 'Systematic Reviews & Meta-analyses', target: '~13K', cost: '~$3–5', tier: 'Tier 2' },
            { label: 'Randomized Controlled Trials', target: '~26K', cost: '~$8–12', tier: 'Tier 3' },
            { label: 'Cohort & Observational Studies', target: '~23K', cost: '~$7–10', tier: 'Tier 4' },
            { label: 'General Health & Longevity', target: '~5K', cost: '~$1–2', tier: 'Tier 5' },
          ].map(({ label, target, cost, tier }) => (
            <div key={label} className="flex items-center gap-3 text-xs px-3 py-2 rounded-lg bg-[#0e393d]/[.02]">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0e393d]/8 text-[#0e393d]/60 font-medium shrink-0">{tier}</span>
              <span className="flex-1 text-[#1c2a2b]/60">{label}</span>
              <span className="text-[#1c2a2b]/40 tabular-nums">{target}</span>
              <span className="text-[#0C9C6C] font-medium tabular-nums">{cost}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#1c2a2b]/30">
          Estimated total: ~67K additional studies · ~$19–29 in embedding costs
        </p>
      </div>

      {/* Quick PubMed search — for small exploratory batches */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-[#0e393d]">Quick PubMed Search</h2>
          <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">
            Run a small exploratory batch from PubMed. For large-scale Phase 2/3 ingestion, use the CLI for better control.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#1c2a2b]/60 block mb-1.5">Search Topic</label>
            <select value={source} onChange={e => setSource(e.target.value)}
              className="w-full rounded-lg border border-[#0e393d]/15 px-3 py-2 text-sm focus:outline-none focus:border-[#0e393d]/40">
              <option value="pubmed_nutrition">PubMed — Nutrition & Diet Studies</option>
              <option value="pubmed_longevity">PubMed — Longevity & Aging Studies</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#1c2a2b]/60 block mb-1.5">Max Studies</label>
            <input type="number" value={limit} min={10} max={10000} step={50}
              onChange={e => setLimit(parseInt(e.target.value) || 100)}
              className="w-full rounded-lg border border-[#0e393d]/15 px-3 py-2 text-sm focus:outline-none focus:border-[#0e393d]/40" />
            <p className="text-[11px] text-[#1c2a2b]/35 mt-1">
              Estimated embedding cost: ~${estCost} USD (excl. studies already in DB)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDryRun(!dryRun)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${dryRun ? 'bg-[#0e393d]' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${dryRun ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <div>
              <p className="text-sm text-[#0e393d] font-medium">Dry Run</p>
              <p className="text-[11px] text-[#1c2a2b]/40">Preview what would be fetched without writing to DB</p>
            </div>
          </div>

          {!dryRun && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-800">Live ingestion mode</p>
              <p className="text-xs text-amber-700 mt-0.5">This will write to the studies table and incur OpenAI API costs.</p>
            </div>
          )}
        </div>

        <button onClick={trigger} disabled={running}
          className="w-full py-2.5 rounded-xl bg-[#0e393d] text-white text-sm font-semibold hover:bg-[#0e393d]/80 disabled:opacity-50 transition-colors">
          {running ? 'Starting...' : dryRun ? 'Run Dry Run' : 'Start Ingestion'}
        </button>

        {result && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-xs font-semibold text-emerald-800">Job started!</p>
            <p className="text-xs text-emerald-700 mt-0.5">Job ID: {result.jobId} — switch to Jobs tab to monitor.</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-800">Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Jobs tab ──────────────────────────────────────────────────────────────────

function JobsTab() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadJobs = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setJobs((data ?? []) as IngestionJob[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadJobs();
    // Auto-refresh if any job is running
    intervalRef.current = setInterval(() => {
      if (jobs.some(j => j.status === 'running' || j.status === 'pending')) {
        loadJobs();
      }
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadJobs, jobs]);

  if (loading) return <div className="p-8 text-sm text-[#1c2a2b]/35">Loading jobs...</div>;

  // Context banner about CLI jobs
  const cliBanner = (
    <div className="rounded-xl border border-[#0e393d]/8 bg-[#0e393d]/[.02] p-4 mb-4">
      <p className="text-xs font-semibold text-[#0e393d] mb-1">Job History Note</p>
      <p className="text-[11px] text-[#1c2a2b]/50 leading-relaxed">
        This tab shows jobs triggered from the web UI. The initial database build (18K studies, 4K NF content,
        2.3K book chunks) was done via CLI scripts and is not listed here. NutritionFacts.org sync jobs appear
        in the NutritionFacts tab.
      </p>
    </div>
  );

  if (jobs.length === 0) return (
    <div className="p-8">
      {cliBanner}
      <p className="text-sm text-[#1c2a2b]/35">No web-triggered ingestion jobs yet.</p>
    </div>
  );

  return (
    <div className="p-8 space-y-3">
      {cliBanner}
      {jobs.map(job => (
        <div key={job.id} className="rounded-xl border border-[#0e393d]/8 bg-white overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === job.id ? null : job.id)}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#0e393d]/[.01] transition-colors text-left"
          >
            <Badge status={job.status} />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0e393d]">
                {SOURCE_LABELS[job.source] ?? job.source}
                {job.dry_run && <span className="ml-2 text-[10px] text-[#1c2a2b]/40 font-normal">(dry run)</span>}
              </p>
              <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
                Limit: {job.limit_count ?? '—'} · Found: {job.total_found} · Stored: {job.total_stored} · Skipped: {job.total_skipped}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-[#1c2a2b]/40">{fmt(job.created_at)}</p>
              {job.started_at && job.completed_at && (
                <p className="text-[10px] text-[#1c2a2b]/25">
                  {Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s
                </p>
              )}
            </div>
            <span className="text-[#1c2a2b]/25 text-xs">{expanded === job.id ? '▲' : '▼'}</span>
          </button>

          {expanded === job.id && (
            <div className="border-t border-[#0e393d]/8 px-5 py-4">
              {job.error_message && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-3">
                  <p className="text-xs font-semibold text-red-800">Error</p>
                  <p className="text-xs text-red-700 mt-0.5">{job.error_message}</p>
                </div>
              )}
              {job.log_lines?.length > 0 && (
                <div className="rounded-lg bg-[#0e393d]/[.03] p-3 font-mono text-[10px] text-[#1c2a2b]/60 max-h-64 overflow-y-auto space-y-0.5">
                  {job.log_lines.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── NutritionFacts Sync tab ──────────────────────────────────────────────────

interface NfSyncJob {
  id: string;
  status: string;
  new_videos: number;
  new_blogs: number;
  new_questions: number;
  new_pmids_found: number;
  new_pmids_ingested: number;
  total_embedded: number;
  error_message: string | null;
  log_lines: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface NfSyncStats {
  totalNfContent: number;
  withEmbeddings: number;
  typeCounts: { content_type: string; count: number }[];
  recentContent: { slug: string; title: string; content_type: string; created_at: string }[];
  recentJobs: NfSyncJob[];
}

function NfSyncTab() {
  const [stats, setStats] = useState<NfSyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/nf-sync');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
    // Auto-refresh while syncing
    intervalRef.current = setInterval(() => {
      if (stats?.recentJobs?.some(j => j.status === 'running' || j.status === 'pending')) {
        loadStats();
      }
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadStats, stats?.recentJobs]);

  const triggerSync = async () => {
    if (!confirm('Start NutritionFacts.org sync? This will check for new videos, blogs, and Q&As.')) return;
    setSyncing(true);
    setError('');
    try {
      const res = await fetch('/api/admin/nf-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      // Refresh stats to show new job
      setTimeout(loadStats, 1000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-[#1c2a2b]/35">Loading NutritionFacts stats...</div>;

  const isRunning = stats?.recentJobs?.some(j => j.status === 'running' || j.status === 'pending');

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Content" value={stats?.totalNfContent ?? 0} />
        <StatCard
          label="Videos"
          value={stats?.typeCounts?.find(t => t.content_type === 'video')?.count ?? 0}
        />
        <StatCard
          label="Blog Posts"
          value={stats?.typeCounts?.find(t => t.content_type === 'blog')?.count ?? 0}
        />
        <StatCard
          label="With Embeddings"
          value={stats?.withEmbeddings ?? 0}
          sub={stats ? `${Math.round((stats.withEmbeddings / Math.max(stats.totalNfContent, 1)) * 100)}% coverage` : ''}
        />
      </div>

      {/* Sync control */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0e393d]">NutritionFacts.org Content Sync</h2>
            <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">
              Checks for new videos, blog posts, and Q&As. Extracts transcripts, PMIDs, and generates embeddings.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            isRunning
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/20'
              : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
            {isRunning ? 'Syncing' : 'Idle'}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={triggerSync}
            disabled={syncing || !!isRunning}
            className="flex-1 py-2.5 rounded-xl bg-[#4a8b3f] text-white text-sm font-semibold hover:bg-[#4a8b3f]/80 disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Starting...' : isRunning ? 'Sync Running...' : 'Sync Now'}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-800">Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        )}

        <p className="text-[10px] text-[#1c2a2b]/30 mt-3">
          Also runs automatically every Monday at 6am via scheduled task.
        </p>
      </div>

      {/* Recent content */}
      {stats?.recentContent && stats.recentContent.length > 0 && (
        <div className="rounded-xl border border-[#0e393d]/8 bg-white p-5">
          <p className="text-xs font-semibold text-[#0e393d] mb-3">Most Recently Added</p>
          <div className="space-y-2">
            {stats.recentContent.map(item => (
              <div key={item.slug} className="flex items-center gap-3 text-xs">
                <span className={`shrink-0 w-14 text-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  item.content_type === 'video' ? 'bg-[#4a8b3f]/10 text-[#4a8b3f]'
                  : item.content_type === 'blog' ? 'bg-blue-50 text-blue-700'
                  : 'bg-purple-50 text-purple-700'
                }`}>
                  {item.content_type}
                </span>
                <span className="flex-1 text-[#1c2a2b]/60 truncate">{item.title}</span>
                <span className="shrink-0 text-[#1c2a2b]/30">{fmt(item.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync history */}
      {stats?.recentJobs && stats.recentJobs.length > 0 && (
        <div className="rounded-xl border border-[#0e393d]/8 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#0e393d]/8">
            <p className="text-xs font-semibold text-[#0e393d]">Sync History</p>
          </div>
          <div className="divide-y divide-[#0e393d]/6">
            {stats.recentJobs.map(job => (
              <div key={job.id}>
                <button
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  className="w-full px-5 py-3 flex items-center gap-4 hover:bg-[#0e393d]/[.01] transition-colors text-left"
                >
                  <Badge status={job.status} />
                  <div className="flex-1">
                    <p className="text-xs text-[#1c2a2b]/60">
                      {job.new_videos > 0 ? `${job.new_videos} videos` : ''}
                      {job.new_blogs > 0 ? `${job.new_videos > 0 ? ', ' : ''}${job.new_blogs} blogs` : ''}
                      {job.new_questions > 0 ? `${(job.new_videos + job.new_blogs) > 0 ? ', ' : ''}${job.new_questions} Q&As` : ''}
                      {(job.new_videos + job.new_blogs + job.new_questions) === 0 ? 'No new content' : ''}
                      {job.new_pmids_found > 0 ? ` · ${job.new_pmids_found} new PMIDs` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-[#1c2a2b]/30 shrink-0">{fmt(job.created_at)}</span>
                  <span className="text-[#1c2a2b]/25 text-xs">{expandedJob === job.id ? '▲' : '▼'}</span>
                </button>

                {expandedJob === job.id && (
                  <div className="px-5 pb-4">
                    {job.error_message && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-3">
                        <p className="text-xs text-red-700">{job.error_message}</p>
                      </div>
                    )}
                    {job.log_lines?.length > 0 && (
                      <div className="rounded-lg bg-[#0e393d]/[.03] p-3 font-mono text-[10px] text-[#1c2a2b]/60 max-h-48 overflow-y-auto space-y-0.5">
                        {job.log_lines.map((line, i) => <p key={i}>{line}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main manager ──────────────────────────────────────────────────────────────

export default function AIResearchManager() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    const res = await fetch('/api/admin/ai-research');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'studies', label: 'Studies' },
    { id: 'ingest', label: 'Ingest' },
    { id: 'nf-sync', label: 'NutritionFacts' },
    { id: 'jobs', label: 'Jobs' },
  ];

  // Computed totals for key indicators
  const totalAllContent = (stats?.totalStudies ?? 0) + (stats?.totalBookChunks ?? 0) + (stats?.totalNfContent ?? 0);
  const totalAllEmbedded = (stats?.withEmbeddings ?? 0) + (stats?.totalBookChunks ?? 0) + (stats?.nfWithEmbeddings ?? 0);
  const embCoveragePct = totalAllContent > 0 ? Math.round((totalAllEmbedded / totalAllContent) * 100) : 0;

  return (
    <div>
      {/* Key indicator cards — products-page style */}
      {stats && (
        <div className="px-8 pt-6 pb-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
              <div className="text-2xl font-semibold text-[#0e393d] tabular-nums">{stats.totalStudies.toLocaleString()}</div>
              <div className="text-xs text-[#1c2a2b]/50 mt-0.5">PubMed Studies</div>
            </div>
            <div className="rounded-xl border border-[#4a8b3f]/20 bg-gradient-to-br from-white to-[#4a8b3f]/[0.03] px-4 py-3">
              <div className="text-2xl font-semibold text-[#4a8b3f] tabular-nums">{stats.totalNfContent.toLocaleString()}</div>
              <div className="text-xs text-[#4a8b3f]/60 mt-0.5">NF Content Items</div>
            </div>
            <div className="rounded-xl border border-purple-200/60 bg-gradient-to-br from-white to-purple-50/30 px-4 py-3">
              <div className="text-2xl font-semibold text-purple-700 tabular-nums">{stats.totalBookChunks.toLocaleString()}</div>
              <div className="text-xs text-purple-600/60 mt-0.5">Book Chunks</div>
            </div>
            <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30 px-4 py-3">
              <div className="text-2xl font-semibold text-emerald-700 tabular-nums">{totalAllContent.toLocaleString()}</div>
              <div className="text-xs text-emerald-600/60 mt-0.5">Total Indexed</div>
            </div>
            <div className="rounded-xl border border-[#ceab84]/30 bg-gradient-to-br from-white to-[#ceab84]/[0.04] px-4 py-3">
              <div className="text-2xl font-semibold text-[#8a6a3e] tabular-nums">{embCoveragePct}%</div>
              <div className="text-xs text-[#8a6a3e]/60 mt-0.5">Embedding Coverage</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b border-[#0e393d]/8 px-8 pt-3">
        <div className="flex gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
                tab === id
                  ? 'text-[#0e393d] bg-white'
                  : 'text-[#0e393d]/45 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/[0.03]'
              }`}
            >
              {label}
              {tab === id && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0e393d] rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (loadingStats
        ? <div className="p-8 text-sm text-[#1c2a2b]/35">Loading stats...</div>
        : stats ? <OverviewTab stats={stats} /> : <div className="p-8 text-sm text-red-500">Failed to load stats</div>
      )}
      {tab === 'studies' && <StudiesTab />}
      {tab === 'ingest' && <IngestTab onJobStarted={() => { loadStats(); setTab('jobs'); }} />}
      {tab === 'nf-sync' && <NfSyncTab />}
      {tab === 'jobs' && <JobsTab />}
    </div>
  );
}
