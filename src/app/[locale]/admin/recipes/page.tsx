import { createClient } from '@/lib/supabase/server';
import RecipesManager from '@/components/admin/recipes/RecipesManager';

export default async function RecipesPage() {
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, title, difficulty, prep_time_min, cook_time_min, servings, is_published, is_featured, image_url, created_at')
    .order('created_at', { ascending: false });

  return <RecipesManager initialRecipes={recipes ?? []} />;
}
