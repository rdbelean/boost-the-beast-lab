// Plan-pipeline Stage-A schema — narrower scope than the main report
// AnalysisJSON. The plan is anchored on a single plan_type (activity,
// metabolic, recovery, stress) and produces only the anchors needed for
// the plan's compact mini-report.

import { z } from "zod";
import { DimKey, PlanType, ActionKind } from "./dimensions";

const EvidenceValue = z.union([z.number(), z.string(), z.boolean()]);

const PlanRecommendationAnchor = z.object({
  action_kind: ActionKind,
  target_metric: z.string().min(1),
  current_value: EvidenceValue,
  target_value: EvidenceValue,
  evidence_field: z.string().min(1),
  time_budget_min: z.number().min(0).max(120).nullable(),
  week_index: z.number().min(1).max(8),
});

const WeekMilestoneAnchor = z.object({
  week_index: z.number().min(1).max(8),
  milestone_kind: z.string().min(1),
  evidence_field: z.string().min(1),
  target_value: EvidenceValue,
});

export const PlanAnalysisSchema = z.object({
  meta: z.object({
    plan_type: PlanType,
    primary_module: DimKey,
    supporting_modules: z.array(DimKey),
  }),
  baseline_evidence: z.object({
    score: z.number().min(0).max(100),
    band: z.string().min(1),
    raw_numbers_to_cite: z.record(z.string(), z.union([z.number(), z.string()])),
    flags_active: z.array(z.string()),
  }),
  driver_anchors: z
    .array(
      z.object({
        field: z.string().min(1),
        value: EvidenceValue,
        contribution_hint: z.enum(["low", "high", "borderline", "neutral"]),
      }),
    )
    .min(1)
    .max(4),
  recommendation_anchors: z.array(PlanRecommendationAnchor).min(2).max(8),
  week_milestone_anchors: z.array(WeekMilestoneAnchor).min(2).max(8),
  forecast_anchor: z.object({
    expected_score_delta: z.number().min(-20).max(40),
    horizon_days: z.number().min(7).max(180),
    primary_driver_field: z.string().min(1),
  }),
});

export type PlanAnalysisJSON = z.infer<typeof PlanAnalysisSchema>;
export type PlanRecommendationAnchor = z.infer<typeof PlanRecommendationAnchor>;
export type WeekMilestoneAnchor = z.infer<typeof WeekMilestoneAnchor>;
