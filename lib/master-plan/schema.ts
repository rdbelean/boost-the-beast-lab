import { z } from "zod";

export const MASTER_PLAN_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type MasterPlanDay = (typeof MASTER_PLAN_DAYS)[number];

const cellArray = z.array(z.string().min(1)).min(1).max(2);

export const MasterPlanRowSchema = z.object({
  day: z.enum(MASTER_PLAN_DAYS),
  training: cellArray,
  nutrition: cellArray,
  recovery: cellArray,
  stress_anchor: cellArray,
});

export const MasterPlanSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  score: z.number().min(0).max(100).optional(),
  intro: z.string().min(80).max(800),
  rows: z.array(MasterPlanRowSchema).length(7),
  quality_warnings: z.array(z.string()).optional(),
});

export type MasterPlanRow = z.infer<typeof MasterPlanRowSchema>;
export type MasterPlan = z.infer<typeof MasterPlanSchema>;
