-- Token system: run this in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)

-- 1. Table for per-user token balances, keyed by email
CREATE TABLE IF NOT EXISTS user_tokens (
  email       TEXT        PRIMARY KEY,
  tokens      INTEGER     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Idempotency flag on paid_sessions so we never double-credit
ALTER TABLE paid_sessions
  ADD COLUMN IF NOT EXISTS tokens_credited BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Index for fast email lookups
CREATE INDEX IF NOT EXISTS user_tokens_email_idx ON user_tokens (email);
