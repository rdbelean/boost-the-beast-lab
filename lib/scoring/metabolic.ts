// Metabolic scoring — composite of BMI (WHO), sitting time, water intake,
// meal pattern and fruit/vegetable consumption.
//
// Weights (briefing):
//   BMI 30% · Sitting 20% · Water 18% · Meals 17% · Fruit & Veg 15%
//
// BMI score (WHO classes):
//   <18.5 → 55 · 18.5–24.9 → 100 · 25–29.9 → 72
//   30–34.9 → 45 · 35–39.9 → 25 · ≥40 → 10
//
// Meals (JAMA 2024 meal-timing meta-analysis — regularity > frequency):
//   1–2 → 35 · 3 → 90 · 4–5 → 80 · 6+ → 55
//
// Water:    <1L → 20 · 1–2L → 60 · 2–3L → 90 · >3L → 100
// Sitting:  <4h → 100 · 4–6h → 78 · 6–8h → 48 · >8h → 20
// Fruit/Veg: none → 0 · low → 40 · moderate → 75 · optimal → 100
//
// Bands: low <40 · moderate 40–64 · good 65–84 · excellent ≥85
//
// BMI is a population-level estimator, not an individual diagnostic —
// bmi_disclaimer_needed surfaces when muscular composition may distort it.
//
// References:
// - WHO BMI Classification
// - JAMA Network Open Meal Timing Meta-Analysis (2024, 29 RCTs)
// - PMC Eating Frequency Meta-Analysis (2023)
// - BMC Medicine Hydration & Cognition (2023)
// - Frontiers Sedentary & CVD (2022)
// - AHA Science Advisory — sitting independent of MVPA
// - NHANES/USDA fruit & vegetable intake benchmark

export type BMICategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese_i"
  | "obese_ii"
  | "obese_iii";

export type MetabolicBand = "low" | "moderate" | "good" | "excellent";

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
  bmi_disclaimer_needed: boolean;
  sitting_hours: number;
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
  if (meals <= 2) return 35;
  if (meals === 3) return 90;
  if (meals <= 5) return 80;
  return 55;
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
  if (score < 40) return "low";
  if (score < 65) return "moderate";
  if (score < 85) return "good";
  return "excellent";
}

export function calculateMetabolicScore(
  inputs: MetabolicInputs,
): MetabolicResult {
  const heightM = inputs.height_cm / 100;
  const bmi = Math.round((inputs.weight_kg / (heightM * heightM)) * 10) / 10;
  const { score: bmiSc, category } = bmiScore(bmi);

  // Briefing weights: BMI 30 · Sitting 20 · Water 18 · Meals 17 · FruitVeg 15
  const metabolic_score_0_100 = Math.round(
    bmiSc * 0.3 +
      sittingScore(inputs.sitting_hours) * 0.2 +
      waterScore(inputs.water_litres) * 0.18 +
      mealsScore(inputs.meals_per_day) * 0.17 +
      fruitVegScore(inputs.fruit_veg) * 0.15,
  );

  // Flag BMI disclaimer whenever category is not "normal" — muscular outliers
  // get misclassified in either direction, and the disclaimer is always safe.
  const bmi_disclaimer_needed = category !== "normal";

  return {
    bmi,
    bmi_category: category,
    metabolic_score_0_100,
    metabolic_band: bandFor(metabolic_score_0_100),
    bmi_disclaimer_needed,
    sitting_hours: inputs.sitting_hours,
  };
}
