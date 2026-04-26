// Fixture C: High-performer / founder — high steps, high sitting, job stress.
// Expected: sitting_critical despite step volume, chronic_stress_risk borderline.

import { buildTestContext } from "../build-context";

export const founderContext = buildTestContext({
  reportType: "complete",
  locale: "de",
  user: { email: "founder@test.local", age: 41, gender: "male", height_cm: 178, weight_kg: 81 },
  scoringInputs: {
    age: 41,
    gender: "male",
    height_cm: 178,
    weight_kg: 81,
    activity: {
      walking_days: 6,
      walking_minutes_per_day: 25,
      moderate_days: 2,
      moderate_minutes_per_day: 30,
      vigorous_days: 1,
      vigorous_minutes_per_day: 30,
    },
    sleep: {
      duration_hours: 6.5,
      quality: "mittel",
      wakeups: "selten",
      recovery_1_10: 6,
    },
    metabolic: {
      meals_per_day: 4,
      water_litres: 1.8,
      sitting_hours: 10,
      fruit_veg: "moderate",
    },
    stress: { stress_level_1_10: 7 },
  },
  sleep_duration_hours: 6.5,
  sleep_quality_label: "mittel",
  wakeup_frequency_label: "selten",
  morning_recovery_1_10: 6,
  stress_level_1_10: 7,
  meals_per_day: 4,
  water_litres: 1.8,
  fruit_veg_label: "moderate",
  sitting_hours_per_day: 10,
  standing_hours_per_day: 2,
  training_days: 3,
  daily_steps: 11000,
  screen_time_before_sleep: "30_60",
  main_goal: "feel_better",
  time_budget: "moderate",
  experience_level: "intermediate",
  nutrition_painpoint: "no_time",
  stress_source: "job",
  recovery_ritual: "nature",
});
