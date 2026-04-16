-- =====================================================================
-- FULL RESET: Delete all report/assessment data
-- Keeps: users, paid_sessions, instrument_versions, model_versions
-- Deletes: assessments + everything that cascades from them
--
-- Run via: Supabase Dashboard → SQL Editor
-- =====================================================================

-- The cascade order is handled automatically by ON DELETE CASCADE,
-- but we truncate explicitly to avoid foreign-key ordering issues.

TRUNCATE TABLE
  report_artifacts,
  report_jobs,
  derived_metrics,
  responses,
  scores,
  assessments
RESTART IDENTITY CASCADE;

-- If any storage objects exist in the "reports" bucket, delete them too.
-- Uncomment if you have Supabase Storage set up with a "reports" bucket:
-- DELETE FROM storage.objects WHERE bucket_id = 'reports';

-- Verify counts (should all be 0):
SELECT
  (SELECT COUNT(*) FROM assessments)     AS assessments,
  (SELECT COUNT(*) FROM scores)          AS scores,
  (SELECT COUNT(*) FROM report_artifacts) AS report_artifacts,
  (SELECT COUNT(*) FROM report_jobs)     AS report_jobs,
  (SELECT COUNT(*) FROM responses)       AS responses,
  (SELECT COUNT(*) FROM derived_metrics) AS derived_metrics;
