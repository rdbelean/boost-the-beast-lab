// ReportJSON schema — Stage-B / Stage-D output.
//
// Backwards-compatible with the existing PdfReportContent shape consumed
// by lib/pdf/generateReport.ts. Adds an _meta block carrying the
// per-section evidence_refs that the deterministic validator checks
// against ctx.raw / ctx.scoring.

import { z } from "zod";

const Module = z.object({
  score_context: z.string().optional(),
  key_finding: z.string().optional(),
  systemic_connection: z.string().optional(),
  limitation: z.string().optional(),
  recommendation: z.string().optional(),
  main_finding: z.string().optional(),
  interpretation: z.string().optional(),
  systemic_impact: z.string().optional(),
  overtraining_signal: z.string().nullable().optional(),
  met_context: z.string().optional(),
  sitting_flag: z.string().nullable().optional(),
  bmi_context: z.string().optional(),
  hpa_context: z.string().nullable().optional(),
  estimation_note: z.string().optional(),
  fitness_context: z.string().optional(),
});

const Finding = z.object({
  type: z.enum(["weakness", "strength", "connection"]),
  headline: z.string().min(1),
  body: z.string().min(1),
  related_dimension: z.string().optional(),
});

const CrossInsight = z.object({
  dimension_a: z.string().min(1),
  dimension_b: z.string().min(1),
  headline: z.string().min(1),
  body: z.string().min(1),
});

const Goal = z.object({
  headline: z.string().min(1),
  current_value: z.string().min(1),
  target_value: z.string().min(1),
  delta_pct: z.string().optional(),
  metric_source: z.string().min(1),
  week_milestones: z.array(
    z.object({
      week: z.string().min(1),
      task: z.string().min(1),
      milestone: z.string().min(1),
    }),
  ),
});

const DailyHabit = z.object({
  habit: z.string().min(1),
  why_specific_to_user: z.string().min(1),
  time_cost_min: z.number().min(0).max(120).optional(),
});

export const ReportSchema = z.object({
  headline: z.string().min(1),
  executive_summary: z.string().min(1),
  critical_flag: z.string().nullable().optional(),
  modules: z.object({
    sleep: Module,
    recovery: Module,
    activity: Module,
    metabolic: Module,
    stress: Module,
    vo2max: Module,
  }),
  top_priority: z.string().min(1),
  systemic_connections_overview: z.string().optional(),
  systemic_connections: z.string().optional(),
  prognose_30_days: z.string().min(1),
  disclaimer: z.string().min(1),
  executive_findings: z.array(Finding).optional(),
  cross_insights: z.array(CrossInsight).optional(),
  action_plan: z.array(Goal).optional(),
  daily_life_protocol: z
    .object({
      morning: z.array(DailyHabit).optional(),
      work_day: z.array(DailyHabit).optional(),
      evening: z.array(DailyHabit).optional(),
      nutrition_micro: z.array(DailyHabit).optional(),
      total_time_min_per_day: z.number().min(0).max(240).optional(),
    })
    .optional(),
  _meta: z.object({
    stage: z.enum(["writer", "repair"]),
    generation_id: z.string().min(1),
    section_evidence_refs: z.record(z.string(), z.array(z.string())),
  }),
});

export type ReportJSON = z.infer<typeof ReportSchema>;
export type ReportModule = z.infer<typeof Module>;
export type ReportDailyHabit = z.infer<typeof DailyHabit>;
