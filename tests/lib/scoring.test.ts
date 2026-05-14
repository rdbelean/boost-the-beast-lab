import { describe, expect, it } from "vitest";
import {
  calculateSleepScore,
  calculateActivityScore,
  calculateMetabolicScore,
  calculateStressScore,
  calculateRecoveryScore,
  estimateVO2max,
  runFullScoring,
  type FullAssessmentInputs,
} from "@/lib/scoring";

// ─── Sleep ──────────────────────────────────────────────────────────────

describe("calculateSleepScore", () => {
  it("scores excellent for 8h / sehr_gut / nie", () => {
    const r = calculateSleepScore({
      age: 30,
      duration_hours: 8,
      quality: "sehr_gut",
      wakeups: "nie",
      recovery_1_10: 9,
    });
    expect(r.sleep_score_0_100).toBeGreaterThanOrEqual(85);
    expect(r.sleep_band).toBe("excellent");
  });

  it("scores poor for 5h / schlecht / oft", () => {
    const r = calculateSleepScore({
      age: 30,
      duration_hours: 5,
      quality: "schlecht",
      wakeups: "oft",
      recovery_1_10: 3,
    });
    expect(r.sleep_score_0_100).toBeLessThan(40);
    expect(r.sleep_band).toBe("poor");
  });

  it("flags inconsistent schedule when consistency_1_10 < 6", () => {
    const r = calculateSleepScore({
      age: 30,
      duration_hours: 7,
      quality: "gut",
      wakeups: "selten",
      recovery_1_10: 6,
      consistency_1_10: 4,
    });
    expect(r.sleep_consistency_flag).toBe(true);
  });

  it("65+ duration cutoffs differ from 18–64", () => {
    const young = calculateSleepScore({
      age: 30, duration_hours: 6.5, quality: "gut", wakeups: "selten", recovery_1_10: 6,
    });
    const old = calculateSleepScore({
      age: 70, duration_hours: 6.5, quality: "gut", wakeups: "selten", recovery_1_10: 6,
    });
    // Older bracket scores 6-6.9h = 65 (vs 55 for younger) → higher composite.
    expect(old.sleep_duration_score).toBeGreaterThan(young.sleep_duration_score);
  });
});

// ─── Activity ───────────────────────────────────────────────────────────

describe("calculateActivityScore", () => {
  it("LOW for almost-sedentary", () => {
    const r = calculateActivityScore({
      walking_days: 2, walking_minutes_per_day: 10,
      moderate_days: 0, moderate_minutes_per_day: 0,
      vigorous_days: 0, vigorous_minutes_per_day: 0,
    });
    expect(r.activity_category).toBe("LOW");
    expect(r.activity_score_0_100).toBeLessThan(40);
  });

  it("HIGH for athlete-volume", () => {
    const r = calculateActivityScore({
      walking_days: 7, walking_minutes_per_day: 30,
      moderate_days: 3, moderate_minutes_per_day: 60,
      vigorous_days: 4, vigorous_minutes_per_day: 60,
    });
    expect(r.activity_category).toBe("HIGH");
    expect(r.activity_score_0_100).toBeGreaterThanOrEqual(75);
  });

  it("flags sitting_risk_flag=critical at 9 h/day", () => {
    const r = calculateActivityScore({
      walking_days: 5, walking_minutes_per_day: 30,
      moderate_days: 0, moderate_minutes_per_day: 0,
      vigorous_days: 0, vigorous_minutes_per_day: 0,
      sitting_hours_per_day: 9,
    });
    expect(r.sitting_risk_flag).toBe("critical");
  });

  it("flags sitting_risk_flag=normal at 4 h/day", () => {
    const r = calculateActivityScore({
      walking_days: 5, walking_minutes_per_day: 30,
      moderate_days: 0, moderate_minutes_per_day: 0,
      vigorous_days: 0, vigorous_minutes_per_day: 0,
      sitting_hours_per_day: 4,
    });
    expect(r.sitting_risk_flag).toBe("normal");
  });
});

// ─── Metabolic ──────────────────────────────────────────────────────────

describe("calculateMetabolicScore", () => {
  it("BMI 24 → category normal", () => {
    const r = calculateMetabolicScore({
      height_cm: 175, weight_kg: 73.5,
      meals_per_day: 3, water_litres: 2, sitting_hours: 6, fruit_veg: "good",
    });
    expect(r.bmi_category).toBe("normal");
    expect(r.bmi).toBeGreaterThanOrEqual(23);
    expect(r.bmi).toBeLessThan(25);
  });

  it("BMI 28 → category overweight", () => {
    const r = calculateMetabolicScore({
      height_cm: 165, weight_kg: 76,
      meals_per_day: 3, water_litres: 2, sitting_hours: 7, fruit_veg: "low",
    });
    expect(r.bmi_category).toBe("overweight");
  });

  it("low fruit_veg drops the score below 'good' fruit_veg", () => {
    const lo = calculateMetabolicScore({
      height_cm: 175, weight_kg: 73.5,
      meals_per_day: 3, water_litres: 2, sitting_hours: 6, fruit_veg: "low",
    });
    const hi = calculateMetabolicScore({
      height_cm: 175, weight_kg: 73.5,
      meals_per_day: 3, water_litres: 2, sitting_hours: 6, fruit_veg: "good",
    });
    expect(hi.metabolic_score_0_100).toBeGreaterThan(lo.metabolic_score_0_100);
  });

  it("body_type undefined → no modifier, no flag", () => {
    const r = calculateMetabolicScore({
      height_cm: 180, weight_kg: 90,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
    });
    expect(r.bmi_category).toBe("overweight");
    expect(r.body_composition_flag).toBeNull();
    expect(r.bmi_penalty_modifier_applied).toBe(0);
  });

  it("Athlete BMI 27.8 + male_4 → muscle_explains_bmi, v2 modifier 0.7, score uplifted", () => {
    const athlete = calculateMetabolicScore({
      height_cm: 180, weight_kg: 90,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
      body_type: "male_4",
    });
    const baseline = calculateMetabolicScore({
      height_cm: 180, weight_kg: 90,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
    });
    expect(athlete.body_composition_flag).toBe("muscle_explains_bmi");
    expect(athlete.bmi_penalty_modifier_applied).toBe(0.7);
    expect(athlete.metabolic_score_0_100).toBeGreaterThan(
      baseline.metabolic_score_0_100,
    );
  });

  it("Overweight BMI 27.8 + male_5 → bmi_reflects_overweight, no uplift", () => {
    const heavy = calculateMetabolicScore({
      height_cm: 180, weight_kg: 90,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
      body_type: "male_5",
    });
    const baseline = calculateMetabolicScore({
      height_cm: 180, weight_kg: 90,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
    });
    expect(heavy.body_composition_flag).toBe("bmi_reflects_overweight");
    expect(heavy.bmi_penalty_modifier_applied).toBe(0);
    expect(heavy.metabolic_score_0_100).toBe(baseline.metabolic_score_0_100);
  });

  it("Strong muscle BMI 31 + male_4 → strong_muscle_explains_high_bmi, v2 modifier 0.9", () => {
    const r = calculateMetabolicScore({
      height_cm: 175, weight_kg: 95,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
      body_type: "male_4",
    });
    expect(r.body_composition_flag).toBe("strong_muscle_explains_high_bmi");
    expect(r.bmi_penalty_modifier_applied).toBe(0.9);
  });

  it("Type 3 + overweight BMI no longer muscle_explains_bmi (v2 narrowed)", () => {
    const r = calculateMetabolicScore({
      height_cm: 180, weight_kg: 90,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
      body_type: "male_3",
    });
    expect(r.body_composition_flag).toBe("bmi_reflects_overweight");
    expect(r.bmi_penalty_modifier_applied).toBe(0);
  });

  it("Athletic optimal_athletic earns +5 bonus on metabolic score", () => {
    const athletic = calculateMetabolicScore({
      height_cm: 180, weight_kg: 72,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
      body_type: "male_3",
    });
    const baseline = calculateMetabolicScore({
      height_cm: 180, weight_kg: 72,
      meals_per_day: 3, water_litres: 2.5, sitting_hours: 6, fruit_veg: "good",
    });
    expect(athletic.body_composition_flag).toBe("optimal_athletic");
    expect(athletic.metabolic_score_bonus_applied).toBe(5);
    expect(athletic.metabolic_score_0_100).toBe(
      Math.min(100, baseline.metabolic_score_0_100 + 5),
    );
  });

  it("Possible underweight: BMI 18.4 + female_1 → modifier intensifies penalty", () => {
    const lean = calculateMetabolicScore({
      height_cm: 165, weight_kg: 50,
      meals_per_day: 3, water_litres: 2, sitting_hours: 6, fruit_veg: "good",
      body_type: "female_1",
    });
    const baseline = calculateMetabolicScore({
      height_cm: 165, weight_kg: 50,
      meals_per_day: 3, water_litres: 2, sitting_hours: 6, fruit_veg: "good",
    });
    expect(lean.body_composition_flag).toBe("possible_underweight");
    expect(lean.bmi_penalty_modifier_applied).toBe(-0.3);
    expect(lean.metabolic_score_0_100).toBeLessThan(
      baseline.metabolic_score_0_100,
    );
  });
});

// ─── Stress ─────────────────────────────────────────────────────────────

describe("calculateStressScore", () => {
  it("high stress + low sleep yields low stress score", () => {
    const r = calculateStressScore({
      stress_level_1_10: 8,
      sleep_score_0_100: 30,
      subjective_recovery_0_100: 30,
    });
    expect(r.stress_score_0_100).toBeLessThan(50);
  });

  it("low stress + great sleep yields high stress score", () => {
    const r = calculateStressScore({
      stress_level_1_10: 2,
      sleep_score_0_100: 90,
      subjective_recovery_0_100: 90,
    });
    expect(r.stress_score_0_100).toBeGreaterThan(70);
  });

  it("hpa_axis_risk activates only when both chronic stress and very low recovery hit", () => {
    const both = calculateStressScore({
      stress_level_1_10: 9,
      sleep_score_0_100: 25,
      subjective_recovery_0_100: 20,
    });
    const onlyStress = calculateStressScore({
      stress_level_1_10: 9,
      sleep_score_0_100: 75,
      subjective_recovery_0_100: 80,
    });
    expect(both.hpa_axis_risk).toBe(true);
    expect(onlyStress.hpa_axis_risk).toBe(false);
  });
});

// ─── Recovery ───────────────────────────────────────────────────────────

describe("calculateRecoveryScore", () => {
  it("high training + bad sleep + high stress → overtraining_risk", () => {
    const r = calculateRecoveryScore({
      training_days: 6,
      intensity_ratio: 0.4,
      subjective_recovery_1_10: 4,
      sleep_score_0_100: 38,
      stress_score_0_100: 35,
    }, undefined, 29);
    expect(r.overtraining_risk).toBe(true);
  });

  it("moderate training + good sleep + low stress → no overtraining_risk", () => {
    const r = calculateRecoveryScore({
      training_days: 3,
      intensity_ratio: 0.2,
      subjective_recovery_1_10: 7,
      sleep_score_0_100: 80,
      stress_score_0_100: 75,
    }, undefined, 35);
    expect(r.overtraining_risk).toBe(false);
  });
});

// ─── VO2max ─────────────────────────────────────────────────────────────

describe("estimateVO2max", () => {
  it("HIGH activity yields higher fitness band than LOW", () => {
    const high = estimateVO2max({
      age: 30, gender: "male", height_cm: 180, weight_kg: 78, activity_category: "HIGH",
    });
    const low = estimateVO2max({
      age: 30, gender: "male", height_cm: 180, weight_kg: 78, activity_category: "LOW",
    });
    expect(high.vo2max_estimated).toBeGreaterThan(low.vo2max_estimated);
  });
});

// ─── runFullScoring composite ───────────────────────────────────────────

describe("runFullScoring composite", () => {
  function baseInputs(): FullAssessmentInputs {
    return {
      age: 35, gender: "female", height_cm: 168, weight_kg: 70,
      activity: {
        walking_days: 5, walking_minutes_per_day: 25,
        moderate_days: 1, moderate_minutes_per_day: 30,
        vigorous_days: 1, vigorous_minutes_per_day: 30,
      },
      sleep: { duration_hours: 7, quality: "gut", wakeups: "selten", recovery_1_10: 7 },
      metabolic: { meals_per_day: 3, water_litres: 2, sitting_hours: 6, fruit_veg: "good" },
      stress: { stress_level_1_10: 4 },
    };
  }

  it("returns all dimensions populated and overall_score in [0,100]", () => {
    const r = runFullScoring(baseInputs());
    expect(r.overall_score_0_100).toBeGreaterThanOrEqual(0);
    expect(r.overall_score_0_100).toBeLessThanOrEqual(100);
    expect(r.sleep.sleep_band).toBeTruthy();
    expect(r.activity.activity_category).toBeTruthy();
    expect(r.metabolic.bmi_category).toBeTruthy();
    expect(r.recovery.recovery_band).toBeTruthy();
    expect(r.stress.stress_band).toBeTruthy();
    expect(r.vo2max.fitness_level_band).toBeTruthy();
  });

  it("top_priority_module is a valid dimension key", () => {
    const r = runFullScoring(baseInputs());
    expect(["sleep", "recovery", "activity", "metabolic", "stress", "vo2max"]).toContain(
      r.top_priority_module,
    );
  });

  it("composite weighting: a low sleep score drags overall_score down vs high sleep", () => {
    const goodSleep = runFullScoring(baseInputs());
    const badSleep = runFullScoring({
      ...baseInputs(),
      sleep: { duration_hours: 5, quality: "schlecht", wakeups: "oft", recovery_1_10: 3 },
    });
    expect(goodSleep.overall_score_0_100).toBeGreaterThan(badSleep.overall_score_0_100);
  });
});
