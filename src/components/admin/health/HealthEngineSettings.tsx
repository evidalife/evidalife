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
  { key: 'fitness',          label: 'Fitness & Recovery',  icon: '🏃', description: 'VO₂max, grip strength, HRV' },
];

const BIO_AGE_CONFIG: { key: string; label: string; description: string }[] = [
  { key: 'phenoage',    label: 'PhenoAge',      description: 'Blood-based biological age (Levine 2018)' },
  { key: 'grimage',     label: 'GrimAge v2',    description: 'DNA methylation-based mortality predictor' },
  { key: 'dunedinpace', label: 'DunedinPACE',   description: 'Pace of aging (rate, not age)' },
];

const DEFAULT_WEIGHTS: Record<string, number> = {
  heart_vessels: 0.20, metabolism: 0.18, inflammation: 0.15,
  organ_function: 0.15, nutrients: 0.12, hormones: 0.10,
  body_composition: 0.05, fitness: 0.05,
};

const DEFAULT_BIO_AGE_WEIGHTS: Record<string, number> = {
  phenoage: 0.40, grimage: 0.35, dunedinpace: 0.25,
};

const DEFAULT_PRESENTATION_RULES: PresentationRule[] = [
  { scoreRange: [0, 39],   cardStyle: 'risk-alert', showResearchLink: true,  showTrend: true, priority: 1 },
  { scoreRange: [40, 54],  cardStyle: 'detailed',   showResearchLink: true,  showTrend: true, priority: 2 },
  { scoreRange: [55, 74],  cardStyle: 'detailed',   showResearchLink: false, showTrend: true, priority: 3 },
  { scoreRange: [75, 100], cardStyle: 'compact',    showResearchLink: false, showTrend: false, priority: 4 },
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
              {BIO_AGE_CONFIG.map(({ key, label, description }) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-5 text-center">🧪</span>
                  <span className="w-40 text-[12px] font-medium text-[#0e393d] shrink-0">{label}</span>
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
            </div>
          </div>

          {/* Score thresholds */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-1">Score Thresholds</h2>
            <p className="text-[11px] text-[#1c2a2b]/40 mb-4">
              Traffic light system for individual biomarkers and domain scores. These ranges determine colors and labels throughout the dashboard.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-[12px] font-semibold text-red-700">Risk</span>
                </div>
                <p className="text-[11px] text-red-600/60">Score &lt; 50</p>
                <p className="text-[10px] text-red-600/40 mt-1">Flagged for attention in briefing. Shows detailed card with AI recommendation and research link.</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="text-[12px] font-semibold text-amber-700">Moderate</span>
                </div>
                <p className="text-[11px] text-amber-600/60">Score 50–74</p>
                <p className="text-[10px] text-amber-600/40 mt-1">Mentioned in briefing with improvement suggestions. Standard detailed card.</p>
              </div>
              <div className="rounded-lg border border-[#0C9C6C]/20 bg-[#0C9C6C]/[.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#0C9C6C]" />
                  <span className="text-[12px] font-semibold text-[#0C9C6C]">Optimal</span>
                </div>
                <p className="text-[11px] text-[#0C9C6C]/60">Score ≥ 75</p>
                <p className="text-[10px] text-[#0C9C6C]/40 mt-1">Briefly acknowledged in briefing. Compact card — no action needed.</p>
              </div>
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
                <p className="text-[11px] text-[#1c2a2b]/40 mt-0.5">{biomarkers.length} biomarkers across {categories.length} categories. Edit biomarkers in the <a href="/en/admin/biomarkers" className="text-[#0e393d] underline underline-offset-2 hover:text-[#0e393d]/80">Biomarkers admin</a>.</p>
              </div>
              <div className="flex items-center gap-2">
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
                  placeholder="Search biomarkers…"
                  value={biomarkerFilter}
                  onChange={e => setBiomarkerFilter(e.target.value)}
                  className="rounded-lg border border-[#0e393d]/[.12] px-3 py-1.5 text-[12px] text-[#0e393d] bg-[#fafaf8] outline-none w-48 placeholder:text-[#1c2a2b]/25"
                />
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
                      <td colSpan={6} className="py-8 text-center text-[12px] text-[#1c2a2b]/35">
                        {biomarkers.length === 0 ? 'No biomarkers found in database.' : 'No biomarkers match your filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                      rule.scoreRange[1] < 50 ? 'bg-red-400' :
                      rule.scoreRange[1] < 75 ? 'bg-amber-400' : 'bg-[#0C9C6C]'
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

          {/* Card style reference */}
          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-4">Card Styles Reference</h2>
            <div className="grid grid-cols-5 gap-3">
              {CARD_STYLES.map(style => (
                <div key={style.value} className="rounded-lg border border-[#0e393d]/[.08] p-3">
                  <div className="text-[12px] font-semibold text-[#0e393d] mb-1">{style.label}</div>
                  <p className="text-[10px] text-[#1c2a2b]/40">{style.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#0e393d]/[.07] p-6">
            <h2 className="text-[13px] font-semibold text-[#0e393d] mb-1">AI Briefing Behavior</h2>
            <p className="text-[11px] text-[#1c2a2b]/40 mb-4">
              The AI briefing uses the same rules to decide how much time to spend on each biomarker:
            </p>
            <div className="space-y-2 text-[12px] text-[#1c2a2b]/60">
              <div className="flex items-start gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-400 mt-1 shrink-0" /><span><strong className="text-[#0e393d]">Risk markers (0–39)</strong> — AI spends 60–90 seconds per marker with detailed explanation, research citations, and actionable recommendations</span></div>
              <div className="flex items-start gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 shrink-0" /><span><strong className="text-[#0e393d]">Moderate markers (40–74)</strong> — AI spends 30–45 seconds with context and improvement suggestions</span></div>
              <div className="flex items-start gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#0C9C6C] mt-1 shrink-0" /><span><strong className="text-[#0e393d]">Optimal markers (75–100)</strong> — AI briefly acknowledges in ~10 seconds (&ldquo;Your vitamin D looks great&rdquo;)</span></div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
