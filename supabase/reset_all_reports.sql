-- =====================================================================
-- FULL RESET: Alle Report-Daten löschen, Accounts behalten
-- =====================================================================
-- Behält:  users, paid_sessions, instrument_versions, model_versions
-- Löscht:  assessments + alles was per CASCADE daran hängt
--          + alle Dateien im Storage-Bucket "Reports"
--
-- Ausführen: Supabase Dashboard → SQL Editor → Run
-- =====================================================================

-- 1. Storage-Objekte löschen (Bucket heißt "Reports" mit großem R)
DELETE FROM storage.objects WHERE bucket_id = 'Reports';

-- 2. Report-Tabellen leeren (CASCADE übernimmt responses, scores, etc.)
TRUNCATE TABLE
  report_artifacts,
  report_jobs,
  derived_metrics,
  responses,
  scores,
  assessments
RESTART IDENTITY CASCADE;

-- 3. Kontrolle — alle Zahlen müssen 0 sein
SELECT
  (SELECT COUNT(*) FROM assessments)      AS assessments,
  (SELECT COUNT(*) FROM scores)           AS scores,
  (SELECT COUNT(*) FROM responses)        AS responses,
  (SELECT COUNT(*) FROM derived_metrics)  AS derived_metrics,
  (SELECT COUNT(*) FROM report_jobs)      AS report_jobs,
  (SELECT COUNT(*) FROM report_artifacts) AS report_artifacts,
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'Reports') AS storage_files;
