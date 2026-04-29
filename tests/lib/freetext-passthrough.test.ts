import { describe, expect, it } from "vitest";
import { buildAnalysisUserPrompt } from "@/lib/report/prompts/v4/analysis-user";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/report/prompts/v4/analysis-system";
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

// ─── Stage-A system-prompt tightening (C6 fix-pass) ─────────────────────
//
// The original C5/C6 wording made `executive_evidence.user_stated_goals`
// look like a soft optional field, causing real Anthropic calls to omit
// it entirely → goal-mode silently failed downstream. These string-grep
// tests pin the prompt to its REQUIRED-when-XML-tag-present contract.

describe("Stage-A system prompt — user_stated_goals required when XML tags present", () => {
  it("makes user_stated_goals REQUIRED whenever XML tag is present (Patches A + D)", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("you MUST populate");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("REQUIRED whenever at least one XML tag is present");
    // The old "optional field" wording in the directive line must be gone
    expect(ANALYSIS_SYSTEM_PROMPT).not.toMatch(
      /optional field\s+`?executive_evidence\.user_stated_goals`?/,
    );
    // And the Skip-only negative formulation must be replaced with the
    // populate-when-present positive phrasing.
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("Populate");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("AT LEAST ONE XML tag");
  });

  it("OUTPUT SCHEMA OVERVIEW lists user_stated_goals under executive_evidence (Patch B)", () => {
    const sections = ANALYSIS_SYSTEM_PROMPT.split("OUTPUT SCHEMA OVERVIEW");
    expect(sections.length).toBeGreaterThanOrEqual(2);
    const schemaSection = sections[1];
    // user_stated_goals is listed inside the schema overview block
    expect(schemaSection).toContain("user_stated_goals");
    // The listing line carries the REQUIRED/OMIT contract inline
    expect(schemaSection).toMatch(/user_stated_goals.*REQUIRED.*XML/i);
  });

  it("extraction examples cover relative time horizons, not just concrete dates (Patch C)", () => {
    // Concrete date example still present
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("Marathon Mai 2026");
    // Relative-horizon examples — the actual symptom that broke P1
    expect(ANALYSIS_SYSTEM_PROMPT).toMatch(/in\s+\d+\s+(Monaten|Wochen|months|weeks)/i);
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("in 6 Monaten");
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("in 8 Wochen");
  });
});
