-- Fix v_recipe_daily_dozen_coverage: recreate with security_invoker = true
-- so the view runs under the calling user's RLS context instead of the definer's.

DROP VIEW IF EXISTS v_recipe_daily_dozen_coverage;

CREATE VIEW v_recipe_daily_dozen_coverage
  WITH (security_invoker = true)
AS
SELECT DISTINCT
  ri.recipe_id,
  i.daily_dozen_category_id,
  ddc.slug  AS category_slug,
  ddc.name  AS category_name,
  ddc.icon  AS category_icon
FROM recipe_ingredients ri
JOIN ingredients        i   ON i.id  = ri.ingredient_id
JOIN daily_dozen_categories ddc ON ddc.id = i.daily_dozen_category_id
WHERE i.daily_dozen_category_id IS NOT NULL;
