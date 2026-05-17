import { describe, expect, it } from "vitest";
import {
  enforceGlossaryAndExamples,
  validatePlanQuality,
  dedicatedSectionsRequirement,
  type PlanBlock,
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
      expect(out.blocks[0].items[0]).toContain(`${term} (${explanation}`);
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
    expect(out.blocks[0].items[0]).toBe(plan.blocks[0].items[0]);
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
    const item = out.blocks[0].items[0];
    expect(item).toContain("Zone 2 (Tempo bei dem du noch sprechen kannst)");
    expect(item).toContain("Norwegian 4×4 Protocol (4× schnell laufen für 4 Min");
    expect(item).toContain("VO2max (deine maximale Sauerstoffaufnahme");
  });

  // ─── REGRESSION: Doppel-Klammer-Bug ───────────────────────────

  it("doppel-klammer-bug: Z2 ausserhalb + Zone 2 inside existing parens", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Test",
        items: ["Z2-Lauf (Zone 2 - Tempo bei dem du noch sprechen kannst) + Mobility..."],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = out.blocks[0].items[0];

    expect(item).not.toMatch(/Zone 2 \(Tempo/);
    expect(item).not.toMatch(/\(\([^)]+\)/);
    expect(item).toMatch(/Z2 \(Zone 2 — Tempo/);
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
    const allText = out.blocks.flatMap((b) => b.items).join(" ");
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
    const item = out.blocks[0].items[0];
    const explanationMatches = item.match(/VO2max \(deine maximale Sauerstoffaufnahme/g) || [];
    expect(explanationMatches.length).toBe(1);
  });

  // ─── Pre-Clean: AI-pre-injected Doppel-Kollaps ────────────────

  it("pre-clean: collapses AI-pre-injected duplicate glossary in parens (Zone 2)", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Test",
        items: ["Zone 2 (Zone 2 - Tempo bei dem du noch sprechen kannst, RPE 2-3): 20-40 Min lockeres Gehen"],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = out.blocks[0].items[0];
    // Inner doppel "Zone 2" innerhalb der Klammer ist weg
    expect(item).not.toMatch(/Zone 2 \(Zone 2/);
    // Klammer-Inhalt ist erhalten (ohne den duplizierten Term-Prefix)
    expect(item).toContain("Zone 2 (Tempo bei dem du noch sprechen kannst, RPE 2-3)");
  });

  // ─── Heading-Gate ─────────────────────────────────────────────

  it("heading-gate: does NOT inject glossary into headings", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Mobility & Active Recovery",
        items: ["Test mit Mobility-Übungen für die Hüfte"],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    // Heading bleibt komplett unverändert — kein "(Beweglichkeitsübungen...)" injected
    expect(out.blocks[0].heading).toBe("Mobility & Active Recovery");
    // Body bekommt Glossar weiterhin
    expect(out.blocks[0].items[0]).toContain("Mobility (Beweglichkeitsübungen");
  });

  it("heading-gate: Score-Replace still runs in heading (no glossary, but score-name → -level)", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Dein Activity Score liegt bei 92/100",
        items: ["Body-Item ohne Glossar-Trigger"],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    // Score-Replace MUSS in Headings laufen
    expect(out.blocks[0].heading).toContain("Ausdauer-Niveau");
    expect(out.blocks[0].heading).not.toContain("Activity Score");
    expect(out.blocks[0].heading).not.toMatch(/\d+\s*\/\s*100/);
  });

  it("global-uniqueness: jeder Glossar-Begriff im Plan maximal EINMAL erklärt", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Block 1", items: ["VO2max in Z2 verbessern. Long Run am Sonntag."] },
        { heading: "Block 2", items: ["Tempo-Lauf integrieren. VO2max-Intervalle 1×/Woche."] },
        { heading: "Anker", items: ["VO2max-Check 1x/Monat. Z2 nicht überspringen."] },
      ],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const allText = JSON.stringify(out);
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
      const item = out.blocks[0].items[0];
      expect(item).toContain(expectedContains);
      expect(item).not.toMatch(/\d+\s*\/\s*100/);
    });
  }

  it("de: replaces bare 'Activity Score' name without number", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{ heading: "Test", items: ["Dein Activity Score ist solide."] }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = out.blocks[0].items[0];
    expect(item).toContain("Ausdauer-Niveau");
    expect(item).not.toContain("Activity Score");
  });
});

// ─── 3. Quality-Validator ────────────────────────────────────────────

describe("validatePlanQuality", () => {
  it("ok=true on a clean legacy-blocks plan", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Status", items: ["Test"] },
        { heading: "Protokoll", items: ["Schritt 1 — z.B. konkret."] },
      ],
    };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("fails when score reference is present in any block text", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Status", items: ["Dein Activity Score liegt bei 58/100."] },
        { heading: "Protokoll", items: ["Schritt 1 — z.B. konkret."] },
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
      ],
    };
    const result = validatePlanQuality(plan, "de");
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("anchor_"))).toBe(true);
  });

  it("fails when dedicated-sections requirement is unmet (3 values → need 4 blocks, got 2)", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Status", items: ["Test"] },
        { heading: "Stress consolidated", items: ["job/family/finances combined"] },
      ],
    };
    const result = validatePlanQuality(plan, "de", {
      dedicatedSections: { count: 3, values: ["job", "family", "finances"], field: "stress_source" },
    });
    expect(result.ok).toBe(false);
    expect(
      result.reasons.some((r) => r.startsWith("dedicated_sections_expected_4_got_2_values_job|family|finances")),
    ).toBe(true);
  });

  it("passes when dedicated-sections requirement is met (3 values → 4 blocks)", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Status", items: ["Test"] },
        { heading: "Job protocol", items: ["item — z.B. x"] },
        { heading: "Family protocol", items: ["item — z.B. y"] },
        { heading: "Finances protocol", items: ["item — z.B. z"] },
      ],
    };
    const result = validatePlanQuality(plan, "de", {
      dedicatedSections: { count: 3, values: ["job", "family", "finances"], field: "stress_source" },
    });
    expect(result.ok).toBe(true);
  });

  it("skips dedicated-sections check when count < 2", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{ heading: "Status", items: ["Test"] }],
    };
    const result = validatePlanQuality(plan, "de", {
      dedicatedSections: { count: 1, values: ["job"], field: "stress_source" },
    });
    expect(result.ok).toBe(true);
  });
});

// ─── 3b. dedicatedSectionsRequirement helper ─────────────────────────

describe("dedicatedSectionsRequirement", () => {
  it("stress plan → uses stress_source", () => {
    const r = dedicatedSectionsRequirement("stress", { stress_source: ["job", "family"] });
    expect(r).toEqual({ count: 2, values: ["job", "family"], field: "stress_source" });
  });

  it("recovery plan → uses recovery_ritual", () => {
    const r = dedicatedSectionsRequirement("recovery", { recovery_ritual: ["sport", "nature"] });
    expect(r).toEqual({ count: 2, values: ["sport", "nature"], field: "recovery_ritual" });
  });

  it("metabolic plan → uses nutrition_painpoint", () => {
    const r = dedicatedSectionsRequirement("metabolic", {
      nutrition_painpoint: ["cravings_evening", "low_protein", "no_time"],
    });
    expect(r).toEqual({
      count: 3,
      values: ["cravings_evening", "low_protein", "no_time"],
      field: "nutrition_painpoint",
    });
  });

  it("activity plan → null (no dedicated sections enforced)", () => {
    const r = dedicatedSectionsRequirement("activity", { nutrition_painpoint: ["cravings_evening"] });
    expect(r).toBeNull();
  });

  it('filters out "none" values', () => {
    const r = dedicatedSectionsRequirement("stress", { stress_source: ["job", "none", "family"] });
    expect(r).toEqual({ count: 2, values: ["job", "family"], field: "stress_source" });
  });

  it("returns null when only \"none\" selected", () => {
    const r = dedicatedSectionsRequirement("stress", { stress_source: ["none"] });
    expect(r).toBeNull();
  });

  it("returns null when field is empty", () => {
    const r = dedicatedSectionsRequirement("stress", { stress_source: [] });
    expect(r).toBeNull();
  });

  it("returns null when field is undefined", () => {
    const r = dedicatedSectionsRequirement("stress", {});
    expect(r).toBeNull();
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
