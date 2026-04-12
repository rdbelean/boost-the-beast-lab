// Recovery scoring — training recovery status modulated by sleep and stress.
// Distinct from the subjective morning recovery in the sleep module.
//
// Base recovery is computed from weekly training load, training intensity mix
// and self-reported recovery feeling. Sleep and stress then act as
// multiplicative governors: chronic sleep debt or high stress can cap recovery
// regardless of subjective reports (Kaczmarek 2025, Kellmann ARSS/SRSS 2024).
//
// Formula (briefing):
//   baseRecovery       = f(training_days, intensity_ratio, subjective_recovery)
//   sleepMultiplier    = sleep<40→0.65 · 40–64→0.82 · 65–84→0.95 · ≥85→1.0
//   stressMultiplier   = stress<30→0.70 · 30–54→0.87 · 55–74→0.96 · ≥75→1.0
//   finalRecovery      = baseRecovery × sleepMultiplier × stressMultiplier
//   overtrainingRisk   = trainingDays ≥ 6 AND baseRecovery < 50
//
// Bands: critical <35 · low 35–54 · moderate 55–74 · good 75–89 · excellent ≥90
//
// References:
// - Kaczmarek et al. (2025) — cortisol↑ testosterone↓ GH↓ under sleep debt
// - PMC OTS Review (2025) — functional vs non-functional overreaching
// - HRV Narrative Review MDPI (2024) — HRV as recovery marker
// - PRS Scale IJSPP (2022) — subjective recovery validity (PRS 0–10)
// - Kellmann ARSS/SRSS (2024) — recovery/stress imbalance
// - ScienceDirect OTS Molecular (2025) — strength loss up to 14% under OTS
// - Scientific Reports HRV-Training (2025) — psychological + physiological integration
// - PMC Recovery Strategies Umbrella Review (2022) — 22 reviews, 1100 athletes

export type RecoveryBand =
  | "critical"
  | "low"
  | "moderate"
  | "good"
  | "excellent";

export interface RecoveryInputs {
  /** Training days per week (0..7). */
  training_days: number;
  /** Fraction of weekly MET-minutes from vigorous activity (0..1). */
  intensity_ratio: number;
  /** Self-reported recovery feeling on 1..10 scale (PRS). */
  subjective_recovery_1_10: number;
  sleep_score_0_100: number;
  stress_score_0_100: number;
}

export interface RecoveryResult {
  base_recovery_0_100: number;
  sleep_multiplier: number;
  stress_multiplier: number;
  recovery_score_0_100: number;
  recovery_band: RecoveryBand;
  overtraining_risk: boolean;
  sleep_impact: "none" | "mild" | "moderate" | "severe";
  stress_impact: "none" | "mild" | "moderate" | "severe";
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Base recovery model — combines training load, intensity mix and subjective
 * PRS. A moderate load with high subjective recovery sits around 80. Heavy
 * high-intensity loads drag base recovery down sharply even before sleep or
 * stress governors are applied.
 */
function computeBaseRecovery(
  trainingDays: number,
  intensityRatio: number,
  subjective1_10: number,
): number {
  const days = clamp(trainingDays, 0, 7);
  const intensity = clamp(intensityRatio, 0, 1);
  const subjective = clamp(subjective1_10, 0, 10);

  // Training-load penalty: 0–3 days → 0 · 4 → 6 · 5 → 12 · 6 → 20 · 7 → 28
  const dayLoad =
    days <= 3
      ? 0
      : days === 4
        ? 6
        : days === 5
          ? 12
          : days === 6
            ? 20
            : 28;

  // Intensity penalty: scales with fraction of vigorous MET (up to 15 pts).
  const intensityPenalty = intensity * 15;

  // Subjective anchor: (1–10) × 10 — the PRS scale, validated in IJSPP (2022).
  const subjectiveAnchor = subjective * 10;

  const base = subjectiveAnchor - dayLoad - intensityPenalty;
  return Math.max(0, Math.min(100, base));
}

function sleepMultiplier(sleep: number): number {
  if (sleep < 40) return 0.65;
  if (sleep < 65) return 0.82;
  if (sleep < 85) return 0.95;
  return 1.0;
}

function stressMultiplier(stress: number): number {
  if (stress < 30) return 0.7;
  if (stress < 55) return 0.87;
  if (stress < 75) return 0.96;
  return 1.0;
}

function bandFor(score: number): RecoveryBand {
  if (score < 35) return "critical";
  if (score < 55) return "low";
  if (score < 75) return "moderate";
  if (score < 90) return "good";
  return "excellent";
}

function impactLabel(multiplier: number): "none" | "mild" | "moderate" | "severe" {
  if (multiplier >= 1.0) return "none";
  if (multiplier >= 0.95) return "mild";
  if (multiplier >= 0.82) return "moderate";
  return "severe";
}

export function calculateRecoveryScore(
  inputs: RecoveryInputs,
): RecoveryResult {
  const base = computeBaseRecovery(
    inputs.training_days,
    inputs.intensity_ratio,
    inputs.subjective_recovery_1_10,
  );
  const sleepMult = sleepMultiplier(
    clamp(inputs.sleep_score_0_100, 0, 100),
  );
  const stressMult = stressMultiplier(
    clamp(inputs.stress_score_0_100, 0, 100),
  );

  const final = Math.round(base * sleepMult * stressMult);

  const trainingDays = clamp(inputs.training_days, 0, 7);
  const overtraining_risk = trainingDays >= 6 && base < 50;

  return {
    base_recovery_0_100: Math.round(base),
    sleep_multiplier: sleepMult,
    stress_multiplier: stressMult,
    recovery_score_0_100: final,
    recovery_band: bandFor(final),
    overtraining_risk,
    sleep_impact: impactLabel(sleepMult),
    stress_impact: impactLabel(stressMult),
  };
}
