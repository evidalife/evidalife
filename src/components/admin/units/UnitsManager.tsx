'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import UnitsReviewModal, { type UnitReviewSuggestion } from './UnitsReviewModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeasurementUnit = {
  id: string;
  code: string;
  name: { en?: string; de?: string; fr?: string; es?: string; it?: string };
  abbreviation: { en?: string; de?: string; fr?: string; es?: string; it?: string };
  category: string;
  sort_order: number;
};

type FormData = {
  code: string;
  name_en: string;
  name_de: string;
  name_fr: string;
  name_es: string;
  name_it: string;
  abbrev_en: string;
  abbrev_de: string;
  abbrev_fr: string;
  abbrev_es: string;
  abbrev_it: string;
  category: string;
  sort_order: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  code: '', name_en: '', name_de: '', name_fr: '', name_es: '', name_it: '',
  abbrev_en: '', abbrev_de: '', abbrev_fr: '', abbrev_es: '', abbrev_it: '',
  category: '', sort_order: '',
};

const inputCls = 'w-full rounded border border-[#0e393d]/20 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30';

// ─── Inline form row (colSpan layout) ─────────────────────────────────────────

function FormRow({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  isEditing,
  duplicateCode,
}: {
  form: FormData;
  onChange: (f: FormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
  duplicateCode?: boolean;
}) {
  const [aiStatus, setAiStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  const handleAI = async () => {
    if (!form.name_en.trim()) return;
    setAiStatus('running');
    try {
      const res = await fetch('/api/admin/translate-unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: form.name_en, abbrev_en: form.abbrev_en || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onChange({
        ...form,
        name_de: form.name_de || data.name_de || '',
        name_fr: form.name_fr || data.name_fr || '',
        name_es: form.name_es || data.name_es || '',
        name_it: form.name_it || data.name_it || '',
        abbrev_de: form.abbrev_de || data.abbrev_de || '',
        abbrev_fr: form.abbrev_fr || data.abbrev_fr || '',
        abbrev_es: form.abbrev_es || data.abbrev_es || '',
        abbrev_it: form.abbrev_it || data.abbrev_it || '',
      });
      setAiStatus('done');
    } catch (e) {
      console.error('Translate unit error:', e);
      setAiStatus('error');
    }
  };

  return (
    <tr className="bg-amber-50/50">
      <td colSpan={6} className="px-4 py-3">
        <div className="space-y-2">

          {/* Row 1: Code + Category + Sort Order */}
          <div className="flex items-end gap-2">
            <div className="w-32">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">
                Code {!isEditing && <span className="text-red-500">*</span>}
              </label>
              {isEditing ? (
                <div className={inputCls + ' bg-[#fafaf8] text-[#1c2a2b]/50 font-mono text-xs cursor-default'}>
                  {form.code}
                </div>
              ) : (
                <input
                  autoFocus
                  value={form.code}
                  onChange={(e) => onChange({ ...form, code: e.target.value.toLowerCase().trim() })}
                  placeholder="e.g. tbsp"
                  className={inputCls + ' font-mono text-xs' + (duplicateCode ? ' border-amber-400 ring-1 ring-amber-300' : '')}
                />
              )}
            </div>
            <div className="w-36">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Category</label>
              <input
                value={form.category}
                onChange={(e) => onChange({ ...form, category: e.target.value })}
                placeholder="e.g. volume"
                className={inputCls}
              />
            </div>
            <div className="w-24">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => onChange({ ...form, sort_order: e.target.value })}
                placeholder="10"
                className={inputCls}
              />
            </div>
          </div>

          {/* Duplicate code warning */}
          {duplicateCode && !isEditing && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-800">
                ⚠ A unit with code <span className="font-mono">{form.code}</span> already exists.
              </p>
            </div>
          )}

          {/* Row 2: Name EN + Name DE + AI button */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name EN *</label>
              <input
                value={form.name_en}
                onChange={(e) => onChange({ ...form, name_en: e.target.value })}
                placeholder="e.g. tablespoon"
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name DE</label>
              <input
                value={form.name_de}
                onChange={(e) => onChange({ ...form, name_de: e.target.value })}
                placeholder="z.B. Esslöffel"
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => { if (aiStatus !== 'running') handleAI(); }}
              disabled={aiStatus === 'running' || !form.name_en.trim()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-violet-50 text-violet-700 text-[11px] font-medium hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
              title="Translate EN name and abbreviation to DE/FR/ES/IT"
            >
              {aiStatus === 'running' ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                  Translating…
                </>
              ) : aiStatus === 'done' ? <>✓ Done</> : aiStatus === 'error' ? <>⚠ Retry</> : <>✦ AI Translate</>}
            </button>
          </div>

          {/* Row 3: Abbrev EN + Abbrev DE */}
          <div className="flex items-end gap-2">
            <div className="w-32">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Abbrev EN</label>
              <input
                value={form.abbrev_en}
                onChange={(e) => onChange({ ...form, abbrev_en: e.target.value })}
                placeholder="e.g. tbsp"
                className={inputCls + ' font-mono text-xs'}
              />
            </div>
            <div className="w-32">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Abbrev DE</label>
              <input
                value={form.abbrev_de}
                onChange={(e) => onChange({ ...form, abbrev_de: e.target.value })}
                placeholder="z.B. EL"
                className={inputCls + ' font-mono text-xs'}
              />
            </div>
          </div>

          {/* Row 4: Name FR + ES + IT */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name FR</label>
              <input value={form.name_fr} onChange={(e) => onChange({ ...form, name_fr: e.target.value })} placeholder="ex. cuillère à soupe" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name ES</label>
              <input value={form.name_es} onChange={(e) => onChange({ ...form, name_es: e.target.value })} placeholder="ej. cucharada" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name IT</label>
              <input value={form.name_it} onChange={(e) => onChange({ ...form, name_it: e.target.value })} placeholder="es. cucchiaio" className={inputCls} />
            </div>
          </div>

          {/* Row 5: Abbrev FR + ES + IT */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Abbrev FR</label>
              <input value={form.abbrev_fr} onChange={(e) => onChange({ ...form, abbrev_fr: e.target.value })} placeholder="ex. c. à s." className={inputCls + ' font-mono text-xs'} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Abbrev ES</label>
              <input value={form.abbrev_es} onChange={(e) => onChange({ ...form, abbrev_es: e.target.value })} placeholder="ej. cda." className={inputCls + ' font-mono text-xs'} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Abbrev IT</label>
              <input value={form.abbrev_it} onChange={(e) => onChange({ ...form, abbrev_it: e.target.value })} placeholder="es. c." className={inputCls + ' font-mono text-xs'} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1 rounded-md text-xs font-medium bg-[#0e393d] text-white hover:bg-[#0e393d]/85 disabled:opacity-50 transition"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
            >
              Cancel
            </button>
          </div>

        </div>
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UnitsManager({ initialUnits }: { initialUnits: MeasurementUnit[] }) {
  const supabase = createClient();
  const [units, setUnits] = useState<MeasurementUnit[]>(initialUnits);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Duplicate detection on code field (add form only)
  const addDupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [codeDuplicate, setCodeDuplicate] = useState(false);

  // AI Review & Complete
  const [reviewScanStatus, setReviewScanStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle');
  const [reviewSuggestions, setReviewSuggestions] = useState<UnitReviewSuggestion[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Debounced duplicate detection on code field
  useEffect(() => {
    if (!adding) { setCodeDuplicate(false); return; }
    if (addDupTimerRef.current) clearTimeout(addDupTimerRef.current);
    addDupTimerRef.current = setTimeout(() => {
      const code = addForm.code.trim().toLowerCase();
      if (!code) { setCodeDuplicate(false); return; }
      setCodeDuplicate(units.some((u) => u.code.toLowerCase() === code));
    }, 300);
  }, [addForm.code, adding]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('measurement_units')
      .select('id, code, name, abbreviation, category, sort_order')
      .order('sort_order');
    if (data) setUnits(data as MeasurementUnit[]);
  }, [supabase]);

  const buildName = (f: FormData) => {
    const name: Record<string, string> = { en: f.name_en };
    if (f.name_de.trim()) name.de = f.name_de.trim();
    if (f.name_fr.trim()) name.fr = f.name_fr.trim();
    if (f.name_es.trim()) name.es = f.name_es.trim();
    if (f.name_it.trim()) name.it = f.name_it.trim();
    return name;
  };

  const buildAbbrev = (f: FormData) => {
    const abbrev: Record<string, string> = {};
    if (f.abbrev_en.trim()) abbrev.en = f.abbrev_en.trim();
    if (f.abbrev_de.trim()) abbrev.de = f.abbrev_de.trim();
    if (f.abbrev_fr.trim()) abbrev.fr = f.abbrev_fr.trim();
    if (f.abbrev_es.trim()) abbrev.es = f.abbrev_es.trim();
    if (f.abbrev_it.trim()) abbrev.it = f.abbrev_it.trim();
    return abbrev;
  };

  const startEdit = (unit: MeasurementUnit) => {
    setEditingId(unit.id);
    setEditForm({
      code: unit.code,
      name_en: unit.name.en ?? '',
      name_de: unit.name.de ?? '',
      name_fr: unit.name.fr ?? '',
      name_es: unit.name.es ?? '',
      name_it: unit.name.it ?? '',
      abbrev_en: unit.abbreviation.en ?? '',
      abbrev_de: unit.abbreviation.de ?? '',
      abbrev_fr: unit.abbreviation.fr ?? '',
      abbrev_es: unit.abbreviation.es ?? '',
      abbrev_it: unit.abbreviation.it ?? '',
      category: unit.category ?? '',
      sort_order: String(unit.sort_order ?? ''),
    });
    setAdding(false);
    setCodeDuplicate(false);
    setError('');
  };

  const cancelEdit = () => { setEditingId(null); setError(''); };

  const saveEdit = async () => {
    if (!editingId || !editForm.name_en.trim()) { setError('Name (EN) is required.'); return; }
    setSaving(true);
    const { error: err } = await supabase
      .from('measurement_units')
      .update({
        name: buildName(editForm),
        abbreviation: buildAbbrev(editForm),
        category: editForm.category.trim() || null,
        sort_order: editForm.sort_order ? parseInt(editForm.sort_order, 10) : null,
      })
      .eq('id', editingId);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditingId(null);
    await refresh();
  };

  const saveAdd = async () => {
    if (!addForm.code.trim()) { setError('Code is required.'); return; }
    if (!addForm.name_en.trim()) { setError('Name (EN) is required.'); return; }
    if (codeDuplicate) { setError(`A unit with code "${addForm.code}" already exists.`); return; }
    setSaving(true);
    const { error: err } = await supabase
      .from('measurement_units')
      .insert({
        code: addForm.code.trim(),
        name: buildName(addForm),
        abbreviation: buildAbbrev(addForm),
        category: addForm.category.trim() || null,
        sort_order: addForm.sort_order ? parseInt(addForm.sort_order, 10) : null,
      });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setAdding(false);
    setAddForm(EMPTY_FORM);
    setCodeDuplicate(false);
    await refresh();
  };

  const deleteUnit = async (id: string) => {
    if (!confirm('Delete this unit? This cannot be undone.')) return;
    await supabase.from('measurement_units').delete().eq('id', id);
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  // ── AI Review & Complete ─────────────────────────────────────────────────────

  const handleReviewScan = async () => {
    setReviewScanStatus('scanning');

    const toReview = units.filter(
      (u) => !u.name.fr || !u.name.es || !u.name.it ||
        (u.abbreviation.en && (!u.abbreviation.fr || !u.abbreviation.es || !u.abbreviation.it))
    );

    if (toReview.length === 0) {
      setReviewSuggestions([]);
      setReviewScanStatus('ready');
      setReviewModalOpen(true);
      return;
    }

    const BATCH = 20;
    const allSuggestions: UnitReviewSuggestion[] = [];

    try {
      for (let i = 0; i < toReview.length; i += BATCH) {
        const batch = toReview.slice(i, i + BATCH);
        const res = await fetch('/api/admin/review-units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            units: batch.map((u) => ({
              id: u.id,
              name_en: u.name.en ?? '',
              name_de: u.name.de ?? '',
              name_fr: u.name.fr ?? '',
              name_es: u.name.es ?? '',
              name_it: u.name.it ?? '',
              abbrev_en: u.abbreviation.en ?? '',
              abbrev_de: u.abbreviation.de ?? '',
              abbrev_fr: u.abbreviation.fr ?? '',
              abbrev_es: u.abbreviation.es ?? '',
              abbrev_it: u.abbreviation.it ?? '',
            })),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { suggestions } = await res.json();
        allSuggestions.push(...suggestions);
      }
      setReviewSuggestions(allSuggestions);
      setReviewScanStatus('ready');
      setReviewModalOpen(true);
    } catch (e) {
      console.error('Review units scan error:', e);
      setReviewScanStatus('error');
    }
  };

  const handleReviewApply = async (
    accepted: UnitReviewSuggestion[],
    onProgress: (done: number, total: number) => void
  ) => {
    for (let i = 0; i < accepted.length; i++) {
      const s = accepted[i];
      const unit = units.find((u) => u.id === s.id);
      if (!unit) continue;

      const updatedName = {
        ...unit.name,
        ...(s.name_fr ? { fr: s.name_fr } : {}),
        ...(s.name_es ? { es: s.name_es } : {}),
        ...(s.name_it ? { it: s.name_it } : {}),
      };

      const updatedAbbrev = {
        ...unit.abbreviation,
        ...(s.abbrev_fr ? { fr: s.abbrev_fr } : {}),
        ...(s.abbrev_es ? { es: s.abbrev_es } : {}),
        ...(s.abbrev_it ? { it: s.abbrev_it } : {}),
      };

      await supabase
        .from('measurement_units')
        .update({ name: updatedName, abbreviation: updatedAbbrev })
        .eq('id', s.id);
      onProgress(i + 1, accepted.length);
    }

    await refresh();
    setReviewModalOpen(false);
    setReviewScanStatus('idle');
  };

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = search
    ? units.filter((u) => {
        const q = search.toLowerCase();
        return (
          u.code.toLowerCase().includes(q) ||
          (u.name.en ?? '').toLowerCase().includes(q) ||
          (u.name.de ?? '').toLowerCase().includes(q) ||
          (u.category ?? '').toLowerCase().includes(q)
        );
      })
    : units;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Units</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {units.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Review & Complete */}
          <button
            onClick={() => { if (reviewScanStatus !== 'scanning') handleReviewScan(); }}
            disabled={reviewScanStatus === 'scanning'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0e393d]/20 text-[#0e393d] text-xs font-medium hover:bg-[#0e393d]/5 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Scan units for missing translations"
          >
            {reviewScanStatus === 'scanning' ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
                Scanning…
              </>
            ) : reviewScanStatus === 'error' ? (
              <>⚠ Retry Review</>
            ) : (
              <>✦ AI Review &amp; Complete</>
            )}
          </button>

          <button
            onClick={() => { setAdding(true); setAddForm(EMPTY_FORM); setEditingId(null); setCodeDuplicate(false); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
          >
            <span className="text-lg leading-none">+</span> New Unit
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition w-52"
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              {['Code', 'Name (EN)', 'Abbrev (EN)', 'Category', 'Sort', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">

            {/* Add row */}
            {adding && (
              <FormRow
                form={addForm}
                onChange={setAddForm}
                onSave={saveAdd}
                onCancel={() => { setAdding(false); setCodeDuplicate(false); setError(''); }}
                saving={saving}
                isEditing={false}
                duplicateCode={codeDuplicate}
              />
            )}

            {filtered.length === 0 && !adding && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No units found.
                </td>
              </tr>
            )}

            {filtered.map((unit) =>
              editingId === unit.id ? (
                <FormRow
                  key={unit.id}
                  form={editForm}
                  onChange={setEditForm}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  saving={saving}
                  isEditing={true}
                />
              ) : (
                <tr key={unit.id} className="hover:bg-[#fafaf8] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-[#0e393d]">{unit.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#0e393d]">{unit.name.en ?? '—'}</div>
                    {(unit.name.fr || unit.name.es || unit.name.it) && (
                      <div className="text-[10px] text-[#1c2a2b]/30 mt-0.5">
                        {[unit.name.fr, unit.name.es, unit.name.it].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#1c2a2b]/60">
                    {unit.abbreviation.en ?? '—'}
                    {(unit.abbreviation.fr || unit.abbreviation.es || unit.abbreviation.it) && (
                      <div className="text-[10px] text-[#1c2a2b]/30 mt-0.5">
                        {[unit.abbreviation.fr, unit.abbreviation.es, unit.abbreviation.it].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#1c2a2b]/60 capitalize">{unit.category ?? '—'}</td>
                  <td className="px-4 py-3 text-[#1c2a2b]/40 tabular-nums">{unit.sort_order ?? '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <button
                      onClick={() => startEdit(unit)}
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteUnit(unit.id)}
                      className="px-3 py-1 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* AI Review Modal */}
      {reviewModalOpen && (
        <UnitsReviewModal
          suggestions={reviewSuggestions}
          totalScanned={units.length}
          units={units}
          onApply={handleReviewApply}
          onClose={() => { setReviewModalOpen(false); setReviewScanStatus('idle'); }}
        />
      )}
    </div>
  );
}
