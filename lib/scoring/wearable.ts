// Wearable overrides — optional inputs that replace/augment the self-reported
// form data when a user has imported WHOOP or Apple Health data.
//
// Design principle: keep existing scoring interfaces semantically unchanged
// (e.g. SleepInputs.duration_hours still means "self-reported hours"). When
// a wearable value is provided, scoring functions prefer it, but also return
// a `*_source` provenance tag so the Claude report prompt can qualify the
// language ("gemessen über 28 Tage" vs "nach deiner Selbsteinschätzung").

export type MetricProvenance = "self_report" | "whoop" | "apple_health";

export interface WearableOverrides {
  source: "whoop" | "apple_health";
  days_covered: number; // 1..30

  sleep?: {
    duration_hours?: number; // mean over window
    efficiency_pct?: number; // 0..100, replaces self-reported quality when present
    wakeups_per_night?: number; // mean, replaces self-reported wakeups bucket
  };

  recovery?: {
    whoop_recovery_0_100?: number; // WHOOP only — direct replacement for base_recovery
    hrv_ms?: number; // both sources
    rhr_bpm?: number; // both sources
  };

  activity?: {
    daily_steps?: number; // Apple/Garmin; WHOOP has none
    whoop_strain_0_21?: number; // WHOOP only — refines intensity_ratio
    active_kcal?: number; // Apple only — informational
  };

  vo2max?: {
    measured_ml_kg_min?: number; // Apple HKQuantityTypeIdentifierVO2Max
  };

  body?: {
    weight_kg?: number; // Apple HKQuantityTypeIdentifierBodyMass (most recent)
  };
}

export interface ScoreProvenanceMap {
  sleep_duration: MetricProvenance;
  sleep_efficiency: MetricProvenance | "not_applicable";
  recovery: MetricProvenance;
  activity: MetricProvenance;
  vo2max: MetricProvenance;
}

// ─── Override helpers used by scoring modules ────────────────────────────

/**
 * Converts a measured sleep efficiency percentage into the 0..100 quality
 * score that normally comes from the self-reported quality label.
 *   ≥92 → 100 (sehr gut)
 *   ≥85 → 80 (gut)
 *   ≥75 → 55 (mittel)
 *   <75 → 30 (schlecht)
 */
export function efficiencyToQualityScore(efficiencyPct: number): number {
  if (!Number.isFinite(efficiencyPct)) return 45;
  if (efficiencyPct >= 92) return 100;
  if (efficiencyPct >= 85) return 80;
  if (efficiencyPct >= 75) return 55;
  return 30;
}

/**
 * Converts a mean wakeups-per-night count into the wakeup score band.
 *   0    → 100 (nie)
 *   ≤1   →  72 (selten)
 *   ≤3   →  38 (oft)
 *   >3   →  10 (immer)
 */
export function wakeupsToScore(meanWakeups: number): number {
  if (!Number.isFinite(meanWakeups) || meanWakeups < 0) return 50;
  if (meanWakeups === 0) return 100;
  if (meanWakeups <= 1) return 72;
  if (meanWakeups <= 3) return 38;
  return 10;
}

/**
 * Age-normalised HRV/RHR → 0..100 "base recovery" estimate for Apple Health
 * (which doesn't provide a pre-computed recovery score like WHOOP does).
 *
 * Normative bands loosely follow Kubios/Polar age-group references. HRV is
 * the dominant signal; RHR acts as a secondary modifier.
 */
export function hrvRhrToBaseRecovery(
  hrvMs: number | undefined,
  rhrBpm: number | undefined,
  age: number,
): number {
  // HRV contribution (0..80 points). Age-adjusted expected HRV (SDNN):
  //   <30y → 60ms · 30-39 → 50 · 40-49 → 42 · 50-59 → 35 · 60+ → 30
  const expectedHrv =
    age < 30 ? 60 : age < 40 ? 50 : age < 50 ? 42 : age < 60 ? 35 : 30;

  let hrvScore = 40; // neutral default if HRV absent
  if (Number.isFinite(hrvMs) && (hrvMs as number) > 0) {
    const ratio = (hrvMs as number) / expectedHrv;
    if (ratio >= 1.3) hrvScore = 80;
    else if (ratio >= 1.0) hrvScore = 65;
    else if (ratio >= 0.75) hrvScore = 45;
    else hrvScore = 25;
  }

  // RHR modifier (-10..+20). Lower is better.
  let rhrMod = 0;
  if (Number.isFinite(rhrBpm) && (rhrBpm as number) > 0) {
    const bpm = rhrBpm as number;
    if (bpm < 55) rhrMod = 20;
    else if (bpm < 65) rhrMod = 10;
    else if (bpm < 75) rhrMod = 0;
    else if (bpm < 85) rhrMod = -5;
    else rhrMod = -10;
  }

  return Math.max(0, Math.min(100, hrvScore + rhrMod));
}
