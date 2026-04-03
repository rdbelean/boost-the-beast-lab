export interface AssessmentData {
  // Personal
  gender: "male" | "female" | "diverse";
  age: number;
  height: number; // cm
  weight: number; // kg
  // Sleep
  sleepHours: number;
  sleepQuality: number; // 1–10
  nightWakeUps: "nie" | "1x" | "2-3x" | ">3x";
  // Activity
  dailySteps: number;
  trainingFrequency: number; // per week
  trainingType: "kraft" | "ausdauer" | "hybrid" | "kein";
  trainingDuration: number; // minutes
  // Nutrition
  waterIntake: number; // litres
  mealsPerDay: number;
  stressLevel: number; // 1–10
  sittingHours: number;
}

export interface ScoreResult {
  metabolic: number;
  recovery: number;
  activity: number;
  stress: number;
  overall: number;
  bmi: number;
  vo2maxEstimate: number;
  neatEstimate: number;
  label: "UNTERDURCHSCHNITTLICH" | "DURCHSCHNITTLICH" | "ÜBERDURCHSCHNITTLICH" | "ELITE";
}

export function calculateMetabolicScore(data: AssessmentData): number {
  let score = 50;

  const bmi = data.weight / Math.pow(data.height / 100, 2);
  if (bmi >= 18.5 && bmi <= 24.9) score += 20;
  else if (bmi >= 25 && bmi <= 29.9) score += 10;
  else score -= 10;

  if (data.waterIntake >= 2 && data.waterIntake <= 3.5) score += 15;
  else if (data.waterIntake >= 1.5) score += 8;
  else score -= 5;

  if (data.mealsPerDay >= 3 && data.mealsPerDay <= 5) score += 10;
  else score -= 5;

  if (data.sittingHours <= 6) score += 5;
  else if (data.sittingHours <= 10) score -= 5;
  else score -= 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateRecoveryScore(data: AssessmentData): number {
  let score = 50;

  if (data.sleepHours >= 7 && data.sleepHours <= 9) score += 25;
  else if (data.sleepHours >= 6) score += 10;
  else score -= 15;

  score += (data.sleepQuality - 5) * 5;

  const wakeUpMap: Record<string, number> = { nie: 10, "1x": 0, "2-3x": -10, ">3x": -20 };
  score += wakeUpMap[data.nightWakeUps] ?? 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateActivityScore(data: AssessmentData): number {
  let score = 30;

  if (data.dailySteps >= 10000) score += 25;
  else if (data.dailySteps >= 7500) score += 20;
  else if (data.dailySteps >= 5000) score += 10;

  if (data.trainingFrequency >= 3 && data.trainingFrequency <= 5) score += 20;
  else if (data.trainingFrequency >= 2) score += 10;
  else if (data.trainingFrequency >= 1) score += 5;

  if (data.trainingDuration >= 45 && data.trainingDuration <= 90) score += 15;
  else if (data.trainingDuration >= 30) score += 10;

  if (data.trainingType === "hybrid") score += 10;
  else if (data.trainingType === "kraft" || data.trainingType === "ausdauer") score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateStressScore(data: AssessmentData): number {
  let score = 100;

  score -= data.stressLevel * 6;

  if (data.sittingHours > 10) score -= 15;
  else if (data.sittingHours > 8) score -= 8;

  score += (data.sleepQuality - 5) * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getLabel(overall: number): ScoreResult["label"] {
  if (overall < 40) return "UNTERDURCHSCHNITTLICH";
  if (overall < 60) return "DURCHSCHNITTLICH";
  if (overall < 80) return "ÜBERDURCHSCHNITTLICH";
  return "ELITE";
}

/**
 * VO2max estimation using non-exercise model
 * Based on Jackson et al. (1990) non-exercise VO2max prediction
 * Adjusted for activity level and age
 */
function estimateVO2max(data: AssessmentData): number {
  const bmi = data.weight / Math.pow(data.height / 100, 2);
  // Activity code: 0 = sedentary, 1 = low, 3 = moderate, 5 = active, 7 = very active
  let activityCode = 0;
  if (data.trainingFrequency >= 5) activityCode = 7;
  else if (data.trainingFrequency >= 3) activityCode = 5;
  else if (data.trainingFrequency >= 1) activityCode = 3;
  else if (data.dailySteps >= 7500) activityCode = 1;

  // Simplified Jackson non-exercise model
  let vo2max = 56.363 + (1.921 * activityCode) - (0.381 * data.age) - (0.754 * bmi);
  if (data.gender === "female") vo2max *= 0.85; // Female adjustment

  // Training type bonus
  if (data.trainingType === "ausdauer" || data.trainingType === "hybrid") vo2max += 2;

  return Math.max(15, Math.min(75, Math.round(vo2max * 10) / 10));
}

/**
 * NEAT (Non-Exercise Activity Thermogenesis) estimation in kcal/day
 * Based on daily steps, sitting hours, and training type
 * Reference: Levine et al. (2005) — NEAT can vary by ~2000 kcal/day
 */
function estimateNEAT(data: AssessmentData): number {
  // Base NEAT from steps (approx 0.04 kcal per step for average person)
  const stepNEAT = data.dailySteps * 0.04;

  // Sitting penalty: more sitting = less fidgeting, standing, walking
  // Average person sits ~7h; each hour above reduces NEAT
  const sittingPenalty = Math.max(0, (data.sittingHours - 6) * 30);

  // Weight factor (heavier = more energy per movement)
  const weightFactor = data.weight / 75;

  // Base occupational/domestic NEAT (cooking, cleaning, commuting)
  const baseNEAT = 300;

  const neat = Math.round((baseNEAT + stepNEAT * weightFactor) - sittingPenalty);
  return Math.max(100, Math.min(1200, neat));
}

export function calculateAllScores(data: AssessmentData): ScoreResult {
  const metabolic = calculateMetabolicScore(data);
  const recovery = calculateRecoveryScore(data);
  const activity = calculateActivityScore(data);
  const stress = calculateStressScore(data);
  const overall = Math.round(metabolic * 0.25 + recovery * 0.25 + activity * 0.30 + stress * 0.20);
  const bmi = Math.round((data.weight / Math.pow(data.height / 100, 2)) * 10) / 10;
  const vo2maxEstimate = estimateVO2max(data);
  const neatEstimate = estimateNEAT(data);

  return { metabolic, recovery, activity, stress, overall, bmi, vo2maxEstimate, neatEstimate, label: getLabel(overall) };
}
