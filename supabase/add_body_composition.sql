-- =====================================================================
-- Migration: add body composition self-assessment columns to assessments
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard) or `supabase db push`
-- Idempotent: safe to run multiple times.
--
-- Adds two NULLable columns to `assessments`:
--   body_type_self_assessment  — user-picked visual body type
--                                ('male_1'..'male_6' or 'female_1'..'female_6')
--   body_composition_flag      — computed at submit time, one of 10 values
--                                that combines BMI category × visual self-
--                                assessment to qualify BMI interpretation
--
-- Drives the metabolic-score modifier (athletic BMI 27 ≠ overweight BMI 27)
-- and the tone of the AI report. Both columns are optional (user can skip
-- the body-type question; if so flag is NULL and report falls back to
-- BMI-only interpretation).
-- =====================================================================

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS body_type_self_assessment VARCHAR(20),
  ADD COLUMN IF NOT EXISTS body_composition_flag VARCHAR(60);

-- Re-applying CHECK constraints isn't idempotent in plain PG;
-- guard with NOT EXISTS lookup on pg_constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessments_body_type_valid'
  ) THEN
    ALTER TABLE assessments
      ADD CONSTRAINT assessments_body_type_valid CHECK (
        body_type_self_assessment IS NULL OR
        body_type_self_assessment IN (
          'male_1','male_2','male_3','male_4','male_5','male_6',
          'female_1','female_2','female_3','female_4','female_5','female_6'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessments_body_comp_flag_valid'
  ) THEN
    ALTER TABLE assessments
      ADD CONSTRAINT assessments_body_comp_flag_valid CHECK (
        body_composition_flag IS NULL OR
        body_composition_flag IN (
          'optimal_lean',
          'optimal_athletic',
          'muscle_explains_bmi',
          'strong_muscle_explains_high_bmi',
          'bmi_reflects_overweight',
          'bmi_reflects_obesity',
          'lean_with_low_muscle',
          'possible_underweight',
          'discrepancy_lean_high_self_assessment',
          'discrepancy_overweight_athletic_assessment'
        )
      );
  END IF;
END $$;

-- Partial index for analytics: flag distribution among assessments that
-- actually answered the body-type question.
CREATE INDEX IF NOT EXISTS idx_assessments_body_comp_flag
  ON assessments (body_composition_flag)
  WHERE body_composition_flag IS NOT NULL;
