import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCachedInterpretation, setCachedInterpretation } from "@/lib/reports/interpretation-cache";

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

function hasValidKey(k: string | undefined) {
  return !!(k && k.length >= 20 && !k.includes("your_") && !k.includes("dein-"));
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

    if (!hasValidKey(process.env.ANTHROPIC_API_KEY)) {
      return NextResponse.json({ insights: buildStaticInsights(scores, locale) });
    }

    const scoresText = Object.entries(scores).map(([k, v]) => `${k}: ${v}/100`).join(", ");
    const metricsText = JSON.stringify(merged_metrics ?? {}).slice(0, 600);

    const prompt = `Analysiere die Fitness-Daten und finde bis zu 3 Zusammenhänge zwischen Dimensionen.

Scores: ${scoresText}
Mess-Daten: ${metricsText}

Erlaubte Dimension-Paare:
- Sleep ↔ Recovery/Stress
- Activity ↔ Sleep
- Activity ↔ Recovery
- Metabolic ↔ Activity
- Stress ↔ Sleep

Pro Insight:
- headline: "DIMENSION_A ↔ DIMENSION_B" (Großbuchstaben, max 40 Zeichen)
- body: 2–3 Sätze mit konkreten Zahlen aus den Daten
- Nur Insights die durch die Daten gestützt sind

${locale !== "en" ? "Sprache: Deutsch" : "Language: English"}

Antworte NUR als JSON:
{"insights": [{"dimension_a": "sleep", "dimension_b": "stress", "headline": "...", "body": "..."}]}`;

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    let insights: CrossInsight[];
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      insights = (JSON.parse(cleaned) as { insights: CrossInsight[] }).insights.slice(0, 3);
    } catch {
      insights = buildStaticInsights(scores, locale);
    }

    await setCachedInterpretation(assessment_id, "_cross_insights", locale, insights);
    return NextResponse.json({ insights });
  } catch (err) {
    console.error("[reports/cross-insights]", err);
    return NextResponse.json({ insights: [] });
  }
}

function buildStaticInsights(scores: Record<string, number>, locale: string): CrossInsight[] {
  const isDE = locale !== "en";
  const sleepScore = scores.sleep ?? 60;
  const stressScore = scores.stress ?? 60;
  const activityScore = scores.activity ?? 60;

  return [
    {
      dimension_a: "sleep",
      dimension_b: "stress",
      headline: isDE ? "SCHLAF ↔ STRESS" : "SLEEP ↔ STRESS",
      body: isDE
        ? `Dein Sleep Score von ${sleepScore}/100 und dein Stress Score von ${stressScore}/100 sind direkt miteinander verknüpft. Schlechte Schlafqualität erhöht den Cortisolspiegel — das erklärt den Zusammenhang.`
        : `Your sleep score of ${sleepScore}/100 and stress score of ${stressScore}/100 are directly linked. Poor sleep quality elevates cortisol levels — this explains the correlation.`,
    },
    {
      dimension_a: "activity",
      dimension_b: "sleep",
      headline: isDE ? "AKTIVITÄT ↔ SCHLAF" : "ACTIVITY ↔ SLEEP",
      body: isDE
        ? `Aktivitäts-Score ${activityScore}/100 und Schlaf-Score ${sleepScore}/100 zeigen einen klaren Zusammenhang. Regelmäßige körperliche Aktivität verbessert nachweislich die Schlafqualität und -dauer.`
        : `Activity score ${activityScore}/100 and sleep score ${sleepScore}/100 show a clear relationship. Regular physical activity demonstrably improves sleep quality and duration.`,
    },
  ];
}
