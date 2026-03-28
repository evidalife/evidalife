'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BIOMARKER_UNITS, BIOMARKER_UNIT_CATEGORIES } from '@/lib/biomarker-units';
import { TEST_CATEGORIES, HE_DOMAINS as HE_DOMAINS_BASE } from '@/components/admin/lab-results/shared';
import InputBiomarkersSelector from './InputBiomarkersSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type LangContent = Record<Lang, string>;

export type ItemDefinition = {
  id: string;
  slug: string | null;
  name: Record<string, string> | null;
  name_short: Record<string, string> | null;
  description: Record<string, string> | null;
  item_type: string | null;
  is_active: boolean | null;
  is_calculated: boolean;
  formula: string | null;
  calculation_inputs: string[] | null;
  sort_order: number | null;
  unit: string | null;
  range_type: string | null;
  ref_range_low: number | null;
  ref_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  he_domain: string | null;
  // Chart range
  chart_range_low: number | null;
  chart_range_high: number | null;
  // Sex-specific ranges
  has_sex_specific_ranges: boolean;
  ref_range_low_f: number | null;
  ref_range_high_f: number | null;
  optimal_range_low_f: number | null;
  optimal_range_high_f: number | null;
  // Collection conditions
  requires_fasting: boolean;
  fasting_hours: number | null;
  preferred_draw_time: string | null;
  // Clinical metadata
  critical_low: number | null;
  critical_high: number | null;
  age_stratified: boolean;
  cvi_pct: number | null;
  cva_pct: number | null;
  assay_note: string | null;
  loinc_code: string | null;
};

type FormState = {
  name: LangContent;
  name_short_en: string;
  description: LangContent;
  item_type: string;
  is_calculated: boolean;
  formula: string;
  calculation_inputs: string[];
  sort_order: string;
  is_active: boolean;
  unit: string;
  range_type: string;
  ref_range_low: string;
  ref_range_high: string;
  optimal_range_low: string;
  optimal_range_high: string;
  he_domain: string;
  // Chart range
  chart_range_low: string;
  chart_range_high: string;
  // Sex-specific ranges
  has_sex_specific_ranges: boolean;
  ref_range_low_f: string;
  ref_range_high_f: string;
  optimal_range_low_f: string;
  optimal_range_high_f: string;
  // Collection conditions
  requires_fasting: boolean;
  fasting_hours: string;
  preferred_draw_time: string;
  // Clinical metadata
  critical_low: string;
  critical_high: string;
  age_stratified: boolean;
  cvi_pct: string;
  cva_pct: string;
  assay_note: string;
  loinc_code: string;
};

type AiSuggestion = {
  unit?: string | null;
  range_logic?: string | null;
  ref_range_low?: number | null;
  ref_range_high?: number | null;
  optimal_range_low?: number | null;
  optimal_range_high?: number | null;
  he_domain?: string | null;
  name_short?: string | null;
  is_calculated?: boolean | null;
  formula?: string | null;
  calculation_inputs?: string[] | null;
  description_de?: string;
  description_en?: string;
  description_fr?: string;
  description_es?: string;
  description_it?: string;
} | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  name: { de: '', en: '', fr: '', es: '', it: '' },
  name_short_en: '',
  description: { de: '', en: '', fr: '', es: '', it: '' },
  item_type: 'biomarker',
  is_calculated: false,
  formula: '',
  calculation_inputs: [],
  sort_order: '',
  is_active: true,
  unit: '',
  range_type: 'range',
  ref_range_low: '',
  ref_range_high: '',
  optimal_range_low: '',
  optimal_range_high: '',
  he_domain: '',
  // Chart range
  chart_range_low: '',
  chart_range_high: '',
  // Sex-specific ranges
  has_sex_specific_ranges: false,
  ref_range_low_f: '',
  ref_range_high_f: '',
  optimal_range_low_f: '',
  optimal_range_high_f: '',
  // Collection conditions
  requires_fasting: false,
  fasting_hours: '',
  preferred_draw_time: '',
  // Clinical metadata
  critical_low: '',
  critical_high: '',
  age_stratified: false,
  cvi_pct: '',
  cva_pct: '',
  assay_note: '',
  loinc_code: '',
};


export const HE_DOMAINS = [
  { value: '', label: '— none —', weight: 0 },
  ...HE_DOMAINS_BASE,
];

const RANGE_TYPES = [
  { value: '',                 label: '— none —' },
  { value: 'range',            label: 'Range (both bounds)' },
  { value: 'lower_is_better',  label: 'Lower is better (LDL, hs-CRP, HbA1c…)' },
  { value: 'higher_is_better', label: 'Higher is better (HDL, Vit D, eGFR…)' },
];

const LANGS: Lang[] = ['de', 'en', 'es', 'fr', 'it'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function domainLabel(v: string | null | undefined): string {
  return HE_DOMAINS.find((d) => d.value === v)?.label ?? v ?? '—';
}

async function callAutocomplete(nameEn: string): Promise<AiSuggestion> {
  const res = await fetch('/api/admin/autocomplete-biomarker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name_en: nameEn }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Autocomplete failed');
  return json;
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';
const selectCls = inputCls + ' cursor-pointer';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#0e393d]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SectionBlock({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#0e393d]/8">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#fafaf8] transition"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-[#0e393d]/30 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-6 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

function AiBtn({ onClick, loading, label, gold }: { onClick: () => void; loading: boolean; label: string; gold?: boolean }) {
  if (gold) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ceab84] text-white text-xs font-medium hover:bg-[#b8965e] disabled:opacity-50 transition whitespace-nowrap"
      >
        {loading ? '…' : label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#ceab84]/50 bg-[#ceab84]/10 text-[10px] font-medium text-[#8a6a3e] hover:bg-[#ceab84]/20 disabled:opacity-50 transition whitespace-nowrap"
    >
      {loading ? '…' : label}
    </button>
  );
}

function WarningIcon({ title }: { title: string }) {
  return (
    <span title={title} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold cursor-help">!</span>
  );
}

// ─── Unit Field (combobox with datalist) ──────────────────────────────────────

function UnitField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useRef(`bm-units-${Math.random().toString(36).slice(2)}`).current;
  return (
    <div>
      <input
        list={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. mg/dL"
        className={inputCls}
      />
      <datalist id={id}>
        {BIOMARKER_UNIT_CATEGORIES.map((cat) => (
          BIOMARKER_UNITS
            .filter((u) => u.category === cat)
            .map((u) => <option key={u.value} value={u.value} label={`${u.label} – ${u.category}`} />)
        ))}
      </datalist>
    </div>
  );
}

// ─── Reference Range Bar ──────────────────────────────────────────────────────

function RangeBar({ refLow, refHigh, optLow, optHigh }: {
  refLow: number | null; refHigh: number | null; optLow: number | null; optHigh: number | null;
}) {
  const anchor = refHigh ?? refLow;
  if (anchor == null) return null;
  const max = anchor * 1.6;
  if (max === 0) return null;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100)).toFixed(1)}%`;
  return (
    <div className="space-y-1">
      <div className="relative h-3 rounded-full bg-[#0e393d]/8 overflow-hidden">
        {refLow != null && refHigh != null && (
          <div className="absolute h-full bg-emerald-100"
            style={{ left: pct(refLow), width: `calc(${pct(refHigh)} - ${pct(refLow)})` }} />
        )}
        {refLow == null && refHigh != null && (
          <div className="absolute h-full bg-emerald-100" style={{ left: 0, width: pct(refHigh) }} />
        )}
        {refLow != null && refHigh == null && (
          <div className="absolute h-full bg-emerald-100" style={{ left: pct(refLow), right: 0 }} />
        )}
        {optLow != null && optHigh != null && (
          <div className="absolute h-full bg-emerald-400/70 rounded-sm"
            style={{ left: pct(optLow), width: `calc(${pct(optHigh)} - ${pct(optLow)})` }} />
        )}
        {refLow != null && <div className="absolute top-0 h-full w-px bg-emerald-600" style={{ left: pct(refLow) }} />}
        {refHigh != null && <div className="absolute top-0 h-full w-px bg-emerald-600" style={{ left: pct(refHigh) }} />}
      </div>
      <div className="flex justify-between text-[10px] text-[#1c2a2b]/40">
        <span>0</span>
        {refLow != null && <span className="text-emerald-700">{refLow}</span>}
        {refHigh != null && <span className="text-emerald-700">{refHigh}</span>}
        <span>{max.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ─── Range Fields (conditioned on range_type) ─────────────────────────────────

function RangeFields({ form, setForm, rangeType }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  rangeType: string;
}) {
  const showLow  = rangeType !== 'lower_is_better';
  const showHigh = rangeType !== 'higher_is_better';
  const refLowLabel  = rangeType === 'higher_is_better' ? 'Min Normal' : 'Ref Low';
  const refHighLabel = rangeType === 'lower_is_better'  ? 'Max Normal' : 'Ref High';
  const optLowLabel  = rangeType === 'higher_is_better' ? 'Optimal Min' : 'Optimal Low';
  const optHighLabel = rangeType === 'lower_is_better'  ? 'Optimal Max' : 'Optimal High';

  return (
    <div className="grid grid-cols-2 gap-4">
      {showLow && (
        <Field label={refLowLabel} hint="Normal range lower bound">
          <input type="number" className={inputCls} value={form.ref_range_low}
            onChange={(e) => setForm((f) => ({ ...f, ref_range_low: e.target.value }))}
            placeholder="0" step="any" />
        </Field>
      )}
      {showHigh && (
        <Field label={refHighLabel} hint="Normal range upper bound">
          <input type="number" className={inputCls} value={form.ref_range_high}
            onChange={(e) => setForm((f) => ({ ...f, ref_range_high: e.target.value }))}
            placeholder="100" step="any" />
        </Field>
      )}
      {showLow && (
        <Field label={optLowLabel} hint="Optimal lower bound">
          <input type="number" className={inputCls} value={form.optimal_range_low}
            onChange={(e) => setForm((f) => ({ ...f, optimal_range_low: e.target.value }))}
            placeholder="0" step="any" />
        </Field>
      )}
      {showHigh && (
        <Field label={optHighLabel} hint="Optimal upper bound">
          <input type="number" className={inputCls} value={form.optimal_range_high}
            onChange={(e) => setForm((f) => ({ ...f, optimal_range_high: e.target.value }))}
            placeholder="80" step="any" />
        </Field>
      )}
    </div>
  );
}

// ─── AI Suggestion Modal ──────────────────────────────────────────────────────

function AiSuggestionModal({
  suggestion, form, initialSelectEmpty, onApply, onClose,
}: {
  suggestion: NonNullable<AiSuggestion>;
  form: FormState;
  initialSelectEmpty?: boolean;
  onApply: (checked: Set<string>) => void;
  onClose: () => void;
}) {
  // Effective range logic: suggestion overrides form
  const effectiveRangeType = (suggestion.range_logic ?? form.range_type) || '';
  const showLow  = effectiveRangeType !== 'lower_is_better';
  const showHigh = effectiveRangeType !== 'higher_is_better';

  const fmt = (v: string | number | null | undefined) => (v == null || v === '' ? '—' : String(v));

  type SuggestionField = { key: string; label: string; current: string; suggested: string };
  const fields: SuggestionField[] = [
    { key: 'name_short',  label: 'Short Name',    current: fmt(form.name_short_en),  suggested: fmt(suggestion.name_short) },
    { key: 'is_calculated', label: 'Calculated',  current: String(form.is_calculated), suggested: suggestion.is_calculated != null ? String(suggestion.is_calculated) : '—' },
    ...(suggestion.is_calculated ? [{ key: 'formula', label: 'Formula', current: fmt(form.formula), suggested: fmt(suggestion.formula) }] : []),
    ...(suggestion.is_calculated && suggestion.calculation_inputs?.length ? [{ key: 'calculation_inputs', label: 'Input Biomarkers', current: form.calculation_inputs.join(', ') || '—', suggested: suggestion.calculation_inputs.join(', ') }] : []),
    { key: 'unit',        label: 'Unit',          current: fmt(form.unit),           suggested: fmt(suggestion.unit) },
    { key: 'range_logic', label: 'Range Logic',   current: form.range_type || '—',   suggested: fmt(suggestion.range_logic) },
    ...(showLow  ? [{ key: 'ref_range_low',     label: 'Ref Low',      current: fmt(form.ref_range_low),     suggested: fmt(suggestion.ref_range_low) }] : []),
    ...(showHigh ? [{ key: 'ref_range_high',    label: 'Ref High',     current: fmt(form.ref_range_high),    suggested: fmt(suggestion.ref_range_high) }] : []),
    ...(showLow  ? [{ key: 'optimal_range_low', label: 'Optimal Low',  current: fmt(form.optimal_range_low), suggested: fmt(suggestion.optimal_range_low) }] : []),
    ...(showHigh ? [{ key: 'optimal_range_high',label: 'Optimal High', current: fmt(form.optimal_range_high),suggested: fmt(suggestion.optimal_range_high) }] : []),
    { key: 'he_domain',   label: 'Health Domain', current: domainLabel(form.he_domain), suggested: domainLabel(suggestion.he_domain) },
    { key: 'description_en', label: 'Description (EN)', current: form.description.en?.slice(0, 55) || '—', suggested: suggestion.description_en?.slice(0, 55) ?? '—' },
    { key: 'description_de', label: 'Description (DE)', current: form.description.de?.slice(0, 55) || '—', suggested: suggestion.description_de?.slice(0, 55) ?? '—' },
    { key: 'description_fr', label: 'Description (FR)', current: form.description.fr?.slice(0, 55) || '—', suggested: suggestion.description_fr?.slice(0, 55) ?? '—' },
    { key: 'description_es', label: 'Description (ES)', current: form.description.es?.slice(0, 55) || '—', suggested: suggestion.description_es?.slice(0, 55) ?? '—' },
    { key: 'description_it', label: 'Description (IT)', current: form.description.it?.slice(0, 55) || '—', suggested: suggestion.description_it?.slice(0, 55) ?? '—' },
  ].filter((f) => f.suggested !== '—');

  const [checked, setChecked] = useState<Set<string>>(() =>
    initialSelectEmpty ? new Set(fields.filter((f) => f.current === '—').map((f) => f.key)) : new Set()
  );

  const toggle = (key: string) => setChecked((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#0e393d]/10 shrink-0">
            <div>
              <h3 className="font-serif text-lg text-[#0e393d]">✦ AI Suggestion</h3>
              <p className="text-xs text-[#1c2a2b]/40 mt-0.5">Select fields to apply</p>
            </div>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="flex gap-3 px-6 py-3 border-b border-[#0e393d]/6 shrink-0">
            <button onClick={() => setChecked(new Set(fields.map((f) => f.key)))} className="text-xs text-[#0e393d] underline underline-offset-2 hover:no-underline">Select all</button>
            <span className="text-[#1c2a2b]/20">·</span>
            <button onClick={() => setChecked(new Set(fields.filter((f) => f.current === '—').map((f) => f.key)))} className="text-xs text-[#0e393d] underline underline-offset-2 hover:no-underline">Empty only</button>
            <span className="text-[#1c2a2b]/20">·</span>
            <button onClick={() => setChecked(new Set())} className="text-xs text-[#0e393d] underline underline-offset-2 hover:no-underline">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#fafaf8]">
                <tr className="border-b border-[#0e393d]/8">
                  <th className="px-4 py-2.5 w-8" />
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Field</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#0e393d]/50">Current</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#ceab84]">Suggested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0e393d]/6">
                {fields.map((f) => (
                  <tr key={f.key} className={`cursor-pointer transition-colors ${checked.has(f.key) ? 'bg-[#ceab84]/8' : 'hover:bg-[#fafaf8]'}`} onClick={() => toggle(f.key)}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={checked.has(f.key)} onChange={() => toggle(f.key)} onClick={(e) => e.stopPropagation()} className="rounded border-[#0e393d]/20 text-[#0e393d] focus:ring-[#0e393d]/20" />
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[#0e393d]/70">{f.label}</td>
                    <td className="px-4 py-3 text-xs text-[#1c2a2b]/40 max-w-[170px] truncate">{f.current}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#1c2a2b] max-w-[190px] truncate">{f.suggested}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-[#0e393d]/10 shrink-0">
            <button onClick={onClose} className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Cancel</button>
            <button onClick={() => onApply(checked)} disabled={checked.size === 0} className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-40 transition">
              Apply {checked.size > 0 ? `(${checked.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BiomarkersManager({ initialItems }: { initialItems: ItemDefinition[] }) {
  const supabase = createClient();
  const [items, setItems]           = useState<ItemDefinition[]>(initialItems);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [calcFilter, setCalcFilter] = useState<'calculated' | 'measured' | null>(null);
  type SortCol = 'name' | 'type' | 'domain' | 'unit' | 'ranges' | 'status' | null;
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [panelOpen, setPanelOpen]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [nameLang, setNameLang]     = useState<Lang>('en');
  const [descLang, setDescLang]     = useState<Lang>('en');
  const [translating, setTranslating]   = useState(false);
  const [autocompleting, setAutocompleting] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    names: true, description: true, measurement: true, calculation: false, ranges: true, chartRange: false, sexRanges: false, collection: false, clinical: false, settings: false,
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Refresh ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('biomarkers')
      .select('id, slug, name, name_short, description, item_type, is_active, is_calculated, formula, calculation_inputs, sort_order, unit, range_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, he_domain, chart_range_low, chart_range_high, has_sex_specific_ranges, ref_range_low_f, ref_range_high_f, optimal_range_low_f, optimal_range_high_f, requires_fasting, fasting_hours, preferred_draw_time, critical_low, critical_high, age_stratified, cvi_pct, cva_pct, assay_note, loinc_code')
      .order('sort_order', { ascending: true });
    if (data) setItems(data as ItemDefinition[]);
  }, [supabase]);

  // ── Panel helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null); setNameLang('en'); setDescLang('en');
    setForm(EMPTY_FORM); setError(null);
    setOpenSections({ names: true, description: true, measurement: true, calculation: false, ranges: true, chartRange: false, sexRanges: false, collection: false, clinical: false, settings: false });
    setPanelOpen(true);
  };

  const openEdit = (item: ItemDefinition) => {
    setEditingId(item.id); setNameLang('en'); setDescLang('en');
    const isCalc = item.is_calculated ?? false;
    setForm({
      name:        { de: item.name?.de ?? '', en: item.name?.en ?? '', fr: item.name?.fr ?? '', es: item.name?.es ?? '', it: item.name?.it ?? '' },
      name_short_en: item.name_short?.en ?? '',
      description: { de: item.description?.de ?? '', en: item.description?.en ?? '', fr: item.description?.fr ?? '', es: item.description?.es ?? '', it: item.description?.it ?? '' },
      item_type:   item.item_type ?? 'biomarker',
      is_calculated: isCalc,
      formula:     item.formula ?? '',
      calculation_inputs: item.calculation_inputs ?? [],
      sort_order:  item.sort_order != null ? String(item.sort_order) : '',
      is_active:   item.is_active ?? true,
      unit:        item.unit ?? '',
      range_type:  item.range_type ?? 'range',
      ref_range_low:     item.ref_range_low  != null ? String(item.ref_range_low)  : '',
      ref_range_high:    item.ref_range_high != null ? String(item.ref_range_high) : '',
      optimal_range_low:  item.optimal_range_low  != null ? String(item.optimal_range_low)  : '',
      optimal_range_high: item.optimal_range_high != null ? String(item.optimal_range_high) : '',
      he_domain:   item.he_domain ?? '',
      // Chart range
      chart_range_low:  item.chart_range_low  != null ? String(item.chart_range_low)  : '',
      chart_range_high: item.chart_range_high != null ? String(item.chart_range_high) : '',
      // Sex-specific ranges
      has_sex_specific_ranges: item.has_sex_specific_ranges ?? false,
      ref_range_low_f:      item.ref_range_low_f      != null ? String(item.ref_range_low_f)      : '',
      ref_range_high_f:     item.ref_range_high_f     != null ? String(item.ref_range_high_f)     : '',
      optimal_range_low_f:  item.optimal_range_low_f  != null ? String(item.optimal_range_low_f)  : '',
      optimal_range_high_f: item.optimal_range_high_f != null ? String(item.optimal_range_high_f) : '',
      // Collection conditions
      requires_fasting: item.requires_fasting ?? false,
      fasting_hours:       item.fasting_hours       != null ? String(item.fasting_hours)       : '',
      preferred_draw_time: item.preferred_draw_time ?? '',
      // Clinical metadata
      critical_low:  item.critical_low  != null ? String(item.critical_low)  : '',
      critical_high: item.critical_high != null ? String(item.critical_high) : '',
      age_stratified: item.age_stratified ?? false,
      cvi_pct: item.cvi_pct != null ? String(item.cvi_pct) : '',
      cva_pct: item.cva_pct != null ? String(item.cva_pct) : '',
      assay_note: item.assay_note ?? '',
      loinc_code: item.loinc_code ?? '',
    });
    setError(null);
    setOpenSections({ names: true, description: true, measurement: true, calculation: isCalc, ranges: true, chartRange: false, sexRanges: item.has_sex_specific_ranges ?? false, collection: false, clinical: false, settings: false });
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setError(null); };

  // ── AI Translate ──────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    // Use active description tab as source; fall back to first non-empty lang
    const LANGS_ALL = ['de', 'en', 'fr', 'es', 'it'] as const;
    const sourceLang = form.description[descLang]?.trim()
      ? descLang
      : LANGS_ALL.find((l) => form.description[l]?.trim());
    const srcDesc = sourceLang ? form.description[sourceLang]?.trim() : '';
    const srcName = form.name.en?.trim() || form.name.de?.trim();
    if (!srcDesc && !srcName) { alert('Enter a name or description first.'); return; }
    setTranslating(true);
    try {
      // Translate via the generic lab-partner endpoint (supports any source lang + all targets)
      const targetLangs = LANGS_ALL.filter((l) => l !== sourceLang);
      const [descRes, nameRes] = await Promise.all([
        srcDesc && sourceLang
          ? fetch('/api/admin/translate-lab-partner', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourceText: srcDesc, sourceLang, targetLangs }),
            })
          : Promise.resolve(null),
        srcName
          ? fetch('/api/admin/translate-product', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name_en: srcName }),
            })
          : Promise.resolve(null),
      ]);

      const descJson = descRes ? await descRes.json() : {};
      const nameJson = nameRes ? await nameRes.json() : {};
      if (descRes && !descRes.ok) throw new Error(descJson.error ?? 'Description translate failed');
      if (nameRes && !nameRes.ok) throw new Error(nameJson.error ?? 'Name translate failed');

      setForm((f) => {
        const nextDesc = { ...f.description };
        for (const l of targetLangs) {
          if (descJson[l]) nextDesc[l] = descJson[l];
        }
        const nextName = { ...f.name };
        if (nameJson.name_de) nextName.de = nameJson.name_de;
        if (nameJson.name_fr) nextName.fr = nameJson.name_fr;
        if (nameJson.name_es) nextName.es = nameJson.name_es;
        if (nameJson.name_it) nextName.it = nameJson.name_it;
        return { ...f, description: nextDesc, name: nextName };
      });
    } catch (e: unknown) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setTranslating(false); }
  };

  // ── AI Autocomplete ───────────────────────────────────────────────────────

  const handleAutocomplete = async () => {
    const nameEn = form.name.en || form.name.de;
    if (!nameEn) { alert('Enter an EN or DE name first.'); return; }
    setAutocompleting(true);
    try {
      const result = await callAutocomplete(nameEn);
      setSuggestion(result);
      setOpenSections((prev) => ({ ...prev, ranges: true, description: true }));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setAutocompleting(false); }
  };

  const applySuggestion = (checked: Set<string>) => {
    if (!suggestion) return;
    setForm((f) => {
      const next = { ...f };
      if (checked.has('unit')         && suggestion.unit        != null) next.unit        = suggestion.unit;
      if (checked.has('range_logic')  && suggestion.range_logic != null) next.range_type  = suggestion.range_logic;
      if (checked.has('ref_range_low')     && suggestion.ref_range_low     != null) next.ref_range_low     = String(suggestion.ref_range_low);
      if (checked.has('ref_range_high')    && suggestion.ref_range_high    != null) next.ref_range_high    = String(suggestion.ref_range_high);
      if (checked.has('optimal_range_low') && suggestion.optimal_range_low != null) next.optimal_range_low = String(suggestion.optimal_range_low);
      if (checked.has('name_short')        && suggestion.name_short        != null) next.name_short_en     = suggestion.name_short;
      if (checked.has('is_calculated')     && suggestion.is_calculated     != null) next.is_calculated     = suggestion.is_calculated;
      if (checked.has('formula')           && suggestion.formula           != null) next.formula           = suggestion.formula;
      if (checked.has('calculation_inputs') && suggestion.calculation_inputs != null) next.calculation_inputs = suggestion.calculation_inputs;
      if (checked.has('optimal_range_high')&& suggestion.optimal_range_high!= null) next.optimal_range_high= String(suggestion.optimal_range_high);
      if (checked.has('he_domain')    && suggestion.he_domain   != null) next.he_domain   = suggestion.he_domain;
      next.description = { ...f.description };
      if (checked.has('description_en') && suggestion.description_en) next.description.en = suggestion.description_en;
      if (checked.has('description_de') && suggestion.description_de) next.description.de = suggestion.description_de;
      if (checked.has('description_fr') && suggestion.description_fr) next.description.fr = suggestion.description_fr;
      if (checked.has('description_es') && suggestion.description_es) next.description.es = suggestion.description_es;
      if (checked.has('description_it') && suggestion.description_it) next.description.it = suggestion.description_it;
      return next;
    });
    setSuggestion(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const missing: string[] = [];
    if (!form.name.en.trim()) missing.push('Name (EN)');
    if (!form.name.de.trim()) missing.push('Name (DE)');
    if (!form.item_type) missing.push('Test Category');
    if (!form.he_domain) missing.push('Health Domain');
    if (!form.unit.trim()) missing.push('Unit');
    if (!form.range_type) missing.push('Range Type');
    if (missing.length > 0) { setError(`Please fill all required fields: ${missing.join(', ')}`); return; }
    setSaving(true); setError(null);
    const rt = form.range_type || null;
    const nameShortEn = form.name_short_en.trim();
    const payload = {
      name:        { de: form.name.de, en: form.name.en, fr: form.name.fr, es: form.name.es, it: form.name.it },
      name_short:  nameShortEn ? { en: nameShortEn } : {},
      description: { de: form.description.de, en: form.description.en, fr: form.description.fr, es: form.description.es, it: form.description.it },
      item_type:   form.item_type || null,
      is_calculated: form.is_calculated,
      formula:     form.is_calculated && form.formula.trim() ? form.formula.trim() : null,
      calculation_inputs: form.is_calculated ? form.calculation_inputs : [],
      sort_order:  form.sort_order ? Number(form.sort_order) : null,
      is_active:   form.is_active,
      unit:        form.unit || null,
      range_type:  rt,
      ref_range_low:     rt === 'lower_is_better'  ? null : parseNum(form.ref_range_low),
      ref_range_high:    rt === 'higher_is_better' ? null : parseNum(form.ref_range_high),
      optimal_range_low: rt === 'lower_is_better'  ? null : parseNum(form.optimal_range_low),
      optimal_range_high:rt === 'higher_is_better' ? null : parseNum(form.optimal_range_high),
      he_domain:   form.he_domain || null,
      // Chart range
      chart_range_low:  parseNum(form.chart_range_low),
      chart_range_high: parseNum(form.chart_range_high),
      // Sex-specific ranges
      has_sex_specific_ranges: form.has_sex_specific_ranges,
      ref_range_low_f:      form.has_sex_specific_ranges ? parseNum(form.ref_range_low_f)      : null,
      ref_range_high_f:     form.has_sex_specific_ranges ? parseNum(form.ref_range_high_f)     : null,
      optimal_range_low_f:  form.has_sex_specific_ranges ? parseNum(form.optimal_range_low_f)  : null,
      optimal_range_high_f: form.has_sex_specific_ranges ? parseNum(form.optimal_range_high_f) : null,
      // Collection conditions
      requires_fasting: form.requires_fasting,
      fasting_hours:       form.requires_fasting ? (form.fasting_hours ? Number(form.fasting_hours) : null) : null,
      preferred_draw_time: form.preferred_draw_time || null,
      // Clinical metadata
      critical_low:  parseNum(form.critical_low),
      critical_high: parseNum(form.critical_high),
      age_stratified: form.age_stratified,
      cvi_pct: parseNum(form.cvi_pct),
      cva_pct: parseNum(form.cva_pct),
      assay_note: form.assay_note.trim() || null,
      loinc_code: form.loinc_code.trim() || null,
    };
    try {
      if (editingId) {
        const { error: err } = await supabase.from('biomarkers').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('biomarkers').insert({ ...payload, slug: slugify(form.name_short_en || form.name.en || form.name.de) });
        if (err) throw err;
      }
      await refresh();
      closePanel();
    } catch (e: unknown) {
      setError(typeof e === 'object' && e && 'message' in e ? (e as { message: string }).message : String(e));
    } finally { setSaving(false); }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const handleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortCol(null); setSortDir('asc'); }
  };

  const filtered = items.filter((item) => {
    if (typeFilter && item.item_type !== typeFilter) return false;
    if (domainFilter && item.he_domain !== domainFilter) return false;
    if (calcFilter === 'calculated' && !item.is_calculated) return false;
    if (calcFilter === 'measured' && item.is_calculated) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.en?.toLowerCase().includes(q) ||
      item.name?.de?.toLowerCase().includes(q) ||
      item.name_short?.en?.toLowerCase().includes(q) ||
      item.item_type?.toLowerCase().includes(q) ||
      item.slug?.toLowerCase().includes(q) ||
      item.unit?.toLowerCase().includes(q)
    );
  });

  const sorted = sortCol === null ? filtered : [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'name')   cmp = (a.name?.en || a.name?.de || '').localeCompare(b.name?.en || b.name?.de || '');
    if (sortCol === 'type')   cmp = (a.item_type || '').localeCompare(b.item_type || '');
    if (sortCol === 'domain') cmp = (a.he_domain || '').localeCompare(b.he_domain || '');
    if (sortCol === 'unit')   cmp = (a.unit || '').localeCompare(b.unit || '');
    if (sortCol === 'ranges') cmp = (a.ref_range_low ?? -Infinity) - (b.ref_range_low ?? -Infinity);
    if (sortCol === 'status') cmp = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const previewRanges = { refLow: parseNum(form.ref_range_low), refHigh: parseNum(form.ref_range_high), optLow: parseNum(form.optimal_range_low), optHigh: parseNum(form.optimal_range_high) };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Biomarker Registry</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
          >
            <span className="text-lg leading-none">+</span> New Biomarker
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex items-center gap-3 mb-5 text-sm text-[#1c2a2b]/50">
        <span>{items.length} total</span>
        <span className="text-[#0e393d]/20">·</span>
        <span>{items.filter((i) => i.is_active).length} active</span>
        <span className="text-[#0e393d]/20">·</span>
        <span>⚡ {items.filter((i) => i.is_calculated).length} calculated</span>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5">
          {[{ value: '', label: 'All', icon: '' }, ...TEST_CATEGORIES].map(({ value, label, icon }) => (
            <button key={value} onClick={() => setTypeFilter(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${typeFilter === value ? 'bg-[#0e393d] text-white' : 'bg-[#0e393d]/8 text-[#0e393d]/70 hover:bg-[#0e393d]/15'}`}>
              {icon && <span className="mr-1">{icon}</span>}{label}
            </button>
          ))}
        </div>
        {/* Calculated / Measured pills */}
        <div className="flex gap-1.5">
          <button onClick={() => setCalcFilter(calcFilter === 'calculated' ? null : 'calculated')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition border ${calcFilter === 'calculated' ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}>
            ⚡ Calculated ({items.filter((b) => b.is_calculated).length})
          </button>
          <button onClick={() => setCalcFilter(calcFilter === 'measured' ? null : 'measured')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition border ${calcFilter === 'measured' ? 'bg-sky-600 text-white border-sky-600' : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'}`}>
            🔬 Measured ({items.filter((b) => !b.is_calculated).length})
          </button>
        </div>
        {/* Domain filter */}
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-xs text-[#1c2a2b] focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 cursor-pointer"
        >
          <option value="">All domains</option>
          {HE_DOMAINS.filter((d) => d.value).map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        {/* Search */}
        <input
          type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-48 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              {(['name', 'type', 'domain', 'unit', 'ranges', 'status'] as const).map((col) => {
                const labels: Record<string, string> = { name: 'Name', type: 'Type', domain: 'Health Domain', unit: 'Unit', ranges: 'Ranges', status: 'Status' };
                const active = sortCol === col;
                return (
                  <th key={col} className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort(col)}
                      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition hover:text-[#0e393d] ${active ? 'text-[#0e393d]' : 'text-[#0e393d]/60'}`}
                    >
                      {labels[col]}
                      <span className="text-[10px] leading-none">
                        {active && sortDir === 'asc' ? '▲' : active && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">No biomarkers found.</td></tr>
            )}
            {sorted.map((item) => {
              return (
                <tr key={item.id} className="hover:bg-[#fafaf8] transition-colors cursor-pointer" onClick={() => openEdit(item)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-[#0e393d]">
                          {item.name_short?.en || item.name?.en || item.name?.de || <span className="text-[#1c2a2b]/30">—</span>}
                        </div>
                        <div className="text-xs text-[#1c2a2b]/40 mt-0.5">
                          {item.name?.en || item.name?.de || ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {item.item_type ? (
                        <span className="inline-flex items-center rounded-full bg-[#ceab84]/15 px-2 py-0.5 text-[11px] font-medium text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/30">
                          {TEST_CATEGORIES.find((t) => t.value === item.item_type)?.label ?? item.item_type}
                        </span>
                      ) : <span className="text-[#1c2a2b]/30">—</span>}
                      {item.is_calculated && (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200">
                          ⚡ Calculated
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#1c2a2b]/60">
                    {item.he_domain
                      ? domainLabel(item.he_domain)
                      : <span className="flex items-center gap-1"><WarningIcon title="Missing — click to edit" /><span className="text-amber-600">Missing</span></span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-[#0e393d]/70">
                    {item.unit || <span className="flex items-center gap-1"><WarningIcon title="Missing — click to edit" /><span className="text-amber-600">Missing</span></span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#1c2a2b]/50">
                    {item.ref_range_low != null && item.ref_range_high != null
                      ? `${item.ref_range_low}–${item.ref_range_high}`
                      : item.ref_range_high != null ? `< ${item.ref_range_high}`
                      : item.ref_range_low != null  ? `> ${item.ref_range_low}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {item.is_active
                      ? <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Active</span>
                      : <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(item)} className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition">Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── AI Suggestion Modal ── */}
      {suggestion && (
        <AiSuggestionModal suggestion={suggestion} form={form} onApply={applySuggestion} onClose={() => setSuggestion(null)} />
      )}

      {/* ── Slide-over panel ── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
              <div>
                <h2 className="font-serif text-lg text-[#0e393d]">{editingId ? 'Edit Biomarker' : 'New Biomarker'}</h2>
                {editingId && <p className="text-xs text-[#1c2a2b]/40 mt-0.5">{items.find((i) => i.id === editingId)?.slug ?? ''}</p>}
              </div>
              <div className="flex items-center gap-3">
                <AiBtn onClick={handleAutocomplete} loading={autocompleting} label="✦ AI Autocomplete" />
                <button onClick={closePanel} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">

              {/* Names */}
              <SectionBlock title="Names" open={openSections.names} onToggle={() => toggleSection('names')}>
                <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs w-fit">
                  {LANGS.map((l) => (
                    <button key={l} onClick={() => setNameLang(l)}
                      className={`px-3 py-1.5 font-medium transition ${nameLang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <Field label={`Name (${nameLang.toUpperCase()}) *`}>
                  <input className={inputCls} value={form.name[nameLang]}
                    onChange={(e) => setForm((f) => ({ ...f, name: { ...f.name, [nameLang]: e.target.value } }))}
                    placeholder={nameLang === 'de' ? 'z.B. Hämoglobin' : 'e.g. Haemoglobin'} autoFocus />
                </Field>
                <Field label="Abbreviation / Short Name (EN)" hint="e.g. HbA1c, hs-CRP, ApoB — shown as primary label in tables">
                  <input className={inputCls} value={form.name_short_en}
                    onChange={(e) => setForm((f) => ({ ...f, name_short_en: e.target.value }))}
                    placeholder="e.g. HbA1c" />
                </Field>
                <Field label="Slug" hint="Auto-generated from short name on create">
                  <input className={inputCls} value={editingId ? (items.find((i) => i.id === editingId)?.slug ?? '') : slugify(form.name_short_en || form.name.en || form.name.de)} readOnly tabIndex={-1} />
                </Field>
              </SectionBlock>

              {/* Description */}
              <SectionBlock title="Description" open={openSections.description} onToggle={() => toggleSection('description')}>
                <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs w-fit">
                  {LANGS.map((l) => (
                    <button key={l} onClick={() => setDescLang(l)}
                      className={`px-3 py-1.5 font-medium transition ${descLang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <textarea className={`${inputCls} resize-none`} rows={4}
                  value={form.description[descLang]}
                  onChange={(e) => setForm((f) => ({ ...f, description: { ...f.description, [descLang]: e.target.value } }))}
                  placeholder={descLang === 'de' ? 'Kurze Beschreibung…' : 'Short description…'} />
                <div className="flex justify-end pt-1">
                  <AiBtn onClick={handleTranslate} loading={translating} label="✦ Translate to all" />
                </div>
              </SectionBlock>

              {/* Measurement */}
              <SectionBlock title="Measurement" open={openSections.measurement} onToggle={() => toggleSection('measurement')}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Test Category" hint="How this marker is measured">
                    <select className={selectCls} value={form.item_type} onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value }))}>
                      {TEST_CATEGORIES.map(({ value, label, icon }) => <option key={value} value={value}>{icon} {label}</option>)}
                    </select>
                  </Field>
                  <Field label="Unit" hint="Swiss/EU clinical unit">
                    <UnitField value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Health Domain" hint="Which Health Engine scoring domain this marker belongs to">
                      <select className={selectCls} value={form.he_domain} onChange={(e) => setForm((f) => ({ ...f, he_domain: e.target.value }))}>
                        {HE_DOMAINS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">⚡ Calculated Marker</p>
                    <p className="text-xs text-[#1c2a2b]/40">Derived from other biomarkers via a formula rather than directly measured</p>
                  </div>
                  <Toggle checked={form.is_calculated} onChange={(v) => {
                    setForm((f) => ({ ...f, is_calculated: v }));
                    if (v) toggleSection('calculation');
                  }} />
                </div>
              </SectionBlock>

              {/* Calculation */}
              {form.is_calculated && (
                <SectionBlock title="⚡ Calculation" open={openSections.calculation} onToggle={() => toggleSection('calculation')}>
                  <Field label="Formula" hint="Human-readable formula using biomarker slugs, e.g. (glucose / insulin) / 22.5">
                    <textarea className={`${inputCls} resize-none font-mono text-xs`} rows={3}
                      value={form.formula}
                      onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value }))}
                      placeholder="e.g. (glucose * insulin) / 22.5" />
                  </Field>
                  <Field label="Input Biomarkers" hint="Measured markers this formula depends on">
                    <InputBiomarkersSelector
                      allItems={items.filter((i) => !i.is_calculated)}
                      selected={form.calculation_inputs}
                      onChange={(v) => setForm((f) => ({ ...f, calculation_inputs: v }))}
                    />
                  </Field>
                </SectionBlock>
              )}

              {/* Reference Ranges */}
              <SectionBlock title="Reference Ranges" open={openSections.ranges} onToggle={() => toggleSection('ranges')}>
                <Field label="Range Logic">
                  <select className={selectCls} value={form.range_type} onChange={(e) => setForm((f) => ({ ...f, range_type: e.target.value }))}>
                    {RANGE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                {form.range_type && (
                  <>
                    <RangeBar refLow={previewRanges.refLow} refHigh={previewRanges.refHigh} optLow={previewRanges.optLow} optHigh={previewRanges.optHigh} />
                    <RangeFields form={form} setForm={setForm} rangeType={form.range_type} />
                    <div className="flex gap-3 text-xs text-[#1c2a2b]/50 pt-1">
                      <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />Normal range</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-400/70" />Optimal range</span>
                    </div>
                  </>
                )}
              </SectionBlock>

              {/* Chart Range */}
              <SectionBlock title="Chart Range" open={openSections.chartRange} onToggle={() => toggleSection('chartRange')}>
                <p className="text-[11px] text-[#1c2a2b]/40 -mt-1 mb-2">Defines Y-axis bounds for trend graphs. Leave blank to auto-derive from reference range.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Chart min">
                    <input type="number" className={inputCls} value={form.chart_range_low}
                      onChange={(e) => setForm((f) => ({ ...f, chart_range_low: e.target.value }))}
                      placeholder="auto" step="any" />
                  </Field>
                  <Field label="Chart max">
                    <input type="number" className={inputCls} value={form.chart_range_high}
                      onChange={(e) => setForm((f) => ({ ...f, chart_range_high: e.target.value }))}
                      placeholder="auto" step="any" />
                  </Field>
                </div>
              </SectionBlock>

              {/* Sex-Specific Ranges */}
              <SectionBlock title="Sex-Specific Ranges" open={openSections.sexRanges} onToggle={() => toggleSection('sexRanges')}>
                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">Different ranges for male vs female</p>
                    <p className="text-xs text-[#1c2a2b]/40">Existing ranges become male/universal values</p>
                  </div>
                  <Toggle checked={form.has_sex_specific_ranges} onChange={(v) => setForm((f) => ({ ...f, has_sex_specific_ranges: v }))} />
                </div>
                {form.has_sex_specific_ranges && (
                  <div className="mt-2">
                    <p className="text-[11px] text-[#1c2a2b]/40 mb-3">Male/universal values are set in Reference Ranges above. Female overrides below — leave blank to inherit.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Ref Low (F)">
                        <input type="number" className={inputCls} value={form.ref_range_low_f}
                          onChange={(e) => setForm((f) => ({ ...f, ref_range_low_f: e.target.value }))}
                          placeholder="same as male" step="any" />
                      </Field>
                      <Field label="Ref High (F)">
                        <input type="number" className={inputCls} value={form.ref_range_high_f}
                          onChange={(e) => setForm((f) => ({ ...f, ref_range_high_f: e.target.value }))}
                          placeholder="same as male" step="any" />
                      </Field>
                      <Field label="Optimal Low (F)">
                        <input type="number" className={inputCls} value={form.optimal_range_low_f}
                          onChange={(e) => setForm((f) => ({ ...f, optimal_range_low_f: e.target.value }))}
                          placeholder="same as male" step="any" />
                      </Field>
                      <Field label="Optimal High (F)">
                        <input type="number" className={inputCls} value={form.optimal_range_high_f}
                          onChange={(e) => setForm((f) => ({ ...f, optimal_range_high_f: e.target.value }))}
                          placeholder="same as male" step="any" />
                      </Field>
                    </div>
                  </div>
                )}
              </SectionBlock>

              {/* Collection Conditions */}
              <SectionBlock title="Collection Conditions" open={openSections.collection} onToggle={() => toggleSection('collection')}>
                <div className="grid grid-cols-2 gap-4 items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border border-[#0e393d]/10 px-4 py-3">
                      <label className="text-sm font-medium text-[#1c2a2b]">Requires fasting</label>
                      <Toggle checked={form.requires_fasting} onChange={(v) => setForm((f) => ({ ...f, requires_fasting: v }))} />
                    </div>
                    {form.requires_fasting && (
                      <Field label="Fasting hours">
                        <input type="number" className={inputCls} value={form.fasting_hours}
                          onChange={(e) => setForm((f) => ({ ...f, fasting_hours: e.target.value }))}
                          placeholder="8" min={0} step={1} />
                      </Field>
                    )}
                  </div>
                  <Field label="Preferred draw time">
                    <select className={selectCls} value={form.preferred_draw_time} onChange={(e) => setForm((f) => ({ ...f, preferred_draw_time: e.target.value }))}>
                      <option value="">Any time</option>
                      <option value="morning">Morning (7–10am)</option>
                      <option value="fasting_morning">Fasting + Morning</option>
                    </select>
                  </Field>
                </div>
              </SectionBlock>

              {/* Clinical Metadata */}
              <SectionBlock title="Clinical Metadata" open={openSections.clinical} onToggle={() => toggleSection('clinical')}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Critical value — low (panic)">
                    <input type="number" className={inputCls} value={form.critical_low}
                      onChange={(e) => setForm((f) => ({ ...f, critical_low: e.target.value }))}
                      placeholder="none" step="any" />
                  </Field>
                  <Field label="Critical value — high (panic)">
                    <input type="number" className={inputCls} value={form.critical_high}
                      onChange={(e) => setForm((f) => ({ ...f, critical_high: e.target.value }))}
                      placeholder="none" step="any" />
                  </Field>
                </div>
                <Field label="Assay / method note">
                  <textarea className={`${inputCls} resize-none`} rows={2}
                    value={form.assay_note}
                    onChange={(e) => setForm((f) => ({ ...f, assay_note: e.target.value }))}
                    placeholder="optional" />
                </Field>
                <Field label="LOINC code">
                  <input type="text" className={inputCls} value={form.loinc_code}
                    onChange={(e) => setForm((f) => ({ ...f, loinc_code: e.target.value }))}
                    placeholder="e.g. 2345-7" />
                </Field>
                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">Ranges vary by age group</p>
                    <p className="text-xs text-[#1c2a2b]/40">Flag that reference ranges are age-stratified</p>
                  </div>
                  <Toggle checked={form.age_stratified} onChange={(v) => setForm((f) => ({ ...f, age_stratified: v }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Biological variation CVi %">
                    <input type="number" className={inputCls} value={form.cvi_pct}
                      onChange={(e) => setForm((f) => ({ ...f, cvi_pct: e.target.value }))}
                      placeholder="optional" step="any" />
                  </Field>
                  <Field label="Analytical variation CVa %">
                    <input type="number" className={inputCls} value={form.cva_pct}
                      onChange={(e) => setForm((f) => ({ ...f, cva_pct: e.target.value }))}
                      placeholder="optional" step="any" />
                  </Field>
                </div>
              </SectionBlock>

              {/* Settings */}
              <SectionBlock title="Settings" open={openSections.settings} onToggle={() => toggleSection('settings')}>
                <Field label="Sort Order" hint="Lower numbers appear first">
                  <input type="number" className={inputCls} value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    placeholder="10" min={0} step={1} />
                </Field>
                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">Active</p>
                    <p className="text-xs text-[#1c2a2b]/40">Shown in product editors and detail pages</p>
                  </div>
                  <Toggle checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                </div>
              </SectionBlock>
            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4 shrink-0">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              <div className="flex gap-3">
                <button onClick={closePanel} className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Biomarker'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
