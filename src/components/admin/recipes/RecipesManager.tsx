'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import RecipeFormPanel from './RecipeFormPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecipeListItem = {
  id: string;
  title: { de?: string; en?: string } | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  image_url: string | null;
  created_at: string;
  course_type_id: string | null;
  course_type: { name: { de?: string; en?: string } } | null;
  meal_type_ids: string[];
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialRecipes: RecipeListItem[];
  initialDdIcons: Record<string, string[]>;
  courseTypes: { id: string; name: { en?: string; de?: string } }[];
  mealTypes: { id: string; name: { en?: string; de?: string } }[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiffBadge({ d }: { d: string | null }) {
  if (!d) return null;
  const cfg = {
    easy:   'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    hard:   'bg-red-50 text-red-700 ring-red-600/20',
  }[d] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cfg}`}>
      {d}
    </span>
  );
}

function AdminPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? 'bg-[#0e393d] text-white'
          : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
      }`}
    >
      {children}
    </button>
  );
}

function FilterChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/40 w-20 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipesManager({
  initialRecipes,
  initialDdIcons,
  courseTypes,
  mealTypes,
}: Props) {
  const supabase = createClient();
  const [recipes, setRecipes] = useState<RecipeListItem[]>(initialRecipes);
  const [ddIcons, setDdIcons] = useState<Record<string, string[]>>(initialDdIcons);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null | 'new'>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterDiffs, setFilterDiffs] = useState<string[]>([]);
  const [filterCourseIds, setFilterCourseIds] = useState<string[]>([]);
  const [filterMealTypeIds, setFilterMealTypeIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select(`
        id, title, difficulty, prep_time_min, cook_time_min, servings,
        is_published, is_featured, image_url, created_at, course_type_id,
        course_type:recipe_course_types(name)
      `)
      .order('created_at', { ascending: false });
    if (!data) return;

    const ids = data.map((r) => r.id);
    let mealTagMap: Record<string, string[]> = {};
    if (ids.length > 0) {
      const { data: mealRows } = await supabase
        .from('recipe_meal_type_tags')
        .select('recipe_id, meal_type_id')
        .in('recipe_id', ids);
      for (const row of mealRows ?? []) {
        if (!mealTagMap[row.recipe_id]) mealTagMap[row.recipe_id] = [];
        mealTagMap[row.recipe_id].push(row.meal_type_id);
      }
    }

    const merged = data.map((r) => ({
      ...r,
      meal_type_ids: mealTagMap[r.id] ?? [],
    }));
    setRecipes(merged as unknown as RecipeListItem[]);

    if (ids.length > 0) {
      const { data: ddRows } = await supabase
        .from('v_recipe_daily_dozen_coverage')
        .select('recipe_id, category_icon')
        .in('recipe_id', ids);
      const map: Record<string, string[]> = {};
      for (const row of ddRows ?? []) {
        if (!map[row.recipe_id]) map[row.recipe_id] = [];
        map[row.recipe_id].push(row.category_icon);
      }
      setDdIcons(map);
    }
  }, [supabase]);

  const activeFilterCount =
    filterStatus.length + filterDiffs.length + filterCourseIds.length + filterMealTypeIds.length;

  const clearFilters = () => {
    setFilterStatus([]);
    setFilterDiffs([]);
    setFilterCourseIds([]);
    setFilterMealTypeIds([]);
  };

  const filtered = recipes.filter((r) => {
    // Status
    if (filterStatus.length) {
      const isPub = r.is_published ?? false;
      const matchesPub   = filterStatus.includes('published') && isPub;
      const matchesDraft = filterStatus.includes('draft') && !isPub;
      if (!matchesPub && !matchesDraft) return false;
    }
    // Difficulty
    if (filterDiffs.length && !filterDiffs.includes(r.difficulty ?? '')) return false;
    // Course
    if (filterCourseIds.length && !filterCourseIds.includes(r.course_type_id ?? '')) return false;
    // Meal type
    if (filterMealTypeIds.length && !filterMealTypeIds.some((id) => r.meal_type_ids.includes(id))) return false;
    // Search
    if (search) {
      const q  = search.toLowerCase();
      const de = r.title?.de?.toLowerCase() ?? '';
      const en = r.title?.en?.toLowerCase() ?? '';
      if (!de.includes(q) && !en.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Recipes</h1>
          <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
            {recipes.length} total · {recipes.filter((r) => r.is_published).length} published
          </p>
        </div>
        <button
          onClick={() => setEditingId('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Recipe
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition w-52"
        />

        {/* Filters toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition border ${
            showFilters || activeFilterCount > 0
              ? 'bg-[#0e393d] text-white border-[#0e393d]'
              : 'bg-white text-[#1c2a2b]/60 border-[#0e393d]/15 hover:border-[#0e393d]/30'
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-white/20 text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-[#0e393d]/50 hover:text-[#0e393d] underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Collapsible filter panel */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-[#0e393d]/10 bg-white p-4 space-y-3">
          {/* Status */}
          <FilterChipRow label="Status">
            {(['published', 'draft'] as const).map((s) => (
              <AdminPill
                key={s}
                active={filterStatus.includes(s)}
                onClick={() => setFilterStatus(toggle(filterStatus, s))}
              >
                {s === 'published' ? 'Published' : 'Draft'}
              </AdminPill>
            ))}
          </FilterChipRow>

          {/* Difficulty */}
          <FilterChipRow label="Difficulty">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <AdminPill
                key={d}
                active={filterDiffs.includes(d)}
                onClick={() => setFilterDiffs(toggle(filterDiffs, d))}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </AdminPill>
            ))}
          </FilterChipRow>

          {/* Course type */}
          {courseTypes.length > 0 && (
            <FilterChipRow label="Course">
              {courseTypes.map((ct) => (
                <AdminPill
                  key={ct.id}
                  active={filterCourseIds.includes(ct.id)}
                  onClick={() => setFilterCourseIds(toggle(filterCourseIds, ct.id))}
                >
                  {ct.name?.en || ct.name?.de || ct.id}
                </AdminPill>
              ))}
            </FilterChipRow>
          )}

          {/* Meal type */}
          {mealTypes.length > 0 && (
            <FilterChipRow label="Meal">
              {mealTypes.map((mt) => (
                <AdminPill
                  key={mt.id}
                  active={filterMealTypeIds.includes(mt.id)}
                  onClick={() => setFilterMealTypeIds(toggle(filterMealTypeIds, mt.id))}
                >
                  {mt.name?.en || mt.name?.de || mt.id}
                </AdminPill>
              ))}
            </FilterChipRow>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              {['', 'Title', 'Course', 'Difficulty', 'Time', 'Servings', 'Status', ''].map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No recipes found.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#fafaf8] transition-colors">
                {/* Thumb */}
                <td className="px-4 py-3 w-16">
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image_url}
                      alt=""
                      className="w-10 h-10 min-w-[36px] rounded-lg object-cover border border-[#0e393d]/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#0e393d]/6 flex items-center justify-center text-[#0e393d]/25">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                        <path d="M8 12h8M12 8v8" />
                      </svg>
                    </div>
                  )}
                </td>

                {/* Title + DD icons */}
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d] leading-snug">
                    {r.title?.en || r.title?.de || <span className="text-[#1c2a2b]/30 italic">Untitled</span>}
                  </div>
                  {r.title?.de && r.title?.en && (
                    <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{r.title.de}</div>
                  )}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {r.is_featured && (
                      <span className="inline-flex items-center rounded-full bg-[#ceab84]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/30">
                        ★ featured
                      </span>
                    )}
                    {(ddIcons[r.id] ?? []).map((icon, i) => (
                      <span key={i} className="text-sm leading-none" title="Daily Dozen category">
                        {icon}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Course type */}
                <td className="px-4 py-3">
                  {r.course_type?.name ? (
                    <span className="inline-flex items-center rounded-full bg-[#0e393d]/6 px-2 py-0.5 text-[11px] font-medium text-[#0e393d]/70">
                      {r.course_type.name.en || r.course_type.name.de}
                    </span>
                  ) : (
                    <span className="text-[#1c2a2b]/25 text-xs">—</span>
                  )}
                </td>

                {/* Difficulty */}
                <td className="px-4 py-3">
                  <DiffBadge d={r.difficulty} />
                </td>

                {/* Time */}
                <td className="px-4 py-3 text-xs text-[#1c2a2b]/60 whitespace-nowrap">
                  {r.prep_time_min != null || r.cook_time_min != null
                    ? `${(r.prep_time_min ?? 0) + (r.cook_time_min ?? 0)} min`
                    : '—'}
                </td>

                {/* Servings */}
                <td className="px-4 py-3 text-xs text-[#1c2a2b]/60">{r.servings ?? '—'}</td>

                {/* Status */}
                <td className="px-4 py-3">
                  {r.is_published ? (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/20">
                      Draft
                    </span>
                  )}
                </td>

                {/* Edit */}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditingId(r.id)}
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

      {/* Form panel */}
      {editingId !== null && (
        <RecipeFormPanel
          recipeId={editingId === 'new' ? null : editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => { refresh(); setEditingId(null); }}
          onDeleted={() => { refresh(); setEditingId(null); }}
        />
      )}
    </div>
  );
}
