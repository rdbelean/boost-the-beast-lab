-- =====================================================================
-- Migration: Anthropic cost tracking on users + assessments
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard) or `supabase db push`
-- Idempotent: safe to run multiple times.
--
-- Adds per-user and per-assessment cost + token columns. Drives the
-- pre-check in costly API routes (refuses to call Anthropic when the
-- user has already burned > X cents) and the post-call accumulator
-- that increments cost atomically.
-- =====================================================================

-- ── Columns ──────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_anthropic_cost_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_cost_alert_at TIMESTAMPTZ;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS anthropic_cost_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS anthropic_token_input INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS anthropic_token_output INTEGER NOT NULL DEFAULT 0;

-- ── Index for cost alerts ────────────────────────────────────────────
-- Filtered index keeps it tiny: only users approaching the cap show up.
CREATE INDEX IF NOT EXISTS idx_users_cost_alert
  ON users (total_anthropic_cost_cents DESC)
  WHERE total_anthropic_cost_cents > 2000;

-- ── Atomic increment RPCs ─────────────────────────────────────────────
-- Used by lib/anthropic/cost.ts to avoid read-modify-write races when
-- multiple Claude calls finish concurrently for the same assessment.

CREATE OR REPLACE FUNCTION increment_assessment_cost(
  aid UUID,
  cents INTEGER,
  in_tok INTEGER,
  out_tok INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE assessments
  SET
    anthropic_cost_cents = anthropic_cost_cents + cents,
    anthropic_token_input = anthropic_token_input + in_tok,
    anthropic_token_output = anthropic_token_output + out_tok
  WHERE id = aid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_user_cost(
  uid UUID,
  cents INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET total_anthropic_cost_cents = total_anthropic_cost_cents + cents
  WHERE id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Permission: service role only ─────────────────────────────────────
-- Anon role must NEVER be able to call these (would let bots reset
-- their own counters). Service role owns all write paths.
REVOKE ALL ON FUNCTION increment_assessment_cost(UUID, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION increment_user_cost(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_assessment_cost(UUID, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION increment_user_cost(UUID, INTEGER) TO service_role;
