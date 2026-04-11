// Public scoring entry point. Pure functions — no DB access.
import {
  calculateActivityScore,
  type ActivityInputs,
  type ActivityResult,
  type ActivityCategory,
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

export {
  calculateActivityScore,
  estimateVO2max,
  calculateSleepScore,
  calculateMetabolicScore,
  calculateStressScore,
};
export type {
  ActivityInputs,
  ActivityResult,
  ActivityCategory,
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
  metabolic: MetabolicResult;
  stress: StressResult;
  vo2max: VO2MaxResult;
  overall_score_0_100: number;
  overall_band: OverallBand;
}

function overallBandFor(score: number): OverallBand {
  if (score < 35) return "critical";
  if (score < 50) return "low";
  if (score < 65) return "moderate";
  if (score < 80) return "good";
  if (score < 90) return "excellent";
  return "elite";
}

// Composite weighting: Activity 28 · Sleep 25 · VO2max 15 · Metabolic 20 · Stress 12.
export function runFullScoring(
  inputs: FullAssessmentInputs,
): FullScoringResult {
  const activity = calculateActivityScore(inputs.activity);

  const sleep = calculateSleepScore({ ...inputs.sleep, age: inputs.age });

  const metabolic = calculateMetabolicScore({
    height_cm: inputs.height_cm,
    weight_kg: inputs.weight_kg,
    ...inputs.metabolic,
  });

  const stress = calculateStressScore({
    stress_level_1_10: inputs.stress.stress_level_1_10,
    sleep_recovery_score_0_100: sleep.recovery_score,
  });

  const vo2max = estimateVO2max({
    age: inputs.age,
    gender: inputs.gender,
    height_cm: inputs.height_cm,
    weight_kg: inputs.weight_kg,
    activity_category: activity.activity_category,
  });

  const overall_score_0_100 = Math.round(
    activity.activity_score_0_100 * 0.28 +
      sleep.sleep_score_0_100 * 0.25 +
      vo2max.fitness_score_0_100 * 0.15 +
      metabolic.metabolic_score_0_100 * 0.2 +
      stress.stress_score_0_100 * 0.12,
  );

  return {
    activity,
    sleep,
    metabolic,
    stress,
    vo2max,
    overall_score_0_100,
    overall_band: overallBandFor(overall_score_0_100),
  };
}
