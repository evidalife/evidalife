'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrepNote = {
  id: string;
  name: { de?: string; en?: string };
  slug: string;
  is_common: boolean;
  created_at: string;
};

type FormData = { name_de: string; name_en: string; slug: string; is_common: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = { name_de: '', name_en: '', slug: '', is_common: true };

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Inline form row ──────────────────────────────────────────────────────────

function FormRow({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  autoFocusField = 'name_en',
}: {
  form: FormData;
  onChange: (f: FormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  autoFocusField?: 'name_en';
}) {
  return (
    <tr className="bg-amber-50/50">
      <td className="px-4 py-2">
        <input
          autoFocus={autoFocusField === 'name_en'}
          value={form.name_en}
          onChange={(e) =>
            onChange({ ...form, name_en: e.target.value, slug: form.slug || toSlug(e.target.value) })
          }
          placeholder="Name (EN)"
          className="w-full rounded border border-[#0e393d]/20 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30"
        />
      </td>
      <td className="px-4 py-2">
        <input
          value={form.name_de}
          onChange={(e) => onChange({ ...form, name_de: e.target.value })}
          placeholder="Name (DE)"
          className="w-full rounded border border-[#0e393d]/20 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30"
        />
      </td>
      <td className="px-4 py-2">
        <input
          value={form.slug}
          onChange={(e) => onChange({ ...form, slug: e.target.value })}
          placeholder="slug"
          className="w-full rounded border border-[#0e393d]/20 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0e393d]/30"
        />
      </td>
      <td className="px-4 py-2 text-center">
        <input
          type="checkbox"
          checked={form.is_common}
          onChange={(e) => onChange({ ...form, is_common: e.target.checked })}
          className="rounded"
        />
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
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

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('preparation_notes')
      .select('*')
      .order('slug');
    if (data) setNotes(data as PrepNote[]);
  }, [supabase]);

  const startEdit = (note: PrepNote) => {
    setEditingId(note.id);
    setEditForm({ name_en: note.name.en ?? '', name_de: note.name.de ?? '', slug: note.slug, is_common: note.is_common });
    setAdding(false);
    setError('');
  };

  const cancelEdit = () => { setEditingId(null); setError(''); };

  const saveEdit = async () => {
    if (!editingId || !editForm.name_en.trim()) { setError('Name (EN) is required.'); return; }
    setSaving(true);
    const { error: err } = await supabase
      .from('preparation_notes')
      .update({ name: { de: editForm.name_de, en: editForm.name_en }, slug: editForm.slug, is_common: editForm.is_common })
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
      .insert({ name: { de: addForm.name_de, en: addForm.name_en }, slug, is_common: addForm.is_common });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setAdding(false);
    setAddForm(EMPTY_FORM);
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

  const filtered = search
    ? notes.filter((n) => {
        const q = search.toLowerCase();
        return (n.name.en ?? '').toLowerCase().includes(q) || (n.name.de ?? '').toLowerCase().includes(q) || n.slug.includes(q);
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
        <button
          onClick={() => { setAdding(true); setAddForm(EMPTY_FORM); setEditingId(null); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Note
        </button>
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
                onCancel={() => { setAdding(false); setError(''); }}
                saving={saving}
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
                  <td className="px-4 py-3 font-medium text-[#0e393d]">{note.name.en ?? '—'}</td>
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
    </div>
  );
}
