import { z } from "zod";

export const DimKey = z.enum([
  "sleep",
  "recovery",
  "activity",
  "metabolic",
  "stress",
  "vo2max",
]);
export type DimKey = z.infer<typeof DimKey>;

export const ReportType = z.enum(["metabolic", "recovery", "complete"]);
export type ReportType = z.infer<typeof ReportType>;

export const PlanType = z.enum(["activity", "metabolic", "recovery", "stress"]);
export type PlanType = z.infer<typeof PlanType>;

export const Locale = z.enum(["de", "en", "it", "tr"]);
export type Locale = z.infer<typeof Locale>;

export const ActionKind = z.enum([
  "habit",
  "training",
  "nutrition",
  "sleep_hygiene",
  "stress_protocol",
  "measurement",
]);
export type ActionKind = z.infer<typeof ActionKind>;
