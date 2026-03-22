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
  { key: 'weight_loss',         label: { de: 'Gewicht',         en: 'Weight Loss',       fr: 'Perte de poids',      es: 'Pérdida de peso',    it: 'Perdita di peso'    } },
  { key: 'heart_health',        label: { de: 'Herz',            en: 'Heart Health',      fr: 'Santé cardiaque',     es: 'Salud cardíaca',     it: 'Salute cardiaca'    } },
  { key: 'anti_inflammation',   label: { de: 'Anti-Entzündung', en: 'Anti-Inflammation', fr: 'Anti-inflammatoire',  es: 'Anti-inflamación',   it: 'Anti-infiammazione' } },
  { key: 'longevity',           label: { de: 'Langlebigkeit',   en: 'Longevity',         fr: 'Longévité',           es: 'Longevidad',         it: 'Longevità'          } },
  { key: 'gut_health',          label: { de: 'Darm',            en: 'Gut Health',        fr: 'Santé intestinale',   es: 'Salud intestinal',   it: 'Salute intestinale' } },
  { key: 'energy',              label: { de: 'Energie',         en: 'Energy',            fr: 'Énergie',             es: 'Energía',            it: 'Energia'            } },
  { key: 'immune',              label: { de: 'Immunsystem',     en: 'Immune',            fr: 'Immunité',            es: 'Inmunidad',          it: 'Immunità'           } },
  { key: 'bone_health',         label: { de: 'Knochen',         en: 'Bone Health',       fr: 'Santé osseuse',       es: 'Salud ósea',         it: 'Salute ossea'       } },
  { key: 'brain_health',        label: { de: 'Gehirn',          en: 'Brain Health',      fr: 'Santé cérébrale',     es: 'Salud cerebral',     it: 'Salute cerebrale'   } },
  { key: 'diabetes_prevention', label: { de: 'Diabetes',        en: 'Diabetes Prev.',    fr: 'Prévention diabète',  es: 'Prevención diabetes',it: 'Prevenzione diabete' } },
];

const DIFF_CFG = {
  easy:   { label: { de: 'Einfach', en: 'Easy',   fr: 'Facile',  es: 'Fácil',   it: 'Facile'  }, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  medium: { label: { de: 'Mittel',  en: 'Medium', fr: 'Moyen',   es: 'Medio',   it: 'Medio'   }, cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  hard:   { label: { de: 'Schwer',  en: 'Hard',   fr: 'Difficile',es: 'Difícil', it: 'Difficile'}, cls: 'bg-red-50 text-red-700 ring-red-600/20' },
};

type Translations = {
  searchPlaceholder: string;
  minutes: string;
  servings: (n: number) => string;
  viewRecipe: string;
  noResults: string;
  noResultsHint: string;
  noFavourites: string;
  noFavouritesHint: string;
  featured: string;
  total: (n: number) => string;
  clearAll: string;
  difficulty: string;
  dailyDozen: string;
  course: string;
  mealType: string;
  goals: string;
  favourites: string;
  filters: string;
  activeFilters: string;
  rating: string;
};

const T: Record<string, Translations> = {
  de: {
    searchPlaceholder: 'Rezepte suchen…',
    minutes: 'Min.',
    servings: (n) => `${n} ${n === 1 ? 'Portion' : 'Portionen'}`,
    viewRecipe: 'Rezept ansehen',
    noResults: 'Keine Rezepte gefunden.',
    noResultsHint: 'Versuche eine andere Suche oder Filter.',
    noFavourites: 'Noch keine Lieblingsrezepte.',
    noFavouritesHint: 'Tippe auf das Herz bei einem Rezept, um es zu speichern.',
    featured: 'Empfohlen',
    total: (n) => `${n} Rezept${n !== 1 ? 'e' : ''}`,
    clearAll: 'Alle Filter zurücksetzen',
    difficulty: 'Schwierigkeit',
    dailyDozen: 'Daily Dozen',
    course: 'Mahlzeit-Typ',
    mealType: 'Tageszeit',
    goals: 'Gesundheitsziele',
    favourites: 'Favoriten',
    filters: 'Filter',
    activeFilters: 'Aktiv:',
    rating: 'Bewertung',
  },
  en: {
    searchPlaceholder: 'Search recipes…',
    minutes: 'min',
    servings: (n) => `${n} serving${n !== 1 ? 's' : ''}`,
    viewRecipe: 'View recipe',
    noResults: 'No recipes found.',
    noResultsHint: 'Try a different search or filter.',
    noFavourites: 'No favourite recipes yet.',
    noFavouritesHint: 'Tap the heart on a recipe to save it.',
    featured: 'Featured',
    total: (n) => `${n} recipe${n !== 1 ? 's' : ''}`,
    clearAll: 'Clear all filters',
    difficulty: 'Difficulty',
    dailyDozen: 'Daily Dozen',
    course: 'Course',
    mealType: 'Meal',
    goals: 'Health Goals',
    favourites: 'Favourites',
    filters: 'Filters',
    activeFilters: 'Active:',
    rating: 'Rating',
  },
  fr: {
    searchPlaceholder: 'Rechercher des recettes…',
    minutes: 'min',
    servings: (n) => `${n} portion${n !== 1 ? 's' : ''}`,
    viewRecipe: 'Voir la recette',
    noResults: 'Aucune recette trouvée.',
    noResultsHint: 'Essayez une autre recherche ou filtre.',
    noFavourites: 'Aucune recette favorite pour l\'instant.',
    noFavouritesHint: 'Appuyez sur le cœur pour sauvegarder une recette.',
    featured: 'En vedette',
    total: (n) => `${n} recette${n !== 1 ? 's' : ''}`,
    clearAll: 'Effacer tous les filtres',
    difficulty: 'Difficulté',
    dailyDozen: 'Daily Dozen',
    course: 'Plat',
    mealType: 'Repas',
    goals: 'Objectifs santé',
    favourites: 'Favoris',
    filters: 'Filtres',
    activeFilters: 'Actifs:',
    rating: 'Note',
  },
  es: {
    searchPlaceholder: 'Buscar recetas…',
    minutes: 'min',
    servings: (n) => `${n} porción${n !== 1 ? 'es' : ''}`,
    viewRecipe: 'Ver receta',
    noResults: 'No se encontraron recetas.',
    noResultsHint: 'Prueba una búsqueda o filtro diferente.',
    noFavourites: 'Aún no hay recetas favoritas.',
    noFavouritesHint: 'Toca el corazón en una receta para guardarla.',
    featured: 'Destacado',
    total: (n) => `${n} receta${n !== 1 ? 's' : ''}`,
    clearAll: 'Borrar todos los filtros',
    difficulty: 'Dificultad',
    dailyDozen: 'Daily Dozen',
    course: 'Plato',
    mealType: 'Comida',
    goals: 'Objetivos de salud',
    favourites: 'Favoritos',
    filters: 'Filtros',
    activeFilters: 'Activos:',
    rating: 'Valoración',
  },
  it: {
    searchPlaceholder: 'Cerca ricette…',
    minutes: 'min',
    servings: (n) => n === 1 ? '1 porzione' : `${n} porzioni`,
    viewRecipe: 'Vedi ricetta',
    noResults: 'Nessuna ricetta trovata.',
    noResultsHint: 'Prova una ricerca o un filtro diverso.',
    noFavourites: 'Nessuna ricetta preferita ancora.',
    noFavouritesHint: 'Tocca il cuore su una ricetta per salvarla.',
    featured: 'In evidenza',
    total: (n) => n === 1 ? '1 ricetta' : `${n} ricette`,
    clearAll: 'Cancella tutti i filtri',
    difficulty: 'Difficoltà',
    dailyDozen: 'Daily Dozen',
    course: 'Portata',
    mealType: 'Pasto',
    goals: 'Obiettivi di salute',
    favourites: 'Preferiti',
    filters: 'Filtri',
    activeFilters: 'Attivi:',
    rating: 'Valutazione',
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
  averageRatings: Record<string, number>;
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
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
        active
          ? 'bg-[#0e393d] text-white'
          : 'bg-white text-[#1c2a2b]/65 border border-[#0e393d]/12 hover:border-[#0e393d]/25 hover:text-[#1c2a2b]'
      }`}
    >
      {children}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-[#0e393d]/6 last:border-0">
      <span className="shrink-0 w-28 text-[11px] font-semibold uppercase tracking-wider text-[#ceab84] pt-1">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipesGrid({ recipes, lang, courseTypes, mealTypes, ddCategories, userId, initialFavouriteIds, averageRatings }: Props) {
  const t = T[lang] ?? T.en;

  const [search, setSearch] = useState('');
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [ddSlugs, setDdSlugs] = useState<string[]>([]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [mealTypeIds, setMealTypeIds] = useState<string[]>([]);
  const [goalKeys, setGoalKeys] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [showFavourites, setShowFavourites] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(() => new Set(initialFavouriteIds));

  const handleFavouriteToggle = (recipeId: string, isFavourited: boolean) => {
    setFavouriteIds((prev) => {
      const next = new Set(prev);
      if (isFavourited) next.add(recipeId);
      else next.delete(recipeId);
      return next;
    });
  };

  // Panel-only filter count (excludes favourites and search)
  const filterCount = difficulties.length + ddSlugs.length + courseIds.length + mealTypeIds.length + goalKeys.length + (minRating != null ? 1 : 0);

  const clearPanelFilters = () => {
    setDifficulties([]);
    setDdSlugs([]);
    setCourseIds([]);
    setMealTypeIds([]);
    setGoalKeys([]);
    setMinRating(null);
  };

  // Active filter chips for display when panel is collapsed
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; remove: () => void }[] = [];
    difficulties.forEach((d) => {
      const cfg = DIFF_CFG[d as 'easy' | 'medium' | 'hard'];
      chips.push({
        id: `diff-${d}`,
        label: (cfg?.label as Record<string, string>)?.[lang] ?? cfg?.label.en ?? d,
        remove: () => setDifficulties((p) => p.filter((x) => x !== d)),
      });
    });
    ddSlugs.forEach((s) => {
      const dd = ddCategories.find((c) => c.slug === s);
      chips.push({
        id: `dd-${s}`,
        label: `${dd?.icon ?? ''} ${dd?.name?.[lang] || dd?.name?.en || s}`.trim(),
        remove: () => setDdSlugs((p) => p.filter((x) => x !== s)),
      });
    });
    courseIds.forEach((id) => {
      const ct = courseTypes.find((c) => c.id === id);
      chips.push({
        id: `course-${id}`,
        label: ct?.name?.[lang] || ct?.name?.en || id,
        remove: () => setCourseIds((p) => p.filter((x) => x !== id)),
      });
    });
    mealTypeIds.forEach((id) => {
      const mt = mealTypes.find((m) => m.id === id);
      chips.push({
        id: `meal-${id}`,
        label: mt?.name?.[lang] || mt?.name?.en || id,
        remove: () => setMealTypeIds((p) => p.filter((x) => x !== id)),
      });
    });
    goalKeys.forEach((g) => {
      const gt = GOAL_TAGS.find((x) => x.key === g);
      chips.push({
        id: `goal-${g}`,
        label: (gt?.label as Record<string, string>)?.[lang] ?? gt?.label.en ?? g,
        remove: () => setGoalKeys((p) => p.filter((x) => x !== g)),
      });
    });
    if (minRating != null) {
      chips.push({
        id: `rating-${minRating}`,
        label: minRating === 5 ? '★ 5' : `★ ${minRating}+`,
        remove: () => setMinRating(null),
      });
    }
    return chips;
  }, [difficulties, ddSlugs, courseIds, mealTypeIds, goalKeys, minRating, lang, ddCategories, courseTypes, mealTypes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return recipes.filter((r) => {
      if (showFavourites && !favouriteIds.has(r.id)) return false;
      if (difficulties.length && !difficulties.includes(r.difficulty ?? '')) return false;
      if (ddSlugs.length && !ddSlugs.every((s) => r.daily_dozen_categories.some((c) => c.slug === s))) return false;
      if (courseIds.length && !courseIds.includes(r.course_type_id ?? '')) return false;
      if (mealTypeIds.length && !mealTypeIds.some((id) => r.meal_type_ids.includes(id))) return false;
      if (goalKeys.length && !goalKeys.every((g) => r.goals.includes(g))) return false;
      if (minRating != null && (averageRatings[r.id] ?? 0) < minRating) return false;
      if (q) {
        const de = r.title?.de?.toLowerCase() ?? '';
        const en = r.title?.en?.toLowerCase() ?? '';
        if (!de.includes(q) && !en.includes(q)) return false;
      }
      return true;
    });
  }, [recipes, search, difficulties, ddSlugs, courseIds, mealTypeIds, goalKeys, minRating, showFavourites, favouriteIds, averageRatings]);

  return (
    <div>
      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div className="mb-6">

        {/* Top row: search + favourites pill + filters button + count */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/35 pointer-events-none"
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-[#0e393d]/12 bg-white pl-9 pr-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/35 focus:border-[#0e393d]/35 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/8 transition"
            />
          </div>

          {/* Favourites pill */}
          {userId && (
            <button
              type="button"
              onClick={() => setShowFavourites(!showFavourites)}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition border ${
                showFavourites
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-[#0e393d]/12 text-[#1c2a2b]/60 hover:border-[#0e393d]/25 hover:text-[#1c2a2b]'
              }`}
            >
              <span className="text-base leading-none">{showFavourites ? '♥' : '♡'}</span>
              <span className="hidden sm:inline">{t.favourites}</span>
            </button>
          )}

          {/* Filters button */}
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`shrink-0 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition border ${
              filtersOpen || filterCount > 0
                ? 'bg-[#0e393d] border-[#0e393d] text-white'
                : 'bg-white border-[#0e393d]/12 text-[#1c2a2b]/60 hover:border-[#0e393d]/25 hover:text-[#1c2a2b]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            <span>{t.filters}</span>
            {filterCount > 0 && (
              <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none ${
                filtersOpen ? 'bg-white text-[#0e393d]' : 'bg-[#0e393d] text-white'
              }`}>
                {filterCount}
              </span>
            )}
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Count */}
          <span className="shrink-0 text-xs text-[#1c2a2b]/40 font-medium whitespace-nowrap hidden sm:block">
            {t.total(filtered.length)}
          </span>
        </div>

        {/* Active filter chips (shown when panel is closed and filters are active) */}
        {!filtersOpen && activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1c2a2b]/35">
              {t.activeFilters}
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={chip.remove}
                className="flex items-center gap-1 rounded-full bg-[#0e393d] text-white px-2.5 py-0.5 text-xs font-medium hover:bg-[#0e393d]/80 transition"
              >
                {chip.label}
                <span className="text-white/70">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* Collapsible filter panel */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${filtersOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="mt-3 rounded-2xl bg-[#f5f4f0] border border-[#0e393d]/8 px-5 py-3">

            {/* Difficulty */}
            <FilterRow label={t.difficulty}>
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <Pill
                  key={d}
                  active={difficulties.includes(d)}
                  onClick={() => setDifficulties(toggle(difficulties, d))}
                >
                  {(DIFF_CFG[d].label as Record<string, string>)[lang] ?? DIFF_CFG[d].label.en}
                </Pill>
              ))}
            </FilterRow>

            {/* Rating */}
            <FilterRow label={t.rating}>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = minRating != null && n <= minRating;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMinRating(minRating === n ? null : n)}
                      aria-label={`Minimum ${n} star${n !== 1 ? 's' : ''}`}
                      className="w-7 h-7 flex items-center justify-center transition-transform hover:scale-110"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24"
                        fill={filled ? '#ceab84' : 'none'}
                        stroke={filled ? '#ceab84' : '#0e393d'}
                        strokeOpacity={filled ? 1 : 0.25}
                        strokeWidth="1.5"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </button>
                  );
                })}
                {minRating != null && (
                  <span className="ml-1 text-xs text-[#1c2a2b]/40">
                    {minRating === 5 ? '5 ★' : `${minRating}+ ★`}
                  </span>
                )}
              </div>
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
                  {(g.label as Record<string, string>)[lang] ?? g.label.en}
                </Pill>
              ))}
            </FilterRow>

            {/* Clear all */}
            {filterCount > 0 && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={clearPanelFilters}
                  className="text-xs font-medium text-[#0e393d] underline underline-offset-2 hover:text-[#0e393d]/70 transition"
                >
                  {t.clearAll}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile count (below the filter row) */}
        <div className="sm:hidden mt-2 text-xs text-[#1c2a2b]/40 font-medium">
          {t.total(filtered.length)}
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
            const title   = recipe.title?.[lang] || recipe.title?.en || recipe.title?.de || '';
            const desc    = recipe.description?.[lang] || recipe.description?.en || recipe.description?.de || '';
            const time    = totalTime(recipe.prep_time_min, recipe.cook_time_min);
            const href    = `/recipes/${recipe.slug ?? recipe.id}`;
            const diffCfg = recipe.difficulty ? DIFF_CFG[recipe.difficulty] : null;

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
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#0e393d]/20">
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
                  <Link href={href}>
                    <h2 className="font-serif text-lg text-[#0e393d] leading-snug mb-1.5 group-hover:text-[#1a5055] transition-colors line-clamp-2">
                      {title}
                    </h2>
                  </Link>

                  {desc && (
                    <p className="text-sm text-[#1c2a2b]/55 leading-relaxed line-clamp-2 mb-3">{desc}</p>
                  )}

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
                        {(diffCfg.label as Record<string, string>)[lang] ?? diffCfg.label.en}
                      </span>
                    )}
                  </div>

                  {recipe.daily_dozen_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {recipe.daily_dozen_categories.slice(0, 6).map((cat) => {
                        const ddEntry = ddCategories.find((d) => d.slug === cat.slug);
                        const ddName  = ddEntry?.name?.[lang] || ddEntry?.name?.en || cat.slug;
                        return (
                          <span key={cat.slug} title={ddName} className="rounded-full bg-[#ceab84]/12 px-1.5 py-0.5 text-sm leading-none">
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

                  <Link href={href} className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-[#0e393d] hover:text-[#0e393d]/70 transition">
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
