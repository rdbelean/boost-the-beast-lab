// Shared wearable parser types. Mirrors the `metrics` JSONB shape stored in
// the wearable_uploads table.

export interface WearableMetrics {
  sleep?: {
    avg_duration_hours?: number;
    avg_efficiency_pct?: number;
    avg_wakeups?: number;
    avg_sleep_performance_pct?: number; // WHOOP Sleep performance % (0..100)
    avg_deep_sleep_min?: number;         // Deep (SWS) duration
    avg_rem_min?: number;                // REM duration
  };
  recovery?: {
    avg_score?: number; // WHOOP recovery 0..100
    avg_hrv_ms?: number;
    avg_rhr_bpm?: number;
  };
  activity?: {
    avg_steps?: number;
    avg_strain?: number; // WHOOP strain 0..21
    avg_active_kcal?: number;
    avg_met_minutes_week?: number;
  };
  body?: {
    last_weight_kg?: number;
    // Body-composition fields from BIA scans (InBody, Tanita, Withings) and
    // DEXA reports. All optional, populated by the AI document/image parser.
    bmi?: number;
    body_fat_pct?: number;
    skeletal_muscle_kg?: number;
    visceral_fat_rating?: number;
    body_water_pct?: number;
    bmr_kcal?: number;
  };
  vo2max?: {
    last_value?: number;
  };
  // Hard fitness numbers that a user might upload from a scan or screenshot
  // but aren't captured by WHOOP/Apple's native aggregates.
  fitness?: {
    resting_hr?: number;
    max_hr?: number;
  };
  // User-profile values that a document might explicitly state (InBody prints
  // them on the first page). These can prefill form fields if the user hasn't
  // answered those questions yet.
  user_profile?: {
    age?: number;
    gender?: "male" | "female";
    height_cm?: number;
    weight_kg?: number;
  };
  // AI-parser self-reported provenance. Non-AI sources leave this undefined.
  provenance?: {
    source_type:
      | "inbody"
      | "tanita"
      | "dexa"
      | "withings"
      | "garmin"
      | "polar"
      | "screenshot"
      | "csv_export"
      | "handwritten"
      | "other";
    confidence: number; // 0..1
    notes: string;
  };
}

export interface ParseWarning {
  code: string;
  message: string;
}

// Wearable-upload source values. Keep in sync with the
// wearable_uploads.source CHECK constraint (see supabase/add_generic_source.sql).
export type WearableSource =
  | "whoop"
  | "apple_health"
  | "ai_document"
  | "ai_image"
  | "ai_text";

export interface WearableParseResult {
  source: WearableSource;
  schema_version: string;
  window_start: string; // ISO date YYYY-MM-DD
  window_end: string;
  days_covered: number; // 0..30
  metrics: WearableMetrics;
  parse_warnings: ParseWarning[];
  parse_duration_ms: number;
  file_size_bytes: number;
}
