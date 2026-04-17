// Activity scoring — IPAQ Short Form (2005 scoring protocol) with 2020/2024
// WHO Physical Activity guideline alignment (no minimum bout length in WHO,
// but IPAQ retains the 10-minute bout cleaning rule — we follow IPAQ for
// scoring and surface WHO context in interpretations).
//
// MET values:   Walking 3.3 · Moderate 4.0 · Vigorous 8.0
// Bout rules:   <10 min → 0 · bout >180 → cap 180 · weekly per-type cap 960×7
// Categories:
//   HIGH      = (Vigorous ≥3d AND total ≥1500) OR (7d any combo AND total ≥3000)
//   MODERATE  = (Vigorous ≥3d × ≥20min) OR (Mod/Walk ≥5d × ≥30min) OR total ≥600
//   LOW       = otherwise
// Score curve: 0→0 · 600→40 · 3000→75 · 8000+→100
// Bands:      low <40 · moderate 40–74 · high ≥75
//
// Sitting hours surfaced as an independent risk flag (AHA Science Advisory —
// sitting is an independent CVD risk factor).
//
// References:
// - WHO Physical Activity Guidelines (2020, updated 2024)
// - IPAQ-SF Scoring Protocol (Nov 2005)
// - AHA Circulation (2022) — 150–300 min/wk ≈ 20–21% mortality reduction
// - AMA Longevity (2024) — 150–299 min vigorous ≈ 21–23% mortality reduction
// - Frontiers Sedentary & CVD Meta-Analysis (2022)
// - AHA Science Advisory — sedentary independent of MVPA

import type { MetricProvenance, WearableOverrides } from "./wearable";

export type ActivityCategory = "LOW" | "MODERATE" | "HIGH";
export type ActivityBand = "low" | "moderate" | "high";
export type SittingRiskFlag = "normal" | "elevated" | "critical";

export interface ActivityInputs {
  walking_days: number; // 0..7
  walking_minutes_per_day: number;
  moderate_days: number;
  moderate_minutes_per_day: number;
  vigorous_days: number;
  vigorous_minutes_per_day: number;
  /** Optional — if provided, sitting_risk_flag is derived and returned. */
  sitting_hours_per_day?: number;
  /**
   * Optional override for walking MET minutes / week. Used when the UI
   * collects total time-on-feet (standing + walking) rather than discrete
   * walking bouts — the IPAQ 180-min bout cap would otherwise distort the
   * total. When present, walking_days + walking_minutes_per_day are ignored
   * for the walking MET calc.
   */
  walking_total_minutes_week?: number;
}

export interface ActivityResult {
  walking_met: number;
  moderate_met: number;
  vigorous_met: number;
  total_met_minutes_week: number;
  activity_category: ActivityCategory;
  activity_score_0_100: number;
  activity_band: ActivityBand;
  sitting_risk_flag: SittingRiskFlag;
}

const MET_WALK = 3.3;
const MET_MOD = 4.0;
const MET_VIG = 8.0;

function normalizeBout(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 10) return 0;
  if (minutes > 180) return 180;
  return minutes;
}

function clampDays(days: number): number {
  if (!Number.isFinite(days) || days < 0) return 0;
  if (days > 7) return 7;
  return days;
}

function cap960(weeklyMin: number): number {
  // Protocol: per-day per-type cap 960 minutes → weekly cap = 960×7.
  return Math.min(weeklyMin, 960 * 7);
}

// Piecewise-linear curve through the calibration anchors specified in the
// briefing: 0→0 · 600→40 · 3000→75 · 8000+→100.
function scoreFromTotalMet(totalMet: number): number {
  if (totalMet <= 0) return 0;
  if (totalMet >= 8000) return 100;
  if (totalMet <= 600) return Math.round((totalMet / 600) * 40);
  if (totalMet <= 3000) {
    return Math.round(40 + ((totalMet - 600) / (3000 - 600)) * (75 - 40));
  }
  return Math.round(75 + ((totalMet - 3000) / (8000 - 3000)) * (100 - 75));
}

function categorize(
  totalMet: number,
  vigorousDays: number,
  vigorousMinutesDay: number,
  moderateDays: number,
  moderateMinutesDay: number,
  walkingDays: number,
  walkingMinutesDay: number,
): ActivityCategory {
  const anyDays = vigorousDays + moderateDays + walkingDays;

  const highA = vigorousDays >= 3 && totalMet >= 1500;
  const highB = anyDays >= 7 && totalMet >= 3000;
  if (highA || highB) return "HIGH";

  const modA = vigorousDays >= 3 && vigorousMinutesDay >= 20;
  const modB =
    moderateDays + walkingDays >= 5 &&
    moderateMinutesDay + walkingMinutesDay >= 30;
  const modC = totalMet >= 600;
  if (modA || modB || modC) return "MODERATE";

  return "LOW";
}

function bandFor(score: number): ActivityBand {
  if (score < 40) return "low";
  if (score < 75) return "moderate";
  return "high";
}

function sittingRisk(hours: number | undefined): SittingRiskFlag {
  if (typeof hours !== "number" || !Number.isFinite(hours)) return "normal";
  if (hours > 8) return "critical";
  if (hours >= 6) return "elevated";
  return "normal";
}

export interface ActivityScoreWithProvenance extends ActivityResult {
  activity_source: MetricProvenance;
}

export function calculateActivityScore(
  inputs: ActivityInputs,
  wearable?: WearableOverrides["activity"],
  provenance?: "whoop" | "apple_health",
): ActivityScoreWithProvenance {
  const walkDays = clampDays(inputs.walking_days);
  const modDays = clampDays(inputs.moderate_days);
  const vigDays = clampDays(inputs.vigorous_days);

  const walkMin = normalizeBout(inputs.walking_minutes_per_day);
  const modMin = normalizeBout(inputs.moderate_minutes_per_day);
  const vigMin = normalizeBout(inputs.vigorous_minutes_per_day);

  // Walking MET: prefer measured daily_steps × 7 days when present, else
  // explicit weekly total (new standing-hours question), else IPAQ fallback.
  // Step-to-walking-minute conversion: ~100 steps/min moderate pace, so
  // minutes/day ≈ steps/100, then × 7 for weekly total.
  const walkingMinutesFromSteps =
    wearable?.daily_steps != null && Number.isFinite(wearable.daily_steps)
      ? Math.max(0, (wearable.daily_steps as number) / 100) * 7
      : undefined;

  const walking_met = cap960(
    walkingMinutesFromSteps != null
      ? MET_WALK * walkingMinutesFromSteps
      : Number.isFinite(inputs.walking_total_minutes_week as number)
        ? MET_WALK * Math.max(0, inputs.walking_total_minutes_week as number)
        : MET_WALK * walkMin * walkDays,
  );
  const moderate_met = cap960(MET_MOD * modMin * modDays);
  const vigorous_met = cap960(MET_VIG * vigMin * vigDays);

  const total_met_minutes_week = walking_met + moderate_met + vigorous_met;

  let activity_category = categorize(
    total_met_minutes_week,
    vigDays,
    vigMin,
    modDays,
    modMin,
    walkDays,
    walkMin,
  );

  // WHOOP strain ≥14 (of 21) consistently = at least MODERATE day-to-day load.
  if (
    wearable?.whoop_strain_0_21 != null &&
    wearable.whoop_strain_0_21 >= 14 &&
    activity_category === "LOW"
  ) {
    activity_category = "MODERATE";
  }

  const activity_score_0_100 = scoreFromTotalMet(total_met_minutes_week);

  const activity_source: MetricProvenance =
    wearable?.daily_steps != null || wearable?.whoop_strain_0_21 != null
      ? (provenance ?? (wearable?.whoop_strain_0_21 != null ? "whoop" : "apple_health"))
      : "self_report";

  return {
    walking_met: Math.round(walking_met),
    moderate_met: Math.round(moderate_met),
    vigorous_met: Math.round(vigorous_met),
    total_met_minutes_week: Math.round(total_met_minutes_week),
    activity_category,
    activity_score_0_100,
    activity_band: bandFor(activity_score_0_100),
    sitting_risk_flag: sittingRisk(inputs.sitting_hours_per_day),
    activity_source,
  };
}
