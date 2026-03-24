'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BIOMARKER_UNITS, BIOMARKER_UNIT_CATEGORIES } from '@/lib/biomarker-units';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type LangContent = Record<Lang, string>;

export type ItemDefinition = {
  id: string;
  slug: string | null;
  name: Record<string, string> | null;
  description: Record<string, string> | null;
  item_type: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  unit: string | null;
  range_type: string | null;
  ref_range_low: number | null;
  ref_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  he_domain: string | null;
};

type FormState = {
  name: LangContent;
  description: LangContent;
  item_type: string;
  sort_order: string;
  is_active: boolean;
  unit: string;
  range_type: string;
  ref_range_low: string;
  ref_range_high: string;
  optimal_range_low: string;
  optimal_range_high: string;
  he_domain: string;
};

type AiSuggestion = {
  unit?: string | null;
  range_logic?: string | null;
  ref_range_low?: number | null;
  ref_range_high?: number | null;
  optimal_range_low?: number | null;
  optimal_range_high?: number | null;
  he_domain?: string | null;
  description_de?: string;
  description_en?: string;
  description_fr?: string;
  description_es?: string;
  description_it?: string;
} | null;

type ItemPriority = 'critical' | 'warning' | 'info' | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  name: { de: '', en: '', fr: '', es: '', it: '' },
  description: { de: '', en: '', fr: '', es: '', it: '' },
  item_type: 'biomarker',
  sort_order: '',
  is_active: true,
  unit: '',
  range_type: 'range',
  ref_range_low: '',
  ref_range_high: '',
  optimal_range_low: '',
  optimal_range_high: '',
  he_domain: '',
};

const ITEM_TYPES = [
  { value: 'biomarker', label: 'Blood Marker' },
  { value: 'vitalcheck_measurement', label: 'Vitalcheck' },
  { value: 'vo2max_test', label: 'VO₂max' },
  { value: 'dexa_scan', label: 'DEXA' },
  { value: 'biological_age_test', label: 'Bio Age' },
  { value: 'genetic_test', label: 'Genetic' },
];

export const HE_DOMAINS = [
  { value: '',                label: '— none —' },
  { value: 'heart_vessels',   label: 'Heart & Vessels' },
  { value: 'metabolism',      label: 'Metabolism' },
  { value: 'inflammation',    label: 'Inflammation & Immune' },
  { value: 'organ_function',  label: 'Organ Function' },
  { value: 'nutrients',       label: 'Nutrients' },
  { value: 'hormones',        label: 'Hormones' },
  { value: 'body_composition',label: 'Body Composition' },
  { value: 'fitness',         label: 'Fitness & Recovery' },
  { value: 'epigenetics',     label: 'Epigenetics / Bio Age' },
  { value: 'genetics',        label: 'Genetics / DNA Risk' },
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

function getItemPriority(item: ItemDefinition): ItemPriority {
  if (!item.unit || !item.he_domain) return 'critical';
  if (item.range_type && item.range_type !== '' && item.ref_range_low == null && item.ref_range_high == null) return 'warning';
  if (!item.description?.en && !item.description?.de) return 'info';
  return null;
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

function PriorityDot({ priority }: { priority: ItemPriority }) {
  if (!priority) return null;
  const colors = { critical: 'bg-red-500', warning: 'bg-amber-400', info: 'bg-sky-400' };
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[priority]}`} title={priority} />;
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

// ─── AI Wizard Modal ──────────────────────────────────────────────────────────

function WizardModal({
  items, onClose, onPatchItem,
}: {
  items: ItemDefinition[];
  onClose: () => void;
  onPatchItem: (id: string, patch: Partial<Record<string, unknown>>) => Promise<void>;
}) {
  const queue = items.filter((i) => getItemPriority(i) !== null);
  const criticalCount = queue.filter((i) => getItemPriority(i) === 'critical').length;
  const warningCount  = queue.filter((i) => getItemPriority(i) === 'warning').length;
  const infoCount     = queue.filter((i) => getItemPriority(i) === 'info').length;

  const [step, setStep]         = useState<'scan' | 'walk' | 'done'>('scan');
  const [idx, setIdx]           = useState(0);
  const [loading, setLoading]   = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion>(null);
  const [applied, setApplied]   = useState(0);
  const [skipped, setSkipped]   = useState(0);

  const currentItem = queue[idx];

  const fetchNext = async (i: number) => {
    const item = queue[i];
    if (!item) return;
    const nameEn = (item.name?.en || item.name?.de || '').trim();
    if (!nameEn) { setSuggestion(null); return; }
    setLoading(true);
    try {
      const result = await callAutocomplete(nameEn);
      setSuggestion(result);
    } catch {
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  const startWalk = () => { setStep('walk'); setIdx(0); fetchNext(0); };

  const moveNext = (wasApplied: boolean) => {
    if (wasApplied) setApplied((n) => n + 1); else setSkipped((n) => n + 1);
    const next = idx + 1;
    if (next >= queue.length) { setStep('done'); }
    else { setIdx(next); setSuggestion(null); fetchNext(next); }
  };

  const handleApply = async (checked: Set<string>) => {
    if (!suggestion || !currentItem) return;
    const patch: Record<string, unknown> = {};
    if (checked.has('unit') && suggestion.unit != null) patch.unit = suggestion.unit;
    if (checked.has('range_logic') && suggestion.range_logic) patch.range_type = suggestion.range_logic;
    if (checked.has('ref_range_low') && suggestion.ref_range_low != null) patch.ref_range_low = suggestion.ref_range_low;
    if (checked.has('ref_range_high') && suggestion.ref_range_high != null) patch.ref_range_high = suggestion.ref_range_high;
    if (checked.has('optimal_range_low') && suggestion.optimal_range_low != null) patch.optimal_range_low = suggestion.optimal_range_low;
    if (checked.has('optimal_range_high') && suggestion.optimal_range_high != null) patch.optimal_range_high = suggestion.optimal_range_high;
    if (checked.has('he_domain') && suggestion.he_domain) patch.he_domain = suggestion.he_domain;
    const desc: Record<string, string> = { ...(currentItem.description ?? {}) };
    if (checked.has('description_en') && suggestion.description_en) desc.en = suggestion.description_en;
    if (checked.has('description_de') && suggestion.description_de) desc.de = suggestion.description_de;
    if (checked.has('description_fr') && suggestion.description_fr) desc.fr = suggestion.description_fr;
    if (checked.has('description_es') && suggestion.description_es) desc.es = suggestion.description_es;
    if (checked.has('description_it') && suggestion.description_it) desc.it = suggestion.description_it;
    if (Object.keys(desc).length) patch.description = desc;
    if (Object.keys(patch).length) await onPatchItem(currentItem.id, patch);
    moveNext(true);
  };

  // Derive form-like state from current item for AiSuggestionModal
  const wizardForm: FormState = currentItem ? {
    name: { de: currentItem.name?.de ?? '', en: currentItem.name?.en ?? '', fr: currentItem.name?.fr ?? '', es: currentItem.name?.es ?? '', it: currentItem.name?.it ?? '' },
    description: { de: currentItem.description?.de ?? '', en: currentItem.description?.en ?? '', fr: currentItem.description?.fr ?? '', es: currentItem.description?.es ?? '', it: currentItem.description?.it ?? '' },
    item_type: currentItem.item_type ?? 'biomarker',
    sort_order: '',
    is_active: currentItem.is_active ?? true,
    unit: currentItem.unit ?? '',
    range_type: currentItem.range_type ?? '',
    ref_range_low: currentItem.ref_range_low != null ? String(currentItem.ref_range_low) : '',
    ref_range_high: currentItem.ref_range_high != null ? String(currentItem.ref_range_high) : '',
    optimal_range_low: currentItem.optimal_range_low != null ? String(currentItem.optimal_range_low) : '',
    optimal_range_high: currentItem.optimal_range_high != null ? String(currentItem.optimal_range_high) : '',
    he_domain: currentItem.he_domain ?? '',
  } : EMPTY_FORM;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-[2px]" onClick={step === 'scan' ? onClose : undefined} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#0e393d]/10">
            <div>
              <h3 className="font-serif text-lg text-[#0e393d]">
                {step === 'scan' ? '✨ AI Fill Missing' : step === 'walk' ? `Filling ${idx + 1} of ${queue.length}` : '✓ Done'}
              </h3>
              {step === 'walk' && (
                <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
                  {currentItem?.name?.en || currentItem?.name?.de || '…'}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
          </div>

          {/* Scan step */}
          {step === 'scan' && (
            <div className="p-6 space-y-5">
              {queue.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-3">✓</div>
                  <p className="text-sm font-medium text-[#0e393d]">All biomarkers look complete!</p>
                  <p className="text-xs text-[#1c2a2b]/40 mt-1">No missing fields detected.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#1c2a2b]/70">Found <strong className="text-[#0e393d]">{queue.length}</strong> biomarkers with missing data:</p>
                  <div className="flex gap-4">
                    {criticalCount > 0 && <div className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" /><span className="text-[#1c2a2b]/70">{criticalCount} critical <span className="text-[#1c2a2b]/40">(unit/domain missing)</span></span></div>}
                    {warningCount > 0  && <div className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" /><span className="text-[#1c2a2b]/70">{warningCount} ranges missing</span></div>}
                    {infoCount > 0     && <div className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" /><span className="text-[#1c2a2b]/70">{infoCount} descriptions only</span></div>}
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-[#0e393d]/10 divide-y divide-[#0e393d]/6">
                    {queue.map((item) => {
                      const p = getItemPriority(item);
                      const colors = { critical: 'bg-red-500', warning: 'bg-amber-400', info: 'bg-sky-400' };
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${p ? colors[p] : 'bg-gray-300'}`} />
                          <span className="text-sm text-[#1c2a2b]">{item.name?.en || item.name?.de || '—'}</span>
                          <span className="ml-auto text-xs text-[#1c2a2b]/40">{!item.unit ? 'no unit' : !item.he_domain ? 'no domain' : 'ranges/desc'}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Cancel</button>
                {queue.length > 0 && (
                  <button onClick={startWalk} className="flex-1 rounded-lg bg-[#ceab84] py-2.5 text-sm font-medium text-white hover:bg-[#b8965e] transition">
                    Start filling ({queue.length})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Walk step */}
          {step === 'walk' && (
            <div className="p-6 space-y-4">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#1c2a2b]/40">
                  <span>{idx + 1} of {queue.length}</span>
                  <span>{applied} applied · {skipped} skipped</span>
                </div>
                <div className="h-1.5 bg-[#0e393d]/8 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ceab84] rounded-full transition-all" style={{ width: `${((idx) / queue.length) * 100}%` }} />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-3 py-8 text-sm text-[#1c2a2b]/40">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  Asking AI…
                </div>
              ) : suggestion ? (
                <div className="text-xs text-[#1c2a2b]/50 mb-1">Review AI suggestions below — check fields to apply:</div>
              ) : (
                <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">No name available — skipping this item.</div>
              )}

              <div className="flex gap-3">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border border-[#0e393d]/15 text-xs font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Stop</button>
                <button onClick={() => moveNext(false)} className="px-3 py-2 rounded-lg border border-[#0e393d]/15 text-xs font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Skip →</button>
              </div>
            </div>
          )}

          {/* Done step */}
          {step === 'done' && (
            <div className="p-6 space-y-4 text-center">
              <div className="text-4xl">✓</div>
              <p className="text-base font-medium text-[#0e393d]">All done!</p>
              <p className="text-sm text-[#1c2a2b]/50">{applied} biomarkers updated · {skipped} skipped</p>
              <button onClick={onClose} className="w-full rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 transition">Close</button>
            </div>
          )}
        </div>
      </div>

      {/* Suggestion modal rendered on top of wizard */}
      {step === 'walk' && suggestion && !loading && (
        <AiSuggestionModal
          suggestion={suggestion}
          form={wizardForm}
          initialSelectEmpty
          onApply={handleApply}
          onClose={() => moveNext(false)}
        />
      )}
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
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [panelOpen, setPanelOpen]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [nameLang, setNameLang]     = useState<Lang>('en');
  const [descLang, setDescLang]     = useState<Lang>('en');
  const [translating, setTranslating]   = useState(false);
  const [autocompleting, setAutocompleting] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    names: true, description: true, measurement: true, ranges: true, settings: false,
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Refresh ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('product_item_definitions')
      .select('id, slug, name, description, item_type, is_active, sort_order, unit, range_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, he_domain')
      .order('sort_order', { ascending: true });
    if (data) setItems(data as ItemDefinition[]);
  }, [supabase]);

  // ── Panel helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null); setNameLang('en'); setDescLang('en');
    setForm(EMPTY_FORM); setError(null);
    setOpenSections({ names: true, description: true, measurement: true, ranges: true, settings: false });
    setPanelOpen(true);
  };

  const openEdit = (item: ItemDefinition) => {
    setEditingId(item.id); setNameLang('en'); setDescLang('en');
    setForm({
      name:        { de: item.name?.de ?? '', en: item.name?.en ?? '', fr: item.name?.fr ?? '', es: item.name?.es ?? '', it: item.name?.it ?? '' },
      description: { de: item.description?.de ?? '', en: item.description?.en ?? '', fr: item.description?.fr ?? '', es: item.description?.es ?? '', it: item.description?.it ?? '' },
      item_type:   item.item_type ?? 'biomarker',
      sort_order:  item.sort_order != null ? String(item.sort_order) : '',
      is_active:   item.is_active ?? true,
      unit:        item.unit ?? '',
      range_type:  item.range_type ?? 'range',
      ref_range_low:     item.ref_range_low  != null ? String(item.ref_range_low)  : '',
      ref_range_high:    item.ref_range_high != null ? String(item.ref_range_high) : '',
      optimal_range_low:  item.optimal_range_low  != null ? String(item.optimal_range_low)  : '',
      optimal_range_high: item.optimal_range_high != null ? String(item.optimal_range_high) : '',
      he_domain:   item.he_domain ?? '',
    });
    setError(null);
    setOpenSections({ names: true, description: true, measurement: true, ranges: true, settings: false });
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setError(null); };

  // ── AI Translate ──────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    const srcName = form.name.en || form.name.de;
    if (!srcName) { alert('Enter a DE or EN name first.'); return; }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: srcName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Translate failed');
      setForm((f) => ({ ...f, name: { ...f.name, fr: f.name.fr || json.name_fr || '', es: f.name.es || json.name_es || '', it: f.name.it || json.name_it || '' } }));
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

  // ── Wizard patch ──────────────────────────────────────────────────────────

  const handleWizardPatch = async (id: string, patch: Partial<Record<string, unknown>>) => {
    await supabase.from('product_item_definitions').update(patch).eq('id', id);
    await refresh();
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.de.trim() && !form.name.en.trim()) { setError('Name (DE or EN) is required.'); return; }
    setSaving(true); setError(null);
    const rt = form.range_type || null;
    const payload = {
      name:        { de: form.name.de, en: form.name.en, fr: form.name.fr, es: form.name.es, it: form.name.it },
      description: { de: form.description.de, en: form.description.en, fr: form.description.fr, es: form.description.es, it: form.description.it },
      item_type:   form.item_type || null,
      sort_order:  form.sort_order ? Number(form.sort_order) : null,
      is_active:   form.is_active,
      unit:        form.unit || null,
      range_type:  rt,
      ref_range_low:     rt === 'lower_is_better'  ? null : parseNum(form.ref_range_low),
      ref_range_high:    rt === 'higher_is_better' ? null : parseNum(form.ref_range_high),
      optimal_range_low: rt === 'lower_is_better'  ? null : parseNum(form.optimal_range_low),
      optimal_range_high:rt === 'higher_is_better' ? null : parseNum(form.optimal_range_high),
      he_domain:   form.he_domain || null,
    };
    try {
      if (editingId) {
        const { error: err } = await supabase.from('product_item_definitions').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('product_item_definitions').insert({ ...payload, slug: slugify(form.name.en || form.name.de) });
        if (err) throw err;
      }
      await refresh();
      closePanel();
    } catch (e: unknown) {
      setError(typeof e === 'object' && e && 'message' in e ? (e as { message: string }).message : String(e));
    } finally { setSaving(false); }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const incompleteCount = items.filter((i) => getItemPriority(i) !== null).length;

  const filtered = items.filter((item) => {
    if (showIncomplete && !getItemPriority(item)) return false;
    if (typeFilter && item.item_type !== typeFilter) return false;
    if (domainFilter && item.he_domain !== domainFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.en?.toLowerCase().includes(q) ||
      item.name?.de?.toLowerCase().includes(q) ||
      item.item_type?.toLowerCase().includes(q) ||
      item.slug?.toLowerCase().includes(q) ||
      item.unit?.toLowerCase().includes(q)
    );
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
          <AiBtn gold onClick={() => setWizardOpen(true)} loading={false} label="✨ AI Fill Missing" />
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
        {incompleteCount > 0 && (
          <>
            <span className="text-[#0e393d]/20">·</span>
            <button
              onClick={() => setShowIncomplete((v) => !v)}
              className={`flex items-center gap-1.5 transition ${showIncomplete ? 'text-amber-600 font-medium' : 'text-amber-500 hover:text-amber-600'}`}
            >
              <span>⚠</span>
              <span>{incompleteCount} incomplete</span>
            </button>
          </>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5">
          {[{ value: '', label: 'All' }, ...ITEM_TYPES].map(({ value, label }) => (
            <button key={value} onClick={() => setTypeFilter(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${typeFilter === value ? 'bg-[#0e393d] text-white' : 'bg-[#0e393d]/8 text-[#0e393d]/70 hover:bg-[#0e393d]/15'}`}>
              {label}
            </button>
          ))}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Health Domain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Ranges</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">No biomarkers found.</td></tr>
            )}
            {filtered.map((item) => {
              const priority = getItemPriority(item);
              return (
                <tr key={item.id} className="hover:bg-[#fafaf8] transition-colors cursor-pointer" onClick={() => openEdit(item)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {priority && <PriorityDot priority={priority} />}
                      <div>
                        <div className="font-medium text-[#0e393d]">{item.name?.en || item.name?.de || <span className="text-[#1c2a2b]/30">—</span>}</div>
                        {item.name?.en && item.name?.de && <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{item.name.de}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.item_type ? (
                      <span className="inline-flex items-center rounded-full bg-[#ceab84]/15 px-2 py-0.5 text-[11px] font-medium text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/30">
                        {ITEM_TYPES.find((t) => t.value === item.item_type)?.label ?? item.item_type}
                      </span>
                    ) : <span className="text-[#1c2a2b]/30">—</span>}
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

      {/* ── Wizard ── */}
      {wizardOpen && (
        <WizardModal items={items} onClose={() => { setWizardOpen(false); refresh(); }} onPatchItem={handleWizardPatch} />
      )}

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
                  <div className="border-l border-[#0e393d]/15 flex items-center px-2">
                    <AiBtn onClick={handleTranslate} loading={translating} label="✦ Translate" />
                  </div>
                </div>
                <Field label={`Name (${nameLang.toUpperCase()}) *`}>
                  <input className={inputCls} value={form.name[nameLang]}
                    onChange={(e) => setForm((f) => ({ ...f, name: { ...f.name, [nameLang]: e.target.value } }))}
                    placeholder={nameLang === 'de' ? 'z.B. Hämoglobin' : 'e.g. Haemoglobin'} autoFocus />
                </Field>
                <Field label="Slug" hint="Auto-generated from EN name on create">
                  <input className={inputCls} value={editingId ? (items.find((i) => i.id === editingId)?.slug ?? '') : slugify(form.name.en || form.name.de)} readOnly tabIndex={-1} />
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
                  <Field label="Item Type">
                    <select className={selectCls} value={form.item_type} onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value }))}>
                      {ITEM_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Unit" hint="Swiss/EU clinical unit">
                    <UnitField value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Health Domain">
                      <select className={selectCls} value={form.he_domain} onChange={(e) => setForm((f) => ({ ...f, he_domain: e.target.value }))}>
                        {HE_DOMAINS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              </SectionBlock>

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
