// Sleep scoring — calibrated against NSF/AASM consensus (Watson et al., 2015)
// and recent evidence on sleep, recovery and metabolic health.
//
// Duration cutoffs (briefing):
//   18–64:  <6h=20 · 6–6.9h=55 · 7–9h=100 · >9h=70
//   65+:    <6h=20 · 6–6.9h=65 · 7–8h=100 · >8h=75
// Quality:   sehr_gut=100 · gut=75 · mittel=45 · schlecht=15
// Wakeups:   nie=100 · selten=72 · oft=38 · immer=10
// Recovery:  (1..10) × 10
// Weights:   Qualität 35% · Dauer 30% · Aufwachen 20% · Erholung 15%
// Bands:     poor <40 · moderate 40–64 · good 65–84 · excellent ≥85
//
// References:
// - NSF/AASM Consensus (Watson et al., 2015)
// - Kaczmarek et al. (MDPI 2025) — sleep, cortisol, testosterone
// - Sondrup et al. Sleep Medicine Reviews (2022) — insulin resistance
// - PMC Sleep & Athletic Performance (2024) — GH release in N3
// - Kalkanis et al. Sleep Medicine Reviews (2025) — irregular sleep impact

import {
  efficiencyToQualityScore,
  wakeupsToScore,
  type MetricProvenance,
  type WearableOverrides,
} from "./wearable";

export type SleepBand = "poor" | "moderate" | "good" | "excellent";
export type SleepDurationBand = "kurz" | "optimal" | "lang";
export type SleepQualityLabel = "sehr_gut" | "gut" | "mittel" | "schlecht";
export type WakeupFrequency = "nie" | "selten" | "oft" | "immer";

export interface SleepInputs {
  age: number;
  duration_hours: number;
  quality: SleepQualityLabel;
  wakeups: WakeupFrequency;
  recovery_1_10: number;
  /** Optional: self-reported weekly schedule regularity (1..10). */
  consistency_1_10?: number;
}

export interface SleepResult {
  sleep_duration_score: number;
  sleep_quality_score: number;
  wakeup_score: number;
  /** Subjective morning recovery feeling — NOT the Recovery Module score. */
  recovery_score: number;
  sleep_score_0_100: number;
  sleep_band: SleepBand;
  sleep_duration_band: SleepDurationBand;
  /** True when the user reports inconsistent schedule (<6 on 1–10 scale). */
  sleep_consistency_flag: boolean;
}

function durationScore(
  hours: number,
  age: number,
): { score: number; band: SleepDurationBand } {
  if (!Number.isFinite(hours)) return { score: 0, band: "kurz" };

  if (age >= 65) {
    if (hours < 6) return { score: 20, band: "kurz" };
    if (hours < 7) return { score: 65, band: "kurz" };
    if (hours <= 8) return { score: 100, band: "optimal" };
    return { score: 75, band: "lang" };
  }

  if (hours < 6) return { score: 20, band: "kurz" };
  if (hours < 7) return { score: 55, band: "kurz" };
  if (hours <= 9) return { score: 100, band: "optimal" };
  return { score: 70, band: "lang" };
}

function qualityScore(q: SleepQualityLabel): number {
  switch (q) {
    case "sehr_gut":
      return 100;
    case "gut":
      return 75;
    case "mittel":
      return 45;
    case "schlecht":
      return 15;
    default:
      return 45;
  }
}

function wakeupScore(w: WakeupFrequency): number {
  switch (w) {
    case "nie":
      return 100;
    case "selten":
      return 72;
    case "oft":
      return 38;
    case "immer":
      return 10;
    default:
      return 50;
  }
}

function recoveryScore(r: number): number {
  if (!Number.isFinite(r)) return 0;
  return Math.max(0, Math.min(100, r * 10));
}

function bandFor(score: number): SleepBand {
  if (score < 40) return "poor";
  if (score < 65) return "moderate";
  if (score < 85) return "good";
  return "excellent";
}

export interface SleepScoreWithProvenance extends SleepResult {
  sleep_duration_source: MetricProvenance;
  sleep_efficiency_source: MetricProvenance | "not_applicable";
}

export function calculateSleepScore(
  inputs: SleepInputs,
  wearable?: WearableOverrides["sleep"],
  provenance?: "whoop" | "apple_health",
): SleepScoreWithProvenance {
  const durHours =
    wearable?.duration_hours != null ? wearable.duration_hours : inputs.duration_hours;
  const { score: durScore, band: duration_band } = durationScore(
    durHours,
    inputs.age,
  );

  // Prefer measured efficiency over self-reported quality label when available.
  const qual =
    wearable?.efficiency_pct != null
      ? efficiencyToQualityScore(wearable.efficiency_pct)
      : qualityScore(inputs.quality);

  const wake =
    wearable?.wakeups_per_night != null
      ? wakeupsToScore(wearable.wakeups_per_night)
      : wakeupScore(inputs.wakeups);

  const rec = recoveryScore(inputs.recovery_1_10);

  // Briefing weights: Quality 35% · Duration 30% · Wakeups 20% · Recovery 15%
  const sleep_score_0_100 = Math.round(
    qual * 0.35 + durScore * 0.3 + wake * 0.2 + rec * 0.15,
  );

  const consistencyFlag =
    typeof inputs.consistency_1_10 === "number" && inputs.consistency_1_10 < 6;

  const sleep_duration_source: MetricProvenance =
    wearable?.duration_hours != null ? (provenance ?? "whoop") : "self_report";
  const sleep_efficiency_source: MetricProvenance | "not_applicable" =
    wearable?.efficiency_pct != null ? (provenance ?? "whoop") : "not_applicable";

  return {
    sleep_duration_score: durScore,
    sleep_quality_score: qual,
    wakeup_score: wake,
    recovery_score: rec,
    sleep_score_0_100,
    sleep_band: bandFor(sleep_score_0_100),
    sleep_duration_band: duration_band,
    sleep_consistency_flag: consistencyFlag,
    sleep_duration_source,
    sleep_efficiency_source,
  };
}
