'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import PrepNotesReviewModal, { type PrepNoteReviewSuggestion } from './PrepNotesReviewModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrepNote = {
  id: string;
  name: { en?: string; de?: string; fr?: string; es?: string; it?: string };
  slug: string;
  is_common: boolean;
  created_at: string;
};

type FormData = {
  name_en: string;
  name_de: string;
  name_fr: string;
  name_es: string;
  name_it: string;
  slug: string;
  is_common: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = { name_en: '', name_de: '', name_fr: '', name_es: '', name_it: '', slug: '', is_common: true };

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const inputCls = 'w-full rounded border border-[#0e393d]/20 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30';

// ─── Inline form row (colSpan layout) ─────────────────────────────────────────

function FormRow({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  duplicateMatches,
  onEditExisting,
}: {
  form: FormData;
  onChange: (f: FormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  duplicateMatches?: PrepNote[];
  onEditExisting?: (note: PrepNote) => void;
}) {
  const [aiStatus, setAiStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  const handleAI = async () => {
    if (!form.name_en.trim()) return;
    setAiStatus('running');
    try {
      const res = await fetch('/api/admin/translate-prep-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: form.name_en }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onChange({
        ...form,
        name_de: form.name_de || data.name_de || '',
        name_fr: form.name_fr || data.name_fr || '',
        name_es: form.name_es || data.name_es || '',
        name_it: form.name_it || data.name_it || '',
      });
      setAiStatus('done');
    } catch (e) {
      console.error('Translate prep note error:', e);
      setAiStatus('error');
    }
  };

  return (
    <tr className="bg-amber-50/50">
      <td colSpan={5} className="px-4 py-3">
        <div className="space-y-2">
          {/* EN + DE + AI button */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name EN *</label>
              <input
                autoFocus
                value={form.name_en}
                onChange={(e) =>
                  onChange({ ...form, name_en: e.target.value, slug: form.slug || toSlug(e.target.value) })
                }
                placeholder="e.g. finely chopped"
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name DE</label>
              <input
                value={form.name_de}
                onChange={(e) => onChange({ ...form, name_de: e.target.value })}
                placeholder="z.B. fein gehackt"
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => { if (aiStatus !== 'running') handleAI(); }}
              disabled={aiStatus === 'running' || !form.name_en.trim()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-violet-50 text-violet-700 text-[11px] font-medium hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
              title="Translate EN name to DE/FR/ES/IT"
            >
              {aiStatus === 'running' ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                  Translating…
                </>
              ) : aiStatus === 'done' ? <>✓ Done</> : aiStatus === 'error' ? <>⚠ Retry</> : <>✦ AI Translate</>}
            </button>
          </div>

          {/* Duplicate detection warning */}
          {duplicateMatches && duplicateMatches.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-medium text-amber-800 mb-1.5">
                ⚠ Similar prep notes found — did you mean to edit one instead?
              </p>
              <div className="space-y-0.5">
                {duplicateMatches.map((note) => {
                  const label = [note.name.en, note.name.de].filter(Boolean).join(' / ');
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => onEditExisting?.(note)}
                      className="block w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-amber-900 hover:bg-amber-100 transition"
                    >
                      {label || note.slug}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* FR + ES + IT */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name FR</label>
              <input value={form.name_fr} onChange={(e) => onChange({ ...form, name_fr: e.target.value })} placeholder="ex. finement haché" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name ES</label>
              <input value={form.name_es} onChange={(e) => onChange({ ...form, name_es: e.target.value })} placeholder="ej. finamente picado" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Name IT</label>
              <input value={form.name_it} onChange={(e) => onChange({ ...form, name_it: e.target.value })} placeholder="es. finemente tritato" className={inputCls} />
            </div>
          </div>

          {/* Slug + Common + Actions */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 max-w-xs">
              <label className="block text-[10px] font-medium text-[#0e393d]/60 mb-0.5">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => onChange({ ...form, slug: e.target.value })}
                placeholder="finely-chopped"
                className={inputCls + ' font-mono text-xs'}
              />
            </div>
            <label className="flex items-center gap-1.5 text-sm text-[#1c2a2b]/70 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_common}
                onChange={(e) => onChange({ ...form, is_common: e.target.checked })}
                className="rounded"
              />
              Common
            </label>
            <div className="flex gap-2 mt-4">
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
        </div>
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrepNotesManager({ initialNotes }: { initialNotes: PrepNote[] }) {
  const supabase = createClient();
  const [notes, setNotes] = useState<PrepNote[]>(initialNotes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Duplicate detection for add form
  const addDupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addDuplicates, setAddDuplicates] = useState<PrepNote[]>([]);

  // AI Review & Complete
  const [reviewScanStatus, setReviewScanStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle');
  const [reviewSuggestions, setReviewSuggestions] = useState<PrepNoteReviewSuggestion[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Debounced duplicate search on addForm.name_en
  useEffect(() => {
    if (!adding) { setAddDuplicates([]); return; }
    if (addDupTimerRef.current) clearTimeout(addDupTimerRef.current);
    addDupTimerRef.current = setTimeout(() => {
      const q = addForm.name_en.trim().toLowerCase();
      if (!q) { setAddDuplicates([]); return; }
      setAddDuplicates(
        notes
          .filter((n) => {
            const en = (n.name.en ?? '').toLowerCase();
            const de = (n.name.de ?? '').toLowerCase();
            return (en && (en.includes(q) || q.includes(en))) || (de && (de.includes(q) || q.includes(de)));
          })
          .slice(0, 3)
      );
    }, 300);
  }, [addForm.name_en, adding]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('preparation_notes')
      .select('*')
      .order('slug');
    if (data) setNotes(data as PrepNote[]);
  }, [supabase]);

  const buildName = (f: FormData) => {
    const name: Record<string, string> = { en: f.name_en };
    if (f.name_de.trim()) name.de = f.name_de.trim();
    if (f.name_fr.trim()) name.fr = f.name_fr.trim();
    if (f.name_es.trim()) name.es = f.name_es.trim();
    if (f.name_it.trim()) name.it = f.name_it.trim();
    return name;
  };

  const startEdit = (note: PrepNote) => {
    setEditingId(note.id);
    setEditForm({
      name_en: note.name.en ?? '',
      name_de: note.name.de ?? '',
      name_fr: note.name.fr ?? '',
      name_es: note.name.es ?? '',
      name_it: note.name.it ?? '',
      slug: note.slug,
      is_common: note.is_common,
    });
    setAdding(false);
    setAddDuplicates([]);
    setError('');
  };

  const cancelEdit = () => { setEditingId(null); setError(''); };

  const saveEdit = async () => {
    if (!editingId || !editForm.name_en.trim()) { setError('Name (EN) is required.'); return; }
    setSaving(true);
    const { error: err } = await supabase
      .from('preparation_notes')
      .update({ name: buildName(editForm), slug: editForm.slug, is_common: editForm.is_common })
      .eq('id', editingId);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditingId(null);
    await refresh();
  };

  const saveAdd = async () => {
    if (!addForm.name_en.trim()) { setError('Name (EN) is required.'); return; }
    const slug = addForm.slug.trim() || toSlug(addForm.name_en);
    setSaving(true);
    const { error: err } = await supabase
      .from('preparation_notes')
      .insert({ name: buildName(addForm), slug, is_common: addForm.is_common });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setAdding(false);
    setAddForm(EMPTY_FORM);
    setAddDuplicates([]);
    await refresh();
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this prep note? This cannot be undone.')) return;
    await supabase.from('preparation_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const toggleCommon = async (note: PrepNote) => {
    await supabase.from('preparation_notes').update({ is_common: !note.is_common }).eq('id', note.id);
    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, is_common: !n.is_common } : n));
  };

  // ── AI Review & Complete ─────────────────────────────────────────────────────

  const handleReviewScan = async () => {
    setReviewScanStatus('scanning');

    const toReview = notes.filter((n) => !n.name.fr || !n.name.es || !n.name.it);

    if (toReview.length === 0) {
      setReviewSuggestions([]);
      setReviewScanStatus('ready');
      setReviewModalOpen(true);
      return;
    }

    const BATCH = 20;
    const allSuggestions: PrepNoteReviewSuggestion[] = [];

    try {
      for (let i = 0; i < toReview.length; i += BATCH) {
        const batch = toReview.slice(i, i + BATCH);
        const res = await fetch('/api/admin/review-prep-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: batch.map((n) => ({
              id: n.id,
              name_en: n.name.en ?? '',
              name_de: n.name.de ?? '',
              name_fr: n.name.fr ?? '',
              name_es: n.name.es ?? '',
              name_it: n.name.it ?? '',
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
      console.error('Review prep notes scan error:', e);
      setReviewScanStatus('error');
    }
  };

  const handleReviewApply = async (
    accepted: PrepNoteReviewSuggestion[],
    onProgress: (done: number, total: number) => void
  ) => {
    for (let i = 0; i < accepted.length; i++) {
      const s = accepted[i];
      const note = notes.find((n) => n.id === s.id);
      if (!note) continue;

      const updatedName = {
        ...note.name,
        ...(s.name_fr ? { fr: s.name_fr } : {}),
        ...(s.name_es ? { es: s.name_es } : {}),
        ...(s.name_it ? { it: s.name_it } : {}),
      };

      await supabase.from('preparation_notes').update({ name: updatedName }).eq('id', s.id);
      onProgress(i + 1, accepted.length);
    }

    await refresh();
    setReviewModalOpen(false);
    setReviewScanStatus('idle');
  };

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = search
    ? notes.filter((n) => {
        const q = search.toLowerCase();
        return (
          (n.name.en ?? '').toLowerCase().includes(q) ||
          (n.name.de ?? '').toLowerCase().includes(q) ||
          (n.name.fr ?? '').toLowerCase().includes(q) ||
          (n.name.es ?? '').toLowerCase().includes(q) ||
          (n.name.it ?? '').toLowerCase().includes(q) ||
          n.slug.includes(q)
        );
      })
    : notes;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Prep Notes</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {notes.length} total · {notes.filter((n) => n.is_common).length} common
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Review & Complete */}
          <button
            onClick={() => { if (reviewScanStatus !== 'scanning') handleReviewScan(); }}
            disabled={reviewScanStatus === 'scanning'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0e393d]/20 text-[#0e393d] text-xs font-medium hover:bg-[#0e393d]/5 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Scan prep notes for missing translations"
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
            onClick={() => { setAdding(true); setAddForm(EMPTY_FORM); setEditingId(null); setAddDuplicates([]); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
          >
            <span className="text-lg leading-none">+</span> New Note
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
              {['Name (EN)', 'Name (DE)', 'Slug', 'Common', ''].map((h, i) => (
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
                onCancel={() => { setAdding(false); setAddDuplicates([]); setError(''); }}
                saving={saving}
                duplicateMatches={addDuplicates}
                onEditExisting={startEdit}
              />
            )}

            {filtered.length === 0 && !adding && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No prep notes found.
                </td>
              </tr>
            )}

            {filtered.map((note) =>
              editingId === note.id ? (
                <FormRow
                  key={note.id}
                  form={editForm}
                  onChange={setEditForm}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              ) : (
                <tr key={note.id} className="hover:bg-[#fafaf8] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#0e393d]">{note.name.en ?? '—'}</div>
                    {(note.name.fr || note.name.es || note.name.it) && (
                      <div className="text-[10px] text-[#1c2a2b]/30 mt-0.5">
                        {[note.name.fr, note.name.es, note.name.it].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#1c2a2b]/60">{note.name.de ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#1c2a2b]/40">{note.slug}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleCommon(note)}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset transition ${
                        note.is_common
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : 'bg-gray-50 text-gray-500 ring-gray-400/20 hover:bg-emerald-50'
                      }`}
                    >
                      {note.is_common ? 'Common' : 'Uncommon'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <button
                      onClick={() => startEdit(note)}
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
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
        <PrepNotesReviewModal
          suggestions={reviewSuggestions}
          totalScanned={notes.length}
          notes={notes}
          onApply={handleReviewApply}
          onClose={() => { setReviewModalOpen(false); setReviewScanStatus('idle'); }}
        />
      )}
    </div>
  );
}
