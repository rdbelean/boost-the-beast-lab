// Helper: build a fully-valid AnalysisJSON anchored on a real
// ReportContext. Used to test the pipeline without an actual Anthropic
// call — the mock client returns this serialised JSON, the pipeline
// validates it via zod + path resolution, and we assert the result.

import type { ReportContext } from "@/lib/reports/report-context";
import type {
  AnalysisJSON,
  HabitAnchor,
} from "@/lib/reports/schemas/report-analysis";

type DimKey = "sleep" | "recovery" | "activity" | "metabolic" | "stress" | "vo2max";

export function buildValidAnalysisFor(ctx: ReportContext): AnalysisJSON {
  const r = ctx.scoring.result;
  const flagsActiveFor = (dim: DimKey): string[] => {
    const f = ctx.flags;
    const out: string[] = [];
    if (dim === "recovery" && f.overtraining_risk) out.push("overtraining_risk");
    if (dim === "stress" && f.chronic_stress_risk) out.push("chronic_stress_risk");
    if (dim === "stress" && f.hpa_axis_risk) out.push("hpa_axis_risk");
    if (dim === "activity" && f.sitting_critical) out.push("sitting_critical");
    if (dim === "activity" && f.sitting_elevated) out.push("sitting_elevated");
    if (dim === "sleep" && f.sleep_consistency_flag) out.push("sleep_consistency_flag");
    if (dim === "metabolic" && f.bmi_disclaimer_needed) out.push("bmi_disclaimer_needed");
    return out;
  };

  const moduleFor = (dim: DimKey, score: number, band: string): AnalysisJSON["modules"][DimKey] => ({
    score,
    band,
    key_drivers: [
      ...(dim === "sleep"
        ? [{ field: "sleep_duration_hours", value: ctx.raw.sleep_duration_hours, contribution_hint: "low" as const }]
        : []),
      ...(dim === "activity"
        ? [{ field: "daily_steps", value: ctx.raw.daily_steps ?? 0, contribution_hint: "borderline" as const }]
        : []),
      ...(dim === "metabolic"
        ? [{ field: "bmi", value: r.metabolic.bmi, contribution_hint: "borderline" as const }]
        : []),
      ...(dim === "stress"
        ? [{ field: "stress_level_1_10", value: ctx.raw.stress_level_1_10, contribution_hint: "low" as const }]
        : []),
      ...(dim === "recovery"
        ? [{ field: "morning_recovery_1_10", value: ctx.raw.morning_recovery_1_10, contribution_hint: "low" as const }]
        : []),
      ...(dim === "vo2max"
        ? [{ field: "vo2max_estimated", value: r.vo2max.vo2max_estimated, contribution_hint: "borderline" as const }]
        : []),
    ],
    systemic_links: [],
    limitation_root_cause: {
      cause: `${dim} score driven by primary driver`,
      evidence_field:
        dim === "sleep"
          ? "raw.sleep_duration_hours"
          : dim === "activity"
            ? "raw.daily_steps"
            : dim === "metabolic"
              ? "scoring.result.metabolic.bmi"
              : dim === "stress"
                ? "raw.stress_level_1_10"
                : dim === "recovery"
                  ? "raw.morning_recovery_1_10"
                  : "scoring.result.vo2max.vo2max_estimated",
    },
    recommendation_anchors: [
      {
        action_kind: "habit",
        target_metric:
          dim === "sleep"
            ? "sleep_duration_hours"
            : dim === "activity"
              ? "daily_steps"
              : dim === "metabolic"
                ? "fruit_veg"
                : dim === "stress"
                  ? "stress_level_1_10"
                  : dim === "recovery"
                    ? "morning_recovery_1_10"
                    : "vo2max",
        current_value:
          dim === "sleep"
            ? ctx.raw.sleep_duration_hours
            : dim === "activity"
              ? ctx.raw.daily_steps ?? 0
              : dim === "metabolic"
                ? r.metabolic.bmi
                : dim === "stress"
                  ? ctx.raw.stress_level_1_10
                  : dim === "recovery"
                    ? ctx.raw.morning_recovery_1_10
                    : r.vo2max.vo2max_estimated,
        target_value: "improve",
        evidence_field:
          dim === "sleep"
            ? "raw.sleep_duration_hours"
            : dim === "activity"
              ? "raw.daily_steps"
              : dim === "metabolic"
                ? "raw.fruit_veg"
                : dim === "stress"
                  ? "raw.stress_level_1_10"
                  : dim === "recovery"
                    ? "raw.morning_recovery_1_10"
                    : "scoring.result.vo2max.vo2max_estimated",
        time_budget_min: 5,
      },
    ],
    flags_active: flagsActiveFor(dim),
  });

  const lowestDim: DimKey = ([
    ["sleep", r.sleep.sleep_score_0_100],
    ["recovery", r.recovery.recovery_score_0_100],
    ["activity", r.activity.activity_score_0_100],
    ["metabolic", r.metabolic.metabolic_score_0_100],
    ["stress", r.stress.stress_score_0_100],
    ["vo2max", r.vo2max.fitness_score_0_100],
  ] as Array<[DimKey, number]>).reduce((best, cur) => (cur[1] < best[1] ? cur : best))[0];

  const habit: HabitAnchor = {
    habit_kind: "hydration",
    evidence_field: "raw.water_litres",
    time_cost_min: 2,
  };

  return {
    meta: {
      report_type: ctx.meta.report_type,
      primary_modules:
        ctx.meta.report_type === "metabolic"
          ? ["metabolic", lowestDim === "metabolic" ? "sleep" : lowestDim]
          : ctx.meta.report_type === "recovery"
            ? ["recovery", lowestDim === "recovery" ? "sleep" : lowestDim]
            : [lowestDim],
      deprioritized_modules: [],
    },
    data_quality: {
      completeness_pct: ctx.data_quality.completeness_pct,
      missing_critical_fields: ctx.data_quality.missing_fields,
      contradictions: ctx.data_quality.contradictions.map((c) => ({
        field: c.field,
        values: c.values,
        severity: "minor" as const,
        note: c.note,
      })),
      wearable_available: ctx.wearable.available,
      wearable_days_covered: ctx.wearable.available ? ctx.wearable.days_covered : null,
    },
    headline_evidence: {
      summary_one_liner_anchor: `overall_score=${r.overall_score_0_100} driven by ${lowestDim}_score=${(
        lowestDim === "sleep"
          ? r.sleep.sleep_score_0_100
          : lowestDim === "recovery"
            ? r.recovery.recovery_score_0_100
            : lowestDim === "activity"
              ? r.activity.activity_score_0_100
              : lowestDim === "metabolic"
                ? r.metabolic.metabolic_score_0_100
                : lowestDim === "stress"
                  ? r.stress.stress_score_0_100
                  : r.vo2max.fitness_score_0_100
      )}`,
      raw_numbers_to_cite: {
        sleep_duration_hours: ctx.raw.sleep_duration_hours,
        stress_level_1_10: ctx.raw.stress_level_1_10,
        sitting_hours_per_day: ctx.raw.sitting_hours_per_day,
      },
    },
    executive_evidence: {
      defining_factors: [
        {
          factor: `low ${lowestDim}`,
          evidence_field:
            lowestDim === "sleep"
              ? "scoring.result.sleep.sleep_score_0_100"
              : lowestDim === "recovery"
                ? "scoring.result.recovery.recovery_score_0_100"
                : lowestDim === "activity"
                  ? "scoring.result.activity.activity_score_0_100"
                  : lowestDim === "metabolic"
                    ? "scoring.result.metabolic.metabolic_score_0_100"
                    : lowestDim === "stress"
                      ? "scoring.result.stress.stress_score_0_100"
                      : "scoring.result.vo2max.fitness_score_0_100",
          evidence_value:
            lowestDim === "sleep"
              ? r.sleep.sleep_score_0_100
              : lowestDim === "recovery"
                ? r.recovery.recovery_score_0_100
                : lowestDim === "activity"
                  ? r.activity.activity_score_0_100
                  : lowestDim === "metabolic"
                    ? r.metabolic.metabolic_score_0_100
                    : lowestDim === "stress"
                      ? r.stress.stress_score_0_100
                      : r.vo2max.fitness_score_0_100,
          magnitude: "high",
          direction: "negative",
        },
        {
          factor: "sitting load",
          evidence_field: "raw.sitting_hours_per_day",
          evidence_value: ctx.raw.sitting_hours_per_day,
          magnitude: ctx.raw.sitting_hours_per_day >= 8 ? "high" : "med",
          direction: ctx.raw.sitting_hours_per_day >= 8 ? "negative" : "neutral",
        },
      ],
      coherent_story_anchor: `${lowestDim}_score caps overall_score`,
    },
    modules: {
      sleep: moduleFor("sleep", r.sleep.sleep_score_0_100, r.sleep.sleep_band),
      recovery: moduleFor("recovery", r.recovery.recovery_score_0_100, r.recovery.recovery_band),
      activity: moduleFor("activity", r.activity.activity_score_0_100, r.activity.activity_band),
      metabolic: moduleFor("metabolic", r.metabolic.metabolic_score_0_100, r.metabolic.metabolic_band),
      stress: moduleFor("stress", r.stress.stress_score_0_100, r.stress.stress_band),
      vo2max: moduleFor("vo2max", r.vo2max.fitness_score_0_100, r.vo2max.fitness_level_band),
    },
    top_priority_evidence: {
      module: lowestDim,
      rationale_anchor: `${lowestDim} is lowest score`,
      expected_multiplier_effect_on: ["recovery"],
      time_to_effect_days: 30,
    },
    systemic_overview_anchors: [
      {
        a: "sleep",
        b: "recovery",
        mechanism: "sleep multiplier gates recovery",
        evidence_fields: ["scoring.result.recovery.sleep_multiplier"],
      },
    ],
    forecast_anchors: {
      realistic_score_deltas: [
        { module: lowestDim, from: 50, to: 58, driver: "primary lever" },
      ],
      time_frame_days: 30,
    },
    daily_protocol_anchors: {
      morning_focus: [habit],
      work_day_focus: [],
      evening_focus: [],
      nutrition_micro_focus: [],
      total_time_budget_min: 2,
    },
  };
}
