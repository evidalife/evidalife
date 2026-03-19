-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Recipe Enhancements
-- Already executed in production on 2026-03-19.
-- This file exists for version control only.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. recipe_course_types ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_course_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       jsonb NOT NULL,  -- { de, en }
  slug       text  NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO recipe_course_types (id, slug, name, sort_order) VALUES
  ('72b7f454-d65d-4494-b712-6113614f9530', 'appetizer', '{"de":"Vorspeise","en":"Appetizer"}',   1),
  ('8e580fb7-90fd-4444-8ef9-e61e8e9ca8d9', 'main',      '{"de":"Hauptgericht","en":"Main"}',      2),
  ('28a6475e-feec-4930-ae88-b2d006349e6f', 'side',      '{"de":"Beilage","en":"Side"}',           3),
  ('e4363558-676a-4f3b-bc57-9fbade1e4083', 'component', '{"de":"Komponente","en":"Component"}',   4),
  ('c23ffdc0-7b14-43e8-9943-cef3b3c1705f', 'dessert',   '{"de":"Dessert","en":"Dessert"}',        5),
  ('13757005-6650-4de7-a0e6-c1ab56ef1975', 'snack',     '{"de":"Snack","en":"Snack"}',            6),
  ('c414ad31-3c15-4415-be72-f5a83718a898', 'drink',     '{"de":"Getränk","en":"Drink"}',          7)
ON CONFLICT (id) DO NOTHING;

-- ── 2. recipe_meal_types ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_meal_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       jsonb NOT NULL,  -- { de, en }
  slug       text  NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO recipe_meal_types (id, slug, name, sort_order) VALUES
  ('9efc2010-44df-4627-b23c-95c53bb1fab8', 'breakfast', '{"de":"Frühstück","en":"Breakfast"}',     1),
  ('4f27f76a-bb3f-4830-8e1f-a617bfb02b4a', 'lunch',     '{"de":"Mittagessen","en":"Lunch"}',       2),
  ('dbaa1262-a047-4fd7-ac99-ed2644c35219', 'dinner',    '{"de":"Abendessen","en":"Dinner"}',       3),
  ('0650ff89-d3f5-4277-910b-115b5e5bbd4b', 'anytime',   '{"de":"Jederzeit","en":"Anytime"}',       4)
ON CONFLICT (id) DO NOTHING;

-- ── 3. preparation_notes ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS preparation_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       jsonb NOT NULL,   -- { de, en }
  slug       text  NOT NULL UNIQUE,
  is_common  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO preparation_notes (id, slug, name, is_common) VALUES
  ('dd81eebe-b609-40b2-bac5-0f4e5097e6d0', 'crushed',           '{"de":"zerdrückt","en":"crushed"}',                     true),
  ('e66505dc-62c0-4181-8a13-926255ee8b16', 'unsweetened',        '{"de":"ungesüßt","en":"unsweetened"}',                  true),
  ('8c06f17b-82dc-4edb-b424-fb61c5a84676', 'finely-chopped',     '{"de":"fein gehackt","en":"finely chopped"}',           true),
  ('375221c5-dfb1-4885-96b6-98969d0621ca', 'roughly-chopped',    '{"de":"grob gehackt","en":"roughly chopped"}',          true),
  ('1fcb93f7-b756-4af6-86d2-6493f732072a', 'frozen',             '{"de":"tiefgefroren","en":"frozen"}',                   true),
  ('158e2504-0c19-4f1a-9a2a-8fdf346e6486', 'drained-and-rinsed', '{"de":"abgetropft und abgespült","en":"drained and rinsed"}', true),
  ('1b2bf480-07b7-42b7-965c-ac823eeaaeb3', 'room-temperature',   '{"de":"Zimmertemperatur","en":"room temperature"}',     true),
  ('8231462c-3bf2-4163-85df-528ead7eba84', 'peeled',             '{"de":"geschält","en":"peeled"}',                       true),
  ('a9eda492-0b2e-4cf4-af2a-0241765d2a70', 'pitted',             '{"de":"entkernt","en":"pitted"}',                       true),
  ('902144c0-8c22-421d-9fb7-4f87d265a5c7', 'diced',              '{"de":"gewürfelt","en":"diced"}',                       true),
  ('69fa1603-53db-4149-a105-a1d8003bb884', 'sliced',             '{"de":"in Scheiben","en":"sliced"}',                    true),
  ('83bc2a02-609c-4ea0-9203-f4f7ebd37db1', 'grated',             '{"de":"gerieben","en":"grated"}',                       true),
  ('6b0375fb-e41d-448c-8969-7f3fb5f92955', 'toasted',            '{"de":"geröstet","en":"toasted"}',                      true),
  ('02f55f2f-e382-427d-8c7a-9a927db6f049', 'soaked',             '{"de":"eingeweicht","en":"soaked"}',                    true),
  ('ab165989-6ff7-47a2-86bb-d3e3e2c6f290', 'cooked',             '{"de":"gekocht","en":"cooked"}',                        true),
  ('1cd3db48-8a76-4062-b768-cbd281042b40', 'raw',                '{"de":"roh","en":"raw"}',                               true),
  ('4e8a36a3-d6c1-4068-9b8c-f68080ddd110', 'dried',              '{"de":"getrocknet","en":"dried"}',                      true),
  ('25f71fcb-318b-4934-bccb-a8a9bdfd5338', 'fresh',              '{"de":"frisch","en":"fresh"}',                          true),
  ('083bec98-d685-4bf5-a4c7-554123b13e71', 'ground',             '{"de":"gemahlen","en":"ground"}',                       true),
  ('94ef16c6-267f-494e-b6ee-72eaf20612e5', 'halved',             '{"de":"halbiert","en":"halved"}',                       true),
  ('33bf1112-45cb-4539-937a-f81eebe5b30d', 'soft',               '{"de":"weich","en":"soft"}',                            true),
  ('6cd3cb36-6f5f-4463-8b35-60ec3fb9e882', 'firm',               '{"de":"fest","en":"firm"}',                             true),
  ('5edaa3bb-7ba8-451c-ae8d-2173b2ba9b28', 'extra-firm',         '{"de":"extra fest","en":"extra firm"}',                 true),
  ('d9b10670-c625-41cc-b158-019677f6b078', 'thawed',             '{"de":"aufgetaut","en":"thawed"}',                      true),
  ('6be826f5-5b6c-4d55-bcbe-60ffef7c98e1', 'optional-note',      '{"de":"optional","en":"optional"}',                     true),
  ('0ca93223-60c8-4df5-a7cc-43d7e36cc8f9', 'to-taste',           '{"de":"nach Geschmack","en":"to taste"}',               true),
  ('0c9f731d-fbab-47cf-960e-932804a3a7fd', 'for-garnish',        '{"de":"zum Garnieren","en":"for garnish"}',              true),
  ('41ca08cc-4e4c-48e3-a58e-1bdaa7d67fda', 'organic',            '{"de":"Bio","en":"organic"}',                           true),
  ('378d4057-aac4-42d3-91fc-906ca133439f', 'stemmed',            '{"de":"entstielt","en":"stemmed"}',                      true),
  ('0ad508c7-bcea-4b46-8ddb-03e38606afbf', 'pressed',            '{"de":"gepresst","en":"pressed"}',                      true)
ON CONFLICT (id) DO NOTHING;

-- ── 4. recipe_ratings ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, user_id)
);

-- ── 5. ALTER recipes — add course_type_id and meal_type_id ────────────────────

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS course_type_id uuid REFERENCES recipe_course_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meal_type_id   uuid REFERENCES recipe_meal_types(id)   ON DELETE SET NULL;

-- ── 6. ALTER recipe_ingredients — notes → jsonb, add note_id, section_header ─

-- Change notes column from text to jsonb
ALTER TABLE recipe_ingredients
  ALTER COLUMN notes TYPE jsonb USING
    CASE WHEN notes IS NULL THEN NULL ELSE to_jsonb(notes) END;

-- Add note_id FK and section_header
ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS note_id        uuid REFERENCES preparation_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS section_header text;

-- ── 7. RLS policies ───────────────────────────────────────────────────────────

ALTER TABLE recipe_course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_meal_types   ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_notes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings      ENABLE ROW LEVEL SECURITY;

-- Public read access for lookup tables
CREATE POLICY "public read recipe_course_types"
  ON recipe_course_types FOR SELECT USING (true);

CREATE POLICY "public read recipe_meal_types"
  ON recipe_meal_types FOR SELECT USING (true);

CREATE POLICY "public read preparation_notes"
  ON preparation_notes FOR SELECT USING (true);

-- recipe_ratings: anyone can read; authenticated users can manage their own
CREATE POLICY "public read recipe_ratings"
  ON recipe_ratings FOR SELECT USING (true);

CREATE POLICY "users insert own rating"
  ON recipe_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own rating"
  ON recipe_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own rating"
  ON recipe_ratings FOR DELETE
  USING (auth.uid() = user_id);
