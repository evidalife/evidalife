-- ─── Ingredient System ────────────────────────────────────────────────────────
-- Adds: measurement_units, ingredients master table
-- Alters: recipe_ingredients (adds ingredient_id, unit_id)
-- Replaces: v_recipe_daily_dozen_coverage (auto-derived from ingredients)
-- Keeps: recipe_daily_dozen_tags (not dropped until migration is complete)
--
-- VERIFY columns before running:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'recipe_ingredients';
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_dozen_categories';

-- ─── 1. measurement_units ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS measurement_units (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text  UNIQUE NOT NULL,
  name         jsonb NOT NULL,
  abbreviation jsonb NOT NULL,
  category     text  NOT NULL CHECK (category IN ('weight', 'volume', 'count', 'other')),
  sort_order   integer DEFAULT 0
);

ALTER TABLE measurement_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measurement_units_public_read"
  ON measurement_units FOR SELECT USING (true);

CREATE POLICY "measurement_units_admin_insert"
  ON measurement_units FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "measurement_units_admin_update"
  ON measurement_units FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "measurement_units_admin_delete"
  ON measurement_units FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Seed: Weight
INSERT INTO measurement_units (code, name, abbreviation, category, sort_order) VALUES
  ('g',    '{"de": "Gramm",       "en": "gram"}',       '{"de": "g",    "en": "g"}',    'weight', 10),
  ('kg',   '{"de": "Kilogramm",   "en": "kilogram"}',   '{"de": "kg",   "en": "kg"}',   'weight', 20),
  ('mg',   '{"de": "Milligramm",  "en": "milligram"}',  '{"de": "mg",   "en": "mg"}',   'weight', 30)
ON CONFLICT (code) DO NOTHING;

-- Seed: Volume
INSERT INTO measurement_units (code, name, abbreviation, category, sort_order) VALUES
  ('ml',   '{"de": "Milliliter",  "en": "milliliter"}', '{"de": "ml",   "en": "ml"}',   'volume', 40),
  ('dl',   '{"de": "Deziliter",   "en": "deciliter"}',  '{"de": "dl",   "en": "dl"}',   'volume', 50),
  ('l',    '{"de": "Liter",       "en": "liter"}',      '{"de": "l",    "en": "l"}',    'volume', 60),
  ('tsp',  '{"de": "Teelöffel",   "en": "teaspoon"}',   '{"de": "TL",   "en": "tsp"}',  'volume', 70),
  ('tbsp', '{"de": "Esslöffel",   "en": "tablespoon"}', '{"de": "EL",   "en": "tbsp"}', 'volume', 80),
  ('cup',  '{"de": "Tasse",       "en": "cup"}',        '{"de": "Tasse","en": "cup"}',  'volume', 90)
ON CONFLICT (code) DO NOTHING;

-- Seed: Count
INSERT INTO measurement_units (code, name, abbreviation, category, sort_order) VALUES
  ('piece',    '{"de": "Stück",     "en": "piece"}',    '{"de": "Stk.",   "en": "pc."}',   'count', 100),
  ('slice',    '{"de": "Scheibe",   "en": "slice"}',    '{"de": "Sch.",   "en": "sl."}',   'count', 110),
  ('clove',    '{"de": "Zehe",      "en": "clove"}',    '{"de": "Zehe",   "en": "clove"}', 'count', 120),
  ('pinch',    '{"de": "Prise",     "en": "pinch"}',    '{"de": "Pr.",    "en": "pinch"}', 'count', 130),
  ('bunch',    '{"de": "Bund",      "en": "bunch"}',    '{"de": "Bd.",    "en": "bunch"}', 'count', 140),
  ('handful',  '{"de": "Handvoll",  "en": "handful"}',  '{"de": "Hdvl.",  "en": "hdfl."}', 'count', 150),
  ('can',      '{"de": "Dose",      "en": "can"}',      '{"de": "Dose",   "en": "can"}',   'count', 160),
  ('pack',     '{"de": "Packung",   "en": "pack"}',     '{"de": "Pack.",  "en": "pack"}',  'count', 170),
  ('drop',     '{"de": "Tropfen",   "en": "drop"}',     '{"de": "Tr.",    "en": "drop"}',  'count', 180),
  ('leaf',     '{"de": "Blatt",     "en": "leaf"}',     '{"de": "Bl.",    "en": "leaf"}',  'count', 190),
  ('sprig',    '{"de": "Zweig",     "en": "sprig"}',    '{"de": "Zweig",  "en": "sprig"}', 'count', 200),
  ('stick',    '{"de": "Stange",    "en": "stick"}',    '{"de": "Stg.",   "en": "stick"}', 'count', 210)
ON CONFLICT (code) DO NOTHING;

-- ─── 2. ingredients master table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ingredients (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    jsonb NOT NULL,
  slug                    text  UNIQUE NOT NULL,
  default_unit_id         uuid  REFERENCES measurement_units(id) ON DELETE SET NULL,
  daily_dozen_category_id uuid  REFERENCES daily_dozen_categories(id) ON DELETE SET NULL,
  is_common               boolean DEFAULT true,
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredients_public_read"
  ON ingredients FOR SELECT USING (true);

CREATE POLICY "ingredients_admin_insert"
  ON ingredients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "ingredients_admin_update"
  ON ingredients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "ingredients_admin_delete"
  ON ingredients FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ─── 3. Alter recipe_ingredients ──────────────────────────────────────────────
-- Keep existing columns (ingredient_name, unit, amount, is_optional, sort_order)
-- for backward compatibility. New columns are nullable.

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id       uuid REFERENCES measurement_units(id) ON DELETE SET NULL;

-- ─── 4. Replace v_recipe_daily_dozen_coverage ─────────────────────────────────
-- Old view: joined recipe_daily_dozen_tags → daily_dozen_categories by category slug/id
-- New view: auto-derives coverage from recipe_ingredients → ingredients → daily_dozen_categories

DROP VIEW IF EXISTS v_recipe_daily_dozen_coverage;

CREATE VIEW v_recipe_daily_dozen_coverage AS
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
