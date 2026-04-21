-- =====================================================================
-- BOOST THE BEAST LAB — Swap Korean ('ko') for Turkish ('tr')
-- =====================================================================
-- Updates the CHECK constraints on assessments.locale and
-- paid_sessions.locale so Turkish-language assessments and Stripe
-- sessions can be persisted. Korean is dropped.
--
-- Any rows still carrying locale='ko' (from the earlier KR rollout)
-- are migrated to locale='de' BEFORE the CHECK is tightened, so the
-- ADD CONSTRAINT step doesn't fail on existing data.
--
-- Apply via: Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

-- 1. Migrate any surviving 'ko' rows back to the default 'de' so the
--    tightened CHECK accepts them. NOOP if no such rows exist.
UPDATE assessments   SET locale = 'de' WHERE locale = 'ko';
UPDATE paid_sessions SET locale = 'de' WHERE locale = 'ko';

-- 2. assessments.locale — NOT NULL with default 'de'. Rewrite the CHECK.
ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_locale_check;
ALTER TABLE assessments
  ADD CONSTRAINT assessments_locale_check
  CHECK (locale IN ('de', 'en', 'it', 'tr'));

-- 3. paid_sessions.locale — nullable. NULL keeps being treated as 'de'
--    on the code side, same semantics as before.
ALTER TABLE paid_sessions
  DROP CONSTRAINT IF EXISTS paid_sessions_locale_check;
ALTER TABLE paid_sessions
  ADD CONSTRAINT paid_sessions_locale_check
  CHECK (locale IS NULL OR locale IN ('de', 'en', 'it', 'tr'));
