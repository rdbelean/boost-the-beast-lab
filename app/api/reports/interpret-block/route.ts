import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCachedInterpretation, setCachedInterpretation } from "@/lib/reports/interpretation-cache";

export const runtime = "nodejs";
export const maxDuration = 30;

function hasValidKey(key: string | undefined): boolean {
  return !!(key && key.length >= 20 && !key.includes("your_") && !key.includes("dein-"));
}

let client: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

interface BlockInterpretRequest {
  assessment_id: string;
  dimension: "sleep" | "activity" | "vo2max" | "metabolic" | "stress";
  metrics: Array<{ label_key: string; value: string; unit?: string }>;
  score: number;
  user_profile: { age?: number; gender?: string };
  other_dimensions?: Record<string, number>;
  locale: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BlockInterpretRequest;
    const { assessment_id, dimension, metrics, score, user_profile, other_dimensions, locale } = body;

    if (!assessment_id || !dimension || !metrics || !locale) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Try cache first
    const cached = await getCachedInterpretation(assessment_id, dimension, locale);
    if (cached && typeof cached === "object" && "interpretation" in (cached as object)) {
      return NextResponse.json(cached);
    }

    if (!hasValidKey(process.env.ANTHROPIC_API_KEY)) {
      return NextResponse.json({ interpretation: null });
    }

    const LANG_DIRECTIVE: Record<string, string> = {
      de: 'Sprache: Deutsch, "du"-Form (informal)',
      en: "Language: English, second person ('you')",
      it: "Lingua: Italiano, forma 'tu' (informale)",
      ko: "언어: 한국어, 친근한 존댓말 (~합니다/~습니다)",
    };
    const langDirective = LANG_DIRECTIVE[locale] ?? LANG_DIRECTIVE.en;

    const metricsText = metrics
      .map((m) => `${m.label_key}: ${m.value}${m.unit ? " " + m.unit : ""}`)
      .join(", ");
    const otherText = other_dimensions
      ? Object.entries(other_dimensions)
          .map(([k, v]) => `${k}: ${v}/100`)
          .join(", ")
      : "";

    const prompt = `You are a sports scientist. Analyze this fitness data and write a short interpretation.

Dimension: ${dimension}
Score: ${score}/100
Measured values: ${metricsText}
${otherText ? `Other dimensions: ${otherText}` : ""}
${user_profile.age ? `Age: ${user_profile.age}, Gender: ${user_profile.gender || "unknown"}` : ""}

Rules:
- ${langDirective}
- Exactly 2–3 sentences, max 280 characters
- Sentence 1: most important finding with a concrete number
- Sentence 2: relation to another dimension or training context
- Optional sentence 3: implication
- NO diagnoses, NO recommendations, NO generic phrases
- Use only values given above

Respond ONLY as JSON: {"interpretation": "..."}`;

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    let interpretation: string | null = null;
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned) as { interpretation: string };
      interpretation = parsed.interpretation ?? null;
    } catch {
      interpretation = null;
    }

    const result = { interpretation };
    await setCachedInterpretation(assessment_id, dimension, locale, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[reports/interpret-block]", err);
    return NextResponse.json({ interpretation: null });
  }
}
