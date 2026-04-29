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

// ─── Goal-driven structure (C5) ─────────────────────────────────────────

describe("buildFullPrompt — goalDirective (C5)", () => {
  it("activity + sport-event → emits EVENT-FOKUS / EVENT FOCUS structural block", () => {
    const entities: ExtractedEntities = {
      events: [{ label: "Marathon Wien", date_or_horizon: "Mai 2026" }],
      sports: [], quantifiable_goals: [], constraints: [],
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "activity", extractedEntities: entities }).userPrompt;
    expect(de).toContain("GOAL-DRIVEN STRUCTURE (Activity)");
    expect(de).toContain("EVENT-FOKUS");
    expect(de).toContain("Marathon Wien");
    expect(de).toContain("Mai 2026");
    expect(de).toContain("Aufbau");

    const en = buildFullPrompt("en", { ...baseArgs, type: "activity", extractedEntities: entities }).userPrompt;
    expect(en).toContain("EVENT FOCUS");
    expect(en).toContain("Marathon Wien");
  });

  it("activity + sports-only → SPORT-REALITÄT, no EVENT-FOKUS", () => {
    const entities: ExtractedEntities = {
      events: [],
      sports: [{ name: "tennis", frequency_per_week: 5 }],
      quantifiable_goals: [], constraints: [],
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "activity", extractedEntities: entities }).userPrompt;
    expect(de).toContain("SPORT-REALITÄT");
    expect(de).not.toContain("EVENT-FOKUS");

    const en = buildFullPrompt("en", { ...baseArgs, type: "activity", extractedEntities: entities }).userPrompt;
    expect(en).toContain("SPORT REALITY");
    expect(en).not.toContain("EVENT FOCUS");
  });

  it("metabolic + numeric weight goal → emits GEWICHTSZIEL / WEIGHT GOAL", () => {
    const entities: ExtractedEntities = {
      events: [], sports: [],
      quantifiable_goals: ["10 kg verlieren in 3 Monaten"],
      constraints: [],
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "metabolic", extractedEntities: entities }).userPrompt;
    expect(de).toContain("GEWICHTSZIEL");
    expect(de).toContain("750 kcal");

    const en = buildFullPrompt("en", { ...baseArgs, type: "metabolic", extractedEntities: entities }).userPrompt;
    expect(en).toContain("WEIGHT GOAL");
  });

  it("metabolic + non-numeric goal → does NOT trigger GEWICHTSZIEL", () => {
    const entities: ExtractedEntities = {
      events: [], sports: [],
      quantifiable_goals: ["fitter werden"],
      constraints: [],
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "metabolic", extractedEntities: entities }).userPrompt;
    expect(de).not.toContain("GEWICHTSZIEL");
  });

  it("metabolic + endurance event → emits EVENT-NUTRITION", () => {
    const entities: ExtractedEntities = {
      events: [{ label: "Marathon Berlin", date_or_horizon: "September 2026" }],
      sports: [], quantifiable_goals: [], constraints: [],
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "metabolic", extractedEntities: entities }).userPrompt;
    expect(de).toContain("EVENT-NUTRITION");
    expect(de).toContain("Marathon Berlin");

    const it = buildFullPrompt("it", { ...baseArgs, type: "metabolic", extractedEntities: entities }).userPrompt;
    expect(it).toContain("NUTRIZIONE EVENTO");
  });

  it("recovery + constraint → emits CONSTRAINTS block", () => {
    const entities: ExtractedEntities = {
      events: [], sports: [], quantifiable_goals: [],
      constraints: ["Rückenschmerzen seit 2024"],
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "recovery", extractedEntities: entities }).userPrompt;
    expect(de).toContain("CONSTRAINTS");
    expect(de).toContain("Rückenschmerzen seit 2024");
    expect(de).toContain("Mobility");
  });

  it("recovery + raw_main_goal → forwards verbatim text with classification directive (Option b)", () => {
    const entities: ExtractedEntities = {
      events: [], sports: [], quantifiable_goals: [], constraints: [],
      raw_main_goal: "Habe keinen Schlafrhythmus, will mehr Struktur",
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "recovery", extractedEntities: entities }).userPrompt;
    // raw text is forwarded verbatim
    expect(de).toContain("Habe keinen Schlafrhythmus, will mehr Struktur");
    // classification directive present (LLM decides — not regex)
    expect(de).toContain("Schlaf-, Rhythmus-, Struktur-");
    expect(de).toContain("Schlafhygiene");
  });

  it("stress + raw_main_goal → forwards verbatim text with mental-classification directive", () => {
    const entities: ExtractedEntities = {
      events: [], sports: [], quantifiable_goals: [], constraints: [],
      raw_main_goal: "Bin total überfordert, Burnout-Gefühl im Job",
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "stress", extractedEntities: entities }).userPrompt;
    expect(de).toContain("Bin total überfordert");
    expect(de).toContain("mentale Themen");
    expect(de).toContain("Burnout");
  });

  it("backward-compat: empty/null extractedEntities → NO GOAL-DRIVEN block in any locale × type", () => {
    for (const locale of locales) {
      for (const type of planTypes) {
        const { userPrompt: nullPrompt } = buildFullPrompt(locale, {
          ...baseArgs, type, extractedEntities: null,
        });
        expect(nullPrompt).not.toContain("GOAL-DRIVEN STRUCTURE");

        const empty: ExtractedEntities = {
          events: [], sports: [], quantifiable_goals: [], constraints: [],
        };
        const { userPrompt: emptyPrompt } = buildFullPrompt(locale, {
          ...baseArgs, type, extractedEntities: empty,
        });
        expect(emptyPrompt).not.toContain("GOAL-DRIVEN STRUCTURE");
      }
    }
  });

  it("recovery: hasConstraint without raw_main_goal does NOT forward sleep classification", () => {
    const entities: ExtractedEntities = {
      events: [], sports: [], quantifiable_goals: [],
      constraints: ["Knieschmerzen"],
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "recovery", extractedEntities: entities }).userPrompt;
    expect(de).toContain("CONSTRAINTS");
    expect(de).not.toContain("Schlafhygiene");
  });

  it("activity: events but NO raw_main_goal → no Schlaf/Mental directive leaks into Activity", () => {
    const entities: ExtractedEntities = {
      events: [{ label: "Marathon", date_or_horizon: "Mai 2026" }],
      sports: [], quantifiable_goals: [], constraints: [],
      raw_main_goal: "Marathon laufen",
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "activity", extractedEntities: entities }).userPrompt;
    // activity directive only handles events + sports — sleep/mental classification
    // is recovery/stress only and must not appear in activity
    expect(de).toContain("EVENT-FOKUS");
    expect(de).not.toContain("Schlafhygiene");
    expect(de).not.toContain("mentale Themen");
  });

  it("recovery: event present → TAPERING block in addition to constraints", () => {
    const entities: ExtractedEntities = {
      events: [{ label: "Ironman Hamburg", date_or_horizon: "Juli 2026" }],
      sports: [], quantifiable_goals: [],
      constraints: ["Rückenschmerzen"],
    };
    const de = buildFullPrompt("de", { ...baseArgs, type: "recovery", extractedEntities: entities }).userPrompt;
    expect(de).toContain("CONSTRAINTS");
    expect(de).toContain("TAPERING");
    expect(de).toContain("Ironman Hamburg");
  });

  it("all 4 locales emit GOAL-DRIVEN STRUCTURE (Activity) header for sport-event", () => {
    const entities: ExtractedEntities = {
      events: [{ label: "Marathon", date_or_horizon: "Mai 2026" }],
      sports: [], quantifiable_goals: [], constraints: [],
    };
    for (const locale of locales) {
      const { userPrompt } = buildFullPrompt(locale, {
        ...baseArgs, type: "activity", extractedEntities: entities,
      });
      expect(userPrompt).toContain("GOAL-DRIVEN STRUCTURE (Activity)");
    }
  });
});
