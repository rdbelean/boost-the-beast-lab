// Body composition flag calculator (v2).
//
// Cross-references self-reported BMI category with visual body-type self-
// assessment to detect cases where BMI alone misrepresents composition
// (athletes with high BMI, lean people with low muscle, etc.).
//
// v2 vs v1:
//   - muscle_explains_bmi and strong_muscle_explains_high_bmi narrowed to
//     body type 4 ONLY (was type 3 OR 4). Type 3 + overweight BMI now
//     reads as bmi_reflects_overweight — gives Claude a clearer signal.
//   - Multipliers tuned stronger: 0.6 → 0.7 and 0.8 → 0.9, so the BMI
//     penalty is more thoroughly forgiven for athletic bodies.
//   - optimal_athletic earns a flat +5 metabolic-score bonus on top of
//     the composite — reward truly good composition.
//   - Discrepancy threshold for type 1/2 lowered from BMI ≥30 to BMI ≥28.
//
// The flag drives:
//   - bmi_penalty_modifier: applied to bmiSc BEFORE composite weighting
//     (0.0 = full penalty, 1.0 = no penalty, negative intensifies)
//   - metabolic_score_bonus: added AFTER composite, clamped to [0, 100]
//   - report tone: each flag has a VERBOTEN/PFLICHT block in the prompts

import type { BodyType, BodyCompositionFlag } from "./body-composition-types";
import { bodyTypeNumber } from "./body-composition-types";

export interface BodyCompositionDetails {
  note: string;
  bmi_penalty_modifier: number;
  metabolic_score_bonus: number;
}

export function calculateBodyCompositionFlag(
  bmi: number,
  bodyType: BodyType | null,
): BodyCompositionFlag | null {
  if (!bodyType) return null;
  const n = bodyTypeNumber(bodyType);

  // BMI < 18.5 — underweight range
  if (bmi < 18.5) {
    if (n === 1) return "possible_underweight";
    if (n <= 3) return "lean_with_low_muscle";
    return "discrepancy_lean_high_self_assessment";
  }

  // BMI 18.5–24.9 — normal range
  if (bmi < 25) {
    if (n === 1) return "lean_with_low_muscle";
    if (n === 2) return "optimal_lean";
    if (n === 3 || n === 4) return "optimal_athletic"; // +5 bonus
    return "discrepancy_lean_high_self_assessment";
  }

  // BMI 25.0–27.9 — lower overweight
  if (bmi < 28) {
    if (n === 4) return "muscle_explains_bmi"; // narrowed: type 4 only
    return "bmi_reflects_overweight"; // includes type 3 fallback
  }

  // BMI 28.0–29.9 — upper overweight (discrepancy zone for lean self-assess)
  if (bmi < 30) {
    if (n <= 2) return "discrepancy_overweight_athletic_assessment"; // lowered threshold
    if (n === 4) return "muscle_explains_bmi";
    return "bmi_reflects_overweight";
  }

  // BMI ≥ 30 — obese range
  if (n <= 2) return "discrepancy_overweight_athletic_assessment";
  if (n === 4) return "strong_muscle_explains_high_bmi"; // narrowed: type 4 only
  return "bmi_reflects_obesity"; // includes type 3 fallback
}

export function getBodyCompositionDetails(
  flag: BodyCompositionFlag | null,
): BodyCompositionDetails {
  switch (flag) {
    case "muscle_explains_bmi":
      return {
        note: "Muscular composition explains elevated BMI",
        bmi_penalty_modifier: 0.7, // v2: stronger forgiveness (was 0.6)
        metabolic_score_bonus: 0,
      };
    case "strong_muscle_explains_high_bmi":
      return {
        note: "Strong muscular composition explains high BMI",
        bmi_penalty_modifier: 0.9, // v2: stronger forgiveness (was 0.8)
        metabolic_score_bonus: 0,
      };
    case "bmi_reflects_overweight":
      return {
        note: "BMI and self-assessment align — overweight",
        bmi_penalty_modifier: 0.0,
        metabolic_score_bonus: 0,
      };
    case "bmi_reflects_obesity":
      return {
        note: "BMI and self-assessment align — obesity",
        bmi_penalty_modifier: 0.0,
        metabolic_score_bonus: 0,
      };
    case "optimal_lean":
      return {
        note: "Optimal lean composition",
        bmi_penalty_modifier: 0.0,
        metabolic_score_bonus: 0,
      };
    case "optimal_athletic":
      return {
        note: "Optimal athletic composition",
        bmi_penalty_modifier: 0.0,
        metabolic_score_bonus: 5, // v2: reward optimal composition
      };
    case "lean_with_low_muscle":
      return {
        note: "Lean with low muscle mass — focus on build",
        bmi_penalty_modifier: 0.0,
        metabolic_score_bonus: 0,
      };
    case "possible_underweight":
      // negative modifier: intensifies the BMI penalty (visual + numeric agree)
      return {
        note: "Possible underweight — caution",
        bmi_penalty_modifier: -0.3,
        metabolic_score_bonus: 0,
      };
    case "discrepancy_lean_high_self_assessment":
      return {
        note: "Self-assessment suggests more mass than BMI shows",
        bmi_penalty_modifier: 0.0,
        metabolic_score_bonus: 0,
      };
    case "discrepancy_overweight_athletic_assessment":
      return {
        note: "Self-assessment leaner than BMI suggests — BMI primary",
        bmi_penalty_modifier: 0.0,
        metabolic_score_bonus: 0,
      };
    case null:
    default:
      return { note: "", bmi_penalty_modifier: 0.0, metabolic_score_bonus: 0 };
  }
}

// Apply modifier to a raw BMI sub-score, BEFORE composite weighting.
//   modifier ≥ 0: pull score toward 100 by `modifier × gap`
//   modifier < 0: push score toward 0 by `|modifier| × score`
export function applyBmiPenaltyModifier(
  bmiScoreRaw: number,
  modifier: number,
): number {
  if (modifier === 0) return bmiScoreRaw;
  if (modifier > 0) {
    const gap = 100 - bmiScoreRaw;
    return Math.max(0, Math.min(100, bmiScoreRaw + gap * modifier));
  }
  // negative
  return Math.max(0, Math.min(100, bmiScoreRaw + bmiScoreRaw * modifier));
}
