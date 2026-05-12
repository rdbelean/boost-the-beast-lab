// Body composition flag calculator.
//
// Cross-references self-reported BMI category with visual body-type self-
// assessment to detect cases where BMI alone misrepresents composition
// (athletes with high BMI, lean people with low muscle, etc.).
//
// The flag drives:
//   - bmi_penalty_modifier: how much of the BMI penalty in the metabolic
//     score is forgiven (0.0 = full penalty, 1.0 = no penalty, negative
//     values intensify the penalty)
//   - report tone: each flag has a documented prose-style in the prompts

import type { BodyType, BodyCompositionFlag } from "./body-composition-types";
import { bodyTypeNumber } from "./body-composition-types";

export interface BodyCompositionDetails {
  note: string;
  bmi_penalty_modifier: number;
}

export function calculateBodyCompositionFlag(
  bmi: number,
  bodyType: BodyType | null,
): BodyCompositionFlag | null {
  if (!bodyType) return null;
  const n = bodyTypeNumber(bodyType);

  // BMI ranges (WHO):
  //   <18.5  underweight
  //   <25    normal
  //   <30    overweight
  //   ≥30    obese

  if (bmi < 18.5) {
    if (n === 1) return "possible_underweight";
    if (n <= 3) return "lean_with_low_muscle";
    return "discrepancy_lean_high_self_assessment";
  }

  if (bmi < 25) {
    if (n === 1) return "lean_with_low_muscle";
    if (n === 2) return "optimal_lean";
    if (n === 3 || n === 4) return "optimal_athletic";
    return "discrepancy_lean_high_self_assessment";
  }

  if (bmi < 30) {
    if (n <= 2) return "bmi_reflects_overweight";
    if (n === 3 || n === 4) return "muscle_explains_bmi";
    return "bmi_reflects_overweight";
  }

  // BMI ≥ 30
  if (n <= 2) return "discrepancy_overweight_athletic_assessment";
  if (n === 3 || n === 4) return "strong_muscle_explains_high_bmi";
  return "bmi_reflects_obesity";
}

export function getBodyCompositionDetails(
  flag: BodyCompositionFlag | null,
): BodyCompositionDetails {
  switch (flag) {
    case "muscle_explains_bmi":
      return {
        note: "Muscular composition explains elevated BMI",
        bmi_penalty_modifier: 0.6,
      };
    case "strong_muscle_explains_high_bmi":
      return {
        note: "Strong muscular composition explains high BMI",
        bmi_penalty_modifier: 0.8,
      };
    case "bmi_reflects_overweight":
      return {
        note: "BMI and self-assessment align — overweight",
        bmi_penalty_modifier: 0.0,
      };
    case "bmi_reflects_obesity":
      return {
        note: "BMI and self-assessment align — obesity",
        bmi_penalty_modifier: 0.0,
      };
    case "optimal_lean":
      return {
        note: "Optimal lean composition",
        bmi_penalty_modifier: 0.0,
      };
    case "optimal_athletic":
      return {
        note: "Optimal athletic composition",
        bmi_penalty_modifier: 0.0,
      };
    case "lean_with_low_muscle":
      return {
        note: "Lean with low muscle mass — focus on build",
        bmi_penalty_modifier: 0.0,
      };
    case "possible_underweight":
      // negative modifier: intensifies the BMI penalty (visual + numeric agree)
      return {
        note: "Possible underweight — caution",
        bmi_penalty_modifier: -0.3,
      };
    case "discrepancy_lean_high_self_assessment":
      return {
        note: "Self-assessment suggests more mass than BMI shows",
        bmi_penalty_modifier: 0.0,
      };
    case "discrepancy_overweight_athletic_assessment":
      return {
        note: "Self-assessment leaner than BMI suggests — BMI primary",
        bmi_penalty_modifier: 0.0,
      };
    case null:
    default:
      return { note: "", bmi_penalty_modifier: 0.0 };
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
