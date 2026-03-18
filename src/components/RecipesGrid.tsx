'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';

export type RecipeCard = {
  id: string;
  slug: string | null;
  title: { de?: string; en?: string } | null;
  description: { de?: string; en?: string } | null;
  image_url: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  is_featured: boolean | null;
  daily_dozen_categories: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DD_LABELS: Record<string, { de: string; en: string }> = {
  beans:                  { de: 'Hülsenfrüchte', en: 'Beans' },
  berries:                { de: 'Beeren',         en: 'Berries' },
  other_fruits:           { de: 'Früchte',        en: 'Fruits' },
  cruciferous_vegetables: { de: 'Kreuzblütler',   en: 'Cruciferous' },
  greens:                 { de: 'Blattgemüse',    en: 'Greens' },
  other_vegetables:       { de: 'Gemüse',         en: 'Vegetables' },
  flaxseeds:              { de: 'Leinsamen',      en: 'Flaxseeds' },
  nuts_and_seeds:         { de: 'Nüsse & Samen',  en: 'Nuts & Seeds' },
  herbs_and_spices:       { de: 'Kräuter',        en: 'Herbs' },
  whole_grains:           { de: 'Vollkorn',       en: 'Whole Grains' },
  beverages:              { de: 'Getränke',       en: 'Beverages' },
  exercise:               { de: 'Bewegung',       en: 'Exercise' },
};

const DD_KEYS = Object.keys(DD_LABELS);

const DIFF_CFG = {
  easy:   { label: { de: 'Einfach', en: 'Easy' },   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  medium: { label: { de: 'Mittel',  en: 'Medium' }, cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  hard:   { label: { de: 'Schwer',  en: 'Hard' },   cls: 'bg-red-50 text-red-700 ring-red-600/20' },
};

const T = {
  de: {
    searchPlaceholder: 'Rezepte suchen…',
    allDifficulties: 'Alle Schwierigkeiten',
    allCategories: 'Alle Kategorien',
    minutes: 'Min.',
    servings: (n: number) => `${n} ${n === 1 ? 'Portion' : 'Portionen'}`,
    viewRecipe: 'Rezept ansehen',
    noResults: 'Keine Rezepte gefunden.',
    noResultsHint: 'Versuche eine andere Suche oder Filter.',
    featured: 'Empfohlen',
    total: (n: number) => `${n} Rezept${n !== 1 ? 'e' : ''}`,
  },
  en: {
    searchPlaceholder: 'Search recipes…',
    allDifficulties: 'All difficulties',
    allCategories: 'All categories',
    minutes: 'min',
    servings: (n: number) => `${n} serving${n !== 1 ? 's' : ''}`,
    viewRecipe: 'View recipe',
    noResults: 'No recipes found.',
    noResultsHint: 'Try a different search or filter.',
    featured: 'Featured',
    total: (n: number) => `${n} recipe${n !== 1 ? 's' : ''}`,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalTime(prep: number | null, cook: number | null): number | null {
  if (prep == null && cook == null) return null;
  return (prep ?? 0) + (cook ?? 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipesGrid({ recipes, lang }: { recipes: RecipeCard[]; lang: Lang }) {
  const t = T[lang];

  const [search, setSearch]   = useState('');
  const [diff, setDiff]       = useState<string>('all');
  const [ddCat, setDdCat]     = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recipes.filter((r) => {
      if (diff !== 'all' && r.difficulty !== diff) return false;
      if (ddCat !== 'all' && !r.daily_dozen_categories.includes(ddCat)) return false;
      if (q) {
        const de = r.title?.de?.toLowerCase() ?? '';
        const en = r.title?.en?.toLowerCase() ?? '';
        if (!de.includes(q) && !en.includes(q)) return false;
      }
      return true;
    });
  }, [recipes, search, diff, ddCat]);

  return (
    <div>
      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 space-y-3">
        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full max-w-md rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />

        {/* Difficulty pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDiff('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${diff === 'all' ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
          >
            {t.allDifficulties}
          </button>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${diff === d ? 'bg-[#0e393d] text-white' : 'bg-white text-[#1c2a2b]/60 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30'}`}
            >
              {DIFF_CFG[d].label[lang]}
            </button>
          ))}
        </div>

        {/* Daily Dozen category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDdCat('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${ddCat === 'all' ? 'bg-[#ceab84] text-white' : 'bg-[#ceab84]/10 text-[#8a6a3e] hover:bg-[#ceab84]/20'}`}
          >
            {t.allCategories}
          </button>
          {DD_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setDdCat(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${ddCat === key ? 'bg-[#ceab84] text-white' : 'bg-[#ceab84]/10 text-[#8a6a3e] hover:bg-[#ceab84]/20'}`}
            >
              {DD_LABELS[key][lang]}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#1c2a2b]/40">{t.total(filtered.length)}</p>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#0e393d]/10 bg-white py-20 text-center">
          <p className="text-sm text-[#1c2a2b]/50">{t.noResults}</p>
          <p className="text-xs text-[#1c2a2b]/30 mt-1">{t.noResultsHint}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => {
            const title   = recipe.title?.[lang] || recipe.title?.de || recipe.title?.en || '';
            const desc    = recipe.description?.[lang] || recipe.description?.de || '';
            const time    = totalTime(recipe.prep_time_min, recipe.cook_time_min);
            const href    = `/recipes/${recipe.slug ?? recipe.id}`;
            const diff    = recipe.difficulty ? DIFF_CFG[recipe.difficulty] : null;

            return (
              <article
                key={recipe.id}
                className="group flex flex-col rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden hover:border-[#0e393d]/25 hover:shadow-md transition-all duration-200"
              >
                {/* Image */}
                <Link href={href} className="block relative h-48 bg-[#0e393d]/6 overflow-hidden">
                  {recipe.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.image_url}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#0e393d]/20">
                        <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
                      </svg>
                    </div>
                  )}
                  {recipe.is_featured && (
                    <span className="absolute top-3 left-3 bg-[#ceab84] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      ★ {t.featured}
                    </span>
                  )}
                </Link>

                {/* Body */}
                <div className="flex flex-col flex-1 p-5">
                  {/* Title */}
                  <Link href={href}>
                    <h2 className="font-serif text-lg text-[#0e393d] leading-snug mb-1.5 group-hover:text-[#1a5055] transition-colors line-clamp-2">
                      {title}
                    </h2>
                  </Link>

                  {/* Description */}
                  {desc && (
                    <p className="text-sm text-[#1c2a2b]/55 leading-relaxed line-clamp-2 mb-3">{desc}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-auto mb-3 text-xs text-[#1c2a2b]/50">
                    {time != null && (
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {time} {t.minutes}
                      </span>
                    )}
                    {recipe.servings != null && (
                      <span>{t.servings(recipe.servings)}</span>
                    )}
                    {diff && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${diff.cls}`}>
                        {diff.label[lang]}
                      </span>
                    )}
                  </div>

                  {/* Daily Dozen tags */}
                  {recipe.daily_dozen_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {recipe.daily_dozen_categories.slice(0, 4).map((cat) => (
                        <span
                          key={cat}
                          className="rounded-full bg-[#ceab84]/12 px-2 py-0.5 text-[10px] font-medium text-[#8a6a3e]"
                        >
                          {DD_LABELS[cat]?.[lang] ?? cat}
                        </span>
                      ))}
                      {recipe.daily_dozen_categories.length > 4 && (
                        <span className="rounded-full bg-[#0e393d]/6 px-2 py-0.5 text-[10px] font-medium text-[#0e393d]/50">
                          +{recipe.daily_dozen_categories.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    href={href}
                    className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-[#0e393d] hover:text-[#0e393d]/70 transition"
                  >
                    {t.viewRecipe}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
