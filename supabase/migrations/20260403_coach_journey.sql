-- Coach Journey Management
-- Tracks user progress through lesson frameworks and journey phases
-- Run in Supabase SQL Editor

-- ─── User Lesson Progress ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lifestyle_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'skipped')),
  assigned_by TEXT NOT NULL DEFAULT 'coach' CHECK (assigned_by IN ('coach', 'self', 'admin', 'journey')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  coach_notes TEXT,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_ulp_user ON user_lesson_progress(user_id);
CREATE INDEX idx_ulp_status ON user_lesson_progress(user_id, status);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress"
  ON user_lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progress"
  ON user_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progress"
  ON user_lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Journey Configuration ──────────────────────────────────────────────────

-- Note: This assumes ai_settings table exists with (key, value) columns
-- If ai_settings doesn't exist yet, create it first
INSERT INTO ai_settings (key, value) VALUES
  ('journey_config', '{
    "phases": {
      "daily_dozen": {
        "name": "Daily Dozen",
        "unlock": "immediate",
        "framework": "daily_dozen"
      },
      "tweaks": {
        "name": "21 Tweaks",
        "unlock_streak": 7,
        "framework": "21_tweaks",
        "requires_phase": "daily_dozen"
      },
      "anti_aging": {
        "name": "Anti-Aging 8",
        "unlock_streak": 14,
        "framework": "anti_aging",
        "requires_phase": "tweaks",
        "requires_biomarkers": true
      }
    },
    "daily_lesson_limit": 1,
    "morning_checkin_enabled": true,
    "auto_unlock_enabled": true
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
