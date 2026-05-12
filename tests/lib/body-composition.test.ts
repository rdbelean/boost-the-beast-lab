import { describe, expect, it } from "vitest";
import {
  calculateBodyCompositionFlag,
  getBodyCompositionDetails,
  applyBmiPenaltyModifier,
} from "@/lib/scoring/body-composition";

describe("calculateBodyCompositionFlag", () => {
  it("returns null when bodyType is null", () => {
    expect(calculateBodyCompositionFlag(27.8, null)).toBeNull();
  });

  it("BMI 27.8 + male_4 (muscular) → muscle_explains_bmi", () => {
    expect(calculateBodyCompositionFlag(27.8, "male_4")).toBe(
      "muscle_explains_bmi",
    );
  });

  it("BMI 27.8 + male_3 (athletic) → muscle_explains_bmi", () => {
    expect(calculateBodyCompositionFlag(27.8, "male_3")).toBe(
      "muscle_explains_bmi",
    );
  });

  it("BMI 27.8 + male_5 (bit more) → bmi_reflects_overweight", () => {
    expect(calculateBodyCompositionFlag(27.8, "male_5")).toBe(
      "bmi_reflects_overweight",
    );
  });

  it("BMI 27.8 + male_6 (strong build) → bmi_reflects_overweight", () => {
    expect(calculateBodyCompositionFlag(27.8, "male_6")).toBe(
      "bmi_reflects_overweight",
    );
  });

  it("BMI 31 + male_4 (muscular) → strong_muscle_explains_high_bmi", () => {
    expect(calculateBodyCompositionFlag(31.0, "male_4")).toBe(
      "strong_muscle_explains_high_bmi",
    );
  });

  it("BMI 31 + male_5/6 → bmi_reflects_obesity", () => {
    expect(calculateBodyCompositionFlag(31.0, "male_5")).toBe(
      "bmi_reflects_obesity",
    );
    expect(calculateBodyCompositionFlag(31.0, "male_6")).toBe(
      "bmi_reflects_obesity",
    );
  });

  it("BMI 31 + male_1/2 → discrepancy_overweight_athletic_assessment", () => {
    expect(calculateBodyCompositionFlag(31.0, "male_1")).toBe(
      "discrepancy_overweight_athletic_assessment",
    );
    expect(calculateBodyCompositionFlag(31.0, "male_2")).toBe(
      "discrepancy_overweight_athletic_assessment",
    );
  });

  it("BMI 22 + female_3 → optimal_athletic", () => {
    expect(calculateBodyCompositionFlag(22.0, "female_3")).toBe(
      "optimal_athletic",
    );
  });

  it("BMI 22 + female_2 → optimal_lean", () => {
    expect(calculateBodyCompositionFlag(22.0, "female_2")).toBe(
      "optimal_lean",
    );
  });

  it("BMI 22 + female_1 (very lean) → lean_with_low_muscle", () => {
    expect(calculateBodyCompositionFlag(22.0, "female_1")).toBe(
      "lean_with_low_muscle",
    );
  });

  it("BMI 22 + female_5/6 → discrepancy_lean_high_self_assessment", () => {
    expect(calculateBodyCompositionFlag(22.0, "female_5")).toBe(
      "discrepancy_lean_high_self_assessment",
    );
    expect(calculateBodyCompositionFlag(22.0, "female_6")).toBe(
      "discrepancy_lean_high_self_assessment",
    );
  });

  it("BMI 18.4 + female_1 → possible_underweight", () => {
    expect(calculateBodyCompositionFlag(18.4, "female_1")).toBe(
      "possible_underweight",
    );
  });

  it("BMI 17 + female_2/3 → lean_with_low_muscle", () => {
    expect(calculateBodyCompositionFlag(17.0, "female_2")).toBe(
      "lean_with_low_muscle",
    );
    expect(calculateBodyCompositionFlag(17.0, "female_3")).toBe(
      "lean_with_low_muscle",
    );
  });

  it("boundary: BMI 25.0 + male_4 → muscle_explains_bmi (not optimal_athletic)", () => {
    expect(calculateBodyCompositionFlag(25.0, "male_4")).toBe(
      "muscle_explains_bmi",
    );
  });

  it("boundary: BMI 24.9 + male_4 → optimal_athletic", () => {
    expect(calculateBodyCompositionFlag(24.9, "male_4")).toBe(
      "optimal_athletic",
    );
  });

  it("boundary: BMI 30.0 + male_4 → strong_muscle_explains_high_bmi", () => {
    expect(calculateBodyCompositionFlag(30.0, "male_4")).toBe(
      "strong_muscle_explains_high_bmi",
    );
  });
});

describe("getBodyCompositionDetails", () => {
  it("muscle_explains_bmi → modifier 0.6", () => {
    expect(getBodyCompositionDetails("muscle_explains_bmi").bmi_penalty_modifier)
      .toBe(0.6);
  });

  it("strong_muscle_explains_high_bmi → modifier 0.8", () => {
    expect(
      getBodyCompositionDetails("strong_muscle_explains_high_bmi")
        .bmi_penalty_modifier,
    ).toBe(0.8);
  });

  it("bmi_reflects_overweight → modifier 0.0", () => {
    expect(
      getBodyCompositionDetails("bmi_reflects_overweight").bmi_penalty_modifier,
    ).toBe(0.0);
  });

  it("possible_underweight → modifier -0.3 (intensifies penalty)", () => {
    expect(
      getBodyCompositionDetails("possible_underweight").bmi_penalty_modifier,
    ).toBe(-0.3);
  });

  it("null flag → modifier 0.0, empty note", () => {
    const d = getBodyCompositionDetails(null);
    expect(d.bmi_penalty_modifier).toBe(0.0);
    expect(d.note).toBe("");
  });
});

describe("applyBmiPenaltyModifier", () => {
  it("modifier 0 leaves score unchanged", () => {
    expect(applyBmiPenaltyModifier(72, 0)).toBe(72);
  });

  it("modifier 0.6 on bmiSc 72: 72 + 0.6×(100-72) = 88.8", () => {
    expect(applyBmiPenaltyModifier(72, 0.6)).toBeCloseTo(88.8, 4);
  });

  it("modifier 0.8 on bmiSc 45: 45 + 0.8×(100-45) = 89", () => {
    expect(applyBmiPenaltyModifier(45, 0.8)).toBeCloseTo(89, 4);
  });

  it("modifier 1.0 pulls score to 100", () => {
    expect(applyBmiPenaltyModifier(72, 1.0)).toBe(100);
  });

  it("modifier -0.3 on bmiSc 55: 55 + (-0.3)×55 = 38.5", () => {
    expect(applyBmiPenaltyModifier(55, -0.3)).toBeCloseTo(38.5, 4);
  });

  it("clamps to [0, 100]", () => {
    expect(applyBmiPenaltyModifier(100, 0.5)).toBe(100);
    expect(applyBmiPenaltyModifier(10, -2)).toBe(0);
  });
});
