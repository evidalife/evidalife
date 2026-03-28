'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversionRow = {
  id: string;
  alt_unit: string;
  canonical_unit: string;
  multiplier: number;
  offset_value: number;
  region: string | null;
  notes: string | null;
  created_at: string;
  biomarkers: {
    id: string;
    name: Record<string, string> | null;
    unit: string | null;
  };
};

type BiomarkerOption = {
  id: string;
  name: Record<string, string> | null;
  unit: string | null;
};

type FormState = {
  biomarkerId: string;
  altUnit: string;
  canonicalUnit: string;
  multiplier: string;
  offset: string;
  region: string;
  notes: string;
};

type SortCol = 'biomarker' | 'alt_unit' | 'canonical_unit' | 'multiplier' | 'region' | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  biomarkerId: '',
  altUnit: '',
  canonicalUnit: '',
  multiplier: '',
  offset: '0',
  region: '',
  notes: '',
};

const REGIONS = ['EU', 'US', 'UK', 'JP', 'AU'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bmName(bm: BiomarkerOption | { name: Record<string, string> | null; unit: string | null } | null | undefined): string {
  if (!bm) return '—';
  return (bm.name as Record<string, string>)?.en || (bm.name as Record<string, string>)?.de || '—';
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UnitConversionsManager() {
  const supabase = createClient();

  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [biomarkers, setBiomarkers]   = useState<BiomarkerOption[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [sortCol, setSortCol]         = useState<SortCol>(null);
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('asc');
  const [panelOpen, setPanelOpen]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [testInput, setTestInput]     = useState('');

  // ── Data loading ──────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const [{ data: convs }, { data: bms }] = await Promise.all([
      supabase
        .from('biomarker_unit_conversions')
        .select('id, alt_unit, canonical_unit, multiplier, offset_value, region, notes, created_at, biomarkers!inner(id, name, unit)')
        .order('created_at', { ascending: false }),
      supabase
        .from('biomarkers')
        .select('id, name, unit')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);
    setConversions((convs ?? []) as unknown as ConversionRow[]);
    setBiomarkers((bms ?? []) as BiomarkerOption[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Sorting ───────────────────────────────────────────────────────────────

  const handleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortCol(null); setSortDir('asc'); }
  };

  const filtered = conversions.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      bmName(c.biomarkers).toLowerCase().includes(q) ||
      c.alt_unit.toLowerCase().includes(q) ||
      c.canonical_unit.toLowerCase().includes(q) ||
      (c.region ?? '').toLowerCase().includes(q)
    );
  });

  const sorted = sortCol === null ? filtered : [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'biomarker')       cmp = bmName(a.biomarkers).localeCompare(bmName(b.biomarkers));
    if (sortCol === 'alt_unit')        cmp = a.alt_unit.localeCompare(b.alt_unit);
    if (sortCol === 'canonical_unit')  cmp = a.canonical_unit.localeCompare(b.canonical_unit);
    if (sortCol === 'multiplier')      cmp = a.multiplier - b.multiplier;
    if (sortCol === 'region')          cmp = (a.region ?? '').localeCompare(b.region ?? '');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  const biomarkersWithConversions = new Set(conversions.map((c) => c.biomarkers?.id)).size;
  const biomarkersWithout = biomarkers.length - biomarkersWithConversions;

  // ── Panel helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setTestInput('');
    setPanelOpen(true);
  };

  const openEdit = (c: ConversionRow) => {
    setEditingId(c.id);
    setForm({
      biomarkerId:   c.biomarkers.id,
      altUnit:       c.alt_unit,
      canonicalUnit: c.canonical_unit,
      multiplier:    String(c.multiplier),
      offset:        String(c.offset_value),
      region:        c.region ?? '',
      notes:         c.notes ?? '',
    });
    setError(null);
    setTestInput('');
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setError(null); };

  const handleBiomarkerSelect = (id: string) => {
    const bm = biomarkers.find((b) => b.id === id);
    setForm((f) => ({ ...f, biomarkerId: id, canonicalUnit: bm?.unit ?? '' }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const missing: string[] = [];
    if (!form.biomarkerId) missing.push('Biomarker');
    if (!form.altUnit.trim()) missing.push('Alternative Unit');
    const mult = parseFloat(form.multiplier);
    if (!form.multiplier || isNaN(mult)) missing.push('Multiplier');
    else if (mult <= 0) missing.push('Multiplier must be > 0');
    if (form.altUnit.trim() && form.canonicalUnit && form.altUnit.trim() === form.canonicalUnit) {
      missing.push('Alt unit must differ from canonical unit');
    }
    if (missing.length) { setError(`Please fix: ${missing.join(', ')}`); return; }

    setSaving(true); setError(null);
    const payload = {
      biomarker_id:  form.biomarkerId,
      alt_unit:      form.altUnit.trim(),
      canonical_unit: form.canonicalUnit,
      multiplier:    parseFloat(form.multiplier),
      offset_value:  parseFloat(form.offset) || 0,
      region:        form.region || null,
      notes:         form.notes || null,
    };

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('biomarker_unit_conversions')
          .update({
            alt_unit:     payload.alt_unit,
            multiplier:   payload.multiplier,
            offset_value: payload.offset_value,
            region:       payload.region,
            notes:        payload.notes,
          })
          .eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('biomarker_unit_conversions')
          .insert(payload);
        if (err) throw err;
      }
      await refresh();
      closePanel();
    } catch (e: unknown) {
      const msg = typeof e === 'object' && e && 'message' in e ? (e as { message: string }).message : String(e);
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('A conversion for this biomarker + unit combination already exists.');
      } else {
        setError(msg);
      }
    } finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete conversion for "${label}"?`)) return;
    await supabase.from('biomarker_unit_conversions').delete().eq('id', id);
    await refresh();
  };

  // ── Test calculator ───────────────────────────────────────────────────────

  const testNum  = parseFloat(testInput);
  const multNum  = parseFloat(form.multiplier);
  const offNum   = parseFloat(form.offset) || 0;
  const testResult = !isNaN(testNum) && !isNaN(multNum)
    ? Math.round((testNum * multNum + offNum) * 10000) / 10000
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 pt-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Unit Conversions</h1>
          <p className="text-sm text-[#1c2a2b]/40 mt-1">Manage alternative unit conversion rules for biomarkers</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 shadow-sm shadow-[#0e393d]/20 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          New Conversion
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-[#0e393d]/8 bg-gradient-to-br from-white to-[#0e393d]/[0.02] px-4 py-3">
          <div className="text-2xl font-semibold text-[#0e393d]">{conversions.length}</div>
          <div className="text-xs text-[#1c2a2b]/50 mt-0.5">Conversion rules</div>
        </div>
        <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30 px-4 py-3">
          <div className="text-2xl font-semibold text-emerald-700">{biomarkersWithConversions}</div>
          <div className="text-xs text-emerald-600/60 mt-0.5">Biomarkers covered</div>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${biomarkersWithout === 0 ? 'border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30' : 'border-amber-200/60 bg-gradient-to-br from-white to-amber-50/30'}`}>
          <div className={`text-2xl font-semibold ${biomarkersWithout === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{biomarkersWithout}</div>
          <div className={`text-xs mt-0.5 ${biomarkersWithout === 0 ? 'text-emerald-600/60' : 'text-amber-600/60'}`}>Without conversions</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative w-64">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/30 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search biomarker or unit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#0e393d]/12 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/8 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
              {([
                ['biomarker',      'Biomarker'],
                ['alt_unit',       'Alt Unit'],
                [null,             ''],
                ['canonical_unit', 'Canonical Unit'],
                ['multiplier',     'Formula'],
                ['region',         'Region'],
              ] as [SortCol | null, string][]).map(([col, label], i) => (
                <th key={i} className="px-4 py-3 text-left">
                  {col ? (
                    <button
                      onClick={() => handleSort(col)}
                      className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition hover:text-[#0e393d] ${sortCol === col ? 'text-[#0e393d]' : 'text-[#0e393d]/50'}`}
                    >
                      {label}
                      <span className="text-[10px] leading-none">
                        {sortCol === col && sortDir === 'asc' ? '▲' : sortCol === col && sortDir === 'desc' ? '▼' : <span className="opacity-0">▲</span>}
                      </span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/30">{label}</span>
                  )}
                </th>
              ))}
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/5">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-[#1c2a2b]/30">Loading…</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center">
                <div className="text-[#1c2a2b]/30 text-sm">No conversions found</div>
                <p className="text-xs text-[#1c2a2b]/20 mt-1">Try adjusting your search</p>
              </td></tr>
            )}
            {sorted.map((c) => (
              <tr key={c.id} className="hover:bg-[#fafaf8] transition-colors group cursor-pointer" onClick={() => openEdit(c)}>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d]">{bmName(c.biomarkers)}</div>
                  <span className="text-[10px] font-mono text-[#1c2a2b]/35">{c.biomarkers?.unit ?? '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-[#1c2a2b]/70 bg-[#0e393d]/[0.03] px-2 py-0.5 rounded">{c.alt_unit}</span>
                </td>
                <td className="px-2 py-3 text-[#0e393d]/25 text-sm">→</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-[#0e393d] bg-[#0e393d]/[0.03] px-2 py-0.5 rounded">{c.canonical_unit}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-[#1c2a2b]/70 bg-[#fafaf8] px-2 py-1 rounded border border-[#0e393d]/6">
                    ×{c.multiplier}{c.offset_value !== 0 && <span className="text-[#1c2a2b]/40"> + {c.offset_value}</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.region
                    ? <span className="inline-flex items-center rounded-md bg-[#0e393d]/6 px-2 py-0.5 text-[11px] font-medium text-[#0e393d]/60">{c.region}</span>
                    : <span className="text-[#1c2a2b]/20">—</span>}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-[#0e393d]/50 hover:text-[#0e393d] hover:bg-[#0e393d]/8 transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, `${bmName(c.biomarkers)} (${c.alt_unit})`)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table footer */}
      <div className="flex items-center justify-between mt-3 text-xs text-[#1c2a2b]/40 px-1">
        <span>Showing {sorted.length} of {conversions.length} conversions</span>
      </div>

      {/* Slide-over panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl rounded-l-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
              <h2 className="font-serif text-lg text-[#0e393d]">
                {editingId ? 'Edit Conversion' : 'New Conversion'}
              </h2>
              <button onClick={closePanel} className="p-1.5 rounded-lg text-[#1c2a2b]/40 hover:text-[#1c2a2b] hover:bg-[#0e393d]/5 transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Biomarker selector */}
              <Field label="Biomarker *" hint={editingId ? 'Cannot change biomarker when editing' : 'Select the biomarker this conversion applies to'}>
                <select
                  className={selectCls}
                  value={form.biomarkerId}
                  onChange={(e) => handleBiomarkerSelect(e.target.value)}
                  disabled={!!editingId}
                >
                  <option value="">— select biomarker —</option>
                  {biomarkers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bmName(b)} ({b.unit ?? '?'})
                    </option>
                  ))}
                </select>
              </Field>

              {/* Canonical unit (read-only) */}
              {form.canonicalUnit && (
                <div className="flex items-center gap-2 rounded-lg bg-[#0e393d]/4 px-4 py-2.5 text-sm">
                  <span className="text-[#1c2a2b]/50">Canonical unit:</span>
                  <span className="font-mono font-medium text-[#0e393d]">{form.canonicalUnit}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Alt unit */}
                <Field label="Alternative Unit *" hint="e.g. mmol/L">
                  <input
                    type="text"
                    className={inputCls}
                    value={form.altUnit}
                    onChange={(e) => setForm((f) => ({ ...f, altUnit: e.target.value }))}
                    placeholder="mmol/L"
                  />
                </Field>

                {/* Region */}
                <Field label="Region" hint="Optional — US, EU, etc.">
                  <select
                    className={selectCls}
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  >
                    <option value="">— any —</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>

                {/* Multiplier */}
                <Field label="Multiplier *" hint="canonical = alt × multiplier + offset">
                  <input
                    type="number"
                    className={inputCls}
                    value={form.multiplier}
                    onChange={(e) => setForm((f) => ({ ...f, multiplier: e.target.value }))}
                    placeholder="18.0182"
                    step="any"
                  />
                </Field>

                {/* Offset */}
                <Field label="Offset" hint="Usually 0 (only for °C↔°F etc.)">
                  <input
                    type="number"
                    className={inputCls}
                    value={form.offset}
                    onChange={(e) => setForm((f) => ({ ...f, offset: e.target.value }))}
                    placeholder="0"
                    step="any"
                  />
                </Field>
              </div>

              {/* Notes */}
              <Field label="Notes" hint="e.g. Glucose: mmol/L × 18.0182 = mg/dL">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Conversion explanation…"
                />
              </Field>

              {/* Test calculator */}
              {form.multiplier && !isNaN(parseFloat(form.multiplier)) && (
                <div className="rounded-xl border border-[#0e393d]/12 bg-[#fafaf8] p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84]">Test Conversion</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        className={inputCls}
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="5.2"
                        step="any"
                      />
                    </div>
                    <span className="font-mono text-xs text-[#1c2a2b]/50">{form.altUnit || '?'}</span>
                    <span className="text-[#0e393d]/40 text-lg">→</span>
                    <div className="text-right">
                      {testResult != null ? (
                        <span className="font-mono text-base font-semibold text-[#0e393d]">
                          {testResult} <span className="text-xs font-normal text-[#1c2a2b]/50">{form.canonicalUnit || '?'}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-[#1c2a2b]/30">—</span>
                      )}
                    </div>
                  </div>
                  {testResult != null && (
                    <p className="text-[11px] font-mono text-[#1c2a2b]/40">
                      {testInput} × {form.multiplier}
                      {offNum !== 0 ? ` + ${offNum}` : ''}
                      {' = '}
                      <span className="text-[#0e393d]/70">{testResult}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4 shrink-0">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              <div className="flex gap-3">
                <button onClick={closePanel} className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Conversion'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
