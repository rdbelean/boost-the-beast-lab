import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildFullPrompt, type PlanType, type ScoreInput, type PlanPersonalization } from "@/lib/plan/prompts/full-prompts";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";
import { loadReportContext, type ReportContext } from "@/lib/reports/report-context";
import { cleanJsonText } from "@/lib/reports/pipeline";

export const runtime = "nodejs";
// Sonnet 4.6 generating ~3000 tokens of structured plan content can take
// 30-90s under load. With 4 plan endpoints + 1 report endpoint firing in
// parallel after submit, Anthropic's queueing pushes individual calls
// even longer. 60s was the legacy default and silently killed plan
// generation under load. 180s gives Sonnet enough headroom while
// staying well under Vercel Pro's 300s ceiling.
export const maxDuration = 180;

interface PlanBlock { heading: string; items: string[] }

function hasValidKey(key: string | undefined): boolean {
  if (!key || key.length < 20) return false;
  if (key.includes("your_") || key.includes("dein-")) return false;
  return true;
}

type PlanMeta = Record<PlanType, { title: string; subtitle: string; source: string }>;

const PLAN_META_DE: PlanMeta = {
  activity: {
    title: "ACTIVITY-PLAN",
    subtitle: "Individueller Plan zur Verbesserung deiner Aktivitätswerte",
    source: "Basiert auf: WHO Global Action Plan 2018–2030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022, AMA Longevity Study 2024",
  },
  metabolic: {
    title: "METABOLIC-PLAN",
    subtitle: "Individueller Plan zur Optimierung deiner metabolischen Performance",
    source: "Basiert auf: WHO BMI-Klassifikation, EFSA Nährwertempfehlungen, ISSN Position Stand, JAMA Network Open Meal Timing 2024, Covassin et al. RCT 2022",
  },
  recovery: {
    title: "RECOVERY-PLAN",
    subtitle: "Individueller Plan zur Verbesserung deiner Regeneration",
    source: "Basiert auf: NSF/AASM Sleep Guidelines, PSQI-Skala, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025, PMC OTS Review 2025",
  },
  stress: {
    title: "STRESS & LIFESTYLE-PLAN",
    subtitle: "Individueller Plan zur Optimierung von Stress und Lifestyle",
    source: "Basiert auf: WHO Mental Health Guidelines, Psychoneuroendocrinology Meta-Analysis 2024, MBSR (Kabat-Zinn), Frontiers Sedentary & CVD 2022",
  },
};

const PLAN_META_EN: PlanMeta = {
  activity: {
    title: "ACTIVITY PLAN",
    subtitle: "Individual plan to improve your activity metrics",
    source: "Based on: WHO Global Action Plan 2018–2030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022, AMA Longevity Study 2024",
  },
  metabolic: {
    title: "METABOLIC PLAN",
    subtitle: "Individual plan to optimise your metabolic performance",
    source: "Based on: WHO BMI Classification, EFSA Nutrition Recommendations, ISSN Position Stand, JAMA Network Open Meal Timing 2024, Covassin et al. RCT 2022",
  },
  recovery: {
    title: "RECOVERY PLAN",
    subtitle: "Individual plan to improve your recovery",
    source: "Based on: NSF/AASM Sleep Guidelines, PSQI Scale, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025, PMC OTS Review 2025",
  },
  stress: {
    title: "STRESS & LIFESTYLE PLAN",
    subtitle: "Individual plan to optimise stress and lifestyle",
    source: "Based on: WHO Mental Health Guidelines, Psychoneuroendocrinology Meta-Analysis 2024, MBSR (Kabat-Zinn), Frontiers Sedentary & CVD 2022",
  },
};

const PLAN_META_IT: PlanMeta = {
  activity: {
    title: "PIANO ATTIVITÀ",
    subtitle: "Piano individuale per migliorare i tuoi valori di attività",
    source: "Basato su: WHO Global Action Plan 2018–2030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022",
  },
  metabolic: {
    title: "PIANO METABOLICO",
    subtitle: "Piano individuale per ottimizzare la tua performance metabolica",
    source: "Basato su: Classificazione BMI WHO, Raccomandazioni nutrizionali EFSA, ISSN Position Stand, JAMA Network Open 2024",
  },
  recovery: {
    title: "PIANO RECOVERY",
    subtitle: "Piano individuale per migliorare la tua rigenerazione",
    source: "Basato su: NSF/AASM Sleep Guidelines, Scala PSQI, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025",
  },
  stress: {
    title: "PIANO STRESS & LIFESTYLE",
    subtitle: "Piano individuale per ottimizzare stress e stile di vita",
    source: "Basato su: WHO Mental Health Guidelines, Meta-Analysis Psychoneuroendocrinology 2024, MBSR (Kabat-Zinn)",
  },
};

const PLAN_META_TR: PlanMeta = {
  activity: {
    title: "AKTİVİTE PLANI",
    subtitle: "Aktivite değerlerini geliştirmek için bireysel plan",
    source: "Kaynak: WHO Küresel Eylem Planı 2018–2030, ACSM Egzersiz Yönergeleri, IPAQ Kısa Form",
  },
  metabolic: {
    title: "METABOLİK PLAN",
    subtitle: "Metabolik performansını optimize etmek için bireysel plan",
    source: "Kaynak: WHO BMI Sınıflandırması, EFSA Beslenme Önerileri, ISSN Pozisyon Bildirisi, JAMA Network Open 2024",
  },
  recovery: {
    title: "İYİLEŞME PLANI",
    subtitle: "Yenilenme kapasiteni geliştirmek için bireysel plan",
    source: "Kaynak: NSF/AASM Uyku Yönergeleri, PSQI Ölçeği, ACSM İyileşme Protokolleri, Kaczmarek et al. MDPI 2025",
  },
  stress: {
    title: "STRES & YAŞAMBİÇİMİ PLANI",
    subtitle: "Stres ve yaşam biçimini optimize etmek için bireysel plan",
    source: "Kaynak: WHO Ruh Sağlığı Yönergeleri, Psychoneuroendocrinology Meta-Analizi 2024, MBSR (Kabat-Zinn)",
  },
};

function getPlanMeta(locale: string): PlanMeta {
  if (locale === "en") return PLAN_META_EN;
  if (locale === "it") return PLAN_META_IT;
  if (locale === "tr") return PLAN_META_TR;
  return PLAN_META_DE;
}

// Phase 2C: extract a ScoreInput slice from a ReportContext. The legacy
// buildFullPrompt() still consumes the older, narrower ScoreInput shape;
// Phase 3 will swap it for a Stage-A/B prompt that consumes ReportContext
// directly and this adapter goes away.
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

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = (body as { type?: string }).type;
    const locale = (body as { locale?: string }).locale ?? "de";
    const assessmentId = (body as { assessmentId?: string }).assessmentId;
    const bodyPersonalization = (body as { personalization?: PlanPersonalization }).personalization;

    const validTypes: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
    if (!validTypes.includes(type as PlanType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }
    const planType = type as PlanType;
    const meta = getPlanMeta(locale)[planType];
    const apiKeyOk = hasValidKey(process.env.ANTHROPIC_API_KEY);
    console.log("[Plans/BE/generate] received", {
      bodyLocale: (body as { locale?: string }).locale,
      effectiveLocale: locale,
      type,
      hasAssessmentId: !!assessmentId,
      hasApiKey: apiKeyOk,
    });

    if (!apiKeyOk) {
      console.error("[Plans/BE/generate] ANTHROPIC_API_KEY missing/invalid — refusing to generate");
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // ── Resolve scores + personalization from one of two paths ────────────
    //
    // Phase 2C primary path: { assessmentId, type, locale, personalization? }
    //   → loadReportContext extracts a ScoreInput from canonical scoring,
    //     and personalization defaults to ctx.personalization (with body
    //     overrides if explicitly provided).
    //
    // Legacy / demo fallback: { type, scores, locale, ...personalization }
    //   → preserved so /api/plan/generate still works in offline-demo mode
    //     (no Supabase) and during the Phase 2C frontend rollout.
    let scores: ScoreInput;
    let personalization: PlanPersonalization;

    if (assessmentId) {
      const ctxResult = await loadReportContext(assessmentId);
      if (!ctxResult.ok) {
        console.error("[Plans/BE/generate] loadReportContext failed", ctxResult.error);
        return NextResponse.json(
          { error: `load_report_context_failed: ${ctxResult.error.code}` },
          { status: ctxResult.error.code === "no_assessment" ? 404 : 500 },
        );
      }
      const ctx = ctxResult.context;
      scores = scoreInputFromContext(ctx);

      // Body-provided personalization wins per-field; otherwise fall back to
      // the canonical context. training_days specifically uses the Phase-1
      // self-reported value first, then sums moderate+vigorous from raw.
      const ctxTrainingDays =
        ctx.raw.training_days_self_reported ??
        (ctx.raw.moderate_days + ctx.raw.vigorous_days || null);
      personalization = {
        main_goal:
          bodyPersonalization?.main_goal ?? ctx.personalization.main_goal ?? null,
        time_budget:
          bodyPersonalization?.time_budget ?? ctx.personalization.time_budget ?? null,
        experience_level:
          bodyPersonalization?.experience_level ?? ctx.personalization.experience_level ?? null,
        training_days: bodyPersonalization?.training_days ?? ctxTrainingDays,
        nutrition_painpoint:
          bodyPersonalization?.nutrition_painpoint ?? ctx.personalization.nutrition_painpoint ?? null,
        stress_source:
          bodyPersonalization?.stress_source ?? ctx.personalization.stress_source ?? null,
        recovery_ritual:
          bodyPersonalization?.recovery_ritual ?? ctx.personalization.recovery_ritual ?? null,
      };
    } else {
      // Legacy path — body must carry scores + flat personalization fields.
      const legacyScores = (body as { scores?: ScoreInput }).scores;
      if (!legacyScores) {
        return NextResponse.json(
          { error: "Missing assessmentId or scores" },
          { status: 400 },
        );
      }
      scores = legacyScores;
      personalization = {
        main_goal:
          (body as { main_goal?: PlanPersonalization["main_goal"] }).main_goal ??
          bodyPersonalization?.main_goal ??
          null,
        time_budget:
          (body as { time_budget?: PlanPersonalization["time_budget"] }).time_budget ??
          bodyPersonalization?.time_budget ??
          null,
        experience_level:
          (body as { experience_level?: PlanPersonalization["experience_level"] })
            .experience_level ??
          bodyPersonalization?.experience_level ??
          null,
        training_days:
          (body as { training_days?: number | null }).training_days ??
          bodyPersonalization?.training_days ??
          null,
        nutrition_painpoint:
          (body as { nutrition_painpoint?: PlanPersonalization["nutrition_painpoint"] })
            .nutrition_painpoint ??
          bodyPersonalization?.nutrition_painpoint ??
          null,
        stress_source:
          (body as { stress_source?: PlanPersonalization["stress_source"] }).stress_source ??
          bodyPersonalization?.stress_source ??
          null,
        recovery_ritual:
          (body as { recovery_ritual?: PlanPersonalization["recovery_ritual"] }).recovery_ritual ??
          bodyPersonalization?.recovery_ritual ??
          null,
      };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Monolithic per-locale prompt. No response-prefix trick — that broke
    // JSON.parse silently and produced the German-fallback symptom we saw.
    const { systemPrompt, userPrompt } = buildFullPrompt(locale, {
      type: planType,
      scores,
      personalization,
    });

    console.log("[Plans/BE/generate] system prompt head:", systemPrompt.slice(0, 400));
    console.log("[Plans/BE/generate] user prompt head:", userPrompt.slice(0, 400));

    const callClaude = async (extraSystem = ""): Promise<string> => {
      // Phase 5e: switched from claude-sonnet-4-6 to claude-haiku-4-5.
      // Plan generation is a structured-template task with deterministic
      // personalization rules — no deep reasoning needed. Haiku 4.5 runs
      // ~3× faster and ~12× cheaper at comparable output quality for this
      // workload. max_tokens bumped 3000 → 4000 to eliminate truncation
      // risk (typical plan outputs are ~2000-2500 tokens).
      const response = await callAnthropicWithRetry(client, {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        temperature: 0.3,
        system: extraSystem ? `${systemPrompt}\n\n${extraSystem}` : systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      console.log("[Plans/BE/generate] anthropic", {
        model: "claude-haiku-4-5-20251001",
        retry: extraSystem !== "",
        stop_reason: response.stop_reason,
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      });
      return (response.content[0] as { type: string; text: string }).text;
    };

    // First attempt — strip optional ```json fences before parsing.
    let rawText = await callClaude();
    let parsed: { blocks: PlanBlock[] };
    try {
      parsed = JSON.parse(cleanJsonText(rawText)) as { blocks: PlanBlock[] };
    } catch (parseErr) {
      console.warn(
        "[Plans/BE/generate] first JSON parse failed — retrying with stricter directive",
        { planType, locale, parseErrMsg: (parseErr as Error).message },
      );
      // Second attempt with reinforced directive — Claude sometimes
      // wraps in fences despite "No markdown backticks" rule.
      try {
        rawText = await callClaude(
          "RAW JSON ONLY. NO MARKDOWN FENCES. NO PROSE BEFORE OR AFTER. Start the response with the character `{` and end with `}`.",
        );
        parsed = JSON.parse(cleanJsonText(rawText)) as { blocks: PlanBlock[] };
      } catch (retryErr) {
        console.error(
          "[Plans/BE/generate] retry JSON parse also failed — raw output first 2000:",
          rawText.slice(0, 2000),
        );
        console.error("[Plans/BE/generate] retry parse error:", retryErr);
        return NextResponse.json(
          { error: "plan_parse_failed", code: "plan_parse_failed", planType, locale },
          { status: 502 },
        );
      }
    }

    if (!parsed.blocks?.length) {
      console.error("[Plans/BE/generate] Claude returned empty blocks array");
      return NextResponse.json({ error: "AI returned empty plan" }, { status: 502 });
    }

    console.log("[Plans/BE/generate] Claude output", { locale, type: planType, firstHeading: parsed.blocks[0]?.heading, blocksCount: parsed.blocks.length });

    return NextResponse.json({ ...meta, locale, blocks: parsed.blocks });
  } catch (err) {
    // Structured error log — easier to read in Vercel function logs.
    const isAnthropicErr = err instanceof Anthropic.APIError;
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStatus = isAnthropicErr ? err.status : null;
    const errType = isAnthropicErr ? "anthropic_api" : err instanceof Error ? err.name : "unknown";
    console.error(
      "[plan/generate] error:",
      JSON.stringify({
        errType,
        errStatus,
        errMsg: errMsg.slice(0, 500),
        planType: (req as unknown as { url?: string }).url ?? null,
      }),
    );

    // Return a more diagnostic shape so the frontend (and logs) can tell
    // rate-limit / billing / overload apart from a generic crash.
    let code = "generation_failed";
    let status = 500;
    if (isAnthropicErr) {
      if (err.status === 429 || /rate_limit/i.test(errMsg)) {
        code = "provider_rate_limit";
        status = 503;
      } else if (err.status === 529 || /overloaded/i.test(errMsg)) {
        code = "provider_overloaded";
        status = 503;
      } else if (/credit balance|billing|insufficient_quota/i.test(errMsg)) {
        code = "provider_billing";
        status = 503;
      } else {
        code = "provider_error";
        status = 503;
      }
    }
    return NextResponse.json(
      { error: "Generation failed", code, errType },
      { status },
    );
  }
}
