'use client';

import { useState, useCallback } from 'react';
import PageShell from '@/components/admin/PageShell';

// ── Types ───────────────────────────────────────────────────────────────────

interface Biomarker {
  id: string;
  slug: string;
  name: Record<string, string>;
  category: string;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  age_stratified: boolean;
  has_sex_specific_ranges: boolean;
  is_calculated: boolean;
}

interface PresentationRule {
  scoreRange: [number, number];
  cardStyle: 'compact' | 'detailed' | 'risk-alert' | 'comparison' | 'trend';
  showResearchLink: boolean;
  showTrend: boolean;
  priority: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DOMAIN_CONFIG: { key: string; label: string; icon: string; description: string }[] = [
  { key: 'heart_vessels',    label: 'Heart & Vessels',    icon: '❤️', description: 'Cholesterol, triglycerides, ApoB, Lp(a), homocysteine' },
  { key: 'metabolism',       label: 'Metabolism',         icon: '⚡', description: 'Glucose, HbA1c, insulin, HOMA-IR, uric acid' },
  { key: 'inflammation',     label: 'Inflammation',       icon: '🛡️', description: 'hsCRP, IL-6, WBC, ferritin' },
  { key: 'organ_function',   label: 'Organ Function',     icon: '🫁', description: 'ALT, AST, GGT, eGFR, TSH' },
  { key: 'nutrients',        label: 'Nutrients',          icon: '🥗', description: 'Vitamin D, B12, folate, Omega-3, magnesium, zinc, iron' },
  { key: 'hormones',         label: 'Hormones',           icon: '🧬', description: 'Testosterone, DHEA-S, cortisol, IGF-1' },
  { key: 'body_composition', label: 'Body Composition',   icon: '🏋️', description: 'BMI, body fat %, visceral fat' },
  { key: 'fitness',          label: 'Fitness & Recovery',  icon: '🏃', description: 'VO2max, grip strength, HRV' },
];

const BIO_AGE_CONFIG: { key: string; label: string; description: string; package: string }[] = [
  { key: 'phenoage',    label: 'PhenoAge',      description: 'Blood-based biological age (Levine 2018)', package: 'all' },
  { key: 'grimage',     label: 'GrimAge v2',    description: 'DNA methylation-based mortality predictor', package: 'complete' },
  { key: 'dunedinpace', label: 'DunedinPACE',   description: 'Pace of aging (rate, not age)', package: 'complete' },
];

// V1 correct weights from health-score.ts
const DEFAULT_WEIGHTS: Record<string, number> = {
  heart_vessels: 0.20, metabolism: 0.18, inflammation: 0.15,
  organ_function: 0.15, nutrients: 0.12, hormones: 0.10,
  body_composition: 0.05, fitness: 0.05,
};

const DEFAULT_BIO_AGE_WEIGHTS: Record<string, number> = {
  phenoage: 0.40, grimage: 0.35, dunedinpace: 0.25,
};

// Matches V2 engine thresholds from health-engine-v2-types.ts scoreToStatus()
const SCORE_THRESHOLDS = [
  { label: 'Optimal', min: 90, max: 100, color: '#0C9C6C', bgColor: 'bg-[#0C9C6C]', borderColor: 'border-[#0C9C6C]/20', bgFill: 'bg-[#0C9C6C]/[.03]', textColor: 'text-[#0C9C6C]', desc: 'Briefly acknowledged in briefing. Compact card — no action needed.' },
  { label: 'Good',     min: 75, max: 89,  color: '#5ba37a', bgColor: 'bg-[#5ba37a]', borderColor: 'border-[#5ba37a]/20', bgFill: 'bg-[#5ba37a]/[.03]', textColor: 'text-[#5ba37a]', desc: 'Positive mention in briefing. Compact card with optional trend.' },
  { label: 'Borderline', min: 55, max: 74, color: '#C4A96A', bgColor: 'bg-[#C4A96A]', borderColor: 'border-[#C4A96A]/20', bgFill: 'bg-[#C4A96A]/[.03]', textColor: 'text-[#C4A96A]', desc: 'Mentioned with context and improvement suggestions. Detailed card.' },
  { label: 'Risk',     min: 0,  max: 54,  color: '#E06B5B', bgColor: 'bg-[#E06B5B]', borderColor: 'border-red-200',      bgFill: 'bg-red-50/50',       textColor: 'text-[#E06B5B]', desc: 'Flagged for attention. Risk alert card with AI recommendation and research link.' },
];

const DEFAULT_PRESENTATION_RULES: PresentationRule[] = [
  { scoreRange: [0, 54],   cardStyle: 'risk-alert',  showResearchLink: true,  showTrend: true,  priority: 1 },
  { scoreRange: [55, 74],  cardStyle: 'detailed',    showResearchLink: true,  showTrend: true,  priority: 2 },
  { scoreRange: [75, 89],  cardStyle: 'detailed',    showResearchLink: false, showTrend: true,  priority: 3 },
  { scoreRange: [90, 100], cardStyle: 'compact',     showResearchLink: false, showTrend: false, priority: 4 },
];

const CARD_STYLES: { value: string; label: string; description: string }[] = [
  { value: 'risk-alert', label: 'Risk Alert',  description: 'Large card with red accent, detailed explanation, research link, and AI recommendation' },
  { value: 'detailed',   label: 'Detailed',    description: 'Full card with value, range bar, trend arrow, and optional research link' },
  { value: 'compact',    label: 'Compact',     description: 'Small card with value and traffic light dot — minimal space' },
  { value: 'comparison', label: 'Comparison',  description: 'Shows current vs. previous value side by side with delta' },
  { value: 'trend',      label: 'Trend',       description: 'Sparkline showing the last 3-5 measurements over time' },
];

const CATEGORY_LABELS: Record<string, string> = {
  heart_vessels: 'Heart & Vessels', metabolism: 'Metabolism', inflammation: 'Inflammation',
  organ_function: 'Organ Function', nutrients: 'Nutrients', hormones: 'Hormones',
  body_composition: 'Body Composition', fitness: 'Fitness', epigenetics: 'Epigenetics',
};

// ── Card Preview Components ────────────────────────────────────────────────

function RiskAlertPreview() {
  return (
    <div className="rounded-xl border-l-4 border-[#E06B5B] bg-white shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E06B5B]" />
              <span className="text-[13px] font-semibold text-[#0e393d]">LDL Cholesterol</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-[#E06B5B]">Risk</span>
            </div>
            <p className="text-[11px] text-[#1c2a2b]/50 mt-1 leading-relaxed max-w-sm">
              Your LDL is elevated at <strong className="text-[#0e393d]">162 mg/dL</strong> (optimal &lt;100). Elevated LDL is a key driver of atherosclerosis...
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[24px] font-serif font-semibold text-[#E06B5B]">162</div>
            <div className="text-[10px] text-[#1c2a2b]/40">mg/dL</div>
          </div>
        </div>
        {/* Range bar */}
        <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-[#0C9C6C] via-[#C4A96A] to-[#E06B5B] relative">
          <div className="absolute w-3 h-3 bg-white border-2 border-[#E06B5B] rounded-full -top-0.5" style={{ left: '82%' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[#1c2a2b]/25">0</span>
          <span className="text-[9px] text-[#0C9C6C]/60">Optimal &lt;100</span>
          <span className="text-[9px] text-[#1c2a2b]/25">200+</span>
        </div>
        {/* AI recommendation */}
        <div className="mt-3 p-2.5 rounded-lg bg-[#E06B5B]/[.04] border border-[#E06B5B]/10">
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E06B5B" strokeWidth="2"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
            <span className="text-[10px] font-semibold text-[#E06B5B]">AI Recommendation</span>
          </div>
          <p className="text-[10px] text-[#1c2a2b]/50 leading-relaxed">Consider dietary changes and discuss statin therapy with your physician. Retest in 6-8 weeks.</p>
        </div>
        {/* Research link */}
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#0e393d]/40 hover:text-[#0e393d]/60 cursor-pointer">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>View research sources</span>
        </div>
      </div>
    </div>
  );
}

function DetailedPreview() {
  return (
    <div className="rounded-xl border border-[#C4A96A]/30 bg-white shadow-sm overflow-hidden" style={{ borderTop: '3px solid #C4A96A' }}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-[#0e393d]">Vitamin D</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#C4A96A]/10 text-[#C4A96A]">Borderline</span>
            </div>
            <span className="text-[10px] text-[#1c2a2b]/40">25-Hydroxy</span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[22px] font-serif font-semibold text-[#C4A96A]">28</div>
            <div className="text-[10px] text-[#1c2a2b]/40">ng/mL</div>
          </div>
        </div>
        {/* Range bar */}
        <div className="mt-3 relative">
          <div className="h-2 rounded-full bg-[#0e393d]/[.06] relative overflow-hidden">
            <div className="absolute h-full bg-[#0C9C6C]/20 rounded-full" style={{ left: '40%', width: '35%' }} />
          </div>
          <div className="absolute w-2.5 h-2.5 bg-white border-2 border-[#C4A96A] rounded-full" style={{ left: '28%', top: '-1px' }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-[#1c2a2b]/25">10</span>
          <span className="text-[9px] text-[#0C9C6C]/60">40–60 optimal</span>
          <span className="text-[9px] text-[#1c2a2b]/25">100</span>
        </div>
        {/* Trend arrow */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-[#0C9C6C]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            <span>+5 from last test</span>
          </div>
          <span className="text-[9px] text-[#1c2a2b]/20">Score: 62</span>
        </div>
      </div>
    </div>
  );
}

function CompactPreview() {
  return (
    <div className="rounded-xl border border-[#0e393d]/[.07] bg-white shadow-sm p-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full bg-[#0C9C6C]" />
        <div>
          <div className="text-[12px] font-semibold text-[#0e393d]">HbA1c</div>
          <div className="text-[10px] text-[#1c2a2b]/35">Optimal</div>
        </div>
      </div>
      <div className="text-right">
        <span className="text-[18px] font-serif font-semibold text-[#0C9C6C]">5.1</span>
        <span className="text-[10px] text-[#1c2a2b]/40 ml-1">%</span>
      </div>
    </div>
  );
}

function ComparisonPreview() {
  return (
    <div className="rounded-xl border border-[#0e393d]/[.07] bg-white shadow-sm overflow-hidden" style={{ borderTop: '3px solid #5ba37a' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[13px] font-semibold text-[#0e393d]">hsCRP</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#5ba37a]/10 text-[#5ba37a]">Good</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Previous */}
          <div className="flex-1 text-center p-3 rounded-lg bg-[#0e393d]/[.02]">
            <div className="text-[9px] text-[#1c2a2b]/30 uppercase tracking-wider mb-1">Previous</div>
            <div className="text-[20px] font-serif font-semibold text-[#1c2a2b]/40">2.4</div>
            <div className="text-[9px] text-[#1c2a2b]/25">mg/L</div>
            <div className="text-[9px] text-[#C4A96A] mt-1">Borderline</div>
          </div>
          {/* Arrow */}
          <div className="flex flex-col items-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0C9C6C" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <span className="text-[10px] font-semibold text-[#0C9C6C] mt-0.5">-1.6</span>
          </div>
          {/* Current */}
          <div className="flex-1 text-center p-3 rounded-lg bg-[#5ba37a]/[.04] border border-[#5ba37a]/10">
            <div className="text-[9px] text-[#1c2a2b]/30 uppercase tracking-wider mb-1">Current</div>
            <div className="text-[20px] font-serif font-semibold text-[#5ba37a]">0.8</div>
            <div className="text-[9px] text-[#1c2a2b]/25">mg/L</div>
            <div className="text-[9px] text-[#5ba37a] mt-1">Good</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendPreview() {
  return (
    <div className="rounded-xl border border-[#0e393d]/[.07] bg-white shadow-sm overflow-hidden" style={{ borderTop: '3px solid #0C9C6C' }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#0e393d]">Vitamin B12</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0C9C6C]/10 text-[#0C9C6C]">Optimal</span>
          </div>
          <div className="text-right">
            <span className="text-[16px] font-serif font-semibold text-[#0C9C6C]">612</span>
            <span className="text-[10px] text-[#1c2a2b]/40 ml-1">pg/mL</span>
          </div>
        </div>
        {/* Sparkline */}
        <div className="relative h-14 mt-1">
          <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none">
            {/* Optimal zone */}
            <rect x="0" y="5" width="200" height="20" fill="rgba(12,156,108,0.06)" rx="2" />
            {/* Data line */}
            <polyline
              fill="none"
              stroke="#0C9C6C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="10,42 50,35 90,28 130,18 170,12"
            />
            {/* Data dots */}
            <circle cx="10" cy="42" r="3" fill="#C4A96A" />
            <circle cx="50" cy="35" r="3" fill="#C4A96A" />
            <circle cx="90" cy="28" r="3" fill="#5ba37a" />
            <circle cx="130" cy="18" r="3" fill="#0C9C6C" />
            <circle cx="170" cy="12" r="3.5" fill="#0C9C6C" stroke="white" strokeWidth="1.5" />
          </svg>
          {/* X-axis labels */}
          <div className="flex justify-between mt-0.5">
            <span className="text-[8px] text-[#1c2a2b]/20">Jan 24</span>
            <span className="text-[8px] text-[#1c2a2b]/20">Apr 24</span>
            <span className="text-[8px] text-[#1c2a2b]/20">Jul 24</span>
            <span className="text-[8px] text-[#1c2a2b]/20">Oct 24</span>
            <span className="text-[8px] text-[#1c2a2b]/30 font-medium">Now</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function HealthEngineSettings({
  initialWeights,
  initialBioAgeWeights,
  initialBiomarkers,
  initialPresentationRules,
}: {
  initialWeights: Record<string, number> | null;
  initialBioAgeWeights: Record<string, number> | null;
  initialBiomarkers: Biomarker[];
  initialPresentationRules: Record<string, unknown> | null;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'scoring' | 'biomarkers' | 'presentation'>('scoring');

  // ── Scoring state ─────────────────────────────────────────────
  const [weights, setWeights] = useState<Record<string, number>>(
    initialWeights ?? DEFAULT_WEIGHTS
  );
  const [bioAgeWeights, setBioAgeWeights] = useState<Record<string, number>>(
    initialBioAgeWeights ?? DEFAULT_BIO_AGE_WEIGHTS
  );

  // ── Biomarker state ───────────────────────────────────────────
  const [biomarkers] = useState<Biomarker[]>(initialBiomarkers);
  const [biomarkerFilter, setBiomarkerFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState<'all' | 'measured' | 'calculated'>('all');

  // ── Presentation rules state ──────────────────────────────────
  const [rules, setRules] = useState<PresentationRule[]>(
    (initialPresentationRules as unknown as PresentationRule[]) ?? DEFAULT_PRESENTATION_RULES
  );

  const markDirty = useCallback(() => setDirty(true), []);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightOk = Math.abs(totalWeight - 1.0) < 0.001;
  const totalBioAgeWeight = Object.values(bioAgeWeights).reduce((a, b) => a + b, 0);
  const bioAgeWeightOk = Math.abs(totalBioAgeWeight - 1.0) < 0.001;

  const normalizeWeights = (w: Record<string, number>, setter: (v: Record<string, number>) => void) => {
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    setter(Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Math.round((v / total) * 100) / 100])));
    markDirty();
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/admin/ai-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain_weights: weights,
        bio_age_weights: bioAgeWeights,
        he_presentation_rules: rules,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  // ── Filtered biomarkers ───────────────────────────────────────
  const filteredBiomarkers = biomarkers.filter(b => {
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
    if (packageFilter === 'measured' && b.is_calculated) return false;
    if (packageFilter === 'calculated' && !b.is_calculated) return false;
    if (biomarkerFilter) {
      const q = biomarkerFilter.toLowerCase();
      return b.slug.includes(q) || (b.name?.en ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const categories = [...new Set(biomarkers.map(b => b.category))].sort();

  return (
    <PageShell
      title="Health Engine"
      description="Configure scoring weights, biomarker display, and presentation rules for the Health Engine dashboard."
      action={
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-[13px] font-medium hover:bg-[#0e393d]/90 disabled:opacity-40 transition-all"
        >
          {saving ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : saved ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : null}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      }
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-6">
        {([
          { key: 'scoring', label: 'Scoring', icon: '⚖️' },
          { key: 'biomarkers', label: 'Biomarkers', icon: '🔬' },
          { key: 'presentation', label: 'Presentation Rules', icon: '🎨' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[#0e393d] text-white shadow-sm'
                : 'bg-[#0e393d]/[.04] text-[#0e393d]/60 hover:bg-[#0e393d]/[.08]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB: SCORING
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'scoring' && (
        <div className="space-y-6">

          {/* Health Score weights */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[13px] font-semibold text-[#0e393d]">Health Score — Domain Weights</h2>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  weightOk ? 'bg-[#0C9C6C]/10 text-[#0C9C6C]' : 'bg-red-100 text-red-600'
                }`}>
                  {Math.round(totalWeight * 100)}% total
                </span>
                <button onClick={() => normalizeWeights(weights, setWeights)} className="text-[11px] text-[#0e393d]/40 hover:text-[#0e393d] border border-[#0e393d]/10 px-2 py-1 rounded-lg transition-colors">
                  Normalize
                </button>
                <button onClick={() => { setWeights(DEFAULT_WEIGHTS); markDirty(); }} className="text-[11px] text-[#0e393d]/40 hover:text-[#0e393d] border border-[#0e393d]/10 px-2 py-1 rounded-lg transition-colors">
                  Reset
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#1c2a2b]/40 mb-5">
              How much each health domain contributes to the overall Health Score (0–100). Must sum to 100%.
              Epigenetics is <strong>not</strong> included here — it feeds into the separate Bio Age Score.
            </p>
            <div className="space-y-3.5">
              {DOMAIN_CONFIG.map(({ key, label, icon, description }) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-5 text-center">{icon}</span>
                  <span className="w-40 text-[12px] font-medium text-[#0e393d] shrink-0">{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={0.35}
                    step={0.01}
                    value={weights[key] ?? 0}
                    onChange={e => { setWeights(prev => ({ ...prev, [key]: parseFloat(e.target.value) })); markDirty(); }}
                    className="flex-1 h-1.5 accent-[#0e393d] cursor-pointer"
                    title={description}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={35}
                      step={1}
                      value={Math.round((weights[key] ?? 0) * 100)}
                      onChange={e => { setWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) / 100 })); markDirty(); }}
                      className="w-12 text-right text-[13px] font-semibold text-[#0e393d] bg-transparent border-b border-[#0e393d]/10 focus:border-[#0e393d]/30 outline-none"
                    />
                    <span className="text-[11px] text-[#1c2a2b]/30">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bio Age Score weights */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[13px] font-semibold text-[#0e393d]">Bio Age Score — Clock Weights</h2>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  bioAgeWeightOk ? 'bg-[#0C9C6C]/10 text-[#0C9C6C]' : 'bg-red-100 text-red-600'
                }`}>
                  {Math.round(totalBioAgeWeight * 100)}% total
                </span>
                <button onClick={() => normalizeWeights(bioAgeWeights, setBioAgeWeights)} className="text-[11px] text-[#0e393d]/40 hover:text-[#0e393d] border border-[#0e393d]/10 px-2 py-1 rounded-lg transition-colors">
                  Normalize
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#1c2a2b]/40 mb-5">
              How the 3 biological age clocks combine into the Bio Age Score. This is separate from the Health Score.
              Together, Health Score + Bio Age Score form the two gauges on the user&apos;s dashboard.
            </p>
            <div className="space-y-3.5">
              {BIO_AGE_CONFIG.map(({ key, label, description, package: pkg }) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-5 text-center">🧪</span>
                  <div className="w-40 shrink-0">
                    <span className="text-[12px] font-medium text-[#0e393d]">{label}</span>
                    {pkg === 'complete' && (
                      <span className="ml-1.5 text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 uppercase">Complete</span>
                    )}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.60}
                    step={0.05}
                    value={bioAgeWeights[key] ?? 0}
                    onChange={e => { setBioAgeWeights(prev => ({ ...prev, [key]: parseFloat(e.target.value) })); markDirty(); }}
                    className="flex-1 h-1.5 accent-[#0e393d] cursor-pointer"
                    title={description}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={5}
                      value={Math.round((bioAgeWeights[key] ?? 0) * 100)}
                      onChange={e => { setBioAgeWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) / 100 })); markDirty(); }}
                      className="w-12 text-right text-[13px] font-semibold text-[#0e393d] bg-transparent border-b border-[#0e393d]/10 focus:border-[#0e393d]/30 outline-none"
                    />
                    <span className="text-[11px] text-[#1c2a2b]/30">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#0e393d]/[.02] text-[10px] text-[#1c2a2b]/40">
              <strong className="text-[#0e393d]/60">Score architecture:</strong> The user&apos;s dashboard shows two gauges side by side —
              the <strong>Health Score</strong> (weighted average of 8 health domains above) and the <strong>Bio Age Score</strong> (weighted
              average of 3 epigenetic clocks). They are independent scores, not combined.
              PhenoAge is available in all packages. GrimAge v2 and DunedinPACE are <strong>Complete package only</strong>.
            </div>
          </div>

          {/* Score thresholds — 4-level matching V2 engine */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-1">Score Thresholds</h2>
            <p className="text-[11px] text-[#1c2a2b]/40 mb-4">
              Four-level system matching the V2 engine&apos;s <code className="text-[10px] bg-[#0e393d]/[.04] px-1 py-0.5 rounded">scoreToStatus()</code> function. These ranges determine status labels, colors, and card styles throughout the dashboard.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {SCORE_THRESHOLDS.map(t => (
                <div key={t.label} className={`rounded-lg border ${t.borderColor} ${t.bgFill} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className={`text-[12px] font-semibold ${t.textColor}`}>{t.label}</span>
                  </div>
                  <p className={`text-[11px] ${t.textColor} opacity-70`}>
                    {t.min === 0 ? `Score < ${t.max + 1}` : t.max === 100 ? `Score >= ${t.min}` : `Score ${t.min}–${t.max}`}
                  </p>
                  <p className={`text-[10px] ${t.textColor} opacity-40 mt-1`}>{t.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#0e393d]/[.02] text-[10px] text-[#1c2a2b]/40">
              <strong className="text-[#0e393d]/60">Color mapping:</strong>{' '}
              <span style={{ color: '#0C9C6C' }}>Optimal #0C9C6C</span> /{' '}
              <span style={{ color: '#5ba37a' }}>Good #5ba37a</span> /{' '}
              <span style={{ color: '#C4A96A' }}>Borderline #C4A96A</span> /{' '}
              <span style={{ color: '#E06B5B' }}>Risk #E06B5B</span>{' '}
              — used consistently in gauge, cards, dots, and trend charts.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: BIOMARKERS
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'biomarkers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[13px] font-semibold text-[#0e393d]">Biomarker Registry</h2>
                <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">
                  {biomarkers.length} biomarkers across {categories.length} categories.
                  Biomarkers not in a user&apos;s package appear grayed out on their dashboard.
                  Edit details in the <a href="/en/admin/biomarkers" className="text-[#0e393d] underline underline-offset-2 hover:text-[#0e393d]/80">Biomarkers admin</a>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={packageFilter}
                  onChange={e => setPackageFilter(e.target.value as 'all' | 'measured' | 'calculated')}
                  className="rounded-lg border border-[#0e393d]/[.12] px-3 py-1.5 text-[12px] text-[#0e393d] bg-[#fafaf8] outline-none"
                >
                  <option value="all">All types</option>
                  <option value="measured">Measured only</option>
                  <option value="calculated">Calculated only</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-[#0e393d]/[.12] px-3 py-1.5 text-[12px] text-[#0e393d] bg-[#fafaf8] outline-none"
                >
                  <option value="all">All categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search biomarkers..."
                  value={biomarkerFilter}
                  onChange={e => setBiomarkerFilter(e.target.value)}
                  className="rounded-lg border border-[#0e393d]/[.12] px-3 py-1.5 text-[12px] text-[#0e393d] bg-[#fafaf8] outline-none w-48 placeholder:text-[#1c2a2b]/25"
                />
              </div>
            </div>

            {/* Package legend */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[#0e393d]/[.05]">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">CORE</span>
                <span className="text-[10px] text-[#1c2a2b]/40">38 measured markers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">PRO</span>
                <span className="text-[10px] text-[#1c2a2b]/40">55 measured + hormones, inflammation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">COMPLETE</span>
                <span className="text-[10px] text-[#1c2a2b]/40">57 measured + epigenetics</span>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#0e393d]/[.06] text-[#0e393d]/50">CALC</span>
                <span className="text-[10px] text-[#1c2a2b]/40">Derived from other markers</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#0e393d]/[.07]">
                    <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Biomarker</th>
                    <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Category</th>
                    <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Unit</th>
                    <th className="pb-2.5 text-center text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Reference Range</th>
                    <th className="pb-2.5 text-center text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Optimal Range</th>
                    <th className="pb-2.5 text-center text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Type</th>
                    <th className="pb-2.5 text-center text-[10px] font-semibold uppercase tracking-[.08em] text-[#1c2a2b]/40">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBiomarkers.map(b => (
                    <tr key={b.id} className="border-b border-[#0e393d]/[.04] hover:bg-[#0e393d]/[.015] transition-colors">
                      <td className="py-2.5">
                        <div className="font-medium text-[#0e393d]">{b.name?.en ?? b.slug}</div>
                        <div className="text-[10px] text-[#1c2a2b]/30 font-mono">{b.slug}</div>
                      </td>
                      <td className="py-2.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0e393d]/[.06] text-[#0e393d]/60">
                          {CATEGORY_LABELS[b.category] ?? b.category}
                        </span>
                      </td>
                      <td className="py-2.5 text-[#1c2a2b]/60 font-mono text-[11px]">{b.unit}</td>
                      <td className="py-2.5 text-center text-[#1c2a2b]/60">
                        {b.reference_range_low != null || b.reference_range_high != null ? (
                          <span>{b.reference_range_low ?? '–'} — {b.reference_range_high ?? '–'}</span>
                        ) : (
                          <span className="text-[#1c2a2b]/20">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        {b.optimal_range_low != null || b.optimal_range_high != null ? (
                          <span className="text-[#0C9C6C] font-medium">{b.optimal_range_low ?? '–'} — {b.optimal_range_high ?? '–'}</span>
                        ) : (
                          <span className="text-[#1c2a2b]/20">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        {b.is_calculated ? (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#0e393d]/[.06] text-[#0e393d]/50">CALC</span>
                        ) : (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">MEASURED</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {b.age_stratified && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600" title="Age-stratified ranges">AGE</span>
                          )}
                          {b.has_sex_specific_ranges && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600" title="Sex-specific ranges">SEX</span>
                          )}
                          {!b.age_stratified && !b.has_sex_specific_ranges && (
                            <span className="text-[#1c2a2b]/20">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBiomarkers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[12px] text-[#1c2a2b]/35">
                        {biomarkers.length === 0 ? 'No biomarkers found in database.' : 'No biomarkers match your filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#0e393d]/[.02] text-[10px] text-[#1c2a2b]/40">
              <strong className="text-[#0e393d]/60">Display behavior:</strong> All biomarkers are shown on every user&apos;s dashboard. Markers not included in
              the user&apos;s package (Core/Pro/Complete) appear grayed out with placeholder state, so users can see what&apos;s available
              in higher tiers. Markers without data from the current report also appear dimmed until the next report is uploaded.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB: PRESENTATION RULES
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'presentation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-1">Presentation Rules</h2>
            <p className="text-[11px] text-[#1c2a2b]/40 mb-5">
              Control how biomarkers are displayed based on their score. Rules are evaluated by priority (lowest number first).
              These affect both the dashboard cards and the AI briefing structure.
            </p>

            <div className="space-y-3">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-[#0e393d]/[.08] p-4 hover:border-[#0e393d]/[.15] transition-colors">
                  {/* Priority */}
                  <span className="w-6 h-6 rounded-full bg-[#0e393d]/[.06] flex items-center justify-center text-[10px] font-bold text-[#0e393d]/40 shrink-0">
                    {rule.priority}
                  </span>

                  {/* Score range */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      rule.scoreRange[1] < 55 ? 'bg-[#E06B5B]' :
                      rule.scoreRange[1] < 75 ? 'bg-[#C4A96A]' :
                      rule.scoreRange[1] < 90 ? 'bg-[#5ba37a]' : 'bg-[#0C9C6C]'
                    }`} />
                    <span className="text-[12px] font-medium text-[#0e393d] w-16">
                      {rule.scoreRange[0]}–{rule.scoreRange[1]}
                    </span>
                  </div>

                  {/* Card style */}
                  <select
                    value={rule.cardStyle}
                    onChange={e => {
                      const updated = [...rules];
                      updated[i] = { ...updated[i], cardStyle: e.target.value as PresentationRule['cardStyle'] };
                      setRules(updated);
                      markDirty();
                    }}
                    className="rounded-lg border border-[#0e393d]/[.12] px-2 py-1.5 text-[11px] text-[#0e393d] bg-[#fafaf8] outline-none"
                  >
                    {CARD_STYLES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  {/* Toggles */}
                  <label className="flex items-center gap-1.5 text-[10px] text-[#1c2a2b]/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.showResearchLink}
                      onChange={e => {
                        const updated = [...rules];
                        updated[i] = { ...updated[i], showResearchLink: e.target.checked };
                        setRules(updated);
                        markDirty();
                      }}
                      className="accent-[#0e393d] w-3.5 h-3.5"
                    />
                    Research link
                  </label>

                  <label className="flex items-center gap-1.5 text-[10px] text-[#1c2a2b]/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.showTrend}
                      onChange={e => {
                        const updated = [...rules];
                        updated[i] = { ...updated[i], showTrend: e.target.checked };
                        setRules(updated);
                        markDirty();
                      }}
                      className="accent-[#0e393d] w-3.5 h-3.5"
                    />
                    Show trend
                  </label>

                  {/* Description */}
                  <span className="text-[10px] text-[#1c2a2b]/25 ml-auto">
                    {CARD_STYLES.find(s => s.value === rule.cardStyle)?.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card Style Previews */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-1">Card Styles Reference</h2>
            <p className="text-[11px] text-[#1c2a2b]/40 mb-5">
              Live preview of each card style with sample biomarker data. These cards are rendered exactly as they appear on the user&apos;s Health Engine dashboard.
            </p>

            <div className="space-y-8">
              {/* Risk Alert */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E06B5B]" />
                  <h3 className="text-[12px] font-semibold text-[#0e393d]">Risk Alert</h3>
                  <span className="text-[10px] text-[#1c2a2b]/30">Score 0–54 (default)</span>
                </div>
                <div className="max-w-md">
                  <RiskAlertPreview />
                </div>
              </div>

              {/* Detailed */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C4A96A]" />
                  <h3 className="text-[12px] font-semibold text-[#0e393d]">Detailed</h3>
                  <span className="text-[10px] text-[#1c2a2b]/30">Score 55–89 (default)</span>
                </div>
                <div className="max-w-sm">
                  <DetailedPreview />
                </div>
              </div>

              {/* Compact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0C9C6C]" />
                  <h3 className="text-[12px] font-semibold text-[#0e393d]">Compact</h3>
                  <span className="text-[10px] text-[#1c2a2b]/30">Score 90–100 (default)</span>
                </div>
                <div className="max-w-xs">
                  <CompactPreview />
                </div>
              </div>

              {/* Comparison */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5ba37a]" />
                  <h3 className="text-[12px] font-semibold text-[#0e393d]">Comparison</h3>
                  <span className="text-[10px] text-[#1c2a2b]/30">Assignable to any score range</span>
                </div>
                <div className="max-w-sm">
                  <ComparisonPreview />
                </div>
              </div>

              {/* Trend */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0C9C6C]" />
                  <h3 className="text-[12px] font-semibold text-[#0e393d]">Trend</h3>
                  <span className="text-[10px] text-[#1c2a2b]/30">Sparkline for 3–5 measurements over time</span>
                </div>
                <div className="max-w-sm">
                  <TrendPreview />
                </div>
              </div>
            </div>
          </div>

          {/* AI Briefing Behavior */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-1">AI Briefing Behavior</h2>
            <p className="text-[11px] text-[#1c2a2b]/40 mb-4">
              The AI briefing uses the same rules to decide how much time to spend on each biomarker.
              When a user asks for details, the AI can instantly pull up an expanded chart view.
            </p>
            <div className="space-y-2 text-[12px] text-[#1c2a2b]/60">
              <div className="flex items-start gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#E06B5B] mt-1 shrink-0" /><span><strong className="text-[#0e393d]">Risk markers (0–54)</strong> — AI spends 60–90 seconds per marker with detailed explanation, research citations, and actionable recommendations</span></div>
              <div className="flex items-start gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#C4A96A] mt-1 shrink-0" /><span><strong className="text-[#0e393d]">Borderline markers (55–74)</strong> — AI spends 30–45 seconds with context and improvement suggestions</span></div>
              <div className="flex items-start gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#5ba37a] mt-1 shrink-0" /><span><strong className="text-[#0e393d]">Good markers (75–89)</strong> — AI spends 10–15 seconds with positive acknowledgment and trend mention</span></div>
              <div className="flex items-start gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0C9C6C] mt-1 shrink-0" /><span><strong className="text-[#0e393d]">Optimal markers (90–100)</strong> — AI briefly acknowledges in ~5 seconds (&ldquo;Your vitamin D looks great&rdquo;)</span></div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
