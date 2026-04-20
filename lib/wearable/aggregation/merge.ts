// Merges multiple WearableParseResult objects into a single WearableMetrics
// with per-field provenance tracking.
//
// Priority rules (highest wins per field group):
//   body.*       → InBody/DEXA/Tanita/Withings AI > other AI > Apple > WHOOP
//   sleep.*      → WHOOP > Apple > AI
//   recovery.*   → WHOOP > Apple > other
//   activity.avg_steps → Apple > WHOOP > other
//   activity.avg_strain / avg_active_kcal → WHOOP only
//   vo2max.*     → latest window_end
//   user_profile → AI > wearable
//   fitness.*    → highest confidence any source

import type {
  WearableParseResult,
  WearableMetrics,
  WearableSource,
  FieldProvenance,
  MergedWearableMetrics,
  SourceContribution,
} from "../types";

type BodyScanType = "inbody" | "tanita" | "dexa" | "withings";
const BODY_SCAN_TYPES = new Set<string>(["inbody", "tanita", "dexa", "withings"]);

function isBodyScanAI(r: WearableParseResult): boolean {
  return (
    (r.source === "ai_document" || r.source === "ai_image") &&
    r.metrics.provenance != null &&
    BODY_SCAN_TYPES.has(r.metrics.provenance.source_type)
  );
}

// Returns a numeric rank for a result within a given field category.
// Higher = preferred.
function bodyRank(r: WearableParseResult): number {
  if (isBodyScanAI(r)) return 4;
  if (r.source === "ai_document" || r.source === "ai_image" || r.source === "ai_text") return 3;
  if (r.source === "apple_health") return 2;
  if (r.source === "whoop") return 1;
  return 0;
}

function sleepRank(r: WearableParseResult): number {
  if (r.source === "whoop") return 3;
  if (r.source === "apple_health") return 2;
  return 1;
}

function recoveryRank(r: WearableParseResult): number {
  if (r.source === "whoop") return 3;
  if (r.source === "apple_health") return 2;
  return 1;
}

function stepsRank(r: WearableParseResult): number {
  if (r.source === "apple_health") return 3;
  if (r.source === "whoop") return 2;
  return 1;
}

function userProfileRank(r: WearableParseResult): number {
  if (r.source === "ai_document" || r.source === "ai_image" || r.source === "ai_text") return 2;
  return 1;
}

function confidence(r: WearableParseResult): number {
  return r.metrics.provenance?.confidence ?? 1;
}

function provEntry(r: WearableParseResult): FieldProvenance {
  return {
    source: r.source,
    file_name: (r as WearableParseResult & { _file_name?: string })._file_name ?? r.source,
    confidence: confidence(r),
  };
}

// Pick the best result for a field given a rank function. Returns null if no
// result has a non-null value for the field.
function best<T>(
  results: WearableParseResult[],
  getter: (r: WearableParseResult) => T | undefined | null,
  rank: (r: WearableParseResult) => number,
): { value: T; result: WearableParseResult } | null {
  let best: { value: T; result: WearableParseResult; rank: number } | null = null;
  for (const r of results) {
    const v = getter(r);
    if (v == null) continue;
    const rk = rank(r);
    if (!best || rk > best.rank) {
      best = { value: v, result: r, rank: rk };
    }
  }
  return best ? { value: best.value, result: best.result } : null;
}

// Latest window_end wins for VO2max (most recent measurement).
function latestVo2max(results: WearableParseResult[]): { value: number; result: WearableParseResult } | null {
  let best: { value: number; result: WearableParseResult; windowEnd: string } | null = null;
  for (const r of results) {
    const v = r.metrics.vo2max?.last_value;
    if (v == null) continue;
    if (!best || r.window_end > best.windowEnd) {
      best = { value: v, result: r, windowEnd: r.window_end };
    }
  }
  return best ? { value: best.value, result: best.result } : null;
}

export interface MergeInput {
  results: WearableParseResult[];
  // File names in same order as results (injected by batch.ts so we can
  // record them in provenance without touching WearableParseResult).
  fileNames: string[];
}

export function mergeWearableResults(input: MergeInput): MergedWearableMetrics {
  const { results, fileNames } = input;

  // Attach file names to results for provEntry() to use.
  const tagged = results.map((r, i) => {
    const copy = { ...r } as WearableParseResult & { _file_name?: string };
    copy._file_name = fileNames[i] ?? r.source;
    return copy;
  });

  const fieldProv: Record<string, FieldProvenance> = {};
  const merged: Record<string, unknown> = {};

  function set<K extends keyof WearableMetrics>(
    key: K,
    subKey: string,
    match: { value: unknown; result: WearableParseResult } | null,
  ) {
    if (!match) return;
    if (!merged[key]) merged[key] = {};
    (merged[key] as Record<string, unknown>)[subKey] = match.value;
    fieldProv[`${key}.${subKey}`] = provEntry(match.result);
  }

  // ── sleep ──
  set("sleep", "avg_duration_hours", best(tagged, (r) => r.metrics.sleep?.avg_duration_hours, sleepRank));
  set("sleep", "avg_efficiency_pct", best(tagged, (r) => r.metrics.sleep?.avg_efficiency_pct, sleepRank));
  set("sleep", "avg_wakeups", best(tagged, (r) => r.metrics.sleep?.avg_wakeups, sleepRank));
  set("sleep", "avg_sleep_performance_pct", best(tagged, (r) => r.metrics.sleep?.avg_sleep_performance_pct, sleepRank));
  set("sleep", "avg_deep_sleep_min", best(tagged, (r) => r.metrics.sleep?.avg_deep_sleep_min, sleepRank));
  set("sleep", "avg_rem_min", best(tagged, (r) => r.metrics.sleep?.avg_rem_min, sleepRank));

  // ── recovery ──
  set("recovery", "avg_score", best(tagged, (r) => r.metrics.recovery?.avg_score, recoveryRank));
  set("recovery", "avg_hrv_ms", best(tagged, (r) => r.metrics.recovery?.avg_hrv_ms, recoveryRank));
  set("recovery", "avg_rhr_bpm", best(tagged, (r) => r.metrics.recovery?.avg_rhr_bpm, recoveryRank));

  // ── activity ──
  set("activity", "avg_steps", best(tagged, (r) => r.metrics.activity?.avg_steps, stepsRank));
  set("activity", "avg_strain", best(tagged, (r) => r.metrics.activity?.avg_strain, () => 1));
  set("activity", "avg_active_kcal", best(tagged, (r) => r.metrics.activity?.avg_active_kcal, () => 1));
  set("activity", "avg_met_minutes_week", best(tagged, (r) => r.metrics.activity?.avg_met_minutes_week, () => 1));

  // ── body ──
  set("body", "last_weight_kg", best(tagged, (r) => r.metrics.body?.last_weight_kg, bodyRank));
  set("body", "bmi", best(tagged, (r) => r.metrics.body?.bmi, bodyRank));
  set("body", "body_fat_pct", best(tagged, (r) => r.metrics.body?.body_fat_pct, bodyRank));
  set("body", "skeletal_muscle_kg", best(tagged, (r) => r.metrics.body?.skeletal_muscle_kg, bodyRank));
  set("body", "visceral_fat_rating", best(tagged, (r) => r.metrics.body?.visceral_fat_rating, bodyRank));
  set("body", "body_water_pct", best(tagged, (r) => r.metrics.body?.body_water_pct, bodyRank));
  set("body", "bmr_kcal", best(tagged, (r) => r.metrics.body?.bmr_kcal, bodyRank));

  // ── vo2max — latest window_end ──
  const vo2 = latestVo2max(tagged);
  if (vo2) {
    merged.vo2max = { last_value: vo2.value };
    fieldProv["vo2max.last_value"] = provEntry(vo2.result);
  }

  // ── user_profile ──
  set("user_profile", "age", best(tagged, (r) => r.metrics.user_profile?.age, userProfileRank));
  set("user_profile", "gender", best(tagged, (r) => r.metrics.user_profile?.gender, userProfileRank));
  set("user_profile", "height_cm", best(tagged, (r) => r.metrics.user_profile?.height_cm, userProfileRank));
  set("user_profile", "weight_kg", best(tagged, (r) => r.metrics.user_profile?.weight_kg, userProfileRank));

  // ── fitness ──
  set("fitness", "resting_hr", best(tagged, (r) => r.metrics.fitness?.resting_hr, confidence));
  set("fitness", "max_hr", best(tagged, (r) => r.metrics.fitness?.max_hr, confidence));

  // ── sources_used ──
  const sources_used: SourceContribution[] = tagged.map((r) => {
    const contributed = Object.entries(fieldProv)
      .filter(([, p]) => p.file_name === r._file_name && p.source === r.source)
      .map(([k]) => k);
    return {
      type: r.source,
      file_name: r._file_name ?? r.source,
      records_count: r.days_covered > 0 ? r.days_covered : undefined,
      date_range: r.window_start && r.window_end
        ? ([r.window_start, r.window_end] as [string, string])
        : undefined,
      fields_contributed: contributed,
    };
  });

  return {
    ...(merged as WearableMetrics),
    field_provenance: fieldProv,
    sources_used,
  };
}
