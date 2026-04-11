// Metabolic scoring — composite of BMI (WHO), meal frequency, hydration,
// sitting time and fruit/vegetable intake (DGA 2020-2025 guidance).

export type BMICategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese_i"
  | "obese_ii"
  | "obese_iii";

export type MetabolicBand = "low" | "moderate" | "high" | "very_high";

export type FruitVegLevel = "none" | "low" | "moderate" | "optimal";

export interface MetabolicInputs {
  height_cm: number;
  weight_kg: number;
  meals_per_day: number;
  water_litres: number;
  sitting_hours: number;
  fruit_veg: FruitVegLevel;
}

export interface MetabolicResult {
  bmi: number;
  bmi_category: BMICategory;
  metabolic_score_0_100: number;
  metabolic_band: MetabolicBand;
}

function bmiScore(bmi: number): { score: number; category: BMICategory } {
  if (bmi < 18.5) return { score: 55, category: "underweight" };
  if (bmi < 25) return { score: 100, category: "normal" };
  if (bmi < 30) return { score: 72, category: "overweight" };
  if (bmi < 35) return { score: 45, category: "obese_i" };
  if (bmi < 40) return { score: 25, category: "obese_ii" };
  return { score: 10, category: "obese_iii" };
}

function mealsScore(meals: number): number {
  if (!Number.isFinite(meals) || meals <= 0) return 0;
  if (meals <= 2) return 40;
  if (meals === 3) return 85;
  if (meals <= 5) return 100;
  return 70;
}

function waterScore(litres: number): number {
  if (!Number.isFinite(litres) || litres < 1) return 20;
  if (litres < 2) return 60;
  if (litres <= 3) return 90;
  return 100;
}

function sittingScore(hours: number): number {
  if (!Number.isFinite(hours) || hours < 4) return 100;
  if (hours < 6) return 78;
  if (hours < 8) return 48;
  return 20;
}

function fruitVegScore(level: FruitVegLevel): number {
  switch (level) {
    case "none":
      return 0;
    case "low":
      return 40;
    case "moderate":
      return 75;
    case "optimal":
      return 100;
    default:
      return 0;
  }
}

function bandFor(score: number): MetabolicBand {
  if (score >= 80) return "very_high";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

export function calculateMetabolicScore(inputs: MetabolicInputs): MetabolicResult {
  const heightM = inputs.height_cm / 100;
  const bmi = Math.round((inputs.weight_kg / (heightM * heightM)) * 10) / 10;
  const { score: bmiSc, category } = bmiScore(bmi);

  // Weights: BMI 35 · Meals 15 · Water 20 · Sitting 15 · Fruit/Veg 15
  const metabolic_score_0_100 = Math.round(
    bmiSc * 0.35 +
      mealsScore(inputs.meals_per_day) * 0.15 +
      waterScore(inputs.water_litres) * 0.2 +
      sittingScore(inputs.sitting_hours) * 0.15 +
      fruitVegScore(inputs.fruit_veg) * 0.15,
  );

  return {
    bmi,
    bmi_category: category,
    metabolic_score_0_100,
    metabolic_band: bandFor(metabolic_score_0_100),
  };
}
