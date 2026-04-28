import { describe, expect, it } from "vitest";
import { AnalysisSchema } from "@/lib/reports/schemas/report-analysis";
import { buildValidAnalysisFor } from "../fixtures/build-analysis";
import { beginnerContext } from "../fixtures/profiles/beginner";

describe("AnalysisSchema — executive_evidence.user_stated_goals", () => {
  it("accepts an analysis without user_stated_goals (backward-compat)", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    expect(a.executive_evidence).not.toHaveProperty("user_stated_goals");
    const parsed = AnalysisSchema.safeParse(a);
    expect(parsed.success).toBe(true);
  });

  it("accepts a fully-populated user_stated_goals", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    a.executive_evidence.user_stated_goals = {
      events: [{ label: "Marathon Mai 2026", date_or_horizon: "2026-05" }],
      sports: [{ name: "tennis", frequency_per_week: 3 }],
      quantifiable_goals: ["10 kg verlieren in 3 Monaten"],
      constraints: ["Rückenschmerzen seit 2024"],
      raw_main_goal: "Marathon Mai 2026, dabei 10 kg verlieren",
      raw_training: "3x Tennis pro Woche",
    };
    const parsed = AnalysisSchema.safeParse(a);
    expect(parsed.success).toBe(true);
  });

  it("accepts user_stated_goals with empty arrays (defaulted)", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    a.executive_evidence.user_stated_goals = {
      events: [],
      sports: [],
      quantifiable_goals: [],
      constraints: [],
    };
    const parsed = AnalysisSchema.safeParse(a);
    expect(parsed.success).toBe(true);
  });

  it("rejects more than 10 events (anti-hallucination cap)", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    a.executive_evidence.user_stated_goals = {
      events: Array.from({ length: 11 }, (_, i) => ({
        label: `Event ${i}`,
        date_or_horizon: null,
      })),
      sports: [],
      quantifiable_goals: [],
      constraints: [],
    };
    const parsed = AnalysisSchema.safeParse(a);
    expect(parsed.success).toBe(false);
  });

  it("rejects a quantifiable_goal longer than 200 chars", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    a.executive_evidence.user_stated_goals = {
      events: [],
      sports: [],
      quantifiable_goals: ["x".repeat(201)],
      constraints: [],
    };
    const parsed = AnalysisSchema.safeParse(a);
    expect(parsed.success).toBe(false);
  });

  it("rejects a sport.frequency_per_week > 21", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    a.executive_evidence.user_stated_goals = {
      events: [],
      sports: [{ name: "tennis", frequency_per_week: 22 }],
      quantifiable_goals: [],
      constraints: [],
    };
    const parsed = AnalysisSchema.safeParse(a);
    expect(parsed.success).toBe(false);
  });

  it("accepts null date_or_horizon and null frequency_per_week", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    a.executive_evidence.user_stated_goals = {
      events: [{ label: "Some race", date_or_horizon: null }],
      sports: [{ name: "swimming", frequency_per_week: null }],
      quantifiable_goals: [],
      constraints: [],
    };
    const parsed = AnalysisSchema.safeParse(a);
    expect(parsed.success).toBe(true);
  });
});
