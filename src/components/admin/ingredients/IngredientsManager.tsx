'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type I18n = { de?: string; en?: string } | null;

export type Ingredient = {
  id: string;
  name: I18n;
  slug: string | null;
  default_unit_id: string | null;
  daily_dozen_category_id: string | null;
  is_common: boolean | null;
  created_at: string;
};

export type MeasurementUnit = {
  id: string;
  code: string;
  name: I18n;
  abbreviation: I18n;
  category: string | null;
  sort_order: number | null;
};

export type DailyDozenCategory = {
  id: string;
  slug: string;
  name: I18n;
  icon: string | null;
  sort_order: number | null;
};

type FormState = {
  name_de: string;
  name_en: string;
  slug: string;
  default_unit_id: string;
  daily_dozen_category_id: string;
  is_common: boolean;
};

const EMPTY_FORM: FormState = {
  name_de: '',
  name_en: '',
  slug: '',
  default_unit_id: '',
  daily_dozen_category_id: '',
  is_common: false,
};

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ingredient';
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Badge({ color, children }: { color: 'green' | 'gray' | 'gold' | 'teal'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray:  'bg-gray-50 text-gray-600 ring-gray-500/20',
    gold:  'bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30',
    teal:  'bg-[#0e393d]/8 text-[#0e393d] ring-[#0e393d]/15',
  }[color];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {children}
    </span>
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
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';
const selectCls = inputCls + ' cursor-pointer';

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialIngredients: Ingredient[];
  initialUnits: MeasurementUnit[];
  initialCategories: DailyDozenCategory[];
}

export default function IngredientsManager({ initialIngredients, initialUnits, initialCategories }: Props) {
  const supabase = createClient();
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [units] = useState<MeasurementUnit[]>(initialUnits);
  const [categories] = useState<DailyDozenCategory[]>(initialCategories);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slugRef = useRef(false);

  // Auto-generate slug from DE name (only when creating and slug not manually edited)
  useEffect(() => {
    if (!editingId && !slugManuallyEdited && form.name_de) {
      setForm((prev) => ({ ...prev, slug: slugify(form.name_de) }));
    }
  }, [form.name_de, editingId, slugManuallyEdited]);

  // suppress exhaustive-deps warning for slugRef
  slugRef.current = slugManuallyEdited;

  // ── Data refresh ─────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('ingredients')
      .select('id, name, slug, default_unit_id, daily_dozen_category_id, is_common, created_at')
      .order('created_at', { ascending: false });
    if (data) setIngredients(data);
  }, [supabase]);

  // ── Panel helpers ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugManuallyEdited(false);
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setForm({
      name_de: ing.name?.de ?? '',
      name_en: ing.name?.en ?? '',
      slug: ing.slug ?? '',
      default_unit_id: ing.default_unit_id ?? '',
      daily_dozen_category_id: ing.daily_dozen_category_id ?? '',
      is_common: ing.is_common ?? false,
    });
    setSlugManuallyEdited(true); // treat as manually edited when editing existing
    setError(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setError(null);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name_de.trim()) {
      setError('Name (DE) is required.');
      return;
    }
    if (!form.name_en.trim()) {
      setError('Name (EN) is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: { de: form.name_de.trim(), en: form.name_en.trim() },
      slug: form.slug.trim() || slugify(form.name_de),
      default_unit_id: form.default_unit_id || null,
      daily_dozen_category_id: form.daily_dozen_category_id || null,
      is_common: form.is_common,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('ingredients').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ingredients').insert(payload);
        if (error) throw error;
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

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!editingId) return;
    const name = form.name_de || form.name_en || 'this ingredient';
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('ingredients').delete().eq('id', editingId);
    if (error) { setError(error.message); return; }
    await refresh();
    closePanel();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const getUnit = (unitId: string | null) => units.find((u) => u.id === unitId);
  const getCategory = (catId: string | null) => categories.find((c) => c.id === catId);

  // ── Filtered list ─────────────────────────────────────────────────────────────

  const filtered = ingredients.filter((ing) => {
    // Category filter
    if (categoryFilter === 'uncategorized') {
      if (ing.daily_dozen_category_id !== null) return false;
    } else if (categoryFilter !== 'all') {
      if (ing.daily_dozen_category_id !== categoryFilter) return false;
    }

    // Search filter
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ing.name?.de?.toLowerCase().includes(q) ||
      ing.name?.en?.toLowerCase().includes(q) ||
      ing.slug?.toLowerCase().includes(q)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Ingredients</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {ingredients.length} total · {ingredients.filter(i => i.is_common).length} common
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Ingredient
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            categoryFilter === 'all'
              ? 'bg-[#0e393d] text-white'
              : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition ${
              categoryFilter === cat.id
                ? 'bg-[#0e393d] text-white'
                : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
            }`}
          >
            {cat.icon && <span>{cat.icon}</span>}
            <span>{cat.name?.de ?? cat.slug}</span>
          </button>
        ))}
        <button
          onClick={() => setCategoryFilter('uncategorized')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            categoryFilter === 'uncategorized'
              ? 'bg-[#0e393d] text-white'
              : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
          }`}
        >
          Uncategorized
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Default Unit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Daily Dozen Category</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Common</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No ingredients found.
                </td>
              </tr>
            )}
            {filtered.map((ing) => {
              const unit = getUnit(ing.default_unit_id);
              const cat = getCategory(ing.daily_dozen_category_id);
              return (
                <tr key={ing.id} className="hover:bg-[#fafaf8] transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#0e393d]">
                      {ing.name?.de || ing.name?.en || <span className="text-[#1c2a2b]/30">—</span>}
                      {ing.name?.de && ing.name?.en && (
                        <span className="text-[#1c2a2b]/40"> / {ing.name.en}</span>
                      )}
                    </div>
                  </td>

                  {/* Default Unit */}
                  <td className="px-4 py-3 text-[#1c2a2b]/70">
                    {unit ? (
                      <span className="font-mono text-xs">{unit.abbreviation?.de ?? unit.code}</span>
                    ) : (
                      <span className="text-[#1c2a2b]/30">—</span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    {cat ? (
                      <Badge color="teal">
                        {cat.icon && <span className="mr-1">{cat.icon}</span>}
                        {cat.name?.de ?? cat.slug}
                      </Badge>
                    ) : (
                      <span className="text-[#1c2a2b]/30">—</span>
                    )}
                  </td>

                  {/* Common */}
                  <td className="px-4 py-3 text-center">
                    {ing.is_common ? (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="text-[#1c2a2b]/20">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(ing)}
                      className="px-3 py-1 rounded-md text-xs font-medium text-[#0e393d] bg-[#0e393d]/8 hover:bg-[#0e393d]/15 transition"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Slide-over panel ──────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4">
              <h2 className="font-serif text-lg text-[#0e393d]">
                {editingId ? 'Edit Ingredient' : 'New Ingredient'}
              </h2>
              <button onClick={closePanel} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Names */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Names</p>

                <Field label="Name DE *">
                  <input
                    className={inputCls}
                    value={form.name_de}
                    onChange={(e) => setField('name_de', e.target.value)}
                    placeholder="z.B. Spinat"
                  />
                </Field>

                <Field label="Name EN *">
                  <input
                    className={inputCls}
                    value={form.name_en}
                    onChange={(e) => setField('name_en', e.target.value)}
                    placeholder="e.g. Spinach"
                  />
                </Field>

                <Field label="Slug" hint="Auto-generated from DE name. Edit to override.">
                  <input
                    className={inputCls}
                    value={form.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setField('slug', e.target.value);
                    }}
                    placeholder="spinat"
                  />
                </Field>
              </div>

              {/* Classification */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Classification</p>

                <Field label="Default Unit">
                  <select
                    className={selectCls}
                    value={form.default_unit_id}
                    onChange={(e) => setField('default_unit_id', e.target.value)}
                  >
                    <option value="">— No default unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.abbreviation?.de ?? u.code} — {u.name?.de ?? u.code}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Daily Dozen Category">
                  <select
                    className={selectCls}
                    value={form.daily_dozen_category_id}
                    onChange={(e) => setField('daily_dozen_category_id', e.target.value)}
                  >
                    <option value="">— None</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name?.de ?? cat.slug}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Settings */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Settings</p>

                <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1c2a2b]">Is Common</p>
                    <p className="text-xs text-[#1c2a2b]/40">Frequently used ingredient shown prominently</p>
                  </div>
                  <Toggle
                    checked={form.is_common}
                    onChange={(v) => setField('is_common', v)}
                  />
                </div>
              </div>

            </div>

            {/* Panel footer */}
            <div className="border-t border-[#0e393d]/10 px-6 py-4">
              {error && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
              )}
              <div className="flex gap-3">
                {editingId && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    Delete
                  </button>
                )}
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
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Ingredient'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
