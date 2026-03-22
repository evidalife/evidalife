'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type I18n = { en?: string; de?: string; fr?: string; es?: string; it?: string } | null;

export type Ingredient = {
  id: string;
  name: I18n;
  slug: string | null;
  default_unit_id: string | null;
  daily_dozen_category_id: string | null;
  is_common: boolean | null;
  created_at: string;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  carbs_per_100g: number | null;
  fiber_per_100g: number | null;
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
  name_en: string;
  name_de: string;
  name_fr: string;
  name_es: string;
  name_it: string;
  slug: string;
  default_unit_id: string;
  daily_dozen_category_id: string;
  is_common: boolean;
  kcal_per_100g: string;
  protein_per_100g: string;
  fat_per_100g: string;
  carbs_per_100g: string;
  fiber_per_100g: string;
};

const EMPTY_FORM: FormState = {
  name_en: '',
  name_de: '',
  name_fr: '',
  name_es: '',
  name_it: '',
  slug: '',
  default_unit_id: '',
  daily_dozen_category_id: '',
  is_common: false,
  kcal_per_100g: '',
  protein_per_100g: '',
  fat_per_100g: '',
  carbs_per_100g: '',
  fiber_per_100g: '',
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

  // AI autocomplete (per-ingredient in panel)
  const [autocompleteStatus, setAutocompleteStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  // Bulk nutrition fill
  const [bulkNutritionStatus, setBulkNutritionStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [bulkNutritionProgress, setBulkNutritionProgress] = useState({ done: 0, total: 0 });

  // Bulk translate FR/ES/IT
  const [bulkTranslateStatus, setBulkTranslateStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [bulkTranslateProgress, setBulkTranslateProgress] = useState({ done: 0, total: 0 });

  // Auto-generate slug from EN name (only when creating and slug not manually edited)
  useEffect(() => {
    if (!editingId && !slugManuallyEdited && form.name_en) {
      setForm((prev) => ({ ...prev, slug: slugify(form.name_en) }));
    }
  }, [form.name_en, editingId, slugManuallyEdited]);

  // suppress exhaustive-deps warning for slugRef
  slugRef.current = slugManuallyEdited;

  // ── Data refresh ─────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('ingredients')
      .select('id, name, slug, default_unit_id, daily_dozen_category_id, is_common, created_at, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g')
      .order('created_at', { ascending: false });
    if (data) setIngredients(data);
  }, [supabase]);

  // ── Panel helpers ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugManuallyEdited(false);
    setError(null);
    setAutocompleteStatus('idle');
    setPanelOpen(true);
  };

  const openEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setForm({
      name_en: ing.name?.en ?? '',
      name_de: ing.name?.de ?? '',
      name_fr: ing.name?.fr ?? '',
      name_es: ing.name?.es ?? '',
      name_it: ing.name?.it ?? '',
      slug: ing.slug ?? '',
      default_unit_id: ing.default_unit_id ?? '',
      daily_dozen_category_id: ing.daily_dozen_category_id ?? '',
      is_common: ing.is_common ?? false,
      kcal_per_100g: ing.kcal_per_100g != null ? String(ing.kcal_per_100g) : '',
      protein_per_100g: ing.protein_per_100g != null ? String(ing.protein_per_100g) : '',
      fat_per_100g: ing.fat_per_100g != null ? String(ing.fat_per_100g) : '',
      carbs_per_100g: ing.carbs_per_100g != null ? String(ing.carbs_per_100g) : '',
      fiber_per_100g: ing.fiber_per_100g != null ? String(ing.fiber_per_100g) : '',
    });
    setSlugManuallyEdited(true); // treat as manually edited when editing existing
    setError(null);
    setAutocompleteStatus('idle');
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
    if (!form.name_en.trim()) {
      setError('Name (EN) is required.');
      return;
    }
    if (!form.name_de.trim()) {
      setError('Name (DE) is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const nameObj: Record<string, string> = { en: form.name_en.trim(), de: form.name_de.trim() };
    if (form.name_fr.trim()) nameObj.fr = form.name_fr.trim();
    if (form.name_es.trim()) nameObj.es = form.name_es.trim();
    if (form.name_it.trim()) nameObj.it = form.name_it.trim();

    const payload = {
      name: nameObj,
      slug: form.slug.trim() || slugify(form.name_en),
      default_unit_id: form.default_unit_id || null,
      daily_dozen_category_id: form.daily_dozen_category_id || null,
      is_common: form.is_common,
      kcal_per_100g: form.kcal_per_100g !== '' ? Number(form.kcal_per_100g) : null,
      protein_per_100g: form.protein_per_100g !== '' ? Number(form.protein_per_100g) : null,
      fat_per_100g: form.fat_per_100g !== '' ? Number(form.fat_per_100g) : null,
      carbs_per_100g: form.carbs_per_100g !== '' ? Number(form.carbs_per_100g) : null,
      fiber_per_100g: form.fiber_per_100g !== '' ? Number(form.fiber_per_100g) : null,
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
    const name = form.name_en || form.name_de || 'this ingredient';
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('ingredients').delete().eq('id', editingId);
    if (error) { setError(error.message); return; }
    await refresh();
    closePanel();
  };

  // ── AI Autocomplete (panel) ───────────────────────────────────────────────────

  const handleAutocomplete = async () => {
    if (!form.name_en.trim() && !form.name_de.trim()) return;
    setAutocompleteStatus('running');
    try {
      const res = await fetch('/api/admin/autocomplete-ingredient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: form.name_en, name_de: form.name_de }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setForm((prev) => ({
        ...prev,
        name_en: prev.name_en || data.name_en || '',
        name_de: prev.name_de || data.name_de || '',
        name_fr: prev.name_fr || data.name_fr || '',
        name_es: prev.name_es || data.name_es || '',
        name_it: prev.name_it || data.name_it || '',
        kcal_per_100g: prev.kcal_per_100g || (data.kcal_per_100g != null ? String(data.kcal_per_100g) : ''),
        protein_per_100g: prev.protein_per_100g || (data.protein_per_100g != null ? String(data.protein_per_100g) : ''),
        fat_per_100g: prev.fat_per_100g || (data.fat_per_100g != null ? String(data.fat_per_100g) : ''),
        carbs_per_100g: prev.carbs_per_100g || (data.carbs_per_100g != null ? String(data.carbs_per_100g) : ''),
        fiber_per_100g: prev.fiber_per_100g || (data.fiber_per_100g != null ? String(data.fiber_per_100g) : ''),
        // Only set category/unit if not already set
        daily_dozen_category_id: prev.daily_dozen_category_id || (() => {
          if (!data.suggested_daily_dozen_slug) return '';
          return categories.find((c) => c.slug === data.suggested_daily_dozen_slug)?.id ?? '';
        })(),
        default_unit_id: prev.default_unit_id || (() => {
          if (!data.suggested_unit_code) return '';
          return units.find((u) => u.code === data.suggested_unit_code)?.id ?? '';
        })(),
      }));
      setAutocompleteStatus('done');
    } catch (e) {
      console.error('Autocomplete error:', e);
      setAutocompleteStatus('error');
    }
  };

  // ── Bulk nutrition fill ───────────────────────────────────────────────────────

  const handleBulkNutrition = async () => {
    const missing = ingredients.filter(
      (i) => i.kcal_per_100g == null && i.protein_per_100g == null && i.fat_per_100g == null && i.carbs_per_100g == null && i.fiber_per_100g == null
    );
    if (missing.length === 0) {
      setBulkNutritionStatus('done');
      return;
    }
    setBulkNutritionStatus('running');
    setBulkNutritionProgress({ done: 0, total: missing.length });

    const BATCH = 20;
    let done = 0;
    try {
      for (let i = 0; i < missing.length; i += BATCH) {
        const batch = missing.slice(i, i + BATCH);
        const res = await fetch('/api/admin/bulk-nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: batch.map((ing) => ({
              id: ing.id,
              name_en: ing.name?.en ?? '',
              name_de: ing.name?.de ?? '',
            })),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { results } = await res.json();
        for (const r of results) {
          await supabase.from('ingredients').update({
            kcal_per_100g: r.kcal_per_100g,
            protein_per_100g: r.protein_per_100g,
            fat_per_100g: r.fat_per_100g,
            carbs_per_100g: r.carbs_per_100g,
            fiber_per_100g: r.fiber_per_100g,
          }).eq('id', r.id);
        }
        done += batch.length;
        setBulkNutritionProgress({ done, total: missing.length });
      }
      await refresh();
      setBulkNutritionStatus('done');
    } catch (e) {
      console.error('Bulk nutrition error:', e);
      setBulkNutritionStatus('error');
    }
  };

  // ── Bulk translate FR/ES/IT ───────────────────────────────────────────────────

  const handleBulkTranslate = async () => {
    const missing = ingredients.filter(
      (i) => !i.name?.fr || !i.name?.es || !i.name?.it
    );
    if (missing.length === 0) {
      setBulkTranslateStatus('done');
      return;
    }
    setBulkTranslateStatus('running');
    setBulkTranslateProgress({ done: 0, total: missing.length });

    const BATCH = 30;
    let done = 0;
    try {
      for (let i = 0; i < missing.length; i += BATCH) {
        const batch = missing.slice(i, i + BATCH);
        const res = await fetch('/api/admin/bulk-translate-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: batch.map((ing) => ({
              id: ing.id,
              name_en: ing.name?.en ?? '',
              name_de: ing.name?.de ?? '',
            })),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { results } = await res.json();
        for (const r of results) {
          const ing = ingredients.find((x) => x.id === r.id);
          if (!ing) continue;
          const updatedName = {
            ...(ing.name ?? {}),
            ...(r.name_fr ? { fr: r.name_fr } : {}),
            ...(r.name_es ? { es: r.name_es } : {}),
            ...(r.name_it ? { it: r.name_it } : {}),
          };
          await supabase.from('ingredients').update({ name: updatedName }).eq('id', r.id);
        }
        done += batch.length;
        setBulkTranslateProgress({ done, total: missing.length });
      }
      await refresh();
      setBulkTranslateStatus('done');
    } catch (e) {
      console.error('Bulk translate error:', e);
      setBulkTranslateStatus('error');
    }
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
      ing.name?.en?.toLowerCase().includes(q) ||
      ing.name?.de?.toLowerCase().includes(q) ||
      ing.name?.fr?.toLowerCase().includes(q) ||
      ing.name?.es?.toLowerCase().includes(q) ||
      ing.name?.it?.toLowerCase().includes(q) ||
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
        <div className="flex items-center gap-2">
          {/* Bulk translate button */}
          <button
            onClick={() => { if (bulkTranslateStatus !== 'running') handleBulkTranslate(); }}
            disabled={bulkTranslateStatus === 'running'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0e393d]/20 text-[#0e393d] text-xs font-medium hover:bg-[#0e393d]/5 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Translate missing FR/ES/IT names for all ingredients"
          >
            {bulkTranslateStatus === 'running' ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                {bulkTranslateProgress.done}/{bulkTranslateProgress.total} translating…
              </>
            ) : bulkTranslateStatus === 'done' ? (
              <>✓ Names translated</>
            ) : bulkTranslateStatus === 'error' ? (
              <>⚠ Retry translate</>
            ) : (
              <>✦ Translate missing names</>
            )}
          </button>

          {/* Bulk nutrition button */}
          <button
            onClick={() => { if (bulkNutritionStatus !== 'running') handleBulkNutrition(); }}
            disabled={bulkNutritionStatus === 'running'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0e393d]/20 text-[#0e393d] text-xs font-medium hover:bg-[#0e393d]/5 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Fill nutrition values for ingredients missing all nutrition data"
          >
            {bulkNutritionStatus === 'running' ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                {bulkNutritionProgress.done}/{bulkNutritionProgress.total} nutrition…
              </>
            ) : bulkNutritionStatus === 'done' ? (
              <>✓ Nutrition filled</>
            ) : bulkNutritionStatus === 'error' ? (
              <>⚠ Retry nutrition</>
            ) : (
              <>✦ Fill missing nutrition</>
            )}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
          >
            <span className="text-lg leading-none">+</span> New Ingredient
          </button>
        </div>
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
            <span>{cat.name?.en ?? cat.name?.de ?? cat.slug}</span>
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
              <th className="px-4 py-3 text-center text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Nutrition</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Common</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
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
                      {ing.name?.en || ing.name?.de || <span className="text-[#1c2a2b]/30">—</span>}
                      {ing.name?.de && (
                        <span className="text-[#1c2a2b]/40"> / {ing.name.de}</span>
                      )}
                    </div>
                    {(ing.name?.fr || ing.name?.es || ing.name?.it) && (
                      <div className="text-[10px] text-[#1c2a2b]/30 mt-0.5">
                        {[ing.name?.fr, ing.name?.es, ing.name?.it].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>

                  {/* Default Unit */}
                  <td className="px-4 py-3 text-[#1c2a2b]/70">
                    {unit ? (
                      <span className="font-mono text-xs">{unit.abbreviation?.en ?? unit.abbreviation?.de ?? unit.code}</span>
                    ) : (
                      <span className="text-[#1c2a2b]/30">—</span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    {cat ? (
                      <Badge color="teal">
                        {cat.icon && <span className="mr-1">{cat.icon}</span>}
                        {cat.name?.en ?? cat.name?.de ?? cat.slug}
                      </Badge>
                    ) : (
                      <span className="text-[#1c2a2b]/30">—</span>
                    )}
                  </td>

                  {/* Nutrition */}
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const fields = [ing.kcal_per_100g, ing.protein_per_100g, ing.fat_per_100g, ing.carbs_per_100g, ing.fiber_per_100g];
                      const filled = fields.filter((v) => v != null).length;
                      if (filled === 5) return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="All nutrition data filled" />;
                      if (filled > 0) return <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title={`${filled}/5 fields filled`} />;
                      return <span className="text-[#1c2a2b]/20">—</span>;
                    })()}
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
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Names</p>
                  <button
                    type="button"
                    onClick={() => { if (autocompleteStatus !== 'running') handleAutocomplete(); }}
                    disabled={autocompleteStatus === 'running' || (!form.name_en.trim() && !form.name_de.trim())}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-medium hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Fill all fields with AI based on the ingredient name"
                  >
                    {autocompleteStatus === 'running' ? (
                      <>
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                        Autocompleting…
                      </>
                    ) : autocompleteStatus === 'done' ? (
                      <>✓ Fields filled</>
                    ) : autocompleteStatus === 'error' ? (
                      <>⚠ Retry AI</>
                    ) : (
                      <>✦ AI Autocomplete</>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name EN *">
                    <input
                      className={inputCls}
                      value={form.name_en}
                      onChange={(e) => setField('name_en', e.target.value)}
                      placeholder="e.g. Spinach"
                      autoFocus
                    />
                  </Field>
                  <Field label="Name DE *">
                    <input
                      className={inputCls}
                      value={form.name_de}
                      onChange={(e) => setField('name_de', e.target.value)}
                      placeholder="z.B. Spinat"
                    />
                  </Field>
                  <Field label="Name FR">
                    <input
                      className={inputCls}
                      value={form.name_fr}
                      onChange={(e) => setField('name_fr', e.target.value)}
                      placeholder="ex. Épinard"
                    />
                  </Field>
                  <Field label="Name ES">
                    <input
                      className={inputCls}
                      value={form.name_es}
                      onChange={(e) => setField('name_es', e.target.value)}
                      placeholder="ej. Espinaca"
                    />
                  </Field>
                  <Field label="Name IT">
                    <input
                      className={inputCls}
                      value={form.name_it}
                      onChange={(e) => setField('name_it', e.target.value)}
                      placeholder="es. Spinacio"
                    />
                  </Field>
                </div>

                <Field label="Slug" hint="Auto-generated from EN name. Edit to override.">
                  <input
                    className={inputCls}
                    value={form.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setField('slug', e.target.value);
                    }}
                    placeholder="spinach"
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
                        {u.abbreviation?.en ?? u.abbreviation?.de ?? u.code} — {u.name?.en ?? u.name?.de ?? u.code}
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
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name?.en ?? cat.name?.de ?? cat.slug}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Nutrition */}
              <div className="space-y-3 border-t border-[#0e393d]/8 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">Nutrition (per 100g)</p>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    ['kcal_per_100g',    'Calories', 'kcal'],
                    ['protein_per_100g', 'Protein',  'g'],
                    ['fat_per_100g',     'Fat',      'g'],
                    ['carbs_per_100g',   'Carbs',    'g'],
                    ['fiber_per_100g',   'Fiber',    'g'],
                  ] as [keyof FormState, string, string][]).map(([key, label, unit]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={form[key] as string}
                          onChange={(e) => setField(key, e.target.value as FormState[typeof key])}
                          placeholder="—"
                          className="w-full rounded-lg border border-[#0e393d]/15 bg-white pl-2 pr-6 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#1c2a2b]/40 pointer-events-none">{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
