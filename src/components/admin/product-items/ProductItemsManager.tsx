'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  ref_range_low: number | null;
  ref_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  body_system: string | null;
  he_domain: string | null;
};

type FormState = {
  name: LangContent;
  description: LangContent;
  item_type: string;
  sort_order: string;
  is_active: boolean;
  unit: string;
  ref_range_low: string;
  ref_range_high: string;
  optimal_range_low: string;
  optimal_range_high: string;
  body_system: string;
  he_domain: string;
};

const EMPTY_FORM: FormState = {
  name: { de: '', en: '', fr: '', es: '', it: '' },
  description: { de: '', en: '', fr: '', es: '', it: '' },
  item_type: 'biomarker',
  sort_order: '',
  is_active: true,
  unit: '',
  ref_range_low: '',
  ref_range_high: '',
  optimal_range_low: '',
  optimal_range_high: '',
  body_system: '',
  he_domain: '',
};

const ITEM_TYPES = [
  { value: 'biomarker', label: 'Biomarker' },
  { value: 'vitalcheck_measurement', label: 'Vitalcheck' },
  { value: 'vo2max_test', label: 'VO₂max' },
  { value: 'dexa_scan', label: 'DEXA' },
  { value: 'biological_age_test', label: 'Bio Age' },
  { value: 'coaching_hour', label: 'Coaching' },
  { value: 'food_item', label: 'Food' },
  { value: 'genetic_test', label: 'Genetic' },
];

const BODY_SYSTEMS = [
  '', 'cardiovascular', 'metabolic', 'hormonal', 'immune', 'musculoskeletal',
  'neurological', 'renal', 'hepatic', 'pulmonary', 'hematological', 'other',
];

const HE_DOMAINS = [
  '', 'longevity', 'fitness', 'nutrition', 'mental_health', 'sleep', 'stress', 'other',
];

const LANGS: Lang[] = ['de', 'en', 'fr', 'es', 'it'];

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
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
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[#0e393d]' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SectionBlock({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#0e393d]/8">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#fafaf8] transition"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">{title}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-[#0e393d]/30 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-6 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

function AiBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#ceab84]/40 text-[10px] font-medium text-[#8a6a3e] hover:bg-[#ceab84]/10 disabled:opacity-50 transition whitespace-nowrap"
    >
      {loading ? '…' : label}
    </button>
  );
}

// ─── Reference Range Bar ──────────────────────────────────────────────────────

function RangeBar({ refLow, refHigh, optLow, optHigh }: {
  refLow: number | null;
  refHigh: number | null;
  optLow: number | null;
  optHigh: number | null;
}) {
  if (refLow == null && refHigh == null) return null;
  const max = (refHigh ?? 0) * 1.6;
  if (max === 0) return null;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100)).toFixed(1)}%`;

  return (
    <div className="space-y-1">
      <div className="relative h-3 rounded-full bg-[#0e393d]/8 overflow-hidden">
        {refLow != null && refHigh != null && (
          <div
            className="absolute h-full bg-emerald-100"
            style={{ left: pct(refLow), width: `calc(${pct(refHigh)} - ${pct(refLow)})` }}
          />
        )}
        {optLow != null && optHigh != null && (
          <div
            className="absolute h-full bg-emerald-400/70 rounded-sm"
            style={{ left: pct(optLow), width: `calc(${pct(optHigh)} - ${pct(optLow)})` }}
          />
        )}
        {refLow != null && (
          <div className="absolute top-0 h-full w-px bg-emerald-600" style={{ left: pct(refLow) }} />
        )}
        {refHigh != null && (
          <div className="absolute top-0 h-full w-px bg-emerald-600" style={{ left: pct(refHigh) }} />
        )}
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductItemsManager({ initialItems }: { initialItems: ItemDefinition[] }) {
  const supabase = createClient();
  const [items, setItems] = useState<ItemDefinition[]>(initialItems);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameLang, setNameLang] = useState<Lang>('de');
  const [descLang, setDescLang] = useState<Lang>('de');
  const [translating, setTranslating] = useState(false);
  const [autocompleting, setAutocompleting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    names: true,
    measurement: true,
    ranges: true,
    description: true,
    settings: false,
  });

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Refresh ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('product_item_definitions')
      .select('id, slug, name, description, item_type, is_active, sort_order, unit, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, body_system, he_domain')
      .order('sort_order', { ascending: true });
    if (data) setItems(data as ItemDefinition[]);
  }, [supabase]);

  // ── Panel helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setNameLang('de');
    setDescLang('de');
    setForm(EMPTY_FORM);
    setError(null);
    setOpenSections({ names: true, measurement: true, ranges: true, description: true, settings: false });
    setPanelOpen(true);
  };

  const openEdit = (item: ItemDefinition) => {
    setEditingId(item.id);
    setNameLang('de');
    setDescLang('de');
    setForm({
      name: {
        de: item.name?.de ?? '',
        en: item.name?.en ?? '',
        fr: item.name?.fr ?? '',
        es: item.name?.es ?? '',
        it: item.name?.it ?? '',
      },
      description: {
        de: item.description?.de ?? '',
        en: item.description?.en ?? '',
        fr: item.description?.fr ?? '',
        es: item.description?.es ?? '',
        it: item.description?.it ?? '',
      },
      item_type: item.item_type ?? 'biomarker',
      sort_order: item.sort_order != null ? String(item.sort_order) : '',
      is_active: item.is_active ?? true,
      unit: item.unit ?? '',
      ref_range_low: item.ref_range_low != null ? String(item.ref_range_low) : '',
      ref_range_high: item.ref_range_high != null ? String(item.ref_range_high) : '',
      optimal_range_low: item.optimal_range_low != null ? String(item.optimal_range_low) : '',
      optimal_range_high: item.optimal_range_high != null ? String(item.optimal_range_high) : '',
      body_system: item.body_system ?? '',
      he_domain: item.he_domain ?? '',
    });
    setError(null);
    setOpenSections({ names: true, measurement: true, ranges: true, description: false, settings: false });
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setError(null);
  };

  // ── AI Translate (names) ──────────────────────────────────────────────────────

  const handleTranslate = async () => {
    const srcName = form.name.en || form.name.de;
    if (!srcName) { alert('Enter a DE or EN name first.'); return; }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: srcName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Translate failed');
      setForm((f) => ({
        ...f,
        name: {
          ...f.name,
          fr: f.name.fr || json.name_fr || '',
          es: f.name.es || json.name_es || '',
          it: f.name.it || json.name_it || '',
        },
      }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  };

  // ── AI Autocomplete ────────────────────────────────────────────────────────────

  const handleAutocomplete = async () => {
    const nameEn = form.name.en || form.name.de;
    if (!nameEn) { alert('Enter an EN or DE name first.'); return; }
    setAutocompleting(true);
    try {
      const res = await fetch('/api/admin/autocomplete-biomarker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: nameEn }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Autocomplete failed');
      setForm((f) => ({
        ...f,
        unit: f.unit || json.unit || '',
        ref_range_low: f.ref_range_low || (json.ref_range_low != null ? String(json.ref_range_low) : ''),
        ref_range_high: f.ref_range_high || (json.ref_range_high != null ? String(json.ref_range_high) : ''),
        optimal_range_low: f.optimal_range_low || (json.optimal_range_low != null ? String(json.optimal_range_low) : ''),
        optimal_range_high: f.optimal_range_high || (json.optimal_range_high != null ? String(json.optimal_range_high) : ''),
        body_system: f.body_system || json.body_system || '',
        he_domain: f.he_domain || json.he_domain || '',
        description: {
          de: f.description.de || json.description_de || '',
          en: f.description.en || json.description_en || '',
          fr: f.description.fr || json.description_fr || '',
          es: f.description.es || json.description_es || '',
          it: f.description.it || json.description_it || '',
        },
      }));
      // Open ranges + description sections after autocomplete
      setOpenSections((prev) => ({ ...prev, ranges: true, description: true }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setAutocompleting(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.de.trim() && !form.name.en.trim()) {
      setError('Name (DE or EN) is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: { de: form.name.de, en: form.name.en, fr: form.name.fr, es: form.name.es, it: form.name.it },
      description: { de: form.description.de, en: form.description.en, fr: form.description.fr, es: form.description.es, it: form.description.it },
      item_type: form.item_type || null,
      sort_order: form.sort_order ? Number(form.sort_order) : null,
      is_active: form.is_active,
      unit: form.unit || null,
      ref_range_low: parseNum(form.ref_range_low),
      ref_range_high: parseNum(form.ref_range_high),
      optimal_range_low: parseNum(form.optimal_range_low),
      optimal_range_high: parseNum(form.optimal_range_high),
      body_system: form.body_system || null,
      he_domain: form.he_domain || null,
    };

    try {
      if (editingId) {
        const { error: err } = await supabase.from('product_item_definitions').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const slug = slugify(form.name.en || form.name.de);
        const { error: err } = await supabase.from('product_item_definitions').insert({ ...payload, slug });
        if (err) throw err;
      }
      await refresh();
      closePanel();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError(typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = items.filter((item) => {
    if (typeFilter && item.item_type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.de?.toLowerCase().includes(q) ||
      item.name?.en?.toLowerCase().includes(q) ||
      item.item_type?.toLowerCase().includes(q) ||
      item.slug?.toLowerCase().includes(q) ||
      item.body_system?.toLowerCase().includes(q) ||
      item.unit?.toLowerCase().includes(q)
    );
  });

  // ── Range preview values ──────────────────────────────────────────────────────

  const previewRanges = {
    refLow: parseNum(form.ref_range_low),
    refHigh: parseNum(form.ref_range_high),
    optLow: parseNum(form.optimal_range_low),
    optHigh: parseNum(form.optimal_range_high),
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Biomarker Registry</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {items.length} total · {items.filter((i) => i.is_active).length} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Biomarker
        </button>
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[{ value: '', label: 'All' }, ...ITEM_TYPES].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                typeFilter === value
                  ? 'bg-[#0e393d] text-white'
                  : 'bg-[#0e393d]/8 text-[#0e393d]/70 hover:bg-[#0e393d]/15'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-48 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Body System</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Ranges</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No biomarkers found.
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-[#fafaf8] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d]">
                    {item.name?.de || item.name?.en || <span className="text-[#1c2a2b]/30">—</span>}
                  </div>
                  {item.name?.en && item.name?.de && (
                    <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{item.name.en}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.item_type ? (
                    <span className="inline-flex items-center rounded-full bg-[#ceab84]/15 px-2 py-0.5 text-[11px] font-medium text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/30">
                      {ITEM_TYPES.find((t) => t.value === item.item_type)?.label ?? item.item_type}
                    </span>
                  ) : <span className="text-[#1c2a2b]/30">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-[#1c2a2b]/60">{item.body_system ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-[#0e393d]/70">{item.unit ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-[#1c2a2b]/50">
                  {item.ref_range_low != null && item.ref_range_high != null
                    ? `${item.ref_range_low}–${item.ref_range_high}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {item.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(item)}
                    className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Slide-over panel ──────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={closePanel} />

          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
              <div>
                <h2 className="font-serif text-lg text-[#0e393d]">
                  {editingId ? 'Edit Biomarker' : 'New Biomarker'}
                </h2>
                {editingId && (
                  <p className="text-xs text-[#1c2a2b]/40 mt-0.5">
                    {items.find((i) => i.id === editingId)?.slug ?? ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <AiBtn
                  onClick={handleAutocomplete}
                  loading={autocompleting}
                  label="✦ AI Autocomplete"
                />
                <button onClick={closePanel} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Names section ──────────────────────────────────────────── */}
              <SectionBlock title="Names" open={openSections.names} onToggle={() => toggleSection('names')}>
                {/* Lang tabs */}
                <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs w-fit">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setNameLang(l)}
                      className={`px-3 py-1.5 font-medium transition ${nameLang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                  <div className="border-l border-[#0e393d]/15 flex items-center px-2">
                    <AiBtn onClick={handleTranslate} loading={translating} label="✦ Translate" />
                  </div>
                </div>

                <Field label={`Name (${nameLang.toUpperCase()}) *`}>
                  <input
                    className={inputCls}
                    value={form.name[nameLang]}
                    onChange={(e) => setForm((f) => ({ ...f, name: { ...f.name, [nameLang]: e.target.value } }))}
                    placeholder={nameLang === 'de' ? 'z.B. Hämoglobin' : 'e.g. Haemoglobin'}
                    autoFocus
                  />
                </Field>

                <Field label="Slug" hint="Auto-generated from EN name on create">
                  <input
                    className={inputCls}
                    value={editingId ? (items.find((i) => i.id === editingId)?.slug ?? '') : slugify(form.name.en || form.name.de)}
                    readOnly
                    tabIndex={-1}
                  />
                </Field>
              </SectionBlock>

              {/* ── Measurement section ────────────────────────────────────── */}
              <SectionBlock title="Measurement" open={openSections.measurement} onToggle={() => toggleSection('measurement')}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Item Type">
                    <select
                      className={selectCls}
                      value={form.item_type}
                      onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value }))}
                    >
                      {ITEM_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Unit" hint="e.g. mg/dL, mmol/L, bpm">
                    <input
                      className={inputCls}
                      value={form.unit}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                      placeholder="mg/dL"
                    />
                  </Field>

                  <Field label="Body System">
                    <select
                      className={selectCls}
                      value={form.body_system}
                      onChange={(e) => setForm((f) => ({ ...f, body_system: e.target.value }))}
                    >
                      {BODY_SYSTEMS.map((s) => (
                        <option key={s} value={s}>{s || '— none —'}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="HE Domain">
                    <select
                      className={selectCls}
                      value={form.he_domain}
                      onChange={(e) => setForm((f) => ({ ...f, he_domain: e.target.value }))}
                    >
                      {HE_DOMAINS.map((d) => (
                        <option key={d} value={d}>{d || '— none —'}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </SectionBlock>

              {/* ── Reference Ranges section ──────────────────────────────── */}
              <SectionBlock title="Reference Ranges" open={openSections.ranges} onToggle={() => toggleSection('ranges')}>
                {/* Visual bar */}
                <RangeBar
                  refLow={previewRanges.refLow}
                  refHigh={previewRanges.refHigh}
                  optLow={previewRanges.optLow}
                  optHigh={previewRanges.optHigh}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ref Low" hint="Normal range lower bound">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.ref_range_low}
                      onChange={(e) => setForm((f) => ({ ...f, ref_range_low: e.target.value }))}
                      placeholder="0"
                      step="any"
                    />
                  </Field>
                  <Field label="Ref High" hint="Normal range upper bound">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.ref_range_high}
                      onChange={(e) => setForm((f) => ({ ...f, ref_range_high: e.target.value }))}
                      placeholder="100"
                      step="any"
                    />
                  </Field>
                  <Field label="Optimal Low" hint="Optimal lower bound">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.optimal_range_low}
                      onChange={(e) => setForm((f) => ({ ...f, optimal_range_low: e.target.value }))}
                      placeholder="0"
                      step="any"
                    />
                  </Field>
                  <Field label="Optimal High" hint="Optimal upper bound">
                    <input
                      type="number"
                      className={inputCls}
                      value={form.optimal_range_high}
                      onChange={(e) => setForm((f) => ({ ...f, optimal_range_high: e.target.value }))}
                      placeholder="80"
                      step="any"
                    />
                  </Field>
                </div>

                <div className="flex gap-3 text-xs text-[#1c2a2b]/50 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />
                    Normal range
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400/70" />
                    Optimal range
                  </span>
                </div>
              </SectionBlock>

              {/* ── Description section ───────────────────────────────────── */}
              <SectionBlock title="Description" open={openSections.description} onToggle={() => toggleSection('description')}>
                <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs w-fit">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setDescLang(l)}
                      className={`px-3 py-1.5 font-medium transition ${descLang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>

                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  value={form.description[descLang]}
                  onChange={(e) => setForm((f) => ({ ...f, description: { ...f.description, [descLang]: e.target.value } }))}
                  placeholder={descLang === 'de' ? 'Kurze Beschreibung…' : 'Short description…'}
                />
                <p className="text-[11px] text-[#1c2a2b]/40">1–2 sentences. Used in product detail pages and reports.</p>
              </SectionBlock>

              {/* ── Settings section ──────────────────────────────────────── */}
              <SectionBlock title="Settings" open={openSections.settings} onToggle={() => toggleSection('settings')}>
                <Field label="Sort Order" hint="Lower numbers appear first">
                  <input
                    type="number"
                    className={inputCls}
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    placeholder="10"
                    min={0}
                    step={1}
                  />
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
              {error && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={closePanel}
                  className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition"
                >
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
