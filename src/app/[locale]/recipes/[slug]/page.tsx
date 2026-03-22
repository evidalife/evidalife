import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import AddToShoppingListButton from '@/components/AddToShoppingListButton';
import AddAllToShoppingListButton from '@/components/AddAllToShoppingListButton';
import RecipeRating from '@/components/RecipeRating';
import PrintButton from '@/components/PrintButton';
import RecipeGallery, { type GalleryPhoto } from '@/components/RecipeGallery';

function supabaseTransform(url: string | null, width: number, height?: number): string | null {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  const rendered = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return height ? `${rendered}?width=${width}&height=${height}&resize=cover` : `${rendered}?width=${width}&resize=cover`;
}
import { createClient } from '@/lib/supabase/server';

type Lang = 'de' | 'en';

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T = {
  de: {
    back: 'Rezepte',
    prep: 'Vorbereitung',
    cook: 'Kochzeit',
    total: 'Gesamt',
    servings: (n: number) => `${n} ${n === 1 ? 'Portion' : 'Portionen'}`,
    minutes: 'Min.',
    difficulty: { easy: 'Einfach', medium: 'Mittel', hard: 'Schwer' },
    ingredients: 'Zutaten',
    instructions: 'Zubereitung',
    nutrition: 'Nährwerte',
    per_serving: 'pro Portion',
    calories: 'Kalorien',
    protein: 'Eiweiß',
    fat: 'Fett',
    carbs: 'Kohlenhydrate',
    fiber: 'Ballaststoffe',
    featured: 'Empfohlen',
    goals: 'Gesundheitsziele',
    daily_dozen: 'Daily Dozen',
    print: 'Drucken',
  },
  en: {
    back: 'Recipes',
    prep: 'Prep',
    cook: 'Cook',
    total: 'Total',
    servings: (n: number) => `${n} serving${n !== 1 ? 's' : ''}`,
    minutes: 'min',
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    nutrition: 'Nutrition',
    per_serving: 'per serving',
    calories: 'Calories',
    protein: 'Protein',
    fat: 'Fat',
    carbs: 'Carbs',
    fiber: 'Fiber',
    featured: 'Featured',
    goals: 'Health Goals',
    daily_dozen: 'Daily Dozen',
    print: 'Print',
  },
};

const DD_LABELS: Record<string, { de: string; en: string }> = {
  beans:        { de: 'Hülsenfrüchte',     en: 'Beans' },
  berries:      { de: 'Beeren',            en: 'Berries' },
  fruits:       { de: 'Früchte',           en: 'Other Fruits' },
  cruciferous:  { de: 'Kreuzblütler',      en: 'Cruciferous' },
  greens:       { de: 'Grüns',             en: 'Greens' },
  vegetables:   { de: 'Gemüse',            en: 'Other Vegetables' },
  flaxseeds:    { de: 'Leinsamen',         en: 'Flaxseeds' },
  nuts:         { de: 'Nüsse & Samen',     en: 'Nuts & Seeds' },
  herbs_spices: { de: 'Kräuter & Gewürze', en: 'Herbs & Spices' },
  whole_grains:           { de: 'Vollkorn',       en: 'Whole Grains' },
  beverages:              { de: 'Getränke',       en: 'Beverages' },
  exercise:               { de: 'Bewegung',       en: 'Exercise' },
};

const GOAL_LABELS: Record<string, { de: string; en: string }> = {
  weight_loss:         { de: 'Gewichtsverlust',     en: 'Weight Loss' },
  heart_health:        { de: 'Herzgesundheit',       en: 'Heart Health' },
  anti_inflammation:   { de: 'Anti-Entzündung',      en: 'Anti-Inflammation' },
  longevity:           { de: 'Langlebigkeit',        en: 'Longevity' },
  gut_health:          { de: 'Darmgesundheit',       en: 'Gut Health' },
  energy:              { de: 'Energie',              en: 'Energy' },
  immune:              { de: 'Immunsystem',          en: 'Immune Support' },
  bone_health:         { de: 'Knochengesundheit',    en: 'Bone Health' },
  brain_health:        { de: 'Gehirngesundheit',     en: 'Brain Health' },
  diabetes_prevention: { de: 'Diabetesprävention',  en: 'Diabetes Prevention' },
};

const DIFF_CLS = {
  easy:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  hard:   'bg-red-50 text-red-700 ring-1 ring-red-600/20',
};

// ─── Inline markdown renderer ─────────────────────────────────────────────────

function renderMarkdown(md: string, gallery: GalleryPhoto[] = []): React.ReactNode[] {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key++} className="list-disc list-inside space-y-1 text-[#1c2a2b]/75 text-sm leading-relaxed mb-4">
        {listBuffer.map((item, i) => <li key={i}>{inlineFormat(item)}</li>)}
      </ul>
    );
    listBuffer = [];
  };

  const inlineFormat = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[#1c2a2b]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Inline gallery photo reference: ![photo:N]
    const photoMatch = trimmed.match(/^!\[photo:(\d+)\]$/);
    if (photoMatch) {
      flushList();
      const n = parseInt(photoMatch[1], 10);
      const p = gallery[n - 1]; // 1-indexed
      if (p) {
        nodes.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img key={key++} src={p.url} alt="" className="w-full rounded-xl object-cover my-4" />
        );
      }
    } else if (trimmed.startsWith('## ')) {
      flushList();
      nodes.push(
        <h3 key={key++} className="font-serif text-lg text-[#0e393d] mt-6 mb-2">{trimmed.slice(3)}</h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      nodes.push(
        <h2 key={key++} className="font-serif text-xl text-[#0e393d] mt-6 mb-2">{trimmed.slice(2)}</h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={key++} className="text-sm text-[#1c2a2b]/75 leading-relaxed mb-3">{inlineFormat(trimmed)}</p>
      );
    }
  }

  flushList();
  return nodes;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as Lang;
  const t = T[locale];
  const supabase = await createClient();

  // Fetch recipe
  const { data: recipe } = await supabase
    .from('recipes')
    .select(`
      id, slug, title, description, instructions, image_url, image_gallery,
      prep_time_min, cook_time_min, servings, difficulty, is_featured,
      nutrition_info,
      recipe_ingredients(id, ingredient_name, amount, unit, notes, is_optional, sort_order, section_header),
      recipe_goal_tags(goal)
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .single();

  if (!recipe) notFound();

  // Fetch Daily Dozen coverage from view
  const { data: ddRows } = await supabase
    .from('v_recipe_daily_dozen_coverage')
    .select('category_slug, category_icon')
    .eq('recipe_id', recipe.id);

  // Fetch recipe ratings aggregate
  const { data: ratingsData } = await supabase
    .from('recipe_ratings')
    .select('rating')
    .eq('recipe_id', recipe.id);
  const ratingCount = ratingsData?.length ?? 0;
  const ratingAvg = ratingCount > 0
    ? (ratingsData!.reduce((sum, r) => sum + (r.rating as number), 0) / ratingCount)
    : null;

  const title       = recipe.title?.[locale] || recipe.title?.de || recipe.title?.en || '';
  const description = recipe.description?.[locale] || recipe.description?.de || '';
  const instructions = recipe.instructions?.[locale] || recipe.instructions?.de || '';

  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const ddTags  = (ddRows ?? []) as { category_slug: string; category_icon: string }[];
  const goals   = (recipe.recipe_goal_tags ?? []) as { goal: string }[];
  const nutrition = recipe.nutrition_info as {
    calories?: number; protein_g?: number; fat_g?: number; carbs_g?: number; fiber_g?: number;
  } | null;

  const gallery = ((recipe.image_gallery ?? []) as GalleryPhoto[]).sort((a, b) => a.order - b.order);

  const totalTime =
    (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0) || null;

  const diffKey = recipe.difficulty as 'easy' | 'medium' | 'hard' | null;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 pt-28 pb-12">

        {/* Breadcrumb */}
        <nav className="mb-8 text-xs text-[#1c2a2b]/40">
          <Link href="/recipes" className="hover:text-[#0e393d] transition">{t.back}</Link>
          <span className="mx-2">›</span>
          <span className="text-[#1c2a2b]/60">{title}</span>
        </nav>

        {/* Hero image */}
        {recipe.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={supabaseTransform(recipe.image_url, 1200) ?? recipe.image_url}
            alt={title}
            className="w-full h-64 object-cover rounded-2xl border border-[#0e393d]/10 mb-8"
          />
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              {recipe.is_featured && (
                <span className="inline-block mb-2 bg-[#ceab84] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                  ★ {t.featured}
                </span>
              )}
              <h1 className="font-serif text-3xl text-[#0e393d]">{title}</h1>
            </div>
            <PrintButton label={t.print} />
          </div>
          {description && (
            <p className="text-[#1c2a2b]/60 text-base leading-relaxed mt-3">{description}</p>
          )}
        </div>

        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8 pb-8 border-b border-[#0e393d]/10 text-sm text-[#1c2a2b]/60">
          {recipe.prep_time_min != null && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">{t.prep}</span>
              <span className="font-medium text-[#1c2a2b]">{recipe.prep_time_min} {t.minutes}</span>
            </div>
          )}
          {recipe.cook_time_min != null && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">{t.cook}</span>
              <span className="font-medium text-[#1c2a2b]">{recipe.cook_time_min} {t.minutes}</span>
            </div>
          )}
          {totalTime != null && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">{t.total}</span>
              <span className="font-medium text-[#1c2a2b]">{totalTime} {t.minutes}</span>
            </div>
          )}
          {recipe.servings != null && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">&nbsp;</span>
              <span className="font-medium text-[#1c2a2b]">{t.servings(recipe.servings)}</span>
            </div>
          )}
          {diffKey && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${DIFF_CLS[diffKey]}`}>
              {t.difficulty[diffKey]}
            </span>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid gap-10 lg:grid-cols-[1fr_280px]">

          {/* Left: Instructions */}
          <div>
            {/* Gallery */}
            {gallery.length > 0 && <RecipeGallery photos={gallery} />}

            {/* Ingredients */}
            {ingredients.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-[#0e393d]">{t.ingredients}</h2>
                  <span data-print-hide>
                    <AddAllToShoppingListButton
                      ingredients={ingredients.filter((i) => !i.section_header)}
                      recipeId={recipe.id}
                      lang={locale}
                    />
                  </span>
                </div>
                <ul className="space-y-2">
                  {ingredients.map((ing) => {
                    // Section header row
                    if (ing.section_header) {
                      return (
                        <li key={ing.id} className="pt-3 pb-1 first:pt-0">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#ceab84]">
                            {ing.section_header}
                          </h3>
                        </li>
                      );
                    }
                    const ingName = typeof ing.ingredient_name === 'object' && ing.ingredient_name !== null
                      ? (ing.ingredient_name as { de?: string; en?: string })?.[locale] || (ing.ingredient_name as { de?: string; en?: string })?.de || ''
                      : String(ing.ingredient_name || '');
                    const rawNotes = ing.notes;
                    const notesText = !rawNotes ? '' :
                      typeof rawNotes === 'object'
                        ? ((rawNotes as { de?: string; en?: string })?.[locale] || (rawNotes as { de?: string; en?: string })?.de || '')
                        : String(rawNotes);
                    const displayAmount = ing.amount != null ? ing.amount : null;
                    return (
                      <li
                        key={ing.id}
                        className="flex items-center gap-3 rounded-xl border border-[#0e393d]/10 bg-white px-4 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[#1c2a2b]">{ingName}</span>
                          {notesText && (
                            <span className="ml-1.5 text-xs text-[#1c2a2b]/40">({notesText})</span>
                          )}
                        </div>
                        {(displayAmount != null || ing.unit) && (
                          <span className="shrink-0 text-sm text-[#1c2a2b]/50">
                            {displayAmount != null ? displayAmount : ''}{ing.unit ? ` ${ing.unit}` : ''}
                          </span>
                        )}
                        <span data-print-hide>
                          <AddToShoppingListButton
                            ingredientName={ingName}
                            amount={displayAmount}
                            unit={typeof ing.unit === 'string' ? ing.unit : null}
                            recipeId={recipe.id}
                            lang={locale}
                            compact
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Instructions */}
            {instructions && (
              <section>
                <h2 className="font-serif text-xl text-[#0e393d] mb-4">{t.instructions}</h2>
                <div>{renderMarkdown(instructions, gallery)}</div>
              </section>
            )}

            {/* ── Print-only sidebar content ───────────────────────────────── */}
            <div className="hidden print:block mt-8 pt-6 border-t border-[#0e393d]/15 space-y-6">

              {/* Nutrition */}
              {nutrition && Object.values(nutrition).some((v) => v != null) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">{t.nutrition}{recipe.servings != null ? ` · ${t.per_serving}` : ''}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {nutrition.calories  != null && <span className="text-sm text-[#1c2a2b]">{t.calories}: <strong>{nutrition.calories}</strong></span>}
                    {nutrition.protein_g != null && <span className="text-sm text-[#1c2a2b]">{t.protein}: <strong>{nutrition.protein_g} g</strong></span>}
                    {nutrition.fat_g     != null && <span className="text-sm text-[#1c2a2b]">{t.fat}: <strong>{nutrition.fat_g} g</strong></span>}
                    {nutrition.carbs_g   != null && <span className="text-sm text-[#1c2a2b]">{t.carbs}: <strong>{nutrition.carbs_g} g</strong></span>}
                    {nutrition.fiber_g   != null && <span className="text-sm text-[#1c2a2b]">{t.fiber}: <strong>{nutrition.fiber_g} g</strong></span>}
                  </div>
                </div>
              )}

              {/* Daily Dozen */}
              {ddTags.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">{t.daily_dozen}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ddTags.map((tag) => (
                      <span key={tag.category_slug} className="text-sm text-[#1c2a2b]">
                        {tag.category_icon} {DD_LABELS[tag.category_slug]?.[locale] ?? tag.category_slug}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Goals */}
              {goals.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">{t.goals}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {goals.map((g) => (
                      <span key={g.goal} className="text-sm text-[#1c2a2b]">
                        {GOAL_LABELS[g.goal]?.[locale] ?? g.goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">

            {/* Ratings */}
            <RecipeRating
              recipeId={recipe.id}
              initialAvg={ratingAvg}
              initialCount={ratingCount}
              lang={locale}
            />

            {/* Nutrition */}
            {nutrition && Object.values(nutrition).some((v) => v != null) && (
              <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-1">{t.nutrition}</p>
                {recipe.servings != null && (
                  <p className="text-[11px] text-[#1c2a2b]/40 mb-4">{t.per_serving}</p>
                )}
                <div className="space-y-2.5">
                  {nutrition.calories != null && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[#1c2a2b]/70">{t.calories}</span>
                      <span className="text-sm font-semibold text-[#0e393d]">{nutrition.calories}</span>
                    </div>
                  )}
                  {nutrition.protein_g != null && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[#1c2a2b]/70">{t.protein}</span>
                      <span className="text-sm font-medium text-[#1c2a2b]">{nutrition.protein_g} g</span>
                    </div>
                  )}
                  {nutrition.fat_g != null && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[#1c2a2b]/70">{t.fat}</span>
                      <span className="text-sm font-medium text-[#1c2a2b]">{nutrition.fat_g} g</span>
                    </div>
                  )}
                  {nutrition.carbs_g != null && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[#1c2a2b]/70">{t.carbs}</span>
                      <span className="text-sm font-medium text-[#1c2a2b]">{nutrition.carbs_g} g</span>
                    </div>
                  )}
                  {nutrition.fiber_g != null && (
                    <div className="flex justify-between items-baseline border-t border-[#0e393d]/8 pt-2.5 mt-2">
                      <span className="text-sm text-[#1c2a2b]/70">{t.fiber}</span>
                      <span className="text-sm font-medium text-[#1c2a2b]">{nutrition.fiber_g} g</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Daily Dozen */}
            {ddTags.length > 0 && (
              <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{t.daily_dozen}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ddTags.map((tag) => (
                    <span
                      key={tag.category_slug}
                      className="rounded-full bg-[#ceab84]/12 px-2.5 py-1 text-xs font-medium text-[#8a6a3e]"
                    >
                      {tag.category_icon} {DD_LABELS[tag.category_slug]?.[locale] ?? tag.category_slug}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Goal tags */}
            {goals.length > 0 && (
              <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{t.goals}</p>
                <div className="flex flex-wrap gap-1.5">
                  {goals.map((g) => (
                    <span
                      key={g.goal}
                      className="rounded-full bg-[#0e393d]/6 px-2.5 py-1 text-xs font-medium text-[#0e393d]/70"
                    >
                      {GOAL_LABELS[g.goal]?.[locale] ?? g.goal}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
