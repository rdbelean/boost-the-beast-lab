import { describe, expect, it } from "vitest";
import { buildAnalysisUserPrompt } from "@/lib/report/prompts/v4/analysis-user";
import { buildTestContext } from "../fixtures/build-context";

const baseInputs = {
  reportType: "complete" as const,
  locale: "de" as const,
  user: { email: "ft@test.local", age: 30, gender: "male" as const, height_cm: 178, weight_kg: 75 },
  scoringInputs: {
    age: 30,
    gender: "male" as const,
    height_cm: 178,
    weight_kg: 75,
    activity: {
      walking_days: 5, walking_minutes_per_day: 30,
      moderate_days: 2, moderate_minutes_per_day: 30,
      vigorous_days: 1, vigorous_minutes_per_day: 30,
    },
    sleep: { duration_hours: 7, quality: "gut" as const, wakeups: "selten" as const, recovery_1_10: 6 },
    metabolic: { meals_per_day: 3, water_litres: 2, sitting_hours: 6, fruit_veg: "moderate" as const },
    stress: { stress_level_1_10: 5 },
  },
  sleep_duration_hours: 7,
};

describe("freetext fields — context passthrough", () => {
  it("ReportContextRaw exposes both freetext fields when set", () => {
    const ctx = buildTestContext({
      ...baseInputs,
      main_goal_freetext: "Marathon Mai 2026",
      training_type_freetext: "3x Tennis pro Woche",
    });
    expect(ctx.raw.main_goal_freetext).toBe("Marathon Mai 2026");
    expect(ctx.raw.training_type_freetext).toBe("3x Tennis pro Woche");
  });

  it("defaults to null when fields are not provided", () => {
    const ctx = buildTestContext(baseInputs);
    expect(ctx.raw.main_goal_freetext).toBeNull();
    expect(ctx.raw.training_type_freetext).toBeNull();
  });

  it("accepts only one of the two fields", () => {
    const ctx = buildTestContext({
      ...baseInputs,
      main_goal_freetext: "10 kg in 3 Monaten verlieren",
    });
    expect(ctx.raw.main_goal_freetext).toBe("10 kg in 3 Monaten verlieren");
    expect(ctx.raw.training_type_freetext).toBeNull();
  });
});

describe("buildAnalysisUserPrompt — freetext XML wrapping", () => {
  it("emits no <user_freetext_*> tag when both fields are null", () => {
    const ctx = buildTestContext(baseInputs);
    const prompt = buildAnalysisUserPrompt(ctx);
    expect(prompt).not.toContain("<user_freetext_main_goal>");
    expect(prompt).not.toContain("<user_freetext_training>");
  });

  it("wraps main_goal_freetext in its own XML block", () => {
    const ctx = buildTestContext({
      ...baseInputs,
      main_goal_freetext: "Marathon Mai 2026, will 3:30 laufen",
    });
    const prompt = buildAnalysisUserPrompt(ctx);
    expect(prompt).toContain("<user_freetext_main_goal>");
    expect(prompt).toContain("Marathon Mai 2026, will 3:30 laufen");
    expect(prompt).toContain("</user_freetext_main_goal>");
    expect(prompt).not.toContain("<user_freetext_training>");
  });

  it("wraps training_type_freetext in its own XML block", () => {
    const ctx = buildTestContext({
      ...baseInputs,
      training_type_freetext: "3x Tennis im Verein, 2x Krafttraining",
    });
    const prompt = buildAnalysisUserPrompt(ctx);
    expect(prompt).toContain("<user_freetext_training>");
    expect(prompt).toContain("3x Tennis im Verein, 2x Krafttraining");
    expect(prompt).toContain("</user_freetext_training>");
    expect(prompt).not.toContain("<user_freetext_main_goal>");
  });

  it("strips freetext from the JSON ctx so it appears only inside XML tags", () => {
    const goal = "UNIQUE_TOKEN_FOR_GOAL_42";
    const ctx = buildTestContext({
      ...baseInputs,
      main_goal_freetext: goal,
    });
    const prompt = buildAnalysisUserPrompt(ctx);

    // Prompt has the JSON ctx + an XML block. The unique token must
    // appear EXACTLY once — inside the XML block — and never inside
    // the JSON portion (so it can't break out of a JSON string).
    const occurrences = prompt.split(goal).length - 1;
    expect(occurrences).toBe(1);

    const xmlStart = prompt.indexOf("<user_freetext_main_goal>");
    const tokenIdx = prompt.indexOf(goal);
    expect(tokenIdx).toBeGreaterThan(xmlStart);
  });

  it("ignores whitespace-only freetext", () => {
    const ctx = buildTestContext({
      ...baseInputs,
      main_goal_freetext: "   \n  ",
      training_type_freetext: "",
    });
    const prompt = buildAnalysisUserPrompt(ctx);
    expect(prompt).not.toContain("<user_freetext_main_goal>");
    expect(prompt).not.toContain("<user_freetext_training>");
  });
});
