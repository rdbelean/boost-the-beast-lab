import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { generatePDF, type PdfReportContent } from "@/lib/pdf/generateReport";
import { sendReportEmail } from "@/lib/email/sendReport";
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

const PROMPT_VERSION = "btb_report_v3.0.0";
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
  "disclaimer": "Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz für medizinische Diagnostik. VO2max ist eine algorithmische Schätzung — keine Labormessung."
}`;

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
const SLEEP_QUALITY_LABEL: Record<string, string> = {
  sehr_gut: "sehr gut",
  gut: "gut",
  mittel: "mittel",
  schlecht: "schlecht",
};

const WAKEUP_LABEL: Record<string, string> = {
  nie: "nie",
  selten: "selten",
  oft: "oft",
  immer: "fast jede Nacht",
};

const FRUIT_VEG_LABEL: Record<string, string> = {
  none: "eher selten bis kaum (0–7 Mahlzeiten/Woche)",
  low: "ca. Hälfte der Mahlzeiten (8–11/Woche)",
  moderate: "meisten Mahlzeiten (12–17/Woche)",
  optimal: "fast jeder Mahlzeit (18–21/Woche)",
};

export interface PremiumPromptContext {
  reportType: string;
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
}

function trainingIntensityLabel(result: FullScoringResult): string {
  const ratio = result.recovery.stress_multiplier; // unused — real label derived below
  void ratio;
  const totalMet = result.activity.total_met_minutes_week;
  if (totalMet === 0) return "keine";
  const vigFraction = result.activity.vigorous_met / totalMet;
  if (vigFraction > 0.5) return "überwiegend intensiv";
  if (vigFraction > 0.25) return "gemischt (moderat + intensiv)";
  return "überwiegend moderat";
}

function buildPremiumUserPrompt(ctx: PremiumPromptContext): string {
  const r = ctx.result;
  const interp = r.interpretation;
  const warnings = r.systemic_warnings;

  const activeWarnings = interp.warnings.length
    ? interp.warnings.map((w) => `  • [${w.code}] ${w.text}`).join("\n")
    : "  (keine aktiven systemischen Warnungen)";

  return `Erstelle einen ausführlichen, persönlichen Performance Report für dieses Profil. Nutze alle Daten präzise. Mache den Report so spezifisch wie möglich — jeder Satz soll sich auf genau diese Person beziehen, nicht auf ein Template.

REGELN:
- Paraphrasiere die vorformulierten Interpretationen. Erfinde nichts.
- Jeder Befund muss mindestens eine konkrete Zahl aus dem Input enthalten.
- Aktive systemische Warnungen MÜSSEN prominent adressiert werden.
- Pro Modul mindestens 15–20 Sätze insgesamt. Executive Summary + Top Priority besonders ausführlich.

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

Erstelle jetzt den vollständigen, ausführlichen Report im geforderten JSON-Format. Jedes Modul mindestens 15–20 Sätze insgesamt. Mache ihn persönlich, präzise und wissenschaftlich fundiert.`;
}

// ── Offline Demo Mode ─────────────────────────────────────────────────────

interface DemoContext {
  reportType: string;
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
}

function demoBand(score: number): string {
  if (score < 40) return "low";
  if (score < 65) return "moderate";
  if (score < 85) return "high";
  return "very_high";
}

async function handleDemoReport(req: NextRequest, ctx: DemoContext): Promise<NextResponse> {
  const r = ctx.result;

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
      age: ctx.user.age,
      gender: ctx.user.gender,
      result: r,
      sleep_duration_hours: ctx.sleepDurationHours,
      sleep_quality_label: ctx.sleep_quality_label ?? "nicht angegeben",
      wakeup_frequency_label: ctx.wakeup_frequency_label ?? "nicht angegeben",
      morning_recovery_1_10: ctx.morning_recovery_1_10 ?? 5,
      stress_level_1_10: ctx.stress_level_1_10 ?? 5,
      meals_per_day: ctx.meals_per_day ?? 3,
      water_litres: ctx.water_litres ?? 2,
      fruit_veg_label: ctx.fruit_veg_label ?? "nicht angegeben",
      standing_hours_per_day: ctx.standing_hours_per_day ?? 3,
      sitting_hours_per_day: ctx.sitting_hours_per_day ?? r.metabolic.sitting_hours,
      training_days: ctx.training_days ?? 0,
      training_intensity_label: trainingIntensityLabel(r),
      daily_steps: ctx.daily_steps ?? 0,
    });
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      // Sonnet 4.6 is ~2-3× faster than Opus for this structured paraphrase
      // task and keeps the total latency under the Vercel timeout.
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      system: SYSTEM_PROMPT,
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
      .select("id, report_type, user_id")
      .eq("id", assessmentId)
      .single();
    if (aErr) throw aErr;

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
      age: reconstructed.age,
      gender: reconstructed.gender,
      result,
      sleep_duration_hours: sleepDuration,
      sleep_quality_label:
        SLEEP_QUALITY_LABEL[reconstructed.sleep.quality] ?? "mittel",
      wakeup_frequency_label:
        WAKEUP_LABEL[reconstructed.sleep.wakeups] ?? "selten",
      morning_recovery_1_10: reconstructed.sleep.recovery_1_10,
      stress_level_1_10: reconstructed.stress.stress_level_1_10,
      meals_per_day: reconstructed.metabolic.meals_per_day,
      water_litres: reconstructed.metabolic.water_litres,
      fruit_veg_label:
        FRUIT_VEG_LABEL[reconstructed.metabolic.fruit_veg] ?? "moderat",
      standing_hours_per_day: standingHours,
      sitting_hours_per_day: reconstructed.metabolic.sitting_hours,
      training_days: trainingDays,
      training_intensity_label: trainingIntensityLabel(result),
      daily_steps: num("schrittzahl", 0),
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
        system: SYSTEM_PROMPT,
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

        const { data: signed, error: signErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 30);

        if (signErr) throw signErr;
        downloadUrl = signed.signedUrl;
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
        });
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
