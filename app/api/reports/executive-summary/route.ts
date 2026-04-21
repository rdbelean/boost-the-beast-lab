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

    const scoresText = Object.entries(scores).map(([k, v]) => `${k}: ${v}/100`).join(", ");
    const metricsText = JSON.stringify(merged_metrics ?? {}).slice(0, 600);

    const prompt = `Du bist Performance Coach. Analysiere die Fitness-Daten und nenne die 3 wichtigsten Erkenntnisse.

Scores: ${scoresText}
${user_profile.age ? `Nutzer: ${user_profile.age} Jahre, ${user_profile.gender || "unbekannt"}` : ""}
Mess-Daten: ${metricsText}

Regeln:
- ${locale !== "en" ? 'Sprache: Deutsch, "du"-Form' : "Language: English"}
- Finding 1: größte Schwachstelle (niedrigster Score oder auffälligster Wert)
- Finding 2: größte Stärke (höchster Score oder positiver Trend)
- Finding 3: Cross-Connection (Zusammenhang zwischen zwei Dimensionen)
- Headline: max 50 Zeichen, GROSSBUCHSTABEN
- Body: 3–4 Sätze mit konkreten Zahlen aus den übergebenen Daten
- KEINE Diagnosen, KEINE Empfehlungen

Antworte NUR als JSON:
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
  const isDE = locale !== "en";
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  return [
    {
      type: "weakness",
      headline: isDE ? `${(weakest[0] ?? "").toUpperCase()} OPTIMIEREN` : `IMPROVE ${(weakest[0] ?? "").toUpperCase()}`,
      body: isDE
        ? `Dein ${weakest[0]}-Score liegt bei ${weakest[1]}/100 und ist damit der niedrigste Wert in deinem Profil. Hier liegt das größte Hebelpotenzial für deinen Overall Performance Index.`
        : `Your ${weakest[0]} score of ${weakest[1]}/100 is the lowest in your profile. This represents the highest leverage area for your overall performance index.`,
      related_dimension: weakest[0] ?? "sleep",
    },
    {
      type: "strength",
      headline: isDE ? `${(strongest[0] ?? "").toUpperCase()} ALS STÄRKE` : `${(strongest[0] ?? "").toUpperCase()} IS A STRENGTH`,
      body: isDE
        ? `Mit ${strongest[1]}/100 zeigt dein ${strongest[0]}-Score eine klare Stärke. Dieses Fundament unterstützt deine Performance in anderen Bereichen.`
        : `At ${strongest[1]}/100, your ${strongest[0]} score is a clear strength. This foundation supports your performance across other dimensions.`,
      related_dimension: strongest[0] ?? "activity",
    },
    {
      type: "connection",
      headline: isDE ? "DIMENSIONEN-ZUSAMMENHANG" : "CROSS-DIMENSION LINK",
      body: isDE
        ? `Dein ${weakest[0]}-Score beeinflusst direkt deinen ${strongest[0]}-Score. Gezielte Verbesserungen hier haben Multiplikator-Effekte auf deinen Gesamtstatus.`
        : `Your ${weakest[0]} score directly affects your ${strongest[0]} score. Targeted improvements here create multiplier effects on your overall status.`,
      related_dimension: weakest[0] ?? "sleep",
    },
  ];
}
