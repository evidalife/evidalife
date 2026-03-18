-- Contact form submissions

CREATE TABLE IF NOT EXISTS contact_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text        NOT NULL,
  message    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert
CREATE POLICY "Public insert contact messages"
  ON contact_messages FOR INSERT WITH CHECK (true);

-- Only admins can read (enforced via service role in admin panel)
CREATE POLICY "Admins read contact messages"
  ON contact_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
