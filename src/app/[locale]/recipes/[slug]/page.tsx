import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import AddToShoppingListButton from '@/components/AddToShoppingListButton';
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
  },
};

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

function renderMarkdown(md: string): React.ReactNode[] {
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

    if (trimmed.startsWith('## ')) {
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
      id, slug, title, description, instructions, image_url,
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
            src={recipe.image_url}
            alt={title}
            className="w-full h-64 object-cover rounded-2xl border border-[#0e393d]/10 mb-8"
          />
        )}

        {/* Header */}
        <div className="mb-8">
          {recipe.is_featured && (
            <span className="inline-block mb-2 bg-[#ceab84] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
              ★ {t.featured}
            </span>
          )}
          <h1 className="font-serif text-3xl text-[#0e393d] mb-3">{title}</h1>
          {description && (
            <p className="text-[#1c2a2b]/60 text-base leading-relaxed">{description}</p>
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
            {/* Ingredients */}
            {ingredients.length > 0 && (
              <section className="mb-10">
                <h2 className="font-serif text-xl text-[#0e393d] mb-4">{t.ingredients}</h2>
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
                        className="flex items-center gap-3 rounded-xl border border-[#0e393d]/10 bg-white px-4 py-3"
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
                        <AddToShoppingListButton
                          ingredientName={ingName}
                          amount={displayAmount}
                          unit={typeof ing.unit === 'string' ? ing.unit : null}
                          recipeId={recipe.id}
                          lang={locale}
                          compact
                        />
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
                <div>{renderMarkdown(instructions)}</div>
              </section>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">

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
