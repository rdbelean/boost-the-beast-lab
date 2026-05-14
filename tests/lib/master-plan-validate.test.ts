import { describe, expect, it } from "vitest";
import { validateMasterPlan } from "@/lib/master-plan/validate";
import { MASTER_PLAN_DAYS, type MasterPlan } from "@/lib/master-plan/schema";
import type { MasterPlanInputs } from "@/lib/master-plan/prompts";

// Plan with 4 training days + 3 rest days (stress=70 → cap 5, well under)
function makePlan(overrides: Partial<MasterPlan> = {}): MasterPlan {
  const restDays = new Set<(typeof MASTER_PLAN_DAYS)[number]>(["wed", "sat", "sun"]);
  return {
    title: "MASTER-WOCHENPLAN",
    subtitle: "Personalisiert für dich, zugeschnitten auf deine Ziele",
    color: "#E63222",
    score: 67,
    intro:
      "Diese Woche kombiniert dein performance Ziel mit dem Wunsch, fitter im Tennis zu werden. Alle Trainings sind progressiv aufgebaut.",
    rows: MASTER_PLAN_DAYS.map((day) => ({
      day,
      training: restDays.has(day)
        ? ["PAUSE"]
        : [`${day} - Easy Run Z2 (Zone 2 — kannst noch sprechen) · 30 Min`],
      nutrition: [`${day} - 30g Protein zum Frühstück`],
      recovery: [`${day} - 10 Min Mobility`],
      stress_anchor: [`${day} - Box-Breathing 4×4`],
    })),
    ...overrides,
  };
}

function makeInputs(overrides: Partial<MasterPlanInputs> = {}): MasterPlanInputs {
  return {
    locale: "de",
    user: { age: 35, gender: "m" },
    scores: { activity: 65, sleep: 70, metabolic: 60, stress: 70, vo2max: 65, overall: 65 },
    goal_dropdown: "performance",
    goal_freetext: null,
    training_dropdown: "kraft_ausdauer",
    training_freetext: null,
    time_budget: "moderate",
    experience_level: "intermediate",
    training_days_self_reported: 4,
    stress_source: ["job"],
    recovery_ritual: ["sport"],
    nutrition_painpoint: ["no_time"],
    wearable_sources: [],
    whoop_available: false,
    ...overrides,
  };
}

describe("validateMasterPlan", () => {
  it("ok on a clean plan", () => {
    const result = validateMasterPlan(makePlan(), { locale: "de", inputs: makeInputs() });
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("flags forbidden phrase 'trink mehr wasser'", () => {
    const plan = makePlan();
    plan.rows[0].nutrition = ["Trink mehr Wasser"];
    const result = validateMasterPlan(plan, { locale: "de", inputs: makeInputs() });
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("forbidden_phrase_"))).toBe(true);
  });

  it("flags score-reference in intro", () => {
    const plan = makePlan({ intro: "Dein performance Activity Score liegt bei 58/100 — solide Basis. Wir bauen darauf auf um deine Ziele zu erreichen mit konkreten Aktionen jeden Tag." });
    const result = validateMasterPlan(plan, { locale: "de", inputs: makeInputs() });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("score_reference_present");
  });

  it("flags stress-cap violation (low stress, 7 training days)", () => {
    const plan = makePlan();
    // All 7 rows are training (no rest)
    const inputs = makeInputs({ scores: { ...makeInputs().scores, stress: 40 } });
    const result = validateMasterPlan(plan, { locale: "de", inputs });
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("stress_cap_violation_"))).toBe(true);
  });

  it("respects rest-day cells (no training-day count)", () => {
    const plan = makePlan();
    // Mark 4 days as REST
    for (let i = 0; i < 4; i++) plan.rows[i].training = ["PAUSE"];
    const inputs = makeInputs({ scores: { ...makeInputs().scores, stress: 40 } });
    const result = validateMasterPlan(plan, { locale: "de", inputs });
    // 3 training days, cap = 3 → OK
    expect(result.reasons.filter((r) => r.startsWith("stress_cap_violation_"))).toEqual([]);
  });

  it("flags forbidden HIIT at low stress", () => {
    const plan = makePlan();
    plan.rows[0].training = ["HIIT Tabata 20s on 10s off — 8 rounds"];
    for (let i = 1; i < 7; i++) plan.rows[i].training = ["PAUSE"];
    const inputs = makeInputs({ scores: { ...makeInputs().scores, stress: 40 } });
    const result = validateMasterPlan(plan, { locale: "de", inputs });
    expect(result.reasons.some((r) => r.startsWith("forbidden_intensity_"))).toBe(true);
  });

  it("flags sleep cutoff violation (sleep<60, late time)", () => {
    const plan = makePlan();
    plan.rows[0].training = ["Krafttraining um 19:00 Uhr (1 Std)"];
    const inputs = makeInputs({ scores: { ...makeInputs().scores, sleep: 50 } });
    const result = validateMasterPlan(plan, { locale: "de", inputs });
    expect(result.reasons.some((r) => r.startsWith("sleep_cutoff_violation_"))).toBe(true);
  });

  it("flags volume push when activity ≥ 85", () => {
    const plan = makePlan({
      intro: "Diese Woche performance: erhöhe das Volumen um 20% durch tägliches add 30 min training neue Stunde. Wir bauen darauf auf.",
    });
    const inputs = makeInputs({ scores: { ...makeInputs().scores, activity: 90 } });
    const result = validateMasterPlan(plan, { locale: "de", inputs });
    // intro mentions "performance" already; the volume-push check fires on training cells, not intro,
    // so push the violation into a training cell:
    plan.rows[0].training = ["add 30 min weekly to your running base"];
    const result2 = validateMasterPlan(plan, { locale: "de", inputs });
    expect(result2.reasons).toContain("volume_push_violation");
  });

  it("flags missing goal_dropdown in intro", () => {
    const plan = makePlan({
      intro:
        "Diese Woche bauen wir locker auf — keine direkten Bezüge zu deinen Wünschen, nur generische Empfehlungen für einen aktiveren Wochenstart und mehr Bewegung.",
    });
    const result = validateMasterPlan(plan, { locale: "de", inputs: makeInputs({ goal_dropdown: "performance" }) });
    expect(result.reasons.some((r) => r.startsWith("goal_not_mentioned_dropdown_"))).toBe(true);
  });

  it("flags missing goal_freetext in intro", () => {
    const plan = makePlan({
      intro:
        "Diese Woche kombiniert dein performance Ziel mit Erholung — wir bauen schrittweise Volumen auf während Pausen den Cortisol-Wert tief halten.",
    });
    const inputs = makeInputs({
      goal_dropdown: "performance",
      goal_freetext: "fitter werden im Marathon",
    });
    const result = validateMasterPlan(plan, { locale: "de", inputs });
    expect(result.reasons).toContain("goal_not_mentioned_freetext");
  });
});
