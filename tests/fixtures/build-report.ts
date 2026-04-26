// Test helper: hand-build a valid ReportJSON anchored on a real
// ReportContext. Used to feed the mock Anthropic client a deterministic
// Writer response so the pipeline (and the deterministic validator)
// can be exercised without a live Anthropic call.
//
// Each section cites enough ctx values to satisfy REQUIRED_ANCHORS in
// validators.ts (executive_summary 3, modules 2 each, top_priority 2,
// systemic_overview 2, prognose_30_days 1).

import { randomUUID } from "node:crypto";
import type { ReportContext } from "@/lib/reports/report-context";
import type { ReportJSON } from "@/lib/reports/schemas/report-output";
import { DISCLAIMER } from "@/lib/report/prompts/v4/disclaimer";

export function buildValidReportFor(ctx: ReportContext): ReportJSON {
  const r = ctx.scoring.result;
  const sleepScore = r.sleep.sleep_score_0_100;
  const recoveryScore = r.recovery.recovery_score_0_100;
  const activityScore = r.activity.activity_score_0_100;
  const metabolicScore = r.metabolic.metabolic_score_0_100;
  const stressScore = r.stress.stress_score_0_100;
  const vo2Score = r.vo2max.fitness_score_0_100;
  const overallScore = r.overall_score_0_100;
  const sleepDur = ctx.raw.sleep_duration_hours;
  const dailySteps = ctx.raw.daily_steps ?? 0;
  const sittingH = ctx.raw.sitting_hours_per_day;
  const stress = ctx.raw.stress_level_1_10;
  const morningRec = ctx.raw.morning_recovery_1_10;
  const bmi = r.metabolic.bmi;
  const totalMet = r.activity.total_met_minutes_week;
  const reportType = ctx.meta.report_type;

  // report_type emphasis tokens — matches validator's locale-aware
  // checkReportTypeConformance heuristic.
  const reportTypeToken =
    reportType === "metabolic"
      ? "Stoffwechsel"
      : reportType === "recovery"
        ? "Regeneration"
        : "umfassend";

  // ── headline ──
  const headline = `Sleep-Score ${sleepScore}, Activity-Score ${activityScore} — ${reportTypeToken}-Fokus mit BMI ${bmi}.`;

  // ── executive_summary (≥3 anchors) ──
  const executive_summary = `Bei ${sleepDur} h Schlaf, ${dailySteps} Schritten und ${sittingH} h Sitzen liegt der Overall-Score bei ${overallScore}. Stress ${stress}/10 und Morning-Recovery ${morningRec}/10 zeigen Belastungs-Mismatch. ${reportTypeToken}-Hebel: Sleep-Score ${sleepScore} koppelt direkt an Recovery-Score ${recoveryScore}.`;

  // ── modules (≥2 anchors each) ──
  const modules = {
    sleep: {
      key_finding: `Sleep-Score ${sleepScore} bei ${sleepDur} h.`,
      systemic_connection: `Sleep moduliert Recovery via Multiplikator ${r.recovery.sleep_multiplier}.`,
      limitation: "self-report, keine Wearable-Validierung.",
      recommendation: `Schlaf-Fenster auf ${Math.max(7, Math.floor(sleepDur + 1))} h verlängern.`,
    },
    recovery: {
      key_finding: `Recovery-Score ${recoveryScore} mit Stress-Multiplikator ${r.recovery.stress_multiplier}.`,
      systemic_connection: `Sleep-Score ${sleepScore} und Stress ${stress}/10 als Haupttreiber.`,
      limitation: "Recovery ist nicht teil des Composite — wirkt als Governor.",
      recommendation: `Morning-Recovery ${morningRec}/10 als Tracking-KPI.`,
      overtraining_signal: ctx.flags.overtraining_risk
        ? `Trainingsvolumen disproportional zu Recovery (Recovery ${recoveryScore}).`
        : null,
    },
    activity: {
      key_finding: `Activity-Score ${activityScore} bei ${dailySteps} Schritten.`,
      systemic_connection: `Total MET ${totalMet} pro Woche, IPAQ-Kategorie ${r.activity.activity_category}.`,
      limitation: "Selbstbericht-Schritte ohne Wearable-Validierung.",
      recommendation: `Sitzpausen einbauen — ${sittingH} h täglich liegt im Risikobereich.`,
      met_context: `Total ${totalMet} MET-Minuten/Woche.`,
      sitting_flag: ctx.flags.sitting_critical
        ? `Sitzen ${sittingH} h/Tag = critical.`
        : ctx.flags.sitting_elevated
          ? `Sitzen ${sittingH} h/Tag = elevated.`
          : null,
    },
    metabolic: {
      key_finding: `Metabolic-Score ${metabolicScore} mit BMI ${bmi}.`,
      systemic_connection: `BMI-Kategorie ${r.metabolic.bmi_category} und Sitzlast ${sittingH} h/Tag.`,
      limitation: "BMI ist Body-Composition-Proxy.",
      recommendation: `${reportTypeToken}-Anker: ${ctx.raw.meals_per_day} Mahlzeiten/Tag, ${ctx.raw.water_litres} L Wasser.`,
      bmi_context: `BMI ${bmi}, Kategorie ${r.metabolic.bmi_category}.`,
    },
    stress: {
      key_finding: `Stress-Score ${stressScore} bei selbstberichtetem Level ${stress}/10.`,
      systemic_connection: `Sleep-Buffer ${r.stress.sleep_buffer}, Recovery-Buffer ${r.stress.recovery_buffer}.`,
      limitation: "Subjektive 1–10-Skala.",
      recommendation: `Stress-Quelle ${ctx.personalization.stress_source ?? "unbekannt"} adressieren.`,
      hpa_context: ctx.flags.hpa_axis_risk
        ? `HPA-Achsen-Risiko aktiv bei Stress ${stress}/10 + Recovery ${recoveryScore}.`
        : null,
    },
    vo2max: {
      key_finding: `VO2max-Score ${vo2Score} (geschätzt ${r.vo2max.vo2max_estimated} ml/kg/min).`,
      systemic_connection: `VO2max ist an Activity-Score ${activityScore} gekoppelt.`,
      limitation: "Schätzung, keine Spiroergometrie.",
      recommendation: `Vigorous-MET ${r.activity.vigorous_met} als Hebel.`,
      fitness_context: `Band ${r.vo2max.fitness_level_band} für Alter ${ctx.user.age}.`,
      estimation_note: "Algorithmische Schätzung — keine Labormessung.",
    },
  };

  // ── top_priority (≥2 anchors) ──
  const lowestDimToken = (() => {
    const arr: Array<[string, number]> = [
      ["Sleep", sleepScore],
      ["Recovery", recoveryScore],
      ["Activity", activityScore],
      ["Metabolic", metabolicScore],
      ["Stress", stressScore],
      ["VO2max", vo2Score],
    ];
    arr.sort((a, b) => a[1] - b[1]);
    return arr[0];
  })();
  const top_priority = `${lowestDimToken[0]}-Score ${lowestDimToken[1]} ist der größte Hebel. Mit ${reportTypeToken}-Fokus zuerst, weil die Recovery-Multiplikatoren ${r.recovery.sleep_multiplier} × ${r.recovery.stress_multiplier} davon abhängen.`;

  const systemic_connections_overview = `Sleep ${sleepScore} koppelt an Recovery ${recoveryScore} via Multiplikator ${r.recovery.sleep_multiplier}. Stress ${stress}/10 reduziert Recovery zusätzlich.`;

  const prognose_30_days = `Mit gezielten Hebeln kann der ${lowestDimToken[0]}-Score ${lowestDimToken[1]} um realistisch 8 Punkte steigen.`;

  // ── daily_life_protocol — keep total_time_min within minimal cap (20) ──
  const daily_life_protocol = {
    morning: [
      {
        habit: "Glas Wasser direkt nach dem Aufstehen",
        why_specific_to_user: `Bei ${ctx.raw.water_litres} L/Tag liegt der Bedarf höher.`,
        time_cost_min: 1,
      },
    ],
    work_day: [
      {
        habit: "Sitzpause alle 60 Minuten",
        why_specific_to_user: `Sitzen ${sittingH} h/Tag erhöht Risiko.`,
        time_cost_min: 5,
      },
    ],
    evening: [
      {
        habit: "Bildschirm-Pause vor dem Schlafen",
        why_specific_to_user: `Sleep-Score ${sleepScore} und Bildschirmzeit ${ctx.raw.screen_time_before_sleep ?? "unbekannt"}.`,
        time_cost_min: 5,
      },
    ],
    nutrition_micro: [
      {
        habit: "Eiweiß zu jeder Mahlzeit",
        why_specific_to_user: `Bei ${ctx.raw.meals_per_day} Mahlzeiten/Tag konsequent.`,
        time_cost_min: 2,
      },
    ],
    total_time_min_per_day: 13,
  };

  return {
    headline,
    executive_summary,
    critical_flag: ctx.flags.overtraining_risk
      ? "Overtraining-Risiko aktiv."
      : ctx.flags.hpa_axis_risk
        ? "HPA-Achsen-Risiko aktiv."
        : null,
    modules,
    top_priority,
    systemic_connections_overview,
    prognose_30_days,
    daily_life_protocol,
    disclaimer: DISCLAIMER[ctx.meta.locale],
    _meta: {
      stage: "writer",
      generation_id: randomUUID(),
      section_evidence_refs: {
        executive_summary: [
          "raw.sleep_duration_hours",
          "raw.daily_steps",
          "raw.sitting_hours_per_day",
        ],
        "modules.sleep": [
          "scoring.result.sleep.sleep_score_0_100",
          "raw.sleep_duration_hours",
        ],
        "modules.recovery": [
          "scoring.result.recovery.recovery_score_0_100",
          "scoring.result.recovery.stress_multiplier",
        ],
        "modules.activity": [
          "scoring.result.activity.activity_score_0_100",
          "raw.daily_steps",
        ],
        "modules.metabolic": [
          "scoring.result.metabolic.metabolic_score_0_100",
          "scoring.result.metabolic.bmi",
        ],
        "modules.stress": [
          "scoring.result.stress.stress_score_0_100",
          "raw.stress_level_1_10",
        ],
        "modules.vo2max": [
          "scoring.result.vo2max.fitness_score_0_100",
          "scoring.result.vo2max.vo2max_estimated",
        ],
        top_priority: ["scoring.result.sleep.sleep_score_0_100"],
        systemic_connections_overview: [
          "scoring.result.sleep.sleep_score_0_100",
          "scoring.result.recovery.recovery_score_0_100",
        ],
        prognose_30_days: ["scoring.result.sleep.sleep_score_0_100"],
      },
    },
  };
}

export function buildValidJudgeResult(): import("@/lib/reports/schemas/judge-result").JudgeResult {
  return {
    overall_score: 82,
    individualization_score: 80,
    evidence_anchoring_score: 85,
    report_type_conformance: true,
    banlist_hits: [],
    issues: [],
    repair_required: false,
    repair_target_sections: [],
  };
}
