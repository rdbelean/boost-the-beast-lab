-- =====================================================================
-- BOOST THE BEAST LAB — i18n Locale Columns (TEIL 10)
-- =====================================================================
-- Adds locale tracking so:
--   • assessments.locale drives the language the Claude report + PDF +
--     email are generated in.
--   • paid_sessions.locale captures which locale the user saw at
--     checkout time (via Stripe session metadata) so post-payment flows
--     (report re-generation, support) can honor it.
--
-- Phase 1 supports 'de', 'en', 'it'. ES/FR can be added later with a
-- second migration dropping the CHECK and re-adding with extra values.
--
-- Apply via: Supabase SQL Editor or `supabase db push`.
-- Idempotent (IF NOT EXISTS + guarded ALTER).
-- =====================================================================

-- 1. assessments.locale — NOT NULL with default 'de'. Historical rows
--    are 100 % German since the product was monolingual until now.
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'de';

-- 2. paid_sessions.locale — NULLABLE. Stripe webhook may race ahead of
--    this migration; NULL is treated as 'de' on the code side.
ALTER TABLE paid_sessions
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5);

-- 3. CHECK constraints (drop + re-add so they reflect the current
--    supported-locale set exactly). Guarded so re-running is safe.
ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_locale_check;
ALTER TABLE assessments
  ADD CONSTRAINT assessments_locale_check
  CHECK (locale IN ('de', 'en', 'it'));

ALTER TABLE paid_sessions
  DROP CONSTRAINT IF EXISTS paid_sessions_locale_check;
ALTER TABLE paid_sessions
  ADD CONSTRAINT paid_sessions_locale_check
  CHECK (locale IS NULL OR locale IN ('de', 'en', 'it'));

-- 4. Index for filtering reports by locale in admin queries.
CREATE INDEX IF NOT EXISTS assessments_locale_idx ON assessments (locale);
