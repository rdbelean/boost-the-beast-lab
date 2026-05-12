// Body composition self-assessment types.
//
// Combines BMI (from height/weight) with a user-selected visual body type
// (6 options per gender) to produce a body_composition_flag that qualifies
// BMI interpretation. The flag drives both the metabolic-score modifier and
// the tone of the AI report (athletic BMI 27 ≠ overweight BMI 27).

export type BodyType =
  | "male_1"
  | "male_2"
  | "male_3"
  | "male_4"
  | "male_5"
  | "male_6"
  | "female_1"
  | "female_2"
  | "female_3"
  | "female_4"
  | "female_5"
  | "female_6";

export type BodyCompositionFlag =
  | "optimal_lean"
  | "optimal_athletic"
  | "muscle_explains_bmi"
  | "strong_muscle_explains_high_bmi"
  | "bmi_reflects_overweight"
  | "bmi_reflects_obesity"
  | "lean_with_low_muscle"
  | "possible_underweight"
  | "discrepancy_lean_high_self_assessment"
  | "discrepancy_overweight_athletic_assessment";

export const BODY_TYPES_MALE: BodyType[] = [
  "male_1",
  "male_2",
  "male_3",
  "male_4",
  "male_5",
  "male_6",
];

export const BODY_TYPES_FEMALE: BodyType[] = [
  "female_1",
  "female_2",
  "female_3",
  "female_4",
  "female_5",
  "female_6",
];

export const ALL_BODY_TYPES: BodyType[] = [
  ...BODY_TYPES_MALE,
  ...BODY_TYPES_FEMALE,
];

export function isBodyType(value: unknown): value is BodyType {
  return (
    typeof value === "string" &&
    (ALL_BODY_TYPES as string[]).includes(value)
  );
}

export function bodyTypeNumber(bt: BodyType): 1 | 2 | 3 | 4 | 5 | 6 {
  return Number(bt.split("_")[1]) as 1 | 2 | 3 | 4 | 5 | 6;
}

export function bodyTypeGender(bt: BodyType): "male" | "female" {
  return bt.startsWith("male_") ? "male" : "female";
}
