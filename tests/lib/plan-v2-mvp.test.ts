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

  it("doppel-klammer-bug: Z2 in Kompositum + Zone 2 inside existing parens", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Test",
        items: ["Z2-Lauf (Zone 2 - Tempo bei dem du noch sprechen kannst) + Mobility..."],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = out.blocks[0].items[0];

    // Compound-Protection (Commit 3): "Z2" in "Z2-Lauf" wird NICHT expandiert,
    // damit das Pattern nicht "Cortisol-Awakening-Response" → "Cortisol (...)−Awakening"
    // mid-compound zerbricht. "Z2" bekommt seine Erklärung erst wenn es standalone
    // im Text auftaucht (selbe Glossar-Logik gilt für Komposita generell).
    expect(item).not.toMatch(/Zone 2 \(Tempo/);
    expect(item).not.toMatch(/\(\([^)]+\)/);
    expect(item).not.toMatch(/Z2 \(Zone 2 — Tempo/); // VORHER expected, jetzt NICHT mehr durch Compound-Protection
    expect(item).toContain("(Zone 2 - Tempo bei dem du noch sprechen kannst)"); // AI-Klammer bleibt unangetastet
    expect(item).toContain("Z2-Lauf"); // Kompositum bleibt intakt
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

  // ─── Compound-Word-Protection ─────────────────────────────────

  it("compound-protection: does NOT inject glossary mid-compound (Cortisol-Awakening-Response)", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Test",
        items: ["Die Cortisol-Awakening-Response ist morgens am höchsten."],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    // Kein "(Stresshormon - ...)" mitten im Kompositum
    expect(out.blocks[0].items[0]).toBe("Die Cortisol-Awakening-Response ist morgens am höchsten.");
  });

  it("compound-protection: DOES inject glossary on standalone term outside compound", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{
        heading: "Test",
        items: ["Cortisol ist das primäre Stresshormon im Körper."],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    expect(out.blocks[0].items[0]).toContain("Cortisol (Stresshormon");
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
        items: ["Mobility verbessert die Beweglichkeit der Hüfte."],
      }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    // Heading bleibt komplett unverändert — kein "(Beweglichkeitsübungen...)" injected
    expect(out.blocks[0].heading).toBe("Mobility & Active Recovery");
    // Body bekommt Glossar weiterhin (standalone "Mobility", kein Kompositum)
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

// ─── 1b. Phase-2a Bug-Klassen Regression ─────────────────────────────

describe("Phase-2a glossary bug fixes", () => {
  // Klasse 3 — Zone 4 fehlte im Glossar → "Zone 3/4" bekam Zone-3-Erklärung
  // doppelt/falsch. Standalone "Zone 4" / "Z4" muss jetzt eine EIGENE,
  // korrekte Erklärung bekommen.
  it("klasse-3: standalone Zone 4 and Z4 get their own correct explanation (de)", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Test", items: ["Vermeide Zone 4 im Grundlagentraining."] },
        { heading: "Intervalle", items: ["Halte Z4 kurz und kontrolliert."] },
      ],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    expect(out.blocks[0].items[0]).toContain("Zone 4 (hartes Tempo");
    expect(out.blocks[1].items[0]).toContain("Z4 (Zone 4 — hartes Tempo");
  });

  it("klasse-3: Zone 4 entry exists in all 4 locales", async () => {
    const { PLAN_GLOSSARY } = await import("@/lib/plan/glossary");
    for (const loc of ["de", "en", "it", "tr"] as const) {
      expect(PLAN_GLOSSARY[loc]["Zone 4"]).toBeTruthy();
      expect(PLAN_GLOSSARY[loc]["Z4"]).toBeTruthy();
    }
  });

  // Klasse 2 — Score-Regex schluckte ein öffnendes "(" → verwaistes ")".
  // "Stress-Score (30/100, hoch)" darf KEINE verwaiste ")" hinterlassen.
  it("klasse-2: score-replace leaves no orphan closing paren", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{ heading: "Status", items: ["Dein Stress-Score (30/100, hoch) ist limitierend."] }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = out.blocks[0].items[0];
    expect(item).toContain("Stress-Niveau");
    expect(item).not.toMatch(/\d+\s*\/\s*100/);
    // No orphan ")" — every ")" must have a matching "("
    let depth = 0;
    for (const ch of item) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });

  // Klasse 4 — wenn die KI bereits "TERM (...)" schreibt, darf ein späteres
  // nacktes Vorkommen NICHT erneut injiziert werden (Dedup-Lücke).
  it("klasse-4: AI-pre-explained term is not re-injected on a later naked occurrence", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [
        { heading: "Block 1", items: ["NEAT (Alltagsbewegung außerhalb vom Training — Treppen, Laufen, Stehen) ist zentral."] },
        { heading: "Block 2", items: ["NEAT verbessert deinen Gesamtumsatz."] },
      ],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const allText = out.blocks.flatMap((b) => b.items).join(" ");
    const matches = allText.match(/NEAT \(Alltagsbewegung/g) || [];
    expect(matches.length).toBe(1);
  });

  // Klasse 1 — dash-lose AI-Dubletten "TERM (TERM ...)" und Doppel-Klammern
  // müssen kollabieren; finaler Output balanciert.
  it("klasse-1: collapses dash-less AI-pre-injected duplicate (Zone 2)", () => {
    const plan: { blocks: PlanBlock[] } = {
      blocks: [{ heading: "Test", items: ["Trainiere Zone 2 (Zone 2 Tempo bei dem du noch sprechen kannst)."] }],
    };
    const out = enforceGlossaryAndExamples(plan, "de");
    const item = out.blocks[0].items[0];
    expect(item).not.toMatch(/Zone 2 \(Zone 2/);
    expect(item).toContain("Zone 2 (Tempo bei dem du noch sprechen kannst)");
  });
});

// ─── 1c. Recovery-Prompt cleanliness (no Stress-Plan-Bleed) ──────────

describe("Recovery prompt — Stress-Plan-Bleed cleanliness", () => {
  it("does NOT name 'Allostatic Load' (or locale equivalents) in any Recovery-Plan branch", async () => {
    // The legitimate Stress-Plan-Branch uses these terms (chronic stress
    // domain) — we test that they do NOT appear in any Recovery-Plan branch
    // (those bleed into Block 1 / Block 2 of Recovery PDFs and break the
    // Stress↔Recovery trennlinie). We grep the full-prompts.ts file content
    // and verify each Recovery-Branch (per locale) is clean.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "lib/plan/prompts/full-prompts.ts"),
      "utf8",
    );

    // Extract Recovery-Branches per locale via simple regex: from
    // `if (type === "recovery") {` until the next `}` at the same level.
    // Heuristic: we use the RECOVERY-PLAN STRUCTURE marker as anchor and
    // grab the trailing template-literal until the closing backtick.
    const branches = content.matchAll(
      /RECOVERY-PLAN STRUCTURE[\s\S]*?`;/g,
    );

    const forbidden = [
      /Allostatic Load/i,
      /allostatic load/i,
      /carico allostatico/i,
      /allostatik yük/i,
    ];

    let count = 0;
    for (const m of branches) {
      count++;
      for (const term of forbidden) {
        expect(m[0]).not.toMatch(term);
      }
    }
    expect(count).toBe(4); // 4 locales: DE/EN/IT/TR
  });
});

// ─── 1d. Recovery prompt — weekday/format cleanliness ────────────────

describe("Recovery prompt — structural guarantees", () => {
  const loadBranches = async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "lib/plan/prompts/full-prompts.ts"),
      "utf8",
    );
    return [...content.matchAll(/RECOVERY-PLAN STRUCTURE[\s\S]*?`;/g)].map(
      (m) => m[0],
    );
  };

  it("recovery prompt contains no weekday proper-noun literals (4 locales)", async () => {
    // Unicode-aware boundary: standard \b fails on diacritics (Lunedì,
    // Çarşamba), so we use Unicode-letter lookarounds. This matches
    // weekday names even in hyphen-/space-separated compounds like
    // "Samstag-Morgen", "Saturday-morning", "domenica pomeriggio",
    // "Cumartesi sabahı" — verified manually before writing this test.
    const weekdayPatterns = [
      /(?<![\p{L}])(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)(?![\p{L}])/iu,
      /(?<![\p{L}])(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?![\p{L}])/iu,
      /(?<![\p{L}])(Lunedì|Martedì|Mercoledì|Giovedì|Venerdì|Sabato|Domenica)(?![\p{L}])/iu,
      /(?<![\p{L}])(Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar)(?![\p{L}])/iu,
    ];
    const branches = await loadBranches();
    expect(branches.length).toBe(4);
    for (const branch of branches) {
      for (const rx of weekdayPatterns) {
        expect(branch).not.toMatch(rx);
      }
    }
  });

  it("recovery prompt references the Master Weekly Plan as the weekday authority", async () => {
    const branches = await loadBranches();
    for (const branch of branches) {
      expect(branch).toMatch(
        /Master-Wochenplan|Master Weekly Plan/i,
      );
    }
  });

  it("recovery prompt includes the abbreviation-doubling format constraint", async () => {
    const branches = await loadBranches();
    for (const branch of branches) {
      expect(branch).toMatch(
        /ABKÜRZUNGS-DOPPEL|AVOID ABBREVIATION DOUBLING|RADDOPPIO DELL'ABBREVIAZIONE|KISALTMA-İKİLEMESİNDEN KAÇIN/i,
      );
    }
  });

  it("recovery prompt ends with explicit cross-plan delimitation referencing all four other plans", async () => {
    const branches = await loadBranches();
    for (const branch of branches) {
      expect(branch).toMatch(/Activity[-\s]?[Pp]lan|Activity planı|Activity plan/i);
      expect(branch).toMatch(/Metabolic[-\s]?[Pp]lan|Metabolic planı|Metabolic plan/i);
      expect(branch).toMatch(/Stress[-\s]?[Pp]lan|Stres planı|Stress plan/i);
      expect(branch).toMatch(/Master[-\s]?Wochenplan|Master Weekly Plan/i);
    }
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
