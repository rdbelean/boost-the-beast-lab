// Stage-A User Prompt builder.
//
// Renders the ReportContext as a single JSON document and instructs the
// model to emit AnalysisJSON. We don't summarise or pre-select fields
// here — Stage-A's job is to look at the full picture and decide which
// anchors matter. Pruning happens via the schema's max-counts and the
// validator's path-resolution check.

import type { ReportContext } from "@/lib/reports/report-context";

/**
 * Slim a ReportContext for the prompt:
 *   - Drop circular / scoring-internal noise (e.g. localized labels are
 *     redundant with the underlying enum).
 *   - Keep every numeric value Stage-A might want to anchor on.
 *
 * The pruning here is cosmetic only — anchor paths still resolve against
 * the FULL ctx via resolvePath(), so Stage-A may legitimately reference
 * fields we trimmed from the prompt body. In practice though we hand
 * Stage-A the trimmed view, and it anchors on what it sees.
 */
export function buildAnalysisUserPrompt(ctx: ReportContext): string {
  const ctxForPrompt = {
    meta: ctx.meta,
    user: ctx.user,
    raw: ctx.raw,
    personalization: ctx.personalization,
    scoring: {
      result: {
        // Score primitives — Stage-A's main anchor source.
        sleep: ctx.scoring.result.sleep,
        recovery: ctx.scoring.result.recovery,
        activity: ctx.scoring.result.activity,
        metabolic: ctx.scoring.result.metabolic,
        stress: ctx.scoring.result.stress,
        vo2max: ctx.scoring.result.vo2max,
        overall_score_0_100: ctx.scoring.result.overall_score_0_100,
        overall_band: ctx.scoring.result.overall_band,
        top_priority_module: ctx.scoring.result.top_priority_module,
        systemic_warnings: ctx.scoring.result.systemic_warnings,
        provenance: ctx.scoring.result.provenance,
      },
      drivers: ctx.scoring.drivers,
      priority_order: ctx.scoring.priority_order,
    },
    wearable: ctx.wearable,
    data_quality: ctx.data_quality,
    flags: ctx.flags,
  };

  return [
    "Here is the ReportContext for one assessment.",
    "",
    "```json",
    JSON.stringify(ctxForPrompt, null, 2),
    "```",
    "",
    "Produce the AnalysisJSON now. Respond with only the JSON object — no markdown, no commentary.",
  ].join("\n");
}
