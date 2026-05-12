import { describe, expect, it } from "vitest";
import {
  enforceGlossaryAndExamples,
  validatePlanQuality,
  type PlanBlock,
  type WeeklyTablePlanBlock,
} from "@/lib/plan/buildPlan";
import type { Locale } from "@/lib/supabase/types";

// ─── 1. Glossar Post-Processing ───────────────────────────────────────

describe("enforceGlossaryAndExamples — Glossar-Inject", () => {
  const cases: Array<{ locale: Locale; term: string; explanation: string }> = [
    { locale: "de", term: "VO2max", explanation: "deine maximale Sauerstoffaufnahme" },
    { locale: "en", term: "VO2max", explanation: "your maximum oxygen uptake" },
    { locale: "it", term: "VO2max", explanation: "il tuo consumo massimo di ossigeno" },
    { locale: "tr", term: "VO2max", explanation: "maksimum oksijen alımın" },
  ];

  for (const { locale, term, explanation } of cases) {
    it(`${locale}: injects parenthetical for naked "${term}"`, () => {
      const plan: { blocks: PlanBlock[] } = {
        blocks: [{ heading: "Test", items: [`Steiger dein ${term} durch Training.`] }],
      };
      const out = enforceGlossaryAndExamples(plan, locale);
      const item = (out.blocks[0] as Exclude<PlanBlock, WeeklyTablePlanBlock>).items[0];
      expect(item).toContain(`${term} (${explanation}`);
    });
  }

  it("de: does not double-inject when parenthetical already present", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        {
          heading: "Test",
          items: ["VO2max (deine maximale Sauerstoffaufnahme — zeigt wie fit dein Herz-Kreislauf-System ist) trainieren."],
        },
      ],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = (out.blocks[0] as Exclude<PlanBlock, WeeklyTablePlanBlock>).items[0];
    // Sollte unverändert sein — VO2max bereits mit Klammer, lookahead matched nicht
    expect(item).toBe(plan.blocks[0] && "items" in plan.blocks[0] ? plan.blocks[0].items[0] : "");
  });

  it("de: handles multiple terms in one text (longest-first matching)", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        {
          heading: "Test",
          items: ["Trainiere Zone 2 und Norwegian 4×4 Protocol für VO2max."],
        },
      ],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = (out.blocks[0] as Exclude<PlanBlock, WeeklyTablePlanBlock>).items[0];
    expect(item).toContain("Zone 2 (Tempo bei dem du noch sprechen kannst)");
    expect(item).toContain("Norwegian 4×4 Protocol (4× schnell laufen für 4 Min");
    expect(item).toContain("VO2max (deine maximale Sauerstoffaufnahme");
  });

  // ─── REGRESSION: Doppel-Klammer-Bug ───────────────────────────

  it("doppel-klammer-bug: Z2 ausserhalb + Zone 2 inside existing parens", () => {
    // Original AI-Output: Z2-Lauf hat eigene Klammer mit Zone 2-Erklärung
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Test",
        items: ["Z2-Lauf (Zone 2 - Tempo bei dem du noch sprechen kannst) + Mobility..."],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = (out.blocks[0] as Exclude<PlanBlock, WeeklyTablePlanBlock>).items[0];

    // Zone 2 innerhalb der existierenden Klammer DARF NICHT re-expanded werden
    expect(item).not.toMatch(/Zone 2 \(Tempo/);
    // Es darf nur EINE Klammer pro Begriff geben — keine Verschachtelung
    expect(item).not.toMatch(/\(\([^)]+\)/); // keine "((...)" Sequenz
    // Z2 ausserhalb der originalen Klammer darf einmal expandiert sein
    expect(item).toMatch(/Z2 \(Zone 2 — Tempo/);
    // Die originale AI-Klammer "(Zone 2 - Tempo bei dem du noch sprechen kannst)" muss intakt bleiben
    expect(item).toContain("(Zone 2 - Tempo bei dem du noch sprechen kannst)");
  });

  it("first-occurrence-only: VO2max in zwei Blocks bekommt nur EINMAL Klammer", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Block 1", items: ["Trainiere VO2max regelmäßig."] },
        { heading: "Block 2", items: ["Steiger dein VO2max weiter."] },
      ],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const allText = out.blocks
      .flatMap((b) => ("items" in b ? b.items : []))
      .join(" ");
    const explanationMatches = allText.match(/VO2max \(deine maximale Sauerstoffaufnahme/g) || [];
    expect(explanationMatches.length).toBe(1);
  });

  it("first-occurrence-only: VO2max zwei Mal im selben Item bekommt nur EINMAL Klammer", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Test",
        items: ["VO2max steigern. Dein VO2max liegt bei 42 ml/kg/min."],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = (out.blocks[0] as Exclude<PlanBlock, WeeklyTablePlanBlock>).items[0];
    const explanationMatches = item.match(/VO2max \(deine maximale Sauerstoffaufnahme/g) || [];
    expect(explanationMatches.length).toBe(1);
  });

  it("global-uniqueness: jeder Glossar-Begriff im Plan maximal EINMAL erklärt", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Block 1", items: ["VO2max in Z2 verbessern. Long Run am Sonntag."] },
        {
          kind: "weekly_table",
          heading: "Deine Woche",
          rows: [
            { day: "mon", action: "Easy Run Z2 — z.B. 30 Min", duration: "30 Min", why: "Basis" },
            { day: "tue", action: "Pause", duration: "—", why: "Erholung" },
            { day: "wed", action: "Tempo-Lauf — z.B. 25 Min", duration: "25 Min", why: "Schwelle" },
            { day: "thu", action: "Pause", duration: "—", why: "Erholung" },
            { day: "fri", action: "VO2max Intervalle — z.B. 5x3 Min schnell", duration: "30 Min", why: "Spitze" },
            { day: "sat", action: "Long Run — z.B. 60 Min", duration: "60 Min", why: "Ausdauer" },
            { day: "sun", action: "Pause", duration: "—", why: "Erholung" },
          ],
        },
        { heading: "Anker", items: ["VO2max-Check 1x/Monat. Z2 nicht überspringen."] },
      ],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const allText = JSON.stringify(out);
    // Jeder Begriff darf maximal 1× von seiner Erklärung gefolgt sein
    const vo2maxParens = (allText.match(/VO2max \(deine maximale Sauerstoffaufnahme/g) || []).length;
    const z2Parens = (allText.match(/Z2 \(Zone 2 — Tempo bei dem/g) || []).length;
    const longRunParens = (allText.match(/Long Run \(der längste Lauf der Woche/g) || []).length;
    const tempoParens = (allText.match(/Tempo-Lauf \(schnelles aber kontrolliertes/g) || []).length;
    expect(vo2maxParens).toBeLessThanOrEqual(1);
    expect(z2Parens).toBeLessThanOrEqual(1);
    expect(longRunParens).toBeLessThanOrEqual(1);
    expect(tempoParens).toBeLessThanOrEqual(1);
  });
});

// ─── 2. Score-Reference Auto-Replace ─────────────────────────────────

describe("enforceGlossaryAndExamples — Score-Reference Replace", () => {
  const phrases: Array<{ locale: Locale; input: string; expectedContains: string }> = [
    {
      locale: "de",
      input: "Dein Activity Score liegt bei 58/100 — solide Basis.",
      expectedContains: "Ausdauer-Niveau",
    },
    {
      locale: "en",
      input: "Your Recovery Score is at 45/100 — needs work.",
      expectedContains: "recovery level",
    },
    {
      locale: "it",
      input: "Il tuo Metabolic Score è a 60/100 — buona base.",
      expectedContains: "livello metabolico",
    },
    {
      locale: "tr",
      input: "Stress Score'un 70/100 — iyi seviye.",
      expectedContains: "stres seviyesi",
    },
  ];

  for (const { locale, input, expectedContains } of phrases) {
    it(`${locale}: replaces full score-phrase`, () => {
      const plan: { blocks: PlanBlock[] } = {
        blocks: [{ heading: "Status", items: [input] }],
      };
      const out = enforceGlossaryAndExamples(plan, locale);
      const item = (out.blocks[0] as Exclude<PlanBlock, WeeklyTablePlanBlock>).items[0];
      expect(item).toContain(expectedContains);
      expect(item).not.toMatch(/\d+\s*\/\s*100/);
    });
  }

  it("de: replaces bare 'Activity Score' name without number", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{ heading: "Test", items: ["Dein Activity Score ist solide."] }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = (out.blocks[0] as Exclude<PlanBlock, WeeklyTablePlanBlock>).items[0];
    expect(item).toContain("Ausdauer-Niveau");
    expect(item).not.toContain("Activity Score");
  });
});

// ─── 3. Quality-Validator ────────────────────────────────────────────

describe("validatePlanQuality", () => {
  const makeWeeklyTable = (): WeeklyTablePlanBlock => ({
    kind: "weekly_table",
    heading: "Deine Woche",
    rows: [
      { day: "mon", action: "Easy Run (lockerer Lauf) — z.B. 30 Min", duration: "30 Min", why: "Basis" },
      { day: "tue", action: "Mobility — z.B. Stretching 15 Min", duration: "15 Min", why: "Erholung" },
      { day: "wed", action: "Pause", duration: "—", why: "Erholung" },
      { day: "thu", action: "Tempo-Lauf (schnelles aber kontrolliertes Lauftempo)", duration: "25 Min", why: "Schwelle" },
      { day: "fri", action: "Krafttraining — z.B. Squats, Push-ups 3×10", duration: "30 Min", why: "Kraft" },
      { day: "sat", action: "Long Run (langer Lauf) — z.B. 60 Min", duration: "60 Min", why: "Ausdauer" },
      { day: "sun", action: "Pause", duration: "—", why: "Erholung" },
    ],
  });

  it("ok=true when all checks pass", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{ heading: "Status", items: ["Test"] }, makeWeeklyTable()],
    };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("fails when weekly_table is missing", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{ heading: "Status", items: ["Test"] }],
    };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("missing_weekly_table");
  });

  it("fails when weekly_table has 6 rows instead of 7", () => {
    const wt = makeWeeklyTable();
    wt.rows = wt.rows.slice(0, 6);
    const plan: { blocks: PlanBlock[] } = { blocks: [wt] };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("weekly_table_rows_count_6");
  });

  it("Pause-row exempt from z.B. mandate", () => {
    // Pause-Row mit "Pause" muss kein z.B. enthalten — sollte ok sein
    const plan: { blocks: PlanBlock[] } = { blocks: [makeWeeklyTable()] };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(true);
  });

  it("fails when action-row has no z.B. and no parens", () => {
    const wt = makeWeeklyTable();
    wt.rows[0] = { day: "mon", action: "Trainiere irgendwas", duration: "30 Min", why: "Basis" };
    const plan: { blocks: PlanBlock[] } = { blocks: [wt] };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("row_mon_no_example_or_explanation");
  });

  it("fails when score reference is present in any block text", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Status", items: ["Dein Activity Score liegt bei 58/100."] },
        makeWeeklyTable(),
      ],
    };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("score_reference_present");
  });

  it("fails when anchor-block item has no z.B. and no parens", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        {
          heading: "Deine täglichen Anker",
          items: ["Trink mehr Wasser.", "Bewege dich öfter."],
        },
        makeWeeklyTable(),
      ],
    };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("anchor_"))).toBe(true);
  });

  it("rows in wrong order fail validation", () => {
    const wt = makeWeeklyTable();
    [wt.rows[0], wt.rows[1]] = [wt.rows[1], wt.rows[0]];
    const plan: { blocks: PlanBlock[] } = { blocks: [wt] };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("wrong_day"))).toBe(true);
  });
});

// ─── 4. Glossar covers all 4 locales (key parity) ────────────────────

describe("PLAN_GLOSSARY locale parity", () => {
  it("all 4 locales carry the core Glossar terms", async () => {
    const { PLAN_GLOSSARY, EXAMPLE_MARKER, PAUSE_PATTERN } = await import(
      "@/lib/plan/glossary"
    );
    const requiredTerms = ["VO2max", "Z2", "Zone 2", "HRmax", "Long Run", "Mobility"];
    for (const loc of ["de", "en", "it", "tr"] as const) {
      expect(EXAMPLE_MARKER[loc]).toBeTruthy();
      expect(PAUSE_PATTERN[loc]).toBeInstanceOf(RegExp);
      for (const term of requiredTerms) {
        expect(PLAN_GLOSSARY[loc][term]).toBeTruthy();
      }
    }
  });
});
