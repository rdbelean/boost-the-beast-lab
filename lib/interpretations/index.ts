// Interpretations — central entry point. Bundles per-band interpretations,
// systemic warnings, top priority resolution and the BMI context note.
//
// The bundle is deterministic: given a set of bands + flags, the same bundle
// is returned every time. This is intentional — it keeps the downstream
// Claude prompt narrow (no hallucinated studies, no invented numbers).

import {
  SLEEP_INTERPRETATIONS,
  SLEEP_CONSISTENCY_NOTE,
  type SleepBandInterpretation,
} from "./sleep";
import {
  RECOVERY_INTERPRETATIONS,
  OVERTRAINING_WARNING,
  type RecoveryBandInterpretation,
} from "./recovery";
import {
  ACTIVITY_INTERPRETATIONS,
  SITTING_FLAGS,
  type ActivityBandInterpretation,
  type SittingFlagPayload,
} from "./activity";
import {
  METABOLIC_INTERPRETATIONS,
  BMI_CONTEXT_NOTES,
  type MetabolicBandInterpretation,
} from "./metabolic";
import {
  STRESS_INTERPRETATIONS,
  CHRONIC_STRESS_WARNING,
  HPA_AXIS_WARNING,
  type StressBandInterpretation,
} from "./stress";
import {
  VO2MAX_INTERPRETATIONS,
  VO2MAX_DISCLAIMER,
  type VO2MaxBandInterpretation,
} from "./vo2max";

import type { SleepBand } from "../scoring/sleep";
import type { RecoveryBand } from "../scoring/recovery";
import type { ActivityBand, SittingRiskFlag } from "../scoring/activity";
import type { MetabolicBand, BMICategory } from "../scoring/metabolic";
import type { StressBand } from "../scoring/stress";
import type { FitnessBand, Gender } from "../scoring/vo2max";

export {
  SLEEP_INTERPRETATIONS,
  SLEEP_CONSISTENCY_NOTE,
  RECOVERY_INTERPRETATIONS,
  OVERTRAINING_WARNING,
  ACTIVITY_INTERPRETATIONS,
  SITTING_FLAGS,
  METABOLIC_INTERPRETATIONS,
  BMI_CONTEXT_NOTES,
  STRESS_INTERPRETATIONS,
  CHRONIC_STRESS_WARNING,
  HPA_AXIS_WARNING,
  VO2MAX_INTERPRETATIONS,
  VO2MAX_DISCLAIMER,
};

export type {
  SleepBandInterpretation,
  RecoveryBandInterpretation,
  ActivityBandInterpretation,
  MetabolicBandInterpretation,
  StressBandInterpretation,
  VO2MaxBandInterpretation,
  SittingFlagPayload,
};

export interface SystemicWarnings {
  overtraining_risk: boolean;
  chronic_stress_risk: boolean;
  hpa_axis_risk: boolean;
  sleep_consistency_flag: boolean;
  sitting_critical: boolean;
  sitting_elevated: boolean;
  bmi_disclaimer_needed: boolean;
}

export interface InterpretationInputs {
  sleep_band: SleepBand;
  recovery_band: RecoveryBand;
  activity_band: ActivityBand;
  metabolic_band: MetabolicBand;
  stress_band: StressBand;
  vo2max_band: FitnessBand;
  age: number;
  gender: Gender;
  bmi_category: BMICategory;
  sitting_risk: SittingRiskFlag;
}

export type ModuleKey =
  | "sleep"
  | "recovery"
  | "activity"
  | "metabolic"
  | "stress"
  | "vo2max";

export interface SystemicWarningEntry {
  code:
    | "overtraining_risk"
    | "chronic_stress_risk"
    | "hpa_axis_risk"
    | "sleep_consistency"
    | "sitting_critical"
    | "sitting_elevated"
    | "bmi_disclaimer";
  text: string;
}

export interface InterpretationBundle {
  sleep: SleepBandInterpretation;
  recovery: RecoveryBandInterpretation;
  activity: ActivityBandInterpretation;
  metabolic: MetabolicBandInterpretation;
  stress: StressBandInterpretation;
  vo2max: VO2MaxBandInterpretation;
  /** BMI-category-specific context sentence. */
  bmi_context: string;
  /** Sitting-risk payload or null when within normal range. */
  sitting_flag: SittingFlagPayload | null;
  /** Standard VO2max estimation disclaimer — always present. */
  vo2max_disclaimer: string;
  /** Non-null whenever the user reports inconsistent schedule. */
  consistency_note: string | null;
  /** Active systemic warnings in priority order. */
  warnings: SystemicWarningEntry[];
  /**
   * Ordered list of modules by intervention priority. The first element is
   * the single biggest lever to address. Order is driven by band severity
   * with stress/recovery receiving weight when their risk flags are active.
   */
  priority_order: ModuleKey[];
}

// Severity weights used to sort priorities. Lower bands = higher severity.
const SLEEP_SEVERITY: Record<SleepBand, number> = {
  poor: 1,
  moderate: 2,
  good: 3,
  excellent: 4,
};
const RECOVERY_SEVERITY: Record<RecoveryBand, number> = {
  critical: 0,
  low: 1,
  moderate: 2,
  good: 3,
  excellent: 4,
};
const ACTIVITY_SEVERITY: Record<ActivityBand, number> = {
  low: 1,
  moderate: 2,
  high: 3,
};
const METABOLIC_SEVERITY: Record<MetabolicBand, number> = {
  low: 1,
  moderate: 2,
  good: 3,
  excellent: 4,
};
const STRESS_SEVERITY: Record<StressBand, number> = {
  critical: 0,
  high: 1,
  elevated: 2,
  moderate: 3,
  low_stress: 4,
};
const VO2_SEVERITY: Record<FitnessBand, number> = {
  "Very Poor": 0,
  Poor: 1,
  Fair: 2,
  Good: 3,
  Excellent: 4,
  Superior: 5,
};

function collectWarnings(flags: SystemicWarnings): SystemicWarningEntry[] {
  const list: SystemicWarningEntry[] = [];
  // Order matters — most severe first.
  if (flags.overtraining_risk) {
    list.push({ code: "overtraining_risk", text: OVERTRAINING_WARNING });
  }
  if (flags.chronic_stress_risk) {
    list.push({ code: "chronic_stress_risk", text: CHRONIC_STRESS_WARNING });
  } else if (flags.hpa_axis_risk) {
    list.push({ code: "hpa_axis_risk", text: HPA_AXIS_WARNING });
  }
  if (flags.sitting_critical) {
    const payload = SITTING_FLAGS.critical;
    if (payload) list.push({ code: "sitting_critical", text: payload.text });
  } else if (flags.sitting_elevated) {
    const payload = SITTING_FLAGS.elevated;
    if (payload) list.push({ code: "sitting_elevated", text: payload.text });
  }
  if (flags.sleep_consistency_flag) {
    list.push({ code: "sleep_consistency", text: SLEEP_CONSISTENCY_NOTE });
  }
  if (flags.bmi_disclaimer_needed) {
    list.push({
      code: "bmi_disclaimer",
      text:
        "Hinweis zum BMI: BMI ist ein populationsbasierter Schätzer, kein individueller Gesundheitsmarker. Muskulöse Körperzusammensetzung verschiebt den Wert systematisch nach oben — das ist kein Risiko.",
    });
  }
  return list;
}

function resolvePriorityOrder(
  i: InterpretationInputs,
  flags: SystemicWarnings,
): ModuleKey[] {
  const entries: Array<[ModuleKey, number]> = [
    ["sleep", SLEEP_SEVERITY[i.sleep_band] ?? 4],
    ["recovery", RECOVERY_SEVERITY[i.recovery_band] ?? 4],
    ["activity", ACTIVITY_SEVERITY[i.activity_band] ?? 3],
    ["metabolic", METABOLIC_SEVERITY[i.metabolic_band] ?? 4],
    ["stress", STRESS_SEVERITY[i.stress_band] ?? 4],
    ["vo2max", VO2_SEVERITY[i.vo2max_band] ?? 5],
  ];

  // Hard bumps: active systemic warnings override normal ordering.
  if (flags.chronic_stress_risk || flags.hpa_axis_risk) {
    bumpToTop(entries, "stress");
  }
  if (flags.overtraining_risk) {
    bumpToTop(entries, "recovery");
  }

  // Sort ascending: lowest severity number (= highest priority) first.
  entries.sort((a, b) => a[1] - b[1]);
  return entries.map(([key]) => key);
}

function bumpToTop(entries: Array<[ModuleKey, number]>, key: ModuleKey): void {
  for (const e of entries) {
    if (e[0] === key) e[1] = -1;
  }
}

/**
 * getInterpretationBundle — given per-module bands + flags, return the full
 * deterministic interpretation bundle the downstream Claude prompt should use.
 *
 * This function is pure: no DB access, no randomness, no side effects.
 */
export function getInterpretationBundle(
  inputs: InterpretationInputs,
  flags: SystemicWarnings,
): InterpretationBundle {
  return {
    sleep: SLEEP_INTERPRETATIONS[inputs.sleep_band],
    recovery: RECOVERY_INTERPRETATIONS[inputs.recovery_band],
    activity: ACTIVITY_INTERPRETATIONS[inputs.activity_band],
    metabolic: METABOLIC_INTERPRETATIONS[inputs.metabolic_band],
    stress: STRESS_INTERPRETATIONS[inputs.stress_band],
    vo2max: VO2MAX_INTERPRETATIONS[inputs.vo2max_band],
    bmi_context: BMI_CONTEXT_NOTES[inputs.bmi_category],
    sitting_flag: SITTING_FLAGS[inputs.sitting_risk],
    vo2max_disclaimer: VO2MAX_DISCLAIMER,
    consistency_note: flags.sleep_consistency_flag ? SLEEP_CONSISTENCY_NOTE : null,
    warnings: collectWarnings(flags),
    priority_order: resolvePriorityOrder(inputs, flags),
  };
}
