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

    const LANG_DIRECTIVE: Record<string, string> = {
      de: 'Sprache: Deutsch, "du"-Form',
      en: "Language: English, second person",
      it: "Lingua: Italiano, forma 'tu'",
      ko: "언어: 한국어, 친근한 존댓말",
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
- headline: "DIMENSION_A ↔ DIMENSION_B" (uppercase for Latin scripts, short & strong for Korean; max 40 characters)
- body: 2–3 sentences with concrete numbers from the data
- Only insights supported by the data

${langDirective}

Respond ONLY as JSON:
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
  const sleepScore = scores.sleep ?? 60;
  const stressScore = scores.stress ?? 60;
  const activityScore = scores.activity ?? 60;

  const COPY: Record<string, { ss_h: string; ss_b: string; as_h: string; as_b: string }> = {
    de: {
      ss_h: "SCHLAF ↔ STRESS",
      ss_b: `Dein Sleep Score von ${sleepScore}/100 und dein Stress Score von ${stressScore}/100 sind direkt miteinander verknüpft. Schlechte Schlafqualität erhöht den Cortisolspiegel — das erklärt den Zusammenhang.`,
      as_h: "AKTIVITÄT ↔ SCHLAF",
      as_b: `Aktivitäts-Score ${activityScore}/100 und Schlaf-Score ${sleepScore}/100 zeigen einen klaren Zusammenhang. Regelmäßige körperliche Aktivität verbessert nachweislich die Schlafqualität und -dauer.`,
    },
    en: {
      ss_h: "SLEEP ↔ STRESS",
      ss_b: `Your sleep score of ${sleepScore}/100 and stress score of ${stressScore}/100 are directly linked. Poor sleep quality elevates cortisol levels — this explains the correlation.`,
      as_h: "ACTIVITY ↔ SLEEP",
      as_b: `Activity score ${activityScore}/100 and sleep score ${sleepScore}/100 show a clear relationship. Regular physical activity demonstrably improves sleep quality and duration.`,
    },
    it: {
      ss_h: "SONNO ↔ STRESS",
      ss_b: `Il tuo Sleep Score di ${sleepScore}/100 e lo Stress Score di ${stressScore}/100 sono direttamente collegati. Una scarsa qualità del sonno alza il cortisolo — questo spiega la correlazione.`,
      as_h: "ATTIVITÀ ↔ SONNO",
      as_b: `Il punteggio Attività ${activityScore}/100 e Sonno ${sleepScore}/100 mostrano una chiara relazione. L'attività fisica regolare migliora in modo comprovato la qualità e la durata del sonno.`,
    },
    ko: {
      ss_h: "수면 ↔ 스트레스",
      ss_b: `수면 점수 ${sleepScore}/100과 스트레스 점수 ${stressScore}/100은 직접적으로 연결되어 있습니다. 수면의 질이 떨어지면 코르티솔 수치가 상승하며, 이것이 상관관계를 설명합니다.`,
      as_h: "활동 ↔ 수면",
      as_b: `활동 점수 ${activityScore}/100과 수면 점수 ${sleepScore}/100은 명확한 관계를 보입니다. 규칙적인 신체 활동은 수면의 질과 지속 시간을 개선한다는 것이 입증되어 있습니다.`,
    },
  };
  const c = COPY[locale] ?? COPY.en;

  return [
    { dimension_a: "sleep", dimension_b: "stress", headline: c.ss_h, body: c.ss_b },
    { dimension_a: "activity", dimension_b: "sleep", headline: c.as_h, body: c.as_b },
  ];
}
