// WHOOP CSV column fingerprints. Each schema version lists the column names
// we rely on for parsing. Schema detection passes when physiological_cycles.csv
// has all required columns — sleeps.csv and workouts.csv are optional.
//
// Add new versions here as WHOOP changes their export format.

export interface WhoopSchemaFingerprint {
  version: string;
  sleeps: {
    required: string[];
    duration_min?: string;
    efficiency_pct?: string;
    sleep_performance_pct?: string;
    date?: string;
  };
  physiological_cycles: {
    required: string[];
    recovery_0_100?: string;
    hrv_ms?: string;
    rhr_bpm?: string;
    day_strain?: string;
    sleep_performance_pct?: string;
    deep_sleep_min?: string;
    rem_min?: string;
    duration_min?: string;
    efficiency_pct?: string;
    date?: string;
  };
  workouts: {
    required: string[];
    activity_strain?: string;
    date?: string;
  };
}

// April 2026 real export format. physiological_cycles.csv is the primary file
// and contains all recovery, sleep and strain data we need.
export const WHOOP_SCHEMAS: WhoopSchemaFingerprint[] = [
  {
    version: "whoop_v1",
    sleeps: {
      required: [],
      duration_min: "Asleep duration (min)",
      efficiency_pct: "Sleep efficiency %",
      sleep_performance_pct: "Sleep performance %",
      date: "Cycle start time",
    },
    physiological_cycles: {
      // Only these three are required to accept the file.
      required: ["Recovery score %", "Heart rate variability (ms)", "Asleep duration (min)"],
      recovery_0_100: "Recovery score %",
      hrv_ms: "Heart rate variability (ms)",
      rhr_bpm: "Resting heart rate (bpm)",
      day_strain: "Day Strain",
      sleep_performance_pct: "Sleep performance %",
      deep_sleep_min: "Deep (SWS) duration (min)",
      rem_min: "REM duration (min)",
      duration_min: "Asleep duration (min)",
      efficiency_pct: "Sleep efficiency %",
      date: "Cycle start time",
    },
    workouts: {
      required: [],
      activity_strain: "Activity Strain",
      date: "Cycle start time",
    },
  },
];

/**
 * Detect schema by checking physiological_cycles.csv required columns only.
 * sleeps.csv and workouts.csv are supplementary — their absence does not
 * cause rejection.
 */
export function detectWhoopSchema(
  sleepsHeaders: string[],
  cyclesHeaders: string[],
  _workoutsHeaders: string[],
): WhoopSchemaFingerprint | null {
  const cyclesSet = new Set(cyclesHeaders);

  for (const schema of WHOOP_SCHEMAS) {
    const cyclesOk = schema.physiological_cycles.required.every((c) => cyclesSet.has(c));
    if (cyclesOk) return schema;
  }
  return null;
}
