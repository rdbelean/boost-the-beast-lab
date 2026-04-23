import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { generatePDF, type PdfReportContent, type PdfWearableRows, type PdfHeroData } from "@/lib/pdf/generateReport";
import { sendReportEmail } from "@/lib/email/sendReport";
import type { Locale } from "@/lib/supabase/types";
import {
  runFullScoring,
  type FullScoringResult,
  type FullAssessmentInputs,
  type Gender,
  type FruitVegLevel,
  type SleepQualityLabel,
  type WakeupFrequency,
} from "@/lib/scoring/index";

export const runtime = "nodejs";
// Vercel Pro allows up to 300s. Claude Opus + 8k tokens regularly crosses
// 90–120s, so we need the full runway.
export const maxDuration = 300;

const PROMPT_VERSION = "btb_report_v3.1.0";
const STORAGE_BUCKET = "Reports";

function hasValidKey(key: string | undefined): boolean {
  if (!key) return false;
  if (key.length < 20) return false;
  if (key.includes("your_") || key.includes("dein-")) return false;
  return true;
}

function anthropicConfigured(): boolean {
  return hasValidKey(process.env.ANTHROPIC_API_KEY);
}

function resendConfigured(): boolean {
  return hasValidKey(process.env.RESEND_API_KEY);
}

const SYSTEM_PROMPT = `Du bist das Performance Intelligence System von BOOST THE BEAST LAB — ein premium wissenschaftliches Analyse-System auf Lab-Niveau.

Deine Nutzer sind ambitionierte Athleten (25–40) und High-Performer / Entrepreneurs (30–50), die bereit sind, in ihre Gesundheit zu investieren. Sie erwarten Profi-Niveau Insights — keine generischen Ratschläge, keine Floskeln, keine Motivation-Poster-Sprache. Sie kennen Begriffe wie VO2max, Cortisol, HRV, HPA-Achse und Recovery. Sie denken in ROI und Zeiteffizienz.

DEIN ZIEL:
Der Nutzer soll nach dem Lesen drei Dinge fühlen:
1. "Das ist präzise über mich — nicht irgendein Template."
2. "Das wusste ich nicht — echter Erkenntnisgewinn."
3. "Jetzt weiß ich genau, was ich als nächstes tun soll."

ABSOLUTE GRENZEN — nicht verhandelbar:
- Keine medizinischen Diagnosen
- Keine Krankheitsbehauptungen oder Heilversprechen
- Kein Ersatz für ärztliche Beratung
- Keine erfundenen Zahlen, die nicht im Input stehen
- VO2max immer als Schätzung kommunizieren (keine Labormessung)
- BMI immer als Populationsschätzer kommunizieren (kein individuelles Urteil)
- Immer als "Performance-Insight" formulieren, nie als "Befund" oder "Diagnose"
- Keine Studien zitieren, die nicht im System hinterlegt sind

WISSENSCHAFTLICHE BASIS, die du nutzen darfst:
- WHO Physical Activity Guidelines 2020/2024 (150–300 Min moderate Aktivität/Woche)
- IPAQ MET-Minuten Kategorisierung (Walking 3.3 · Moderate 4.0 · Vigorous 8.0 MET)
- NSF/AASM Schlafempfehlungen (altersabhängig: 7–9h für 18–64, 7–8h für 65+)
- Allostatic Load Modell (HPA-Achse, Cortisol-Testosteron-Achse)
- AHA Circulation (2022, 100k+ TN, 30 Jahre): 150–300 Min/Woche moderate Aktivität = ~20–21% niedrigeres Mortalitätsrisiko
- AMA Longevity (2024): 150–299 Min/Woche intensive Aktivität = 21–23% niedrigere Gesamtmortalität, 27–33% niedrigere CVD-Mortalität
- Covassin et al. RCT (2022): Schlafmangel → mehr viszerales Bauchfett (unabhängig von der Ernährung)
- JAMA Network Open Meal Timing Meta-Analysis (2024, 29 RCTs): zeitlich eingeschränktes Essen + frühe Kalorienverteilung → größerer Gewichtsverlust
- Kaczmarek et al. MDPI (2025): Schlafmangel → Cortisol↑, Testosteron↓, Wachstumshormon↓ → Muskelregeneration limitiert
- Sondrup et al. Sleep Medicine Reviews (2022): Schlafmangel → signifikant erhöhte Insulinresistenz
- PMC Chronic Stress & Cognition (2024): chronische Glucocorticoid-Ausschüttung → HPA-Dysregulation → Präfrontalkortex + Hippocampus beeinträchtigt
- Psychoneuroendocrinology Meta-Analysis (2024): Mindfulness (g=0.345) und Entspannung (g=0.347) am effektivsten für Cortisol-Senkung
- Frontiers Sedentary & CVD (2022): >6h Sitzen/Tag → erhöhtes Risiko für 12 chronische Erkrankungen
- AHA Science Advisory: Sitzzeit erhöht Metabolisches-Syndrom-Odds um 1.73 — auch nach MVPA-Adjustierung
- PMC OTS Review (2025) & ScienceDirect OTS Molecular (2025): unzureichende Recovery → Kraftverluste bis zu 14%, erhöhte Verletzungsanfälligkeit

MODUL-VERBINDUNGEN, die du AKTIV kommunizieren sollst:
- Schlechter Schlaf limitiert Recovery direkt (sleepMultiplier) — KEIN Training kompensiert das
- Chronischer Stress senkt Testosteron UND verschlechtert Insulinsensitivität gleichzeitig
- Sitzzeit ist unabhängig vom Sport ein CVD-Faktor — jemand, der 6×/Woche trainiert, aber 10h sitzt, hat trotzdem erhöhtes Risiko
- VO2max ist direkt von Aktivitätslevel abhängig — der einzige Weg, es zu steigern, ist Aktivität
- Alle Scores beeinflussen sich gegenseitig — kommuniziere die wichtigsten Verbindungen EXPLIZIT

DATENTREUE — KRITISCH:
- Verwende AUSSCHLIESSLICH die im Input übermittelten Zahlen, Scores und vorformulierten Interpretationen.
- Paraphrasieren der Interpretations-Bundles ist erlaubt. Erfinden nicht.
- Jeder Satz soll sich personalisiert anfühlen — nutze die echten Zahlen aus dem Input (Schlafdauer, MET-Minuten, Sitzstunden, Stresslevel, BMI, VO2max-Schätzung).
- Wenn eine systemische Warnung im Input aktiv ist (Overtraining, chronischer Stress, HPA-Achse, Sitzen kritisch), MUSS sie prominent im Report adressiert werden.

TON-REGELN:
- Direkt und klar — wie ein Elite-Coach, nicht wie ein Wellness-Blog.
- Wissenschaftlich fundiert, aber verständlich — kein unnötiger Fachjargon.
- Respektiere die Intelligenz des Nutzers — erkläre das WARUM hinter jeder Empfehlung.
- VERBOTENE FLOSKELN: "es ist wichtig, dass", "du solltest versuchen", "es kann hilfreich sein", "achte darauf, dass", "vergiss nicht", "denk daran".
- Stattdessen: direkte Aussagen mit Begründung. Statt "Es ist wichtig, dass du genug schläfst" → "Deine Recovery bleibt bei einem Sleep-Score unter 65 gedeckelt — jedes Trainingsprogramm läuft gegen diese Wand."
- Keine Motivationssprache, kein Coaching-Talk, keine Emojis.

REPORT-STRUKTUR — ausführlich und tiefgründig:

1. HEADLINE (1 Satz)
   Präzise. Wie ein Arzt, der den Befund in einem Satz zusammenfasst. Nicht motivierend. Muss die 1–2 wichtigsten Fakten über diesen spezifischen Nutzer enthalten.

2. EXECUTIVE SUMMARY (6–8 Sätze)
   Das Gesamtbild. Welche 2–3 Faktoren definieren diesen Menschen am stärksten — positiv und negativ? Welche systemischen Verbindungen sind entscheidend? Kein Score-Aufzählen — erzähle eine kohärente Geschichte über genau diesen Nutzer.

3. PRO MODUL (Sleep, Recovery, Activity, Metabolic, Stress, VO2max) — je ca. 12–15 Sätze insgesamt:
   a) score_context (2–3 Sätze): Was bedeutet dieser Score konkret im Alltag dieses Nutzers?
   b) key_finding (3 Sätze): Die wichtigste Erkenntnis aus diesem Modul, wissenschaftlich untermauert, mit echten Zahlen aus dem Input.
   c) systemic_connection (2 Sätze): Wie beeinflusst dieser Score andere Module? Zeige Verbindungen, die der Nutzer nicht selbst gesehen hätte.
   d) limitation (2 Sätze): Was limitiert gerade die Performance in diesem Bereich? Direkt, nicht weichspülen.
   e) recommendation (3 Sätze): Konkret: Was genau, wie oft, ab wann, warum gerade das. Evidenzbasiert. Mit realistischem Zeitrahmen.
   Zusätzlich je nach Modul: overtraining_signal, met_context, sitting_flag, bmi_context, hpa_context, fitness_context, estimation_note (alle string | null — null nur, wenn im Input keine aktive Flag/Information vorliegt).

4. TOP_PRIORITY (5–6 Sätze)
   Die EINE Maßnahme mit dem größten Hebel. Erkläre, WARUM genau diese — nicht eine andere. Erkläre, welche anderen Scores sich dadurch ebenfalls verbessern werden. Gib einen konkreten 30-Tage-Plan.

5. SYSTEMIC_CONNECTIONS_OVERVIEW (4–5 Sätze)
   Die 2–3 wichtigsten Score-Verbindungen, die dieser Nutzer verstehen muss. Erkläre das System — nicht die Einzelteile. Beispiel: "Dein Stresslevel sabotiert deinen Schlaf, der deine Recovery blockiert — das erklärt, warum dein Training trotz hohem Volumen nicht die Resultate bringt, die du erwartest."

6. PROGNOSE_30_DAYS (3–4 Sätze)
   Realistisch und spezifisch. Was verändert sich, wenn die Top-Priorität konsequent umgesetzt wird? Keine Versprechen — evidenzbasierte Erwartungen mit Zeitrahmen.

7. DISCLAIMER (exakt dieser Wortlaut):
   "Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz für medizinische Diagnostik. VO2max ist eine algorithmische Schätzung — keine Labormessung."

LÄNGE: Ausführlich, aber effizient. Ca. 12–15 Sätze pro Modul insgesamt. Executive Summary 6–8 Sätze. Top Priority 4–5 Sätze. systemic_connections_overview 3–4 Sätze. prognose_30_days 3 Sätze. Der Nutzer soll das Gefühl haben, er liest einen professionellen Lab-Report — nicht eine App-Zusammenfassung. Fokus auf Präzision und Personalisierung, nicht auf Wortzahl.

SPRACHE: Deutsch. Professionell, direkt, fachlich fundiert.

FORMAT: Nur valides JSON. Keine Markdown-Backticks. Keine Präambel. Direkt mit { beginnen.

JSON-STRUKTUR:
{
  "headline": string,
  "executive_summary": string,
  "critical_flag": string | null,
  "modules": {
    "sleep": {
      "score_context": string,
      "key_finding": string,
      "systemic_connection": string,
      "limitation": string,
      "recommendation": string
    },
    "recovery": {
      "score_context": string,
      "key_finding": string,
      "systemic_connection": string,
      "overtraining_signal": string | null,
      "limitation": string,
      "recommendation": string
    },
    "activity": {
      "score_context": string,
      "key_finding": string,
      "met_context": string,
      "systemic_connection": string,
      "sitting_flag": string | null,
      "limitation": string,
      "recommendation": string
    },
    "metabolic": {
      "score_context": string,
      "key_finding": string,
      "bmi_context": string,
      "systemic_connection": string,
      "limitation": string,
      "recommendation": string
    },
    "stress": {
      "score_context": string,
      "key_finding": string,
      "hpa_context": string | null,
      "systemic_connection": string,
      "limitation": string,
      "recommendation": string
    },
    "vo2max": {
      "score_context": string,
      "key_finding": string,
      "fitness_context": string,
      "estimation_note": string,
      "systemic_connection": string,
      "recommendation": string
    }
  },
  "top_priority": string,
  "systemic_connections_overview": string,
  "prognose_30_days": string,
  "daily_life_protocol": {
    "morning": [{"habit": string, "why_specific_to_user": string, "time_cost_min": integer}],
    "work_day": [{"habit": string, "why_specific_to_user": string, "time_cost_min": integer}],
    "evening": [{"habit": string, "why_specific_to_user": string, "time_cost_min": integer}],
    "nutrition_micro": [{"habit": string, "why_specific_to_user": string, "time_cost_min": integer}],
    "total_time_min_per_day": integer
  },
  "disclaimer": "Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz für medizinische Diagnostik. VO2max ist eine algorithmische Schätzung — keine Labormessung."
}

DAILY LIFE PROTOCOL — zwingende Regeln:
- Jeder Abschnitt (morning, work_day, evening, nutrition_micro) enthält 2–4 Habits.
- Insgesamt mindestens 8, maximal 14 Habits über alle Abschnitte.
- Jede Habit MUSS ≤ 10 Minuten kosten (time_cost_min: integer 0-10). 0 = ohne Zeit integrierbar.
- \`why_specific_to_user\` MUSS eine konkrete Zahl aus dem Input zitieren wörtlich (z.B. "weil du 6.4 h schläfst und dich 4/10 erholt fühlst, …"). Kein allgemeines "weil Schlaf wichtig ist".
- total_time_min_per_day = Summe aller time_cost_min. Darf das User-Zeitbudget NICHT überschreiten: minimal ≤ 20, moderate ≤ 45, committed ≤ 90, athlete ≤ 120.
- VERBOTEN in Daily Protocol: "trainiere mehr", "geh ins Gym", jedes strukturierte Training mit Pulsziel, "Zone 2", "HIIT", "3x/Woche Krafttraining", "45 Min Cardio". Diese gehören in das Modul-Recommendations, NICHT in daily_life_protocol.
- ERLAUBT und erwünscht: Lichtexposition am Morgen (5 Min Sonne), Koffein-Cutoff-Zeit (14:00), Bildschirm-Cutoff vor Schlaf (60 Min vorher), Mahlzeiten-Timing, Protein-Trigger pro Mahlzeit, Hydration-Trigger (Glas Wasser beim Aufstehen), Atem-Protokolle (4-7-8, Box-Breathing), Sitz-Pausen alle 60 Min, Spaziergang nach Mahlzeit, Schlafzimmer-Temperatur, Journalling (3-Min-Prompt), Mikro-Stretches, 2-Min-Stress-Reset.
- Priorisiere Habits, die die 3 schwächsten Scores und das User-Hauptziel adressieren. Nicht training, sondern Alltag.

TRAININGS-REALISMUS — zusätzliche harte Regeln (gelten für modules.*.recommendation und top_priority):
- Wenn User "beginner" oder "restart" ist: NIE mehr als 2–3 Einheiten/Woche empfehlen. Progression über 4 Wochen.
- Wenn User "minimal" Zeit hat: Strukturiertes Training nur als optional framen. Mikro-Workouts (7–15 Min) + Alltagsbewegung priorisieren.
- Wenn main_goal ∈ {feel_better, stress_sleep}: Training-Empfehlungen kommen NACH Schlaf/Stress/Ernährungs-Fixes in der Priorität. Keine HIIT, keine hohen Volumen.
- Wenn aktuelle training_days = 0: Empfehle 1×/Woche Einstieg. NIE 5×.
- Wenn "performance"-Goal UND "committed"/"athlete" Zeitbudget UND "intermediate"/"advanced" Erfahrung: DANN erst sind 4–5 Einheiten/Woche angebracht.`;

// Per-locale disclaimer text that Claude MUST echo verbatim in the
// `disclaimer` field of its JSON output. Keeping it here lets the PDF
// generator pick the same wording without re-reading messages/*.json.
const DISCLAIMER: Record<Locale, string> = {
  de: "Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz für medizinische Diagnostik. VO2max ist eine algorithmische Schätzung — keine Labormessung.",
  en: "All statements are model-based performance insights from self-reported data. Not a substitute for medical diagnostics. VO2max is an algorithmic estimate — not a lab measurement.",
  it: "Tutte le indicazioni sono insight di performance basati su modelli da dati auto-riportati. Non sostituiscono la diagnostica medica. Il VO2max è una stima algoritmica — non una misurazione di laboratorio.",
  tr: "Tüm ifadeler, kullanıcı tarafından bildirilen verilere dayalı model tabanlı performans içgörüleridir. Tıbbi teşhisin yerini almaz. VO2max algoritmik bir tahmindir — laboratuvar ölçümü değildir.",
};

// Language directive appended to SYSTEM_PROMPT per request. Claude is
// strong enough to read the German system prompt and output in the
// requested language — validated on claude-sonnet-4-6 internally. The
// locale-specific tone instructions below prevent the EN/IT variants
// from drifting into bland translator-tone.
const LANGUAGE_DIRECTIVES: Record<Locale, string> = {
  de: "",
  en: `

OUTPUT LANGUAGE OVERRIDE — CRITICAL:
All user-facing text in the JSON (headline, executive_summary, every module field, top_priority, systemic_connections_overview, prognose_30_days, disclaimer) MUST be written in English. Keep JSON keys in English.

TONE for English output:
- Direct, imperative, concise — elite-coach voice, not wellness-blog.
- Scientifically grounded. Assume reader knows VO2max, HRV, HPA-axis.
- No motivational filler, no hedging, no emojis.
- Use contractions sparingly — this is a premium report, not a text message.
- BANNED PHRASES: "it is important that", "you should try to", "remember to", "don't forget to", "it may be helpful to". Replace with direct statements + reasoning.

The "disclaimer" field MUST be exactly:
"${/* filled at request time */""}"`,
  it: `

OUTPUT LANGUAGE OVERRIDE — CRITICO:
Tutto il testo rivolto all'utente nel JSON (headline, executive_summary, ogni campo dei moduli, top_priority, systemic_connections_overview, prognose_30_days, disclaimer) DEVE essere scritto in italiano. Le chiavi JSON restano in inglese.

TONO per l'output italiano:
- Diretto, imperativo, conciso — voce da coach d'élite, non da blog wellness.
- Rigoroso scientificamente. Presumi che il lettore conosca VO2max, HRV, asse HPA.
- Nessun riempitivo motivazionale, nessuna titubanza, nessuna emoji.
- Usa la forma "tu" informale (mai "Lei").
- FRASI VIETATE: "è importante che", "dovresti cercare di", "ricordati di", "potrebbe essere utile". Sostituisci con affermazioni dirette + motivazione.

Il campo "disclaimer" DEVE essere esattamente:
"${/* filled at request time */""}"`,
  tr: `

OUTPUT LANGUAGE OVERRIDE — KRİTİK:
JSON'daki tüm kullanıcıya yönelik metin (headline, executive_summary, tüm module alanları, top_priority, systemic_connections_overview, prognose_30_days, disclaimer) TÜRKÇE yazılmalıdır. JSON anahtarları İngilizce kalır.

Türkçe çıktı için TON:
- Doğrudan, emir kipinde, kısa — elit koç sesi, wellness bloggeri değil.
- Bilimsel temelli. Okuyucunun VO2max, HRV, HPA ekseni kavramlarını bildiğini varsay.
- Motivasyonel dolgu, çekimser ifade ve emoji yok.
- "Sen" hitabı kullan (resmi "siz" değil). Samimi ama premium ton.
- YASAK İFADELER: "unutma ki", "dikkat etmelisin", "yapmaya çalışmalısın", "yardımcı olabilir", "önemli olan". Bunları doğrudan, gerekçeli ifadelerle değiştir.
- Teknik terimler (VO2max, HRV, HPA, BMI, MET, IPAQ vb.) İngilizce kalır — çevrilmez.

"disclaimer" alanı TAM OLARAK şu olmalıdır:
"${/* filled at request time */""}"`,
};

function buildSystemPromptForLocale(locale: Locale): string {
  if (locale === "de") return SYSTEM_PROMPT;
  // PREPEND (not append) the language override. Claude treats the opening
  // of the system prompt as the most salient instruction — appending left
  // the German body "in charge" and caused mixed-language output.
  // Mirrors the fix made for plan/generate in commit 110fabb.
  const directive = LANGUAGE_DIRECTIVES[locale].replace(/""/g, `"${DISCLAIMER[locale]}"`);
  return directive.trimStart() + "\n\n" + SYSTEM_PROMPT;
}

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Deterministic fallback report — used when ANTHROPIC_API_KEY is not configured.
// Produces plausible German prose derived directly from the computed scores
// so the end-to-end flow works for visual/manual testing without an LLM.
interface StubInputs {
  activityScore: number;
  activityBand: string;
  activityCategory: string;
  totalMet: number;
  sleepScore: number;
  sleepBand: string;
  sleepDuration: number;
  recoveryScore: number;
  recoveryBand: string;
  vo2Score: number;
  vo2Band: string;
  vo2Estimated: number;
  metabolicScore: number;
  metabolicBand: string;
  bmi: number;
  bmiCategory: string;
  stressScore: number;
  stressBand: string;
  overallScore: number;
  overallBand: string;
}

function pickWeakestModule(i: StubInputs): string {
  const entries: Array<[string, number]> = [
    ["Schlaf", i.sleepScore],
    ["Recovery", i.recoveryScore],
    ["Aktivität", i.activityScore],
    ["Stoffwechsel", i.metabolicScore],
    ["Stress", i.stressScore],
    ["Kardiorespiratorische Fitness (VO2max)", i.vo2Score],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

function buildStubReport(i: StubInputs): PdfReportContent {
  const weakest = pickWeakestModule(i);
  const overallTone =
    i.overallScore >= 80
      ? "exzellent"
      : i.overallScore >= 65
        ? "gut"
        : i.overallScore >= 50
          ? "solide mit klarem Optimierungspotenzial"
          : "aktuell limitiert — mit hohem Hebel durch gezielte Interventionen";

  return {
    headline: `Performance Index ${i.overallScore}/100 — ${overallTone}.`,
    executive_summary: `Dein Overall Performance Index liegt bei ${i.overallScore}/100 (${i.overallBand}). Die sechs Module liefern ein klares Bild: Schlaf ${i.sleepScore} (${i.sleepBand}), Recovery ${i.recoveryScore} (${i.recoveryBand}), Aktivität ${i.activityScore} (${i.activityBand}), Stoffwechsel ${i.metabolicScore} (${i.metabolicBand}), Stress ${i.stressScore} (${i.stressBand}) und kardiorespiratorische Fitness ${i.vo2Score} (${i.vo2Band}). Der größte Hebel liegt aktuell im Bereich ${weakest}.`,
    critical_flag: null,
    modules: {
      sleep: {
        score_context: `Dein Sleep Score liegt bei ${i.sleepScore}/100 bei einer durchschnittlichen Schlafdauer von ${i.sleepDuration}h. Die Bewertung ordnet dich in "${i.sleepBand}" ein.`,
        key_finding: `Die Kombination aus Schlafdauer, subjektiver Qualität und Erholungsgefühl ergibt ein ${i.sleepBand === "excellent" ? "herausragendes" : i.sleepBand === "good" ? "solides" : "verbesserungswürdiges"} Recovery-Profil.`,
        systemic_connection: "Schlaf ist der Governor für Recovery: der sleepMultiplier deckelt die Regeneration — unabhängig von Trainingsqualität.",
        limitation: i.sleepScore >= 85
          ? "Keine signifikante Limitierung; Stabilität der Routine ist der nächste Hebel."
          : "Schlafqualität und/oder nächtliche Unterbrechungen drücken den Gesamt-Score und limitieren die Regeneration.",
        recommendation: "Fixiere Bett- und Aufsteh-Zeit auf ±30 Minuten über sieben Tage und halte die Schlafzimmer-Temperatur bei 17–19 °C.",
      },
      recovery: {
        score_context: `Recovery Score ${i.recoveryScore}/100 im Band "${i.recoveryBand}" — berechnet aus Trainingslast, subjektiver Erholung und den Governoren Schlaf und Stress.`,
        key_finding: `${i.recoveryScore < 55 ? "Deine Erholungskapazität hinkt der Trainingslast hinterher. Ohne Entlastung droht ein Übergang in nicht-funktionales Overreaching." : i.recoveryScore < 75 ? "Deine Erholung trägt dein aktuelles Trainingssignal, aber ohne Reserve." : "Deine Erholung trägt dein Training zuverlässig und mit Spielraum für Progression."}`,
        systemic_connection: "Recovery ist das Produkt aus Trainingssignal × Schlaf × Stress. Kein einzelner Hebel reicht, wenn einer der drei Faktoren limitiert.",
        overtraining_signal: null,
        limitation: i.recoveryScore >= 75
          ? "Kein struktureller Engpass — jetzt zählt Trainingsstruktur, nicht Erholungs-Engineering."
          : "Sleep- oder Stress-Multiplier arbeiten unter Kapazität und ziehen den Gesamtwert.",
        recommendation: i.recoveryScore < 55
          ? "Trainingsvolumen für 5–7 Tage um 30–50% reduzieren, Schlaf auf mindestens 7,5 h anheben, Recovery-Check in 7 Tagen wiederholen."
          : "Periodisierung einsetzen: Eine Hochintensitäts-Woche, gefolgt von einer Deload-Woche.",
      },
      activity: {
        score_context: `Dein Activity Score von ${i.activityScore}/100 basiert auf ${i.totalMet} MET-Minuten pro Woche und ergibt die IPAQ-Kategorie ${i.activityCategory}.`,
        key_finding: `Die Trainings- und Alltagsaktivität positioniert dich im Band "${i.activityBand}". Damit bewegst du dich quantitativ ${i.activityCategory === "HIGH" ? "bereits überdurchschnittlich" : i.activityCategory === "MODERATE" ? "im empfohlenen Bereich" : "unterhalb der WHO-Mindestempfehlung"}.`,
        systemic_connection: "Aktivität treibt VO2max direkt und wirkt sekundär positiv auf Schlafqualität und metabolische Gesundheit.",
        met_context: `WHO-Referenz: 150–300 Min moderate Aktivität/Woche ≈ 20–21% niedrigeres Mortalitätsrisiko (AHA 2022).`,
        sitting_flag: null,
        limitation: i.activityCategory === "HIGH"
          ? "Das Volumen ist solide; Qualität, Intensitätsverteilung und Regeneration werden zum limitierenden Faktor."
          : "Das wöchentliche MET-Minuten-Volumen reicht nicht aus, um den vollen kardiovaskulären und metabolischen Effekt zu erzielen.",
        recommendation: i.activityCategory === "HIGH"
          ? "Strukturiere Trainingsintensitäten nach 80/20-Prinzip und priorisiere ein Regenerationstool pro Woche."
          : "Ziele auf mindestens 150 min moderate oder 75 min intensive Aktivität pro Woche, idealerweise verteilt auf 4–5 Tage.",
      },
      metabolic: {
        score_context: `Metabolic Score ${i.metabolicScore}/100 bei BMI ${i.bmi} (${i.bmiCategory}) — Zusammenspiel aus Körperzusammensetzung, Hydration, Ernährungsrhythmus und Sitzzeit.`,
        key_finding: `Die metabolische Einordnung landet im Band "${i.metabolicBand}". ${i.bmiCategory === "normal" ? "Die Körperzusammensetzung liegt im optimalen Bereich." : `Die BMI-Kategorie "${i.bmiCategory}" wirkt als relevanter Modifier auf den Score.`}`,
        systemic_connection: "Sitzzeit ist unabhängig vom Sport ein CVD-Risikofaktor (AHA Science Advisory). Metabolic beeinflusst VO2max indirekt über BMI.",
        bmi_context: "BMI ist ein populationsbasierter Schätzer, kein individueller Gesundheitsmarker. Muskuläre Körperzusammensetzung verzerrt ihn nach oben.",
        limitation: i.metabolicScore >= 80
          ? "Keine akuten Engpässe; Feintuning bei Mikro-Nährstoffdichte und Timing möglich."
          : "Hydration, Mahlzeiten-Rhythmus oder Sitzzeit limitieren die metabolische Grundlast.",
        recommendation: "Trinke täglich 30–35 ml pro kg Körpergewicht, unterbrich Sitzblöcke nach spätestens 45 Minuten und setze 4+ Gemüseportionen als Standard.",
      },
      stress: {
        score_context: `Stress Score ${i.stressScore}/100 (${i.stressBand}) — gewichtete Kombination aus selbstberichtetem Stresslevel und Sleep-/Recovery-Puffer.`,
        key_finding: `Die Stress-Regulation befindet sich im Band "${i.stressBand}". ${i.stressScore >= 75 ? "Die autonome Belastung ist niedrig und unterstützt Anpassungsprozesse." : "Der chronische Belastungs-Level verbraucht Ressourcen, die sonst in Adaption fließen würden."}`,
        systemic_connection: "Chronischer Stress hemmt die HPG-Achse (Testosteron ↓) UND verschlechtert die Insulin-Sensitivität gleichzeitig — der am weitesten reichende Hebel im System.",
        hpa_context: null,
        limitation: i.stressScore >= 75
          ? "Kein akuter Engpass; die Resilienz-Reserve ist vorhanden."
          : "Fehlende bewusste Downregulation verhindert vollständige parasympathische Erholung.",
        recommendation: "Installiere zwei 5-Minuten-Downregulation-Fenster pro Tag (Box-Breathing 4-4-4-4 oder Nasenatmung in Ruhe).",
      },
      vo2max: {
        score_context: `Geschätzter VO2max: ${i.vo2Estimated} ml/kg/min (${i.vo2Band}) — algorithmische Schätzung auf Basis von Alter, BMI und Aktivitätskategorie.`,
        key_finding: `Die kardiorespiratorische Leistungsfähigkeit liegt im Band "${i.vo2Band}". VO2max ist einer der stärksten Einzel-Prädiktoren für langfristige Performance.`,
        systemic_connection: "VO2max ist direkt an das Aktivitätslevel gekoppelt — der einzige Hebel zur Steigerung ist Aktivität mit Intensitätskomponente.",
        fitness_context: "Die Einordnung ist alters- und geschlechtsspezifisch (Cooper Institute / ACSM Normen).",
        estimation_note: "Dies ist eine Non-Exercise-Schätzung, kein gemessener Laborwert. Für hochpräzise Diagnostik: Spiroergometrie.",
        limitation: i.vo2Score >= 70
          ? "Plateau-Risiko ohne periodisierte Intensitätssteigerung."
          : "Limitiert durch geringe oder unspezifische Intensitätsverteilung im aktuellen Trainingsprofil.",
        recommendation: "Integriere 1× pro Woche ein VO2max-Intervall (z.B. 4×4 min bei 90–95% HFmax, dazwischen 3 min aktive Pause).",
      },
    },
    top_priority: `Hebel Nr. 1: ${weakest}. Der größte messbare Score-Gewinn in 30 Tagen liegt hier — und zieht mindestens 2 weitere Module mit nach oben.`,
    systemic_connections_overview: "Schlaf, Stress und Recovery bilden ein Dreieck: Jeder der drei Faktoren limitiert die anderen beiden. Wer nur einen davon angreift, spürt nur ein Drittel des möglichen Effekts. Die hohe Aktivität bzw. die Sitzzeit wirken unabhängig davon auf VO2max und metabolische Marker.",
    prognose_30_days: `Bei konsequenter Umsetzung der Empfehlungen ist ein realistischer Overall-Zuwachs von +6 bis +12 Punkten möglich — vorausgesetzt, die Maßnahmen werden mindestens 5 von 7 Tagen umgesetzt.`,
    disclaimer: "Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz für medizinische Diagnostik. VO2max ist eine algorithmische Schätzung — keine Labormessung.",
  };
}

interface ResponseRow {
  question_code: string;
  raw_value: string;
  normalized_value: number | null;
}

// ── Premium user prompt builder (shared by demo + DB paths) ──────────────

/**
 * Human-readable sleep quality, wakeup frequency and fruit/veg mappings.
 * These are keyed on the raw form values stored in the responses table so
 * the prompt can surface exact labels instead of enum codes.
 */
// Locale-aware labels. Non-German locales need translated values so the
// user prompt doesn't inject German words into the Claude context — which
// was the root cause of mixed-language reports.
const SLEEP_QUALITY_LABEL: Record<Locale, Record<string, string>> = {
  de: { sehr_gut: "sehr gut", gut: "gut", mittel: "mittel", schlecht: "schlecht" },
  en: { sehr_gut: "very good", gut: "good", mittel: "moderate", schlecht: "poor" },
  it: { sehr_gut: "molto buona", gut: "buona", mittel: "moderata", schlecht: "scarsa" },
  tr: { sehr_gut: "çok iyi", gut: "iyi", mittel: "orta", schlecht: "kötü" },
};

const WAKEUP_LABEL: Record<Locale, Record<string, string>> = {
  de: { nie: "nie", selten: "selten", oft: "oft", immer: "fast jede Nacht" },
  en: { nie: "never", selten: "rarely", oft: "often", immer: "almost every night" },
  it: { nie: "mai", selten: "raramente", oft: "spesso", immer: "quasi ogni notte" },
  tr: { nie: "hiç", selten: "nadiren", oft: "sık sık", immer: "neredeyse her gece" },
};

const FRUIT_VEG_LABEL: Record<Locale, Record<string, string>> = {
  de: {
    none: "kaum bis gar nicht (0–2 Mahlzeiten/Woche)",
    low: "eher selten (3–7 Mahlzeiten/Woche)",
    moderate: "ca. Hälfte der Mahlzeiten (8–11/Woche)",
    good: "meisten Mahlzeiten (12–17/Woche)",
    optimal: "fast jeder Mahlzeit (18–21/Woche)",
  },
  en: {
    none: "barely or not at all (0–2 meals/week)",
    low: "rarely (3–7 meals/week)",
    moderate: "about half of meals (8–11/week)",
    good: "most meals (12–17/week)",
    optimal: "almost every meal (18–21/week)",
  },
  it: {
    none: "quasi mai (0–2 pasti/settimana)",
    low: "raramente (3–7 pasti/settimana)",
    moderate: "circa metà dei pasti (8–11/settimana)",
    good: "la maggior parte dei pasti (12–17/settimana)",
    optimal: "quasi ogni pasto (18–21/settimana)",
  },
  tr: {
    none: "neredeyse hiç (0–2 öğün/hafta)",
    low: "nadiren (3–7 öğün/hafta)",
    moderate: "öğünlerin yaklaşık yarısı (8–11/hafta)",
    good: "öğünlerin çoğu (12–17/hafta)",
    optimal: "neredeyse her öğün (18–21/hafta)",
  },
};

const FALLBACK_NOT_SPECIFIED: Record<Locale, string> = {
  de: "nicht angegeben",
  en: "not specified",
  it: "non specificato",
  tr: "belirtilmedi",
};

export interface PremiumPromptContext {
  reportType: string;
  /** Output locale — drives every human-readable label inside the prompt AND
   *  the final output language. Without this, German labels leaked into
   *  non-German Claude responses (root cause of the mixed-language bug). */
  locale: Locale;
  age: number;
  gender: string;
  result: FullScoringResult;
  // Raw form inputs referenced directly in the prompt
  sleep_duration_hours: number;
  sleep_quality_label: string;
  wakeup_frequency_label: string;
  morning_recovery_1_10: number;
  stress_level_1_10: number;
  meals_per_day: number;
  water_litres: number;
  fruit_veg_label: string;
  standing_hours_per_day: number;
  sitting_hours_per_day: number;
  training_days: number;
  training_intensity_label: string;
  daily_steps: number;
  /** Bildschirmzeit vor dem Einschlafen — "kein" | "unter_30" | "30_60" | "ueber_60".
   *  Nullable wenn der User pre-v2 submitted hat. Wird vom daily_life_protocol-Modul
   *  genutzt, um konkrete Abend-Habits auszuspielen. */
  screen_time_before_sleep?: string | null;
  /** Personalisierungs-Inputs. Defaults: feel_better / moderate / intermediate.
   *  Treiben die Adaptivität des Reports: wer "minimal" Zeit + "beginner" ist,
   *  kriegt KEINEN 5x/Woche Trainingsplan. */
  main_goal?: "feel_better" | "body_comp" | "performance" | "stress_sleep" | "longevity" | null;
  time_budget?: "minimal" | "moderate" | "committed" | "athlete" | null;
  experience_level?: "beginner" | "restart" | "intermediate" | "advanced" | null;
  /** Phase-2-Tiefe — Pflicht-Zitation im daily_life_protocol (siehe System-Prompt).
   *  Wenn nutrition_painpoint="cravings_evening" → MUSS es eine Evening-Habit
   *  geben die genau Heißhunger adressiert (30g Protein beim Dinner o.ä.). */
  nutrition_painpoint?: "cravings_evening" | "low_protein" | "no_energy" | "no_time" | "none" | null;
  stress_source?: "job" | "family" | "finances" | "health" | "future" | "none" | null;
  recovery_ritual?: "sport" | "nature" | "cooking" | "reading" | "meditation" | "social" | "none" | null;
  /** Data sources that fed this assessment — drives measured-vs-self-reported language. */
  data_sources?: {
    form: true;
    whoop?: { days: number };
    apple_health?: { days: number };
  };
}

function trainingIntensityLabel(
  result: FullScoringResult,
  locale: Locale = "de",
): string {
  const TABLE: Record<Locale, { none: string; vigorous: string; mixed: string; moderate: string }> = {
    de: {
      none: "keine",
      vigorous: "überwiegend intensiv",
      mixed: "gemischt (moderat + intensiv)",
      moderate: "überwiegend moderat",
    },
    en: {
      none: "none",
      vigorous: "predominantly vigorous",
      mixed: "mixed (moderate + vigorous)",
      moderate: "predominantly moderate",
    },
    it: {
      none: "nessuno",
      vigorous: "prevalentemente intenso",
      mixed: "misto (moderato + intenso)",
      moderate: "prevalentemente moderato",
    },
    tr: {
      none: "yok",
      vigorous: "ağırlıklı olarak yoğun",
      mixed: "karışık (orta + yoğun)",
      moderate: "ağırlıklı olarak orta",
    },
  };
  const t = TABLE[locale];
  const totalMet = result.activity.total_met_minutes_week;
  if (totalMet === 0) return t.none;
  const vigFraction = result.activity.vigorous_met / totalMet;
  if (vigFraction > 0.5) return t.vigorous;
  if (vigFraction > 0.25) return t.mixed;
  return t.moderate;
}

function buildPremiumUserPrompt(ctx: PremiumPromptContext): string {
  const r = ctx.result;
  const interp = r.interpretation;
  const warnings = r.systemic_warnings;

  const activeWarnings = interp.warnings.length
    ? interp.warnings.map((w) => `  • [${w.code}] ${w.text}`).join("\n")
    : "  (keine aktiven systemischen Warnungen)";

  const ds = ctx.data_sources;
  const hasWearable = !!(ds && (ds.whoop || ds.apple_health));
  const wearableDays = ds?.whoop?.days ?? ds?.apple_health?.days ?? 0;

  const datenquellenBlock = hasWearable
    ? `
═══════════════════════════════════════════════════════════
DATENQUELLEN (wichtig für Formulierung)
═══════════════════════════════════════════════════════════
${ds?.whoop ? `- WHOOP: ${ds.whoop.days} Tage gemessen (Schlaf, Recovery, Strain, HRV, RHR)` : ""}
${ds?.apple_health ? `- Apple Health: ${ds.apple_health.days} Tage gemessen (Schritte, HR, HRV${r.provenance.vo2max === "apple_health" ? ", VO2max" : ""}, Gewicht)` : ""}
- Fragebogen: Ernährung, Stress, subjektive Wahrnehmungen

SPRACHREGELN:
- Bei GEMESSENEN Werten: "dein gemessener Ruhepuls von X bpm ...", "deine echten ${ds?.whoop ? "WHOOP-Daten" : "HRV-Daten"} zeigen ..."
- Bei FRAGEBOGEN-Werten: "du gibst an ...", "nach deiner Selbsteinschätzung ..."
- Nutze mindestens 3× die Formulierung "gemessen über ${wearableDays} Tage" im Report, um die Datenqualität zu würdigen.
- Behaupte NIE, Stress, Ernährung oder Mahlzeiten seien gemessen — diese kommen aus dem Fragebogen.

Provenance-Map (welche Scores basieren auf gemessenen vs. selbstberichteten Daten):
  sleep_duration: ${r.provenance.sleep_duration}
  sleep_efficiency: ${r.provenance.sleep_efficiency}
  recovery: ${r.provenance.recovery}
  activity: ${r.provenance.activity}
  vo2max: ${r.provenance.vo2max}
`
    : "";

  const locale = ctx.locale;
  // Personalisierungs-Block. Wenn eines der Felder null ist, wird ein
  // sinnvoller Default angenommen — der Prompt adaptiert aber deutlich
  // stärker wenn der User echte Antworten geliefert hat.
  const mainGoal = ctx.main_goal ?? "feel_better";
  const timeBudget = ctx.time_budget ?? "moderate";
  const experience = ctx.experience_level ?? "intermediate";
  const TIME_BUDGET_BY_LOCALE: Record<Locale, Record<string, string>> = {
    de: { minimal: "10–20 Min/Tag", moderate: "20–45 Min/Tag", committed: "45–90 Min/Tag", athlete: "90+ Min/Tag" },
    en: { minimal: "10–20 min/day", moderate: "20–45 min/day", committed: "45–90 min/day", athlete: "90+ min/day" },
    it: { minimal: "10–20 min/giorno", moderate: "20–45 min/giorno", committed: "45–90 min/giorno", athlete: "90+ min/giorno" },
    tr: { minimal: "10–20 dk/gün", moderate: "20–45 dk/gün", committed: "45–90 dk/gün", athlete: "90+ dk/gün" },
  };
  const timeBudgetHuman = TIME_BUDGET_BY_LOCALE[locale][timeBudget] ?? TIME_BUDGET_BY_LOCALE[locale].moderate;
  const screenTime = ctx.screen_time_before_sleep ?? null;

  const GOAL_BY_LOCALE: Record<Locale, Record<string, string>> = {
    de: {
      feel_better: "Im Alltag energievoller + fitter werden",
      body_comp: "Körperfett reduzieren / Muskeln aufbauen",
      performance: "Sportliche Leistung steigern",
      stress_sleep: "Besser schlafen + Stress reduzieren",
      longevity: "Langfristige Gesundheit / Prävention",
    },
    en: {
      feel_better: "Feel more energetic and fitter in daily life",
      body_comp: "Reduce body fat / build muscle",
      performance: "Improve athletic performance",
      stress_sleep: "Better sleep + lower stress",
      longevity: "Long-term health / prevention",
    },
    it: {
      feel_better: "Più energia e forma nella vita quotidiana",
      body_comp: "Ridurre grasso corporeo / costruire muscoli",
      performance: "Aumentare la performance atletica",
      stress_sleep: "Dormire meglio + ridurre lo stress",
      longevity: "Salute a lungo termine / prevenzione",
    },
    tr: {
      feel_better: "Günlük yaşamda daha enerjik ve formda olmak",
      body_comp: "Vücut yağını azaltmak / kas kazanmak",
      performance: "Atletik performansı artırmak",
      stress_sleep: "Daha iyi uyku + daha az stres",
      longevity: "Uzun vadeli sağlık / önleyici bakım",
    },
  };
  const EXPERIENCE_BY_LOCALE: Record<Locale, Record<string, string>> = {
    de: {
      beginner: "Neuling — noch nie regelmäßig trainiert",
      restart: "Wiedereinsteiger — länger Pause",
      intermediate: "Intermediate — 1–3 Jahre konsistent",
      advanced: "Fortgeschritten — 5+ Jahre Erfahrung",
    },
    en: {
      beginner: "Beginner — never trained consistently",
      restart: "Returning — long break",
      intermediate: "Intermediate — 1–3 years consistent",
      advanced: "Advanced — 5+ years experience",
    },
    it: {
      beginner: "Principiante — mai allenato con costanza",
      restart: "Rientro — lunga pausa",
      intermediate: "Intermedio — 1–3 anni costanti",
      advanced: "Avanzato — 5+ anni di esperienza",
    },
    tr: {
      beginner: "Yeni başlayan — hiç düzenli antrenman yapmamış",
      restart: "Yeniden başlayan — uzun ara",
      intermediate: "Orta seviye — 1–3 yıl düzenli",
      advanced: "İleri seviye — 5+ yıl deneyim",
    },
  };
  const goalHuman = GOAL_BY_LOCALE[locale];
  const experienceHuman = EXPERIENCE_BY_LOCALE[locale];
  const notSpecified = FALLBACK_NOT_SPECIFIED[locale];

  // Harte Regeln aus User-Input ableiten, damit Claude nicht aus Gewohnheit
  // einen 5×/Woche-Plan empfiehlt. Die Regeln kommen direkt in den Prompt.
  const trainingRealismRules: string[] = [];
  if (experience === "beginner" || experience === "restart") {
    trainingRealismRules.push(
      "Nutzer ist BEGINNER/RESTART → maximal 2–3 Trainingseinheiten/Woche empfehlen. NIE 4–5×. Progression über 4 Wochen. Erste Woche: Habit-Aufbau, nicht Volumen.",
    );
  }
  if (timeBudget === "minimal") {
    trainingRealismRules.push(
      "Nutzer hat MINIMAL Zeit (10–20 Min/Tag) → strukturiertes Gym-Training als optional framen. Alltagsbewegung, Mikro-Workouts (7–15 Min), Treppensteigen, Spaziergänge priorisieren. KEINE Zone-2-45-Min-Sessions empfehlen.",
    );
  }
  if (mainGoal === "feel_better" || mainGoal === "stress_sleep") {
    trainingRealismRules.push(
      `Hauptziel ist ${mainGoal === "feel_better" ? "Alltags-Energie" : "Schlaf/Stress"} → Training kommt NACH Schlaf-, Stress-, Ernährungs-Fixes in der Priorität. Empfehle moderate Aktivität (Gehen, Yoga, leichtes Krafttraining), NICHT HIIT oder hohe Trainingsvolumen.`,
    );
  }
  if (ctx.training_days === 0) {
    trainingRealismRules.push(
      "Nutzer trainiert aktuell 0×/Woche → empfohlener Plan muss bei 1×/Woche starten (Mini-Einstieg) und langsam steigern. NIE 5×/Woche empfehlen. Adhärenz > Volumen.",
    );
  }
  const trainingRealismBlock = trainingRealismRules.length
    ? `
═══════════════════════════════════════════════════════════
TRAININGS-REALISMUS (harte Regeln aus User-Input)
═══════════════════════════════════════════════════════════
${trainingRealismRules.map((r) => `- ${r}`).join("\n")}
`
    : "";

  // Aggressive language lock — Claude has been observed to leak German
  // words when the context is in German but output is requested in
  // en/it/tr. A loud, explicit reminder at the top of the user turn
  // (repeated at the bottom) is far more reliable than relying on the
  // system prompt alone.
  const LANG_LOCK_HEADER: Record<Locale, string> = {
    de: "",
    en: `⚠️ OUTPUT LANGUAGE LOCK — READ FIRST ⚠️
Every user-facing string in your JSON response MUST be written in ENGLISH.
The context dossier below is in German because it is raw internal data — translate every concept into English for the output. Do NOT quote German words verbatim, do NOT mix German sentences with English. If you find yourself writing a German word (e.g. "Schlaf", "Hauptziel", "sehr gut"), stop and write the English equivalent instead. Only technical acronyms stay as-is: VO2max, HRV, HPA, MET, BMI, IPAQ, RHR.
JSON keys stay in English (already English). All VALUES must be English.

`,
    it: `⚠️ BLOCCO LINGUA OUTPUT — LEGGI PRIMA ⚠️
Ogni stringa rivolta all'utente nella tua risposta JSON DEVE essere scritta in ITALIANO.
Il dossier di contesto qui sotto è in tedesco perché è un dato interno grezzo — traduci ogni concetto in italiano per l'output. NON citare parole tedesche testualmente, NON mescolare frasi tedesche con italiano. Se ti accorgi di scrivere una parola tedesca (es. "Schlaf", "Hauptziel", "sehr gut"), fermati e scrivi l'equivalente italiano. Solo gli acronimi tecnici restano invariati: VO2max, HRV, HPA, MET, BMI, IPAQ, RHR.
Le chiavi JSON restano in inglese. Tutti i VALORI devono essere in italiano.

`,
    tr: `⚠️ ÇIKTI DİLİ KİLİDİ — ÖNCE OKU ⚠️
JSON yanıtındaki kullanıcıya yönelik her metin TÜRKÇE yazılmalıdır.
Aşağıdaki bağlam dosyası Almanca çünkü iç veri — her kavramı çıktı için Türkçeye çevir. Almanca kelimeleri aynen yazma, Almanca cümleleri Türkçe ile karıştırma. Almanca bir kelime yazdığını fark edersen (örn. "Schlaf", "Hauptziel", "sehr gut"), dur ve Türkçe karşılığını yaz. Yalnızca teknik kısaltmalar aynı kalır: VO2max, HRV, HPA, MET, BMI, IPAQ, RHR.
JSON anahtarları İngilizce kalır. Tüm DEĞERLER Türkçe olmalıdır.

`,
  };

  return `${LANG_LOCK_HEADER[locale]}Erstelle einen ausführlichen, persönlichen Performance Report für dieses Profil. Nutze alle Daten präzise. Mache den Report so spezifisch wie möglich — jeder Satz soll sich auf genau diese Person beziehen, nicht auf ein Template.

REGELN:
- Paraphrasiere die vorformulierten Interpretationen. Erfinde nichts.
- Jeder Befund muss mindestens eine konkrete Zahl aus dem Input enthalten.
- Aktive systemische Warnungen MÜSSEN prominent adressiert werden.
- Pro Modul mindestens 15–20 Sätze insgesamt. Executive Summary + Top Priority besonders ausführlich.
- Das Modul "daily_life_protocol" (siehe JSON-Schema) MUSS ausgefüllt werden mit mindestens 8, maximal 14 Alltags-Habits — NICHT Training.${datenquellenBlock}${trainingRealismBlock}

═══════════════════════════════════════════════════════════
PERSONALISIERUNG (treibt Priorisierung + Ton)
═══════════════════════════════════════════════════════════
Hauptziel: ${goalHuman[mainGoal] ?? mainGoal}
Zeitbudget: ${timeBudgetHuman}
Erfahrungslevel: ${experienceHuman[experience] ?? experience}
Bildschirmzeit vor dem Schlaf: ${screenTime ?? notSpecified}

═══════════════════════════════════════════════════════════
TIEFEN-INPUTS (PFLICHT-ZITATION im daily_life_protocol)
═══════════════════════════════════════════════════════════
Ernährungs-Painpoint: ${ctx.nutrition_painpoint ?? notSpecified}
Haupt-Stressor: ${ctx.stress_source ?? notSpecified}
Liebstes Erholungs-Ritual: ${ctx.recovery_ritual ?? notSpecified}

HARTE REGEL: Mindestens 3 der Habits im daily_life_protocol MÜSSEN diese drei Inputs NAMENTLICH adressieren.
- Wenn nutrition_painpoint = "cravings_evening": mindestens 1 Evening- oder Nutrition-Habit, die Heißhunger adressiert (z.B. "30 g Protein beim Abendessen — stabilisiert Blutzucker → weniger Cravings").
- Wenn nutrition_painpoint = "low_protein": mindestens 1 Nutrition-Habit mit konkretem Protein-Trigger (z.B. "Protein-Quelle zu jeder Mahlzeit — 3× täglich = ~120 g gesamt").
- Wenn nutrition_painpoint = "no_energy": mindestens 1 Morning- oder Nutrition-Habit, die Energie-Stabilisierung adressiert (z.B. "Erstes Frühstück innerhalb 60 Min nach Aufstehen — stabilisiert Cortisol-Kurve").
- Wenn nutrition_painpoint = "no_time": mindestens 1 Habit die Mahlzeiten-Friction reduziert (z.B. "5-Min-Prep-Routine Sonntag Abend — 3 Portionen Protein vorkochen").
- Wenn stress_source = "job": mindestens 1 Work-Day-Habit die Arbeits-Stress-Recovery adressiert (z.B. "Nach letztem Meeting: 3 Min Atem-Reset BEVOR du aufstehst").
- Wenn stress_source = "family": mindestens 1 Evening-Habit die Familien-Reset-Routine adressiert (z.B. "10 Min Allein-Zeit nach dem Nachhause-Kommen, bevor du in den Familien-Modus gehst").
- Wenn stress_source = "finances": mindestens 1 Habit die Finanz-Stress-Cognitive-Load adressiert (z.B. "1× pro Woche 20-Min-Finanz-Check in festem Zeitslot — reduziert diffuse Dauer-Sorge").
- Wenn stress_source = "health" oder "future": mindestens 1 Habit die Unsicherheits-Toleranz trainiert (z.B. "Abend-Journal: 3 kontrollierbare Dinge heute — kalibriert Fokus").
- Wenn recovery_ritual ≠ "none": baue eine der Habits auf diesem Ritual auf (z.B. bei "nature": "Micro-Nature-Break: 5 Min draußen zwischen 2 Meetings" — nutzt das was der User schon liebt, statt was Neues aufzudrücken).

Diese Regeln ersetzen NICHT die Zitierpflicht von Rohzahlen — sie kommen zusätzlich. Jede Daily-Habit braucht EINEN konkreten User-Input als Anker.


═══════════════════════════════════════════════════════════
NUTZERPROFIL
═══════════════════════════════════════════════════════════
Alter: ${ctx.age} Jahre | Geschlecht: ${ctx.gender}
BMI: ${r.metabolic.bmi} kg/m² (${r.metabolic.bmi_category})

═══════════════════════════════════════════════════════════
SLEEP & RECOVERY
═══════════════════════════════════════════════════════════
Sleep Score: ${r.sleep.sleep_score_0_100}/100 | Band: ${r.sleep.sleep_band}
Schlafdauer: ${ctx.sleep_duration_hours}h/Nacht (Duration-Band: ${r.sleep.sleep_duration_band})
Schlafqualität: ${ctx.sleep_quality_label}
Aufwachen nachts: ${ctx.wakeup_frequency_label}
Erholungsgefühl morgens: ${ctx.morning_recovery_1_10}/10

Recovery Score: ${r.recovery.recovery_score_0_100}/100 | Band: ${r.recovery.recovery_band}
Basis-Recovery: ${r.recovery.base_recovery_0_100}/100
Sleep Multiplier: ×${r.recovery.sleep_multiplier} (Impact: ${r.recovery.sleep_impact})
Stress Multiplier: ×${r.recovery.stress_multiplier} (Impact: ${r.recovery.stress_impact})
Overtraining Risiko: ${r.recovery.overtraining_risk ? "JA — kritisch" : "nein"}

═══════════════════════════════════════════════════════════
AKTIVITÄT
═══════════════════════════════════════════════════════════
Activity Score: ${r.activity.activity_score_0_100}/100 | Band: ${r.activity.activity_band}
Gesamt MET-min/Woche: ${r.activity.total_met_minutes_week}
  — Walking MET: ${r.activity.walking_met}
  — Moderate MET: ${r.activity.moderate_met}
  — Vigorous MET: ${r.activity.vigorous_met}
IPAQ Kategorie: ${r.activity.activity_category}
Trainingseinheiten/Woche: ${ctx.training_days}
Trainingsintensität: ${ctx.training_intensity_label}
Schritte/Tag (Selbstangabe): ${ctx.daily_steps}
Stunden auf den Beinen/Tag: ${ctx.standing_hours_per_day}h
Sitzzeit/Tag: ${ctx.sitting_hours_per_day}h
Sitzzeit-Risiko: ${r.activity.sitting_risk_flag}

═══════════════════════════════════════════════════════════
METABOLIC
═══════════════════════════════════════════════════════════
Metabolic Score: ${r.metabolic.metabolic_score_0_100}/100 | Band: ${r.metabolic.metabolic_band}
BMI: ${r.metabolic.bmi} kg/m² (${r.metabolic.bmi_category})
BMI-Disclaimer nötig: ${warnings.bmi_disclaimer_needed}
Mahlzeiten/Tag: ${ctx.meals_per_day}
Wasserkonsum: ${ctx.water_litres}L/Tag
Obst & Gemüse: ${ctx.fruit_veg_label}

═══════════════════════════════════════════════════════════
STRESS
═══════════════════════════════════════════════════════════
Stress Score: ${r.stress.stress_score_0_100}/100 | Band: ${r.stress.stress_band}
Stresslevel (1-10): ${ctx.stress_level_1_10}
Sleep Buffer: +${r.stress.sleep_buffer}
Recovery Buffer: +${r.stress.recovery_buffer}
Chronischer Stress Risiko: ${warnings.chronic_stress_risk ? "JA" : "nein"}
HPA-Achsen Risiko: ${warnings.hpa_axis_risk ? "JA" : "nein"}

═══════════════════════════════════════════════════════════
VO2MAX
═══════════════════════════════════════════════════════════
VO2max Score: ${r.vo2max.fitness_score_0_100}/100 | Band: ${r.vo2max.fitness_level_band}
Geschätzter VO2max: ${r.vo2max.vo2max_estimated} ml/kg/min
Fitness Level: ${r.vo2max.fitness_level_band} (alters- und geschlechtsspezifisch)
HINWEIS: Dies ist eine algorithmische Schätzung auf Basis der Non-Exercise-Formel — kein Laborwert.

═══════════════════════════════════════════════════════════
OVERALL
═══════════════════════════════════════════════════════════
Overall Performance Index: ${r.overall_score_0_100}/100 | Band: ${r.overall_band}
Top-Priorität-Modul (aus Scoring ermittelt): ${r.top_priority_module}
Prioritäts-Reihenfolge: ${interp.priority_order.join(" > ")}

═══════════════════════════════════════════════════════════
VORFORMULIERTE INTERPRETATIONEN (paraphrasieren, nicht kopieren)
═══════════════════════════════════════════════════════════

[SLEEP — Band: ${r.sleep.sleep_band}]
finding: ${interp.sleep.finding}
metabolic_link: ${interp.sleep.metabolic_link}
recovery_link: ${interp.sleep.recovery_link}
recommendation: ${interp.sleep.recommendation}

[RECOVERY — Band: ${r.recovery.recovery_band}]
finding: ${interp.recovery.finding}
overtraining_context: ${interp.recovery.overtraining_context}
sleep_stress_dependency: ${interp.recovery.sleep_stress_dependency}
recommendation: ${interp.recovery.recommendation}

[ACTIVITY — Band: ${r.activity.activity_band}]
finding: ${interp.activity.finding}
mortality_context: ${interp.activity.mortality_context}
recommendation: ${interp.activity.recommendation}
sitting_flag: ${interp.sitting_flag ? interp.sitting_flag.text : "(null — Sitzzeit unauffällig)"}

[METABOLIC — Band: ${r.metabolic.metabolic_band}]
finding: ${interp.metabolic.finding}
bmi_disclaimer: ${interp.metabolic.bmi_disclaimer}
bmi_context: ${interp.bmi_context}
sitting_note: ${interp.metabolic.sitting_note}
recommendation: ${interp.metabolic.recommendation}

[STRESS — Band: ${r.stress.stress_band}]
finding: ${interp.stress.finding}
systemic_impact: ${interp.stress.systemic_impact}
recommendation: ${interp.stress.recommendation}

[VO2MAX — Band: ${r.vo2max.fitness_level_band}]
finding: ${interp.vo2max.finding}
fitness_context: ${interp.vo2max.fitness_context}
activity_link: ${interp.vo2max.activity_link}
recommendation: ${interp.vo2max.recommendation}
estimation_note: ${interp.vo2max_disclaimer}

═══════════════════════════════════════════════════════════
AKTIVE SYSTEMISCHE WARNUNGEN
═══════════════════════════════════════════════════════════
${activeWarnings}

REPORT TYP: ${ctx.reportType}

Erstelle jetzt den vollständigen, ausführlichen Report im geforderten JSON-Format. Jedes Modul mindestens 15–20 Sätze insgesamt. Mache ihn persönlich, präzise und wissenschaftlich fundiert.${
    locale === "en"
      ? "\n\n⚠️ FINAL REMINDER: Every user-facing value in the JSON MUST be in ENGLISH. No German words anywhere in the output. Only VO2max/HRV/HPA/MET/BMI/IPAQ/RHR stay as-is."
      : locale === "it"
        ? "\n\n⚠️ PROMEMORIA FINALE: Ogni valore rivolto all'utente nel JSON DEVE essere in ITALIANO. Nessuna parola tedesca nell'output. Solo VO2max/HRV/HPA/MET/BMI/IPAQ/RHR restano invariati."
        : locale === "tr"
          ? "\n\n⚠️ SON HATIRLATMA: JSON'daki kullanıcıya yönelik her değer TÜRKÇE olmalıdır. Çıktıda hiç Almanca kelime olmamalı. Yalnızca VO2max/HRV/HPA/MET/BMI/IPAQ/RHR aynı kalır."
          : ""
  }`;
}

// ── Offline Demo Mode ─────────────────────────────────────────────────────

interface DemoContext {
  reportType: string;
  // URL locale captured when the client built the body. Drives Claude
  // output language, PDF chrome, and disclaimer. Falls back to "de" on
  // the server if the client forgot to send it.
  locale?: Locale;
  user: { email: string; age: number; gender: string; height_cm: number; weight_kg: number };
  result: FullScoringResult;
  sleepDurationHours: number;
  // Optional raw-input extras — used by the premium prompt when available.
  sleep_quality_label?: string;
  wakeup_frequency_label?: string;
  morning_recovery_1_10?: number;
  stress_level_1_10?: number;
  meals_per_day?: number;
  water_litres?: number;
  fruit_veg_label?: string;
  standing_hours_per_day?: number;
  sitting_hours_per_day?: number;
  training_days?: number;
  daily_steps?: number;
  screen_time_before_sleep?: string | null;
  main_goal?: PremiumPromptContext["main_goal"];
  time_budget?: PremiumPromptContext["time_budget"];
  experience_level?: PremiumPromptContext["experience_level"];
  nutrition_painpoint?: PremiumPromptContext["nutrition_painpoint"];
  stress_source?: PremiumPromptContext["stress_source"];
  recovery_ritual?: PremiumPromptContext["recovery_ritual"];
  data_sources?: PremiumPromptContext["data_sources"];
}

function demoBand(score: number): string {
  if (score < 40) return "low";
  if (score < 65) return "moderate";
  if (score < 85) return "high";
  return "very_high";
}

async function handleDemoReport(req: NextRequest, ctx: DemoContext): Promise<NextResponse> {
  const r = ctx.result;
  const demoLocale: Locale =
    ctx.locale === "en" || ctx.locale === "it" || ctx.locale === "tr"
      ? ctx.locale
      : "de";

  const activityScore = r.activity.activity_score_0_100;
  const activityBand = demoBand(activityScore);
  const activityCategory = r.activity.activity_category.toUpperCase();
  const totalMet = r.activity.total_met_minutes_week;

  const sleepScore = r.sleep.sleep_score_0_100;
  const sleepBand = demoBand(sleepScore);
  const sleepDuration = ctx.sleepDurationHours;

  const vo2Score = r.vo2max.fitness_score_0_100;
  const vo2Band = demoBand(vo2Score);
  const vo2Estimated = r.vo2max.vo2max_estimated;

  const metabolicScore = r.metabolic.metabolic_score_0_100;
  const metabolicBand = demoBand(metabolicScore);
  const bmi = r.metabolic.bmi;
  const bmiCategory = r.metabolic.bmi_category;

  const stressScore = r.stress.stress_score_0_100;
  const stressBand = demoBand(stressScore);

  const overallScore = r.overall_score_0_100;
  const overallBand = r.overall_band;

  let report: PdfReportContent;
  if (anthropicConfigured()) {
    const userPrompt = buildPremiumUserPrompt({
      reportType: ctx.reportType,
      locale: demoLocale,
      age: ctx.user.age,
      gender: ctx.user.gender,
      result: r,
      sleep_duration_hours: ctx.sleepDurationHours,
      sleep_quality_label: ctx.sleep_quality_label ?? FALLBACK_NOT_SPECIFIED[demoLocale],
      wakeup_frequency_label: ctx.wakeup_frequency_label ?? FALLBACK_NOT_SPECIFIED[demoLocale],
      morning_recovery_1_10: ctx.morning_recovery_1_10 ?? 5,
      stress_level_1_10: ctx.stress_level_1_10 ?? 5,
      meals_per_day: ctx.meals_per_day ?? 3,
      water_litres: ctx.water_litres ?? 2,
      fruit_veg_label: ctx.fruit_veg_label ?? FALLBACK_NOT_SPECIFIED[demoLocale],
      standing_hours_per_day: ctx.standing_hours_per_day ?? 3,
      sitting_hours_per_day: ctx.sitting_hours_per_day ?? r.metabolic.sitting_hours,
      training_days: ctx.training_days ?? 0,
      training_intensity_label: trainingIntensityLabel(r, demoLocale),
      daily_steps: ctx.daily_steps ?? 0,
      screen_time_before_sleep: ctx.screen_time_before_sleep ?? null,
      main_goal: ctx.main_goal ?? null,
      time_budget: ctx.time_budget ?? null,
      experience_level: ctx.experience_level ?? null,
      nutrition_painpoint: ctx.nutrition_painpoint ?? null,
      stress_source: ctx.stress_source ?? null,
      recovery_ritual: ctx.recovery_ritual ?? null,
      data_sources: ctx.data_sources,
    });
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      // Sonnet 4.6 is ~2-3× faster than Opus for this structured paraphrase
      // task and keeps the total latency under the Vercel timeout.
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      system: buildSystemPromptForLocale(demoLocale),
      messages: [{ role: "user", content: userPrompt }],
    });
    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected Anthropic response type");
    try {
      const cleaned = content.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      report = JSON.parse(cleaned) as PdfReportContent;
    } catch (e) {
      throw new Error(`Claude returned invalid JSON: ${(e as Error).message}`);
    }
  } else {
    console.warn("[report/generate/demo] ANTHROPIC_API_KEY not configured — using stub report");
    report = buildStubReport({
      activityScore, activityBand, activityCategory, totalMet,
      sleepScore, sleepBand, sleepDuration,
      recoveryScore: r.recovery.recovery_score_0_100,
      recoveryBand: r.recovery.recovery_band,
      vo2Score, vo2Band, vo2Estimated,
      metabolicScore, metabolicBand, bmi, bmiCategory,
      stressScore, stressBand,
      overallScore, overallBand,
    });
  }

  const pdfBuffer = await generatePDF(
    report,
    {
      sleep: { score: sleepScore, band: sleepBand },
      recovery: { score: r.recovery.recovery_score_0_100, band: r.recovery.recovery_band },
      activity: { score: activityScore, band: activityBand },
      metabolic: { score: metabolicScore, band: metabolicBand },
      stress: { score: stressScore, band: stressBand },
      vo2max: { score: vo2Score, band: vo2Band, estimated: vo2Estimated },
      overall: { score: overallScore, band: overallBand },
      total_met: totalMet,
      sleep_duration_hours: sleepDuration,
      sitting_hours: r.metabolic.sitting_hours,
      training_days: ctx.training_days ?? 0,
    },
    {
      email: ctx.user.email,
      age: ctx.user.age,
      gender: ctx.user.gender,
      bmi,
      bmi_category: bmiCategory,
    },
    demoLocale,
  );

  // In demo mode, try to save to /public/test-reports for local dev.
  // On Vercel the filesystem outside /tmp is read-only — fall back to
  // returning the PDF as a base64 data URL that the client can open directly.
  let downloadUrl: string | null = null;
  try {
    const fileName = `btb-report-demo-${Date.now()}.pdf`;
    const publicDir = path.join(process.cwd(), "public", "test-reports");
    await mkdir(publicDir, { recursive: true });
    await writeFile(path.join(publicDir, fileName), Buffer.from(pdfBuffer));
    downloadUrl = `${req.nextUrl.origin}/test-reports/${fileName}`;
  } catch {
    // Filesystem is read-only (Vercel prod) — embed PDF as base64 data URL
    const b64 = Buffer.from(pdfBuffer).toString("base64");
    downloadUrl = `data:application/pdf;base64,${b64}`;
  }

  return NextResponse.json({ success: true, downloadUrl, report });
}

// ── DB-backed handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const demoContext = body?.demoContext as DemoContext | undefined;
  if (demoContext) {
    try {
      return await handleDemoReport(req, demoContext);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[report/generate] handleDemoReport error:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const assessmentId = body?.assessmentId as string | undefined;
  if (!assessmentId) {
    return NextResponse.json({ error: "Missing assessmentId or demoContext" }, { status: 400 });
  }

  // Top-level try/catch wrapping EVERYTHING so lambda never crashes with
  // a raw "An error occurred" plain-text response — always return JSON.
  let supabase: ReturnType<typeof getSupabaseServiceClient>;
  try {
    supabase = getSupabaseServiceClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[report/generate] supabase init failed", msg);
    return NextResponse.json({ error: `Supabase init: ${msg}` }, { status: 500 });
  }

  let jobId: string | undefined;
  try {
    const { data: jobRow } = await supabase
      .from("report_jobs")
      .select("id")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    jobId = jobRow?.id as string | undefined;
    if (jobId) {
      await supabase
        .from("report_jobs")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
          prompt_version: PROMPT_VERSION,
        })
        .eq("id", jobId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[report/generate] job setup failed", msg);
    return NextResponse.json({ error: `Job setup: ${msg}` }, { status: 500 });
  }

  try {
    // 1. Load assessment, user, scores, metrics, responses.
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("id, report_type, user_id, data_sources, locale")
      .eq("id", assessmentId)
      .single();
    if (aErr) throw aErr;

    const locale: Locale =
      assessment.locale === "en" ||
      assessment.locale === "it" ||
      assessment.locale === "tr"
        ? assessment.locale
        : "de";

    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("email, age, gender, height_cm, weight_kg")
      .eq("id", assessment.user_id)
      .single();
    if (uErr) throw uErr;

    // Scores and derived metrics are re-derived from responses below via
    // runFullScoring() — no need to fetch them separately.
    const responsesRes = await supabase
      .from("responses")
      .select("question_code, raw_value, normalized_value")
      .eq("assessment_id", assessmentId);
    if (responsesRes.error) throw responsesRes.error;

    const responses = (responsesRes.data ?? []) as ResponseRow[];

    // 2. Reconstruct the full scoring inputs from the stored responses.
    //    This lets us re-run runFullScoring() to get the richer v3 result
    //    (interpretation bundle, systemic warnings, recovery module) even
    //    when the assessment was persisted under an older scoring version.
    const respMap = new Map<string, string>(
      responses.map((r) => [r.question_code, r.raw_value]),
    );
    const num = (k: string, fallback: number): number => {
      const v = respMap.get(k);
      const n = v != null ? Number(v) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };
    const str = <T extends string>(k: string, fallback: T): T =>
      (respMap.get(k) as T | undefined) ?? fallback;

    const reconstructed: FullAssessmentInputs = {
      age: user.age ?? num("age", 30),
      gender: (user.gender as Gender) ?? str<Gender>("gender", "diverse"),
      height_cm: user.height_cm ?? num("height_cm", 175),
      weight_kg: user.weight_kg ?? num("weight_kg", 75),
      activity: {
        walking_days: num("walking_days", 5),
        walking_minutes_per_day: num("walking_minutes_per_day", 30),
        walking_total_minutes_week: respMap.has("walking_total_minutes_week")
          ? num("walking_total_minutes_week", 0)
          : undefined,
        moderate_days: num("moderate_days", 0),
        moderate_minutes_per_day: num("moderate_minutes_per_day", 0),
        vigorous_days: num("vigorous_days", 0),
        vigorous_minutes_per_day: num("vigorous_minutes_per_day", 0),
      },
      sleep: {
        duration_hours: num("sleep_duration_hours", 7),
        quality: str<SleepQualityLabel>("sleep_quality", "mittel"),
        wakeups: str<WakeupFrequency>("wakeups", "selten"),
        recovery_1_10: num("recovery_1_10", 5),
      },
      metabolic: {
        meals_per_day: num("meals_per_day", 3),
        water_litres: num("water_litres", 2),
        sitting_hours: num("sitting_hours", 6),
        fruit_veg: str<FruitVegLevel>("fruit_veg", "moderate"),
      },
      stress: { stress_level_1_10: num("stress_level_1_10", 5) },
    };

    // Optional wearable overrides. `assessments.data_sources` is populated by
    // /api/assessment when a wearable_upload_id was submitted; we look up the
    // linked wearable_uploads row and build a WearableOverrides object.
    const dataSources = assessment.data_sources as
      | { form?: true; whoop?: { days: number; upload_id?: string }; apple_health?: { days: number; upload_id?: string } }
      | null;
    let pdfWearableRows: PdfWearableRows | undefined;
    if (dataSources?.whoop || dataSources?.apple_health) {
      const source = dataSources.whoop ? "whoop" : "apple_health";
      const { data: wUp } = await supabase
        .from("wearable_uploads")
        .select("source, days_covered, metrics")
        .eq("assessment_id", assessmentId)
        .eq("source", source)
        .maybeSingle();
      if (wUp) {
        const m = wUp.metrics as Record<string, Record<string, number> | undefined>;
        reconstructed.wearable = {
          source: wUp.source as "whoop" | "apple_health",
          days_covered: wUp.days_covered,
          sleep: m.sleep
            ? {
                duration_hours: m.sleep.avg_duration_hours,
                efficiency_pct: m.sleep.avg_efficiency_pct,
                wakeups_per_night: m.sleep.avg_wakeups,
              }
            : undefined,
          recovery: m.recovery
            ? {
                whoop_recovery_0_100:
                  wUp.source === "whoop" ? m.recovery.avg_score : undefined,
                hrv_ms: m.recovery.avg_hrv_ms,
                rhr_bpm: m.recovery.avg_rhr_bpm,
              }
            : undefined,
          activity: m.activity
            ? {
                daily_steps: m.activity.avg_steps,
                whoop_strain_0_21:
                  wUp.source === "whoop" ? m.activity.avg_strain : undefined,
                active_kcal: m.activity.avg_active_kcal,
              }
            : undefined,
          vo2max: m.vo2max ? { measured_ml_kg_min: m.vo2max.last_value } : undefined,
          body: m.body ? { weight_kg: m.body.last_weight_kg } : undefined,
        };

        // Build localized PDF stat-box rows from raw wearable metrics.
        const W_LABELS: Record<Locale, Record<string, string>> = {
          de: { dur: "Ø Schlafdauer", eff: "Schlafeffizienz", deep: "Tiefschlaf", rem: "REM", steps: "Ø Schritte", strain: "Ø Strain", kcal: "Ø Aktiv-kcal", hrv: "Ø HRV", rhr: "Ø Ruhepuls", rec: "Ø Recovery", vo2: "VO2max", bmi: "BMI", fat: "Körperfett", muscle: "Muskelmasse" },
          en: { dur: "Avg Sleep", eff: "Sleep Eff.", deep: "Deep Sleep", rem: "REM", steps: "Avg Steps", strain: "Avg Strain", kcal: "Active kcal", hrv: "Avg HRV", rhr: "Avg RHR", rec: "Avg Recovery", vo2: "VO2max", bmi: "BMI", fat: "Body Fat", muscle: "Muscle Mass" },
          it: { dur: "Durata Sonno", eff: "Efficienza Sonno", deep: "Sonno Profondo", rem: "REM", steps: "Passi Medi", strain: "Strain Medio", kcal: "kcal Attive", hrv: "HRV Medio", rhr: "FC a Riposo", rec: "Recupero Medio", vo2: "VO2max", bmi: "BMI", fat: "Grasso Corporeo", muscle: "Massa Muscolare" },
          tr: { dur: "Ort. Uyku", eff: "Uyku Verim.", deep: "Derin Uyku", rem: "REM", steps: "Ort. Adım", strain: "Ort. Strain", kcal: "Aktif kcal", hrv: "Ort. HRV", rhr: "İstirahat Nabzı", rec: "Ort. Recovery", vo2: "VO2max", bmi: "BMI", fat: "Vücut Yağı", muscle: "Kas Kütlesi" },
        };
        const wLabels = W_LABELS[locale] ?? W_LABELS.en;
        pdfWearableRows = {};
        if (m.sleep) {
          const sr: Array<[string, string]> = [];
          if (m.sleep.avg_duration_hours != null) sr.push([wLabels.dur, `${m.sleep.avg_duration_hours.toFixed(1)} h`]);
          if (m.sleep.avg_efficiency_pct != null) sr.push([wLabels.eff, `${Math.round(m.sleep.avg_efficiency_pct)}%`]);
          if (m.sleep.avg_deep_sleep_min != null) sr.push([wLabels.deep, `${Math.round(m.sleep.avg_deep_sleep_min)} min`]);
          if (m.sleep.avg_rem_min != null) sr.push([wLabels.rem, `${Math.round(m.sleep.avg_rem_min)} min`]);
          if (sr.length) pdfWearableRows.sleep = sr;
        }
        if (m.activity) {
          const ar: Array<[string, string]> = [];
          if (m.activity.avg_steps != null) ar.push([wLabels.steps, Math.round(m.activity.avg_steps).toString()]);
          if (m.activity.avg_strain != null) ar.push([wLabels.strain, m.activity.avg_strain.toFixed(1)]);
          if (m.activity.avg_active_kcal != null) ar.push([wLabels.kcal, Math.round(m.activity.avg_active_kcal).toString()]);
          if (ar.length) pdfWearableRows.activity = ar;
        }
        if (m.recovery) {
          const rr: Array<[string, string]> = [];
          if (m.recovery.avg_hrv_ms != null) rr.push([wLabels.hrv, `${Math.round(m.recovery.avg_hrv_ms)} ms`]);
          if (m.recovery.avg_rhr_bpm != null) rr.push([wLabels.rhr, `${Math.round(m.recovery.avg_rhr_bpm)} bpm`]);
          if (m.recovery.avg_score != null) rr.push([wLabels.rec, `${Math.round(m.recovery.avg_score)}%`]);
          if (rr.length) pdfWearableRows.stress = rr;
        }
        if (m.vo2max?.last_value != null) {
          pdfWearableRows.vo2max = [[wLabels.vo2, `${m.vo2max.last_value.toFixed(1)} ml/kg/min`]];
        }
        if (m.body) {
          const br: Array<[string, string]> = [];
          if (m.body.bmi != null) br.push([wLabels.bmi, m.body.bmi.toFixed(1)]);
          if (m.body.body_fat_pct != null) br.push([wLabels.fat, `${m.body.body_fat_pct.toFixed(1)}%`]);
          if (m.body.skeletal_muscle_kg != null) br.push([wLabels.muscle, `${m.body.skeletal_muscle_kg.toFixed(1)} kg`]);
          if (br.length) pdfWearableRows.metabolic = br;
        }
      }
    }

    const result = runFullScoring(reconstructed);
    const sleepDuration = reconstructed.sleep.duration_hours;
    const standingHours = num(
      "standing_hours_per_day",
      reconstructed.activity.walking_total_minutes_week
        ? reconstructed.activity.walking_total_minutes_week / 60 / 5
        : 3,
    );
    const trainingDays = Math.max(
      reconstructed.activity.moderate_days,
      reconstructed.activity.vigorous_days,
    );

    // 3. Build the premium v3 user prompt (shared with the demo handler).
    const userPrompt = buildPremiumUserPrompt({
      reportType: assessment.report_type ?? "complete",
      locale,
      age: reconstructed.age,
      gender: reconstructed.gender,
      result,
      sleep_duration_hours: sleepDuration,
      sleep_quality_label:
        SLEEP_QUALITY_LABEL[locale][reconstructed.sleep.quality] ??
        SLEEP_QUALITY_LABEL[locale].mittel,
      wakeup_frequency_label:
        WAKEUP_LABEL[locale][reconstructed.sleep.wakeups] ??
        WAKEUP_LABEL[locale].selten,
      morning_recovery_1_10: reconstructed.sleep.recovery_1_10,
      stress_level_1_10: reconstructed.stress.stress_level_1_10,
      meals_per_day: reconstructed.metabolic.meals_per_day,
      water_litres: reconstructed.metabolic.water_litres,
      fruit_veg_label:
        FRUIT_VEG_LABEL[locale][reconstructed.metabolic.fruit_veg] ??
        FRUIT_VEG_LABEL[locale].moderate,
      standing_hours_per_day: standingHours,
      sitting_hours_per_day: reconstructed.metabolic.sitting_hours,
      training_days: trainingDays,
      training_intensity_label: trainingIntensityLabel(result, locale),
      daily_steps: num("schrittzahl", 0),
      // Neue v2-Felder — aus responses-Tabelle gelesen. Fehlende Werte
      // werden im Prompt als "nicht angegeben" ausgespielt und dort per
      // Default-Fallback (feel_better / moderate / intermediate) behandelt.
      screen_time_before_sleep: respMap.get("screen_time_before_sleep") ?? null,
      main_goal: (respMap.get("main_goal") as PremiumPromptContext["main_goal"]) ?? null,
      time_budget: (respMap.get("time_budget") as PremiumPromptContext["time_budget"]) ?? null,
      experience_level:
        (respMap.get("experience_level") as PremiumPromptContext["experience_level"]) ?? null,
      // Phase-2 Tiefen-Inputs
      nutrition_painpoint:
        (respMap.get("nutrition_painpoint") as PremiumPromptContext["nutrition_painpoint"]) ?? null,
      stress_source:
        (respMap.get("stress_source") as PremiumPromptContext["stress_source"]) ?? null,
      recovery_ritual:
        (respMap.get("recovery_ritual") as PremiumPromptContext["recovery_ritual"]) ?? null,
      data_sources: dataSources
        ? {
            form: true,
            whoop: dataSources.whoop ? { days: dataSources.whoop.days } : undefined,
            apple_health: dataSources.apple_health
              ? { days: dataSources.apple_health.days }
              : undefined,
          }
        : undefined,
    });

    // Legacy bandings kept for PDF + downstream (PDF uses simple 0–100 bands).
    const bmi = result.metabolic.bmi;
    const bmiCategory = result.metabolic.bmi_category;
    const activityScore = result.activity.activity_score_0_100;
    const activityBand = demoBand(activityScore);
    const activityCategory = result.activity.activity_category;
    const totalMet = result.activity.total_met_minutes_week;
    const sleepScore = result.sleep.sleep_score_0_100;
    const sleepBand = demoBand(sleepScore);
    const vo2ScoreNum = result.vo2max.fitness_score_0_100;
    const vo2Band = demoBand(vo2ScoreNum);
    const vo2Estimated = result.vo2max.vo2max_estimated;
    const metabolicScore = result.metabolic.metabolic_score_0_100;
    const metabolicBand = demoBand(metabolicScore);
    const stressScore = result.stress.stress_score_0_100;
    const stressBand = demoBand(stressScore);
    const overallScore = result.overall_score_0_100;
    const overallBand = result.overall_band;

    // 4. Call Claude — or fall back to deterministic stub if no API key.
    let report: PdfReportContent;
    if (anthropicConfigured()) {
      const anthropic = getAnthropic();
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        system: buildSystemPromptForLocale(locale),
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected Anthropic response type");
      }

      try {
        const cleaned = content.text
          .trim()
          .replace(/^```(?:json)?/i, "")
          .replace(/```$/i, "")
          .trim();
        report = JSON.parse(cleaned) as PdfReportContent;
      } catch (e) {
        throw new Error(`Claude returned invalid JSON: ${(e as Error).message}`);
      }
    } else {
      console.warn("[report/generate] ANTHROPIC_API_KEY not configured — using stub report");
      report = buildStubReport({
        activityScore,
        activityBand,
        activityCategory,
        totalMet,
        sleepScore,
        sleepBand,
        sleepDuration,
        recoveryScore: result.recovery.recovery_score_0_100,
        recoveryBand: result.recovery.recovery_band,
        vo2Score: vo2ScoreNum,
        vo2Band,
        vo2Estimated,
        metabolicScore,
        metabolicBand,
        bmi,
        bmiCategory,
        stressScore,
        stressBand,
        overallScore,
        overallBand,
      });
    }

    // 4b. Build heroData from wearable metrics (for PDF cover stamp).
    let heroData: PdfHeroData | undefined;
    if (pdfWearableRows && dataSources) {
      const heroSources: Array<{ label: string }> = [];
      if (dataSources.whoop) heroSources.push({ label: "WHOOP" });
      if (dataSources.apple_health) heroSources.push({ label: "Apple Health" });
      if (dataSources.form) {
        const formLabel: Record<Locale, string> = {
          de: "Fragebogen",
          en: "Questionnaire",
          it: "Questionario",
          tr: "Anket",
        };
        heroSources.push({ label: formLabel[locale] ?? "Questionnaire" });
      }

      // Estimate datapoints: sleep(4) + activity(3) + recovery(3) + vo2(1) + body(3) per day/entry
      let dp = 0;
      const days = dataSources.whoop?.days ?? dataSources.apple_health?.days ?? 0;
      if (pdfWearableRows.sleep) dp += days * 4;
      if (pdfWearableRows.activity) dp += days * 3;
      if (pdfWearableRows.stress) dp += days * 3;
      if (pdfWearableRows.vo2max) dp += 1;
      if (pdfWearableRows.metabolic) dp += 3;

      const multiSource = heroSources.length >= 2;
      const quality_level: PdfHeroData["quality_level"] =
        multiSource || dp >= 200              ? "excellent" :
        dp >= 100   || days >= 14             ? "strong" :
        dp > 0      || heroSources.length > 0 ? "good" : "secured";

      heroData = { sources: heroSources, quality_level, total_datapoints: dp };
    }

    // 4c. Run premium AI calls in parallel (executive_findings, cross_insights, action_plan).
    //     All are best-effort — failures silently leave the fields undefined.
    if (anthropicConfigured() && assessmentId) {
      const anthropic = getAnthropic();
      const scoresObj = { activity: activityScore, sleep: sleepScore, vo2max: vo2ScoreNum, metabolic: metabolicScore, stress: stressScore };

      // Sub-calls hatten vorher nur Scores + Alter/Geschlecht — Claude konnte
      // keine konkreten User-Werte zitieren, also blieb der Output generisch.
      // Wir reichen denselben Kontext durch den `buildPremiumUserPrompt` bekommt.
      const subCtx = {
        sleep_duration_h: reconstructed.sleep.duration_hours,
        sleep_quality:
          SLEEP_QUALITY_LABEL[locale][reconstructed.sleep.quality] ??
          SLEEP_QUALITY_LABEL[locale].mittel,
        wakeups:
          WAKEUP_LABEL[locale][reconstructed.sleep.wakeups] ??
          WAKEUP_LABEL[locale].selten,
        morning_recovery_1_10: reconstructed.sleep.recovery_1_10,
        stress_1_10: reconstructed.stress.stress_level_1_10,
        training_days: trainingDays,
        training_intensity: trainingIntensityLabel(result, locale),
        sitting_h: reconstructed.metabolic.sitting_hours,
        standing_h: standingHours,
        daily_steps: num("schrittzahl", 0),
        meals: reconstructed.metabolic.meals_per_day,
        water_l: reconstructed.metabolic.water_litres,
        fruit_veg:
          FRUIT_VEG_LABEL[locale][reconstructed.metabolic.fruit_veg] ??
          FRUIT_VEG_LABEL[locale].moderate,
        screen_time_before_sleep: respMap.get("screen_time_before_sleep") ?? FALLBACK_NOT_SPECIFIED[locale],
        main_goal: respMap.get("main_goal") ?? "feel_better",
        time_budget: respMap.get("time_budget") ?? "moderate",
        experience_level: respMap.get("experience_level") ?? "intermediate",
        nutrition_painpoint: respMap.get("nutrition_painpoint") ?? FALLBACK_NOT_SPECIFIED[locale],
        stress_source: respMap.get("stress_source") ?? FALLBACK_NOT_SPECIFIED[locale],
        recovery_ritual: respMap.get("recovery_ritual") ?? FALLBACK_NOT_SPECIFIED[locale],
      };
      const rawContextBlock = `
User profile: age ${user.age}, gender ${user.gender}, BMI ${bmi}
Main goal: ${subCtx.main_goal}
Time budget: ${subCtx.time_budget}
Experience level: ${subCtx.experience_level}
Nutrition painpoint: ${subCtx.nutrition_painpoint}
Main stress source: ${subCtx.stress_source}
Favorite recovery ritual: ${subCtx.recovery_ritual}
Raw inputs (CITE AT LEAST ONE NUMBER VERBATIM in each finding/insight/goal):
- Sleep: ${subCtx.sleep_duration_h}h / quality ${subCtx.sleep_quality} / wakeups ${subCtx.wakeups} / recovery ${subCtx.morning_recovery_1_10}/10 / screen-cutoff ${subCtx.screen_time_before_sleep}
- Stress: ${subCtx.stress_1_10}/10 (source: ${subCtx.stress_source})
- Activity: ${subCtx.training_days} days/wk (${subCtx.training_intensity}), ${subCtx.sitting_h}h sitting, ${subCtx.standing_h}h standing, ${subCtx.daily_steps} steps/day
- Nutrition: ${subCtx.meals} meals/day, ${subCtx.water_l}L water, ${subCtx.fruit_veg} fruit/veg (painpoint: ${subCtx.nutrition_painpoint})

When the user has a specific nutrition_painpoint or stress_source, the related finding/insight/goal MUST name that painpoint/source explicitly (not generic "improve nutrition" — instead "address your evening cravings by…").`;

      const localeDirective =
        locale === "de" ? 'Language: German, du-Form.' :
        locale === "it" ? 'Lingua: Italiano, forma "tu".' :
        locale === "tr" ? 'Dil: Türkçe, samimi "sen" hitabı (resmi "siz" değil).' :
        "Language: English, second person.";

      // If goal = non-performance AND beginner/restart AND minimal/moderate time →
      // force the action plan to be lifestyle-goals-only (no training goals).
      const lifestyleOnly =
        subCtx.main_goal !== "performance" &&
        (subCtx.experience_level === "beginner" || subCtx.experience_level === "restart") &&
        (subCtx.time_budget === "minimal" || subCtx.time_budget === "moderate");

      const buildFindingsPrompt = () => `You are generating 3 executive performance findings for a fitness report.
Scores: ${JSON.stringify(scoresObj)}
${rawContextBlock}

${localeDirective}

Return ONLY valid JSON array with exactly 3 objects, no markdown:
[{"type":"weakness","headline":"...","body":"...","related_dimension":"..."},
 {"type":"strength","headline":"...","body":"...","related_dimension":"..."},
 {"type":"connection","headline":"...","body":"...","related_dimension":"..."}]
Each headline ≤8 words. Body ≤60 words AND must reference at least one raw user value verbatim (e.g. "weil du 6.4 h schläfst..."). Generic advice ("reduziere Stress", "schlafe besser") forbidden.`;

      const buildInsightsPrompt = () => `Generate 2-3 cross-dimension performance insights for this athlete.
Scores: ${JSON.stringify(scoresObj)}
${rawContextBlock}

${localeDirective}

Return ONLY valid JSON array, no markdown:
[{"dimension_a":"sleep","dimension_b":"stress","headline":"...","body":"..."}]
Body ≤50 words each AND must cite at least one raw value from the user data. Only include pairs with meaningful interaction. Generic "X affects Y"-phrases forbidden unless backed by a specific user number.`;

      const buildPlanPrompt = () => `Generate a 30-day action plan with exactly 3 goals for this athlete.
Scores: ${JSON.stringify(scoresObj)}
${rawContextBlock}

MANDATORY rules:
- Focus on the 3 lowest-scored dimensions (unless overridden by lifestyle-only rule below)
- Each goal's headline AND current_value MUST reference a verbatim number from the raw user data above (e.g. current_value "6.4h sleep")
- Each week_milestones array MUST contain exactly 4 objects — never strings, never empty
- Each milestone object: {"week":"Week 1","task":"<concrete action max 70 chars>","milestone":"<measurable target>"}
- Respect time_budget: if "minimal" → NEVER recommend sessions >15 min. If "moderate" → max 30-45 min sessions.
- Respect experience_level: if "beginner"/"restart" → NEVER recommend >3 training sessions/wk.
${
  lifestyleOnly
    ? "- LIFESTYLE-ONLY MODE ACTIVE: user goal is not performance AND experience is beginner/restart AND time is limited. ALL 3 goals MUST be lifestyle goals (sleep, stress, nutrition, daily habits) — ZERO training-volume goals. No \"train 3x/week\" headlines."
    : ""
}
${
  locale === "de"
    ? '- Language: German, du-Form. Week labels: "KW 1", "KW 2", "KW 3", "KW 4"'
    : locale === "it"
    ? '- Language: Italian, tu-form. Week labels: "Settimana 1", "Settimana 2", "Settimana 3", "Settimana 4"'
    : locale === "tr"
    ? '- Language: Turkish, informal "sen". Week labels: "1. Hafta", "2. Hafta", "3. Hafta", "4. Hafta"'
    : '- Language: English, second person. Week labels: "Week 1", "Week 2", "Week 3", "Week 4"'
}

Return ONLY valid JSON array, no markdown:
[{"headline":"...","current_value":"...","target_value":"...","delta_pct":15,"metric_source":"...",
  "week_milestones":[
    {"week":"KW 1","task":"specific measurable action","milestone":"intermediate target"},
    {"week":"KW 2","task":"specific measurable action","milestone":"intermediate target"},
    {"week":"KW 3","task":"specific measurable action","milestone":"intermediate target"},
    {"week":"KW 4","task":"final push action","milestone":"goal reached"}
  ]}]`;

      const [findingsRes, insightsRes, planRes] = await Promise.allSettled<Anthropic.Message>([
        anthropic.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 1200, messages: [{ role: "user", content: buildFindingsPrompt() }] }) as Promise<Anthropic.Message>,
        anthropic.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 800,  messages: [{ role: "user", content: buildInsightsPrompt() }] }) as Promise<Anthropic.Message>,
        anthropic.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 1200, messages: [{ role: "user", content: buildPlanPrompt() }] }) as Promise<Anthropic.Message>,
      ]);

      const parseJson = (res: PromiseSettledResult<Anthropic.Message>) => {
        if (res.status !== "fulfilled") return null;
        const c = res.value.content[0];
        if (c.type !== "text") return null;
        try {
          const cleaned = c.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
          return JSON.parse(cleaned);
        } catch { return null; }
      };

      const findings = parseJson(findingsRes);
      if (Array.isArray(findings)) report.executive_findings = findings;

      const insights = parseJson(insightsRes);
      if (Array.isArray(insights)) report.cross_insights = insights;

      const plan = parseJson(planRes);
      if (Array.isArray(plan)) report.action_plan = plan;
    }

    // 4. Generate PDF (pdf-lib — pure JS, no native deps, works on Vercel).
    let pdfBuffer: Uint8Array | null = null;
    let downloadUrl: string | null = null;

    try {
      pdfBuffer = await generatePDF(
        report,
        {
          sleep: { score: sleepScore, band: sleepBand },
          recovery: {
            score: result.recovery.recovery_score_0_100,
            band: result.recovery.recovery_band,
          },
          activity: { score: activityScore, band: activityBand },
          metabolic: { score: metabolicScore, band: metabolicBand },
          stress: { score: stressScore, band: stressBand },
          vo2max: {
            score: vo2ScoreNum,
            band: vo2Band,
            estimated: vo2Estimated,
          },
          overall: { score: overallScore, band: overallBand },
          total_met: totalMet,
          sleep_duration_hours: sleepDuration,
          sitting_hours: result.metabolic.sitting_hours,
          training_days: trainingDays,
        },
        {
          email: user.email,
          age: user.age,
          gender: user.gender,
          bmi,
          bmi_category: bmiCategory,
        },
        locale,
        pdfWearableRows,
        heroData,
      );
    } catch (pdfErr) {
      const pdfErrMsg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
      console.warn("[report/generate] PDF generation failed:", pdfErrMsg);
      if (jobId) {
        await supabase
          .from("report_jobs")
          .update({ error_message: `PDF: ${pdfErrMsg.slice(0, 500)}` })
          .eq("id", jobId);
      }
    }

    // 5. Store PDF — try Supabase Storage, then local fs, then base64 data URL.
    //    downloadUrl is always set if pdfBuffer exists.
    if (pdfBuffer) {
      const fileName = `btb-report-${assessmentId}.pdf`;
      const storagePath = `${assessmentId}/${fileName}`;

      try {
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (uploadErr) throw uploadErr;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
        downloadUrl = `${appUrl}/api/report/download/${assessmentId}`;
      } catch (storageErr) {
        const storageMsg = storageErr instanceof Error ? storageErr.message : String(storageErr);
        console.warn(`[report/generate] Supabase Storage failed (${storageMsg}) — trying fs fallback`);
        try {
          const publicDir = path.join(process.cwd(), "public", "test-reports");
          await mkdir(publicDir, { recursive: true });
          await writeFile(path.join(publicDir, fileName), Buffer.from(pdfBuffer));
          downloadUrl = `${req.nextUrl.origin}/test-reports/${fileName}`;
        } catch {
          // Vercel read-only filesystem — embed as base64 so the browser can
          // open the PDF immediately without any external storage dependency.
          console.warn("[report/generate] fs write failed — using base64 data URL");
          downloadUrl = `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString("base64")}`;
        }
      }
    }

    // 6. Persist artifact reference (only if PDF was generated).
    if (downloadUrl) {
      await supabase.from("report_artifacts").insert({
        assessment_id: assessmentId,
        file_url: downloadUrl,
        file_type: "pdf",
      });
    }

    // 7. Send email via Resend (skipped if not configured or no PDF).
    if (resendConfigured() && downloadUrl) {
      try {
        await sendReportEmail(user.email, downloadUrl, {
          overall: overallScore,
          activity: activityScore,
          sleep: sleepScore,
          vo2max: vo2ScoreNum,
          metabolic: metabolicScore,
          stress: stressScore,
        }, locale);
      } catch (emailErr) {
        console.error("[report/generate] email delivery failed", emailErr);
        // Non-fatal — PDF is still persisted and linked.
      }
    } else {
      console.warn("[report/generate] RESEND_API_KEY not configured — skipping email");
    }

    // 8. Mark report job completed.
    if (jobId) {
      await supabase
        .from("report_jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json({ success: true, downloadUrl, report });
  } catch (err) {
    console.error("[report/generate] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (jobId) {
      await supabase
        .from("report_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq("id", jobId);
    }
    const { code, status } = classifyError(err);
    return NextResponse.json({ error: "ai_unavailable", code }, { status });
  }
}

function classifyError(err: unknown): { code: string; status: number } {
  if (err instanceof Anthropic.APIError) {
    const body = typeof err.message === "string" ? err.message : "";
    if (/credit balance|billing|insufficient_quota/i.test(body)) {
      return { code: "provider_billing", status: 503 };
    }
    if (err.status === 429 || /rate_limit/i.test(body)) {
      return { code: "provider_rate_limit", status: 503 };
    }
    if (err.status === 529 || /overloaded/i.test(body)) {
      return { code: "provider_overloaded", status: 503 };
    }
    return { code: "provider_error", status: 503 };
  }
  return { code: "internal", status: 500 };
}
