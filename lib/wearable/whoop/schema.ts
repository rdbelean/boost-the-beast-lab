// WHOOP CSV column fingerprints. Each schema version lists the column names
// we rely on for parsing. If the fingerprint doesn't match any known version,
// we tag the upload with 'whoop_vUNKNOWN' and the UI shows a "neues Format"
// fallback.
//
// Add new versions here as WHOOP changes their export format — the parser
// picks the first version whose required columns are all present.

export interface WhoopSchemaFingerprint {
  version: string;
  sleeps: {
    required: string[];
    duration_min?: string; // "Asleep duration (min)"
    efficiency_pct?: string; // "Sleep efficiency %"
    wakeups?: string; // "Disturbances"
    date?: string; // "Cycle start time" or similar
  };
  physiological_cycles: {
    required: string[];
    recovery_0_100?: string; // "Recovery score %"
    hrv_ms?: string; // "Heart rate variability (ms)"
    rhr_bpm?: string; // "Resting heart rate (bpm)"
    date?: string;
  };
  workouts: {
    required: string[];
    strain_0_21?: string;
    date?: string;
  };
}

export const WHOOP_SCHEMAS: WhoopSchemaFingerprint[] = [
  {
    version: "whoop_v1",
    sleeps: {
      required: ["Asleep duration (min)", "Sleep efficiency %"],
      duration_min: "Asleep duration (min)",
      efficiency_pct: "Sleep efficiency %",
      wakeups: "Disturbances",
      date: "Cycle start time",
    },
    physiological_cycles: {
      required: ["Recovery score %", "Heart rate variability (ms)", "Resting heart rate (bpm)"],
      recovery_0_100: "Recovery score %",
      hrv_ms: "Heart rate variability (ms)",
      rhr_bpm: "Resting heart rate (bpm)",
      date: "Cycle start time",
    },
    workouts: {
      required: ["Day Strain"],
      strain_0_21: "Day Strain",
      date: "Cycle start time",
    },
  },
];

/** Find the first schema version whose required columns are all present. */
export function detectWhoopSchema(
  sleepsHeaders: string[],
  cyclesHeaders: string[],
  workoutsHeaders: string[],
): WhoopSchemaFingerprint | null {
  const sleepsSet = new Set(sleepsHeaders);
  const cyclesSet = new Set(cyclesHeaders);
  const workoutsSet = new Set(workoutsHeaders);

  for (const schema of WHOOP_SCHEMAS) {
    const sleepsOk = schema.sleeps.required.every((c) => sleepsSet.has(c));
    const cyclesOk = schema.physiological_cycles.required.every((c) =>
      cyclesSet.has(c),
    );
    const workoutsOk = schema.workouts.required.every((c) => workoutsSet.has(c));
    if (sleepsOk && cyclesOk && workoutsOk) return schema;
  }
  return null;
}
