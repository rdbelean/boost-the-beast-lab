// Interpret-block (results page hover blocks) Stage-A schema.
// Compact — one dimension at a time, just enough anchors for a 2–3
// sentence interpretation.

import { z } from "zod";
import { DimKey } from "./dimensions";

const EvidenceValue = z.union([z.number(), z.string(), z.boolean()]);

export const BlockAnalysisSchema = z.object({
  dimension: DimKey,
  score: z.number().min(0).max(100),
  band: z.string().min(1),
  primary_anchor: z.object({
    field: z.string().min(1),
    value: EvidenceValue,
    contribution_hint: z.enum(["low", "high", "borderline", "neutral"]),
  }),
  secondary_anchor: z
    .object({
      field: z.string().min(1),
      value: EvidenceValue,
      contribution_hint: z.enum(["low", "high", "borderline", "neutral"]),
    })
    .nullable(),
  systemic_link: z
    .object({
      to: DimKey,
      mechanism: z.string().min(1),
      evidence_field: z.string().min(1),
    })
    .nullable(),
  flags_active: z.array(z.string()),
});

export const BlockOutputSchema = z.object({
  interpretation: z.string().min(1).max(400),
  _meta: z.object({
    stage: z.literal("writer"),
    dimension: DimKey,
    generation_id: z.string().min(1),
    evidence_refs: z.array(z.string()),
  }),
});

export type BlockAnalysisJSON = z.infer<typeof BlockAnalysisSchema>;
export type BlockOutputJSON = z.infer<typeof BlockOutputSchema>;
