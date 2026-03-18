-- Daily Dozen tracker tables
-- Run in Supabase SQL Editor

-- ─── Categories (seeded, public read) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_dozen_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text UNIQUE NOT NULL,
  name            jsonb NOT NULL DEFAULT '{}',   -- { de, en }
  target_servings int  NOT NULL DEFAULT 1,
  icon            text,                          -- emoji
  sort_order      int  NOT NULL DEFAULT 0
);

ALTER TABLE daily_dozen_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read daily dozen categories"
  ON daily_dozen_categories FOR SELECT USING (true);

INSERT INTO daily_dozen_categories (key, name, target_servings, icon, sort_order) VALUES
  ('beans',                  '{"de":"Hülsenfrüchte","en":"Beans"}',              3, '🫘', 1),
  ('berries',                '{"de":"Beeren","en":"Berries"}',                    1, '🫐', 2),
  ('other_fruits',           '{"de":"Andere Früchte","en":"Other Fruits"}',       3, '🍎', 3),
  ('cruciferous_vegetables', '{"de":"Kreuzblütler","en":"Cruciferous Veg"}',      1, '🥦', 4),
  ('greens',                 '{"de":"Blattgemüse","en":"Greens"}',                2, '🥬', 5),
  ('other_vegetables',       '{"de":"Gemüse","en":"Other Vegetables"}',           2, '🥕', 6),
  ('flaxseeds',              '{"de":"Leinsamen","en":"Flaxseeds"}',               1, '🌾', 7),
  ('nuts_and_seeds',         '{"de":"Nüsse & Samen","en":"Nuts & Seeds"}',        1, '🥜', 8),
  ('herbs_and_spices',       '{"de":"Kräuter & Gewürze","en":"Herbs & Spices"}',  1, '🌿', 9),
  ('whole_grains',           '{"de":"Vollkorn","en":"Whole Grains"}',             3, '🌾', 10),
  ('beverages',              '{"de":"Getränke","en":"Beverages"}',                5, '💧', 11),
  ('exercise',               '{"de":"Bewegung","en":"Exercise"}',                 1, '🏃', 12)
ON CONFLICT (key) DO NOTHING;

-- ─── Entries (one row per user × category × date) ────────────────────────────

CREATE TABLE IF NOT EXISTS daily_dozen_entries (
  id          uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid     NOT NULL REFERENCES daily_dozen_categories(id) ON DELETE CASCADE,
  date        date     NOT NULL DEFAULT CURRENT_DATE,
  servings    int      NOT NULL DEFAULT 0 CHECK (servings >= 0),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, category_id, date)
);

ALTER TABLE daily_dozen_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own daily dozen entries"
  ON daily_dozen_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own daily dozen entries"
  ON daily_dozen_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own daily dozen entries"
  ON daily_dozen_entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own daily dozen entries"
  ON daily_dozen_entries FOR DELETE USING (auth.uid() = user_id);

-- ─── Streaks (one row per user) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_dozen_streaks (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak       int  NOT NULL DEFAULT 0,
  longest_streak       int  NOT NULL DEFAULT 0,
  last_completed_date  date,
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE daily_dozen_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own streak"
  ON daily_dozen_streaks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own streak"
  ON daily_dozen_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own streak"
  ON daily_dozen_streaks FOR UPDATE USING (auth.uid() = user_id);
