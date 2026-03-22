ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS grams_per_unit NUMERIC DEFAULT NULL;

COMMENT ON COLUMN ingredients.grams_per_unit IS 'Average weight in grams of one default unit. NULL when unit is already gram-based. Used for nutrition auto-calculation.';
