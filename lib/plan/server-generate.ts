// Server-side single-plan pipeline. Used as a fallback by
// /api/report/generate's after()-block when the frontend disconnected
// before /api/plan/generate + /api/plan/save could land the plan PDF
// in Storage (mobile tab-switch case).
//
// This module ORCHESTRATES existing helpers — it does not introduce
// new AI prompts, new PDF rendering, or a new Storage path. The output
// is byte-equivalent to what the frontend-driven path produces:
//   /api/plan/generate (Anthropic) → /api/plan/pdf (generatePlanPDF)
//     → /api/plan/save (Storage upload).
//
// Idempotent: returns "cached" without an Anthropic call when the plan
// is already in Storage. Safe to invoke even when the frontend is
// already mid-flight on the same plan — last-write-wins in Storage,
// no crash, no duplicate email (handled by the lock in
// dispatchReportEmail).

import Anthropic from "@anthropic-ai/sdk";
import {
  buildFullPrompt,
  type PlanType,
  type ScoreInput,
  type PlanPersonalization,
  type ExtractedEntities,
} from "@/lib/plan/prompts/full-prompts";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";
import { loadReportContext, type ReportContext } from "@/lib/reports/report-context";
import { generatePlanPDF, type PlanPdfInput } from "@/lib/pdf/generatePlan";
import { uploadPlanPdf, type PlanPdfType } from "@/lib/pdf/background-generator";
import { getStatus } from "@/lib/pdf/status";
import { cleanJsonText } from "@/lib/reports/pipeline";
import { buildPlan } from "@/lib/plan/buildPlan";
import type { Locale } from "@/lib/supabase/types";

const PLAN_TO_PDF_TYPE: Record<PlanType, PlanPdfType> = {
  activity: "plan_activity",
  metabolic: "plan_metabolic",
  recovery: "plan_recovery",
  stress: "plan_stress",
};

interface PlanBlock {
  heading: string;
  items: string[];
}

export type ServerGenerateResult =
  | { status: "cached"; storagePath: string }
  | { status: "generated"; storagePath: string }
  | { status: "skipped"; reason: string };

/**
 * Server-side fallback pipeline for one plan. Reuses the same building
 * blocks as the frontend-driven path so the generated PDF is byte-
 * equivalent to what /api/plan/generate + /api/plan/pdf + /api/plan/save
 * would produce.
 *
 * Steps:
 *   1. getStatus → "ready"? Return cached. (idempotency)
 *   2. loadReportContext → build ScoreInput + personalization.
 *   3. buildFullPrompt + callAnthropicWithRetry → blocks.
 *   4. buildPlan + generatePlanPDF → PDF bytes.
 *   5. uploadPlanPdf → Storage + status row.
 */
export async function generateAndUploadPlan(
  assessmentId: string,
  locale: Locale,
  planType: PlanType,
  extractedEntities: ExtractedEntities | null = null,
): Promise<ServerGenerateResult> {
  const pdfType = PLAN_TO_PDF_TYPE[planType];

  // 1. Idempotency: skip if already in Storage.
  try {
    const existing = await getStatus(assessmentId, pdfType, locale);
    if (existing?.status === "ready" && existing.storage_path) {
      console.log(
        `[server-generate] ${planType}: already in Storage at ${existing.storage_path} — skipping`,
      );
      return { status: "cached", storagePath: existing.storage_path };
    }
  } catch (err) {
    console.warn(
      `[server-generate] ${planType}: getStatus pre-check failed — proceeding to generate:`,
      err,
    );
  }

  // 2. Load ReportContext.
  const ctxResult = await loadReportContext(assessmentId);
  if (!ctxResult.ok) {
    return {
      status: "skipped",
      reason: `loadReportContext failed: ${ctxResult.error.code}`,
    };
  }
  const ctx = ctxResult.context;

  // 3. Build prompts (same path as /api/plan/generate uses).
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length < 20) {
    return { status: "skipped", reason: "ANTHROPIC_API_KEY missing or invalid" };
  }

  const scores = scoreInputFromContext(ctx);
  const personalization = personalizationFromContext(ctx);
  const { systemPrompt, userPrompt } = buildFullPrompt(locale, {
    type: planType,
    scores,
    personalization,
    extractedEntities,
  });

  // 4. Anthropic-Call with retry.
  const client = new Anthropic({ apiKey });
  let rawText: string;
  try {
    const response = await callAnthropicWithRetry(client, {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = response.content[0];
    if (block?.type !== "text") {
      return { status: "skipped", reason: "Anthropic returned non-text content" };
    }
    rawText = block.text;
  } catch (err) {
    return {
      status: "skipped",
      reason: `Anthropic call failed: ${(err as Error).message}`,
    };
  }

  let parsed: { blocks: PlanBlock[] };
  try {
    parsed = JSON.parse(cleanJsonText(rawText)) as { blocks: PlanBlock[] };
  } catch (err) {
    return {
      status: "skipped",
      reason: `JSON.parse failed: ${(err as Error).message}`,
    };
  }
  if (!parsed.blocks?.length) {
    return { status: "skipped", reason: "AI returned empty blocks array" };
  }

  // 5. Render PDF using buildPlan + generatePlanPDF (identical to /api/plan/pdf).
  const basePlan = buildPlan(planType, scores as unknown as Record<string, unknown>, locale);
  const merged: PlanPdfInput = {
    title: basePlan.title,
    subtitle: basePlan.subtitle,
    source: basePlan.source,
    color: basePlan.color,
    score: basePlan.score,
    blocks: parsed.blocks,
    locale,
  };
  const pdfBytes = await generatePlanPDF(merged);
  const base64 = Buffer.from(pdfBytes).toString("base64");

  // 6. Upload to Storage. uploadPlanPdf is idempotent on conflict
  //    (409 = already exists → success path, status marked ready).
  const storagePath = await uploadPlanPdf(assessmentId, pdfType, locale, base64);
  console.log(
    `[server-generate] ${planType}: generated + uploaded to ${storagePath}`,
  );
  return { status: "generated", storagePath };
}

// ─── adapters from ReportContext ───────────────────────────────────────────
//
// Mirror the logic in /api/plan/generate/route.ts so the fallback produces
// the same prompts the frontend-driven path would. Kept private to this
// module — the route still owns its own copy. A future cleanup could
// extract the route's helper into this file and have the route import it,
// but the duplication is intentional for the minimum-fix scope.

function scoreInputFromContext(ctx: ReportContext): ScoreInput {
  const r = ctx.scoring.result;
  return {
    activity: {
      activity_score_0_100: r.activity.activity_score_0_100,
      activity_category: r.activity.activity_category,
      total_met_minutes_week: r.activity.total_met_minutes_week,
    },
    sleep: {
      sleep_score_0_100: r.sleep.sleep_score_0_100,
      sleep_duration_band: r.sleep.sleep_duration_band,
      sleep_band: r.sleep.sleep_band,
    },
    metabolic: {
      metabolic_score_0_100: r.metabolic.metabolic_score_0_100,
      bmi: r.metabolic.bmi,
      bmi_category: r.metabolic.bmi_category,
      metabolic_band: r.metabolic.metabolic_band,
    },
    stress: {
      stress_score_0_100: r.stress.stress_score_0_100,
      stress_band: r.stress.stress_band,
    },
    vo2max: {
      fitness_score_0_100: r.vo2max.fitness_score_0_100,
      vo2max_estimated: r.vo2max.vo2max_estimated,
      vo2max_band: r.vo2max.fitness_level_band,
    },
    overall_score_0_100: r.overall_score_0_100,
    overall_band: r.overall_band,
  };
}

function personalizationFromContext(ctx: ReportContext): PlanPersonalization {
  const ctxTrainingDays =
    ctx.raw.training_days_self_reported ??
    (ctx.raw.moderate_days + ctx.raw.vigorous_days || null);
  return {
    main_goal: ctx.personalization.main_goal ?? null,
    time_budget: ctx.personalization.time_budget ?? null,
    experience_level: ctx.personalization.experience_level ?? null,
    training_days: ctxTrainingDays,
    nutrition_painpoint: ctx.personalization.nutrition_painpoint ?? null,
    stress_source: ctx.personalization.stress_source ?? null,
    recovery_ritual: ctx.personalization.recovery_ritual ?? null,
  };
}
