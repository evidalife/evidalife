import { createClient } from '@/lib/supabase/server';
import RecipesManager from '@/components/admin/recipes/RecipesManager';

export default async function RecipesPage() {
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id, title, difficulty, prep_time_min, cook_time_min, servings,
      is_published, is_featured, image_url, created_at, course_type_id,
      course_type:recipe_course_types(name)
    `)
    .order('created_at', { ascending: false });

  const recipeIds = (recipes ?? []).map((r) => r.id);
  const { data: ddRows } = recipeIds.length > 0
    ? await supabase
        .from('v_recipe_daily_dozen_coverage')
        .select('recipe_id, category_icon')
        .in('recipe_id', recipeIds)
    : { data: [] as { recipe_id: string; category_icon: string }[] };

  const ddIconsByRecipe: Record<string, string[]> = {};
  for (const row of ddRows ?? []) {
    if (!ddIconsByRecipe[row.recipe_id]) ddIconsByRecipe[row.recipe_id] = [];
    ddIconsByRecipe[row.recipe_id].push(row.category_icon);
  }

  return (
    <RecipesManager
      initialRecipes={(recipes ?? []) as unknown as Parameters<typeof RecipesManager>[0]['initialRecipes']}
      initialDdIcons={ddIconsByRecipe}
    />
  );
}
