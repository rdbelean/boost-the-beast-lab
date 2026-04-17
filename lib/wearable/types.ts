// Shared wearable parser types. Mirrors the `metrics` JSONB shape stored in
// the wearable_uploads table.

export interface WearableMetrics {
  sleep?: {
    avg_duration_hours?: number;
    avg_efficiency_pct?: number;
    avg_wakeups?: number;
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
  };
  body?: {
    last_weight_kg?: number;
  };
  vo2max?: {
    last_value?: number;
  };
}

export interface ParseWarning {
  code: string;
  message: string;
}

export interface WearableParseResult {
  source: "whoop" | "apple_health";
  schema_version: string;
  window_start: string; // ISO date YYYY-MM-DD
  window_end: string;
  days_covered: number; // 0..30
  metrics: WearableMetrics;
  parse_warnings: ParseWarning[];
  parse_duration_ms: number;
  file_size_bytes: number;
}
