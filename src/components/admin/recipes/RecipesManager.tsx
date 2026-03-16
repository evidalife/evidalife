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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipesManager({ initialRecipes }: { initialRecipes: RecipeListItem[] }) {
  const supabase = createClient();
  const [recipes, setRecipes] = useState<RecipeListItem[]>(initialRecipes);
  const [search, setSearch] = useState('');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');
  const [editingId, setEditingId] = useState<string | null | 'new'>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select('id, title, difficulty, prep_time_min, cook_time_min, servings, is_published, is_featured, image_url, created_at')
      .order('created_at', { ascending: false });
    if (data) setRecipes(data);
  }, [supabase]);

  const filtered = recipes.filter((r) => {
    if (filterPublished === 'published' && !r.is_published) return false;
    if (filterPublished === 'draft' && r.is_published) return false;
    if (search) {
      const q = search.toLowerCase();
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
            {recipes.length} total · {recipes.filter(r => r.is_published).length} published
          </p>
        </div>
        <button
          onClick={() => setEditingId('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 transition"
        >
          <span className="text-lg leading-none">+</span> New Recipe
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition w-52"
        />
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterPublished(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filterPublished === f
                ? 'bg-[#0e393d] text-white'
                : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'
            }`}
          >
            {f === 'all' ? `All (${recipes.length})` : f === 'published' ? `Published (${recipes.filter(r => r.is_published).length})` : `Drafts (${recipes.filter(r => !r.is_published).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              {['', 'Title', 'Difficulty', 'Time', 'Servings', 'Status', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No recipes found.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#fafaf8] transition-colors">
                {/* Thumb */}
                <td className="px-4 py-3 w-12">
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#0e393d]/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#0e393d]/6 flex items-center justify-center text-[#0e393d]/25">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                        <path d="M8 12h8M12 8v8"/>
                      </svg>
                    </div>
                  )}
                </td>
                {/* Title */}
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0e393d] leading-snug">
                    {r.title?.de || r.title?.en || <span className="text-[#1c2a2b]/30 italic">Untitled</span>}
                  </div>
                  {r.title?.de && r.title?.en && (
                    <div className="text-xs text-[#1c2a2b]/40 mt-0.5">{r.title.en}</div>
                  )}
                  {r.is_featured && (
                    <span className="inline-flex items-center rounded-full bg-[#ceab84]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#8a6a3e] ring-1 ring-inset ring-[#ceab84]/30 mt-1">★ featured</span>
                  )}
                </td>
                {/* Difficulty */}
                <td className="px-4 py-3"><DiffBadge d={r.difficulty} /></td>
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
                  {r.is_published
                    ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-600/20">Published</span>
                    : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/20">Draft</span>
                  }
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
        />
      )}
    </div>
  );
}
