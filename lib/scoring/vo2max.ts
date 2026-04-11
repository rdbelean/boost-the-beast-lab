// VO2max estimation from Jackson/IPAQ non-exercise prediction model.
// Formula: VO2max = 56.363 + (1.921 × PA_cat) − (0.381 × age) − (0.754 × BMI) + (10.987 × sex)
// PA_cat: LOW=0, MODERATE=1, HIGH=2
// sex:    male=1, female=0  (diverse → 0.5)
//
// Age- and sex-specific fitness bands (Cooper Institute / ACSM adapted).
// Band → 0-100 score mapping:
//   Very Poor=10, Poor=30, Fair=50, Good=70, Excellent=88, Superior=100

import type { ActivityCategory } from "./activity";

export type Gender = "male" | "female" | "diverse";
export type FitnessBand =
  | "Very Poor"
  | "Poor"
  | "Fair"
  | "Good"
  | "Excellent"
  | "Superior";

export interface VO2MaxInputs {
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  activity_category: ActivityCategory;
}

export interface VO2MaxResult {
  bmi: number;
  vo2max_estimated: number;
  vo2max_band: FitnessBand;
  fitness_level_band: FitnessBand;
  fitness_score_0_100: number;
}

function activityCategoryNumeric(c: ActivityCategory): number {
  if (c === "HIGH") return 2;
  if (c === "MODERATE") return 1;
  return 0;
}

function genderNumeric(g: Gender): number {
  if (g === "male") return 1;
  if (g === "female") return 0;
  return 0.5; // diverse
}

type BandTable = {
  minAge: number;
  maxAge: number;
  // upper-exclusive thresholds for each ascending band
  // [veryPoorMax, poorMax, fairMax, goodMax, excellentMax]
  cuts: [number, number, number, number, number];
};

// Thresholds are exclusive upper bounds: vo2 < cuts[0] → Very Poor, etc.
// Superior = above cuts[4].
const MALE_BANDS: BandTable[] = [
  { minAge: 0, maxAge: 29, cuts: [25, 34, 43, 53, 62] },
  { minAge: 30, maxAge: 39, cuts: [23, 31, 39, 49, 59] },
  { minAge: 40, maxAge: 49, cuts: [20, 27, 36, 45, 57] },
  { minAge: 50, maxAge: 59, cuts: [18, 25, 34, 43, 56] },
  { minAge: 60, maxAge: 200, cuts: [16, 23, 31, 41, 56] },
];

const FEMALE_BANDS: BandTable[] = [
  { minAge: 0, maxAge: 29, cuts: [24, 31, 38, 49, 57] },
  { minAge: 30, maxAge: 39, cuts: [20, 28, 34, 45, 52] },
  { minAge: 40, maxAge: 49, cuts: [17, 24, 31, 42, 51] },
  { minAge: 50, maxAge: 59, cuts: [15, 21, 28, 38, 49] },
  { minAge: 60, maxAge: 200, cuts: [13, 18, 24, 35, 45] },
];

function pickTable(age: number, gender: Gender): BandTable {
  const table = gender === "female" ? FEMALE_BANDS : MALE_BANDS;
  return table.find((t) => age >= t.minAge && age <= t.maxAge) ?? table[table.length - 1];
}

function bandFor(vo2: number, age: number, gender: Gender): FitnessBand {
  // For diverse, average male/female cut-points.
  if (gender === "diverse") {
    const m = pickTable(age, "male").cuts;
    const f = pickTable(age, "female").cuts;
    const avg = m.map((v, i) => (v + f[i]) / 2) as BandTable["cuts"];
    return classify(vo2, avg);
  }
  const cuts = pickTable(age, gender).cuts;
  return classify(vo2, cuts);
}

function classify(vo2: number, cuts: BandTable["cuts"]): FitnessBand {
  if (vo2 < cuts[0]) return "Very Poor";
  if (vo2 < cuts[1]) return "Poor";
  if (vo2 < cuts[2]) return "Fair";
  if (vo2 < cuts[3]) return "Good";
  if (vo2 < cuts[4]) return "Excellent";
  return "Superior";
}

function bandToScore(band: FitnessBand): number {
  switch (band) {
    case "Very Poor":
      return 10;
    case "Poor":
      return 30;
    case "Fair":
      return 50;
    case "Good":
      return 70;
    case "Excellent":
      return 88;
    case "Superior":
      return 100;
  }
}

export function estimateVO2max(inputs: VO2MaxInputs): VO2MaxResult {
  const heightM = inputs.height_cm / 100;
  const bmi = Math.round((inputs.weight_kg / (heightM * heightM)) * 10) / 10;

  const vo2raw =
    56.363 +
    1.921 * activityCategoryNumeric(inputs.activity_category) -
    0.381 * inputs.age -
    0.754 * bmi +
    10.987 * genderNumeric(inputs.gender);

  const vo2max_estimated = Math.round(Math.max(10, Math.min(85, vo2raw)) * 10) / 10;
  const band = bandFor(vo2max_estimated, inputs.age, inputs.gender);

  return {
    bmi,
    vo2max_estimated,
    vo2max_band: band,
    fitness_level_band: band,
    fitness_score_0_100: bandToScore(band),
  };
}
