import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCachedInterpretation, setCachedInterpretation } from "@/lib/reports/interpretation-cache";

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

function hasValidKey(key: string | undefined): boolean {
  return !!(key && key.length >= 20 && !key.includes("your_") && !key.includes("dein-"));
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

    if (!hasValidKey(process.env.ANTHROPIC_API_KEY)) {
      return NextResponse.json({ findings: buildStaticFindings(scores, locale) });
    }

    const LANG_DIRECTIVE: Record<string, string> = {
      de: 'Sprache: Deutsch, "du"-Form (informal). Überschriften auf Deutsch in Großbuchstaben.',
      en: "Language: English, second person ('you'). Headlines in English UPPERCASE.",
      it: "Lingua: Italiano, forma 'tu'. Titoli in italiano in MAIUSCOLO.",
      ko: "언어: 한국어, 친근한 존댓말. 제목은 한국어로 작성 (대문자 개념 없음, 짧고 강하게).",
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

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    let findings: ExecFinding[];
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      findings = (JSON.parse(cleaned) as { findings: ExecFinding[] }).findings;
    } catch {
      findings = buildStaticFindings(scores, locale);
    }

    await setCachedInterpretation(assessment_id, "_executive_summary", locale, findings);
    return NextResponse.json({ findings });
  } catch (err) {
    console.error("[reports/executive-summary]", err);
    return NextResponse.json({ findings: [] });
  }
}

function buildStaticFindings(scores: Record<string, number>, locale: string): ExecFinding[] {
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];
  const wDim = (weakest?.[0] ?? "").toUpperCase();
  const sDim = (strongest?.[0] ?? "").toUpperCase();
  const wVal = weakest?.[1] ?? 0;
  const sVal = strongest?.[1] ?? 0;

  const COPY: Record<string, { weakHead: string; weakBody: string; strongHead: string; strongBody: string; connHead: string; connBody: string }> = {
    de: {
      weakHead: `${wDim} OPTIMIEREN`,
      weakBody: `Dein ${weakest[0]}-Score liegt bei ${wVal}/100 und ist damit der niedrigste Wert in deinem Profil. Hier liegt das größte Hebelpotenzial für deinen Overall Performance Index.`,
      strongHead: `${sDim} ALS STÄRKE`,
      strongBody: `Mit ${sVal}/100 zeigt dein ${strongest[0]}-Score eine klare Stärke. Dieses Fundament unterstützt deine Performance in anderen Bereichen.`,
      connHead: "DIMENSIONEN-ZUSAMMENHANG",
      connBody: `Dein ${weakest[0]}-Score beeinflusst direkt deinen ${strongest[0]}-Score. Gezielte Verbesserungen hier haben Multiplikator-Effekte auf deinen Gesamtstatus.`,
    },
    en: {
      weakHead: `IMPROVE ${wDim}`,
      weakBody: `Your ${weakest[0]} score of ${wVal}/100 is the lowest in your profile. This represents the highest leverage area for your overall performance index.`,
      strongHead: `${sDim} IS A STRENGTH`,
      strongBody: `At ${sVal}/100, your ${strongest[0]} score is a clear strength. This foundation supports your performance across other dimensions.`,
      connHead: "CROSS-DIMENSION LINK",
      connBody: `Your ${weakest[0]} score directly affects your ${strongest[0]} score. Targeted improvements here create multiplier effects on your overall status.`,
    },
    it: {
      weakHead: `MIGLIORARE ${wDim}`,
      weakBody: `Il tuo punteggio ${weakest[0]} di ${wVal}/100 è il più basso nel tuo profilo. Qui si trova il maggior potenziale di leva per il tuo indice di performance complessivo.`,
      strongHead: `${sDim} È UN PUNTO DI FORZA`,
      strongBody: `Con ${sVal}/100, il tuo punteggio ${strongest[0]} è una chiara forza. Questa base supporta la tua performance in altre dimensioni.`,
      connHead: "COLLEGAMENTO TRA DIMENSIONI",
      connBody: `Il tuo punteggio ${weakest[0]} influisce direttamente sul tuo punteggio ${strongest[0]}. Miglioramenti mirati qui generano effetti moltiplicatori sul tuo stato complessivo.`,
    },
    ko: {
      weakHead: `${wDim} 개선 필요`,
      weakBody: `${weakest[0]} 점수는 ${wVal}/100으로 프로필에서 가장 낮은 수치입니다. 전반적 퍼포먼스 지수를 높이는 데 가장 큰 레버리지 포인트입니다.`,
      strongHead: `${sDim} 강점 영역`,
      strongBody: `${sVal}/100의 ${strongest[0]} 점수는 명확한 강점을 보여줍니다. 이 기반이 다른 영역의 퍼포먼스를 뒷받침합니다.`,
      connHead: "차원 간 연결",
      connBody: `${weakest[0]} 점수는 ${strongest[0]} 점수에 직접적으로 영향을 미칩니다. 이 영역의 타겟 개선은 전체 상태에 승수 효과를 만듭니다.`,
    },
  };
  const c = COPY[locale] ?? COPY.en;

  return [
    { type: "weakness", headline: c.weakHead, body: c.weakBody, related_dimension: weakest[0] ?? "sleep" },
    { type: "strength", headline: c.strongHead, body: c.strongBody, related_dimension: strongest[0] ?? "activity" },
    { type: "connection", headline: c.connHead, body: c.connBody, related_dimension: weakest[0] ?? "sleep" },
  ];
}
