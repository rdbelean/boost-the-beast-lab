import { z } from "zod";

export const JudgeIssueKind = z.enum([
  "generic",
  "missing_anchor",
  "contradicts_data",
  "wrong_report_type",
  "fallback_smell",
  "time_budget_violated",
  "training_in_daily_protocol",
  "schema_invalid",
  "banlist_hit",
]);
export type JudgeIssueKind = z.infer<typeof JudgeIssueKind>;

export const JudgeIssue = z.object({
  section: z.string().min(1),
  kind: JudgeIssueKind,
  excerpt: z.string(),
  suggestion: z.string(),
});
export type JudgeIssue = z.infer<typeof JudgeIssue>;

export const JudgeResultSchema = z.object({
  overall_score: z.number().min(0).max(100),
  individualization_score: z.number().min(0).max(100),
  evidence_anchoring_score: z.number().min(0).max(100),
  report_type_conformance: z.boolean(),
  banlist_hits: z.array(
    z.object({ section: z.string(), phrase: z.string() }),
  ),
  issues: z.array(JudgeIssue),
  repair_required: z.boolean(),
  repair_target_sections: z.array(z.string()),
});
export type JudgeResult = z.infer<typeof JudgeResultSchema>;
