// Maps wearable aggregate metrics into form field prefills for /analyse.
// Only objective measurements are mapped — stress, meals, water and fruit/veg
// stay form-based (wearables can't measure those).

import type { WearableMetrics } from "./types";

export type PrefilledField =
  | "gewicht"
  | "schlafdauer"
  | "schlafqualitaet"
  | "aufwachen"
  | "erholtGefuehl"
  | "schrittzahl";

export interface FormPrefill {
  values: Partial<{
    gewicht: number;
    schlafdauer: number;
    schlafqualitaet: string;
    aufwachen: string;
    erholtGefuehl: string;
    schrittzahl: number;
  }>;
  prefilledFields: PrefilledField[];
}

function roundHalf(v: number): number {
  return Math.round(v * 2) / 2;
}

function round500(v: number): number {
  return Math.round(v / 500) * 500;
}

/** Sleep performance or efficiency % → quality enum. */
function efficiencyToLabel(pct: number): string {
  if (pct >= 85) return "sehr-gut";
  if (pct >= 70) return "gut";
  if (pct >= 55) return "mittel";
  return "schlecht";
}

/** Mean wakeups/night → wakeup enum. */
function wakeupsToLabel(mean: number): string {
  if (mean === 0) return "nie";
  if (mean <= 1) return "selten";
  if (mean <= 2) return "manchmal";
  if (mean <= 3) return "oft";
  return "jede-nacht";
}

/** Recovery 0..100 → erholtGefuehl enum. */
function recoveryToLabel(score: number): string {
  if (score >= 80) return "immer";
  if (score >= 65) return "meistens";
  if (score >= 50) return "manchmal";
  if (score >= 35) return "selten";
  return "fast-nie";
}

/**
 * Compute form prefill values from aggregate wearable metrics.
 * Returns both the values and the list of fields that were filled — the UI
 * uses the list to place a WearableStatusBadge next to each.
 */
export function computeFormPrefill(metrics: WearableMetrics): FormPrefill {
  const values: FormPrefill["values"] = {};
  const prefilledFields: PrefilledField[] = [];

  const weight = metrics.body?.last_weight_kg;
  if (typeof weight === "number" && weight > 0) {
    values.gewicht = Math.round(weight);
    prefilledFields.push("gewicht");
  }

  const sleepHours = metrics.sleep?.avg_duration_hours;
  if (typeof sleepHours === "number" && sleepHours > 0) {
    values.schlafdauer = roundHalf(sleepHours);
    prefilledFields.push("schlafdauer");
  }

  // Prefer WHOOP Sleep Performance % (broader scale); fall back to efficiency.
  const perf = metrics.sleep?.avg_sleep_performance_pct;
  const eff  = metrics.sleep?.avg_efficiency_pct;
  const qualitySource = typeof perf === "number" && perf > 0 ? perf : eff;
  if (typeof qualitySource === "number" && qualitySource > 0) {
    values.schlafqualitaet = efficiencyToLabel(qualitySource);
    prefilledFields.push("schlafqualitaet");
  }

  const wakeups = metrics.sleep?.avg_wakeups;
  if (typeof wakeups === "number" && wakeups >= 0) {
    values.aufwachen = wakeupsToLabel(wakeups);
    prefilledFields.push("aufwachen");
  }

  const recovery = metrics.recovery?.avg_score;
  if (typeof recovery === "number" && recovery > 0) {
    values.erholtGefuehl = recoveryToLabel(recovery);
    prefilledFields.push("erholtGefuehl");
  }

  const steps = metrics.activity?.avg_steps;
  if (typeof steps === "number" && steps > 0) {
    values.schrittzahl = round500(steps);
    prefilledFields.push("schrittzahl");
  }

  return { values, prefilledFields };
}
