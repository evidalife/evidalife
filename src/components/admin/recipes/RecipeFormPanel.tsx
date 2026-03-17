'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAILY_DOZEN_CATEGORIES = [
  { key: 'beans',                  label: 'Beans / Hülsenfrüchte' },
  { key: 'berries',                label: 'Berries / Beeren' },
  { key: 'other_fruits',           label: 'Other Fruits / Andere Früchte' },
  { key: 'cruciferous_vegetables', label: 'Cruciferous / Kreuzblütler' },
  { key: 'greens',                 label: 'Greens / Blattgemüse' },
  { key: 'other_vegetables',       label: 'Other Veg / Andere Gemüse' },
  { key: 'flaxseeds',              label: 'Flaxseeds / Leinsamen' },
  { key: 'nuts_and_seeds',         label: 'Nuts & Seeds / Nüsse & Samen' },
  { key: 'herbs_and_spices',       label: 'Herbs & Spices / Kräuter' },
  { key: 'whole_grains',           label: 'Whole Grains / Vollkorn' },
  { key: 'beverages',              label: 'Beverages / Getränke' },
  { key: 'exercise',               label: 'Exercise / Bewegung' },
];

const GOAL_TAGS = [
  { key: 'weight_loss',          label: 'Weight Loss' },
  { key: 'heart_health',         label: 'Heart Health' },
  { key: 'anti_inflammation',    label: 'Anti-Inflammation' },
  { key: 'longevity',            label: 'Longevity' },
  { key: 'gut_health',           label: 'Gut Health' },
  { key: 'energy',               label: 'Energy' },
  { key: 'immune',               label: 'Immune Support' },
  { key: 'bone_health',          label: 'Bone Health' },
  { key: 'brain_health',         label: 'Brain Health' },
  { key: 'diabetes_prevention',  label: 'Diabetes Prevention' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';

type LangContent = { de: string; en: string };

type IngredientRow = {
  _key: string;
  name: string;
  amount: string;
  unit: string;
  notes: string;
};

type DailyDozenRow = {
  category: string;
  servings: string;
};

type NutritionForm = {
  calories: string;
  protein_g: string;
  fat_g: string;
  carbs_g: string;
  fiber_g: string;
};

type RecipeForm = {
  title: LangContent;
  description: LangContent;
  instructions: LangContent;
  prep_time_min: string;
  cook_time_min: string;
  servings: string;
  difficulty: string;
  nutrition: NutritionForm;
  is_published: boolean;
  is_featured: boolean;
  ingredients: IngredientRow[];
  daily_dozen: DailyDozenRow[];
  goals: string[];
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: RecipeForm = {
  title:        { de: '', en: '' },
  description:  { de: '', en: '' },
  instructions: { de: '', en: '' },
  prep_time_min: '', cook_time_min: '', servings: '',
  difficulty: 'easy',
  nutrition: { calories: '', protein_g: '', fat_g: '', carbs_g: '', fiber_g: '' },
  is_published: false, is_featured: false,
  ingredients: [], daily_dozen: [], goals: [],
};

let _keyCounter = 0;
const newKey = () => `_k${++_keyCounter}`;

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{children}</p>;
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#0e393d]/10 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#1c2a2b]">{label}</p>
        {hint && <p className="text-xs text-[#1c2a2b]/40">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#0e393d]' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="flex items-center justify-center w-7 h-7 rounded-md text-[#1c2a2b]/40 hover:text-[#0e393d] hover:bg-[#0e393d]/8 transition"
    >{children}</button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  recipeId: string | null; // null = new
  onClose: () => void;
  onSaved: () => void;
}

export default function RecipeFormPanel({ recipeId, onClose, onSaved }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [lang, setLang] = useState<Lang>('de');
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!recipeId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load existing recipe ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!recipeId) { setForm(EMPTY_FORM); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      supabase.from('recipes').select('*').eq('id', recipeId).single(),
      supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId).order('sort_order'),
      supabase.from('recipe_daily_dozen_tags').select('*').eq('recipe_id', recipeId),
      supabase.from('recipe_goal_tags').select('*').eq('recipe_id', recipeId),
    ]).then(([{ data: r }, { data: ings }, { data: dds }, { data: goals }]) => {
      if (!r) { setLoading(false); return; }
      setCurrentImageUrl(r.image_url ?? null);
      setForm({
        title:        { de: r.title?.de ?? '',        en: r.title?.en ?? '' },
        description:  { de: r.description?.de ?? '',  en: r.description?.en ?? '' },
        instructions: { de: r.instructions?.de ?? '', en: r.instructions?.en ?? '' },
        prep_time_min: r.prep_time_min != null ? String(r.prep_time_min) : '',
        cook_time_min: r.cook_time_min != null ? String(r.cook_time_min) : '',
        servings:      r.servings     != null ? String(r.servings)      : '',
        difficulty:    r.difficulty   ?? 'easy',
        nutrition: {
          calories:  r.nutrition_info?.calories  != null ? String(r.nutrition_info.calories)  : '',
          protein_g: r.nutrition_info?.protein_g != null ? String(r.nutrition_info.protein_g) : '',
          fat_g:     r.nutrition_info?.fat_g     != null ? String(r.nutrition_info.fat_g)     : '',
          carbs_g:   r.nutrition_info?.carbs_g   != null ? String(r.nutrition_info.carbs_g)   : '',
          fiber_g:   r.nutrition_info?.fiber_g   != null ? String(r.nutrition_info.fiber_g)   : '',
        },
        is_published: r.is_published ?? false,
        is_featured:  r.is_featured  ?? false,
        ingredients: (ings ?? []).map((i) => ({
          _key:   newKey(),
          name:   i.name   ?? '',
          amount: i.amount != null ? String(i.amount) : '',
          unit:   i.unit   ?? '',
          notes:  i.notes  ?? '',
        })),
        daily_dozen: (dds ?? []).map((d) => ({
          category: d.daily_dozen_category,
          servings: d.servings_per_portion != null ? String(d.servings_per_portion) : '1',
        })),
        goals: (goals ?? []).map((g) => g.goal),
      });
      setLoading(false);
    });
  }, [recipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const setLangField = (field: 'title' | 'description' | 'instructions', l: Lang, v: string) =>
    setForm((f) => ({ ...f, [field]: { ...f[field], [l]: v } }));

  const setNutrition = (key: keyof NutritionForm, v: string) =>
    setForm((f) => ({ ...f, nutrition: { ...f.nutrition, [key]: v } }));

  // ── Ingredients ──────────────────────────────────────────────────────────────

  const addIngredient = () =>
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, { _key: newKey(), name: '', amount: '', unit: '', notes: '' }] }));

  const removeIngredient = (key: string) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((i) => i._key !== key) }));

  const updateIngredient = (key: string, field: keyof Omit<IngredientRow, '_key'>, v: string) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((i) => i._key === key ? { ...i, [field]: v } : i) }));

  const moveIngredient = (key: string, dir: -1 | 1) =>
    setForm((f) => {
      const arr = [...f.ingredients];
      const idx = arr.findIndex((i) => i._key === key);
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return f;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...f, ingredients: arr };
    });

  // ── Daily Dozen ──────────────────────────────────────────────────────────────

  const toggleDailyDozen = (cat: string) =>
    setForm((f) => {
      const has = f.daily_dozen.some((d) => d.category === cat);
      return {
        ...f,
        daily_dozen: has
          ? f.daily_dozen.filter((d) => d.category !== cat)
          : [...f.daily_dozen, { category: cat, servings: '1' }],
      };
    });

  const setDdServings = (cat: string, v: string) =>
    setForm((f) => ({ ...f, daily_dozen: f.daily_dozen.map((d) => d.category === cat ? { ...d, servings: v } : d) }));

  // ── Goal tags ────────────────────────────────────────────────────────────────

  const toggleGoal = (goal: string) =>
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(goal) ? f.goals.filter((g) => g !== goal) : [...f.goals, goal],
    }));

  // ── Image ────────────────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (id: string): Promise<string | null> => {
    if (!imageFile) return currentImageUrl;
    const ext = imageFile.name.split('.').pop();
    const path = `${id}/cover.${ext}`;
    const { data, error } = await supabase.storage.from('recipe-images').upload(path, imageFile, { upsert: true });
    if (error || !data) { console.error(error); return currentImageUrl; }
    return supabase.storage.from('recipe-images').getPublicUrl(data.path).data.publicUrl;
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.de.trim() && !form.title.en.trim()) {
      setError('Title (DE or EN) is required.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title:        { de: form.title.de,        en: form.title.en },
        description:  { de: form.description.de,  en: form.description.en },
        instructions: { de: form.instructions.de, en: form.instructions.en },
        prep_time_min: form.prep_time_min ? Number(form.prep_time_min) : null,
        cook_time_min: form.cook_time_min ? Number(form.cook_time_min) : null,
        servings:      form.servings      ? Number(form.servings)      : null,
        difficulty:    form.difficulty || null,
        nutrition_info: {
          calories:  form.nutrition.calories  ? Number(form.nutrition.calories)  : null,
          protein_g: form.nutrition.protein_g ? Number(form.nutrition.protein_g) : null,
          fat_g:     form.nutrition.fat_g     ? Number(form.nutrition.fat_g)     : null,
          carbs_g:   form.nutrition.carbs_g   ? Number(form.nutrition.carbs_g)   : null,
          fiber_g:   form.nutrition.fiber_g   ? Number(form.nutrition.fiber_g)   : null,
        },
        is_published: form.is_published,
        is_featured:  form.is_featured,
      };

      // 1. Upsert recipe row
      let id = recipeId;
      if (id) {
        const { error } = await supabase.from('recipes').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('recipes').insert(payload).select('id').single();
        if (error) throw error;
        id = data.id;
      }

      // 2. Upload image
      const imageUrl = await uploadImage(id!);
      if (imageUrl !== currentImageUrl) {
        await supabase.from('recipes').update({ image_url: imageUrl }).eq('id', id!);
      }

      // 3. Replace ingredients
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id!);
      if (form.ingredients.length > 0) {
        const rows = form.ingredients.map((ing, idx) => ({
          recipe_id:  id!,
          name:       ing.name.trim(),
          amount:     ing.amount ? Number(ing.amount) : null,
          unit:       ing.unit.trim() || null,
          notes:      ing.notes.trim() || null,
          sort_order: idx,
        })).filter((r) => r.name);
        if (rows.length > 0) {
          const { error } = await supabase.from('recipe_ingredients').insert(rows);
          if (error) throw error;
        }
      }

      // 4. Replace Daily Dozen tags
      await supabase.from('recipe_daily_dozen_tags').delete().eq('recipe_id', id!);
      if (form.daily_dozen.length > 0) {
        const rows = form.daily_dozen.map((d) => ({
          recipe_id:            id!,
          daily_dozen_category: d.category,
          servings_per_portion: d.servings ? Number(d.servings) : 1,
        }));
        const { error } = await supabase.from('recipe_daily_dozen_tags').insert(rows);
        if (error) throw error;
      }

      // 5. Replace goal tags
      await supabase.from('recipe_goal_tags').delete().eq('recipe_id', id!);
      if (form.goals.length > 0) {
        const rows = form.goals.map((goal) => ({ recipe_id: id!, goal }));
        const { error } = await supabase.from('recipe_goal_tags').insert(rows);
        if (error) throw error;
      }

      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message
        : (e && typeof e === 'object' && 'message' in e) ? String((e as { message: unknown }).message)
        : 'Save failed.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel — wider than products/orders to fit the multilingual editor */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
          <h2 className="font-serif text-lg text-[#0e393d]">
            {recipeId ? 'Edit Recipe' : 'New Recipe'}
          </h2>
          {/* Lang tabs */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-[#0e393d]/15 overflow-hidden text-xs">
              {(['de', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 font-medium transition ${lang === l ? 'bg-[#0e393d] text-white' : 'text-[#1c2a2b]/60 hover:bg-[#0e393d]/5'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-[#1c2a2b]/40 hover:text-[#1c2a2b] transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#1c2a2b]/40">
            Loading…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

            {/* ── Multilingual content ─────────────────────────────────────── */}
            <div className="space-y-4">
              <SectionHead>Content — {lang.toUpperCase()}</SectionHead>

              <Field label={`Title (${lang.toUpperCase()}) *`}>
                <input
                  className={inputCls}
                  value={form.title[lang]}
                  onChange={(e) => setLangField('title', lang, e.target.value)}
                  placeholder={lang === 'de' ? 'z.B. Grüner Smoothie mit Spinat' : 'e.g. Green Spinach Smoothie'}
                />
              </Field>

              <Field label={`Description (${lang.toUpperCase()})`}>
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={2}
                  value={form.description[lang]}
                  onChange={(e) => setLangField('description', lang, e.target.value)}
                  placeholder={lang === 'de' ? 'Kurze Beschreibung…' : 'Short description…'}
                />
              </Field>

              <Field label={`Instructions (${lang.toUpperCase()})`} hint="Markdown supported">
                <textarea
                  className={inputCls + ' resize-y'}
                  rows={6}
                  value={form.instructions[lang]}
                  onChange={(e) => setLangField('instructions', lang, e.target.value)}
                  placeholder={lang === 'de' ? '1. Spinat waschen…\n2. Alle Zutaten…' : '1. Wash spinach…\n2. Blend all…'}
                />
              </Field>
            </div>

            {/* ── Basics ──────────────────────────────────────────────────── */}
            <div className="space-y-4 border-t border-[#0e393d]/8 pt-6">
              <SectionHead>Basics</SectionHead>
              <div className="grid grid-cols-4 gap-3">
                <Field label="Prep (min)">
                  <input type="number" min={0} className={inputCls} value={form.prep_time_min}
                    onChange={(e) => setForm((f) => ({ ...f, prep_time_min: e.target.value }))} placeholder="10" />
                </Field>
                <Field label="Cook (min)">
                  <input type="number" min={0} className={inputCls} value={form.cook_time_min}
                    onChange={(e) => setForm((f) => ({ ...f, cook_time_min: e.target.value }))} placeholder="20" />
                </Field>
                <Field label="Servings">
                  <input type="number" min={1} className={inputCls} value={form.servings}
                    onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))} placeholder="2" />
                </Field>
                <Field label="Difficulty">
                  <select className={inputCls + ' cursor-pointer'} value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* ── Nutrition ───────────────────────────────────────────────── */}
            <div className="space-y-3 border-t border-[#0e393d]/8 pt-6">
              <SectionHead>Nutrition (per serving)</SectionHead>
              <div className="grid grid-cols-5 gap-3">
                {([
                  ['calories',  'kcal'],
                  ['protein_g', 'Protein g'],
                  ['fat_g',     'Fat g'],
                  ['carbs_g',   'Carbs g'],
                  ['fiber_g',   'Fiber g'],
                ] as [keyof NutritionForm, string][]).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      type="number" min={0} step={0.1}
                      className={inputCls}
                      value={form.nutrition[key]}
                      onChange={(e) => setNutrition(key, e.target.value)}
                      placeholder="0"
                    />
                  </Field>
                ))}
              </div>
            </div>

            {/* ── Ingredients ─────────────────────────────────────────────── */}
            <div className="space-y-3 border-t border-[#0e393d]/8 pt-6">
              <div className="flex items-center justify-between">
                <SectionHead>Ingredients ({form.ingredients.length})</SectionHead>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-xs font-medium text-[#0e393d] hover:text-[#0e393d]/70 transition"
                >
                  + Add
                </button>
              </div>

              {form.ingredients.length === 0 && (
                <p className="text-xs text-[#1c2a2b]/30 italic">No ingredients yet.</p>
              )}

              <div className="space-y-2">
                {form.ingredients.map((ing, idx) => (
                  <div key={ing._key} className="flex items-center gap-2 rounded-lg border border-[#0e393d]/10 bg-[#fafaf8] px-3 py-2">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <IconBtn onClick={() => moveIngredient(ing._key, -1)} title="Move up">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7l3-4 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </IconBtn>
                      <IconBtn onClick={() => moveIngredient(ing._key, 1)} title="Move down">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </IconBtn>
                    </div>
                    {/* Index */}
                    <span className="w-5 text-center text-[11px] text-[#1c2a2b]/30 shrink-0">{idx + 1}</span>
                    {/* Amount */}
                    <input
                      type="number" min={0} step={0.1}
                      placeholder="Qty"
                      value={ing.amount}
                      onChange={(e) => updateIngredient(ing._key, 'amount', e.target.value)}
                      className="w-16 rounded-md border border-[#0e393d]/12 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                    />
                    {/* Unit */}
                    <input
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(ing._key, 'unit', e.target.value)}
                      className="w-16 rounded-md border border-[#0e393d]/12 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                    />
                    {/* Name */}
                    <input
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={(e) => updateIngredient(ing._key, 'name', e.target.value)}
                      className="flex-1 rounded-md border border-[#0e393d]/12 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                    />
                    {/* Notes */}
                    <input
                      placeholder="Note"
                      value={ing.notes}
                      onChange={(e) => updateIngredient(ing._key, 'notes', e.target.value)}
                      className="w-24 rounded-md border border-[#0e393d]/12 bg-white px-2 py-1 text-xs text-[#1c2a2b]/60 focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                    />
                    {/* Remove */}
                    <IconBtn onClick={() => removeIngredient(ing._key)} title="Remove">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                    </IconBtn>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Daily Dozen tags ─────────────────────────────────────────── */}
            <div className="space-y-3 border-t border-[#0e393d]/8 pt-6">
              <SectionHead>Daily Dozen Tags</SectionHead>
              <div className="grid grid-cols-2 gap-2">
                {DAILY_DOZEN_CATEGORIES.map(({ key, label }) => {
                  const active = form.daily_dozen.find((d) => d.category === key);
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 transition cursor-pointer ${
                        active
                          ? 'border-[#0e393d]/30 bg-[#0e393d]/5'
                          : 'border-[#0e393d]/10 hover:border-[#0e393d]/20 hover:bg-[#fafaf8]'
                      }`}
                      onClick={() => toggleDailyDozen(key)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded border transition ${active ? 'bg-[#0e393d] border-[#0e393d]' : 'border-[#0e393d]/30'}`}>
                          {active && (
                            <svg viewBox="0 0 12 12" fill="none" className="text-white">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-[#1c2a2b]">{label}</span>
                      </div>
                      {active && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-[#1c2a2b]/40">×</span>
                          <input
                            type="number" min={0.5} max={3} step={0.5}
                            value={active.servings}
                            onChange={(e) => setDdServings(key, e.target.value)}
                            className="w-12 rounded border border-[#0e393d]/20 bg-white px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#0e393d]/20"
                          />
                          <span className="text-[10px] text-[#1c2a2b]/40">srv</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Goal tags ────────────────────────────────────────────────── */}
            <div className="space-y-3 border-t border-[#0e393d]/8 pt-6">
              <SectionHead>Health Goals</SectionHead>
              <div className="flex flex-wrap gap-2">
                {GOAL_TAGS.map(({ key, label }) => {
                  const active = form.goals.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleGoal(key)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active
                          ? 'bg-[#0e393d] text-white'
                          : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Image ───────────────────────────────────────────────────── */}
            <div className="space-y-3 border-t border-[#0e393d]/8 pt-6">
              <SectionHead>Cover Image</SectionHead>
              {(imagePreview || currentImageUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview ?? currentImageUrl!}
                  alt="Preview"
                  className="w-full h-44 object-cover rounded-xl border border-[#0e393d]/10"
                />
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-[#0e393d]/20 py-4 text-sm text-[#0e393d]/50 hover:border-[#0e393d]/40 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/3 transition"
              >
                {imagePreview || currentImageUrl ? 'Replace image' : 'Upload image'}
                <span className="block text-xs mt-0.5 text-[#1c2a2b]/30">PNG, JPG, WebP · max 5 MB</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            {/* ── Publish settings ─────────────────────────────────────────── */}
            <div className="space-y-3 border-t border-[#0e393d]/8 pt-6">
              <SectionHead>Settings</SectionHead>
              <Toggle
                checked={form.is_published}
                onChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                label="Published"
                hint="Visible to users in the recipe database"
              />
              <Toggle
                checked={form.is_featured}
                onChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
                label="Featured"
                hint="Highlighted on the homepage and recipe list"
              />
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[#0e393d]/10 px-6 py-4 shrink-0">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : recipeId ? 'Save Changes' : 'Create Recipe'}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
