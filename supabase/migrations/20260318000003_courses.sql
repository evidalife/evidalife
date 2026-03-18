-- Course system migration
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste & run

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE courses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        jsonb       NOT NULL DEFAULT '{}',          -- { de: string, en: string }
  description  jsonb                  DEFAULT '{}',
  slug         text        UNIQUE,
  image_url    text,
  sort_order   int         NOT NULL DEFAULT 0,
  is_published boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE course_lessons (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid    NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  article_id uuid    NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  sort_order int     NOT NULL DEFAULT 0,
  is_free    boolean NOT NULL DEFAULT false,
  UNIQUE (course_id, article_id)
);

CREATE TABLE course_progress (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    uuid        NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons  ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

-- Courses: public read for published rows, no direct public write (admin via service key)
CREATE POLICY "courses_public_read"
  ON courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "courses_admin_all"
  ON courses FOR ALL
  USING  (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Course lessons: public read (so users can browse syllabus), no direct public write
CREATE POLICY "course_lessons_public_read"
  ON course_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_lessons.course_id AND c.is_published = true
    )
  );

CREATE POLICY "course_lessons_admin_all"
  ON course_lessons FOR ALL
  USING  (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Course progress: users manage only their own rows
CREATE POLICY "course_progress_own"
  ON course_progress FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX ON courses         (sort_order);
CREATE INDEX ON courses         (slug);
CREATE INDEX ON course_lessons  (course_id, sort_order);
CREATE INDEX ON course_progress (user_id, lesson_id);
