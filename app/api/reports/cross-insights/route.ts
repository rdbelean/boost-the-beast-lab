import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCachedInterpretation, setCachedInterpretation } from "@/lib/reports/interpretation-cache";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";

export const runtime = "nodejs";
export const maxDuration = 45;

let client: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

export interface CrossInsight {
  dimension_a: string;
  dimension_b: string;
  headline: string;
  body: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      assessment_id: string;
      scores: Record<string, number>;
      merged_metrics: Record<string, unknown>;
      locale: string;
    };
    const { assessment_id, scores, merged_metrics, locale } = body;

    if (!assessment_id) {
      return NextResponse.json({ error: "Missing assessment_id" }, { status: 400 });
    }

    const cached = await getCachedInterpretation(assessment_id, "_cross_insights", locale);
    if (cached) return NextResponse.json({ insights: cached });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
    }

    const LANG_DIRECTIVE: Record<string, string> = {
      de: 'Sprache: Deutsch, "du"-Form',
      en: "Language: English, second person",
      it: "Lingua: Italiano, forma 'tu'",
      tr: 'Dil: Türkçe, samimi "sen" hitabı',
    };
    const langDirective = LANG_DIRECTIVE[locale] ?? LANG_DIRECTIVE.en;

    const scoresText = Object.entries(scores).map(([k, v]) => `${k}: ${v}/100`).join(", ");
    const metricsText = JSON.stringify(merged_metrics ?? {}).slice(0, 600);

    const prompt = `Analyze the fitness data and find up to 3 connections between dimensions.

Scores: ${scoresText}
Measured data: ${metricsText}

Allowed dimension pairs:
- Sleep ↔ Recovery/Stress
- Activity ↔ Sleep
- Activity ↔ Recovery
- Metabolic ↔ Activity
- Stress ↔ Sleep

Per insight:
- headline: "DIMENSION_A ↔ DIMENSION_B" (uppercase; max 40 characters)
- body: 2–3 sentences with concrete numbers from the data
- Only insights supported by the data

${langDirective}

Respond ONLY as JSON:
{"insights": [{"dimension_a": "sleep", "dimension_b": "stress", "headline": "...", "body": "..."}]}`;

    const message = await callAnthropicWithRetry(getAnthropic(), {
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const insights = (JSON.parse(cleaned) as { insights: CrossInsight[] }).insights.slice(0, 3);
    if (!Array.isArray(insights) || insights.length === 0) {
      throw new Error("Empty insights in AI response");
    }

    await setCachedInterpretation(assessment_id, "_cross_insights", locale, insights);
    return NextResponse.json({ insights });
  } catch (err) {
    console.error("[reports/cross-insights]", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
