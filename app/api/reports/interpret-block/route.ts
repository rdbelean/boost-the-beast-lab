import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCachedInterpretation, setCachedInterpretation } from "@/lib/reports/interpretation-cache";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";
import { loadReportContext, type ReportContext } from "@/lib/reports/report-context";

export const runtime = "nodejs";
export const maxDuration = 30;

let client: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

type Dimension = "sleep" | "activity" | "vo2max" | "metabolic" | "stress";

interface BlockInterpretRequest {
  assessment_id: string;
  dimension: Dimension;
  locale: string;
}

// Phase 2D: per-dimension slice extracted from the canonical ReportContext.
// Replaces the previous body-supplied `metrics`/`score`/`user_profile`/
// `other_dimensions` payload — the server now derives all of them from
// loadReportContext so the interpret-block prompt sees the same
// validated, provenance-aware data as the main report and the plans.
function dimensionMetricsFromContext(
  ctx: ReportContext,
  dim: Dimension,
): Array<{ label_key: string; value: string; unit?: string }> {
  const r = ctx.scoring.result;
  switch (dim) {
    case "sleep":
      return [
        { label_key: "duration", value: ctx.raw.sleep_duration_hours.toString(), unit: "h" },
        { label_key: "quality", value: ctx.raw.sleep_quality_label_localized },
        { label_key: "wakeups", value: ctx.raw.wakeup_frequency_label_localized },
        { label_key: "morning_recovery", value: `${ctx.raw.morning_recovery_1_10}/10` },
      ];
    case "activity":
      return [
        { label_key: "daily_steps", value: (ctx.raw.daily_steps ?? 0).toString() },
        { label_key: "training_days_per_week", value: (ctx.raw.training_days_self_reported ?? 0).toString() },
        { label_key: "sitting_hours_per_day", value: ctx.raw.sitting_hours_per_day.toString(), unit: "h" },
        { label_key: "total_met_minutes_per_week", value: r.activity.total_met_minutes_week.toString() },
        { label_key: "ipaq_category", value: r.activity.activity_category },
      ];
    case "vo2max":
      return [
        { label_key: "vo2max_estimated", value: r.vo2max.vo2max_estimated.toString(), unit: "ml/kg/min" },
        { label_key: "fitness_level", value: r.vo2max.fitness_level_band },
      ];
    case "metabolic":
      return [
        { label_key: "bmi", value: r.metabolic.bmi.toString(), unit: "kg/m²" },
        { label_key: "bmi_category", value: r.metabolic.bmi_category },
        { label_key: "meals_per_day", value: ctx.raw.meals_per_day.toString() },
        { label_key: "water_intake", value: ctx.raw.water_litres.toString(), unit: "L/day" },
        { label_key: "fruit_vegetables", value: ctx.raw.fruit_veg_label_localized },
      ];
    case "stress":
      return [
        { label_key: "self_reported_stress", value: `${ctx.raw.stress_level_1_10}/10` },
        { label_key: "sleep_buffer", value: r.stress.sleep_buffer.toString() },
        { label_key: "recovery_buffer", value: r.stress.recovery_buffer.toString() },
      ];
  }
}

function dimensionScoreFromContext(ctx: ReportContext, dim: Dimension): number {
  const r = ctx.scoring.result;
  switch (dim) {
    case "sleep":     return r.sleep.sleep_score_0_100;
    case "activity":  return r.activity.activity_score_0_100;
    case "vo2max":    return r.vo2max.fitness_score_0_100;
    case "metabolic": return r.metabolic.metabolic_score_0_100;
    case "stress":    return r.stress.stress_score_0_100;
  }
}

function otherDimensionsFromContext(
  ctx: ReportContext,
  currentDim: Dimension,
): Record<string, number> {
  const r = ctx.scoring.result;
  const all: Record<Dimension, number> = {
    sleep:     r.sleep.sleep_score_0_100,
    activity:  r.activity.activity_score_0_100,
    vo2max:    r.vo2max.fitness_score_0_100,
    metabolic: r.metabolic.metabolic_score_0_100,
    stress:    r.stress.stress_score_0_100,
  };
  const { [currentDim]: _omit, ...rest } = all;
  void _omit;
  return rest;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BlockInterpretRequest;
    const { assessment_id, dimension, locale } = body;

    if (!assessment_id || !dimension || !locale) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const validDims: Dimension[] = ["sleep", "activity", "vo2max", "metabolic", "stress"];
    if (!validDims.includes(dimension)) {
      return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
    }

    // Cache check stays at the very top so a hit avoids the DB round-trip
    // for loadReportContext entirely. Cache key is unchanged: assessment_id
    // + dimension + locale (CACHE_VERSION suffix lives inside the cache module).
    const cached = await getCachedInterpretation(assessment_id, dimension, locale);
    if (cached && typeof cached === "object" && "interpretation" in (cached as object)) {
      return NextResponse.json(cached);
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
    }

    // Phase 2D: pull metrics + score + user_profile + other_dimensions from
    // the canonical ReportContext rather than from request body. Same data
    // shape feeds the prompt, but it is now consistent with the main report
    // and plan generators.
    const ctxResult = await loadReportContext(assessment_id);
    if (!ctxResult.ok) {
      console.error("[reports/interpret-block] loadReportContext failed", ctxResult.error);
      return NextResponse.json(
        { error: `load_report_context_failed: ${ctxResult.error.code}` },
        { status: ctxResult.error.code === "no_assessment" ? 404 : 500 },
      );
    }
    const ctx = ctxResult.context;

    const metrics = dimensionMetricsFromContext(ctx, dimension);
    const score = dimensionScoreFromContext(ctx, dimension);
    const otherDimensions = otherDimensionsFromContext(ctx, dimension);
    const userProfile = { age: ctx.user.age, gender: ctx.user.gender };

    const LANG_DIRECTIVE: Record<string, string> = {
      de: 'Sprache: Deutsch, "du"-Form (informal)',
      en: "Language: English, second person ('you')",
      it: "Lingua: Italiano, forma 'tu' (informale)",
      tr: 'Dil: Türkçe, samimi "sen" hitabı (resmi "siz" değil)',
    };
    const langDirective = LANG_DIRECTIVE[locale] ?? LANG_DIRECTIVE.en;

    const metricsText = metrics
      .map((m) => `${m.label_key}: ${m.value}${m.unit ? " " + m.unit : ""}`)
      .join(", ");
    const otherText = Object.entries(otherDimensions)
      .map(([k, v]) => `${k}: ${v}/100`)
      .join(", ");

    const prompt = `You are a sports scientist. Analyze this fitness data and write a short interpretation.

Dimension: ${dimension}
Score: ${score}/100
Measured values: ${metricsText}
${otherText ? `Other dimensions: ${otherText}` : ""}
${userProfile.age ? `Age: ${userProfile.age}, Gender: ${userProfile.gender || "unknown"}` : ""}

Rules:
- ${langDirective}
- Exactly 2–3 sentences, max 280 characters
- Sentence 1: most important finding with a concrete number
- Sentence 2: relation to another dimension or training context
- Optional sentence 3: implication
- NO diagnoses, NO recommendations, NO generic phrases
- Use only values given above

Respond ONLY as JSON: {"interpretation": "..."}`;

    const message = await callAnthropicWithRetry(getAnthropic(), {
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { interpretation: string };
    const interpretation = parsed.interpretation;
    if (!interpretation || typeof interpretation !== "string") {
      throw new Error("Empty interpretation in AI response");
    }

    const result = { interpretation };
    await setCachedInterpretation(assessment_id, dimension, locale, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[reports/interpret-block]", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
