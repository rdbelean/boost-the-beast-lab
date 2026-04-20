import type { MergedWearableMetrics } from "@/lib/wearable/types";
import {
  evaluateSleepDuration,
  evaluateSleepEfficiency,
  evaluateDeepSleep,
  evaluateREM,
  evaluateHRV,
  evaluateRHR,
  evaluateWHOOPRecovery,
  evaluateSteps,
  evaluateStrain,
  evaluateBMI,
  evaluateBodyFat,
  evaluateVO2max,
  type Evaluation,
} from "./evaluators";

export type { Evaluation };

export interface MetricRow {
  label_key: string;
  value: string;
  unit?: string;
  evaluation?: Evaluation;
}

export interface DataInsights {
  sleep?: MetricRow[];
  activity?: MetricRow[];
  vo2max?: MetricRow[];
  metabolic?: MetricRow[];
  stress?: MetricRow[];
}

function fmt1(n: number) { return n.toFixed(1); }
function fmt0(n: number) { return Math.round(n).toString(); }

export function generateDataInsights(
  wearable: MergedWearableMetrics,
  userGender?: "male" | "female",
  userAge?: number,
): DataInsights {
  const insights: DataInsights = {};

  // ── SLEEP ──────────────────────────────────────────────────────────────────
  const sleepRows: MetricRow[] = [];
  const sl = wearable.sleep;
  if (sl?.avg_duration_hours != null) {
    sleepRows.push({ label_key: "duration", value: fmt1(sl.avg_duration_hours), unit: "h",
      evaluation: evaluateSleepDuration(sl.avg_duration_hours) });
  }
  if (sl?.avg_efficiency_pct != null) {
    sleepRows.push({ label_key: "efficiency", value: fmt0(sl.avg_efficiency_pct), unit: "%",
      evaluation: evaluateSleepEfficiency(sl.avg_efficiency_pct) });
  }
  if (sl?.avg_deep_sleep_min != null) {
    sleepRows.push({ label_key: "deep_sleep", value: fmt0(sl.avg_deep_sleep_min), unit: "min",
      evaluation: evaluateDeepSleep(sl.avg_deep_sleep_min) });
  }
  if (sl?.avg_rem_min != null) {
    sleepRows.push({ label_key: "rem", value: fmt0(sl.avg_rem_min), unit: "min",
      evaluation: evaluateREM(sl.avg_rem_min) });
  }
  if (sl?.avg_wakeups != null) {
    sleepRows.push({ label_key: "wakeups", value: fmt1(sl.avg_wakeups), unit: "×/Nacht" });
  }
  if (sleepRows.length > 0) insights.sleep = sleepRows;

  // ── ACTIVITY ───────────────────────────────────────────────────────────────
  const actRows: MetricRow[] = [];
  const ac = wearable.activity;
  if (ac?.avg_steps != null) {
    actRows.push({ label_key: "steps", value: fmt0(ac.avg_steps), unit: "Schritte/Tag",
      evaluation: evaluateSteps(ac.avg_steps) });
  }
  if (ac?.avg_strain != null) {
    actRows.push({ label_key: "strain", value: fmt1(ac.avg_strain), unit: "/ 21",
      evaluation: evaluateStrain(ac.avg_strain) });
  }
  if (ac?.avg_active_kcal != null) {
    actRows.push({ label_key: "active_kcal", value: fmt0(ac.avg_active_kcal), unit: "kcal/Tag" });
  }
  if (actRows.length > 0) insights.activity = actRows;

  // ── RECOVERY (shown in stress dimension) ───────────────────────────────────
  const recRows: MetricRow[] = [];
  const rc = wearable.recovery;
  if (rc?.avg_hrv_ms != null) {
    recRows.push({ label_key: "hrv", value: fmt0(rc.avg_hrv_ms), unit: "ms",
      evaluation: evaluateHRV(rc.avg_hrv_ms) });
  }
  if (rc?.avg_rhr_bpm != null) {
    recRows.push({ label_key: "rhr", value: fmt0(rc.avg_rhr_bpm), unit: "bpm",
      evaluation: evaluateRHR(rc.avg_rhr_bpm) });
  }
  if (rc?.avg_score != null) {
    recRows.push({ label_key: "whoop_recovery", value: fmt0(rc.avg_score), unit: "%",
      evaluation: evaluateWHOOPRecovery(rc.avg_score) });
  }
  if (recRows.length > 0) insights.stress = recRows;

  // ── VO2MAX ─────────────────────────────────────────────────────────────────
  const v2 = wearable.vo2max;
  if (v2?.last_value != null) {
    insights.vo2max = [{
      label_key: "value",
      value: fmt1(v2.last_value),
      unit: "ml/kg/min",
      evaluation: userAge != null && userGender != null
        ? evaluateVO2max(v2.last_value, userAge, userGender)
        : undefined,
    }];
  }

  // ── METABOLIC ──────────────────────────────────────────────────────────────
  const metRows: MetricRow[] = [];
  const bd = wearable.body;
  if (bd?.bmi != null) {
    metRows.push({ label_key: "bmi", value: fmt1(bd.bmi), unit: "kg/m²",
      evaluation: evaluateBMI(bd.bmi) });
  }
  if (bd?.body_fat_pct != null) {
    metRows.push({ label_key: "body_fat", value: fmt1(bd.body_fat_pct), unit: "%",
      evaluation: userGender != null ? evaluateBodyFat(bd.body_fat_pct, userGender) : undefined });
  }
  if (bd?.skeletal_muscle_kg != null) {
    metRows.push({ label_key: "skeletal_muscle", value: fmt1(bd.skeletal_muscle_kg), unit: "kg" });
  }
  if (bd?.last_weight_kg != null && bd.bmi == null) {
    metRows.push({ label_key: "weight", value: fmt1(bd.last_weight_kg), unit: "kg" });
  }
  if (metRows.length > 0) insights.metabolic = metRows;

  return insights;
}

/** Format DataInsights for a given dimension as PDF stat-box rows. */
export function insightsToPdfRows(
  rows: MetricRow[],
  labelMap: Record<string, string>,
): Array<[string, string]> {
  return rows.map((r) => {
    const label = labelMap[r.label_key] ?? r.label_key;
    const val = r.unit ? `${r.value} ${r.unit}` : r.value;
    return [label, val] as [string, string];
  });
}
