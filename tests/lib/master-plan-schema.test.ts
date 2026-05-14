import { describe, expect, it } from "vitest";
import { MasterPlanSchema, MASTER_PLAN_DAYS } from "@/lib/master-plan/schema";

function makeValidPlan() {
  return {
    title: "MASTER-WOCHENPLAN",
    subtitle: "Personalisiert für dich, zugeschnitten auf deine Ziele",
    color: "#E63222",
    score: 67,
    intro:
      "Diese Woche kombiniert dein Ziel \"feel better\" mit deinem Wunsch mehr zu laufen — alle Trainings sind aerob aufgebaut.",
    rows: MASTER_PLAN_DAYS.map((day) => ({
      day,
      training: [`${day} training`],
      nutrition: [`${day} nutrition`],
      recovery: [`${day} recovery`],
      stress_anchor: [`${day} stress`],
    })),
  };
}

describe("MasterPlanSchema", () => {
  it("accepts a fully valid plan", () => {
    const result = MasterPlanSchema.safeParse(makeValidPlan());
    expect(result.success).toBe(true);
  });

  it("rejects intro shorter than 80 chars", () => {
    const plan = makeValidPlan();
    plan.intro = "Too short.";
    expect(MasterPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects intro longer than 800 chars", () => {
    const plan = makeValidPlan();
    plan.intro = "x".repeat(801);
    expect(MasterPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects fewer than 7 rows", () => {
    const plan = makeValidPlan();
    plan.rows = plan.rows.slice(0, 6);
    expect(MasterPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects more than 7 rows", () => {
    const plan = makeValidPlan();
    plan.rows = [...plan.rows, plan.rows[0]];
    expect(MasterPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects cell with 0 items", () => {
    const plan = makeValidPlan();
    plan.rows[0].training = [];
    expect(MasterPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects cell with 3 items", () => {
    const plan = makeValidPlan();
    plan.rows[0].training = ["a", "b", "c"];
    expect(MasterPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects invalid color", () => {
    const plan = makeValidPlan();
    plan.color = "not-a-hex";
    expect(MasterPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("accepts plan with 2 items per cell", () => {
    const plan = makeValidPlan();
    plan.rows[0].training = ["one", "two"];
    expect(MasterPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("accepts optional quality_warnings", () => {
    const plan = { ...makeValidPlan(), quality_warnings: ["warn1"] };
    expect(MasterPlanSchema.safeParse(plan).success).toBe(true);
  });
});
