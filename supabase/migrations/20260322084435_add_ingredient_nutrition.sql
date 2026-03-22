-- Add nutrition data columns to ingredients table (per 100g values)

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS kcal_per_100g     NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS protein_per_100g  NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fat_per_100g      NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS carbs_per_100g    NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fiber_per_100g    NUMERIC DEFAULT NULL;

COMMENT ON COLUMN ingredients.kcal_per_100g    IS 'Calories per 100g of ingredient';
COMMENT ON COLUMN ingredients.protein_per_100g IS 'Protein in grams per 100g';
COMMENT ON COLUMN ingredients.fat_per_100g     IS 'Fat in grams per 100g';
COMMENT ON COLUMN ingredients.carbs_per_100g   IS 'Carbohydrates in grams per 100g';
COMMENT ON COLUMN ingredients.fiber_per_100g   IS 'Fiber in grams per 100g';
