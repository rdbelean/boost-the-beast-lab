// Stress scoring — self-reported stress load, modulated by sleep and
// subjective morning recovery. HPA-axis dysregulation surfaces as risk flags
// when chronic sleep debt meets elevated stress.
//
// Formula (briefing):
//   stressBase       = (10 - stress_level) × 10
//   sleepBuffer      = sleepScore ≥ 65 ? min(15, (sleepScore - 65) × 0.3) : 0
//   recoveryBuffer   = recoveryScore ≥ 55 ? min(10, (recoveryScore - 55) × 0.2) : 0
//   finalStress      = min(100, stressBase + sleepBuffer + recoveryBuffer)
//
// Risk flags:
//   chronic_stress_risk = stress_level ≥ 8 AND sleepScore < 50
//   hpa_axis_risk       = stress_level ≥ 7 AND sleepScore < 55
//
// The "recoveryScore" in this formula is the subjective morning recovery
// signal from the sleep module (recovery_1_10 × 10) — NOT the training
// Recovery Module score, which is computed downstream after stress.
//
// Bands: critical <30 · high 30–49 · elevated 50–69 · moderate 70–84 · low_stress ≥85
//
// References:
// - StatPearls NCBI (2024) — SAM/HPA/immune interplay
// - PMC Chronic Stress & Cognition (2024) — GR downregulation
// - Frontiers Allostatic Load (2025) — multi-system dysregulation
// - Tandfonline Testosterone & Cortisol (2023) — HPG-axis suppression
// - Psychoneuroendocrinology Meta-Analysis (2024) — mindfulness g=0.345, relaxation g=0.347

export type StressBand =
  | "critical"
  | "high"
  | "elevated"
  | "moderate"
  | "low_stress";

export interface StressInputs {
  stress_level_1_10: number;
  /** Final sleep score (0..100) from sleep module. */
  sleep_score_0_100: number;
  /** Subjective morning recovery (0..100) from sleep module. */
  subjective_recovery_0_100: number;
}

export interface StressResult {
  stress_score_0_100: number;
  stress_band: StressBand;
  chronic_stress_risk: boolean;
  hpa_axis_risk: boolean;
  sleep_buffer: number;
  recovery_buffer: number;
}

function bandFor(score: number): StressBand {
  if (score < 30) return "critical";
  if (score < 50) return "high";
  if (score < 70) return "elevated";
  if (score < 85) return "moderate";
  return "low_stress";
}

export function calculateStressScore(inputs: StressInputs): StressResult {
  const stress = Math.max(0, Math.min(10, inputs.stress_level_1_10 ?? 5));
  const sleepScore = Math.max(0, Math.min(100, inputs.sleep_score_0_100 ?? 0));
  const recoveryScore = Math.max(
    0,
    Math.min(100, inputs.subjective_recovery_0_100 ?? 0),
  );

  const stressBase = (10 - stress) * 10;
  const sleepBuffer =
    sleepScore >= 65 ? Math.min(15, (sleepScore - 65) * 0.3) : 0;
  const recoveryBuffer =
    recoveryScore >= 55 ? Math.min(10, (recoveryScore - 55) * 0.2) : 0;

  const stress_score_0_100 = Math.round(
    Math.min(100, stressBase + sleepBuffer + recoveryBuffer),
  );

  const chronic_stress_risk = stress >= 8 && sleepScore < 50;
  const hpa_axis_risk = stress >= 7 && sleepScore < 55;

  return {
    stress_score_0_100,
    stress_band: bandFor(stress_score_0_100),
    chronic_stress_risk,
    hpa_axis_risk,
    sleep_buffer: Math.round(sleepBuffer * 10) / 10,
    recovery_buffer: Math.round(recoveryBuffer * 10) / 10,
  };
}
