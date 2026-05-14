import type { ReportContext } from "@/lib/reports/report-context";
import type { Locale, MasterPlanInputs } from "./prompts";

export function buildMasterPlanInputs(ctx: ReportContext, locale: Locale): MasterPlanInputs {
  const result = ctx.scoring.result;
  return {
    locale,
    user: { age: ctx.user.age, gender: ctx.user.gender },
    scores: {
      activity: result.activity.activity_score_0_100,
      sleep: result.sleep.sleep_score_0_100,
      metabolic: result.metabolic.metabolic_score_0_100,
      stress: result.stress.stress_score_0_100,
      vo2max: result.vo2max.fitness_score_0_100,
      overall: result.overall_score_0_100,
    },
    goal_dropdown: ctx.personalization.main_goal,
    goal_freetext: ctx.raw.main_goal_freetext,
    training_dropdown: ctx.raw.training_intensity_self_reported,
    training_freetext: ctx.raw.training_type_freetext,
    time_budget: ctx.personalization.time_budget,
    experience_level: ctx.personalization.experience_level,
    training_days_self_reported: ctx.raw.training_days_self_reported,
    stress_source: ctx.personalization.stress_source,
    recovery_ritual: ctx.personalization.recovery_ritual,
    nutrition_painpoint: ctx.personalization.nutrition_painpoint,
    wearable_sources: ctx.wearable.sources.map((s) => s.kind),
    whoop_available: ctx.wearable.sources.some((s) => s.kind === "whoop"),
  };
}
