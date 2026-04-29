-- =====================================================================
-- Migration: add email_sent_at to report_jobs
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard) or `supabase db push`
-- Idempotent: safe to run multiple times.
--
-- Tracks when the report email was dispatched for each assessment.
-- Used as an idempotency lock by /api/reports/prepare-pdfs so duplicate
-- prepare-pdfs calls (e.g. user reloads /results) never send a second
-- email. Acquired via conditional UPDATE (... WHERE email_sent_at IS NULL).
-- =====================================================================

ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
