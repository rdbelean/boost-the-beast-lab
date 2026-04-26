// Fixture D: Metabolic-priority — overweight BMI, low fruit/veg, low protein.
// Expected: BMI ~28 (overweight), metabolic score weakest.

import { buildTestContext } from "../build-context";

export const metabolicContext = buildTestContext({
  reportType: "metabolic",
  locale: "de",
  user: { email: "metabolic@test.local", age: 38, gender: "female", height_cm: 165, weight_kg: 76 },
  scoringInputs: {
    age: 38,
    gender: "female",
    height_cm: 165,
    weight_kg: 76,
    activity: {
      walking_days: 4,
      walking_minutes_per_day: 20,
      moderate_days: 1,
      moderate_minutes_per_day: 30,
      vigorous_days: 0,
      vigorous_minutes_per_day: 0,
    },
    sleep: {
      duration_hours: 7.2,
      quality: "gut",
      wakeups: "selten",
      recovery_1_10: 6,
    },
    metabolic: {
      meals_per_day: 3,
      water_litres: 2.0,
      sitting_hours: 7,
      fruit_veg: "low",
    },
    stress: { stress_level_1_10: 5 },
  },
  sleep_duration_hours: 7.2,
  sleep_quality_label: "gut",
  wakeup_frequency_label: "selten",
  morning_recovery_1_10: 6,
  stress_level_1_10: 5,
  meals_per_day: 3,
  water_litres: 2.0,
  fruit_veg_label: "low",
  sitting_hours_per_day: 7,
  standing_hours_per_day: 3,
  training_days: 1,
  daily_steps: 5400,
  screen_time_before_sleep: "unter_30",
  main_goal: "body_comp",
  time_budget: "minimal",
  experience_level: "restart",
  nutrition_painpoint: "low_protein",
  stress_source: "none",
  recovery_ritual: "cooking",
});
