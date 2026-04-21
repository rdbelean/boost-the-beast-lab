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
    const WEEK_LABELS: Record<string, string[]> = {
      de: ["KW 1", "KW 2", "KW 3", "KW 4"],
      en: ["Week 1", "Week 2", "Week 3", "Week 4"],
      it: ["Settimana 1", "Settimana 2", "Settimana 3", "Settimana 4"],
      tr: ["1. Hafta", "2. Hafta", "3. Hafta", "4. Hafta"],
    };
    const LANG_DIRECTIVE: Record<string, string> = {
      de: 'Sprache: Deutsch, "du"-Form',
      en: "Language: English, second person",
      it: "Lingua: Italiano, forma 'tu'",
      tr: 'Dil: Türkçe, samimi "sen" hitabı (resmi "siz" değil)',
    };
    const wk = WEEK_LABELS[locale] ?? WEEK_LABELS.en;
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
        week_milestones: normalizeMilestones(g.week_milestones, locale),
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

type DimBundle = { tasks: string[]; milestones: string[] };
const DIM_MILESTONES: Record<string, Record<string, DimBundle>> = {
  sleep: {
    de: {
      tasks: ["Schlaftagebuch starten, Baseline erfassen", "Kein Bildschirm ab 21 Uhr, Schlafzeit fixieren ±30min", "Schlafumgebung optimieren (Temperatur 17-19°C, Dunkelheit)", "Feintuning basierend auf Wearable-Daten"],
      milestones: ["Ist-Wert dokumentiert", "Schlafeffizienz +3%", "Tiefschlaf +10 min", "Zielwert erreicht"],
    },
    en: {
      tasks: ["Start sleep journal, establish baseline", "No screens after 9 PM, fix sleep times ±30min", "Optimize sleep environment (temp 17-19°C, dark)", "Fine-tune based on wearable data"],
      milestones: ["Baseline documented", "Sleep efficiency +3%", "Deep sleep +10 min", "Target reached"],
    },
    it: {
      tasks: ["Iniziare diario del sonno, stabilire baseline", "Niente schermi dopo le 21, orari di sonno fissi ±30min", "Ottimizzare ambiente (temp 17-19°C, buio)", "Ottimizzazione basata su dati wearable"],
      milestones: ["Baseline documentata", "Efficienza sonno +3%", "Sonno profondo +10 min", "Obiettivo raggiunto"],
    },
    tr: {
      tasks: ["Uyku günlüğü başlat, baseline belirle", "21:00 sonrası ekran yok, uyku saatleri ±30dk sabit", "Uyku ortamı optimize (ısı 17-19°C, karanlık)", "Wearable verisine göre ince ayar"],
      milestones: ["Baseline kaydedildi", "Uyku verimliliği +%3", "Derin uyku +10 dk", "Hedefe ulaşıldı"],
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
    it: {
      tasks: ["Tracciare passi giornalieri, creare piano allenamento", "3 sessioni/settimana con controllo FC", "Aumentare intensità progressivamente (+10% volume)", "Superare plateau, aggiungere varietà"],
      milestones: ["Baseline attiva", "Passi +1000/giorno", "MET-minuti +15%", "Livello attività raggiunto"],
    },
    tr: {
      tasks: ["Günlük adımları takip et, antrenman planı oluştur", "Haftada 3 seans kalp atışı kontrolü ile", "Yoğunluğu aşamalı artır (+%10 hacim)", "Plato'yu kır, çeşitlilik ekle"],
      milestones: ["Baseline aktif", "Adım +1000/gün", "MET-dakika +%15", "Hedef aktivite seviyesi"],
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
    it: {
      tasks: ["Diario alimentare, misurare tempo seduti", "Interrompere seduta ogni 60min, +1L acqua/giorno", "Ottimizzare proteine (1.6-2g/kg peso)", "Rimisurare composizione corporea, adeguare"],
      milestones: ["Baseline documentata", "Ore attive +30min/giorno", "Idratazione costante", "Composizione misurata"],
    },
    tr: {
      tasks: ["Beslenme günlüğü, oturma süresini ölç", "60dk'da bir oturmaya ara, +1L su/gün", "Protein alımını optimize et (1.6-2g/kg vücut ağırlığı)", "Vücut kompozisyonunu yeniden ölç, ayarla"],
      milestones: ["Baseline kaydedildi", "Aktif saat +30 dk/gün", "Hidrasyon tutarlı", "Vücut kompozisyonu ölçüldü"],
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
    it: {
      tasks: ["Documentare trend HRV, identificare stressor", "10min respirazione al giorno, proteggere ore recupero", "Sessione di recupero (yoga/camminata)", "Consolidare routine gestione stress"],
      milestones: ["Baseline HRV registrata", "Trend HRV positivo", "Indice stress -10%", "HRV target raggiunto"],
    },
    tr: {
      tasks: ["HRV trendini kaydet, stres kaynaklarını belirle", "Günlük 10 dk nefes egzersizi, toparlanma saatlerini koru", "Recovery seansı ekle (yoga/yürüyüş)", "Stres yönetim rutinini sağlamlaştır"],
      milestones: ["HRV baseline alındı", "HRV trendi pozitif", "Stres indeksi -%10", "Hedef HRV'ye ulaşıldı"],
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
    it: {
      tasks: ["2x allenamento Zona-2/settimana (60-70% FCmax, 45min)", "1x HIIT/settimana (intervalli 4x4min)", "Aumentare volume progressivamente", "Ritestare VO2max, regolare zone"],
      milestones: ["Base aerobica costruita", "FC a riposo -2 bpm", "Resistenza +5%", "VO2max +2 ml/kg/min"],
    },
    tr: {
      tasks: ["Haftada 2x Zon-2 antrenman (HRmax %60-70, 45 dk)", "Haftada 1x HIIT seans (4x4 dk interval)", "Antrenman hacmini aşamalı artır", "VO2max yeniden test et, yoğunluk zonlarını ayarla"],
      milestones: ["Aerobik temel kuruldu", "İstirahat nabzı -2 bpm", "Dayanıklılık +%5", "VO2max +2 ml/kg/dk"],
    },
  },
};

const GENERIC_TASKS: Record<string, string[]> = {
  de: ["Baseline erfassen", "Erste Anpassungen", "Intensivierung", "Feintuning"],
  en: ["Establish baseline", "First adjustments", "Intensify", "Fine-tuning"],
  it: ["Stabilire baseline", "Primi aggiustamenti", "Intensificare", "Ottimizzazione"],
  tr: ["Baseline belirle", "İlk ayarlamalar", "Yoğunlaştır", "İnce ayar"],
};
const MEASURE_PROGRESS: Record<string, string> = {
  de: "Fortschritt messen",
  en: "Measure progress",
  it: "Misurare progresso",
  tr: "İlerlemeyi ölç",
};
const HEADLINE_FMT: Record<string, (dim: string, target: number) => string> = {
  de: (dim, t) => `${dim.toUpperCase()} AUF ${t}/100 STEIGERN`,
  en: (dim, t) => `IMPROVE ${dim.toUpperCase()} TO ${t}/100`,
  it: (dim, t) => `MIGLIORARE ${dim.toUpperCase()} A ${t}/100`,
  tr: (dim, t) => `${dim.toUpperCase()} SKORUNU ${t}/100'E YÜKSELT`,
};

function buildStaticPlan(scores: Record<string, number>, locale: string): PlanGoal[] {
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const goals: PlanGoal[] = [];
  const wk = WEEK_LABELS_ALL[locale] ?? WEEK_LABELS_ALL.en;
  const genericTasks = GENERIC_TASKS[locale] ?? GENERIC_TASKS.en;
  const measureProgress = MEASURE_PROGRESS[locale] ?? MEASURE_PROGRESS.en;
  const headlineFmt = HEADLINE_FMT[locale] ?? HEADLINE_FMT.en;

  for (const [dim, score] of sorted.slice(0, 3)) {
    const target = Math.min(100, Math.round(score * 1.15));
    const deltaPct = Math.round(((target - score) / score) * 100);
    const dimData = DIM_MILESTONES[dim];
    const bundle = dimData ? (dimData[locale] ?? dimData.en) : undefined;
    const tasks = bundle ? bundle.tasks : genericTasks;
    const milestones = bundle ? bundle.milestones : [
      `${Math.round(score + (target - score) * 0.1)}/100`,
      `${Math.round(score + (target - score) * 0.4)}/100`,
      `${Math.round(score + (target - score) * 0.7)}/100`,
      `${target}/100`,
    ];

    goals.push({
      headline: headlineFmt(dim, target),
      current_value: `${score}/100`,
      target_value: `${target}/100`,
      delta_pct: `+${deltaPct}%`,
      metric_source: "Performance Score",
      week_milestones: wk.map((w, i) => ({
        week: w,
        task: tasks[i] ?? measureProgress,
        milestone: milestones[i] ?? `${target}/100`,
      })),
    });
  }

  return goals;
}
