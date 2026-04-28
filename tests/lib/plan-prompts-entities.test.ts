import { describe, expect, it } from "vitest";
import { buildFullPrompt, type ExtractedEntities, type ScoreInput, type PlanType } from "@/lib/plan/prompts/full-prompts";

const baseScores: ScoreInput = {
  activity: { activity_score_0_100: 60, activity_category: "moderate", total_met_minutes_week: 720 },
  sleep: { sleep_score_0_100: 55, sleep_duration_band: "short", sleep_band: "moderate" },
  metabolic: { metabolic_score_0_100: 70, bmi: 24, bmi_category: "normal", metabolic_band: "good" },
  stress: { stress_score_0_100: 50, stress_band: "moderate" },
  vo2max: { fitness_score_0_100: 60, vo2max_estimated: 42, vo2max_band: "good" },
  overall_score_0_100: 60,
  overall_band: "moderate",
};

const baseArgs = {
  scores: baseScores,
  personalization: {
    main_goal: "performance" as const,
    time_budget: "committed" as const,
    experience_level: "intermediate" as const,
    training_days: 4,
  },
};

const planTypes: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
const locales = ["de", "en", "it", "tr"] as const;

describe("buildFullPrompt — extractedEntities pass-through", () => {
  it("does NOT inject an entities block when extractedEntities is null", () => {
    for (const locale of locales) {
      for (const type of planTypes) {
        const { userPrompt } = buildFullPrompt(locale, {
          ...baseArgs,
          type,
          extractedEntities: null,
        });
        expect(userPrompt).not.toContain("FREETEXT");
        expect(userPrompt).not.toContain("FREITEXT");
      }
    }
  });

  it("does NOT inject when all entity arrays are empty", () => {
    const empty: ExtractedEntities = {
      events: [], sports: [], quantifiable_goals: [], constraints: [],
    };
    for (const locale of locales) {
      const { userPrompt } = buildFullPrompt(locale, {
        ...baseArgs, type: "activity", extractedEntities: empty,
      });
      expect(userPrompt).not.toContain("FREETEXT");
      expect(userPrompt).not.toContain("FREITEXT");
    }
  });

  it("injects entities JSON for every locale × plan type when populated", () => {
    const entities: ExtractedEntities = {
      events: [{ label: "Marathon Mai 2026", date_or_horizon: "2026-05" }],
      sports: [{ name: "tennis", frequency_per_week: 3 }],
      quantifiable_goals: ["10 kg in 3 Monaten verlieren"],
      constraints: [],
    };
    for (const locale of locales) {
      for (const type of planTypes) {
        const { userPrompt } = buildFullPrompt(locale, {
          ...baseArgs, type, extractedEntities: entities,
        });
        expect(userPrompt).toContain("Marathon Mai 2026");
        expect(userPrompt).toContain("tennis");
        expect(userPrompt).toContain("10 kg in 3 Monaten verlieren");
      }
    }
  });

  it("DE prompt uses German entity-block headline", () => {
    const entities: ExtractedEntities = {
      events: [{ label: "Marathon Mai 2026", date_or_horizon: "2026-05" }],
      sports: [], quantifiable_goals: [], constraints: [],
    };
    const { userPrompt } = buildFullPrompt("de", {
      ...baseArgs, type: "activity", extractedEntities: entities,
    });
    expect(userPrompt).toContain("USER-FREITEXT-ENTITÄTEN");
  });

  it("EN prompt uses English entity-block headline", () => {
    const entities: ExtractedEntities = {
      events: [{ label: "Ironman Vienna 2026", date_or_horizon: "2026-07" }],
      sports: [], quantifiable_goals: [], constraints: [],
    };
    const { userPrompt } = buildFullPrompt("en", {
      ...baseArgs, type: "activity", extractedEntities: entities,
    });
    expect(userPrompt).toContain("USER FREETEXT ENTITIES");
  });
});
