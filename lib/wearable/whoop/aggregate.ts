// Pure aggregator for WHOOP CSV rows. Input is the raw parsed CSV rows +
// schema fingerprint; output is the compact metrics JSON that gets persisted.
//
// Windowing: we keep only rows whose date is within `windowDays` of the most
// recent row in the sleeps CSV. This handles users who exported >30 days as
// well as users whose data is slightly stale.

import type { WhoopSchemaFingerprint } from "./schema";
import type { ParseWarning, WearableMetrics } from "../types";

type Row = Record<string, string | undefined>;

export interface WhoopAggregateInput {
  sleeps: Row[];
  cycles: Row[];
  workouts: Row[];
  schema: WhoopSchemaFingerprint;
  windowDays?: number; // default 30
}

export interface WhoopAggregateOutput {
  metrics: WearableMetrics;
  window_start: string; // ISO date
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

/** Mean of finite numbers, or null if none. */
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
  const { sleeps, cycles, workouts, schema } = input;
  const windowDays = input.windowDays ?? 30;
  const warnings: ParseWarning[] = [];

  // 1. Determine window_end = most recent sleep date (or today if missing).
  const sleepDates = sleeps
    .map((r) => parseDate(r[schema.sleeps.date ?? ""]))
    .filter((d): d is Date => d != null);
  const windowEnd = sleepDates.length
    ? new Date(Math.max(...sleepDates.map((d) => d.getTime())))
    : new Date();
  const windowStart = new Date(windowEnd);
  windowStart.setDate(windowStart.getDate() - windowDays);

  const inWindow = (row: Row, dateCol: string | undefined): boolean => {
    const d = parseDate(row[dateCol ?? ""]);
    if (!d) return false;
    return d >= windowStart && d <= windowEnd;
  };

  // 2. Filter rows to window.
  const sleepsW = sleeps.filter((r) => inWindow(r, schema.sleeps.date));
  const cyclesW = cycles.filter((r) => inWindow(r, schema.physiological_cycles.date));
  const workoutsW = workouts.filter((r) => inWindow(r, schema.workouts.date));

  // 3. Compute day_covered from unique dates across sleeps + cycles.
  const dateSet = new Set<string>();
  for (const r of sleepsW) {
    const d = parseDate(r[schema.sleeps.date ?? ""]);
    if (d) dateSet.add(toISODate(d));
  }
  for (const r of cyclesW) {
    const d = parseDate(r[schema.physiological_cycles.date ?? ""]);
    if (d) dateSet.add(toISODate(d));
  }
  const days_covered = dateSet.size;

  if (days_covered < 3) {
    warnings.push({
      code: "short_window",
      message: `Only ${days_covered} days of WHOOP data in the last ${windowDays} days`,
    });
  }

  // 4. Aggregate sleep.
  const sleepDurationHours = sleepsW.map((r) => {
    const min = parseNum(r[schema.sleeps.duration_min ?? ""]);
    return min != null ? min / 60 : null;
  });
  const sleepEff = sleepsW.map((r) => parseNum(r[schema.sleeps.efficiency_pct ?? ""]));
  const wakeups = sleepsW.map((r) => parseNum(r[schema.sleeps.wakeups ?? ""]));

  // 5. Aggregate recovery.
  const recoveryScores = cyclesW.map((r) =>
    parseNum(r[schema.physiological_cycles.recovery_0_100 ?? ""]),
  );
  const hrv = cyclesW.map((r) => parseNum(r[schema.physiological_cycles.hrv_ms ?? ""]));
  const rhr = cyclesW.map((r) => parseNum(r[schema.physiological_cycles.rhr_bpm ?? ""]));

  // 6. Aggregate strain (WHOOP's Day Strain sits in the workouts CSV per cycle).
  const strain = workoutsW.map((r) => parseNum(r[schema.workouts.strain_0_21 ?? ""]));

  const metrics: WearableMetrics = {
    sleep: {
      avg_duration_hours: round(mean(sleepDurationHours), 2),
      avg_efficiency_pct: round(mean(sleepEff), 1),
      avg_wakeups: round(mean(wakeups), 1),
    },
    recovery: {
      avg_score: round(mean(recoveryScores), 1),
      avg_hrv_ms: round(mean(hrv), 1),
      avg_rhr_bpm: round(mean(rhr), 1),
    },
    activity: {
      avg_strain: round(mean(strain), 2),
    },
  };

  return {
    metrics,
    window_start: toISODate(windowStart),
    window_end: toISODate(windowEnd),
    days_covered,
    parse_warnings: warnings,
  };
}
