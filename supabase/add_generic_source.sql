-- =====================================================================
-- BOOST THE BEAST LAB — Generic AI Upload Sources
-- =====================================================================
-- Extends wearable_uploads.source beyond the original whoop/apple_health
-- duo so the generic AI upload pipeline (/api/wearable/parse-document)
-- can store PDFs, images, and text-file extractions in the same table.
--
-- New source values:
--   • ai_document — Claude read a PDF (InBody, DEXA, Tanita, handwritten)
--   • ai_image    — Claude read an image (screenshot, scan photo)
--   • ai_text     — Claude read a CSV/TXT/JSON export
--
-- Apply via: Supabase SQL Editor or `supabase db push`. Idempotent.
-- =====================================================================

-- Drop the existing CHECK that limits source to the two original values,
-- then re-add a wider one. Idempotent because each CHECK is named.
ALTER TABLE wearable_uploads
  DROP CONSTRAINT IF EXISTS wearable_uploads_source_check;
ALTER TABLE wearable_uploads
  ADD CONSTRAINT wearable_uploads_source_check
  CHECK (source IN ('whoop', 'apple_health', 'ai_document', 'ai_image', 'ai_text'));
