-- Migration: multi-source wearable upload columns
-- Adds support for merged uploads that combine WHOOP + Apple Health + AI docs.

-- 1. Add new source value "merged" to the CHECK constraint.
ALTER TABLE wearable_uploads
  DROP CONSTRAINT IF EXISTS wearable_uploads_source_check;

ALTER TABLE wearable_uploads
  ADD CONSTRAINT wearable_uploads_source_check
  CHECK (source IN ('whoop', 'apple_health', 'ai_document', 'ai_image', 'ai_text', 'merged'));

-- 2. New columns for multi-source uploads (all nullable so existing rows are unaffected).
ALTER TABLE wearable_uploads
  ADD COLUMN IF NOT EXISTS total_files_count   integer,
  ADD COLUMN IF NOT EXISTS source_files        jsonb,
  ADD COLUMN IF NOT EXISTS merge_provenance    jsonb;

-- source_files shape:
-- [{ type, file_name, records_count?, date_range?, fields_contributed[] }]

-- merge_provenance shape:
-- { "sleep.avg_duration_hours": { source, file_name, confidence }, ... }
