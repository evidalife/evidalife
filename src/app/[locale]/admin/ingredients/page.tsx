import { createClient } from '@/lib/supabase/server';
import IngredientsManager from '@/components/admin/ingredients/IngredientsManager';

export default async function IngredientsPage() {
  const supabase = await createClient();

  const [{ data: ingredients }, { data: units }, { data: categories }] = await Promise.all([
    supabase
      .from('ingredients')
      .select('id, name, slug, default_unit_id, daily_dozen_category_id, is_common, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('measurement_units')
      .select('id, code, name, abbreviation, category, sort_order')
      .order('sort_order'),
    supabase
      .from('daily_dozen_categories')
      .select('id, slug, name, icon, sort_order')
      .order('sort_order'),
  ]);

  return (
    <IngredientsManager
      initialIngredients={ingredients ?? []}
      initialUnits={units ?? []}
      initialCategories={categories ?? []}
    />
  );
}
