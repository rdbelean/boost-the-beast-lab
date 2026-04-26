// Fixture A: Beginner — stressed, poor sleep, sedentary.
// Expected scoring: low sleep + stress, sitting_critical, hpa_axis_risk.

import { buildTestContext } from "../build-context";

export const beginnerContext = buildTestContext({
  reportType: "complete",
  locale: "de",
  user: { email: "beginner@test.local", age: 34, gender: "female", height_cm: 168, weight_kg: 78 },
  scoringInputs: {
    age: 34,
    gender: "female",
    height_cm: 168,
    weight_kg: 78,
    activity: {
      walking_days: 3,
      walking_minutes_per_day: 15,
      moderate_days: 0,
      moderate_minutes_per_day: 0,
      vigorous_days: 0,
      vigorous_minutes_per_day: 0,
    },
    sleep: {
      duration_hours: 5.8,
      quality: "schlecht",
      wakeups: "oft",
      recovery_1_10: 3,
    },
    metabolic: {
      meals_per_day: 2,
      water_litres: 1.0,
      sitting_hours: 9,
      fruit_veg: "low",
    },
    stress: { stress_level_1_10: 8 },
  },
  sleep_duration_hours: 5.8,
  sleep_quality_label: "schlecht",
  wakeup_frequency_label: "oft",
  morning_recovery_1_10: 3,
  stress_level_1_10: 8,
  meals_per_day: 2,
  water_litres: 1.0,
  fruit_veg_label: "low",
  sitting_hours_per_day: 9,
  standing_hours_per_day: 2,
  training_days: 0,
  daily_steps: 4200,
  screen_time_before_sleep: "ueber_60",
  main_goal: "stress_sleep",
  time_budget: "minimal",
  experience_level: "beginner",
  nutrition_painpoint: "no_energy",
  stress_source: "job",
  recovery_ritual: "none",
});
