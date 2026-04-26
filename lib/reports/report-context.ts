// Single source of truth for AI-prompt input.
//
// Every layer that turns user data into prose (main report generator,
// individual plan generator, preview/results interpret-block, sub-call
// premium prompts) consumes a `ReportContext` produced here — so all
// layers see the same validated, provenance-aware bundle.
//
// Data flow (DB-backed path):
//   /api/report/generate (assessmentId)
//     └─ loadReportContext(assessmentId)
//        ├─ Supabase reads: assessments, users, responses, wearable_uploads
//        ├─ reconstruct FullAssessmentInputs
//        ├─ runFullScoring -> FullScoringResult
//        ├─ computeScoreDrivers(result, raw)
//        ├─ assess data-quality (completeness, contradictions, fallback flags)
//        └─ assemble ReportContext
//
// Data flow (demo path, no DB):
//   /api/report/generate (demoContext)
//     └─ buildReportContextFromInputs(inputs)  (same shape, no Supabase)
//
// Design rule: this module owns the SHAPE of the AI input. Prompts must
// not pull DB rows or read raw responses themselves; they take a
// ReportContext.

import type {
  FullAssessmentInputs,
  FullScoringResult,
  Gender,
  FruitVegLevel,
  SleepQualityLabel,
  WakeupFrequency,
  ScoreProvenanceMap,
} from "@/lib/scoring/index";
import { runFullScoring } from "@/lib/scoring/index";
import type { Locale } from "@/lib/supabase/types";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { computeScoreDrivers, type ScoreDriversByDimension } from "./score-drivers";

// ─── Personalisation enum types ─────────────────────────────────────────

export type ReportType = "metabolic" | "recovery" | "complete";
export type MainGoal = "feel_better" | "body_comp" | "performance" | "stress_sleep" | "longevity";
export type TimeBudget = "minimal" | "moderate" | "committed" | "athlete";
export type ExperienceLevel = "beginner" | "restart" | "intermediate" | "advanced";
export type NutritionPainpoint = "cravings_evening" | "low_protein" | "no_energy" | "no_time" | "none";
export type StressSource = "job" | "family" | "finances" | "health" | "future" | "none";
export type RecoveryRitual = "sport" | "nature" | "cooking" | "reading" | "meditation" | "social" | "none";
export type ScreenTimeBeforeSleep = "kein" | "unter_30" | "30_60" | "ueber_60";
export type TrainingIntensitySelfReported = "kraft" | "kardio" | "ausdauer" | "kraft_ausdauer" | "team" | "yoga" | "keine" | string;

// ─── Prompt + context versioning ────────────────────────────────────────

export const CONTEXT_VERSION = "ctx_v1";
export const PROMPT_VERSION = "btb_report_v3.1.0";

// ─── Sub-types ──────────────────────────────────────────────────────────

export interface ReportContextMeta {
  assessment_id: string;
  user_id: string | null;
  locale: Locale;
  report_type: ReportType;
  context_version: string;
  prompt_version: string;
  generated_at: string;       // ISO timestamp when context was built
}

export interface ReportContextUser {
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  email: string | null;
}

export interface ReportContextRaw {
  daily_steps: number | null;
  sitting_hours_per_day: number;
  standing_hours_per_day: number;
  /** User's original "wie oft trainierst du"-answer, captured 1:1 (Phase-1 fix). */
  training_days_self_reported: number | null;
  training_intensity_self_reported: TrainingIntensitySelfReported | null;
  moderate_days: number;
  moderate_minutes_per_day: number;
  vigorous_days: number;
  vigorous_minutes_per_day: number;
  walking_days: number;
  walking_minutes_per_day: number;
  walking_total_minutes_week: number | null;
  sleep_duration_hours: number;
  sleep_quality: SleepQualityLabel;
  sleep_quality_label_localized: string;    // already-localized human label
  wakeups: WakeupFrequency;
  wakeup_frequency_label_localized: string;
  morning_recovery_1_10: number;
  stress_level_1_10: number;
  meals_per_day: number;
  water_litres: number;
  fruit_veg: FruitVegLevel;
  fruit_veg_label_localized: string;
  screen_time_before_sleep: ScreenTimeBeforeSleep | null;
}

export interface ReportContextPersonalization {
  main_goal: MainGoal | null;
  time_budget: TimeBudget | null;
  experience_level: ExperienceLevel | null;
  nutrition_painpoint: NutritionPainpoint | null;
  stress_source: StressSource | null;
  recovery_ritual: RecoveryRitual | null;
}

export interface ReportContextScoring {
  result: FullScoringResult;
  drivers: ScoreDriversByDimension;
  priority_order: string[];
}

export interface WearableSourceTag {
  kind: "whoop" | "apple_health" | "form";
  days?: number;
}

export interface ReportContextWearable {
  available: boolean;
  sources: WearableSourceTag[];
  // Lightweight provenance map: which scoring dimension is anchored to
  // measured data vs. self-report. Mirrors what scoring already returns.
  provenance: ScoreProvenanceMap;
  /** Days covered by the strongest connected wearable upload (max), if any. */
  days_covered: number;
}

export interface DataContradiction {
  field: string;
  values: { source: string; value: unknown }[];
  note: string;
}

export interface ReportContextDataQuality {
  /** 0-100 — how many of the expected fields are non-default/non-null. */
  completeness_pct: number;
  /** Field names that are missing or had to be filled with a default. */
  missing_fields: string[];
  /** Field names where a default was applied during reconstruction. */
  fallback_defaults_applied: string[];
  /** Conflicts between self-report and wearable measurement. */
  contradictions: DataContradiction[];
}

export interface ReportContextFlags {
  overtraining_risk: boolean;
  chronic_stress_risk: boolean;
  hpa_axis_risk: boolean;
  sitting_critical: boolean;
  sitting_elevated: boolean;
  sleep_consistency_flag: boolean;
  bmi_disclaimer_needed: boolean;
}

export interface ReportContext {
  meta: ReportContextMeta;
  user: ReportContextUser;
  raw: ReportContextRaw;
  personalization: ReportContextPersonalization;
  scoring: ReportContextScoring;
  wearable: ReportContextWearable;
  data_quality: ReportContextDataQuality;
  flags: ReportContextFlags;
}

// ─── Error shape ────────────────────────────────────────────────────────

export type ReportContextErrorCode =
  | "no_assessment"
  | "no_user"
  | "no_responses"
  | "scoring_failed"
  | "supabase_error"
  | "invalid_inputs";

export interface ReportContextError {
  code: ReportContextErrorCode;
  message: string;
  cause?: unknown;
}

export type LoadReportContextResult =
  | { ok: true; context: ReportContext }
  | { ok: false; error: ReportContextError };

// ─── Localized-label maps (kept here to avoid importing from prompt files) ─

const SLEEP_QUALITY_LOCAL: Record<Locale, Record<string, string>> = {
  de: { sehr_gut: "sehr gut", gut: "gut", mittel: "mittel", schlecht: "schlecht" },
  en: { sehr_gut: "very good", gut: "good", mittel: "moderate", schlecht: "poor" },
  it: { sehr_gut: "molto buona", gut: "buona", mittel: "moderata", schlecht: "scarsa" },
  tr: { sehr_gut: "çok iyi", gut: "iyi", mittel: "orta", schlecht: "kötü" },
};

const WAKEUP_LOCAL: Record<Locale, Record<string, string>> = {
  de: { nie: "nie", selten: "selten", oft: "oft", immer: "fast jede Nacht" },
  en: { nie: "never", selten: "rarely", oft: "often", immer: "almost every night" },
  it: { nie: "mai", selten: "raramente", oft: "spesso", immer: "quasi ogni notte" },
  tr: { nie: "hiç", selten: "nadiren", oft: "sık sık", immer: "neredeyse her gece" },
};

const FRUIT_VEG_LOCAL: Record<Locale, Record<string, string>> = {
  de: {
    none: "kaum bis gar nicht (0–2 Mahlzeiten/Woche)",
    low: "eher selten (3–7 Mahlzeiten/Woche)",
    moderate: "ca. Hälfte der Mahlzeiten (8–11/Woche)",
    good: "meisten Mahlzeiten (12–17/Woche)",
    optimal: "fast jeder Mahlzeit (18–21/Woche)",
  },
  en: {
    none: "barely or not at all (0–2 meals/week)",
    low: "rarely (3–7 meals/week)",
    moderate: "about half of meals (8–11/week)",
    good: "most meals (12–17/week)",
    optimal: "almost every meal (18–21/week)",
  },
  it: {
    none: "quasi mai (0–2 pasti/settimana)",
    low: "raramente (3–7 pasti/settimana)",
    moderate: "circa metà dei pasti (8–11/settimana)",
    good: "la maggior parte dei pasti (12–17/settimana)",
    optimal: "quasi ogni pasto (18–21/settimana)",
  },
  tr: {
    none: "neredeyse hiç (0–2 öğün/hafta)",
    low: "nadiren (3–7 öğün/hafta)",
    moderate: "öğünlerin yaklaşık yarısı (8–11/hafta)",
    good: "öğünlerin çoğu (12–17/hafta)",
    optimal: "neredeyse her öğün (18–21/hafta)",
  },
};

function localizeSleepQuality(value: SleepQualityLabel, locale: Locale): string {
  return SLEEP_QUALITY_LOCAL[locale]?.[value] ?? value;
}
function localizeWakeups(value: WakeupFrequency, locale: Locale): string {
  return WAKEUP_LOCAL[locale]?.[value] ?? value;
}
function localizeFruitVeg(value: FruitVegLevel, locale: Locale): string {
  return FRUIT_VEG_LOCAL[locale]?.[value] ?? value;
}

// ─── Public loaders ─────────────────────────────────────────────────────

/**
 * Load a ReportContext from the database for the given assessment.
 * Reads responses, scores, wearable_uploads, then runs scoring.
 */
export async function loadReportContext(
  assessmentId: string,
): Promise<LoadReportContextResult> {
  if (!assessmentId) {
    return { ok: false, error: { code: "invalid_inputs", message: "assessmentId is required" } };
  }

  let supabase: ReturnType<typeof getSupabaseServiceClient>;
  try {
    supabase = getSupabaseServiceClient();
  } catch (err) {
    return {
      ok: false,
      error: { code: "supabase_error", message: "supabase init failed", cause: err },
    };
  }

  // 1. Assessment row.
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, report_type, user_id, data_sources, locale")
    .eq("id", assessmentId)
    .single();
  if (aErr || !assessment) {
    return { ok: false, error: { code: "no_assessment", message: aErr?.message ?? "assessment not found" } };
  }

  const locale: Locale =
    assessment.locale === "en" || assessment.locale === "it" || assessment.locale === "tr"
      ? assessment.locale
      : "de";
  const reportType: ReportType =
    assessment.report_type === "metabolic" || assessment.report_type === "recovery"
      ? assessment.report_type
      : "complete";

  // 2. User row.
  const { data: user, error: uErr } = await supabase
    .from("users")
    .select("email, age, gender, height_cm, weight_kg")
    .eq("id", assessment.user_id)
    .single();
  if (uErr || !user) {
    return { ok: false, error: { code: "no_user", message: uErr?.message ?? "user not found" } };
  }

  // 3. Responses.
  const { data: responses, error: rErr } = await supabase
    .from("responses")
    .select("question_code, raw_value, normalized_value")
    .eq("assessment_id", assessmentId);
  if (rErr) {
    return { ok: false, error: { code: "no_responses", message: rErr.message } };
  }

  const respMap = new Map<string, string>(
    (responses ?? []).map((r) => [r.question_code, r.raw_value]),
  );

  // 4. Optional wearable upload.
  const dataSources = assessment.data_sources as
    | { form?: true; whoop?: { days: number; upload_id?: string }; apple_health?: { days: number; upload_id?: string } }
    | null;

  let wearableOverrides: FullAssessmentInputs["wearable"] | undefined;
  let wearableMetrics: Record<string, Record<string, number> | undefined> | null = null;
  if (dataSources?.whoop || dataSources?.apple_health) {
    const source = dataSources.whoop ? "whoop" : "apple_health";
    const { data: wUp } = await supabase
      .from("wearable_uploads")
      .select("source, days_covered, metrics")
      .eq("assessment_id", assessmentId)
      .eq("source", source)
      .maybeSingle();
    if (wUp) {
      const m = wUp.metrics as Record<string, Record<string, number> | undefined>;
      wearableMetrics = m;
      wearableOverrides = {
        source: wUp.source as "whoop" | "apple_health",
        days_covered: wUp.days_covered,
        sleep: m.sleep
          ? {
              duration_hours: m.sleep.avg_duration_hours,
              efficiency_pct: m.sleep.avg_efficiency_pct,
              wakeups_per_night: m.sleep.avg_wakeups,
            }
          : undefined,
        recovery: m.recovery
          ? {
              whoop_recovery_0_100:
                wUp.source === "whoop" ? m.recovery.avg_score : undefined,
              hrv_ms: m.recovery.avg_hrv_ms,
              rhr_bpm: m.recovery.avg_rhr_bpm,
            }
          : undefined,
        activity: m.activity
          ? {
              daily_steps: m.activity.avg_steps,
              whoop_strain_0_21:
                wUp.source === "whoop" ? m.activity.avg_strain : undefined,
              active_kcal: m.activity.avg_active_kcal,
            }
          : undefined,
        vo2max: m.vo2max ? { measured_ml_kg_min: m.vo2max.last_value } : undefined,
        body: m.body ? { weight_kg: m.body.last_weight_kg } : undefined,
      };
    }
  }

  // 5. Reconstruct inputs + run scoring.
  // Track which fields fell back to defaults so data_quality can flag them.
  const fallbackDefaultsApplied: string[] = [];

  const numField = (key: string, fallback: number, fallbackKey: string): number => {
    const raw = respMap.get(key);
    const parsed = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(parsed)) return parsed;
    fallbackDefaultsApplied.push(fallbackKey);
    return fallback;
  };
  const strField = <T extends string>(key: string, fallback: T, fallbackKey: string): T => {
    const raw = respMap.get(key);
    if (raw != null) return raw as T;
    fallbackDefaultsApplied.push(fallbackKey);
    return fallback;
  };

  const reconstructed: FullAssessmentInputs = {
    age: user.age ?? numField("age", 30, "age"),
    gender: (user.gender as Gender) ?? strField<Gender>("gender", "diverse", "gender"),
    height_cm: user.height_cm ?? numField("height_cm", 175, "height_cm"),
    weight_kg: user.weight_kg ?? numField("weight_kg", 75, "weight_kg"),
    activity: {
      walking_days: numField("walking_days", 5, "walking_days"),
      walking_minutes_per_day: numField("walking_minutes_per_day", 30, "walking_minutes_per_day"),
      walking_total_minutes_week: respMap.has("walking_total_minutes_week")
        ? numField("walking_total_minutes_week", 0, "walking_total_minutes_week")
        : undefined,
      moderate_days: numField("moderate_days", 0, "moderate_days"),
      moderate_minutes_per_day: numField("moderate_minutes_per_day", 0, "moderate_minutes_per_day"),
      vigorous_days: numField("vigorous_days", 0, "vigorous_days"),
      vigorous_minutes_per_day: numField("vigorous_minutes_per_day", 0, "vigorous_minutes_per_day"),
    },
    sleep: {
      duration_hours: numField("sleep_duration_hours", 7, "sleep_duration_hours"),
      quality: strField<SleepQualityLabel>("sleep_quality", "mittel", "sleep_quality"),
      wakeups: strField<WakeupFrequency>("wakeups", "selten", "wakeups"),
      recovery_1_10: numField("recovery_1_10", 5, "recovery_1_10"),
    },
    metabolic: {
      meals_per_day: numField("meals_per_day", 3, "meals_per_day"),
      water_litres: numField("water_litres", 2, "water_litres"),
      sitting_hours: numField("sitting_hours", 6, "sitting_hours"),
      fruit_veg: strField<FruitVegLevel>("fruit_veg", "moderate", "fruit_veg"),
    },
    stress: { stress_level_1_10: numField("stress_level_1_10", 5, "stress_level_1_10") },
    wearable: wearableOverrides,
  };

  let result: FullScoringResult;
  try {
    result = runFullScoring(reconstructed);
  } catch (err) {
    return { ok: false, error: { code: "scoring_failed", message: "runFullScoring threw", cause: err } };
  }

  // 6. Compute score-drivers (uses lib/interpretations/* internally as data
  //    source — never piped into prompts).
  const driversInput: ReportContextRaw = buildRawSlice(
    respMap,
    reconstructed,
    locale,
    fallbackDefaultsApplied,
  );
  const drivers = computeScoreDrivers(result, driversInput);

  // 7. Wearable provenance summary.
  const sources: WearableSourceTag[] = [];
  if (dataSources?.form) sources.push({ kind: "form" });
  if (dataSources?.whoop) sources.push({ kind: "whoop", days: dataSources.whoop.days });
  if (dataSources?.apple_health) sources.push({ kind: "apple_health", days: dataSources.apple_health.days });
  if (sources.length === 0) sources.push({ kind: "form" });
  const wearableAvailable = !!(dataSources?.whoop || dataSources?.apple_health);
  const daysCovered = Math.max(
    dataSources?.whoop?.days ?? 0,
    dataSources?.apple_health?.days ?? 0,
  );

  // 8. Data-quality assessment.
  const expectedRawFields = [
    "daily_steps",
    "sitting_hours",
    "training_days_self_reported",
    "sleep_duration_hours",
    "sleep_quality",
    "wakeups",
    "recovery_1_10",
    "stress_level_1_10",
    "meals_per_day",
    "water_litres",
    "fruit_veg",
    "main_goal",
    "time_budget",
    "experience_level",
  ] as const;
  const presentFields = expectedRawFields.filter((k) => respMap.has(k));
  const missingFields = expectedRawFields.filter((k) => !respMap.has(k));
  const completenessPct = Math.round((presentFields.length / expectedRawFields.length) * 100);

  // Contradictions: self-report daily_steps vs. wearable daily_steps if both exist.
  const contradictions: DataContradiction[] = [];
  if (driversInput.daily_steps != null && wearableMetrics?.activity?.avg_steps != null) {
    const selfSteps = driversInput.daily_steps;
    const measuredSteps = Math.round(wearableMetrics.activity.avg_steps);
    const diffPct = selfSteps > 0
      ? Math.abs(selfSteps - measuredSteps) / Math.max(selfSteps, measuredSteps) * 100
      : 100;
    if (diffPct > 30) {
      contradictions.push({
        field: "daily_steps",
        values: [
          { source: "self_report", value: selfSteps },
          { source: dataSources?.whoop ? "whoop" : "apple_health", value: measuredSteps },
        ],
        note: `${diffPct.toFixed(0)}% Abweichung zwischen Selbstangabe und Messung`,
      });
    }
  }

  // 9. Personalization slice.
  const personalization: ReportContextPersonalization = {
    main_goal: (respMap.get("main_goal") as MainGoal | undefined) ?? null,
    time_budget: (respMap.get("time_budget") as TimeBudget | undefined) ?? null,
    experience_level: (respMap.get("experience_level") as ExperienceLevel | undefined) ?? null,
    nutrition_painpoint: (respMap.get("nutrition_painpoint") as NutritionPainpoint | undefined) ?? null,
    stress_source: (respMap.get("stress_source") as StressSource | undefined) ?? null,
    recovery_ritual: (respMap.get("recovery_ritual") as RecoveryRitual | undefined) ?? null,
  };

  // 10. Assemble.
  const ctx: ReportContext = {
    meta: {
      assessment_id: assessmentId,
      user_id: assessment.user_id ?? null,
      locale,
      report_type: reportType,
      context_version: CONTEXT_VERSION,
      prompt_version: PROMPT_VERSION,
      generated_at: new Date().toISOString(),
    },
    user: {
      age: user.age ?? reconstructed.age,
      gender: (user.gender as Gender) ?? reconstructed.gender,
      height_cm: user.height_cm ?? reconstructed.height_cm,
      weight_kg: user.weight_kg ?? reconstructed.weight_kg,
      email: user.email ?? null,
    },
    raw: driversInput,
    personalization,
    scoring: {
      result,
      drivers,
      priority_order: result.interpretation.priority_order,
    },
    wearable: {
      available: wearableAvailable,
      sources,
      provenance: result.provenance,
      days_covered: daysCovered,
    },
    data_quality: {
      completeness_pct: completenessPct,
      missing_fields: missingFields as unknown as string[],
      fallback_defaults_applied: fallbackDefaultsApplied,
      contradictions,
    },
    flags: {
      overtraining_risk: result.systemic_warnings.overtraining_risk,
      chronic_stress_risk: result.systemic_warnings.chronic_stress_risk,
      hpa_axis_risk: result.systemic_warnings.hpa_axis_risk,
      sitting_critical: result.systemic_warnings.sitting_critical,
      sitting_elevated: result.systemic_warnings.sitting_elevated,
      sleep_consistency_flag: result.systemic_warnings.sleep_consistency_flag,
      bmi_disclaimer_needed: result.systemic_warnings.bmi_disclaimer_needed,
    },
  };

  return { ok: true, context: ctx };
}

// ─── Demo-path constructor (no DB) ──────────────────────────────────────

export interface DemoContextInputs {
  reportType: ReportType;
  locale: Locale;
  user: { email: string; age: number; gender: Gender; height_cm: number; weight_kg: number };
  result: FullScoringResult;
  sleep_duration_hours: number;
  sleep_quality_label?: SleepQualityLabel;
  wakeup_frequency_label?: WakeupFrequency;
  morning_recovery_1_10?: number;
  stress_level_1_10?: number;
  meals_per_day?: number;
  water_litres?: number;
  fruit_veg_label?: FruitVegLevel;
  standing_hours_per_day?: number;
  sitting_hours_per_day?: number;
  training_days?: number;
  daily_steps?: number;
  screen_time_before_sleep?: ScreenTimeBeforeSleep | null;
  main_goal?: MainGoal | null;
  time_budget?: TimeBudget | null;
  experience_level?: ExperienceLevel | null;
  nutrition_painpoint?: NutritionPainpoint | null;
  stress_source?: StressSource | null;
  recovery_ritual?: RecoveryRitual | null;
  data_sources?: { form?: true; whoop?: { days: number }; apple_health?: { days: number } };
}

/**
 * Demo-mode constructor. Skips Supabase and builds the same shape from
 * an in-memory inputs object. Used by /api/report/generate when a body
 * carries `demoContext` instead of `assessmentId`.
 */
export function buildReportContextFromInputs(
  inputs: DemoContextInputs,
): ReportContext {
  const locale = inputs.locale;
  const result = inputs.result;
  const fallbackDefaultsApplied: string[] = [];

  const sleepQuality = inputs.sleep_quality_label ?? "mittel";
  const wakeups = inputs.wakeup_frequency_label ?? "selten";
  const fruitVeg = inputs.fruit_veg_label ?? "moderate";

  const raw: ReportContextRaw = {
    daily_steps: inputs.daily_steps ?? null,
    sitting_hours_per_day: inputs.sitting_hours_per_day ?? result.metabolic.sitting_hours,
    standing_hours_per_day: inputs.standing_hours_per_day ?? 3,
    training_days_self_reported: inputs.training_days ?? null,
    training_intensity_self_reported: null,
    moderate_days: 0,
    moderate_minutes_per_day: 0,
    vigorous_days: 0,
    vigorous_minutes_per_day: 0,
    walking_days: 0,
    walking_minutes_per_day: 0,
    walking_total_minutes_week: null,
    sleep_duration_hours: inputs.sleep_duration_hours,
    sleep_quality: sleepQuality,
    sleep_quality_label_localized: localizeSleepQuality(sleepQuality, locale),
    wakeups,
    wakeup_frequency_label_localized: localizeWakeups(wakeups, locale),
    morning_recovery_1_10: inputs.morning_recovery_1_10 ?? 5,
    stress_level_1_10: inputs.stress_level_1_10 ?? 5,
    meals_per_day: inputs.meals_per_day ?? 3,
    water_litres: inputs.water_litres ?? 2,
    fruit_veg: fruitVeg,
    fruit_veg_label_localized: localizeFruitVeg(fruitVeg, locale),
    screen_time_before_sleep: inputs.screen_time_before_sleep ?? null,
  };

  const drivers = computeScoreDrivers(result, raw);

  const sources: WearableSourceTag[] = [];
  if (inputs.data_sources?.form) sources.push({ kind: "form" });
  if (inputs.data_sources?.whoop) sources.push({ kind: "whoop", days: inputs.data_sources.whoop.days });
  if (inputs.data_sources?.apple_health) sources.push({ kind: "apple_health", days: inputs.data_sources.apple_health.days });
  if (sources.length === 0) sources.push({ kind: "form" });
  const wearableAvailable = !!(inputs.data_sources?.whoop || inputs.data_sources?.apple_health);

  return {
    meta: {
      assessment_id: "demo",
      user_id: null,
      locale,
      report_type: inputs.reportType,
      context_version: CONTEXT_VERSION,
      prompt_version: PROMPT_VERSION,
      generated_at: new Date().toISOString(),
    },
    user: {
      age: inputs.user.age,
      gender: inputs.user.gender,
      height_cm: inputs.user.height_cm,
      weight_kg: inputs.user.weight_kg,
      email: inputs.user.email,
    },
    raw,
    personalization: {
      main_goal: inputs.main_goal ?? null,
      time_budget: inputs.time_budget ?? null,
      experience_level: inputs.experience_level ?? null,
      nutrition_painpoint: inputs.nutrition_painpoint ?? null,
      stress_source: inputs.stress_source ?? null,
      recovery_ritual: inputs.recovery_ritual ?? null,
    },
    scoring: {
      result,
      drivers,
      priority_order: result.interpretation.priority_order,
    },
    wearable: {
      available: wearableAvailable,
      sources,
      provenance: result.provenance,
      days_covered:
        Math.max(inputs.data_sources?.whoop?.days ?? 0, inputs.data_sources?.apple_health?.days ?? 0),
    },
    data_quality: {
      completeness_pct: 100,    // demo = trusted in-memory inputs
      missing_fields: [],
      fallback_defaults_applied: fallbackDefaultsApplied,
      contradictions: [],
    },
    flags: {
      overtraining_risk: result.systemic_warnings.overtraining_risk,
      chronic_stress_risk: result.systemic_warnings.chronic_stress_risk,
      hpa_axis_risk: result.systemic_warnings.hpa_axis_risk,
      sitting_critical: result.systemic_warnings.sitting_critical,
      sitting_elevated: result.systemic_warnings.sitting_elevated,
      sleep_consistency_flag: result.systemic_warnings.sleep_consistency_flag,
      bmi_disclaimer_needed: result.systemic_warnings.bmi_disclaimer_needed,
    },
  };
}

// ─── Helper: build raw slice from DB respMap ────────────────────────────

function buildRawSlice(
  respMap: Map<string, string>,
  reconstructed: FullAssessmentInputs,
  locale: Locale,
  fallbackDefaultsApplied: string[],
): ReportContextRaw {
  const numFromMap = (key: string): number | null => {
    const raw = respMap.get(key);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  // daily_steps resolution: prefer the new "daily_steps" question_code,
  // fall back to legacy "schrittzahl" for pre-Phase-1 assessments.
  const dailySteps =
    numFromMap("daily_steps") ?? numFromMap("schrittzahl");

  const standingHours = numFromMap("standing_hours_per_day") ?? 3;
  const trainingDaysSelfReported = numFromMap("training_days_self_reported");
  const trainingIntensity = respMap.get("training_intensity_self_reported") ?? null;

  if (dailySteps == null) fallbackDefaultsApplied.push("daily_steps");
  if (trainingDaysSelfReported == null) fallbackDefaultsApplied.push("training_days_self_reported");

  return {
    daily_steps: dailySteps,
    sitting_hours_per_day: reconstructed.metabolic.sitting_hours,
    standing_hours_per_day: standingHours,
    training_days_self_reported: trainingDaysSelfReported,
    training_intensity_self_reported: trainingIntensity,
    moderate_days: reconstructed.activity.moderate_days,
    moderate_minutes_per_day: reconstructed.activity.moderate_minutes_per_day,
    vigorous_days: reconstructed.activity.vigorous_days,
    vigorous_minutes_per_day: reconstructed.activity.vigorous_minutes_per_day,
    walking_days: reconstructed.activity.walking_days,
    walking_minutes_per_day: reconstructed.activity.walking_minutes_per_day,
    walking_total_minutes_week: reconstructed.activity.walking_total_minutes_week ?? null,
    sleep_duration_hours: reconstructed.sleep.duration_hours,
    sleep_quality: reconstructed.sleep.quality,
    sleep_quality_label_localized: localizeSleepQuality(reconstructed.sleep.quality, locale),
    wakeups: reconstructed.sleep.wakeups,
    wakeup_frequency_label_localized: localizeWakeups(reconstructed.sleep.wakeups, locale),
    morning_recovery_1_10: reconstructed.sleep.recovery_1_10,
    stress_level_1_10: reconstructed.stress.stress_level_1_10,
    meals_per_day: reconstructed.metabolic.meals_per_day,
    water_litres: reconstructed.metabolic.water_litres,
    fruit_veg: reconstructed.metabolic.fruit_veg,
    fruit_veg_label_localized: localizeFruitVeg(reconstructed.metabolic.fruit_veg, locale),
    screen_time_before_sleep:
      (respMap.get("screen_time_before_sleep") as ScreenTimeBeforeSleep | undefined) ?? null,
  };
}
