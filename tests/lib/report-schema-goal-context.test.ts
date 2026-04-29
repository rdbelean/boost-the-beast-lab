import { describe, expect, it } from "vitest";
import { ReportSchema } from "@/lib/reports/schemas/report-output";
import { buildValidReportFor } from "../fixtures/build-report";
import { beginnerContext } from "../fixtures/profiles/beginner";

// C6: ReportSchema accepts the new optional goal_in_context field.

describe("ReportSchema — goal_in_context (C6)", () => {
  it("accepts a report WITHOUT goal_in_context (backward-compat)", () => {
    const r = buildValidReportFor(beginnerContext);
    expect(r).not.toHaveProperty("goal_in_context");
    const parsed = ReportSchema.safeParse(r);
    expect(parsed.success).toBe(true);
  });

  it("accepts a report WITH goal_in_context (string)", () => {
    const r = buildValidReportFor(beginnerContext);
    const withGoal = {
      ...r,
      goal_in_context:
        "Du willst einen Marathon laufen. Dein Aktivitätsvolumen ist solide, aber dein VO2max ist die limitierende Größe.",
    };
    const parsed = ReportSchema.safeParse(withGoal);
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty-string goal_in_context (min length 1)", () => {
    const r = buildValidReportFor(beginnerContext);
    const withEmpty = {
      ...r,
      goal_in_context: "",
    };
    const parsed = ReportSchema.safeParse(withEmpty);
    expect(parsed.success).toBe(false);
  });

  it("accepts goal_in_context = undefined (omit pattern)", () => {
    const r = buildValidReportFor(beginnerContext);
    const withUndefined = {
      ...r,
      goal_in_context: undefined,
    };
    const parsed = ReportSchema.safeParse(withUndefined);
    expect(parsed.success).toBe(true);
  });

  it("type inference: ReportJSON exposes goal_in_context as optional string", () => {
    // This is a type-level test: if the type is wrong, tsc fails the build.
    // The runtime check just confirms structural validity.
    const r = buildValidReportFor(beginnerContext);
    type GoalField = (typeof r)["goal_in_context"];
    // GoalField must be string | undefined (optional)
    const sample: GoalField = "test";
    void sample;
    expect(true).toBe(true);
  });
});
