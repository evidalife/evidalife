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
    { data: courseTypesRaw },
    { data: mealTypesRaw },
  ] = await Promise.all([
    recipeIds.length > 0
      ? supabase
          .from('v_recipe_daily_dozen_coverage')
          .select('recipe_id, category_icon')
          .in('recipe_id', recipeIds)
      : Promise.resolve({ data: [] as { recipe_id: string; category_icon: string }[] }),
    recipeIds.length > 0
      ? supabase
          .from('recipe_meal_type_tags')
          .select('recipe_id, meal_type_id')
          .in('recipe_id', recipeIds)
      : Promise.resolve({ data: [] as { recipe_id: string; meal_type_id: string }[] }),
    supabase
      .from('recipe_course_types')
      .select('id, name, sort_order')
      .order('sort_order'),
    supabase
      .from('recipe_meal_types')
      .select('id, name, sort_order')
      .order('sort_order'),
  ]);

  // 3. Build maps
  const ddIconsByRecipe: Record<string, string[]> = {};
  for (const row of ddRows ?? []) {
    if (!ddIconsByRecipe[row.recipe_id]) ddIconsByRecipe[row.recipe_id] = [];
    ddIconsByRecipe[row.recipe_id].push(row.category_icon);
  }

  const mealTagsByRecipe: Record<string, string[]> = {};
  for (const row of mealTagRows ?? []) {
    if (!mealTagsByRecipe[row.recipe_id]) mealTagsByRecipe[row.recipe_id] = [];
    mealTagsByRecipe[row.recipe_id].push(row.meal_type_id);
  }

  // 4. Merge meal_type_ids into recipe objects
  const mergedRecipes = (recipes ?? []).map((r) => ({
    ...r,
    meal_type_ids: mealTagsByRecipe[r.id] ?? [],
  }));

  const courseTypes = (courseTypesRaw ?? []) as { id: string; name: { en?: string; de?: string } }[];
  const mealTypes   = (mealTypesRaw ?? []) as { id: string; name: { en?: string; de?: string } }[];

  return (
    <RecipesManager
      initialRecipes={mergedRecipes as unknown as RecipeListItem[]}
      initialDdIcons={ddIconsByRecipe}
      courseTypes={courseTypes}
      mealTypes={mealTypes}
    />
  );
}
