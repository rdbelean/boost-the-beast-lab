-- =====================================================================
-- Migration: add first_name to users
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard) or `supabase db push`
-- Idempotent: safe to run multiple times.
--
-- Captures the user's first name during the assessment form so we can
-- personalize the report email greeting and subject line. Existing rows
-- have first_name NULL — email send falls back to the email username.
-- =====================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
