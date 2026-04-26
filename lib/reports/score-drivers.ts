// Score drivers — structured, prose-free top-3 drivers per dimension.
//
// This is the bridge between the deterministic interpretation bundles
// (lib/interpretations/*) and the AI-prompt layer. The bundles contain
// pre-formulated banding prose; piping that prose into prompts caused the
// "paraphrase template, output looks individual" problem we are fixing.
//
// Instead, this module turns each score into a STRUCTURED DRIVERS LIST:
//   { score: "sleep", value: 58, drivers: [{ field, value, contribution_hint }] }
//
// The downstream Stage-A prompt (Phase 3) reads this and decides which
// drivers to anchor in the executive summary, modules, top priority etc.
// The interpretation bundles remain available as an internal data source
// for tooltip text or post-hoc explanations — but never as prose for
// Claude to "paraphrase".

import type { FullScoringResult } from "@/lib/scoring/index";
import type { ReportContextRaw } from "./report-context";

export type DriverDimensionKey =
  | "sleep"
  | "recovery"
  | "activity"
  | "metabolic"
  | "stress"
  | "vo2max";

export interface ScoreDriver {
  /** Field name from raw inputs or scoring result, e.g. "sleep_duration_hours". */
  field: string;
  /** Concrete value the driver references (number or short string). */
  value: number | string;
  /** Short structured hint about how this driver moves the score. Not prose. */
  hint: "low" | "high" | "borderline" | "neutral";
  /** Free-text contribution note, kept short. Used by Stage-A as fact, never paraphrased blindly. */
  note?: string;
}

export interface ScoreDriverEntry {
  score: number;       // 0-100
  band: string;        // banding label from scoring result
  drivers: ScoreDriver[];
}

export interface ScoreDriversByDimension {
  sleep: ScoreDriverEntry;
  recovery: ScoreDriverEntry;
  activity: ScoreDriverEntry;
  metabolic: ScoreDriverEntry;
  stress: ScoreDriverEntry;
  vo2max: ScoreDriverEntry;
}

// ─── Public ──────────────────────────────────────────────────────────────

export function computeScoreDrivers(
  result: FullScoringResult,
  raw: ReportContextRaw,
): ScoreDriversByDimension {
  return {
    sleep: sleepDrivers(result, raw),
    recovery: recoveryDrivers(result, raw),
    activity: activityDrivers(result, raw),
    metabolic: metabolicDrivers(result, raw),
    stress: stressDrivers(result, raw),
    vo2max: vo2maxDrivers(result, raw),
  };
}

// ─── Per-dimension implementations ──────────────────────────────────────

function sleepDrivers(result: FullScoringResult, raw: ReportContextRaw): ScoreDriverEntry {
  const drivers: ScoreDriver[] = [];

  // Duration is the strongest driver of sleep score.
  drivers.push({
    field: "sleep_duration_hours",
    value: raw.sleep_duration_hours,
    hint:
      raw.sleep_duration_hours < 6.5 ? "low" :
      raw.sleep_duration_hours > 9 ? "high" :
      raw.sleep_duration_hours >= 7 && raw.sleep_duration_hours <= 8.5 ? "neutral" :
      "borderline",
  });

  drivers.push({
    field: "sleep_quality",
    value: raw.sleep_quality,
    hint:
      raw.sleep_quality === "schlecht" ? "low" :
      raw.sleep_quality === "sehr_gut" ? "high" :
      raw.sleep_quality === "mittel" ? "borderline" :
      "neutral",
  });

  drivers.push({
    field: "wakeups",
    value: raw.wakeups,
    hint:
      raw.wakeups === "immer" ? "low" :
      raw.wakeups === "oft" ? "low" :
      raw.wakeups === "selten" ? "neutral" :
      "high",
  });

  if (result.systemic_warnings.sleep_consistency_flag) {
    drivers.push({
      field: "sleep_consistency",
      value: "inconsistent_schedule",
      hint: "low",
      note: "User reports inconsistent bedtime/wake schedule",
    });
  }

  return {
    score: result.sleep.sleep_score_0_100,
    band: result.sleep.sleep_band,
    drivers: drivers.slice(0, 4),
  };
}

function recoveryDrivers(result: FullScoringResult, raw: ReportContextRaw): ScoreDriverEntry {
  const drivers: ScoreDriver[] = [];

  drivers.push({
    field: "morning_recovery_1_10",
    value: raw.morning_recovery_1_10,
    hint:
      raw.morning_recovery_1_10 <= 3 ? "low" :
      raw.morning_recovery_1_10 >= 8 ? "high" :
      "borderline",
  });

  drivers.push({
    field: "sleep_multiplier",
    value: result.recovery.sleep_multiplier,
    hint: result.recovery.sleep_multiplier < 0.85 ? "low" : "neutral",
    note: `Sleep gates recovery via multiplier ×${result.recovery.sleep_multiplier}`,
  });

  drivers.push({
    field: "stress_multiplier",
    value: result.recovery.stress_multiplier,
    hint: result.recovery.stress_multiplier < 0.85 ? "low" : "neutral",
    note: `Stress gates recovery via multiplier ×${result.recovery.stress_multiplier}`,
  });

  if (result.recovery.overtraining_risk) {
    drivers.push({
      field: "overtraining_risk",
      value: "active",
      hint: "low",
      note: "Training load disproportionate to recovery capacity",
    });
  }

  return {
    score: result.recovery.recovery_score_0_100,
    band: result.recovery.recovery_band,
    drivers: drivers.slice(0, 4),
  };
}

function activityDrivers(result: FullScoringResult, raw: ReportContextRaw): ScoreDriverEntry {
  const drivers: ScoreDriver[] = [];

  drivers.push({
    field: "total_met_minutes_week",
    value: result.activity.total_met_minutes_week,
    hint:
      result.activity.total_met_minutes_week < 600 ? "low" :
      result.activity.total_met_minutes_week >= 1500 ? "high" :
      "borderline",
  });

  if (raw.daily_steps != null) {
    drivers.push({
      field: "daily_steps",
      value: raw.daily_steps,
      hint:
        raw.daily_steps < 5000 ? "low" :
        raw.daily_steps >= 10000 ? "high" :
        "borderline",
    });
  }

  drivers.push({
    field: "training_days_self_reported",
    value: raw.training_days_self_reported ?? 0,
    hint:
      (raw.training_days_self_reported ?? 0) === 0 ? "low" :
      (raw.training_days_self_reported ?? 0) >= 4 ? "high" :
      "borderline",
  });

  drivers.push({
    field: "sitting_hours_per_day",
    value: raw.sitting_hours_per_day,
    hint:
      raw.sitting_hours_per_day >= 8 ? "low" :
      raw.sitting_hours_per_day < 5 ? "high" :
      "borderline",
    note: result.activity.sitting_risk_flag !== "normal"
      ? `Sitting risk: ${result.activity.sitting_risk_flag}`
      : undefined,
  });

  return {
    score: result.activity.activity_score_0_100,
    band: result.activity.activity_band,
    drivers: drivers.slice(0, 4),
  };
}

function metabolicDrivers(result: FullScoringResult, raw: ReportContextRaw): ScoreDriverEntry {
  const drivers: ScoreDriver[] = [];

  drivers.push({
    field: "bmi",
    value: result.metabolic.bmi,
    hint:
      result.metabolic.bmi_category === "normal" ? "neutral" :
      result.metabolic.bmi_category === "overweight" || result.metabolic.bmi_category === "underweight"
        ? "borderline"
        : "low",
    note: `BMI category: ${result.metabolic.bmi_category}`,
  });

  drivers.push({
    field: "fruit_veg",
    value: raw.fruit_veg,
    hint:
      raw.fruit_veg === "none" ? "low" :
      raw.fruit_veg === "low" ? "low" :
      raw.fruit_veg === "optimal" ? "high" :
      "borderline",
  });

  drivers.push({
    field: "water_litres",
    value: raw.water_litres,
    hint:
      raw.water_litres < 1.5 ? "low" :
      raw.water_litres >= 2.5 ? "high" :
      "neutral",
  });

  drivers.push({
    field: "meals_per_day",
    value: raw.meals_per_day,
    hint:
      raw.meals_per_day === 0 ? "low" :
      raw.meals_per_day > 5 ? "borderline" :
      "neutral",
  });

  return {
    score: result.metabolic.metabolic_score_0_100,
    band: result.metabolic.metabolic_band,
    drivers: drivers.slice(0, 4),
  };
}

function stressDrivers(result: FullScoringResult, raw: ReportContextRaw): ScoreDriverEntry {
  const drivers: ScoreDriver[] = [];

  drivers.push({
    field: "stress_level_1_10",
    value: raw.stress_level_1_10,
    hint:
      raw.stress_level_1_10 >= 8 ? "low" :
      raw.stress_level_1_10 <= 3 ? "high" :
      "borderline",
  });

  drivers.push({
    field: "sleep_buffer",
    value: result.stress.sleep_buffer,
    hint:
      result.stress.sleep_buffer < 0 ? "low" :
      result.stress.sleep_buffer >= 5 ? "high" :
      "neutral",
    note: `Sleep buffers stress by +${result.stress.sleep_buffer}`,
  });

  drivers.push({
    field: "recovery_buffer",
    value: result.stress.recovery_buffer,
    hint:
      result.stress.recovery_buffer < 0 ? "low" :
      result.stress.recovery_buffer >= 5 ? "high" :
      "neutral",
    note: `Recovery buffers stress by +${result.stress.recovery_buffer}`,
  });

  if (result.systemic_warnings.hpa_axis_risk) {
    drivers.push({
      field: "hpa_axis_risk",
      value: "active",
      hint: "low",
      note: "Chronic stress + low recovery suggest HPA dysregulation risk",
    });
  } else if (result.systemic_warnings.chronic_stress_risk) {
    drivers.push({
      field: "chronic_stress_risk",
      value: "active",
      hint: "low",
      note: "Stress patterns trending into chronic territory",
    });
  }

  return {
    score: result.stress.stress_score_0_100,
    band: result.stress.stress_band,
    drivers: drivers.slice(0, 4),
  };
}

function vo2maxDrivers(result: FullScoringResult, raw: ReportContextRaw): ScoreDriverEntry {
  const drivers: ScoreDriver[] = [];

  drivers.push({
    field: "vo2max_estimated",
    value: result.vo2max.vo2max_estimated,
    hint:
      result.vo2max.fitness_level_band === "Very Poor" || result.vo2max.fitness_level_band === "Poor"
        ? "low"
        : result.vo2max.fitness_level_band === "Excellent" || result.vo2max.fitness_level_band === "Superior"
          ? "high"
          : "borderline",
  });

  drivers.push({
    field: "activity_dependency",
    value: result.activity.activity_score_0_100,
    hint: "neutral",
    note: "VO2max can only be improved via activity — directly tied to activity score",
  });

  drivers.push({
    field: "vigorous_met",
    value: result.activity.vigorous_met,
    hint:
      result.activity.vigorous_met === 0 ? "low" :
      result.activity.vigorous_met >= 600 ? "high" :
      "borderline",
    note: "Vigorous-intensity minutes are the primary VO2max stimulus",
  });

  return {
    score: result.vo2max.fitness_score_0_100,
    band: result.vo2max.fitness_level_band,
    drivers: drivers.slice(0, 4),
  };
}
