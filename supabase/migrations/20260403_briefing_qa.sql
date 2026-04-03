-- ============================================================================
-- Briefing Q&A tracking + cascade delete for health_briefings
-- ============================================================================

-- 1. Add cascade delete for health_briefings (matches other health data tables)
ALTER TABLE health_briefings DROP CONSTRAINT IF EXISTS health_briefings_user_id_fkey;
ALTER TABLE health_briefings ADD CONSTRAINT health_briefings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Create briefing_qa_messages table to track Q&A during briefings
CREATE TABLE IF NOT EXISTS briefing_qa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID NOT NULL REFERENCES health_briefings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  slide_index INTEGER,            -- which slide the user was on when asking
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by briefing
CREATE INDEX IF NOT EXISTS idx_briefing_qa_briefing_id ON briefing_qa_messages(briefing_id);
CREATE INDEX IF NOT EXISTS idx_briefing_qa_user_id ON briefing_qa_messages(user_id);

-- RLS
ALTER TABLE briefing_qa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Q&A"
  ON briefing_qa_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Q&A"
  ON briefing_qa_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin policy (service role bypasses RLS, but for completeness)
CREATE POLICY "Admins can view all Q&A"
  ON briefing_qa_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
