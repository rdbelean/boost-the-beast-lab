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

    const isDE = locale !== "en";
    const metricsText = metrics
      .map((m) => `${m.label_key}: ${m.value}${m.unit ? " " + m.unit : ""}`)
      .join(", ");
    const otherText = other_dimensions
      ? Object.entries(other_dimensions)
          .map(([k, v]) => `${k}: ${v}/100`)
          .join(", ")
      : "";

    const prompt = `Du bist Sportwissenschaftler. Analysiere diese Fitness-Daten und schreibe eine Kurzinterpretation.

Dimension: ${dimension}
Score: ${score}/100
Gemessene Werte: ${metricsText}
${otherText ? `Andere Dimensionen: ${otherText}` : ""}
${user_profile.age ? `Alter: ${user_profile.age}, Geschlecht: ${user_profile.gender || "unbekannt"}` : ""}

Regeln:
- ${isDE ? 'Sprache: Deutsch, "du"-Form' : "Language: English, second person"}
- Exakt 2–3 Sätze, maximal 280 Zeichen
- Satz 1: wichtigste Auffälligkeit mit konkreter Zahl
- Satz 2: Bezug zu einer anderen Dimension oder Trainingskontext
- Optional Satz 3: Implikation
- KEINE Diagnosen, KEINE Handlungsempfehlungen, KEINE generischen Phrasen
- Nur Werte verwenden, die oben angegeben sind

Antworte NUR als JSON: {"interpretation": "..."}`;

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
