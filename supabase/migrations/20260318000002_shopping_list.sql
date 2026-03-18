-- Shopping list tables
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste & run

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE shopping_lists (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       text        NOT NULL DEFAULT 'Einkaufsliste',
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shopping_list_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id          uuid        NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name  jsonb       NOT NULL DEFAULT '{}',   -- { de: string, en: string }
  amount           numeric,
  unit             text,
  recipe_id        uuid        REFERENCES recipes(id) ON DELETE SET NULL,
  is_checked       boolean     NOT NULL DEFAULT false,
  sort_order       int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE shopping_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Users manage only their own shopping lists
CREATE POLICY "shopping_lists_own"
  ON shopping_lists FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users manage items that belong to their own lists (joined check)
CREATE POLICY "shopping_list_items_own"
  ON shopping_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = shopping_list_items.list_id
        AND sl.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = shopping_list_items.list_id
        AND sl.user_id = auth.uid()
    )
  );

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX ON shopping_lists (user_id);
CREATE INDEX ON shopping_list_items (list_id, sort_order);
