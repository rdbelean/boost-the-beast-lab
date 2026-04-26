import { z } from "zod";
import { DimKey, ReportType, ActionKind } from "./dimensions";

const EvidenceValue = z.union([z.number(), z.string(), z.boolean()]);

const DefiningFactor = z.object({
  factor: z.string().min(1),
  evidence_field: z.string().min(1),
  evidence_value: EvidenceValue,
  magnitude: z.enum(["low", "med", "high"]),
  direction: z.enum(["positive", "negative", "neutral"]),
});

const KeyDriver = z.object({
  field: z.string().min(1),
  value: EvidenceValue,
  contribution_hint: z.enum(["low", "high", "borderline", "neutral"]),
});

const SystemicLink = z.object({
  to: DimKey,
  mechanism: z.string().min(1),
  evidence_fields: z.array(z.string().min(1)),
});

const RecommendationAnchor = z.object({
  action_kind: ActionKind,
  target_metric: z.string().min(1),
  current_value: EvidenceValue,
  target_value: EvidenceValue,
  evidence_field: z.string().min(1),
  time_budget_min: z.number().min(0).max(120).nullable(),
});

const ModuleAnalysis = z.object({
  score: z.number().min(0).max(100),
  band: z.string().min(1),
  key_drivers: z.array(KeyDriver).min(1).max(4),
  systemic_links: z.array(SystemicLink).max(4),
  limitation_root_cause: z.object({
    cause: z.string().min(1),
    evidence_field: z.string().min(1),
  }),
  recommendation_anchors: z.array(RecommendationAnchor).min(1).max(4),
  flags_active: z.array(z.string()),
});

const HabitAnchor = z.object({
  habit_kind: z.string().min(1),
  evidence_field: z.string().min(1),
  time_cost_min: z.number().min(0).max(15),
});

export const AnalysisSchema = z.object({
  meta: z.object({
    report_type: ReportType,
    primary_modules: z.array(DimKey).min(1).max(6),
    deprioritized_modules: z.array(DimKey),
  }),
  data_quality: z.object({
    completeness_pct: z.number().min(0).max(100),
    missing_critical_fields: z.array(z.string()),
    contradictions: z.array(
      z.object({
        field: z.string(),
        values: z.array(z.object({ source: z.string(), value: z.unknown() })),
        severity: z.enum(["minor", "moderate", "critical"]),
        note: z.string(),
      }),
    ),
    wearable_available: z.boolean(),
    wearable_days_covered: z.number().nullable(),
    note: z.string().nullable().optional(),
  }),
  headline_evidence: z.object({
    summary_one_liner_anchor: z.string().min(1),
    raw_numbers_to_cite: z.record(z.string(), z.union([z.number(), z.string()])),
  }),
  executive_evidence: z.object({
    defining_factors: z.array(DefiningFactor).min(2).max(4),
    coherent_story_anchor: z.string().min(1),
  }),
  modules: z.object({
    sleep: ModuleAnalysis,
    recovery: ModuleAnalysis,
    activity: ModuleAnalysis,
    metabolic: ModuleAnalysis,
    stress: ModuleAnalysis,
    vo2max: ModuleAnalysis,
  }),
  top_priority_evidence: z.object({
    module: DimKey,
    rationale_anchor: z.string().min(1),
    expected_multiplier_effect_on: z.array(DimKey),
    time_to_effect_days: z.number().min(7).max(180),
  }),
  systemic_overview_anchors: z
    .array(
      z.object({
        a: DimKey,
        b: DimKey,
        mechanism: z.string().min(1),
        evidence_fields: z.array(z.string().min(1)),
      }),
    )
    .min(1)
    .max(3),
  forecast_anchors: z.object({
    realistic_score_deltas: z.array(
      z.object({
        module: DimKey,
        from: z.number().min(0).max(100),
        to: z.number().min(0).max(100),
        driver: z.string().min(1),
      }),
    ),
    time_frame_days: z.literal(30),
  }),
  daily_protocol_anchors: z.object({
    morning_focus: z.array(HabitAnchor),
    work_day_focus: z.array(HabitAnchor),
    evening_focus: z.array(HabitAnchor),
    nutrition_micro_focus: z.array(HabitAnchor),
    total_time_budget_min: z.number().min(0).max(180),
  }),
});

export type AnalysisJSON = z.infer<typeof AnalysisSchema>;
export type ModuleAnalysis = z.infer<typeof ModuleAnalysis>;
export type DefiningFactor = z.infer<typeof DefiningFactor>;
export type RecommendationAnchor = z.infer<typeof RecommendationAnchor>;
export type HabitAnchor = z.infer<typeof HabitAnchor>;
