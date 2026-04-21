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

function hasValidKey(k: string | undefined) {
  return !!(k && k.length >= 20 && !k.includes("your_") && !k.includes("dein-"));
}

export interface PlanGoal {
  headline: string;
  current_value: string;
  target_value: string;
  delta_pct?: string;
  metric_source: string;
  week_milestones: Array<{ week: string; task: string; milestone: string }>;
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

    const cached = await getCachedInterpretation(assessment_id, "_action_plan", locale);
    if (cached) return NextResponse.json({ goals: cached });

    if (!hasValidKey(process.env.ANTHROPIC_API_KEY)) {
      return NextResponse.json({ goals: buildStaticPlan(scores, locale) });
    }

    const scoresText = Object.entries(scores).map(([k, v]) => `${k}: ${v}/100`).join(", ");
    const metricsText = JSON.stringify(merged_metrics ?? {}).slice(0, 800);

    const prompt = `Du bist Performance Coach. Erstelle einen 30-Tage-Plan mit max. 3 konkreten Zielen.

Scores: ${scoresText}
${user_profile.age ? `Nutzer: ${user_profile.age} Jahre, ${user_profile.gender || "unbekannt"}` : ""}
Mess-Daten: ${metricsText}

Pro Ziel:
- headline: max 60 Zeichen, klar & messbar (z.B. "DEEP SLEEP AUF >100 MIN")
- current_value: aktueller IST-Wert aus den Daten (z.B. "72 min Tiefschlaf")
- target_value: realistisches 30-Tage-Ziel (+10-25% Verbesserung)
- delta_pct: Prozentuale Verbesserung (z.B. "+18%")
- metric_source: Wie messbar (z.B. "WHOOP Sleep Stages")
- week_milestones: Array mit 4 Einträgen (KW1-KW4), je {week: "KW 1", task: "...", milestone: "..."}

Ziele auf echte Schwachstellen (niedrige Scores) ausrichten. Messbar mit verfügbaren Datenquellen.

${locale !== "en" ? "Sprache: Deutsch" : "Language: English"}

Antworte NUR als JSON:
{"goals": [{...}, {...}, {...}]}`;

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    let goals: PlanGoal[];
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      goals = (JSON.parse(cleaned) as { goals: PlanGoal[] }).goals.slice(0, 3);
    } catch {
      goals = buildStaticPlan(scores, locale);
    }

    await setCachedInterpretation(assessment_id, "_action_plan", locale, goals);
    return NextResponse.json({ goals });
  } catch (err) {
    console.error("[reports/action-plan]", err);
    return NextResponse.json({ goals: [] });
  }
}

function buildStaticPlan(scores: Record<string, number>, locale: string): PlanGoal[] {
  const isDE = locale !== "en";
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const goals: PlanGoal[] = [];

  for (const [dim, score] of sorted.slice(0, 3)) {
    const target = Math.min(100, Math.round(score * 1.15));
    goals.push({
      headline: isDE ? `${dim.toUpperCase()} AUF ${target}/100 STEIGERN` : `IMPROVE ${dim.toUpperCase()} TO ${target}/100`,
      current_value: `${score}/100`,
      target_value: `${target}/100`,
      delta_pct: `+${Math.round(((target - score) / score) * 100)}%`,
      metric_source: isDE ? "Performance Score" : "Performance Score",
      week_milestones: [
        { week: isDE ? "KW 1" : "Week 1", task: isDE ? "Baseline etablieren" : "Establish baseline", milestone: isDE ? `${Math.round(score + (target - score) * 0.1)}/100` : `${Math.round(score + (target - score) * 0.1)}/100` },
        { week: isDE ? "KW 2" : "Week 2", task: isDE ? "Erste Anpassungen" : "First adjustments", milestone: `${Math.round(score + (target - score) * 0.4)}/100` },
        { week: isDE ? "KW 3" : "Week 3", task: isDE ? "Intensivieren" : "Intensify", milestone: `${Math.round(score + (target - score) * 0.7)}/100` },
        { week: isDE ? "KW 4" : "Week 4", task: isDE ? "Feintuning" : "Fine-tuning", milestone: `${target}/100` },
      ],
    });
  }

  return goals;
}
