-- =====================================================================
-- BOOST THE BEAST LAB — Wearable Integration
-- =====================================================================
-- Adds optional WHOOP / Apple Health data import to assessments.
--
-- Design:
--   • ZIP files are parsed CLIENT-SIDE (browser Web Worker). Only the
--     aggregated metrics (~3 KB JSON) are sent to this table. The raw
--     ZIP never leaves the user's device.
--   • JSONB shape allows CSV/XML format evolution without schema churn.
--     schema_version tracks the parser version used per upload.
--   • assessments.data_sources records which providers fed which
--     assessment — read at report-render time without extra joins.
--
-- Apply via: Supabase SQL Editor or `supabase db push`.
-- Idempotent (IF NOT EXISTS).
-- =====================================================================

CREATE TABLE IF NOT EXISTS wearable_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('whoop', 'apple_health', 'ai_document', 'ai_image', 'ai_text')),
  schema_version TEXT NOT NULL,
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  days_covered INTEGER NOT NULL CHECK (days_covered BETWEEN 0 AND 31),
  metrics JSONB NOT NULL,
  file_size_bytes BIGINT,
  parse_duration_ms INTEGER,
  parse_warnings JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wearable_uploads_user
  ON wearable_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_uploads_assessment
  ON wearable_uploads(assessment_id);

ALTER TABLE wearable_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON wearable_uploads;
CREATE POLICY "service_role_all" ON wearable_uploads
  FOR ALL USING (true);

DROP POLICY IF EXISTS "wearable_read_own" ON wearable_uploads;
CREATE POLICY "wearable_read_own" ON wearable_uploads
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- data_sources: { form: true, whoop?: {days, upload_id}, apple_health?: {...} }
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '{"form": true}'::jsonb;
