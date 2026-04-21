-- Report Intelligence Tables
-- Stores AI-generated interpretations, executive summaries, cross-insights, and action plans.
-- interpretation JSONB (not TEXT) supports both plain strings and structured arrays.
-- dimension values:
--   sleep | activity | vo2max | metabolic | stress  → block interpretations
--   _executive_summary                               → array of PdfFinding
--   _cross_insights                                  → array of PdfCrossInsight
--   _action_plan                                     → array of PdfGoal

CREATE TABLE IF NOT EXISTS report_interpretations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  uuid        NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  dimension      text        NOT NULL,
  locale         text        NOT NULL,
  interpretation jsonb       NOT NULL,
  generated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, dimension, locale)
);

CREATE INDEX IF NOT EXISTS idx_report_interpretations_assessment
  ON report_interpretations(assessment_id);
