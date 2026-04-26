// Plan-pipeline Stage-B/D output schema. Mirrors the existing
// PlanPdfInput shape (lib/pdf/generatePlan.ts) so the PDF renderer can
// keep its current contract — but adds an _meta block carrying the
// per-section evidence_refs.

import { z } from "zod";
import { PlanType } from "./dimensions";

const PlanBlock = z.object({
  heading: z.string().min(1),
  items: z.array(z.string().min(1)).min(1).max(12),
  rationale: z.string().optional(),
});

export const PlanReportSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  source: z.string().min(1),
  color: z.string().min(1),
  score: z.number().min(0).max(100).optional(),
  blocks: z.array(PlanBlock).min(2).max(8),
  _meta: z.object({
    stage: z.enum(["writer", "repair"]),
    plan_type: PlanType,
    generation_id: z.string().min(1),
    section_evidence_refs: z.record(z.string(), z.array(z.string())),
  }),
});

export type PlanReportJSON = z.infer<typeof PlanReportSchema>;
export type PlanReportBlock = z.infer<typeof PlanBlock>;
