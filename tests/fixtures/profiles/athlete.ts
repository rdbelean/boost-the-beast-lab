// Fixture B: Advanced athlete — high training volume, under-recovered.
// Expected: overtraining_risk flag active, recovery score lower than activity.

import { buildTestContext } from "../build-context";

export const athleteContext = buildTestContext({
  reportType: "complete",
  locale: "de",
  user: { email: "athlete@test.local", age: 29, gender: "male", height_cm: 182, weight_kg: 84 },
  scoringInputs: {
    age: 29,
    gender: "male",
    height_cm: 182,
    weight_kg: 84,
    activity: {
      walking_days: 6,
      walking_minutes_per_day: 30,
      moderate_days: 2,
      moderate_minutes_per_day: 60,
      vigorous_days: 4,
      vigorous_minutes_per_day: 60,
    },
    sleep: {
      duration_hours: 6.2,
      quality: "mittel",
      wakeups: "selten",
      recovery_1_10: 4,
    },
    metabolic: {
      meals_per_day: 4,
      water_litres: 3.0,
      sitting_hours: 5,
      fruit_veg: "good",
    },
    stress: { stress_level_1_10: 5 },
  },
  sleep_duration_hours: 6.2,
  sleep_quality_label: "mittel",
  wakeup_frequency_label: "selten",
  morning_recovery_1_10: 4,
  stress_level_1_10: 5,
  meals_per_day: 4,
  water_litres: 3.0,
  fruit_veg_label: "good",
  sitting_hours_per_day: 5,
  standing_hours_per_day: 3,
  training_days: 6,
  daily_steps: 14000,
  screen_time_before_sleep: "30_60",
  main_goal: "performance",
  time_budget: "athlete",
  experience_level: "advanced",
  nutrition_painpoint: "no_time",
  stress_source: "future",
  recovery_ritual: "sport",
});
