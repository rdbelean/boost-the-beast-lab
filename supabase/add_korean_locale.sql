-- =====================================================================
-- BOOST THE BEAST LAB — Add Korean ('ko') to Locale CHECK Constraints
-- =====================================================================
-- Expands the CHECK constraints on assessments.locale and
-- paid_sessions.locale so Korean-language assessments and Stripe
-- sessions can be persisted.
--
-- Apply via: Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

-- assessments.locale — NOT NULL with default 'de'. Rewrite the CHECK.
ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS assessments_locale_check;
ALTER TABLE assessments
  ADD CONSTRAINT assessments_locale_check
  CHECK (locale IN ('de', 'en', 'it', 'ko'));

-- paid_sessions.locale — nullable. Stripe webhook may race ahead of
-- the Korean rollout; NULL keeps being treated as 'de' on the code side.
ALTER TABLE paid_sessions
  DROP CONSTRAINT IF EXISTS paid_sessions_locale_check;
ALTER TABLE paid_sessions
  ADD CONSTRAINT paid_sessions_locale_check
  CHECK (locale IS NULL OR locale IN ('de', 'en', 'it', 'ko'));
