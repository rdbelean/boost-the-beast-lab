import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";
import { loadReportContext } from "@/lib/reports/report-context";
import { cleanJsonText } from "@/lib/reports/pipeline";
import { MasterPlanSchema, type MasterPlan } from "@/lib/master-plan/schema";
import { buildSystemPrompt, buildUserPrompt, buildRetryDirective, type Locale } from "@/lib/master-plan/prompts";
import { buildMasterPlanInputs } from "@/lib/master-plan/buildMasterPlanFromContext";
import { validateMasterPlan } from "@/lib/master-plan/validate";
import { generateMasterPlanPDF } from "@/lib/pdf/generateMasterPlan";

export const runtime = "nodejs";
// Sonnet 4.6 with 6k max_tokens typically returns in 15-40s. With up to 3 retries,
// worst case ~120s. Stay well under Vercel Pro 300s ceiling.
export const maxDuration = 240;

const MAX_QUALITY_ATTEMPTS = 3;
const SONNET_MODEL = "claude-sonnet-4-6";

function isValidLocale(v: string): v is Locale {
  return v === "de" || v === "en" || v === "it" || v === "tr";
}

function hasValidKey(key: string | undefined): boolean {
  if (!key || key.length < 20) return false;
  if (key.includes("your_") || key.includes("dein-")) return false;
  return true;
}

const TITLE_BY_LOCALE: Record<Locale, string> = {
  de: "MASTER-WOCHENPLAN",
  en: "MASTER WEEKLY PLAN",
  it: "PIANO SETTIMANALE MASTER",
  tr: "MASTER HAFTALIK PLAN",
};
const SUBTITLE_BY_LOCALE: Record<Locale, string> = {
  de: "Personalisiert für dich, zugeschnitten auf deine Ziele",
  en: "Personalised for you, tailored to your goals",
  it: "Personalizzato per te, su misura per i tuoi obiettivi",
  tr: "Sana özel, hedeflerine göre uyarlandı",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const locale = (body as { locale?: string }).locale ?? "de";
    const assessmentId = (body as { assessmentId?: string }).assessmentId;

    if (!assessmentId) {
      return NextResponse.json({ error: "Missing assessmentId" }, { status: 400 });
    }
    const localeTyped: Locale = isValidLocale(locale) ? locale : "de";

    if (!hasValidKey(process.env.ANTHROPIC_API_KEY)) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    const ctxResult = await loadReportContext(assessmentId);
    if (!ctxResult.ok) {
      return NextResponse.json(
        { error: `load_report_context_failed: ${ctxResult.error.code}` },
        { status: ctxResult.error.code === "no_assessment" ? 404 : 500 },
      );
    }
    const ctx = ctxResult.context;

    const inputs = buildMasterPlanInputs(ctx, localeTyped);
    const systemPrompt = buildSystemPrompt(localeTyped, inputs);
    const userPrompt = buildUserPrompt(inputs);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const callClaude = async (extraSystem = ""): Promise<string> => {
      const response = await callAnthropicWithRetry(client, {
        model: SONNET_MODEL,
        max_tokens: 6000,
        temperature: 0.4,
        system: extraSystem ? `${systemPrompt}\n\n${extraSystem}` : systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      console.log("[MasterPlan/BE/generate] anthropic", {
        model: SONNET_MODEL,
        retry: extraSystem !== "",
        stop_reason: response.stop_reason,
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      });
      return (response.content[0] as { type: string; text: string }).text;
    };

    let parsed: MasterPlan | null = null;
    let lastReasons: string[] = [];
    let pdfBytes: Uint8Array | null = null;

    for (let attempt = 1; attempt <= MAX_QUALITY_ATTEMPTS; attempt++) {
      const directive =
        attempt > 1 && lastReasons.length > 0
          ? buildRetryDirective(localeTyped, attempt, MAX_QUALITY_ATTEMPTS, lastReasons)
          : "";

      let rawText: string;
      try {
        rawText = await callClaude(directive);
      } catch (callErr) {
        console.error("[MasterPlan/BE/generate] anthropic call failed", callErr);
        if (attempt === MAX_QUALITY_ATTEMPTS) {
          return NextResponse.json({ error: "master_plan_anthropic_failed" }, { status: 502 });
        }
        lastReasons = ["anthropic_call_failed"];
        continue;
      }

      // Parse JSON
      let candidate: unknown;
      try {
        candidate = JSON.parse(cleanJsonText(rawText));
      } catch (parseErr) {
        console.warn("[MasterPlan/BE/generate] JSON parse failed", parseErr);
        // Retry with strict prefix
        try {
          rawText = await callClaude(
            `${directive}\n\nRAW JSON ONLY. NO MARKDOWN FENCES. NO PROSE. Start with { end with }.`,
          );
          candidate = JSON.parse(cleanJsonText(rawText));
        } catch (parseErr2) {
          console.error("[MasterPlan/BE/generate] JSON parse twice failed", parseErr2);
          if (attempt === MAX_QUALITY_ATTEMPTS) {
            return NextResponse.json({ error: "master_plan_parse_failed" }, { status: 502 });
          }
          lastReasons = ["json_parse_failed"];
          continue;
        }
      }

      // Inject required wrapper fields BEFORE schema-validation (the model only
      // emits intro + rows; we own title/subtitle/color/score deterministically).
      const enriched = {
        title: TITLE_BY_LOCALE[localeTyped],
        subtitle: SUBTITLE_BY_LOCALE[localeTyped],
        color: "#E63222",
        score: inputs.scores.overall,
        ...(candidate as Record<string, unknown>),
      };

      const parseResult = MasterPlanSchema.safeParse(enriched);
      if (!parseResult.success) {
        const reasons = parseResult.error.errors.map((e) => `schema_${e.path.join(".")}_${e.code}`);
        console.warn("[MasterPlan/BE/generate] schema invalid", reasons);
        if (attempt === MAX_QUALITY_ATTEMPTS) {
          lastReasons = reasons;
          break;
        }
        lastReasons = reasons;
        continue;
      }

      parsed = parseResult.data;

      // Semantic validation
      const semantic = validateMasterPlan(parsed, { locale: localeTyped, inputs });
      if (!semantic.ok) {
        console.warn("[MasterPlan/BE/generate] semantic validation failed", semantic.reasons);
        if (attempt === MAX_QUALITY_ATTEMPTS) {
          lastReasons = semantic.reasons;
          break;
        }
        lastReasons = semantic.reasons;
        continue;
      }

      // PDF overflow check
      const pdfResult = await generateMasterPlanPDF({ plan: parsed, locale: localeTyped });
      if (pdfResult.overflowed) {
        console.warn("[MasterPlan/BE/generate] pdf_overflow at attempt", attempt);
        if (attempt === MAX_QUALITY_ATTEMPTS) {
          return NextResponse.json({ error: "master_plan_overflow_unfixable" }, { status: 502 });
        }
        lastReasons = ["pdf_overflow"];
        continue;
      }

      pdfBytes = pdfResult.bytes;
      break;
    }

    if (!parsed || !pdfBytes) {
      return NextResponse.json(
        { error: "master_plan_quality_failed", reasons: lastReasons },
        { status: 502 },
      );
    }

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    return NextResponse.json({
      plan: parsed,
      pdfBase64,
      quality_warnings: lastReasons,
    });
  } catch (err) {
    console.error("[MasterPlan/BE/generate] fatal", err);
    return NextResponse.json({ error: "master_plan_internal" }, { status: 500 });
  }
}
