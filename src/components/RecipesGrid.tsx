'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import FavouriteButton from '@/components/FavouriteButton';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecipeCard = {
  id: string;
  slug: string | null;
  title: Record<string, string> | null;
  description: Record<string, string> | null;
  image_url: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  is_featured: boolean | null;
  daily_dozen_categories: { slug: string; icon: string }[];
  course_type_id: string | null;
  meal_type_ids: string[];
  goals: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_TAGS = [
  { key: 'weight_loss',         label: { de: 'Gewicht',         en: 'Weight Loss' } },
  { key: 'heart_health',        label: { de: 'Herz',            en: 'Heart Health' } },
  { key: 'anti_inflammation',   label: { de: 'Anti-Entzündung', en: 'Anti-Inflammation' } },
  { key: 'longevity',           label: { de: 'Langlebigkeit',   en: 'Longevity' } },
  { key: 'gut_health',          label: { de: 'Darm',            en: 'Gut Health' } },
  { key: 'energy',              label: { de: 'Energie',         en: 'Energy' } },
  { key: 'immune',              label: { de: 'Immunsystem',     en: 'Immune' } },
  { key: 'bone_health',         label: { de: 'Knochen',         en: 'Bone Health' } },
  { key: 'brain_health',        label: { de: 'Gehirn',          en: 'Brain Health' } },
  { key: 'diabetes_prevention', label: { de: 'Diabetes',        en: 'Diabetes Prev.' } },
];

const DIFF_CFG = {
  easy:   { label: { de: 'Einfach', en: 'Easy' },   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  medium: { label: { de: 'Mittel',  en: 'Medium' }, cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  hard:   { label: { de: 'Schwer',  en: 'Hard' },   cls: 'bg-red-50 text-red-700 ring-red-600/20' },
};

const T = {
  de: {
    searchPlaceholder: 'Rezepte suchen…',
    minutes: 'Min.',
    servings: (n: number) => `${n} ${n === 1 ? 'Portion' : 'Portionen'}`,
    viewRecipe: 'Rezept ansehen',
    noResults: 'Keine Rezepte gefunden.',
    noResultsHint: 'Versuche eine andere Suche oder Filter.',
    noFavourites: 'Keine gespeicherten Rezepte.',
    noFavouritesHint: 'Tippe auf das Herz bei einem Rezept, um es zu speichern.',
    featured: 'Empfohlen',
    total: (n: number) => `${n} Rezept${n !== 1 ? 'e' : ''}`,
    clearAll: 'Filter zurücksetzen',
    difficulty: 'Schwierigkeit',
    dailyDozen: 'Daily Dozen',
    course: 'Mahlzeit-Typ',
    mealType: 'Tageszeit',
    goals: 'Gesundheitsziele',
    saved: 'Gespeichert',
    favourites: 'Favoriten',
  },
  en: {
    searchPlaceholder: 'Search recipes…',
    minutes: 'min',
    servings: (n: number) => `${n} serving${n !== 1 ? 's' : ''}`,
    viewRecipe: 'View recipe',
    noResults: 'No recipes found.',
    noResultsHint: 'Try a different search or filter.',
    noFavourites: 'No saved recipes.',
    noFavouritesHint: 'Tap the heart on a recipe to save it.',
    featured: 'Featured',
    total: (n: number) => `${n} recipe${n !== 1 ? 's' : ''}`,
    clearAll: 'Clear all',
    difficulty: 'Difficulty',
    dailyDozen: 'Daily Dozen',
    course: 'Course',
    mealType: 'Meal',
    goals: 'Health Goals',
    saved: 'Saved',
    favourites: 'Favourites',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  recipes: RecipeCard[];
  lang: string;
  courseTypes: { id: string; name: Record<string, string> }[];
  mealTypes: { id: string; name: Record<string, string> }[];
  ddCategories: { slug: string; name: Record<string, string>; icon: string }[];
  userId: string | null;
  initialFavouriteIds: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

function totalTime(prep: number | null, cook: number | null): number | null {
  if (prep == null && cook == null) return null;
  return (prep ?? 0) + (cook ?? 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap ${
        active
          ? 'bg-[#0e393d] text-white'
          : 'bg-white text-[#1c2a2b]/65 ring-1 ring-[#0e393d]/15 hover:ring-[#0e393d]/30 hover:text-[#1c2a2b]'
      }`}
    >
      {children}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-[#0e393d]/6 last:border-0">
      <span className="shrink-0 w-24 text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/40 pt-1">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipesGrid({ recipes, lang, courseTypes, mealTypes, ddCategories, userId, initialFavouriteIds }: Props) {
  const t = (T as Record<string, typeof T.en>)[lang] ?? T.en;

  const [search, setSearch] = useState('');
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [ddSlugs, setDdSlugs] = useState<string[]>([]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [mealTypeIds, setMealTypeIds] = useState<string[]>([]);
  const [goalKeys, setGoalKeys] = useState<string[]>([]);
  const [showFavourites, setShowFavourites] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(() => new Set(initialFavouriteIds));

  const handleFavouriteToggle = (recipeId: string, isFavourited: boolean) => {
    setFavouriteIds((prev) => {
      const next = new Set(prev);
      if (isFavourited) next.add(recipeId);
      else next.delete(recipeId);
      return next;
    });
  };

  const activeCount =
    difficulties.length + ddSlugs.length + courseIds.length + mealTypeIds.length + goalKeys.length +
    (showFavourites ? 1 : 0);

  const clearAll = () => {
    setDifficulties([]);
    setDdSlugs([]);
    setCourseIds([]);
    setMealTypeIds([]);
    setGoalKeys([]);
    setShowFavourites(false);
    setSearch('');
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recipes.filter((r) => {
      if (showFavourites && !favouriteIds.has(r.id)) return false;
      if (difficulties.length && !difficulties.includes(r.difficulty ?? '')) return false;
      if (ddSlugs.length && !ddSlugs.every((s) => r.daily_dozen_categories.some((c) => c.slug === s))) return false;
      if (courseIds.length && !courseIds.includes(r.course_type_id ?? '')) return false;
      if (mealTypeIds.length && !mealTypeIds.some((id) => r.meal_type_ids.includes(id))) return false;
      if (goalKeys.length && !goalKeys.every((g) => r.goals.includes(g))) return false;
      if (q) {
        const de = r.title?.de?.toLowerCase() ?? '';
        const en = r.title?.en?.toLowerCase() ?? '';
        if (!de.includes(q) && !en.includes(q)) return false;
      }
      return true;
    });
  }, [recipes, search, difficulties, ddSlugs, courseIds, mealTypeIds, goalKeys, showFavourites, favouriteIds]);

  return (
    <div>
      {/* ── Filter panel ─────────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-[#0e393d]/10 bg-white">
        {/* Top row: search + count + clear */}
        <div className="flex items-center gap-4 px-5 pt-4 pb-3 border-b border-[#0e393d]/8">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/35 pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg border border-[#0e393d]/12 bg-[#fafaf8] pl-9 pr-4 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/35 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/8 transition"
            />
          </div>
          <span className="shrink-0 text-xs text-[#1c2a2b]/40 font-medium">{t.total(filtered.length)}</span>
          {(activeCount > 0 || search) && (
            <button
              onClick={clearAll}
              className="shrink-0 text-xs font-medium text-[#0e393d] underline underline-offset-2 hover:text-[#0e393d]/70 transition"
            >
              {t.clearAll}
            </button>
          )}
        </div>

        {/* Filter rows */}
        <div className="px-5 py-1">
          {/* Saved / Favourites */}
          {userId && (
            <FilterRow label={t.saved}>
              <Pill active={showFavourites} onClick={() => setShowFavourites(!showFavourites)}>
                ♡ {t.favourites}
              </Pill>
            </FilterRow>
          )}

          {/* Difficulty */}
          <FilterRow label={t.difficulty}>
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <Pill
                key={d}
                active={difficulties.includes(d)}
                onClick={() => setDifficulties(toggle(difficulties, d))}
              >
                {DIFF_CFG[d].label[lang as 'de' | 'en'] ?? DIFF_CFG[d].label.en}
              </Pill>
            ))}
          </FilterRow>

          {/* Daily Dozen */}
          {ddCategories.length > 0 && (
            <FilterRow label={t.dailyDozen}>
              {ddCategories.map((dd) => (
                <Pill
                  key={dd.slug}
                  active={ddSlugs.includes(dd.slug)}
                  onClick={() => setDdSlugs(toggle(ddSlugs, dd.slug))}
                >
                  {dd.icon} {dd.name?.[lang] || dd.name?.en}
                </Pill>
              ))}
            </FilterRow>
          )}

          {/* Course */}
          {courseTypes.length > 0 && (
            <FilterRow label={t.course}>
              {courseTypes.map((ct) => (
                <Pill
                  key={ct.id}
                  active={courseIds.includes(ct.id)}
                  onClick={() => setCourseIds(toggle(courseIds, ct.id))}
                >
                  {ct.name?.[lang] || ct.name?.en || ct.id}
                </Pill>
              ))}
            </FilterRow>
          )}

          {/* Meal type */}
          {mealTypes.length > 0 && (
            <FilterRow label={t.mealType}>
              {mealTypes.map((mt) => (
                <Pill
                  key={mt.id}
                  active={mealTypeIds.includes(mt.id)}
                  onClick={() => setMealTypeIds(toggle(mealTypeIds, mt.id))}
                >
                  {mt.name?.[lang] || mt.name?.en || mt.id}
                </Pill>
              ))}
            </FilterRow>
          )}

          {/* Health Goals */}
          <FilterRow label={t.goals}>
            {GOAL_TAGS.map((g) => (
              <Pill
                key={g.key}
                active={goalKeys.includes(g.key)}
                onClick={() => setGoalKeys(toggle(goalKeys, g.key))}
              >
                {g.label[lang as 'de' | 'en'] ?? g.label.en}
              </Pill>
            ))}
          </FilterRow>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#0e393d]/10 bg-white py-20 text-center">
          <p className="text-sm text-[#1c2a2b]/50">{showFavourites ? t.noFavourites : t.noResults}</p>
          <p className="text-xs text-[#1c2a2b]/30 mt-1">{showFavourites ? t.noFavouritesHint : t.noResultsHint}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => {
            const title    = recipe.title?.[lang] || recipe.title?.en || recipe.title?.de || '';
            const desc     = recipe.description?.[lang] || recipe.description?.en || recipe.description?.de || '';
            const time     = totalTime(recipe.prep_time_min, recipe.cook_time_min);
            const href     = `/recipes/${recipe.slug ?? recipe.id}`;
            const diffCfg  = recipe.difficulty ? DIFF_CFG[recipe.difficulty] : null;

            return (
              <article
                key={recipe.id}
                className="group flex flex-col rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden hover:border-[#0e393d]/25 hover:shadow-md transition-all duration-200"
              >
                {/* Image */}
                <div className="relative h-48 bg-[#0e393d]/6 overflow-hidden">
                  <Link href={href} className="block w-full h-full">
                    {recipe.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recipe.image_url.includes('/storage/v1/object/public/')
                          ? recipe.image_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&height=300&resize=cover'
                          : recipe.image_url}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-[#0e393d]/20"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 12h8M12 8v8" />
                        </svg>
                      </div>
                    )}
                  </Link>
                  {recipe.is_featured && (
                    <span className="absolute top-3 left-3 bg-[#ceab84] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full pointer-events-none">
                      ★ {t.featured}
                    </span>
                  )}
                  <FavouriteButton
                    recipeId={recipe.id}
                    userId={userId}
                    initialIsFavourited={favouriteIds.has(recipe.id)}
                    size="sm"
                    onToggle={handleFavouriteToggle}
                    className="absolute top-2 right-2 bg-white/85 backdrop-blur-sm shadow-sm"
                  />
                </div>

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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {time} {t.minutes}
                      </span>
                    )}
                    {recipe.servings != null && (
                      <span>{t.servings(recipe.servings)}</span>
                    )}
                    {diffCfg && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${diffCfg.cls}`}>
                        {diffCfg.label[lang as 'de' | 'en'] ?? diffCfg.label.en}
                      </span>
                    )}
                  </div>

                  {/* Daily Dozen tags — emoji only, up to 6 */}
                  {recipe.daily_dozen_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {recipe.daily_dozen_categories.slice(0, 6).map((cat) => {
                        const ddEntry = ddCategories.find((d) => d.slug === cat.slug);
                        const ddName  = ddEntry?.name?.[lang] || ddEntry?.name?.en || cat.slug;
                        return (
                          <span
                            key={cat.slug}
                            title={ddName}
                            className="rounded-full bg-[#ceab84]/12 px-1.5 py-0.5 text-sm leading-none"
                          >
                            {cat.icon}
                          </span>
                        );
                      })}
                      {recipe.daily_dozen_categories.length > 6 && (
                        <span className="rounded-full bg-[#0e393d]/6 px-2 py-0.5 text-[10px] font-medium text-[#0e393d]/50">
                          +{recipe.daily_dozen_categories.length - 6}
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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
