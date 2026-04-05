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

type Tab = 'overview' | 'studies' | 'ingest' | 'jobs';

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
  { key: 'greger_epub', label: 'Greger Books (EPUB)', tier: 1, target: 22000, description: '6 books: How Not to Age/Die/Diet, Lower LDL, Ozempic, Ultra-Processed' },
  { key: 'nutritionfacts', label: 'NutritionFacts.org', tier: 1, target: 5000, description: 'Articles, videos & citations from nutritionfacts.org' },
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

function ProgressBar({ value, max, color = 'bg-[#0C9C6C]', label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        {label && <p className="text-sm font-medium text-[#0e393d]">{label}</p>}
        <p className="text-sm font-semibold text-[#0e393d] tabular-nums">{pct}%</p>
      </div>
      <div className="h-2.5 rounded-full bg-[#0e393d]/8 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-[#1c2a2b]/40 mt-1.5">
        {value.toLocaleString()} / {max.toLocaleString()} studies
      </p>
    </div>
  );
}

function OverviewTab({ stats }: { stats: StatsData }) {
  const embPct = stats.totalStudies > 0
    ? Math.round((stats.withEmbeddings / stats.totalStudies) * 100)
    : 0;
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Studies" value={stats.totalStudies} />
        <StatCard label="Book Content Chunks" value={stats.totalBookChunks ?? 0} sub="Tier 0 — highest evidence" />
        <StatCard label="With Embeddings" value={stats.withEmbeddings} sub={`${embPct}% of total`} />
        <StatCard label="Biomarker-tagged" value={stats.withBiomarkers} sub={`${biomarkerPct}% of total`} />
        <StatCard label="Disease-tagged" value={stats.withDiseaseTags} sub={`${diseasePct}% of total`} />
      </div>

      {/* Coverage progress bars */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white p-5 space-y-5">
        <p className="text-xs font-semibold tracking-wider uppercase text-[#ceab84]">Indexing Coverage</p>
        <ProgressBar value={stats.withEmbeddings} max={stats.totalStudies} label="Embeddings" color="bg-[#0C9C6C]" />
        <ProgressBar value={stats.withBiomarkers} max={stats.totalStudies} label="Biomarker Tags" color="bg-[#0e393d]" />
        <ProgressBar value={stats.withDiseaseTags} max={stats.totalStudies} label="Disease Tags" color="bg-[#ceab84]" />
        {stats.withoutEmbeddings > 0 && (
          <p className="text-[11px] text-[#1c2a2b]/35">
            {stats.withoutEmbeddings.toLocaleString()} studies need embeddings · ~${stats.estimatedEmbeddingCostUsd} estimated cost
          </p>
        )}
      </div>

      {/* Quality tier breakdown */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#0e393d]/8">
          <p className="text-sm font-semibold text-[#0e393d]">Evidence Quality Tiers</p>
          <p className="text-[11px] text-[#1c2a2b]/35 mt-0.5">All research ranked by evidence strength (studies + book content)</p>
        </div>
        {stats.tierCounts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#1c2a2b]/35">No quality tiers assigned yet.</div>
        ) : (
          <div className="divide-y divide-[#0e393d]/[.04]">
            {stats.tierCounts.map(({ tier, count }) => {
              const totalAll = stats.totalStudies + stats.totalBookChunks;
              const pct = totalAll > 0 ? (count / totalAll) * 100 : 0;
              const info = TIER_LABELS[tier] ?? { label: `Tier ${tier}`, color: 'bg-gray-400' };
              const unitLabel = tier === 0 ? 'chunks' : 'studies';
              return (
                <div key={tier} className={`px-5 py-3.5 flex items-center gap-4 ${tier === 0 ? 'bg-purple-50/30' : ''}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${info.color} shrink-0`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0e393d]">{info.label}</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[#0e393d]/8 overflow-hidden w-48">
                      <div className={`h-full rounded-full ${info.color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#1c2a2b]/60 tabular-nums w-28 text-right">
                    {count.toLocaleString()} <span className="text-[11px] font-normal text-[#1c2a2b]/30">{unitLabel} ({pct.toFixed(1)}%)</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Source breakdown */}
      <div className="rounded-xl border border-[#0e393d]/8 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#0e393d]/8">
          <p className="text-sm font-semibold text-[#0e393d]">Studies by Source</p>
        </div>
        {stats.sourceCounts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#1c2a2b]/35">
            No studies in database yet. Run an ingestion job to get started.
          </div>
        ) : (
          <div className="divide-y divide-[#0e393d]/[.04]">
            {stats.sourceCounts.map(({ source, count }) => {
              const pct = stats.totalStudies > 0 ? (count / stats.totalStudies) * 100 : 0;
              return (
                <div key={source} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0e393d]">{SOURCE_LABELS[source] ?? source}</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[#0e393d]/8 overflow-hidden w-48">
                      <div className="h-full rounded-full bg-[#ceab84]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#1c2a2b]/60 tabular-nums w-16 text-right">
                    {count.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
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
          <div className="px-5 py-8 text-center text-sm text-[#1c2a2b]/35">No disease tags assigned yet. Run the backfill script.</div>
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

      {/* Recent jobs */}
      {stats.recentJobs.length > 0 && (
        <div className="rounded-xl border border-[#0e393d]/8 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#0e393d]/8">
            <p className="text-sm font-semibold text-[#0e393d]">Recent Ingestion Jobs</p>
          </div>
          <div className="divide-y divide-[#0e393d]/[.04]">
            {stats.recentJobs.slice(0, 5).map(job => (
              <div key={job.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                <Badge status={job.status} />
                <span className="flex-1 text-[#0e393d] font-medium">{SOURCE_LABELS[job.source] ?? job.source}</span>
                <span className="text-[#1c2a2b]/35 text-xs">{job.dry_run ? 'dry run · ' : ''}{job.total_stored} stored</span>
                <span className="text-[#1c2a2b]/35 text-xs">{fmt(job.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Studies tab ───────────────────────────────────────────────────────────────

function StudiesTab() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const loadStudies = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from('studies')
      .select('id,pmid,title,authors,journal,publication_year,abstract,mesh_terms,doi,source,biomarker_slugs,he_domains,created_at')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (sourceFilter) q = q.eq('source', sourceFilter);
    if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);

    const { data } = await q;
    setStudies((data ?? []) as Study[]);
    setLoading(false);
  }, [search, sourceFilter, page]);

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
          placeholder="Search by title..."
          className="flex-1 rounded-lg border border-[#0e393d]/15 px-3 py-2 text-sm text-[#1c2a2b] placeholder-[#1c2a2b]/30 focus:outline-none focus:border-[#0e393d]/40"
        />
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-[#0e393d]/15 px-3 py-2 text-sm text-[#1c2a2b] focus:outline-none focus:border-[#0e393d]/40"
        >
          <option value="">All sources</option>
          <option value="greger">Greger / NutritionFacts</option>
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide hidden lg:table-cell">Journal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide">Year</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#0e393d]/50 uppercase tracking-wide">Source</th>
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
        <p className="text-xs text-[#1c2a2b]/40">{studies.length} studies shown</p>
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
  const [source, setSource] = useState('greger');
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
    <div className="p-8 max-w-lg">
      <div className="rounded-xl border border-[#0e393d]/8 bg-white p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[#0e393d]">Run Ingestion Job</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#1c2a2b]/60 block mb-1.5">Data Source</label>
            <select value={source} onChange={e => setSource(e.target.value)}
              className="w-full rounded-lg border border-[#0e393d]/15 px-3 py-2 text-sm focus:outline-none focus:border-[#0e393d]/40">
              <option value="greger">Greger / NutritionFacts.org (books + videos)</option>
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
              <p className="text-[11px] text-[#1c2a2b]/40">Fetches + embeds but does not write to DB</p>
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
            <p className="text-xs text-emerald-700 mt-0.5">Job ID: {result.jobId}</p>
            <p className="text-xs text-emerald-700">Switch to the Jobs tab to monitor progress.</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-800">Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        )}
      </div>

      {/* Phase guide */}
      <div className="mt-6 rounded-xl border border-[#0e393d]/8 bg-white p-5">
        <p className="text-xs font-semibold text-[#0e393d] mb-3">Ingestion Phases</p>
        <div className="space-y-2.5">
          {[
            { phase: 'Phase 1', source: 'Greger / NutritionFacts', studies: '~15–20K', cost: '~$3–5' },
            { phase: 'Phase 2', source: 'PubMed Nutrition', studies: '~50–100K', cost: '~$15–30' },
            { phase: 'Phase 3', source: 'PubMed Longevity', studies: '~500K+', cost: '~$100–150' },
          ].map(({ phase, source: s, studies, cost }) => (
            <div key={phase} className="flex items-center gap-3 text-xs">
              <span className="w-14 font-semibold text-[#ceab84]">{phase}</span>
              <span className="flex-1 text-[#1c2a2b]/60">{s}</span>
              <span className="text-[#1c2a2b]/40">{studies}</span>
              <span className="text-[#0C9C6C] font-medium">{cost}</span>
            </div>
          ))}
        </div>
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
  if (jobs.length === 0) return <div className="p-8 text-sm text-[#1c2a2b]/35">No ingestion jobs yet. Run one from the Ingest tab.</div>;

  return (
    <div className="p-8 space-y-3">
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
    { id: 'jobs', label: 'Jobs' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-[#0e393d]/8 px-8 pt-5">
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
      {tab === 'jobs' && <JobsTab />}
    </div>
  );
}
