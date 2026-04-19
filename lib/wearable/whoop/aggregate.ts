// Pure aggregator for WHOOP CSV rows. Input is the raw parsed CSV rows +
// schema fingerprint; output is the compact metrics JSON that gets persisted.
//
// physiological_cycles.csv is the primary source — it contains recovery,
// sleep and strain data for every cycle. sleeps.csv is secondary; workouts.csv
// provides per-workout detail but Day Strain is in cycles.
//
// Windowing: last 30 cycles (one per day) from the most recent cycle date.

import type { WhoopSchemaFingerprint } from "./schema";
import type { ParseWarning, WearableMetrics } from "../types";

type Row = Record<string, string | undefined>;

export interface WhoopAggregateInput {
  sleeps: Row[];
  cycles: Row[];
  workouts: Row[];
  schema: WhoopSchemaFingerprint;
  windowDays?: number;
}

export interface WhoopAggregateOutput {
  metrics: WearableMetrics;
  window_start: string;
  window_end: string;
  days_covered: number;
  parse_warnings: ParseWarning[];
}

function parseNum(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mean(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round(v: number | null, decimals: number): number | undefined {
  if (v == null) return undefined;
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

export function aggregateWhoop(input: WhoopAggregateInput): WhoopAggregateOutput {
  const { cycles, sleeps, workouts, schema } = input;
  const windowDays = input.windowDays ?? 30;
  const warnings: ParseWarning[] = [];
  const pc = schema.physiological_cycles;

  // 1. Window end = most recent cycle date (fall back to today).
  const cycleDates = cycles
    .map((r) => parseDate(r[pc.date ?? ""]))
    .filter((d): d is Date => d != null);
  const windowEnd = cycleDates.length
    ? new Date(Math.max(...cycleDates.map((d) => d.getTime())))
    : new Date();
  const windowStart = new Date(windowEnd);
  windowStart.setDate(windowStart.getDate() - windowDays);

  const inWindow = (row: Row, dateCol: string | undefined): boolean => {
    const d = parseDate(row[dateCol ?? ""]);
    return !!d && d >= windowStart && d <= windowEnd;
  };

  // 2. Filter to window.
  const cyclesW = cycles.filter((r) => inWindow(r, pc.date));
  const sleepsW = sleeps.filter((r) => inWindow(r, schema.sleeps.date));
  const workoutsW = workouts.filter((r) => inWindow(r, schema.workouts.date));

  // 3. Days covered — union of cycles + sleeps + workouts. If all three
  //    columns somehow returned empty strings but we still have rows (edge
  //    case in the April 2026 export format), fall back to cycle row count
  //    so the user doesn't end up with "0 days measured" after a successful
  //    parse. Add a warning so the condition is visible in parse_warnings.
  const dateSet = new Set<string>();
  for (const r of cyclesW) {
    const d = parseDate(r[pc.date ?? ""]);
    if (d) dateSet.add(toISODate(d));
  }
  for (const r of sleepsW) {
    const d = parseDate(r[schema.sleeps.date ?? ""]);
    if (d) dateSet.add(toISODate(d));
  }
  for (const r of workoutsW) {
    const d = parseDate(r[schema.workouts.date ?? ""]);
    if (d) dateSet.add(toISODate(d));
  }

  let days_covered = dateSet.size;
  if (days_covered === 0 && cyclesW.length > 0) {
    // Cycles exist but their date columns didn't parse — use row count
    // clamped to the window as a conservative fallback.
    days_covered = Math.min(windowDays, cyclesW.length);
    warnings.push({
      code: "date_fallback",
      message: `WHOOP cycle rows had unparseable date columns; falling back to row count (${days_covered})`,
    });
  }

  if (days_covered < 3) {
    warnings.push({
      code: "short_window",
      message: `Only ${days_covered} days of WHOOP data in the last ${windowDays} days`,
    });
  }

  // 4. All primary metrics from physiological_cycles.csv.
  const recoveryScores  = cyclesW.map((r) => parseNum(r[pc.recovery_0_100 ?? ""]));
  const hrv             = cyclesW.map((r) => parseNum(r[pc.hrv_ms ?? ""]));
  const rhr             = cyclesW.map((r) => parseNum(r[pc.rhr_bpm ?? ""]));
  const dayStrain       = cyclesW.map((r) => parseNum(r[pc.day_strain ?? ""]));
  const sleepDurationH  = cyclesW.map((r) => {
    const min = parseNum(r[pc.duration_min ?? ""]);
    return min != null ? min / 60 : null;
  });
  const sleepEff        = cyclesW.map((r) => parseNum(r[pc.efficiency_pct ?? ""]));
  const sleepPerf       = cyclesW.map((r) => parseNum(r[pc.sleep_performance_pct ?? ""]));
  const deepSleepMin    = cyclesW.map((r) => parseNum(r[pc.deep_sleep_min ?? ""]));
  const remMin          = cyclesW.map((r) => parseNum(r[pc.rem_min ?? ""]));

  // 5. If dedicated sleeps.csv is present and has better detail, prefer it for
  //    duration/efficiency (same columns, potentially deduplicated sleep events).
  const hasSleepDetail = sleepsW.length > 0 && schema.sleeps.duration_min;
  const finalDurH = hasSleepDetail
    ? sleepsW.map((r) => {
        const min = parseNum(r[schema.sleeps.duration_min ?? ""]);
        return min != null ? min / 60 : null;
      })
    : sleepDurationH;
  const finalEff = hasSleepDetail
    ? sleepsW.map((r) => parseNum(r[schema.sleeps.efficiency_pct ?? ""]))
    : sleepEff;
  const finalPerf = hasSleepDetail && schema.sleeps.sleep_performance_pct
    ? sleepsW.map((r) => parseNum(r[schema.sleeps.sleep_performance_pct ?? ""]))
    : sleepPerf;

  // 6. Activity strain: Day Strain from cycles is the main signal.
  //    workouts.csv provides per-workout Activity Strain as a secondary check.
  const activityStrain = workoutsW.map((r) => parseNum(r[schema.workouts.activity_strain ?? ""]));

  const metrics: WearableMetrics = {
    sleep: {
      avg_duration_hours:        round(mean(finalDurH), 2),
      avg_efficiency_pct:        round(mean(finalEff), 1),
      avg_sleep_performance_pct: round(mean(finalPerf), 1),
      avg_deep_sleep_min:        round(mean(deepSleepMin), 1),
      avg_rem_min:               round(mean(remMin), 1),
    },
    recovery: {
      avg_score:    round(mean(recoveryScores), 1),
      avg_hrv_ms:   round(mean(hrv), 1),
      avg_rhr_bpm:  round(mean(rhr), 1),
    },
    activity: {
      avg_strain:      round(mean(dayStrain), 2),
      avg_active_kcal: round(mean(activityStrain), 2), // activity strain as secondary
    },
  };

  return {
    metrics,
    window_start: toISODate(windowStart),
    window_end:   toISODate(windowEnd),
    days_covered,
    parse_warnings: warnings,
  };
}
