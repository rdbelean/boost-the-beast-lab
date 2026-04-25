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

export interface PlanGoal {
  headline: string;
  current_value: string;
  target_value: string;
  delta_pct?: string;
  metric_source: string;
  week_milestones: Array<{ week: string; task: string; milestone: string }>;
}

const WEEK_LABELS_ALL: Record<string, string[]> = {
  de: ["KW 1", "KW 2", "KW 3", "KW 4"],
  en: ["Week 1", "Week 2", "Week 3", "Week 4"],
  it: ["Settimana 1", "Settimana 2", "Settimana 3", "Settimana 4"],
  tr: ["1. Hafta", "2. Hafta", "3. Hafta", "4. Hafta"],
};
const DEFAULT_TASKS: Record<string, string[]> = {
  de: ["Baseline erfassen und analysieren", "Erste Massnahmen umsetzen", "Intensität steigern", "Feintuning und Konsolidierung"],
  en: ["Establish baseline and analyze", "Implement first measures", "Increase intensity", "Fine-tune and consolidate"],
  it: ["Stabilire baseline e analizzare", "Attuare le prime misure", "Aumentare l'intensità", "Ottimizzazione e consolidamento"],
  tr: ["Baseline'ı belirle ve analiz et", "İlk önlemleri uygula", "Yoğunluğu artır", "İnce ayar ve sağlamlaştırma"],
};
const DEFAULT_MILESTONES: Record<string, string[]> = {
  de: ["Ausgangswert dokumentiert", "Erste Verbesserung sichtbar", "Zwischenziel erreicht", "Zielwert erreicht"],
  en: ["Baseline documented", "First improvement visible", "Intermediate goal reached", "Target achieved"],
  it: ["Baseline documentata", "Primo miglioramento visibile", "Obiettivo intermedio raggiunto", "Obiettivo raggiunto"],
  tr: ["Baseline kaydedildi", "İlk iyileşme görünür", "Ara hedef tutturuldu", "Hedef değere ulaşıldı"],
};

// Validation helper for AI output. Fills missing slots in a parsed AI
// response so the renderer doesn't blow up if Claude returns 3 milestones
// instead of 4. NOT a static replacement for a failed AI call — that
// case returns 502 to the caller.
function normalizeMilestones(
  raw: unknown,
  locale: string,
): Array<{ week: string; task: string; milestone: string }> {
  const wk = WEEK_LABELS_ALL[locale] ?? WEEK_LABELS_ALL.en;
  const defaultTasks = DEFAULT_TASKS[locale] ?? DEFAULT_TASKS.en;
  const defaultMilestones = DEFAULT_MILESTONES[locale] ?? DEFAULT_MILESTONES.en;

  if (!Array.isArray(raw) || raw.length === 0) {
    return wk.map((w, i) => ({ week: w, task: defaultTasks[i], milestone: defaultMilestones[i] }));
  }

  return wk.map((w, i) => {
    const entry = raw[i];
    if (typeof entry === "object" && entry !== null && "week" in entry && "task" in entry) {
      const e = entry as Record<string, string>;
      return {
        week: String(e.week || w),
        task: String(e.task || defaultTasks[i]),
        milestone: String(e.milestone || defaultMilestones[i]),
      };
    }
    return { week: w, task: defaultTasks[i], milestone: defaultMilestones[i] };
  });
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
    }

    const scoresText = Object.entries(scores).map(([k, v]) => `${k}: ${v}/100`).join(", ");
    const metricsText = JSON.stringify(merged_metrics ?? {}).slice(0, 800);
    const LANG_DIRECTIVE: Record<string, string> = {
      de: 'Sprache: Deutsch, "du"-Form',
      en: "Language: English, second person",
      it: "Lingua: Italiano, forma 'tu'",
      tr: 'Dil: Türkçe, samimi "sen" hitabı (resmi "siz" değil)',
    };
    const wk = WEEK_LABELS_ALL[locale] ?? WEEK_LABELS_ALL.en;
    const langDirective = LANG_DIRECTIVE[locale] ?? LANG_DIRECTIVE.en;

    const prompt = `You are a performance coach. Create a 30-day plan with exactly 3 concrete goals.

Scores: ${scoresText}
${user_profile.age ? `User: ${user_profile.age} years, ${user_profile.gender || "unknown"}` : ""}
Measured data: ${metricsText}

MANDATORY:
- Focus on the 3 weakest dimensions (lowest scores)
- week_milestones MUST contain exactly 4 objects — never strings, never empty
- Each milestone object: {"week":"${wk[0]}","task":"<concrete action max 70 chars>","milestone":"<measurable intermediate goal>"}
- If no specific action is known: choose an evidence-based standard measure
- ${langDirective}

Per goal:
- headline: max 55 characters, clear & measurable (e.g. "DEEP SLEEP TO >100 MIN")
- current_value: actual value from the data (e.g. "72 min deep sleep")
- target_value: realistic 30-day goal (+10-25% improvement)
- delta_pct: e.g. "+18%"
- metric_source: how measurable (e.g. "WHOOP Sleep Stages")

Respond ONLY as JSON:
{"goals": [
  {"headline":"...","current_value":"...","target_value":"...","delta_pct":"...","metric_source":"...",
   "week_milestones":[
     {"week":"${wk[0]}","task":"specific action","milestone":"intermediate goal"},
     {"week":"${wk[1]}","task":"specific action","milestone":"intermediate goal"},
     {"week":"${wk[2]}","task":"specific action","milestone":"intermediate goal"},
     {"week":"${wk[3]}","task":"fine-tuning","milestone":"target value"}
   ]}
]}`;

    const message = await callAnthropicWithRetry(getAnthropic(), {
      model: "claude-sonnet-4-6",
      max_tokens: 2400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = (JSON.parse(cleaned) as { goals: PlanGoal[] }).goals.slice(0, 3);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Empty goals in AI response");
    }
    const goals: PlanGoal[] = parsed.map((g) => ({
      ...g,
      week_milestones: normalizeMilestones(g.week_milestones, locale),
    }));

    await setCachedInterpretation(assessment_id, "_action_plan", locale, goals);
    return NextResponse.json({ goals });
  } catch (err) {
    console.error("[reports/action-plan]", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
