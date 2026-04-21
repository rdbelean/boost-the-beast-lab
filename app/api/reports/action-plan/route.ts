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
    const isDE = locale !== "en";
    const wk = isDE
      ? ["KW 1", "KW 2", "KW 3", "KW 4"]
      : ["Week 1", "Week 2", "Week 3", "Week 4"];

    const prompt = `Du bist Performance Coach. Erstelle einen 30-Tage-Plan mit genau 3 konkreten Zielen.

Scores: ${scoresText}
${user_profile.age ? `Nutzer: ${user_profile.age} Jahre, ${user_profile.gender || "unbekannt"}` : ""}
Mess-Daten: ${metricsText}

ZWINGEND:
- Fokus auf die 3 schwächsten Dimensionen (niedrigste Scores)
- week_milestones MUSS exakt 4 Objekte enthalten — niemals Strings, niemals leer
- Jedes Milestone-Objekt: {"week":"${wk[0]}","task":"<konkrete Aktion max 70 Zeichen>","milestone":"<messbares Zwischenziel>"}
- Wenn du keine spezifische Aktion kennst: wähle eine evidenzbasierte Standardmassnahme
${isDE ? "- Sprache: Deutsch" : "- Language: English"}

Pro Ziel:
- headline: max 55 Zeichen, klar & messbar (z.B. "DEEP SLEEP AUF >100 MIN")
- current_value: IST-Wert aus den Daten (z.B. "72 min Tiefschlaf")
- target_value: realistisches 30-Tage-Ziel (+10-25% Verbesserung)
- delta_pct: z.B. "+18%"
- metric_source: Wie messbar (z.B. "WHOOP Sleep Stages")

Antworte NUR als JSON:
{"goals": [
  {"headline":"...","current_value":"...","target_value":"...","delta_pct":"...","metric_source":"...",
   "week_milestones":[
     {"week":"${wk[0]}","task":"spezifische Aktion","milestone":"Zwischenziel"},
     {"week":"${wk[1]}","task":"spezifische Aktion","milestone":"Zwischenziel"},
     {"week":"${wk[2]}","task":"spezifische Aktion","milestone":"Zwischenziel"},
     {"week":"${wk[3]}","task":"Feintuning","milestone":"Zielwert"}
   ]}
]}`;

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    let goals: PlanGoal[];
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = (JSON.parse(cleaned) as { goals: PlanGoal[] }).goals.slice(0, 3);
      // Validate each goal has proper milestone objects
      goals = parsed.map((g) => ({
        ...g,
        week_milestones: normalizeMilestones(g.week_milestones, isDE),
      }));
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

function normalizeMilestones(
  raw: unknown,
  isDE: boolean,
): Array<{ week: string; task: string; milestone: string }> {
  const wk = isDE ? ["KW 1", "KW 2", "KW 3", "KW 4"] : ["Week 1", "Week 2", "Week 3", "Week 4"];
  const defaultTasks = isDE
    ? ["Baseline erfassen und analysieren", "Erste Massnahmen umsetzen", "Intensität steigern", "Feintuning und Konsolidierung"]
    : ["Establish baseline and analyze", "Implement first measures", "Increase intensity", "Fine-tune and consolidate"];
  const defaultMilestones = isDE
    ? ["Ausgangswert dokumentiert", "Erste Verbesserung sichtbar", "Zwischenziel erreicht", "Zielwert erreicht"]
    : ["Baseline documented", "First improvement visible", "Intermediate goal reached", "Target achieved"];

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

const DIM_MILESTONES: Record<string, { de: { tasks: string[]; milestones: string[] }; en: { tasks: string[]; milestones: string[] } }> = {
  sleep: {
    de: {
      tasks: ["Schlaftagebuch starten, Baseline erfassen", "Kein Bildschirm ab 21 Uhr, Schlafzeit fixieren ±30min", "Schlafumgebung optimieren (Temperatur 17-19°C, Dunkelheit)", "Feintuning basierend auf Wearable-Daten"],
      milestones: ["Ist-Wert dokumentiert", "Schlafeffizienz +3%", "Tiefschlaf +10 min", "Zielwert erreicht"],
    },
    en: {
      tasks: ["Start sleep journal, establish baseline", "No screens after 9 PM, fix sleep times ±30min", "Optimize sleep environment (temp 17-19°C, dark)", "Fine-tune based on wearable data"],
      milestones: ["Baseline documented", "Sleep efficiency +3%", "Deep sleep +10 min", "Target reached"],
    },
  },
  activity: {
    de: {
      tasks: ["Tagesschritte tracken, Trainingsplan erstellen", "3x Einheiten/Woche mit Herzfrequenz-Kontrolle", "Intensität progressiv steigern (+10% Volumen)", "Plateau durchbrechen, Variation einbauen"],
      milestones: ["Baseline aktiv", "Schrittzahl +1000/Tag", "MET-Minuten +15%", "Ziel-Aktivitätsniveau"],
    },
    en: {
      tasks: ["Track daily steps, create training plan", "3 sessions/week with heart rate control", "Progressively increase intensity (+10% volume)", "Break plateau, add variation"],
      milestones: ["Baseline active", "Steps +1000/day", "MET-minutes +15%", "Target activity level"],
    },
  },
  metabolic: {
    de: {
      tasks: ["Ernährungsprotokoll führen, Sitzzeit messen", "Sitzunterbrechungen alle 60min, +1L Wasser/Tag", "Proteinanteil optimieren (1.6-2g/kg KG)", "Körperkomposition re-messen, Anpassungen vornehmen"],
      milestones: ["IST-Werte dokumentiert", "Aktive Stunden +30min/Tag", "Hydration konstant", "BMI/Körperfett gemessen"],
    },
    en: {
      tasks: ["Keep food journal, measure sitting time", "Break sitting every 60min, +1L water/day", "Optimize protein intake (1.6-2g/kg BW)", "Re-measure body composition, adjust"],
      milestones: ["Baseline documented", "Active hours +30min/day", "Hydration consistent", "Body composition measured"],
    },
  },
  stress: {
    de: {
      tasks: ["HRV-Trend dokumentieren, Stressoren identifizieren", "10min Atemübung täglich, Erholungsstunden schützen", "Regenerationseinheit einbauen (Yoga/Spaziergang)", "Stressmanagement-Routine festigen"],
      milestones: ["HRV-Baseline erfasst", "HRV-Trend positiv", "Stressindex -10%", "Ziel-HRV erreicht"],
    },
    en: {
      tasks: ["Document HRV trend, identify stressors", "10min breathing exercise daily, protect recovery hours", "Add recovery session (yoga/walk)", "Consolidate stress management routine"],
      milestones: ["HRV baseline captured", "HRV trend positive", "Stress index -10%", "Target HRV reached"],
    },
  },
  vo2max: {
    de: {
      tasks: ["2x Zone-2-Training/Woche (60-70% HFmax, 45min)", "1x HIIT-Einheit/Woche (4x4min Intervalle)", "Trainingsvolumen progressiv steigern", "VO2max re-testen, Intensitätszonen anpassen"],
      milestones: ["Aerobe Basis aufgebaut", "Ruhepuls -2 bpm", "Ausdauerleistung +5%", "VO2max +2 ml/kg/min"],
    },
    en: {
      tasks: ["2x Zone-2 training/week (60-70% HRmax, 45min)", "1x HIIT session/week (4x4min intervals)", "Progressively increase training volume", "Re-test VO2max, adjust intensity zones"],
      milestones: ["Aerobic base built", "Resting HR -2 bpm", "Endurance +5%", "VO2max +2 ml/kg/min"],
    },
  },
};

function buildStaticPlan(scores: Record<string, number>, locale: string): PlanGoal[] {
  const isDE = locale !== "en";
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const goals: PlanGoal[] = [];
  const wk = isDE ? ["KW 1", "KW 2", "KW 3", "KW 4"] : ["Week 1", "Week 2", "Week 3", "Week 4"];

  for (const [dim, score] of sorted.slice(0, 3)) {
    const target = Math.min(100, Math.round(score * 1.15));
    const deltaPct = Math.round(((target - score) / score) * 100);
    const dimData = DIM_MILESTONES[dim];
    const tasks = dimData ? (isDE ? dimData.de.tasks : dimData.en.tasks) : [
      isDE ? "Baseline erfassen" : "Establish baseline",
      isDE ? "Erste Anpassungen" : "First adjustments",
      isDE ? "Intensivierung" : "Intensify",
      isDE ? "Feintuning" : "Fine-tuning",
    ];
    const milestones = dimData ? (isDE ? dimData.de.milestones : dimData.en.milestones) : [
      `${Math.round(score + (target - score) * 0.1)}/100`,
      `${Math.round(score + (target - score) * 0.4)}/100`,
      `${Math.round(score + (target - score) * 0.7)}/100`,
      `${target}/100`,
    ];

    goals.push({
      headline: isDE ? `${dim.toUpperCase()} AUF ${target}/100 STEIGERN` : `IMPROVE ${dim.toUpperCase()} TO ${target}/100`,
      current_value: `${score}/100`,
      target_value: `${target}/100`,
      delta_pct: `+${deltaPct}%`,
      metric_source: isDE ? "Performance Score" : "Performance Score",
      week_milestones: wk.map((w, i) => ({
        week: w,
        task: tasks[i] ?? (isDE ? "Fortschritt messen" : "Measure progress"),
        milestone: milestones[i] ?? `${target}/100`,
      })),
    });
  }

  return goals;
}
