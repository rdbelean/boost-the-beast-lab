// Sleep scoring — PSQI-inspired, adapted for a short self-report module.
// References: Buysse et al. (1989) PSQI; NSF (2015) sleep duration recommendations;
// AASM/SRS consensus (Watson et al., 2015).

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
}

export interface SleepResult {
  sleep_duration_score: number;
  sleep_quality_score: number;
  wakeup_score: number;
  recovery_score: number;
  sleep_score_0_100: number;
  sleep_band: SleepBand;
  sleep_duration_band: SleepDurationBand;
}

function durationScore(hours: number, age: number): {
  score: number;
  band: SleepDurationBand;
} {
  if (!Number.isFinite(hours)) return { score: 0, band: "kurz" };

  if (age >= 65) {
    // 65+: target 7–8 h
    if (hours < 6) return { score: 20, band: "kurz" };
    if (hours < 7) return { score: 65, band: "kurz" };
    if (hours <= 8) return { score: 100, band: "optimal" };
    return { score: 75, band: "lang" };
  }

  // 18–64: target 7–9 h
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

export function calculateSleepScore(inputs: SleepInputs): SleepResult {
  const { score: durScore, band: duration_band } = durationScore(
    inputs.duration_hours,
    inputs.age,
  );
  const qual = qualityScore(inputs.quality);
  const wake = wakeupScore(inputs.wakeups);
  const rec = recoveryScore(inputs.recovery_1_10);

  // Weights: Duration 30%, Quality 35%, Wake-ups 20%, Recovery 15%.
  const sleep_score_0_100 = Math.round(
    durScore * 0.3 + qual * 0.35 + wake * 0.2 + rec * 0.15,
  );

  return {
    sleep_duration_score: durScore,
    sleep_quality_score: qual,
    wakeup_score: wake,
    recovery_score: rec,
    sleep_score_0_100,
    sleep_band: bandFor(sleep_score_0_100),
    sleep_duration_band: duration_band,
  };
}
