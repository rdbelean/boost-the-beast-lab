import { describe, expect, it } from "vitest";
import {
  validateReport,
  buildAnchorCandidates,
  countAnchors,
  sumDailyProtocolTime,
  TIME_BUDGET_CAP,
} from "@/lib/reports/validators";
import { scanBanlist } from "@/lib/reports/banlist";
import type { ReportJSON } from "@/lib/reports/schemas/report-output";

import { beginnerContext } from "../fixtures/profiles/beginner";
import { athleteContext } from "../fixtures/profiles/athlete";
import { founderContext } from "../fixtures/profiles/founder";
import { metabolicContext } from "../fixtures/profiles/metabolic";

// ─── Helpers ────────────────────────────────────────────────────────────

function buildBaseReport(overrides: Partial<ReportJSON> = {}): ReportJSON {
  const base: ReportJSON = {
    headline: "placeholder",
    executive_summary: "placeholder",
    modules: {
      sleep: { key_finding: "x", recommendation: "y" },
      recovery: { key_finding: "x", recommendation: "y" },
      activity: { key_finding: "x", recommendation: "y" },
      metabolic: { key_finding: "x", recommendation: "y" },
      stress: { key_finding: "x", recommendation: "y" },
      vo2max: { key_finding: "x", recommendation: "y" },
    },
    top_priority: "placeholder",
    prognose_30_days: "placeholder",
    disclaimer: "placeholder",
    _meta: {
      stage: "writer",
      generation_id: "test-gen-id",
      section_evidence_refs: {},
    },
  };
  return { ...base, ...overrides, modules: { ...base.modules, ...(overrides.modules ?? {}) } };
}

// ─── 1. Schema validation ───────────────────────────────────────────────

describe("validateReport — schema", () => {
  it("rejects a non-object", () => {
    const r = validateReport("not a report" as unknown, beginnerContext);
    expect(r.ok).toBe(false);
    expect(r.scores.schema_ok).toBe(false);
    expect(r.parsed).toBeNull();
  });

  it("rejects when required fields are missing", () => {
    const r = validateReport({ headline: "x" }, beginnerContext);
    expect(r.ok).toBe(false);
    expect(r.scores.schema_ok).toBe(false);
    expect(r.errors.some((e) => e.kind === "schema_invalid")).toBe(true);
  });

  it("accepts a minimally valid ReportJSON", () => {
    const r = validateReport(buildBaseReport(), beginnerContext);
    expect(r.scores.schema_ok).toBe(true);
    expect(r.parsed).not.toBeNull();
  });
});

// ─── 2. Anchor coverage ─────────────────────────────────────────────────

describe("validateReport — anchor coverage", () => {
  it("flags missing anchors when sections are generic prose", () => {
    const generic = buildBaseReport({
      executive_summary:
        "Allgemein gesehen ist Bewegung wichtig und Schlaf hilft beim Wohlbefinden.",
    });
    const r = validateReport(generic, beginnerContext);
    const missing = r.errors.filter((e) => e.kind === "missing_anchor");
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.some((e) => e.section === "executive_summary")).toBe(true);
  });

  it("passes anchor count when ctx values appear verbatim", () => {
    // Beginner ctx: sleep_duration_hours=5.8, daily_steps=4200, stress=8,
    // sitting=9, sleep_score < 40 (we don't hardcode the exact score).
    const sleepScore = beginnerContext.scoring.result.sleep.sleep_score_0_100;
    const stressScore = beginnerContext.scoring.result.stress.stress_score_0_100;
    const r = validateReport(
      buildBaseReport({
        executive_summary: `Mit nur 5.8 Stunden Schlaf und 4200 Schritten am Tag bei einem Sleep-Score von ${sleepScore} und Stress ${stressScore} liegt die Belastung über der Erholungskapazität.`,
        modules: {
          sleep: { key_finding: `Sleep-Score ${sleepScore} bei 5.8 h Schlafdauer.` },
          recovery: { key_finding: `Recovery-Score ${beginnerContext.scoring.result.recovery.recovery_score_0_100} mit Sleep-Multiplikator ${beginnerContext.scoring.result.recovery.sleep_multiplier}.` },
          activity: { key_finding: `Activity-Score ${beginnerContext.scoring.result.activity.activity_score_0_100} bei 4200 Schritten.` },
          metabolic: { key_finding: `Metabolic-Score ${beginnerContext.scoring.result.metabolic.metabolic_score_0_100} mit BMI ${beginnerContext.scoring.result.metabolic.bmi}.` },
          stress: { key_finding: `Stress-Score ${stressScore} bei selbstberichtetem Level 8.` },
          vo2max: { key_finding: `VO2max-Score ${beginnerContext.scoring.result.vo2max.fitness_score_0_100} bei geschätzten ${beginnerContext.scoring.result.vo2max.vo2max_estimated} ml/kg/min.` },
        },
        top_priority: `Sleep-Score ${sleepScore} ist der schwächste Hebel — 5.8 h sind unter dem Bedarf.`,
        systemic_connections_overview: `Sleep ${sleepScore} koppelt an Recovery ${beginnerContext.scoring.result.recovery.recovery_score_0_100}.`,
        prognose_30_days: `Mit konsequenter Bewegung kann der Activity-Score ${beginnerContext.scoring.result.activity.activity_score_0_100} steigen.`,
      }),
      beginnerContext,
    );
    const missing = r.errors.filter((e) => e.kind === "missing_anchor");
    expect(missing).toEqual([]);
    expect(r.scores.anchor_coverage_pct).toBe(100);
  });
});

describe("countAnchors", () => {
  it("matches integer values exactly", () => {
    const candidates = buildAnchorCandidates(beginnerContext);
    expect(countAnchors("4200 Schritte", candidates)).toBe(1);
    expect(countAnchors("4201 Schritte", candidates)).toBe(0);
  });

  it("matches floats with ±0.1 tolerance", () => {
    const candidates = buildAnchorCandidates(beginnerContext);
    // sleep_duration_hours = 5.8 — try 5.85 (within 0.1) and 6.0 (outside).
    expect(countAnchors("5.85 hours", candidates)).toBe(1);
    expect(countAnchors("6.0 hours", candidates)).toBe(0);
  });

  it("matches comma-decimal locale numbers", () => {
    const candidates = buildAnchorCandidates(beginnerContext);
    expect(countAnchors("5,8 Stunden", candidates)).toBe(1);
  });

  it("matches whole-word tokens case-insensitively", () => {
    const candidates = buildAnchorCandidates(beginnerContext);
    // sleep_quality_label_localized = "schlecht"
    expect(countAnchors("Schlafqualität schlecht", candidates)).toBe(1);
    // partial word should not count
    expect(countAnchors("Schlafqualitätschlechtigkeit", candidates)).toBe(0);
  });
});

// ─── 3. Banlist ─────────────────────────────────────────────────────────

describe("scanBanlist", () => {
  const GENERIC_DE = [
    "Es ist wichtig, dass du genug Schlaf bekommst.",
    "Du solltest versuchen, mehr Wasser zu trinken.",
    "Es kann hilfreich sein, regelmäßig zu trainieren.",
    "Achte darauf, dass deine Mahlzeiten ausgewogen sind.",
    "Vergiss nicht, dich zu bewegen.",
    "Denk daran, Pausen einzulegen.",
    "Ein gesunder Lebensstil bringt Energie.",
    "Balance ist der Schlüssel zu langfristigem Erfolg.",
    "Höre auf deinen Körper.",
    "Alles in Maßen ist die beste Strategie.",
  ];
  const EVIDENCE_DE = [
    "Bei 5.8 Stunden Schlaf liegt der Sleep-Score bei 38.",
    "Mit 4200 Schritten und 9 Stunden Sitzen ist sitting_critical aktiv.",
    "Stress-Level 8 koppelt an Recovery-Score 41 — die HPA-Achse ist überlastet.",
    "Der BMI von 27.6 platziert dich in der Kategorie 'overweight'.",
    "Bei 0 Trainingstagen pro Woche ist der MET-Wert unter 600.",
    "Morning-Recovery 3 von 10 zeigt, dass die Erholung nicht ausreicht.",
    "VO2max 32 ml/kg/min entspricht der Band 'Poor' für deine Altersgruppe.",
    "Wassermenge 1.0 Liter liegt unter der Bedarfsgrenze von 2.0 Liter.",
    "Sleep-Multiplikator 0.7 zieht den Recovery-Score nach unten.",
    "Stress-Score 33 mit Sleep-Buffer −5 ist ein klares Defizit.",
  ];

  it.each(GENERIC_DE)("flags generic DE phrase: %s", (phrase) => {
    const hits = scanBanlist("executive_summary", phrase, "de");
    expect(hits.length).toBeGreaterThan(0);
  });

  it.each(EVIDENCE_DE)("passes evidence-based DE phrase: %s", (phrase) => {
    const hits = scanBanlist("executive_summary", phrase, "de");
    expect(hits).toEqual([]);
  });
});

describe("validateReport — banlist integration", () => {
  it("flags banlist hit in headline as repair-required (strict section)", () => {
    const r = validateReport(
      buildBaseReport({ headline: "Es ist wichtig, dass du genug Schlaf bekommst." }),
      beginnerContext,
    );
    expect(r.errors.some((e) => e.kind === "banlist_hit" && e.section === "headline")).toBe(true);
    expect(r.repair_target_sections).toContain("headline");
  });
});

// ─── 4. Time budget ─────────────────────────────────────────────────────

describe("validateReport — time budget", () => {
  it("flags total daily time over the personalization cap", () => {
    // beginner has time_budget=minimal, cap = 20 min
    const r = validateReport(
      buildBaseReport({
        daily_life_protocol: {
          morning: [{ habit: "Habit A", why_specific_to_user: "x", time_cost_min: 10 }],
          work_day: [{ habit: "Habit B", why_specific_to_user: "x", time_cost_min: 10 }],
          evening: [{ habit: "Habit C", why_specific_to_user: "x", time_cost_min: 10 }],
        },
      }),
      beginnerContext,
    );
    expect(r.scores.time_budget_ok).toBe(false);
    expect(r.errors.some((e) => e.kind === "time_budget_violated")).toBe(true);
    expect(r.repair_target_sections).toContain("daily_life_protocol");
  });

  it("passes when total daily time fits the cap", () => {
    const r = validateReport(
      buildBaseReport({
        daily_life_protocol: {
          morning: [{ habit: "5min mobility", why_specific_to_user: "x", time_cost_min: 5 }],
          work_day: [{ habit: "10min walk", why_specific_to_user: "x", time_cost_min: 10 }],
        },
      }),
      beginnerContext,
    );
    expect(r.scores.time_budget_ok).toBe(true);
  });

  it("respects athlete cap (80 min)", () => {
    expect(TIME_BUDGET_CAP.athlete).toBe(80);
    expect(TIME_BUDGET_CAP.minimal).toBe(20);
  });
});

describe("sumDailyProtocolTime", () => {
  it("sums across all four buckets", () => {
    const r = buildBaseReport({
      daily_life_protocol: {
        morning: [{ habit: "x", why_specific_to_user: "y", time_cost_min: 5 }],
        work_day: [{ habit: "x", why_specific_to_user: "y", time_cost_min: 7 }],
        evening: [{ habit: "x", why_specific_to_user: "y", time_cost_min: 3 }],
        nutrition_micro: [{ habit: "x", why_specific_to_user: "y", time_cost_min: 4 }],
      },
    });
    expect(sumDailyProtocolTime(r)).toBe(19);
  });

  it("returns 0 when daily_life_protocol is undefined", () => {
    expect(sumDailyProtocolTime(buildBaseReport())).toBe(0);
  });
});

// ─── 5. Report-type conformance ─────────────────────────────────────────

describe("validateReport — report_type conformance", () => {
  it("flags a metabolic-type report whose headline ignores metabolic", () => {
    const r = validateReport(
      buildBaseReport({
        headline: "Schlaf ist die Priorität",
        executive_summary: "Bei 7.2 h Schlaf und 5400 Schritten ist die Erholung der Hebel.",
        top_priority: "Sleep-Score zuerst.",
      }),
      metabolicContext,
    );
    expect(r.scores.report_type_ok).toBe(false);
    expect(r.errors.some((e) => e.kind === "wrong_report_type")).toBe(true);
  });

  it("passes when metabolic-type report foregrounds metabolic", () => {
    const r = validateReport(
      buildBaseReport({
        headline: "Stoffwechsel ist dein Hauptziel",
        executive_summary: "Metabolic-Score 60 mit BMI 27.9 — Stoffwechsel ist der Hebel.",
        top_priority: "Metabolic zuerst — BMI 27.9 zeigt Hand­lungsbedarf.",
      }),
      metabolicContext,
    );
    expect(r.scores.report_type_ok).toBe(true);
  });

  it("always passes for a complete-type report", () => {
    const r = validateReport(buildBaseReport(), athleteContext);
    expect(r.scores.report_type_ok).toBe(true);
  });
});

// ─── 6. Daily-protocol no training ──────────────────────────────────────

describe("validateReport — daily_life_protocol no training", () => {
  it("flags HIIT mention", () => {
    const r = validateReport(
      buildBaseReport({
        daily_life_protocol: {
          morning: [{ habit: "10min HIIT-Workout", why_specific_to_user: "x", time_cost_min: 10 }],
        },
      }),
      beginnerContext,
    );
    expect(r.scores.daily_protocol_clean).toBe(false);
    expect(r.errors.some((e) => e.kind === "training_in_daily_protocol")).toBe(true);
  });

  it("flags Zone-2 mention", () => {
    const r = validateReport(
      buildBaseReport({
        daily_life_protocol: {
          evening: [{ habit: "Zone 2 Cardio", why_specific_to_user: "x", time_cost_min: 8 }],
        },
      }),
      founderContext,
    );
    expect(r.scores.daily_protocol_clean).toBe(false);
  });

  it("flags 5x5 set-rep-scheme mention", () => {
    const r = validateReport(
      buildBaseReport({
        daily_life_protocol: {
          work_day: [{ habit: "5x5 Squats", why_specific_to_user: "x", time_cost_min: 5 }],
        },
      }),
      athleteContext,
    );
    expect(r.scores.daily_protocol_clean).toBe(false);
  });

  it("passes for non-training habits", () => {
    const r = validateReport(
      buildBaseReport({
        daily_life_protocol: {
          morning: [{ habit: "Wasser direkt nach dem Aufstehen", why_specific_to_user: "Bei 1.0 L/Tag", time_cost_min: 1 }],
          work_day: [{ habit: "Sitzpause alle 60 Min", why_specific_to_user: "9 h Sitzen", time_cost_min: 5 }],
        },
      }),
      beginnerContext,
    );
    expect(r.scores.daily_protocol_clean).toBe(true);
  });
});

// ─── Cross-fixture sanity ───────────────────────────────────────────────

describe("fixtures — sanity", () => {
  it("all 4 fixtures build without throwing and carry distinct scoring", () => {
    const scores = [
      beginnerContext.scoring.result.overall_score_0_100,
      athleteContext.scoring.result.overall_score_0_100,
      founderContext.scoring.result.overall_score_0_100,
      metabolicContext.scoring.result.overall_score_0_100,
    ];
    expect(new Set(scores).size).toBeGreaterThan(1);
  });

  it("beginner has low sleep + high stress (sitting_critical / hpa_axis)", () => {
    expect(beginnerContext.scoring.result.sleep.sleep_score_0_100).toBeLessThan(50);
    expect(beginnerContext.scoring.result.stress.stress_score_0_100).toBeLessThan(50);
    expect(beginnerContext.flags.sitting_critical).toBe(true);
  });

  it("athlete is flagged for overtraining_risk", () => {
    expect(athleteContext.flags.overtraining_risk).toBe(true);
  });

  it("founder shows sitting_critical despite 11k steps", () => {
    expect(founderContext.flags.sitting_critical).toBe(true);
    expect(founderContext.raw.daily_steps).toBe(11000);
  });

  it("metabolic profile lands in BMI overweight category", () => {
    expect(metabolicContext.scoring.result.metabolic.bmi_category).toBe("overweight");
  });
});
