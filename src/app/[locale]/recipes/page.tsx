import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import RecipesGrid, { type RecipeCard } from '@/components/RecipesGrid';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const metaLang = locale === 'en' ? 'en' : 'de';
  return buildMeta({ ...PAGE_META.recipes[metaLang], path: '/recipes', locale });
}

const T = {
  de: { eyebrow: 'Küche', heading: 'Gesund kochen', sub: 'Vollwertige Rezepte passend zu deinen Gesundheitszielen.' },
  en: { eyebrow: 'Kitchen', heading: 'Eat well', sub: 'Whole-food recipes matched to your health goals.' },
};

export default async function RecipesPage() {
  const locale = await getLocale();
  const t = (T as Record<string, typeof T.en>)[locale] ?? T.en;
  const supabase = await createClient();

  // 1. Fetch recipes
  const { data: rows } = await supabase
    .from('recipes')
    .select('id, slug, title, description, image_url, prep_time_min, cook_time_min, servings, difficulty, is_featured, course_type_id')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  const recipeIds = (rows ?? []).map((r) => r.id);

  // 2. Parallel fetches
  const [
    { data: ddRows },
    { data: mealTagRows },
    { data: goalTagRows },
    { data: courseTypesRaw },
    { data: mealTypesRaw },
    { data: ddCategoriesRaw },
  ] = await Promise.all([
    recipeIds.length > 0
      ? supabase
          .from('v_recipe_daily_dozen_coverage')
          .select('recipe_id, category_slug, category_icon')
          .in('recipe_id', recipeIds)
      : Promise.resolve({ data: [] as { recipe_id: string; category_slug: string; category_icon: string }[] }),
    recipeIds.length > 0
      ? supabase
          .from('recipe_meal_type_tags')
          .select('recipe_id, meal_type_id')
          .in('recipe_id', recipeIds)
      : Promise.resolve({ data: [] as { recipe_id: string; meal_type_id: string }[] }),
    recipeIds.length > 0
      ? supabase
          .from('recipe_goal_tags')
          .select('recipe_id, goal')
          .in('recipe_id', recipeIds)
      : Promise.resolve({ data: [] as { recipe_id: string; goal: string }[] }),
    supabase
      .from('recipe_course_types')
      .select('id, slug, name, sort_order')
      .order('sort_order'),
    supabase
      .from('recipe_meal_types')
      .select('id, slug, name, sort_order')
      .order('sort_order'),
    supabase
      .from('daily_dozen_categories')
      .select('id, slug, name, icon')
      .order('sort_order'),
  ]);

  // 3. Build maps
  const ddByRecipe: Record<string, { slug: string; icon: string }[]> = {};
  for (const dd of ddRows ?? []) {
    if (!ddByRecipe[dd.recipe_id]) ddByRecipe[dd.recipe_id] = [];
    ddByRecipe[dd.recipe_id].push({ slug: dd.category_slug, icon: dd.category_icon });
  }

  const mealsByRecipe: Record<string, string[]> = {};
  for (const mt of mealTagRows ?? []) {
    if (!mealsByRecipe[mt.recipe_id]) mealsByRecipe[mt.recipe_id] = [];
    mealsByRecipe[mt.recipe_id].push(mt.meal_type_id);
  }

  const goalsByRecipe: Record<string, string[]> = {};
  for (const g of goalTagRows ?? []) {
    if (!goalsByRecipe[g.recipe_id]) goalsByRecipe[g.recipe_id] = [];
    goalsByRecipe[g.recipe_id].push(g.goal);
  }

  // 4. Construct RecipeCard array
  const recipes: RecipeCard[] = (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug ?? null,
    title: r.title ?? null,
    description: r.description ?? null,
    image_url: r.image_url ?? null,
    prep_time_min: r.prep_time_min ?? null,
    cook_time_min: r.cook_time_min ?? null,
    servings: r.servings ?? null,
    difficulty: r.difficulty ?? null,
    is_featured: r.is_featured ?? null,
    course_type_id: r.course_type_id ?? null,
    daily_dozen_categories: ddByRecipe[r.id] ?? [],
    meal_type_ids: mealsByRecipe[r.id] ?? [],
    goals: goalsByRecipe[r.id] ?? [],
  }));

  const courseTypes = (courseTypesRaw ?? []) as { id: string; name: Record<string, string> }[];
  const mealTypes   = (mealTypesRaw ?? []) as { id: string; name: Record<string, string> }[];
  const ddCategories = (ddCategoriesRaw ?? []) as { slug: string; name: Record<string, string>; icon: string }[];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-28 pb-12">
        {/* Hero */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.heading}</h1>
          <p className="text-[#1c2a2b]/60 text-base max-w-xl">{t.sub}</p>
        </div>

        <RecipesGrid
          recipes={recipes}
          lang={locale}
          courseTypes={courseTypes}
          mealTypes={mealTypes}
          ddCategories={ddCategories}
        />
      </main>

      <PublicFooter />
    </div>
  );
}
