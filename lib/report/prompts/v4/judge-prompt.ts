// Stage-C AI Judge prompt builder.
//
// The deterministic validator (lib/reports/validators.ts) runs FIRST and
// gates whether the AI judge is called at all. By the time this prompt
// fires, the report has already passed schema, anchor-coverage, banlist,
// time-budget, report-type and no-training checks. The AI judge adds a
// subjective quality + individualization assessment on top.
//
// Output: a JudgeResult JSON. Locale-aware so the judge reads the report
// in its native language and judges idiom, not just structure.

import type { ReportContext } from "@/lib/reports/report-context";
import type { AnalysisJSON } from "@/lib/reports/schemas/report-analysis";
import type { ReportJSON } from "@/lib/reports/schemas/report-output";
import type { Locale } from "@/lib/reports/schemas/dimensions";

export const JUDGE_SYSTEM_PROMPT = `You are a strict QA judge for a personalized health-assessment report.

You receive: (1) the user's ReportContext (data snapshot), (2) the
AnalysisJSON anchors that Stage-A extracted, (3) the writer's ReportJSON.

Your job: rate the report on individualization and evidence anchoring,
flag issues, and decide whether a targeted repair pass is warranted.

OUTPUT FORMAT
- Respond with EXACTLY ONE JudgeResult JSON object — nothing else.
- No markdown fences. No commentary.

JUDGEMENT CRITERIA
- overall_score (0-100): holistic quality. ≥80 means publish-ready.
- individualization_score (0-100): does the prose feel specific to THIS
  user, or does it read like a paraphrased band template?
- evidence_anchoring_score (0-100): how strictly does the prose cite
  concrete numbers from the AnalysisJSON / ReportContext, vs. vague
  generalisations?
- report_type_conformance (boolean): does the report foreground the
  correct module given meta.report_type?
- banlist_hits: list of any wellness-floskel phrases you can spot. The
  deterministic validator already ran a regex pass — your job is to
  catch novel paraphrases that slipped through (e.g. "make sure you
  prioritise recovery" rephrased as "recovery is something to
  prioritise").
- issues: structured list of section + kind + excerpt + suggestion.
  Kinds: generic | missing_anchor | contradicts_data | wrong_report_type
  | fallback_smell | time_budget_violated | training_in_daily_protocol.
- repair_required: true if overall_score < 70 OR any issue with kind
  in {generic, missing_anchor, contradicts_data, wrong_report_type} is
  in headline / executive_summary / top_priority.
- repair_target_sections: section paths the repair pass should rewrite
  (e.g. ["executive_summary", "modules.sleep"]).

Be strict but fair. A report that cites real numbers and avoids
floskeln but is somewhat dry is fine — score it 75-85 and let it ship.
A report that paraphrases bands without anchoring deserves <60 even if
the prose reads nicely.`;

const JUDGE_USER_HEADERS: Record<Locale, string> = {
  de: "Bewerte diesen Report. Antworte nur mit dem JudgeResult-JSON.",
  en: "Judge this report. Respond with the JudgeResult JSON only.",
  it: "Giudica questo report. Rispondi solo con il JSON JudgeResult.",
  tr: "Bu raporu değerlendir. Yalnızca JudgeResult JSON'ı ile yanıtla.",
};

export function buildJudgeUserPrompt(
  ctx: ReportContext,
  analysis: AnalysisJSON,
  report: ReportJSON,
): string {
  const header = JUDGE_USER_HEADERS[ctx.meta.locale] ?? JUDGE_USER_HEADERS.en;

  // Slim ctx to keep judge token usage low — the judge does not need
  // the full provenance / drivers structure to rate the writer's prose.
  const r = ctx.scoring.result;
  // Phase 5h: drop user.email + tighten ctx to bare scoring digest +
  // raw values + flags. Compact JSON.stringify (no indent).
  const slimCtx = {
    meta: ctx.meta,
    user: { age: ctx.user.age, gender: ctx.user.gender, height_cm: ctx.user.height_cm, weight_kg: ctx.user.weight_kg },
    raw: ctx.raw,
    personalization: ctx.personalization,
    flags: ctx.flags,
    data_quality: ctx.data_quality,
    scores: {
      overall: r.overall_score_0_100,
      sleep: { score: r.sleep.sleep_score_0_100, band: r.sleep.sleep_band },
      recovery: { score: r.recovery.recovery_score_0_100, band: r.recovery.recovery_band },
      activity: { score: r.activity.activity_score_0_100, band: r.activity.activity_band },
      metabolic: { score: r.metabolic.metabolic_score_0_100, band: r.metabolic.metabolic_band, bmi: r.metabolic.bmi },
      stress: { score: r.stress.stress_score_0_100, band: r.stress.stress_band },
      vo2max: { score: r.vo2max.fitness_score_0_100, band: r.vo2max.fitness_level_band, estimated: r.vo2max.vo2max_estimated },
    },
  };

  return [
    header,
    "",
    "## ReportContext (slim)",
    JSON.stringify(slimCtx),
    "",
    "## AnalysisJSON",
    JSON.stringify(analysis),
    "",
    "## ReportJSON (Writer Output)",
    JSON.stringify(report),
    "",
    header,
  ].join("\n");
}
