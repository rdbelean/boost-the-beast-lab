-- =====================================================================
-- BOOST THE BEAST LAB — Supabase Schema
-- =====================================================================
-- Apply via: Supabase SQL Editor (Dashboard) or `supabase db push`
-- Idempotent: safe to run multiple times via IF NOT EXISTS where possible.
-- =====================================================================

-- NUTZER
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'diverse')),
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- INSTRUMENT VERSIONEN (Fragebogen-Versionierung)
CREATE TABLE IF NOT EXISTS instrument_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_name TEXT NOT NULL,
  version TEXT NOT NULL,
  active_from TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(instrument_name, version)
);

-- MODELL VERSIONEN (Score-Logik Versionierung)
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  effective_from TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_name, version)
);

-- ASSESSMENTS (ein Analyse-Vorgang pro User)
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL DEFAULT 'full',
  instrument_version_id UUID REFERENCES instrument_versions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  report_type TEXT CHECK (report_type IN ('metabolic', 'recovery', 'complete')),
  is_test_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
-- Safety for existing installs that predate is_test_mode.
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT false;

-- FRAGEN KATALOG
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID REFERENCES instrument_versions(id),
  code TEXT NOT NULL,
  text TEXT NOT NULL,
  answer_type TEXT CHECK (answer_type IN ('number', 'select', 'radio', 'slider')),
  sort_order INTEGER,
  category TEXT,
  UNIQUE(instrument_id, code)
);

-- ROH-ANTWORTEN
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  question_code TEXT NOT NULL,
  raw_value TEXT NOT NULL,
  normalized_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ABGELEITETE KENNZAHLEN
CREATE TABLE IF NOT EXISTS derived_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  metric_code TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  source_rule_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, metric_code)
);

-- SCORES
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  score_code TEXT NOT NULL,
  score_value NUMERIC(5,2) NOT NULL CHECK (score_value >= 0 AND score_value <= 100),
  band TEXT CHECK (band IN ('low', 'moderate', 'high', 'very_high')),
  interpretation_key TEXT,
  model_version_id UUID REFERENCES model_versions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, score_code)
);

-- REPORT JOBS
CREATE TABLE IF NOT EXISTS report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prompt_version TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- REPORT DATEIEN (nur Referenzen, keine Binärdaten)
CREATE TABLE IF NOT EXISTS report_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INITIALE DATEN: erste Instrument- und Modellversion
INSERT INTO instrument_versions (instrument_name, version, notes)
VALUES
  ('btb_assessment_v1', '1.0.0', 'Initiales Assessment — Activity, Sleep, Nutrition, Stress'),
  ('ipaq_short', '1.0.0', 'IPAQ Short Form Aktivitätsmodul'),
  ('psqi_adapted', '1.0.0', 'PSQI-basiertes Schlafmodul (adaptiert)')
ON CONFLICT (instrument_name, version) DO NOTHING;

INSERT INTO model_versions (model_name, version, description)
VALUES
  ('activity_score', '1.0.0', 'IPAQ MET-Minuten basierter Activity Score'),
  ('sleep_score', '1.0.0', 'PSQI-basierter Sleep/Recovery Score'),
  ('vo2max_estimate', '1.0.0', 'VO2max Schätzung aus Aktivitätsdaten'),
  ('metabolic_score', '1.0.0', 'Metabolic Score aus BMI + Ernährung + Lifestyle'),
  ('stress_score', '1.0.0', 'Stress & Lifestyle Score')
ON CONFLICT (model_name, version) DO NOTHING;

-- ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE derived_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_artifacts ENABLE ROW LEVEL SECURITY;

-- SERVICE ROLE hat vollen Zugriff (für Backend API).
-- Die Service-Role umgeht RLS ohnehin; diese Policies erlauben zusätzlich
-- expliziten Zugriff falls über andere Rollen geprüft wird.
DROP POLICY IF EXISTS "service_role_all" ON users;
DROP POLICY IF EXISTS "service_role_all" ON assessments;
DROP POLICY IF EXISTS "service_role_all" ON responses;
DROP POLICY IF EXISTS "service_role_all" ON scores;
DROP POLICY IF EXISTS "service_role_all" ON derived_metrics;
DROP POLICY IF EXISTS "service_role_all" ON report_jobs;
DROP POLICY IF EXISTS "service_role_all" ON report_artifacts;

CREATE POLICY "service_role_all" ON users FOR ALL USING (true);
CREATE POLICY "service_role_all" ON assessments FOR ALL USING (true);
CREATE POLICY "service_role_all" ON responses FOR ALL USING (true);
CREATE POLICY "service_role_all" ON scores FOR ALL USING (true);
CREATE POLICY "service_role_all" ON derived_metrics FOR ALL USING (true);
CREATE POLICY "service_role_all" ON report_jobs FOR ALL USING (true);
CREATE POLICY "service_role_all" ON report_artifacts FOR ALL USING (true);
