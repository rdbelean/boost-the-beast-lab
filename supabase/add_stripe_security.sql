-- =====================================================================
-- Migration: Stripe security hardening
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard) or `supabase db push`
-- Idempotent: safe to run multiple times.
--
-- Three additions that close audit gaps in the Stripe integration:
--
-- 1. paid_sessions.amount_expected — store the expected price at the
--    moment the session was paid. Webhook compares amount_total to
--    expected; mismatch => suspicious=true, no report unlock.
--
-- 2. paid_sessions.suspicious / refunded_at — soft-block flags read by
--    the payment-gate in /api/assessment. Suspicious sessions can be
--    investigated manually; refunded sessions lose report access.
--
-- 3. stripe_events_processed — idempotency table. The webhook handler
--    INSERTs the event.id BEFORE doing any side effects. Unique
--    violation = duplicate delivery, skip processing.
-- =====================================================================

-- ── paid_sessions hardening ──────────────────────────────────────────
ALTER TABLE paid_sessions ADD COLUMN IF NOT EXISTS amount_expected INTEGER;
ALTER TABLE paid_sessions ADD COLUMN IF NOT EXISTS suspicious BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE paid_sessions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE paid_sessions ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;

CREATE INDEX IF NOT EXISTS idx_paid_sessions_charge_id
  ON paid_sessions (stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;

-- ── stripe_events_processed (idempotency table) ──────────────────────
CREATE TABLE IF NOT EXISTS stripe_events_processed (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB
);

-- TTL-style cleanup will be a periodic job later. For now we keep all
-- events for audit; ~1k events/week is well within Postgres limits.

ALTER TABLE stripe_events_processed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stripe_events_service_all" ON stripe_events_processed
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON stripe_events_processed (type, processed_at DESC);
