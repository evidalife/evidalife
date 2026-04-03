-- ============================================================
-- Credit & Subscription System
-- ============================================================

-- 1. Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,              -- 'free', 'standard', 'premium'
  name TEXT NOT NULL,                     -- 'Free', 'Standard', 'Premium'
  description TEXT,
  price_monthly_eur DECIMAL(10,2) DEFAULT 0,
  price_yearly_eur DECIMAL(10,2) DEFAULT 0,

  -- Credit allocations per month
  monthly_credits INTEGER NOT NULL DEFAULT 0,

  -- Feature gates
  text_messages_per_day INTEGER DEFAULT 20,        -- 0 = unlimited
  voice_minutes_per_month INTEGER DEFAULT 0,       -- 0 = not available
  audio_briefings BOOLEAN DEFAULT FALSE,
  pdf_exports_per_month INTEGER DEFAULT 0,         -- 0 = not available
  research_queries_per_day INTEGER DEFAULT 5,      -- 0 = unlimited
  live_voice_enabled BOOLEAN DEFAULT FALSE,
  daily_checkin_voice BOOLEAN DEFAULT FALSE,

  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO subscription_plans (slug, name, description, price_monthly_eur, price_yearly_eur, monthly_credits, text_messages_per_day, voice_minutes_per_month, audio_briefings, pdf_exports_per_month, research_queries_per_day, live_voice_enabled, daily_checkin_voice, sort_order)
VALUES
  ('free', 'Free', 'Full AI text access — explore your health data', 0, 0, 50, 20, 0, FALSE, 0, 5, FALSE, FALSE, 0),
  ('standard', 'Standard', 'Audio briefings, PDF reports, and enhanced research', 9.90, 99.00, 200, 0, 0, TRUE, 3, 20, FALSE, FALSE, 1),
  ('premium', 'Premium', 'Live voice coaching, unlimited access, priority support', 24.90, 249.00, 500, 0, 60, TRUE, 0, 0, TRUE, TRUE, 2)
ON CONFLICT (slug) DO NOTHING;

-- 2. User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'expired')),

  -- Billing
  stripe_subscription_id TEXT,            -- future Stripe integration
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)  -- one active subscription per user
);

-- 3. User credits
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Credit balance
  total_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  bonus_credits INTEGER NOT NULL DEFAULT 0,    -- purchased add-ons or gifted

  -- Voice minutes tracking (separate for clarity)
  voice_minutes_total INTEGER NOT NULL DEFAULT 0,
  voice_minutes_used DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Reset cycle
  reset_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 4. Credit transactions (detailed audit log)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit', 'reset', 'bonus', 'refund')),
  amount INTEGER NOT NULL,                 -- positive for credit, negative for debit
  balance_after INTEGER NOT NULL,          -- running balance after this transaction

  -- What triggered this
  feature TEXT NOT NULL,                   -- 'voice_conversation', 'briefing', 'pdf_export', 'research', 'text_chat', 'subscription_reset', 'admin_bonus', 'purchase'
  description TEXT,                        -- human-readable description

  -- Link to usage log for cost correlation
  usage_log_id UUID,                       -- FK to ai_usage_log if applicable

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_reset ON user_credits(reset_date);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_feature ON credit_transactions(feature);

-- RLS Policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Plans are readable by everyone (public pricing)
CREATE POLICY "Plans are publicly readable" ON subscription_plans FOR SELECT USING (true);

-- Users can only read their own subscription
CREATE POLICY "Users read own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Users can only read their own credits
CREATE POLICY "Users read own credits" ON user_credits FOR SELECT USING (auth.uid() = user_id);

-- Users can only read their own transactions
CREATE POLICY "Users read own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (via service role bypass RLS)
-- All write operations go through the admin client which bypasses RLS
