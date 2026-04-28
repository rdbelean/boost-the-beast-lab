// Stage-A User Prompt builder.
//
// Renders the ReportContext as a single JSON document and instructs the
// model to emit AnalysisJSON.
//
// Phase 5h: aggressive context-slim. Stage-A's job is to RE-DERIVE
// driver-relevance, top-priority and systemic links. Passing those
// pre-computed values would bias Stage-A toward paraphrasing rather
// than analysing. So we drop:
//   - scoring.drivers (let Stage-A determine drivers itself)
//   - scoring.priority_order (let Stage-A pick top_priority itself)
//   - scoring.result.top_priority_module (same reason)
//   - scoring.result.systemic_warnings (already present in ctx.flags)
//   - scoring.result.provenance (already in ctx.wearable.provenance)
//   - user.email (irrelevant for analysis)
// JSON.stringify also moves to compact form (no 2-space indent) —
// pure whitespace savings.

import type { ReportContext } from "@/lib/reports/report-context";

export function buildAnalysisUserPrompt(ctx: ReportContext): string {
  const r = ctx.scoring.result;

  // Strip freetext from the JSON ctx so the Stage-A model handles them
  // ONLY through the XML-tagged blocks below. Keeps prompt-injection
  // surface to a single, well-marked location.
  const {
    main_goal_freetext: rawMainGoal,
    training_type_freetext: rawTraining,
    ...rawWithoutFreetext
  } = ctx.raw;

  const ctxForPrompt = {
    meta: ctx.meta,
    user: {
      age: ctx.user.age,
      gender: ctx.user.gender,
      height_cm: ctx.user.height_cm,
      weight_kg: ctx.user.weight_kg,
    },
    raw: rawWithoutFreetext,
    personalization: ctx.personalization,
    scoring: {
      sleep: r.sleep,
      recovery: r.recovery,
      activity: r.activity,
      metabolic: r.metabolic,
      stress: r.stress,
      vo2max: r.vo2max,
      overall_score_0_100: r.overall_score_0_100,
      overall_band: r.overall_band,
    },
    wearable: ctx.wearable,
    data_quality: ctx.data_quality,
    flags: ctx.flags,
  };

  const sections: string[] = [
    "Here is the ReportContext for one assessment.",
    "",
    JSON.stringify(ctxForPrompt),
  ];

  if (rawMainGoal && rawMainGoal.trim().length > 0) {
    sections.push(
      "",
      "<user_freetext_main_goal>",
      rawMainGoal,
      "</user_freetext_main_goal>",
    );
  }
  if (rawTraining && rawTraining.trim().length > 0) {
    sections.push(
      "",
      "<user_freetext_training>",
      rawTraining,
      "</user_freetext_training>",
    );
  }

  sections.push(
    "",
    "Produce the AnalysisJSON now. Respond with only the JSON object — no markdown, no commentary.",
  );

  return sections.join("\n");
}
