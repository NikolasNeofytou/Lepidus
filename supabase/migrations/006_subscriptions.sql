-- Add subscription tracking to user_profiles
-- Run this in Supabase SQL editor

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Index for Stripe webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe
  ON user_profiles(stripe_customer_id);
