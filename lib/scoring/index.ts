// Public scoring entry point. Pure functions — no DB access.
//
// Dependency order (briefing):
//   1. Sleep          (independent)
//   2. Activity       (independent)
//   3. Stress         (needs Sleep)
//   4. Recovery       (needs Sleep + Stress + Activity-derived training load)
//   5. Metabolic      (independent)
//   6. VO2max         (needs Activity + BMI)
//   7. Overall Index  (composite)
//   8. Interpretation bundle + top priority + systemic warnings

import {
  calculateActivityScore,
  type ActivityInputs,
  type ActivityResult,
  type ActivityCategory,
  type ActivityBand,
  type SittingRiskFlag,
} from "./activity";
import {
  estimateVO2max,
  type VO2MaxInputs,
  type VO2MaxResult,
  type Gender,
  type FitnessBand,
} from "./vo2max";
import {
  calculateSleepScore,
  type SleepInputs,
  type SleepResult,
  type SleepBand,
  type SleepDurationBand,
  type SleepQualityLabel,
  type WakeupFrequency,
} from "./sleep";
import {
  calculateMetabolicScore,
  type MetabolicInputs,
  type MetabolicResult,
  type BMICategory,
  type MetabolicBand,
  type FruitVegLevel,
} from "./metabolic";
import {
  calculateStressScore,
  type StressInputs,
  type StressResult,
  type StressBand,
} from "./stress";
import {
  calculateRecoveryScore,
  type RecoveryInputs,
  type RecoveryResult,
  type RecoveryBand,
} from "./recovery";
import {
  getInterpretationBundle,
  type InterpretationBundle,
  type SystemicWarnings,
} from "../interpretations";

export {
  calculateActivityScore,
  estimateVO2max,
  calculateSleepScore,
  calculateMetabolicScore,
  calculateStressScore,
  calculateRecoveryScore,
};
export type {
  ActivityInputs,
  ActivityResult,
  ActivityCategory,
  ActivityBand,
  SittingRiskFlag,
  VO2MaxInputs,
  VO2MaxResult,
  Gender,
  FitnessBand,
  SleepInputs,
  SleepResult,
  SleepBand,
  SleepDurationBand,
  SleepQualityLabel,
  WakeupFrequency,
  MetabolicInputs,
  MetabolicResult,
  BMICategory,
  MetabolicBand,
  FruitVegLevel,
  StressInputs,
  StressResult,
  StressBand,
  RecoveryInputs,
  RecoveryResult,
  RecoveryBand,
};

export type OverallBand =
  | "critical"
  | "low"
  | "moderate"
  | "good"
  | "excellent"
  | "elite";

export interface FullAssessmentInputs {
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  activity: ActivityInputs;
  sleep: Omit<SleepInputs, "age">;
  metabolic: Omit<MetabolicInputs, "height_cm" | "weight_kg">;
  stress: { stress_level_1_10: number };
}

export interface FullScoringResult {
  activity: ActivityResult;
  sleep: SleepResult;
  stress: StressResult;
  recovery: RecoveryResult;
  metabolic: MetabolicResult;
  vo2max: VO2MaxResult;
  overall_score_0_100: number;
  overall_band: OverallBand;
  top_priority_module:
    | "sleep"
    | "recovery"
    | "activity"
    | "metabolic"
    | "stress"
    | "vo2max";
  systemic_warnings: SystemicWarnings;
  interpretation: InterpretationBundle;
}

function overallBandFor(score: number): OverallBand {
  if (score < 35) return "critical";
  if (score < 50) return "low";
  if (score < 65) return "moderate";
  if (score < 80) return "good";
  if (score < 90) return "excellent";
  return "elite";
}

/**
 * Composite weighting (briefing):
 *   Activity 28 · Sleep 25 · Metabolic 20 · VO2max 15 · Stress 12
 */
export function runFullScoring(
  inputs: FullAssessmentInputs,
): FullScoringResult {
  // 1. Sleep
  const sleep = calculateSleepScore({ ...inputs.sleep, age: inputs.age });

  // 2. Activity (sitting hours surfaced as separate risk flag)
  const activity = calculateActivityScore({
    ...inputs.activity,
    sitting_hours_per_day: inputs.metabolic.sitting_hours,
  });

  // 3. Stress (depends on sleep)
  const stress = calculateStressScore({
    stress_level_1_10: inputs.stress.stress_level_1_10,
    sleep_score_0_100: sleep.sleep_score_0_100,
    subjective_recovery_0_100: sleep.recovery_score,
  });

  // 4. Recovery (depends on sleep + stress + training load derived from activity)
  //    Training days ≈ max-span of activity days (conservative upper bound).
  //    Intensity ratio = vigorous MET / total MET.
  const trainingDays = Math.min(
    7,
    Math.max(
      inputs.activity.vigorous_days,
      inputs.activity.moderate_days,
      inputs.activity.walking_days,
    ),
  );
  const intensityRatio =
    activity.total_met_minutes_week > 0
      ? activity.vigorous_met / activity.total_met_minutes_week
      : 0;

  const recovery = calculateRecoveryScore({
    training_days: trainingDays,
    intensity_ratio: intensityRatio,
    subjective_recovery_1_10: inputs.sleep.recovery_1_10,
    sleep_score_0_100: sleep.sleep_score_0_100,
    stress_score_0_100: stress.stress_score_0_100,
  });

  // 5. Metabolic
  const metabolic = calculateMetabolicScore({
    height_cm: inputs.height_cm,
    weight_kg: inputs.weight_kg,
    ...inputs.metabolic,
  });

  // 6. VO2max
  const vo2max = estimateVO2max({
    age: inputs.age,
    gender: inputs.gender,
    height_cm: inputs.height_cm,
    weight_kg: inputs.weight_kg,
    activity_category: activity.activity_category,
  });

  // 7. Overall Performance Index
  const overall_score_0_100 = Math.round(
    activity.activity_score_0_100 * 0.28 +
      sleep.sleep_score_0_100 * 0.25 +
      metabolic.metabolic_score_0_100 * 0.2 +
      vo2max.fitness_score_0_100 * 0.15 +
      stress.stress_score_0_100 * 0.12,
  );
  const overall_band = overallBandFor(overall_score_0_100);

  // 8. Top priority — lowest score with smallest buffer to next band up.
  //    Recovery counts in priority ranking even though it is not part of
  //    the overall composite (it's a governor, not a driver).
  const ranking: Array<[FullScoringResult["top_priority_module"], number]> = [
    ["sleep", sleep.sleep_score_0_100],
    ["activity", activity.activity_score_0_100],
    ["metabolic", metabolic.metabolic_score_0_100],
    ["vo2max", vo2max.fitness_score_0_100],
    ["stress", stress.stress_score_0_100],
    ["recovery", recovery.recovery_score_0_100],
  ];
  ranking.sort((a, b) => a[1] - b[1]);
  const top_priority_module = ranking[0][0];

  // 9. Systemic warnings + interpretation bundle
  const systemic_warnings: SystemicWarnings = {
    overtraining_risk: recovery.overtraining_risk,
    chronic_stress_risk: stress.chronic_stress_risk,
    hpa_axis_risk: stress.hpa_axis_risk,
    sleep_consistency_flag: sleep.sleep_consistency_flag,
    sitting_critical: activity.sitting_risk_flag === "critical",
    sitting_elevated: activity.sitting_risk_flag === "elevated",
    bmi_disclaimer_needed: metabolic.bmi_disclaimer_needed,
  };

  const interpretation = getInterpretationBundle(
    {
      sleep_band: sleep.sleep_band,
      recovery_band: recovery.recovery_band,
      activity_band: activity.activity_band,
      metabolic_band: metabolic.metabolic_band,
      stress_band: stress.stress_band,
      vo2max_band: vo2max.fitness_level_band,
      age: inputs.age,
      gender: inputs.gender,
      bmi_category: metabolic.bmi_category,
      sitting_risk: activity.sitting_risk_flag,
    },
    systemic_warnings,
  );

  return {
    activity,
    sleep,
    stress,
    recovery,
    metabolic,
    vo2max,
    overall_score_0_100,
    overall_band,
    top_priority_module,
    systemic_warnings,
    interpretation,
  };
}
