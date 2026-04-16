-- =====================================================================
-- CLEANUP: Remove assessments that have no score rows
-- These are null/dummy entries that were created but never completed.
--
-- Run once via: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (deletes 0 rows if nothing to clean up).
-- =====================================================================

-- Delete assessments with no corresponding entries in the scores table.
-- Cascades to: responses, derived_metrics, report_jobs, report_artifacts
-- (all have ON DELETE CASCADE on assessment_id).
DELETE FROM assessments
WHERE id NOT IN (
  SELECT DISTINCT assessment_id FROM scores
);
