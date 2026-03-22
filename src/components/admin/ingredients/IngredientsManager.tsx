'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ReviewModal, { type ReviewSuggestion } from './ReviewModal';

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
  grams_per_unit: number | null;
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
  grams_per_unit: string;
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
  grams_per_unit: '',
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

  // AI calc grams per unit
  const [calcGramsStatus, setCalcGramsStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  // AI Review & Complete
  const [reviewScanStatus, setReviewScanStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle');
  const [reviewScanProgress, setReviewScanProgress] = useState({ done: 0, total: 0 });
  const [reviewSuggestions, setReviewSuggestions] = useState<ReviewSuggestion[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Duplicate detection + search suggestions (create mode only)
  const [nameSearchResults, setNameSearchResults] = useState<Ingredient[]>([]);
  const nameSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      .select('id, name, slug, default_unit_id, daily_dozen_category_id, is_common, created_at, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, grams_per_unit')
      .order('created_at', { ascending: false });
    if (data) setIngredients(data);
  }, [supabase]);

  // ── Panel helpers ─────────────────────────────────────────────────────────────

  const findNameMatches = (nameEn: string, nameDe: string): Ingredient[] => {
    const q1 = nameEn.trim().toLowerCase();
    const q2 = nameDe.trim().toLowerCase();
    if (!q1 && !q2) return [];
    return ingredients.filter(ing => {
      const en = (ing.name?.en ?? '').toLowerCase();
      const de = (ing.name?.de ?? '').toLowerCase();
      if (q1 && en && (en.includes(q1) || q1.includes(en))) return true;
      if (q2 && de && (de.includes(q2) || q2.includes(de))) return true;
      return false;
    }).slice(0, 5);
  };

  const triggerNameSearch = (nameEn: string, nameDe: string) => {
    if (nameSearchTimerRef.current) clearTimeout(nameSearchTimerRef.current);
    nameSearchTimerRef.current = setTimeout(() => {
      setNameSearchResults(findNameMatches(nameEn, nameDe));
    }, 300);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSlugManuallyEdited(false);
    setError(null);
    setAutocompleteStatus('idle');
    setCalcGramsStatus('idle');
    setNameSearchResults([]);
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
      grams_per_unit: ing.grams_per_unit != null ? String(ing.grams_per_unit) : '',
    });
    setSlugManuallyEdited(true); // treat as manually edited when editing existing
    setError(null);
    setAutocompleteStatus('idle');
    setCalcGramsStatus('idle');
    setNameSearchResults([]);
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
    setSaving(true);
    setError(null);

    const nameObj: Record<string, string> = { en: form.name_en.trim() };
    if (form.name_de.trim()) nameObj.de = form.name_de.trim();
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
      grams_per_unit: form.grams_per_unit !== '' ? Number(form.grams_per_unit) : null,
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
    const hasAny = form.name_en.trim() || form.name_de.trim() || form.name_fr.trim() || form.name_es.trim() || form.name_it.trim();
    if (!hasAny) return;
    setAutocompleteStatus('running');
    try {
      const res = await fetch('/api/admin/autocomplete-ingredient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_en: form.name_en,
          name_de: form.name_de,
          name_fr: form.name_fr,
          name_es: form.name_es,
          name_it: form.name_it,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Normalize for slug/code matching: lowercase, hyphens/underscores → ''
      const norm = (s: string) => s.toLowerCase().replace(/[-_\s]/g, '');

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
        // Category: exact slug → normalized slug → name match
        daily_dozen_category_id: prev.daily_dozen_category_id || (() => {
          const slug = data.suggested_daily_dozen_slug;
          if (!slug) return '';
          const normSlug = norm(slug);
          return (
            categories.find(c => c.slug === slug)?.id ??
            categories.find(c => norm(c.slug) === normSlug)?.id ??
            categories.find(c => norm(c.slug).includes(normSlug) || normSlug.includes(norm(c.slug)))?.id ??
            categories.find(c => {
              const en = norm(c.name?.en ?? '');
              return en && (en.includes(normSlug) || normSlug.includes(en));
            })?.id ??
            ''
          );
        })(),
        // Unit: case-insensitive code match
        default_unit_id: prev.default_unit_id || (() => {
          const code = data.suggested_unit_code;
          if (!code) return '';
          return units.find(u => u.code.toLowerCase() === code.toLowerCase())?.id ?? '';
        })(),
        // Grams per unit (only when unit is not gram-based)
        grams_per_unit: prev.grams_per_unit || (() => {
          const code = data.suggested_unit_code?.toLowerCase() ?? '';
          if (['g', 'kg', 'mg', 'ml', 'l'].includes(code)) return '';
          return data.grams_per_unit != null ? String(data.grams_per_unit) : '';
        })(),
        // is_common suggestion
        is_common: prev.is_common || data.is_common || false,
      }));
      setAutocompleteStatus('done');
    } catch (e) {
      console.error('Autocomplete error:', e);
      setAutocompleteStatus('error');
    }
  };

  // ── AI Calc Grams Per Unit ────────────────────────────────────────────────────

  const handleCalcGrams = async () => {
    const nameEn = form.name_en.trim() || form.name_de.trim();
    const selectedUnit = units.find(u => u.id === form.default_unit_id);
    if (!nameEn || !selectedUnit) return;
    setCalcGramsStatus('running');
    try {
      const res = await fetch('/api/admin/calc-grams-per-unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: nameEn, unit_code: selectedUnit.code }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setField('grams_per_unit', data.grams_per_unit != null ? String(data.grams_per_unit) : '');
      setCalcGramsStatus('done');
    } catch (e) {
      console.error('Calc grams error:', e);
      setCalcGramsStatus('error');
    }
  };

  // ── AI Review & Complete ──────────────────────────────────────────────────────

  const GRAM_CODES = ['g', 'kg', 'mg', 'ml', 'l'];

  const handleReviewScan = async () => {
    setReviewScanStatus('scanning');

    const ingData = ingredients.map((ing) => {
      const unit = units.find((u) => u.id === ing.default_unit_id);
      return {
        id: ing.id,
        name_en: ing.name?.en ?? '',
        name_de: ing.name?.de ?? '',
        name_fr: ing.name?.fr ?? '',
        name_es: ing.name?.es ?? '',
        name_it: ing.name?.it ?? '',
        kcal_per_100g: ing.kcal_per_100g,
        protein_per_100g: ing.protein_per_100g,
        fat_per_100g: ing.fat_per_100g,
        carbs_per_100g: ing.carbs_per_100g,
        fiber_per_100g: ing.fiber_per_100g,
        unit_code: unit?.code ?? null,
        grams_per_unit: ing.grams_per_unit,
      };
    });

    // Pre-filter client-side: only send ingredients that are missing something
    const toReview = ingData.filter((ing) => {
      const isGramBased = GRAM_CODES.includes((ing.unit_code ?? '').toLowerCase());
      return (
        !ing.name_fr || !ing.name_es || !ing.name_it || !ing.name_de ||
        ing.kcal_per_100g == null ||
        (!isGramBased && ing.grams_per_unit == null && ing.unit_code)
      );
    });

    setReviewScanProgress({ done: 0, total: toReview.length });

    const BATCH = 15;
    const allSuggestions: ReviewSuggestion[] = [];

    try {
      for (let i = 0; i < toReview.length; i += BATCH) {
        const batch = toReview.slice(i, i + BATCH);
        const res = await fetch('/api/admin/review-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: batch }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { suggestions } = await res.json();
        allSuggestions.push(...suggestions);
        setReviewScanProgress({ done: Math.min(i + BATCH, toReview.length), total: toReview.length });
      }
      setReviewSuggestions(allSuggestions);
      setReviewScanStatus('ready');
      setReviewModalOpen(true);
    } catch (e) {
      console.error('Review scan error:', e);
      setReviewScanStatus('error');
    }
  };

  const handleReviewApply = async (
    accepted: ReviewSuggestion[],
    onProgress: (done: number, total: number) => void
  ) => {
    for (let i = 0; i < accepted.length; i++) {
      const s = accepted[i];
      const ing = ingredients.find((x) => x.id === s.id);
      if (!ing) continue;

      const { name_de, name_fr, name_es, name_it, ...numericChanges } = s.changes;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const update: Record<string, any> = {};

      if (name_de !== undefined || name_fr !== undefined || name_es !== undefined || name_it !== undefined) {
        update.name = {
          ...(ing.name ?? {}),
          ...(name_de !== undefined ? { de: name_de } : {}),
          ...(name_fr !== undefined ? { fr: name_fr } : {}),
          ...(name_es !== undefined ? { es: name_es } : {}),
          ...(name_it !== undefined ? { it: name_it } : {}),
        };
      }

      if (numericChanges.kcal_per_100g !== undefined) update.kcal_per_100g = numericChanges.kcal_per_100g;
      if (numericChanges.protein_per_100g !== undefined) update.protein_per_100g = numericChanges.protein_per_100g;
      if (numericChanges.fat_per_100g !== undefined) update.fat_per_100g = numericChanges.fat_per_100g;
      if (numericChanges.carbs_per_100g !== undefined) update.carbs_per_100g = numericChanges.carbs_per_100g;
      if (numericChanges.fiber_per_100g !== undefined) update.fiber_per_100g = numericChanges.fiber_per_100g;
      if (numericChanges.grams_per_unit !== undefined) update.grams_per_unit = numericChanges.grams_per_unit;

      if (Object.keys(update).length > 0) {
        await supabase.from('ingredients').update(update).eq('id', s.id);
      }

      onProgress(i + 1, accepted.length);
    }

    await refresh();
    setReviewModalOpen(false);
    setReviewScanStatus('idle');
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
          {/* AI Review & Complete */}
          <button
            onClick={() => { if (reviewScanStatus !== 'scanning') handleReviewScan(); }}
            disabled={reviewScanStatus === 'scanning'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0e393d]/20 text-[#0e393d] text-xs font-medium hover:bg-[#0e393d]/5 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Scan all ingredients for missing data and review AI suggestions"
          >
            {reviewScanStatus === 'scanning' ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                Scanning {reviewScanProgress.done}/{reviewScanProgress.total}…
              </>
            ) : reviewScanStatus === 'error' ? (
              <>⚠ Retry Review</>
            ) : (
              <>✦ AI Review &amp; Complete</>
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
                    disabled={autocompleteStatus === 'running' || (!form.name_en.trim() && !form.name_de.trim() && !form.name_fr.trim() && !form.name_es.trim() && !form.name_it.trim())}
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
                      onChange={(e) => {
                        setField('name_en', e.target.value);
                        if (!editingId) triggerNameSearch(e.target.value, form.name_de);
                      }}
                      placeholder="e.g. Spinach"
                      autoFocus
                    />
                  </Field>
                  <Field label="Name DE *">
                    <input
                      className={inputCls}
                      value={form.name_de}
                      onChange={(e) => {
                        setField('name_de', e.target.value);
                        if (!editingId) triggerNameSearch(form.name_en, e.target.value);
                      }}
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

                {/* 9B+9D: Duplicate detection + name suggestions (create mode only) */}
                {!editingId && nameSearchResults.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-xs font-medium text-amber-800 mb-1.5">
                      ⚠ Similar ingredients found — did you mean to edit one instead?
                    </p>
                    <div className="space-y-0.5">
                      {nameSearchResults.map((ing) => {
                        const label = [ing.name?.en, ing.name?.de].filter(Boolean).join(' / ');
                        return (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => openEdit(ing)}
                            className="block w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-amber-900 hover:bg-amber-100 transition"
                          >
                            {label || ing.slug || ing.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                    onChange={(e) => {
                      setField('default_unit_id', e.target.value);
                      setCalcGramsStatus('idle');
                    }}
                  >
                    <option value="">— No default unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.abbreviation?.en ?? u.abbreviation?.de ?? u.code} — {u.name?.en ?? u.name?.de ?? u.code}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Grams per unit — only shown for non-gram-based units */}
                {(() => {
                  const selectedUnit = units.find(u => u.id === form.default_unit_id);
                  if (!selectedUnit) return null; // no unit selected — nothing to convert
                  const isGramBased = ['g', 'kg', 'mg', 'ml', 'l'].includes(selectedUnit.code?.toLowerCase() ?? '');
                  if (isGramBased) return null;
                  return (
                    <div>
                      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">Grams per unit</label>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={form.grams_per_unit}
                            onChange={(e) => setField('grams_per_unit', e.target.value)}
                            placeholder="e.g. 14"
                            className="w-full rounded-lg border border-[#0e393d]/15 bg-white pl-3 pr-7 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#1c2a2b]/40 pointer-events-none">g</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { if (calcGramsStatus !== 'running') handleCalcGrams(); }}
                          disabled={calcGramsStatus === 'running' || !form.default_unit_id || (!form.name_en.trim() && !form.name_de.trim())}
                          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-medium hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
                          title="Calculate average grams per unit using AI"
                        >
                          {calcGramsStatus === 'running' ? (
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                          ) : calcGramsStatus === 'done' ? '✓' : calcGramsStatus === 'error' ? '⚠' : '✦'}
                          {calcGramsStatus === 'running' ? '' : calcGramsStatus === 'done' ? ' Done' : calcGramsStatus === 'error' ? ' Retry' : ' AI calc'}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-[#1c2a2b]/40">Avg weight of 1 {selectedUnit.name?.en ?? selectedUnit.code} in grams</p>
                    </div>
                  );
                })()}

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

      {/* AI Review Modal */}
      {reviewModalOpen && (
        <ReviewModal
          suggestions={reviewSuggestions}
          totalScanned={ingredients.length}
          ingredients={ingredients}
          units={units}
          onApply={handleReviewApply}
          onClose={() => { setReviewModalOpen(false); setReviewScanStatus('idle'); }}
        />
      )}

    </div>
  );
}
