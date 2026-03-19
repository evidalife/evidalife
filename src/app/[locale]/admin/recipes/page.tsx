import { createClient } from '@/lib/supabase/server';
import RecipesManager, { type RecipeListItem } from '@/components/admin/recipes/RecipesManager';

export default async function RecipesPage() {
  const supabase = await createClient();

  // 1. Fetch recipes
  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id, title, difficulty, prep_time_min, cook_time_min, servings,
      is_published, is_featured, image_url, created_at, course_type_id,
      course_type:recipe_course_types(name)
    `)
    .order('created_at', { ascending: false });

  const recipeIds = (recipes ?? []).map((r) => r.id);

  // 2. Parallel fetches for associated data + lookup tables
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
    supabase.from('recipe_course_types').select('id, name, sort_order').order('sort_order'),
    supabase.from('recipe_meal_types').select('id, name, sort_order').order('sort_order'),
    supabase.from('daily_dozen_categories').select('id, slug, name, icon').order('sort_order'),
  ]);

  // 3. Build maps
  const ddIconsByRecipe: Record<string, string[]> = {};
  const ddSlugsByRecipe: Record<string, string[]> = {};
  for (const row of ddRows ?? []) {
    if (!ddIconsByRecipe[row.recipe_id]) ddIconsByRecipe[row.recipe_id] = [];
    ddIconsByRecipe[row.recipe_id].push(row.category_icon);
    if (!ddSlugsByRecipe[row.recipe_id]) ddSlugsByRecipe[row.recipe_id] = [];
    ddSlugsByRecipe[row.recipe_id].push(row.category_slug);
  }

  const mealTagsByRecipe: Record<string, string[]> = {};
  for (const row of mealTagRows ?? []) {
    if (!mealTagsByRecipe[row.recipe_id]) mealTagsByRecipe[row.recipe_id] = [];
    mealTagsByRecipe[row.recipe_id].push(row.meal_type_id);
  }

  const goalsByRecipe: Record<string, string[]> = {};
  for (const row of goalTagRows ?? []) {
    if (!goalsByRecipe[row.recipe_id]) goalsByRecipe[row.recipe_id] = [];
    goalsByRecipe[row.recipe_id].push(row.goal);
  }

  // 4. Merge all per-recipe data
  const mergedRecipes = (recipes ?? []).map((r) => ({
    ...r,
    meal_type_ids: mealTagsByRecipe[r.id] ?? [],
    dd_slugs: ddSlugsByRecipe[r.id] ?? [],
    goals: goalsByRecipe[r.id] ?? [],
  }));

  const courseTypes  = (courseTypesRaw ?? []) as { id: string; name: { en?: string; de?: string } }[];
  const mealTypes    = (mealTypesRaw ?? []) as { id: string; name: { en?: string; de?: string } }[];
  const ddCategories = (ddCategoriesRaw ?? []) as { slug: string; name: { en?: string; de?: string }; icon: string }[];

  return (
    <RecipesManager
      initialRecipes={mergedRecipes as unknown as RecipeListItem[]}
      initialDdIcons={ddIconsByRecipe}
      courseTypes={courseTypes}
      mealTypes={mealTypes}
      ddCategories={ddCategories}
    />
  );
}
