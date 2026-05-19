-- =====================================================================
-- Migration: per-session consent tracking for health-data analysis
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard).
-- Idempotent: safe to run multiple times.
--
-- Adds report_session_id (Stripe Checkout Session ID) to consent_log so
-- consent is scoped to a single report transaction (DSGVO Art. 9 Abs. 2
-- lit. a — specific per-purpose consent). Existing rows (Lebenszeit-
-- Consent) keep report_session_id = NULL and are excluded from the
-- per-session GET filter by SQL semantics (NULL = no match on equality
-- with a concrete session id).
--
-- The new column is NULLABLE intentionally — pre-existing rows must
-- remain queryable for audit purposes, but new inserts will always
-- carry a concrete session id (enforced by the /api/consent route,
-- not by a NOT NULL constraint, so historical data stays intact).
-- =====================================================================

ALTER TABLE consent_log
  ADD COLUMN IF NOT EXISTS report_session_id TEXT;

-- Partial index for fast (user_id, report_session_id) lookups on rows
-- that actually have a session reference. Excludes the legacy NULL
-- rows from index maintenance overhead.
CREATE INDEX IF NOT EXISTS idx_consent_log_user_session
  ON consent_log (user_id, report_session_id)
  WHERE report_session_id IS NOT NULL;
