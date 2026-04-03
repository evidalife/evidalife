-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 9: Voice Sessions table for live voice conversations
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('daily_checkin', 'coaching', 'freeform')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  lang TEXT NOT NULL DEFAULT 'en',
  max_duration_seconds INTEGER NOT NULL DEFAULT 120,
  duration_seconds INTEGER DEFAULT 0,
  turn_count INTEGER DEFAULT 0,
  credits_reserved INTEGER DEFAULT 0,
  voice_minutes_used NUMERIC(8,2) DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_started ON voice_sessions(started_at DESC);

-- RLS policies
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice sessions"
  ON voice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice sessions"
  ON voice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice sessions"
  ON voice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Helper function to increment turn count atomically
CREATE OR REPLACE FUNCTION increment_voice_turn_count(session_id UUID)
RETURNS void AS $$
  UPDATE voice_sessions
  SET turn_count = turn_count + 1
  WHERE id = session_id;
$$ LANGUAGE sql;
