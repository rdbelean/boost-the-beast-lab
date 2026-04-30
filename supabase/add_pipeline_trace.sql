-- =====================================================================
-- Migration: add pipeline_trace table
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard) or `supabase db push`
-- Idempotent: safe to run multiple times.
--
-- Records every stage of the autonomous server-side report pipeline so
-- we can diagnose hangs / failures WITHOUT Vercel-CLI access. Each
-- pipeline run writes one row per stage transition (submit_received,
-- pipeline_started, main_report_started, main_report_completed,
-- plan_started:<type>, plan_completed:<type>, email_started, email_sent,
-- error, etc.).
--
-- Read-back endpoint: /api/admin/pipeline-trace/[assessmentId] returns
-- the rows as a JSON array, ordered by created_at.
--
-- Code that writes to this table (lib/server/pipeline-trace.ts) is
-- defensive: if the table is missing (migration not applied), the
-- writeTrace() helper logs a warning and returns null without throwing,
-- so production never blocks on observability.
-- =====================================================================

CREATE TABLE IF NOT EXISTS pipeline_trace (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL,
  stage         TEXT NOT NULL,
  detail        JSONB,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_trace_assessment_created
  ON pipeline_trace (assessment_id, created_at);

-- Optional FK for referential integrity. Soft-delete tolerant.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pipeline_trace_assessment_id_fkey'
  ) THEN
    ALTER TABLE pipeline_trace
      ADD CONSTRAINT pipeline_trace_assessment_id_fkey
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- assessments table not present — skip FK silently
  NULL;
END $$;
