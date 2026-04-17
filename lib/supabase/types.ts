// Types for the BTB Supabase schema. Mirror supabase/schema.sql.

export type Gender = "male" | "female" | "diverse";
export type AssessmentStatus = "pending" | "processing" | "completed" | "failed";
export type ReportType = "metabolic" | "recovery" | "complete";
export type AnswerType = "number" | "select" | "radio" | "slider";
export type ScoreBand = "low" | "moderate" | "high" | "very_high";
// Mirrors i18n/routing.ts#routing.locales. Kept duplicated here so
// non-UI code (API routes, PDF/email generators) can import this
// without pulling in the next-intl runtime. Keep in sync.
export type Locale = "de" | "en" | "it";

// ─── Systemic warnings & assessment result envelope ────────────────────────
// Mirrors lib/scoring/index.ts → FullScoringResult so the report pipeline has
// one canonical shape to consume. Kept here so downstream code (PDF, email,
// client) doesn't need to reach into the scoring package for types.

export interface SystemicWarningFlags {
  overtraining_risk: boolean;
  chronic_stress_risk: boolean;
  hpa_axis_risk: boolean;
  sleep_consistency_flag: boolean;
  sitting_critical: boolean;
  sitting_elevated: boolean;
  bmi_disclaimer_needed: boolean;
}

export interface SystemicWarningEntry {
  code:
    | "overtraining_risk"
    | "chronic_stress_risk"
    | "hpa_axis_risk"
    | "sleep_consistency"
    | "sitting_critical"
    | "sitting_elevated"
    | "bmi_disclaimer";
  text: string;
}

export interface CompleteAssessmentResult {
  assessment_id: string | null;
  user_id: string | null;
  overall_score_0_100: number;
  overall_band: string;
  top_priority_module: string;
  systemic_warnings: SystemicWarningFlags;
  warnings_active: SystemicWarningEntry[];
}

export interface User {
  id: string;
  email: string;
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface InstrumentVersion {
  id: string;
  instrument_name: string;
  version: string;
  active_from: string;
  notes: string | null;
}

export interface ModelVersion {
  id: string;
  model_name: string;
  version: string;
  description: string | null;
  effective_from: string;
}

export interface Assessment {
  id: string;
  user_id: string;
  assessment_type: string;
  instrument_version_id: string | null;
  status: AssessmentStatus;
  report_type: ReportType | null;
  locale: Locale;
  created_at: string;
  completed_at: string | null;
}

export interface Question {
  id: string;
  instrument_id: string;
  code: string;
  text: string;
  answer_type: AnswerType;
  sort_order: number | null;
  category: string | null;
}

export interface Response {
  id: string;
  assessment_id: string;
  question_id: string | null;
  question_code: string;
  raw_value: string;
  normalized_value: number | null;
  created_at: string;
}

export interface DerivedMetric {
  id: string;
  assessment_id: string;
  metric_code: string;
  value: number;
  unit: string | null;
  source_rule_version: string | null;
  created_at: string;
}

export interface Score {
  id: string;
  assessment_id: string;
  score_code: string;
  score_value: number;
  band: ScoreBand | null;
  interpretation_key: string | null;
  model_version_id: string | null;
  created_at: string;
}

export interface ReportJob {
  id: string;
  assessment_id: string;
  status: AssessmentStatus;
  prompt_version: string | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ReportArtifact {
  id: string;
  assessment_id: string;
  file_url: string;
  file_type: string;
  created_at: string;
}
