// Stress scoring.
// Inverts self-reported stress (1..10) and adds a recovery bonus derived
// from the sleep module's recovery component.

export type StressBand = "high_stress" | "elevated" | "moderate" | "low_stress";

export interface StressInputs {
  stress_level_1_10: number;
  sleep_recovery_score_0_100: number; // from sleep module
}

export interface StressResult {
  stress_score_0_100: number;
  stress_band: StressBand;
}

function bandFor(score: number): StressBand {
  if (score < 30) return "high_stress";
  if (score < 55) return "elevated";
  if (score < 75) return "moderate";
  return "low_stress";
}

export function calculateStressScore(inputs: StressInputs): StressResult {
  const stress = Math.max(0, Math.min(10, inputs.stress_level_1_10 ?? 5));
  const recovery = Math.max(0, Math.min(100, inputs.sleep_recovery_score_0_100 ?? 0));

  const scoreBase = (10 - stress) * 10;
  const bonus = (recovery / 100) * 15;

  const stress_score_0_100 = Math.round(Math.min(100, scoreBase + bonus));

  return {
    stress_score_0_100,
    stress_band: bandFor(stress_score_0_100),
  };
}
