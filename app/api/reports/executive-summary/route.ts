import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCachedInterpretation, setCachedInterpretation } from "@/lib/reports/interpretation-cache";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";

export const runtime = "nodejs";
export const maxDuration = 60;

let client: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

export interface ExecFinding {
  type: "weakness" | "strength" | "connection";
  headline: string;
  body: string;
  related_dimension: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      assessment_id: string;
      scores: Record<string, number>;
      merged_metrics: Record<string, unknown>;
      user_profile: { age?: number; gender?: string };
      locale: string;
    };
    const { assessment_id, scores, merged_metrics, user_profile, locale } = body;

    if (!assessment_id) {
      return NextResponse.json({ error: "Missing assessment_id" }, { status: 400 });
    }

    const cached = await getCachedInterpretation(assessment_id, "_executive_summary", locale);
    if (cached) return NextResponse.json({ findings: cached });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
    }

    const LANG_DIRECTIVE: Record<string, string> = {
      de: 'Sprache: Deutsch, "du"-Form (informal). Überschriften auf Deutsch in Großbuchstaben.',
      en: "Language: English, second person ('you'). Headlines in English UPPERCASE.",
      it: "Lingua: Italiano, forma 'tu'. Titoli in italiano in MAIUSCOLO.",
      tr: 'Dil: Türkçe, samimi "sen" hitabı. Başlıklar Türkçe BÜYÜK HARFLERLE.',
    };
    const langDirective = LANG_DIRECTIVE[locale] ?? LANG_DIRECTIVE.en;

    const scoresText = Object.entries(scores).map(([k, v]) => `${k}: ${v}/100`).join(", ");
    const metricsText = JSON.stringify(merged_metrics ?? {}).slice(0, 600);

    const prompt = `You are a performance coach. Analyze the fitness data and name the 3 most important findings.

Scores: ${scoresText}
${user_profile.age ? `User: ${user_profile.age} years old, ${user_profile.gender || "unknown"}` : ""}
Measured data: ${metricsText}

Rules:
- ${langDirective}
- Finding 1: biggest weakness (lowest score or most notable value)
- Finding 2: biggest strength (highest score or positive trend)
- Finding 3: cross-connection (relation between two dimensions)
- Headline: max 50 characters
- Body: 3–4 sentences with concrete numbers from the data provided
- NO diagnoses, NO recommendations

Respond ONLY as JSON:
{"findings": [{"type": "weakness|strength|connection", "headline": "...", "body": "...", "related_dimension": "sleep|activity|vo2max|metabolic|stress"}]}`;

    const message = await callAnthropicWithRetry(getAnthropic(), {
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const findings = (JSON.parse(cleaned) as { findings: ExecFinding[] }).findings;
    if (!Array.isArray(findings) || findings.length === 0) {
      throw new Error("Empty findings in AI response");
    }

    await setCachedInterpretation(assessment_id, "_executive_summary", locale, findings);
    return NextResponse.json({ findings });
  } catch (err) {
    console.error("[reports/executive-summary]", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
