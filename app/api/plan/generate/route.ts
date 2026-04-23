import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

type PlanType = "activity" | "metabolic" | "recovery" | "stress";
interface PlanBlock { heading: string; items: string[] }
interface PlanContent { title: string; subtitle: string; source: string; blocks: PlanBlock[] }

function hasValidKey(key: string | undefined): boolean {
  if (!key || key.length < 20) return false;
  if (key.includes("your_") || key.includes("dein-")) return false;
  return true;
}

type PlanMeta = Record<PlanType, { title: string; subtitle: string; source: string }>;

const PLAN_META_DE: PlanMeta = {
  activity: {
    title: "ACTIVITY-PLAN",
    subtitle: "Individueller Plan zur Verbesserung deiner Aktivit\u00E4tswerte",
    source: "Basiert auf: WHO Global Action Plan 2018\u20132030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022, AMA Longevity Study 2024",
  },
  metabolic: {
    title: "METABOLIC-PLAN",
    subtitle: "Individueller Plan zur Optimierung deiner metabolischen Performance",
    source: "Basiert auf: WHO BMI-Klassifikation, EFSA N\u00E4hrwertempfehlungen, ISSN Position Stand, JAMA Network Open Meal Timing 2024, Covassin et al. RCT 2022",
  },
  recovery: {
    title: "RECOVERY-PLAN",
    subtitle: "Individueller Plan zur Verbesserung deiner Regeneration",
    source: "Basiert auf: NSF/AASM Sleep Guidelines, PSQI-Skala, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025, PMC OTS Review 2025",
  },
  stress: {
    title: "STRESS & LIFESTYLE-PLAN",
    subtitle: "Individueller Plan zur Optimierung von Stress und Lifestyle",
    source: "Basiert auf: WHO Mental Health Guidelines, Psychoneuroendocrinology Meta-Analysis 2024, MBSR (Kabat-Zinn), Frontiers Sedentary & CVD 2022",
  },
};

const PLAN_META_EN: PlanMeta = {
  activity: {
    title: "ACTIVITY PLAN",
    subtitle: "Individual plan to improve your activity metrics",
    source: "Based on: WHO Global Action Plan 2018\u20132030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022, AMA Longevity Study 2024",
  },
  metabolic: {
    title: "METABOLIC PLAN",
    subtitle: "Individual plan to optimise your metabolic performance",
    source: "Based on: WHO BMI Classification, EFSA Nutrition Recommendations, ISSN Position Stand, JAMA Network Open Meal Timing 2024, Covassin et al. RCT 2022",
  },
  recovery: {
    title: "RECOVERY PLAN",
    subtitle: "Individual plan to improve your recovery",
    source: "Based on: NSF/AASM Sleep Guidelines, PSQI Scale, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025, PMC OTS Review 2025",
  },
  stress: {
    title: "STRESS & LIFESTYLE PLAN",
    subtitle: "Individual plan to optimise stress and lifestyle",
    source: "Based on: WHO Mental Health Guidelines, Psychoneuroendocrinology Meta-Analysis 2024, MBSR (Kabat-Zinn), Frontiers Sedentary & CVD 2022",
  },
};

const PLAN_META_IT: PlanMeta = {
  activity: {
    title: "PIANO ATTIVIT\u00C0",
    subtitle: "Piano individuale per migliorare i tuoi valori di attivit\u00E0",
    source: "Basato su: WHO Global Action Plan 2018\u20132030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022",
  },
  metabolic: {
    title: "PIANO METABOLICO",
    subtitle: "Piano individuale per ottimizzare la tua performance metabolica",
    source: "Basato su: Classificazione BMI WHO, Raccomandazioni nutrizionali EFSA, ISSN Position Stand, JAMA Network Open 2024",
  },
  recovery: {
    title: "PIANO RECOVERY",
    subtitle: "Piano individuale per migliorare la tua rigenerazione",
    source: "Basato su: NSF/AASM Sleep Guidelines, Scala PSQI, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025",
  },
  stress: {
    title: "PIANO STRESS & LIFESTYLE",
    subtitle: "Piano individuale per ottimizzare stress e stile di vita",
    source: "Basato su: WHO Mental Health Guidelines, Meta-Analysis Psychoneuroendocrinology 2024, MBSR (Kabat-Zinn)",
  },
};

const PLAN_META_TR: PlanMeta = {
  activity: {
    title: "AKTİVİTE PLANI",
    subtitle: "Aktivite değerlerini geliştirmek için bireysel plan",
    source: "Kaynak: WHO Küresel Eylem Planı 2018–2030, ACSM Egzersiz Yönergeleri, IPAQ Kısa Form",
  },
  metabolic: {
    title: "METABOLİK PLAN",
    subtitle: "Metabolik performansını optimize etmek için bireysel plan",
    source: "Kaynak: WHO BMI Sınıflandırması, EFSA Beslenme Önerileri, ISSN Pozisyon Bildirisi, JAMA Network Open 2024",
  },
  recovery: {
    title: "İYİLEŞME PLANI",
    subtitle: "Yenilenme kapasiteni geliştirmek için bireysel plan",
    source: "Kaynak: NSF/AASM Uyku Yönergeleri, PSQI Ölçeği, ACSM İyileşme Protokolleri, Kaczmarek et al. MDPI 2025",
  },
  stress: {
    title: "STRES & YAŞAMBİÇİMİ PLANI",
    subtitle: "Stres ve yaşam biçimini optimize etmek için bireysel plan",
    source: "Kaynak: WHO Ruh Sağlığı Yönergeleri, Psychoneuroendocrinology Meta-Analizi 2024, MBSR (Kabat-Zinn)",
  },
};

function getPlanMeta(locale: string): PlanMeta {
  if (locale === "en") return PLAN_META_EN;
  if (locale === "it") return PLAN_META_IT;
  if (locale === "tr") return PLAN_META_TR;
  return PLAN_META_DE;
}

const SYSTEM_PROMPT = `Du bist das Plan-Generierungs-System von BOOST THE BEAST LAB — ein präzises wissenschaftliches Performance-Tool.

Deine Nutzer sind ambitionierte Athleten (25–40) und High-Performer (30–50). Sie wollen keine Wellness-Ratschläge. Sie wollen exakte, evidenzbasierte Protokolle — abgeleitet aus ihren persönlichen Daten.

ABSOLUTE GRENZEN:
- Keine medizinischen Diagnosen oder Heilversprechen
- Ausschließlich die im Input übermittelten Zahlen und Scores verwenden — keine erfundenen Werte
- Keine Studien erfinden oder falsch attributieren
- VO2max immer als algorithmische Schätzung kommunizieren
- BMI als Populationsschätzer kommunizieren, nicht als individuelles Urteil
- Alle Aussagen als Performance-Insight formulieren, nie als Befund

WISSENSCHAFTLICHE BASIS (darfst du nutzen und explizit referenzieren):
- WHO Physical Activity Guidelines 2020/2024: 150–300 Min moderate Aktivität/Woche, ≥2× Krafttraining
- IPAQ MET-Kategorisierung: Walking 3.3 MET · Moderate 4.0 MET · Vigorous 8.0 MET
- AHA Circulation 2022 (100.000 TN, 30 Jahre): 150–300 Min/Woche moderate Aktivität = 20–21% niedrigeres Mortalitätsrisiko
- AMA Longevity 2024: 150–299 Min/Woche intensive Aktivität = 21–23% niedrigere Gesamtmortalität, 27–33% niedrigere CVD-Mortalität
- NSF/AASM Schlafempfehlungen: 7–9h für 18–64-Jährige, 7–8h für 65+
- Covassin et al. RCT 2022: Schlafmangel → signifikant mehr viszerales Bauchfett (unabhängig von Ernährung)
- Kaczmarek et al. MDPI 2025: Schlafmangel → Cortisol↑, Testosteron↓, GH↓ → Muskelregeneration limitiert
- Sondrup et al. Sleep Medicine Reviews 2022: Schlafmangel → signifikant erhöhte Insulinresistenz
- JAMA Network Open Meal Timing 2024 (29 RCTs): frühes Essen + zeitlich eingeschränktes Essen → größerer Gewichtsverlust
- ISSN Position Stand: Proteinzufuhr 1,6–2,2 g/kg KG/Tag für aktive Personen zur Muskelmasse-Optimierung
- Psychoneuroendocrinology Meta-Analysis 2024: Mindfulness (g=0.345) und Entspannung (g=0.347) am effektivsten zur Cortisol-Senkung
- PMC Chronic Stress & Cognition 2024: chronische Glucocorticoid-Ausschüttung → HPA-Dysregulation
- Frontiers Sedentary & CVD 2022: >6h Sitzen/Tag → erhöhtes Risiko für 12 chronische Erkrankungen — unabhängig vom Trainingspensum
- AHA Science Advisory: Sitzzeit erhöht Metabolisches-Syndrom-Odds um Faktor 1.73 nach MVPA-Adjustierung
- PMC OTS Review 2025 & ScienceDirect OTS Molecular 2025: unzureichende Recovery → Kraftverluste bis 14%
- ACSM Position Stand: Deload-Wochen alle 4–6 Wochen, Volumenreduktion 40–50%

TON-REGELN:
- Direkt, klar, wie ein Elite-Coach — nicht wie ein Wellness-Blog
- Das WARUM hinter jeder Empfehlung mit echter wissenschaftlicher Begründung
- VERBOTENE FLOSKELN: "es ist wichtig, dass", "du solltest versuchen", "achte darauf", "vergiss nicht", "denk daran"
- Stattdessen: direkte Aussagen. Statt "Es ist wichtig, genug zu schlafen" → "Dein Recovery-Deckel liegt bei einem Sleep-Score unter 65 — jedes weitere Training läuft gegen diese Grenze."
- Nutze die echten Zahlen aus dem Input: MET-Minuten, BMI, VO2max-Schätzung, Score-Werte, Bänder

FORMAT: Valid JSON only. No markdown backticks. Start directly with {

STRUCTURE — exactly 6 blocks with 5–8 items each:
{
  "blocks": [
    { "heading": "[BLOCK_1_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "[BLOCK_6_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] }
  ]
}

Block 1 [BLOCK_1_HEADING]: All relevant scores with context, comparison to reference values, what the numbers mean concretely.
Blocks 2–5: Concrete, evidence-based protocols and measures specific to the plan type. Each item is a complete sentence with reasoning and concrete numbers.
Block 6 [BLOCK_6_HEADING]: How to measure progress, over what timeframe, which indicators, when a new analysis makes sense.`;

// ── Fallback (no API key) ────────────────────────────────────────────────────

type ScoreInput = {
  activity: { activity_score_0_100: number; activity_category: string; total_met_minutes_week: number };
  sleep: { sleep_score_0_100: number; sleep_duration_band: string; sleep_band: string };
  metabolic: { metabolic_score_0_100: number; bmi: number; bmi_category: string; metabolic_band: string };
  stress: { stress_score_0_100: number; stress_band: string };
  vo2max: { fitness_score_0_100: number; vo2max_estimated: number; vo2max_band: string };
  overall_score_0_100: number;
  overall_band: string;
};

// Personalisierungs-Profil — treibt die Adaptivität der Fallback-Blöcke und
// wird dem Claude-Prompt als zusätzlicher Context übergeben. Alle Felder
// optional — der Plan fällt auf konservative Defaults zurück wenn sie fehlen.
interface PlanPersonalization {
  main_goal?: "feel_better" | "body_comp" | "performance" | "stress_sleep" | "longevity" | null;
  time_budget?: "minimal" | "moderate" | "committed" | "athlete" | null;
  experience_level?: "beginner" | "restart" | "intermediate" | "advanced" | null;
  training_days?: number | null; // current actual training frequency
  /** Phase-2-Tiefe — erlaubt dem Plan, gezielte Ernährungs-Habit zu empfehlen
   *  (z.B. 30 g Protein beim Abendessen bei cravings_evening) statt generisch
   *  "iss mehr Gemüse". */
  nutrition_painpoint?: "cravings_evening" | "low_protein" | "no_energy" | "no_time" | "none" | null;
  stress_source?: "job" | "family" | "finances" | "health" | "future" | "none" | null;
  recovery_ritual?: "sport" | "nature" | "cooking" | "reading" | "meditation" | "social" | "none" | null;
}

// Kalibrierungsregel: Welche Trainings-Intensitäts-Stufe passt zum Profil?
// Score allein reicht nicht — wer 0x/Woche trainiert und "minimal" Zeit
// hat, kriegt NIE 5x/Woche egal wie gut der Score ist.
function calibrateIntensity(score: number, p: PlanPersonalization): "minimal" | "starter" | "build" | "performance" {
  const tb = p.time_budget ?? "moderate";
  const exp = p.experience_level ?? "intermediate";
  const curDays = p.training_days ?? 0;
  const goal = p.main_goal ?? "feel_better";

  // Hard override: minimal time budget OR zero current training + beginner
  if (tb === "minimal") return "minimal";
  if (curDays === 0 && (exp === "beginner" || exp === "restart")) return "minimal";
  // Beginner/restart never gets performance tier
  if (exp === "beginner" || exp === "restart") return score < 65 ? "starter" : "build";
  // Goal not performance + moderate time → stay at build
  if (goal !== "performance" && tb === "moderate") return "build";
  // Committed + intermediate/advanced + low score → starter or build
  if (tb === "committed") return score < 40 ? "starter" : score < 65 ? "build" : "performance";
  // Athlete tier + performance goal
  if (tb === "athlete" && goal === "performance") return "performance";
  // Default: score-based
  return score < 40 ? "starter" : score < 65 ? "build" : "performance";
}

function buildFallbackBlocks(type: PlanType, s: ScoreInput, p: PlanPersonalization = {}): PlanBlock[] {
  if (type === "activity") {
    const score = s.activity.activity_score_0_100;
    const met = s.activity.total_met_minutes_week;
    const gap = Math.max(0, 600 - met);
    const tier = calibrateIntensity(score, p);
    // Adaptive Intensitäts-Empfehlung — NIE mehr 5x/Woche als Default.
    const intensity =
      tier === "minimal"
        ? "Micro-Plan: 3×/Woche 10–15 Min (Treppen, zügiges Gehen, Alltagsbewegung) — Volumen nach 2 Wochen erhöhen"
        : tier === "starter"
        ? "Einstieg: 2–3×/Woche 20–30 Min moderate Aktivität (3,3 MET), progressive Steigerung über 4 Wochen"
        : tier === "build"
        ? "Aufbau: 3×/Woche Mischtraining Kraft + Ausdauer, progressive Steigerung — Adhärenz vor Volumen"
        : "Performance: 4–5×/Woche strukturiertes Training mit Periodisierung";
    return [
      { heading: "Deine Ausgangslage", items: [`Activity Score: ${score}/100 — IPAQ-Kategorie: ${s.activity.activity_category}`, `MET-Minuten/Woche: ${met} (WHO-Mindest-Ziel: ≥600 MET-min/Woche)`, gap > 0 ? `Lücke zum WHO-Minimum: ${gap} MET-min/Woche — entspricht ~${Math.round(gap / 4)} Min moderater Aktivität` : "WHO-Mindestempfehlung bereits erfüllt — Optimierungspotenzial liegt in Intensität und Struktur", `VO2max (geschätzt): ${s.vo2max.vo2max_estimated} ml/kg/min — direkt abhängig von deinem Aktivitätsniveau`, `Recovery-Kapazität (Sleep Score: ${s.sleep.sleep_score_0_100}/100) begrenzt Trainingsanpassung bei unzureichendem Schlaf`] },
      { heading: "Wochenziel nach WHO/ACSM-Standard", items: ["≥150 Min moderate ODER ≥75 Min intensive Aktivität pro Woche — AHA 2022: 20–21% niedrigeres Mortalitätsrisiko bei diesem Volumen", "≥2× Krafttraining pro Woche (alle Hauptmuskelgruppen) für Muskelerhalt und Grundumsatzstabilisierung", "Sitzzeit auf max. 8 h/Tag begrenzen — Frontiers 2022: >6h Sitzen erhöht CVD-Risiko unabhängig vom Sport", intensity, "Progressive Überladung: alle 4 Wochen Trainingsvolumen um 5–10% steigern (ACSM Position Stand)"] },
      { heading: "Wochenplan (adaptiert an dein Zeitbudget)", items:
        tier === "minimal"
          ? [
              "Mo/Mi/Fr: je 10–15 Min — Treppen statt Lift, zügiger Spaziergang in der Mittagspause, 7-Min-Bodyweight-Zirkel",
              "Di/Do: Aktive Mikro-Pausen — alle 60 Min Sitzen: 5 Min Bewegung (Stretching, Gehen, Kniebeugen)",
              "Sa: 20–30 Min Aktivität deiner Wahl — Wandern, Schwimmen, Radfahren — ohne Pulsziel",
              "So: Vollständige Erholung — leichte Bewegung optional",
              "Prinzip: Häufigkeit > Dauer. 5× 15 Min schlägt 1× 60 Min für Adhärenz und metabolische Anpassung.",
            ]
          : tier === "starter"
          ? [
              "Mo: 20–30 Min Ausdauer (zügiges Gehen/leichtes Joggen) — moderate Intensität (65–75% HFmax)",
              "Mi: 20–30 Min Bodyweight-Krafttraining (Ganzkörper: Squats, Push-ups, Bridge, Plank)",
              "Fr: 20–30 Min Ausdauer + 5 Min Stretching",
              "Di/Do/Sa/So: Alltagsbewegung (Spaziergänge, Treppen, aktive Haushalts-Aufgaben)",
              "Woche 1–2: Volumen konstant halten. Ab Woche 3 um 10 % steigern. Adhärenz vor Leistung.",
            ]
          : tier === "build"
          ? [
              "Mo: 30–45 Min Ausdauer (Laufen/Rad) — moderate Intensität (65–75% HFmax)",
              "Mi: 30–40 Min Krafttraining Ganzkörper",
              "Fr: 30 Min Ausdauer + leichte Intervalle (2–3× 3 Min bei 80% HFmax)",
              "Di/Do/Sa: Aktive Erholung (20 Min Gehen oder Yoga)",
              "So: Vollständige Erholung",
              "Deload alle 4 Wochen: Volumen um 40% reduzieren.",
            ]
          : [
              "Mo: 30–45 Min Ausdauer (Laufen/Rad) — moderate Intensität (65–75% HFmax)",
              "Di: 30–40 Min Krafttraining Ganzkörper",
              "Mi: Aktive Erholung — 20–30 Min Gehen oder Mobilität/Yoga",
              "Do: 30–45 Min Ausdauer-Intervalle (4×4 Min bei 85–90% HFmax) für VO2max-Stimulus",
              "Fr: 30–40 Min Krafttraining — Fokus Beine + Rumpf",
              "Sa: 45–60 Min Sport nach Wahl",
              "So: Vollständige Erholung — Spaziergang optional",
            ],
      },
      { heading: "Intensitätssteuerung & MET-Kalkulation", items: ["Moderate Aktivität: 3–6 MET (zügiges Gehen 3.3 · Radfahren 4.0 · Schwimmen 5.8)", "Intensive Aktivität: >6 MET (Laufen 8.0 · Seilspringen 10.0 · HIIT 8–12 MET)", "80/20-Prinzip: 80% der Trainingszeit bei moderater Intensität, 20% bei hoher — optimale Adaption ohne Übertraining", "MET-Minuten berechnen: Dauer (Min) × MET-Wert — Ziel: ≥600/Woche als Basis, ≥1500 für Performance-Niveau"] },
      { heading: "Sitzzeit & Alltagsaktivität", items: ["Nach spätestens 45–60 Min Sitzen: 5 Min Bewegungspause — Treppensteigen, kurze Gehstrecke", "Stehpult oder dynamisches Sitzen reduziert metabolisches Risiko messbar (AHA Science Advisory)", "Tägliche Schritte: ≥8.000 als Baseline für Grundaktivität, ≥10.000 für optimale kardiovaskuläre Gesundheit", "Aktive Pendelwege (Gehen, Radfahren) zählen vollständig zur wöchentlichen Aktivität"] },
      { heading: "Monitoring & Fortschritt", items: ["MET-Minuten pro Woche wöchentlich tracken — einfachster Fortschrittsindikator", "Ruheherzrate morgens messen: sinkt bei konsistenter Ausdauerbelastung in 4–8 Wochen", "Alle 4 Wochen: Trainingsvolumen +5–10% steigern, dann 1 Deload-Woche (ACSM)", "Alle 8 Wochen: Neue Analyse für objektive Score-Entwicklung", "Overtraining-Signal: anhaltende Müdigkeit, Ruheherzrate +5–10% über Baseline, Motivationsverlust → Deload einleiten"] },
    ];
  }

  if (type === "metabolic") {
    const score = s.metabolic.metabolic_score_0_100;
    const bmi = s.metabolic.bmi;
    const cat = s.metabolic.bmi_category;
    // Painpoint-spezifischer Block — basiert auf User-Selbstaussage in Q21
    const painpointBlock = (() => {
      const np = p.nutrition_painpoint;
      if (!np || np === "none") return null;
      if (np === "cravings_evening") {
        return { heading: "Dein spezifischer Hebel: Heißhunger-Kontrolle", items: [
          "30 g Protein beim Abendessen als Priorität — stabilisiert Blutzucker über die Nacht, reduziert Cravings nachweisbar",
          "2 h vor dem Schlafengehen keine schnellen Kohlenhydrate (Süßes, Weißbrot) — Blutzucker-Spike → Crash → nächtliches Erwachen",
          "Wenn Heißhunger kommt: 300 ml Wasser + 10 Min warten — 60% der Cravings sind Durst oder Langeweile, nicht echter Hunger",
          "Evening-Routine: feste Essens-Cutoff-Zeit (z.B. 20:30) — Ritual > Willenskraft. Zähneputzen direkt danach als Cue.",
          "Tracking: Heißhunger-Episoden für 2 Wochen notieren (Uhrzeit + Trigger) — Muster erkennen ist 50% der Lösung",
        ] };
      }
      if (np === "low_protein") {
        return { heading: "Dein spezifischer Hebel: Protein-Target erreichen", items: [
          `Ziel: 1,6–2,2 g Protein pro kg KG/Tag — bei ${s.metabolic.bmi * 25} kg (Schätzung) sind das ${Math.round(s.metabolic.bmi * 25 * 1.8)} g/Tag`,
          "Auf 3 Mahlzeiten verteilt: ~40 g pro Mahlzeit — entspricht z.B. 150 g Hähnchen, 200 g Quark, 2 Eier + 100 g Hüttenkäse",
          "Praktische Protein-Quellen (>20 g/Portion): Hühnchen, Lachs, Mager-Quark, griechischer Joghurt, Hüttenkäse, Linsen, Tofu",
          "Protein-Shake als Fallback: 30 g Whey/Casein in Wasser — 3 Min Prep-Zeit, volle Kontrolle",
          "Meal-Prep-Sonntag: 1 kg Protein vorkochen (Hühnchen/Lachs/Tofu) — deckt 3–4 Mahlzeiten ab",
        ] };
      }
      if (np === "no_energy") {
        return { heading: "Dein spezifischer Hebel: Energie-Stabilisierung", items: [
          "Frühstück innerhalb 60 Min nach Aufstehen — bricht Nüchtern-Cortisol, stabilisiert Blutzucker-Kurve für den Tag",
          "Frühstück muss Protein + komplexe Kohlenhydrate kombinieren (z.B. Haferflocken + Quark + Beeren) — KEIN reiner Zucker",
          "Koffein-Cutoff 14:00 — Halbwertszeit 5–6 h, abendlich-aktives Koffein fragmentiert Tiefschlaf → nächster Tag müde",
          "Wenn Mittagstief: 10 Min Spaziergang statt 3. Kaffee — Durchblutung + Tageslicht sind messbar effektiver",
          "Keine Snacks >2 h vor der nächsten Mahlzeit — erneute Blutzucker-Spikes zerstören Sättigungs-Signal",
        ] };
      }
      if (np === "no_time") {
        return { heading: "Dein spezifischer Hebel: Zeit-Friction reduzieren", items: [
          "Sonntag-Prep: 30 Min reserviert — 1 kg Protein vorkochen, 3 Gemüse-Portionen schneiden, 2 Dressings mixen",
          "Standard-Frühstück festlegen (z.B. Quark + Beeren + Nüsse + Haferflocken) — keine Entscheidungs-Fatigue morgens",
          "Mittags: Reste vom Vortag + Gemüse = 5 Min Assembly, 0 Kochen. Essen in Tupper = transportabel.",
          "Abends: 1 One-Pot-Rezept pro Woche rotieren — 20 Min Gesamt-Kochzeit, 2–3 Portionen auf einmal",
          "Einkaufsliste fix → gleiche Zutaten jede Woche → weniger Entscheidungen → weniger Aufgeben",
        ] };
      }
      return null;
    })();
    const out: PlanBlock[] = [
      { heading: "Deine Ausgangslage", items: [`Metabolic Score: ${score}/100 (${s.metabolic.metabolic_band})`, `BMI: ${bmi} kg/m² — WHO-Kategorie: ${cat} (Normalbereich: 18,5–24,9 kg/m²)`, `Activity Score: ${s.activity.activity_score_0_100}/100 — MET-Minuten/Woche: ${s.activity.total_met_minutes_week}`, `Sleep Score: ${s.sleep.sleep_score_0_100}/100 — Covassin RCT 2022: Schlafmangel erhöht viszerales Bauchfett unabhängig von der Ernährung`, `Stress Score: ${s.stress.stress_score_0_100}/100 — chronischer Stress senkt Insulinsensitivität und erhöht Cortisol-getriebene Fetteinlagerung`] },
    ];
    if (painpointBlock) out.push(painpointBlock);
    out.push(
      { heading: "Ernährungs-Protokoll (ISSN/EFSA-Standard)", items: ["3 Hauptmahlzeiten + 1–2 Snacks — gleichmäßige Energieverteilung stabilisiert Blutzucker und vermeidet Heißhunger", "Protein: 1,6–2,2 g/kg KG/Tag (ISSN Position Stand) — für aktive Personen zur Muskelmasseerhaltung essenziell", "Kohlenhydrate: komplex und ballaststoffreich — Vollkorn, Hülsenfrüchte, Gemüse vor verarbeiteten Produkten priorisieren", "Gesättigte Fette: <10% der Gesamtenergie (WHO) — ungesättigte Fettsäuren (Oliven, Nüsse, Avocado) bevorzugen", "Gemüse & Obst: ≥400g/Tag (WHO-Mindestempfehlung) — am einfachsten: ≥2 Portionen Gemüse pro Hauptmahlzeit", "JAMA 2024: frühes Essen (Kalorienaufnahme bis 15:00 Uhr betont) → nachweislich bessere Gewichtskontrolle in 29 RCTs"] },
      { heading: "Hydrations-Protokoll", items: ["Grundbedarf: 30–35 ml × Körpergewicht (kg) pro Tag — bei 80 kg entspricht das 2,4–2,8 l", "Sport-Ergänzung: +500–750 ml pro Trainingsstunde — bei Schwitzen höherer Bedarf", "Morgens: 300–500 ml Wasser direkt nach dem Aufstehen — reaktiviert Stoffwechsel nach Nüchtern-Phase", "Timing: Wasser vor dem Essen trinken — reduziert Kalorienaufnahme und unterstützt Sättigung", "Zuckerhaltige Getränke vollständig durch Wasser, Mineralwasser oder ungesüßten Tee ersetzen"] },
      { heading: "Sitzzeit-Management & Alltagsaktivität", items: ["Frontiers 2022: >6h Sitzen/Tag erhöht Risiko für 12 chronische Erkrankungen — auch bei regelmäßigem Training", "AHA Science Advisory: Sitzzeit erhöht Metabolisches-Syndrom-Odds um Faktor 1.73 nach Sport-Adjustierung", "Bewegungspause alle 45–60 Min: 5 Min Stehen, Gehen, Treppensteigen — unterbricht metabolische Stagnation", "Aktive Mittagspause (15–20 Min Gehen) zählt als moderate Aktivität und senkt Blutzuckerspitzen nach dem Essen"] },
      { heading: "Schlaf & Stress als metabolische Hebel", items: [`Dein Sleep Score ${s.sleep.sleep_score_0_100}/100: Schlafmangel erhöht Ghrelin (Hungersignal) und senkt Leptin (Sättigungshormon) messbar`, "Kaczmarek 2025: Schlafmangel → Cortisol↑ → erhöhte Gluconeogenese → Blutzucker destabilisiert", `Stress Score ${s.stress.stress_score_0_100}/100: chronischer Stress → Insulin-Sensitivität↓ → Fetteinlagerung bevorzugt im viszeralen Bereich`, "Sondrup 2022: Schlafmangel → signifikant erhöhte Insulinresistenz — metabolische Medikamente können das nicht kompensieren"] },
      { heading: "Monitoring & Fortschritt", items: ["Mahlzeiten für 14 Tage tracken (App) — Ziel: Muster, nicht Kalorien-Obsession", "Körpergewicht 1×/Woche morgens nüchtern — gleiche Uhrzeit, gleiche Bedingungen", "Nachhaltiges Tempo: max. 0,5–1,0 kg/Woche Gewichtsveränderung (WHO-Empfehlung für langfristigen Erfolg)", "Taillenumfang alle 4 Wochen messen — besserer Indikator für viszerales Fett als Körpergewicht allein", "Alle 8 Wochen: Neue Analyse für objektive Score-Entwicklung"] },
    );
    return out;
  }

  if (type === "recovery") {
    const score = s.sleep.sleep_score_0_100;
    const band = s.sleep.sleep_duration_band;
    return [
      { heading: "Deine Ausgangslage", items: [`Sleep & Recovery Score: ${score}/100 (${s.sleep.sleep_band})`, `Schlafdauer-Band: ${band} — NSF/AASM-Empfehlung: 7–9h für 18–64-Jährige`, `Activity Score: ${s.activity.activity_score_0_100}/100 (${s.activity.total_met_minutes_week} MET-min/Woche) — Trainingslast erfordert proportionale Recovery-Kapazität`, `Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band}) — Stress ist direkte Bremse für Schlaftiefe und -dauer`, "PMC OTS Review 2025: unzureichende Recovery → Kraftverluste bis 14%, erhöhte Verletzungsanfälligkeit — kein Trainingsplan kompensiert das"] },
      { heading: "Schlaf-Hygiene-Protokoll (NSF-Standard)", items: ["Feste Bett- und Aufwachzeit — auch am Wochenende max. ±30 Min Abweichung: stabilisiert den zirkadianen Rhythmus", "Schlafzimmer-Temperatur: 16–18°C — Körperkerntemperatur muss für Schlafbeginn sinken", "Vollständige Dunkelheit (Blackout-Vorhänge oder Schlafmaske): selbst minimales Licht supprimiert Melatonin", "Bildschirme (Blaulicht): ≥60 Min vor dem Schlafen abschalten oder physischen Blaulichtfilter verwenden", "Letzte Mahlzeit: ≥2h vor dem Schlafen — Verdauungsarbeit erhöht Körpertemperatur und hemmt Einschlafen", "Koffein: keine Aufnahme nach 14:00 Uhr — Halbwertszeit 5–6h, vollständiger Abbau erst nach 10–12h"] },
      { heading: "Trainings-Recovery-Protokoll (ACSM)", items: ["≥48h Regenerationszeit für gleiche Muskelgruppe zwischen intensiven Einheiten — Grundregel der Superkompensation", "Aktive Erholung an Ruhetagen: 20–30 Min leichtes Cardio (50–60% HFmax) fördert Laktat-Clearance ohne neue Belastung", "Kälteanwendung (10–15°C, 10–15 Min): meta-analytisch nachgewiesen entzündungshemmend und Muskelkater-reduzierend", "Kaczmarek 2025: jede Stunde zusätzlicher Schlaf → Testosteron↑, Cortisol↓, GH↑ — direkter Muskelaufbau-Hebel", "Alkohol nach Training: auch moderate Mengen reduzieren GH-Ausschüttung in der Nacht messbar — Recovery-Qualität sinkt"] },
      { heading: "Übertraining erkennen & verhindern", items: ["Frühwarnsignal Nr. 1: Ruheherzrate 5–10+ Schläge über deiner Baseline — messe täglich morgens", "Frühwarnsignal Nr. 2: anhaltende Müdigkeit nach normalem Schlaf — zelluläre Regeneration hält nicht mit", "PMC OTS 2025: funktionales Overreaching = kurzfristig gewollt; nicht-funktionales Overreaching = Kraft- und Performanceverlust über Wochen", "ACSM: Deload-Woche alle 4–6 Trainingswochen — Volumen auf 40–50% reduzieren, Intensität beibehalten", "Nach Krankheit, Reise oder Schlafentzug: Trainingsvolumen für 3–5 Tage um 30–40% reduzieren"] },
      { heading: "Regenerations-Tools im Vergleich", items: ["Schlaf (7–9h): stärkste Intervention — kein Tool ersetzt sie (GH, Testosteron, Immunsystem)", "Kältebad (10°C, 10–15 Min): reduziert DOMS, senkt Entzündungsmarker, fördert Durchblutung beim Aufwärmen", "Sauna (80–90°C, 15–20 Min): fördert Wachstumshormon, Hitzeprotein-Synthese, kardiovaskuläre Adaption", "Foam Rolling / Myofasziale Release: 10–15 Min nach Training, reduziert subjektiven Muskelkater messbar", "Aktives Gehen (Spaziergang 20–30 Min): Lymphfluss, Durchblutung, mentale Erholung ohne Trainingsreiz"] },
      { heading: "Monitoring & Fortschritt", items: ["Subjektive Erholungsqualität täglich 1–10 bewerten — Muster über 2 Wochen zeigen Trends", "Ruheherzrate morgens (vor dem Aufstehen) — sinkt bei guter Recovery und steigt bei Überbelastung", "Schlafdauer in Fitness-App tracken — Ziel: ≥7h Netto-Schlaf pro Nacht als festes Minimum", "Alle 4 Wochen: Trainingsbelastung vs. Recovery-Kapazität abgleichen — bei Stagnation zuerst Recovery analysieren", "Alle 8 Wochen: Neue Analyse für objektiven Sleep & Recovery Score Vergleich"] },
    ];
  }

  // stress
  const score = s.stress.stress_score_0_100;
  const band = s.stress.stress_band;
  const stressorBlock = (() => {
    const src = p.stress_source;
    if (!src || src === "none") return null;
    if (src === "job") {
      return { heading: "Dein spezifischer Stress-Hebel: Arbeit", items: [
        "Feste Feierabend-Transition: 5 Min Atem-Reset direkt nach letztem Meeting, BEVOR du vom Schreibtisch aufstehst — trennt kognitive Modi",
        "Keine Arbeits-Mails nach 20:00 Uhr — cortisol-triggernder Stimulus vor dem Schlaf fragmentiert Tiefschlaf",
        "Mikro-Pausen: alle 90 Min 3 Min aufstehen + 5× tiefe Atemzüge — reduziert kumulativen Tagesstress messbar",
        "1× pro Woche einen echten Feierabend (kein Laptop, kein Slack) als harten Cutoff — auch wenn der Rest der Woche chaotisch ist",
        "Ultradiane Rhythmen nutzen: fokussiert arbeiten in 90-Min-Blöcken, 15 Min Pause — aligned mit natürlicher Aufmerksamkeits-Zyklus",
      ] };
    }
    if (src === "family") {
      return { heading: "Dein spezifischer Stress-Hebel: Familie / Beziehung", items: [
        "Transitions-Ritual: 10 Min Allein-Zeit nach Heimkommen, BEVOR du in den Familien-Modus wechselst — verhindert dass Arbeits-Stress ins Zuhause übertragen wird",
        "Gemeinsames Ritual pro Tag: eine feste 15-Min-Zeit (Abendessen, Spaziergang) ohne Handy — Qualität > Quantität für Beziehungs-Reserven",
        "Konflikt-Regel: schwierige Gespräche NIE nach 21:00 Uhr — müde Gehirne eskalieren schneller (limbisches System dominiert)",
        "Eigen-Zeit: 1× pro Woche 60 Min nur für dich — ohne schlechtes Gewissen, als Investition in Beziehungsqualität framen",
        "Dankbarkeit als Familien-Habit: 1 positive Sache des Tages zu zweit benennen — stabilisiert Bindung messbar (Gottman-Forschung)",
      ] };
    }
    if (src === "finances") {
      return { heading: "Dein spezifischer Stress-Hebel: Finanzen", items: [
        "Fixer Finanz-Slot: 1× pro Woche 20 Min für Zahlen-Check (gleicher Tag, gleiche Uhrzeit) — konzentriert diffuse Dauer-Sorge in einen Container",
        "Rest der Woche: Finanz-Gedanken bewusst auf den Slot verschieben ('das schaue ich Sonntag an') — reduziert kognitive Belastung",
        "Konkreter nächster Schritt statt Grübeln: Eine Aktion identifizieren (Ausgaben-Analyse, Beratungs-Termin, Gespräch) und datieren",
        "Kein Handy-Banking in Stress-Momenten — Saldo-Check verstärkt akute Angst ohne Handlungsoption",
        "Finanz-Stress ist oft Unsicherheits-Stress: 3 Szenarien notieren (Worst / Expected / Best) — begrenzt das Kopf-Kino",
      ] };
    }
    if (src === "health") {
      return { heading: "Dein spezifischer Stress-Hebel: Gesundheit", items: [
        "Unterscheide: Sorge über KONTROLLIERBARES (Ernährung, Bewegung, Schlaf) vs. NICHT-kontrollierbar (Alter, Genetik) — Energie in Ersteres",
        "Symptom-Tagebuch statt Google-Spiralen: notiere was dir auffällt, bring es zum Arzttermin — reduziert nachts-wach-liegen",
        "Abend-Journal: 3 kontrollierbare Dinge heute gemacht → kalibriert Fokus auf Handlung statt Sorge",
        "1 Arzttermin / Checkup pro Jahr als festes Ritual — reduziert diffuse Gesundheits-Angst durch echte Datenpunkte",
        "Medizin-Nachrichten begrenzen: keine Symptom-Googlerei außerhalb konkreter Beschwerden — nährt Gesundheits-Angst messbar",
      ] };
    }
    if (src === "future") {
      return { heading: "Dein spezifischer Stress-Hebel: Zukunfts-Angst / Ungewissheit", items: [
        "Kontroll-Kreis-Übung: tägliches Journal mit 3 Spalten (beeinflussbar / teilweise / gar nicht) — Energie nur in Spalte 1 investieren",
        "5-Jahres-Horizont-Frage: 'Wird das in 5 Jahren noch wichtig sein?' — 80% der akuten Sorgen schrumpfen dadurch",
        "Abend-Routine: 1 konkreter nächster Schritt für morgen — ersetzt endloses 'was-wäre-wenn'-Grübeln mit Handlung",
        "Meditation/Atem-Praxis 10 Min täglich: trainiert Unsicherheits-Toleranz — Cortisol sinkt messbar in 4–8 Wochen",
        "Zukunfts-Angst ist oft Lösungs-Ausweichen: die Angst sagt 'da ist was' — diesen Impuls nutzen, nicht unterdrücken",
      ] };
    }
    return null;
  })();
  const ritualBlock = (() => {
    const rr = p.recovery_ritual;
    if (!rr || rr === "none") return null;
    const map: Record<string, { heading: string; items: string[] }> = {
      nature: { heading: "Dein Ritual ausbauen: Natur", items: [
        "Mikro-Nature-Break im Alltag: 5 Min draußen zwischen Meetings (auch Balkon / Straße zählt) — senkt Cortisol messbar (Univ. Michigan 2020)",
        "Wochenend-Ritual: 1× pro Woche 60+ Min in echter Natur (Wald, Park, Gewässer) — größerer biophiler Effekt als Stadt-Spaziergang",
        "Tageslicht-Protokoll: erste 10 Min des Tages draußen (bei jedem Wetter) — synchronisiert zirkadianen Rhythmus, senkt Abend-Cortisol",
        "Natur-Input abends: Bild/Video aus letztem Nature-Trip anschauen — selbst Visualisierung senkt physiologischen Stress",
      ] },
      sport: { heading: "Dein Ritual ausbauen: Sport als Stress-Tool", items: [
        "Sport als Stress-Regulation framen, nicht nur Performance: 3× moderate Ausdauer (65–75% HFmax) senkt Cortisol langfristig",
        "Bei akutem Stress >7/10: KEIN HIIT — das erhöht Cortisol weiter. Gehen, Yoga oder Dehnen bevorzugen.",
        "Mikro-Bewegung bei Stressspitzen: 20 Kniebeugen oder 2 Min Treppen → akuter Cortisol-Abbau in <10 Min",
        "Sport-Timing: morgens ODER nachmittags, nicht später als 19:00 Uhr — sonst kann Adrenalin das Einschlafen erschweren",
      ] },
      cooking: { heading: "Dein Ritual ausbauen: Kochen", items: [
        "Kochen bewusst als Meditation in Bewegung nutzen: kein Handy in der Küche, volle Konzentration auf Handgriffe — senkt Cortisol",
        "1× pro Woche 60 Min Slow Cooking als Ritual (ohne Zeitdruck) — aktiviert Parasympathikus analog zu Meditation",
        "Meal-Prep-Sonntag als Anti-Stress-Anker: 90 Min Musik + Kochen + Woche vorbereiten = Kontrollgefühl für Mo-Fr",
        "Gäste alle 2 Wochen: soziale Mahlzeit verstärkt Oxytocin + reduziert Cortisol messbar",
      ] },
      reading: { heading: "Dein Ritual ausbauen: Lesen", items: [
        "Abend-Cutoff-Ritual: letzte 30 Min vor Schlaf Papier-Buch (kein Screen) — senkt Einschlaflatenz messbar, ersetzt Social-Media-Scrolling",
        "Mittags-Ritual: 15 Min Lesepause ohne Arbeitsbezug — kognitiver Reset, reduziert Nachmittags-Cortisol-Spike",
        "Wochenend-Morgen: 60 Min Lesen vor erstem Screen-Kontakt — schützt mentale Klarheit",
        "Fiktion bevorzugen für Stress-Reduktion — aktiviert narrative Entspannung stärker als Sachbuch",
      ] },
      meditation: { heading: "Dein Ritual ausbauen: Meditation", items: [
        "Von aktuell-praktizierter Dauer ausgehend: +2 Min pro Woche bis 15–20 Min/Tag — langsam > perfekt",
        "Morgens > Abends für Cortisol-Regulation — Morgen-Meditation senkt Baseline über den Tag",
        "Bei akutem Stress: 3 Min Box-Breathing (4-4-4-4) in real-time — klinisch validiert zur HRV-Verbesserung",
        "App-frei 1× pro Woche: Timer + Stille — trainiert Unabhängigkeit vom Tool",
      ] },
      social: { heading: "Dein Ritual ausbauen: Soziale Verbindung", items: [
        "1× pro Woche 60+ Min ungestörte Zeit mit wichtigster Person — Handy weg, volle Präsenz",
        "Tägliches Kurz-Check-in mit 1 nahestehender Person (Anruf/Text) — regelmäßige soziale Nahrung > seltene Events",
        "Nach stressigen Tagen: soziale Interaktion priorisieren statt Alleine-Grübeln — Oxytocin senkt Cortisol messbar",
        "Einsamkeits-Check: wenn mehr als 3 Tage ohne echten Kontakt → aktiv planen statt warten",
      ] },
    };
    return map[rr] ?? null;
  })();
  const out: PlanBlock[] = [
    { heading: "Deine Ausgangslage", items: [`Stress & Lifestyle Score: ${score}/100 (${band})`, `Sleep Score: ${s.sleep.sleep_score_0_100}/100 — direktes Wechselspiel: Stress erhöht Cortisol → Schlafarchitektur wird fragmentiert`, `Activity Score: ${s.activity.activity_score_0_100}/100 — Bewegung ist das effektivste Stress-Tool (nach Pharmaka)`, `Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 — PMC 2024: chronischer Stress → Insulinsensitivität↓, viszerale Fetteinlagerung↑`, "Psychoneuroendocrinology 2024: Mindfulness (g=0.345) und Entspannung (g=0.347) sind die effektivsten nicht-pharmakologischen Cortisol-Interventionen"] },
  ];
  if (stressorBlock) out.push(stressorBlock);
  if (ritualBlock) out.push(ritualBlock);
  out.push(
    { heading: "Tägliches Stress-Protokoll", items: ["Morgenroutine: 10 Min strukturierte Entspannung (Atemübung, Meditation oder stilles Journaling) — senkt Cortisol-Spike direkt nach dem Aufwachen", "Atemtechnik 4-7-8: 4 s einatmen (Nase) · 7 s halten · 8 s ausatmen (Mund) — aktiviert Parasympathikus in unter 90 Sekunden", "Mittagspause: 15–20 Min vollständig offline und ohne Arbeitsbezug — verhindert kumulativen Stressaufbau", "Abendroutine: To-do-Liste für morgen schreiben — Gedanken aus dem präfrontalen Kortex auslagern für besseren Schlafbeginn", "Box-Breathing (4-4-4-4): 4 Min täglich — klinisch validiert zur HRV-Verbesserung und Cortisol-Senkung (Navy SEAL Protokoll)"] },
    { heading: "Sport als neurobiologisches Stress-Tool", items: ["Moderate Ausdauer (65–75% HFmax), 3×/Woche: Cortisol langfristig senken durch Sensitivisierung der HPA-Achse", "Psychoneuroendocrinology 2024: aerobe Aktivität ist die einzige Intervention, die gleichzeitig Cortisol senkt UND Serotonin/BDNF erhöht", "Yoga/Pilates 2×/Woche: Kombination aus Bewegung und kontrollierter Atmung — synergistischer Effekt auf Parasympathikus", "KEIN intensives HIIT oder Maximalbelastung bei akutem Stresslevel >8/10 — erhöht Cortisol weiter und erhöht Verletzungsrisiko messbar", "Natur-Bewegung: 20 Min in natürlicher Umgebung senkt Cortisol-Spiegel nachweisbar (Univ. Michigan, 2020 meta-analysis)"] },
    { heading: "Schlaf als Anti-Stress-Intervention", items: ["7–9h Schlaf ist die kostenloseste und wirksamste Anti-Cortisol-Maßnahme — alles andere ist Symptombehandlung", "Kaczmarek 2025: Schlafmangel → Cortisol↑ und Testosteron↓ gleichzeitig — HPA-HPG-Achsen-Kaskade", "Schlafzeit stabilisieren auf ±30 Min täglich: normalisiert zirkadianen Rhythmus und senkt Baseline-Cortisol in 2–4 Wochen", "Kein Alkohol als Einschlafhilfe: unterbricht REM-Schlaf, erhöht nächtliche Cortisol-Pegel und verschlechtert Recovery"] },
    { heading: "Lifestyle-Optimierung & Resilienz", items: ["Digitale Auszeiten: 1–2h/Tag komplett offline (kein Smartphone, kein Social Media) — reduziert kognitiven Dauerstress", "Soziale Face-to-Face-Interaktion: nachgewiesen stressreduzierend durch Oxytocin-Ausschüttung (meta-analytisch belegt)", "Alkohol: >14 Einheiten/Woche aktivieren die Stressachse nachhaltig und verschlechtern Schlafarchitektur", "Koffein nach 14:00 Uhr: verlängert Cortisol-Halbwertszeit und erhöht Schlaflatenz — bei Stressbelastung zuerst hier ansetzen", "Frontiers 2022: >6h Sitzen/Tag → Risikofaktor für 12 chronische Erkrankungen unabhängig vom Stressmanagement"] },
    { heading: "Monitoring & Fortschritt", items: ["Subjektiven Stresslevel täglich 1–10 bewerten — 2-Wochen-Muster zeigen Trigger und Eskalationspunkte", "HRV (Heart Rate Variability) tracken (wenn verfügbar): steigt bei effektivem Stress-Management messbar in 4–8 Wochen", "Schlafqualität und Einschlafzeit korrelieren direkt mit Stressniveau — nutze sie als proximalen Indikator", "Kortisol-Signale im Alltag: Konzentrationsschwäche, Reizbarkeit, Heißhunger auf Zucker/Fett — alle sind Biomarker", "Alle 8 Wochen: Neue Analyse für objektiven Stress Score Vergleich"] },
  );
  return out;
}

// ── User prompt builder ──────────────────────────────────────────────────────

// ── User-prompt i18n ────────────────────────────────────────────────────────
// The user message Claude receives is locale-aware so it doesn't conflict
// with the system-level LANGUAGE instruction. Numeric scores and categorical
// identifiers (e.g. "activity_category") stay as-is — Claude handles them
// across languages. Only the prose (headers, field labels, closings) is
// translated. Deep rules stay German for non-DE locales too (they are
// implementation-specific examples of WHAT to address, and Claude will
// restate the concepts in the target language when it drafts the blocks).
type UpStrings = {
  personalizationHeader: string;
  mainGoalLabel: string;
  timeBudgetLabel: string;
  experienceLabel: string;
  trainingDaysLabel: string;
  nutritionLabel: string;
  stressLabel: string;
  ritualLabel: string;
  notSpecified: string;
  defaultMark: string;
  hardRulesHeader: string;
  hardRules: string[];
  deepRulesHeader: string;
  dataHeader: Record<PlanType, string>;
  closing: Record<PlanType, string>;
};

const UP_DE: UpStrings = {
  personalizationHeader: "USER PERSONALISIERUNG (PFLICHT berücksichtigen):",
  mainGoalLabel: "Hauptziel",
  timeBudgetLabel: "Zeitbudget",
  experienceLabel: "Erfahrungslevel",
  trainingDaysLabel: "Aktuelle Trainingstage/Woche",
  nutritionLabel: "Ernährungs-Painpoint",
  stressLabel: "Haupt-Stressor",
  ritualLabel: "Liebstes Erholungs-Ritual",
  notSpecified: "nicht angegeben",
  defaultMark: "Default",
  hardRulesHeader: "HARTE REGELN:",
  hardRules: [
    'Wenn time_budget="minimal" (10–20 Min/Tag): KEINE Sessions >15 Min. Micro-Workouts + Alltagsbewegung priorisieren. NIE Zone-2-45-Min empfehlen.',
    "Wenn experience_level ∈ {beginner, restart}: MAX 2–3 Einheiten/Woche. NIE 4–5×. Erste 2 Wochen: Habit-Aufbau, nicht Volumen.",
    "Wenn main_goal ∈ {feel_better, stress_sleep, longevity}: Training kommt NACH Schlaf/Stress/Ernährungs-Fixes in der Priorität. Keine HIIT-Empfehlungen.",
    "Wenn training_days=0: Starten bei 1×/Woche. NIE 5×/Woche als Startempfehlung.",
    'NUR wenn main_goal="performance" UND time_budget ∈ {committed, athlete} UND experience_level ∈ {intermediate, advanced}: DANN sind 4–5 Einheiten/Woche angebracht.',
  ],
  deepRulesHeader: "TIEFEN-REGELN (diese Ausprägungen sind USER-spezifisch und müssen im Plan namentlich auftauchen):",
  dataHeader: {
    activity: "ACTIVITY-PLAN — Nutzerdaten:",
    metabolic: "METABOLIC-PLAN — Nutzerdaten:",
    recovery: "RECOVERY-PLAN — Nutzerdaten:",
    stress: "STRESS & LIFESTYLE-PLAN — Nutzerdaten:",
  },
  closing: {
    activity: "Generiere einen detaillierten, personalisierten Activity-Plan. Nutze alle übermittelten Zahlen und erkläre das Warum hinter jeder Empfehlung.",
    metabolic: "Generiere einen detaillierten, personalisierten Metabolic-Plan mit konkreten Protokollen.",
    recovery: "Generiere einen detaillierten, personalisierten Recovery-Plan mit wissenschaftlich begründeten Protokollen.",
    stress: "Generiere einen detaillierten, personalisierten Stress & Lifestyle-Plan mit konkreten Downregulations-Protokollen.",
  },
};

const UP_EN: UpStrings = {
  personalizationHeader: "USER PERSONALIZATION (MANDATORY to respect):",
  mainGoalLabel: "Main goal",
  timeBudgetLabel: "Time budget",
  experienceLabel: "Experience level",
  trainingDaysLabel: "Current training days/week",
  nutritionLabel: "Nutrition pain point",
  stressLabel: "Main stressor",
  ritualLabel: "Favourite recovery ritual",
  notSpecified: "not specified",
  defaultMark: "default",
  hardRulesHeader: "HARD RULES:",
  hardRules: [
    'If time_budget="minimal" (10–20 min/day): NO sessions >15 min. Prioritise micro-workouts + daily movement. NEVER recommend Zone-2-45-min.',
    "If experience_level ∈ {beginner, restart}: MAX 2–3 sessions/week. NEVER 4–5×. First 2 weeks: habit-building, not volume.",
    "If main_goal ∈ {feel_better, stress_sleep, longevity}: Training ranks AFTER sleep/stress/nutrition fixes. No HIIT recommendations.",
    "If training_days=0: Start at 1×/week. NEVER 5×/week as a starting point.",
    'ONLY if main_goal="performance" AND time_budget ∈ {committed, athlete} AND experience_level ∈ {intermediate, advanced}: THEN 4–5 sessions/week is appropriate.',
  ],
  deepRulesHeader: "DEEP RULES (these user-specific signals MUST appear by name in the plan):",
  dataHeader: {
    activity: "ACTIVITY PLAN — User data:",
    metabolic: "METABOLIC PLAN — User data:",
    recovery: "RECOVERY PLAN — User data:",
    stress: "STRESS & LIFESTYLE PLAN — User data:",
  },
  closing: {
    activity: "Generate a detailed, personalised Activity plan. Use every number provided and explain the WHY behind each recommendation.",
    metabolic: "Generate a detailed, personalised Metabolic plan with concrete protocols.",
    recovery: "Generate a detailed, personalised Recovery plan with science-backed protocols.",
    stress: "Generate a detailed, personalised Stress & Lifestyle plan with concrete down-regulation protocols.",
  },
};

const UP_IT: UpStrings = {
  personalizationHeader: "PERSONALIZZAZIONE UTENTE (OBBLIGATORIA):",
  mainGoalLabel: "Obiettivo principale",
  timeBudgetLabel: "Tempo disponibile",
  experienceLabel: "Livello di esperienza",
  trainingDaysLabel: "Giorni di allenamento attuali/settimana",
  nutritionLabel: "Pain point nutrizionale",
  stressLabel: "Fattore di stress principale",
  ritualLabel: "Rituale di recupero preferito",
  notSpecified: "non specificato",
  defaultMark: "default",
  hardRulesHeader: "REGOLE DURE:",
  hardRules: [
    'Se time_budget="minimal" (10–20 min/giorno): NESSUNA sessione >15 min. Priorità a micro-workout + movimento quotidiano. MAI consigliare Zone-2-45-min.',
    "Se experience_level ∈ {beginner, restart}: MAX 2–3 sessioni/settimana. MAI 4–5×. Prime 2 settimane: costruzione dell'abitudine, non volume.",
    "Se main_goal ∈ {feel_better, stress_sleep, longevity}: L'allenamento viene DOPO la cura di sonno/stress/nutrizione. Niente HIIT.",
    "Se training_days=0: Partire da 1×/settimana. MAI 5×/settimana come punto di partenza.",
    'SOLO se main_goal="performance" E time_budget ∈ {committed, athlete} E experience_level ∈ {intermediate, advanced}: ALLORA 4–5 sessioni/settimana sono appropriate.',
  ],
  deepRulesHeader: "REGOLE APPROFONDITE (questi segnali specifici dell'utente DEVONO apparire per nome nel piano):",
  dataHeader: {
    activity: "PIANO ATTIVITÀ — Dati utente:",
    metabolic: "PIANO METABOLICO — Dati utente:",
    recovery: "PIANO RECOVERY — Dati utente:",
    stress: "PIANO STRESS & LIFESTYLE — Dati utente:",
  },
  closing: {
    activity: "Genera un piano attività dettagliato e personalizzato. Usa ogni numero fornito e spiega il PERCHÉ dietro ogni raccomandazione.",
    metabolic: "Genera un piano metabolico dettagliato e personalizzato con protocolli concreti.",
    recovery: "Genera un piano recovery dettagliato e personalizzato con protocolli scientificamente fondati.",
    stress: "Genera un piano stress & lifestyle dettagliato e personalizzato con protocolli concreti di down-regulation.",
  },
};

const UP_TR: UpStrings = {
  personalizationHeader: "KULLANICI KİŞİSELLEŞTİRME (ZORUNLU):",
  mainGoalLabel: "Ana hedef",
  timeBudgetLabel: "Zaman bütçesi",
  experienceLabel: "Deneyim seviyesi",
  trainingDaysLabel: "Mevcut antrenman günü/hafta",
  nutritionLabel: "Beslenme sorunu",
  stressLabel: "Ana stres kaynağı",
  ritualLabel: "En sevilen iyileşme ritüeli",
  notSpecified: "belirtilmedi",
  defaultMark: "varsayılan",
  hardRulesHeader: "KATI KURALLAR:",
  hardRules: [
    'Eğer time_budget="minimal" (10–20 dk/gün): >15 dk seans YOK. Mikro-workout + günlük hareket önceliklidir. ASLA Zone-2-45-dk önerme.',
    "Eğer experience_level ∈ {beginner, restart}: MAKS 2–3 seans/hafta. ASLA 4–5×. İlk 2 hafta: alışkanlık inşası, hacim değil.",
    "Eğer main_goal ∈ {feel_better, stress_sleep, longevity}: Antrenman uyku/stres/beslenme düzeltmelerinden SONRA gelir. HIIT önerme.",
    "Eğer training_days=0: 1×/hafta ile başla. ASLA 5×/hafta başlangıç önerisi olamaz.",
    'YALNIZCA main_goal="performance" VE time_budget ∈ {committed, athlete} VE experience_level ∈ {intermediate, advanced} ise: O ZAMAN 4–5 seans/hafta uygundur.',
  ],
  deepRulesHeader: "DERİN KURALLAR (kullanıcıya özel bu sinyaller planda adıyla geçmelidir):",
  dataHeader: {
    activity: "AKTİVİTE PLANI — Kullanıcı verisi:",
    metabolic: "METABOLİK PLAN — Kullanıcı verisi:",
    recovery: "İYİLEŞME PLANI — Kullanıcı verisi:",
    stress: "STRES & YAŞAMBİÇİMİ PLANI — Kullanıcı verisi:",
  },
  closing: {
    activity: "Detaylı, kişiselleştirilmiş bir Aktivite planı oluştur. Verilen her sayıyı kullan ve her önerinin NEDENİNİ açıkla.",
    metabolic: "Detaylı, kişiselleştirilmiş bir Metabolik plan oluştur, somut protokoller ver.",
    recovery: "Detaylı, kişiselleştirilmiş bir İyileşme planı oluştur, bilimsel temelli protokoller ver.",
    stress: "Detaylı, kişiselleştirilmiş bir Stres & Yaşambiçimi planı oluştur, somut down-regülasyon protokolleri ver.",
  },
};

function getUpStrings(locale: string): UpStrings {
  if (locale === "en") return UP_EN;
  if (locale === "it") return UP_IT;
  if (locale === "tr") return UP_TR;
  return UP_DE;
}

function buildUserPrompt(type: PlanType, s: ScoreInput, p: PlanPersonalization = {}, locale: string = "de"): string {
  const S = getUpStrings(locale);
  const overall = `Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})`;

  // Deep-rules: which plan blocks MUST address the user's specific pain point /
  // stressor / ritual? These stay German — they are implementation examples of
  // WHAT to address, not user-facing prose. Claude sees the rest of the user
  // message in the target locale plus the system LANGUAGE directive and will
  // restate the concepts in the target language in its response.
  const deepRules: string[] = [];
  if (p.nutrition_painpoint && p.nutrition_painpoint !== "none" && (type === "metabolic" || type === "activity")) {
    const npMap: Record<string, string> = {
      cravings_evening: 'Mindestens 1 Block MUSS "Heißhunger abends" explizit adressieren — konkret mit Protein-Timing (z.B. 30 g Protein beim Abendessen stabilisiert Blutzucker → weniger Cravings in der Nacht).',
      low_protein: "Mindestens 1 Block MUSS Protein-Targets konkret machen (z.B. 1,6–2,2 g/kg KG/Tag → Portionen × Mahlzeit runterbrechen).",
      no_energy: "Mindestens 1 Block MUSS Energie-Timing adressieren (Frühstücks-Timing, Koffein-Cutoff, Blutzucker-Stabilisierung).",
      no_time: "Mindestens 1 Block MUSS Meal-Prep-Friction reduzieren (Sonntags 30-Min-Prep, 2–3 Protein-Quellen vorkochen).",
    };
    const entry = npMap[p.nutrition_painpoint];
    if (entry) deepRules.push(entry);
  }
  if (p.stress_source && p.stress_source !== "none" && (type === "stress" || type === "recovery")) {
    const ssMap: Record<string, string> = {
      job: 'Mindestens 1 Block MUSS Arbeits-Stress-Recovery adressieren (z.B. 3-Min-Atem-Reset nach letztem Meeting, klare Feierabend-Transition, keine Arbeits-Mails nach 20 Uhr).',
      family: 'Mindestens 1 Block MUSS Familien-Transitionen adressieren (z.B. 10 Min Allein-Zeit nach Heimkommen, bevor in den Familien-Modus).',
      finances: 'Mindestens 1 Block MUSS Finanz-Stress-Cognitive-Load adressieren (z.B. 1× pro Woche 20-Min-Finanz-Check in festem Zeitslot — reduziert diffuse Dauer-Sorge).',
      health: 'Mindestens 1 Block MUSS Gesundheits-Unsicherheit kalibrieren (z.B. Abend-Journal: 3 kontrollierbare Dinge heute).',
      future: 'Mindestens 1 Block MUSS Zukunfts-Angst kalibrieren (z.B. Journaling auf "3 heute-kontrollierbare Dinge" fokussieren).',
    };
    const entry = ssMap[p.stress_source];
    if (entry) deepRules.push(entry);
  }
  if (p.recovery_ritual && p.recovery_ritual !== "none") {
    const rrMap: Record<string, string> = {
      sport: "Baue auf dem Ritual SPORT auf — keine komplett neue Routine aufzwingen.",
      nature: 'Integriere NATUR-Exposure explizit (z.B. "5 Min draußen zwischen 2 Meetings" statt nur "Atem-Pause").',
      cooking: "KOCHEN als Regenerations-Anker nutzen — z.B. 1× pro Woche Meal-Prep als bewusste Down-Time framen.",
      reading: "LESEN als Abend-Cutoff-Ritual framen (letzte 30 Min vor Schlaf: Papier-Buch, kein Screen).",
      meditation: "MEDITATION ausbauen statt komplett neu einführen — Dauer langsam steigern.",
      social: 'Soziale Interaktion als Regenerations-Tool framen (z.B. "1× pro Woche ungestörte Zeit mit wichtiger Person").',
    };
    const entry = rrMap[p.recovery_ritual];
    if (entry) deepRules.push(entry);
  }
  const deepRulesBlock = deepRules.length ? `\n${S.deepRulesHeader}\n${deepRules.map((r) => `- ${r}`).join("\n")}\n` : "";

  const personalizationBlock = `
${S.personalizationHeader}
- ${S.mainGoalLabel}: ${p.main_goal ?? `feel_better (${S.defaultMark})`}
- ${S.timeBudgetLabel}: ${p.time_budget ?? `moderate (${S.defaultMark})`}
- ${S.experienceLabel}: ${p.experience_level ?? `intermediate (${S.defaultMark})`}
- ${S.trainingDaysLabel}: ${p.training_days ?? S.notSpecified}
- ${S.nutritionLabel}: ${p.nutrition_painpoint ?? S.notSpecified}
- ${S.stressLabel}: ${p.stress_source ?? S.notSpecified}
- ${S.ritualLabel}: ${p.recovery_ritual ?? S.notSpecified}

${S.hardRulesHeader}
${S.hardRules.map((r) => `- ${r}`).join("\n")}
${deepRulesBlock}`;

  if (type === "activity") {
    const gap = Math.max(0, 600 - s.activity.total_met_minutes_week);
    return `${overall}
${personalizationBlock}

${S.dataHeader.activity}
- Activity Score: ${s.activity.activity_score_0_100}/100 (IPAQ: ${s.activity.activity_category})
- MET-min/week: ${s.activity.total_met_minutes_week} (WHO target ≥600, gap: ${gap > 0 ? gap + " MET-min" : "none"})
- VO2max (estimate): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (BMI: ${s.metabolic.bmi}, ${s.metabolic.bmi_category})

${S.closing.activity}`;
  }

  if (type === "metabolic") {
    return `${overall}
${personalizationBlock}
${S.dataHeader.metabolic}
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- BMI: ${s.metabolic.bmi} kg/m² (${s.metabolic.bmi_category}) (WHO normal: 18.5–24.9)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-min/week: ${s.activity.total_met_minutes_week}
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})

${S.closing.metabolic}`;
  }

  if (type === "recovery") {
    return `${overall}
${personalizationBlock}
${S.dataHeader.recovery}
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Sleep-duration band: ${s.sleep.sleep_duration_band} (NSF: 7–9h)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-min/week: ${s.activity.total_met_minutes_week}
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- VO2max (estimate): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})

${S.closing.recovery}`;
  }

  return `${overall}
${personalizationBlock}
${S.dataHeader.stress}
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Activity Score: ${s.activity.activity_score_0_100}/100
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})

${S.closing.stress}`;
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, scores } = body as { type: string; scores: ScoreInput };
    const personalization: PlanPersonalization = {
      main_goal: (body as { main_goal?: PlanPersonalization["main_goal"] }).main_goal ?? null,
      time_budget: (body as { time_budget?: PlanPersonalization["time_budget"] }).time_budget ?? null,
      experience_level: (body as { experience_level?: PlanPersonalization["experience_level"] }).experience_level ?? null,
      training_days: (body as { training_days?: number | null }).training_days ?? null,
      nutrition_painpoint: (body as { nutrition_painpoint?: PlanPersonalization["nutrition_painpoint"] }).nutrition_painpoint ?? null,
      stress_source: (body as { stress_source?: PlanPersonalization["stress_source"] }).stress_source ?? null,
      recovery_ritual: (body as { recovery_ritual?: PlanPersonalization["recovery_ritual"] }).recovery_ritual ?? null,
    };

    const validTypes: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
    if (!validTypes.includes(type as PlanType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }
    if (!scores) {
      return NextResponse.json({ error: "Missing scores" }, { status: 400 });
    }

    const planType = type as PlanType;
    const locale = (body as { locale?: string }).locale ?? "de";
    const meta = getPlanMeta(locale)[planType];
    const apiKeyOk = hasValidKey(process.env.ANTHROPIC_API_KEY);
    console.log("[Plans/BE/generate] received", { bodyLocale: (body as { locale?: string }).locale, effectiveLocale: locale, type, hasApiKey: apiKeyOk });

    if (!apiKeyOk) {
      const fallback = buildFallbackBlocks(planType, scores, personalization);
      console.log("[Plans/BE/generate] NO API KEY — using fallback", { locale, firstHeading: fallback[0]?.heading });
      return NextResponse.json({ ...meta, locale, blocks: fallback });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userPrompt = buildUserPrompt(planType, scores, personalization, locale);

    // Strong language directive placed FIRST in the system prompt so Claude
    // reads it before any of the German task description. Includes explicit
    // forbidden-phrase examples and the exact block-1 / block-6 heading
    // to minimise cross-language leakage.
    const languageInstruction =
      locale === "en"
        ? `CRITICAL LANGUAGE DIRECTIVE — Output language: ENGLISH ONLY.
The entire JSON response — every heading, every item, every rationale — MUST be in English.
FORBIDDEN: German words and phrases (e.g. "Deine Ausgangslage", "Wochenziel", "Monitoring & Fortschritt", "es ist wichtig"). Replace with natural English equivalents.
Block 1 heading: "Your Starting Point". Block 6 heading: "Monitoring & Progress".
Tone: professional, direct, elite-coaching register.`
        : locale === "it"
        ? `DIRETTIVA LINGUA CRITICA — Lingua di output: SOLO ITALIANO.
L'intera risposta JSON — ogni titolo, ogni voce, ogni rationale — DEVE essere in italiano.
VIETATO: parole e frasi tedesche (es. "Deine Ausgangslage", "Wochenziel", "Monitoring & Fortschritt") o inglesi se non termini tecnici standard.
Titolo Blocco 1: "La Tua Situazione Attuale". Titolo Blocco 6: "Monitoraggio & Progressi".
Tono: professionale, diretto, registro da coach d'élite. Usa il "tu", non il "Lei".`
        : locale === "tr"
        ? `KRİTİK DİL DİREKTİFİ — Çıktı dili: YALNIZCA TÜRKÇE.
JSON yanıtının tamamı — her başlık, her madde, her rationale — Türkçe olmalıdır.
YASAK: Almanca kelimeler ve ifadeler ("Deine Ausgangslage", "Wochenziel" vb.). Doğal Türkçe karşılıklar kullan.
Samimi "sen" hitabı kullan (resmi "siz" değil).
Blok 1 başlığı: "Mevcut Durumun". Blok 6 başlığı: "İzleme & İlerleme".
Ton: profesyonel, doğrudan, elit antrenör kaydı.`
        : `KRITISCHE SPRACHDIREKTIVE — Ausgabesprache: NUR DEUTSCH.
Die gesamte JSON-Antwort — jede Überschrift, jedes Item, jede Rationale — MUSS auf Deutsch sein.
Block 1 Überschrift: "Deine Ausgangslage". Block 6 Überschrift: "Monitoring & Fortschritt".
Ton: direkt, professionell, Elite-Coach-Register. Keine Floskeln wie "es ist wichtig".`;

    // Reinforce the same directive at the end of the user turn so Claude
    // sees matching signals in both system AND user messages.
    const userLocaleReminder =
      locale === "en" ? "\n\n⚠️ REMINDER: Entire response in ENGLISH only. No German words anywhere."
      : locale === "it" ? "\n\n⚠️ PROMEMORIA: Intera risposta SOLO in italiano. Nessuna parola tedesca."
      : locale === "tr" ? "\n\n⚠️ HATIRLATMA: Yanıtın tamamı YALNIZCA Türkçe. Hiçbir yerde Almanca kelime yok."
      : "\n\n⚠️ ERINNERUNG: Antwort ausschließlich auf Deutsch.";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: languageInstruction + "\n\n" + SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt + userLocaleReminder }],
    });

    const fullSystem = languageInstruction + "\n\n" + SYSTEM_PROMPT;
    const fullUser = userPrompt + userLocaleReminder;
    console.log("[Plans/BE/generate] system prompt head:", fullSystem.slice(0, 400));
    console.log("[Plans/BE/generate] user prompt head:", fullUser.slice(0, 400));

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    const parsed = JSON.parse(text) as { blocks: PlanBlock[] };
    console.log("[Plans/BE/generate] Claude output", { locale, type: planType, firstHeading: parsed.blocks?.[0]?.heading, blocksCount: parsed.blocks?.length });

    return NextResponse.json({ ...meta, locale, blocks: parsed.blocks });
  } catch (err) {
    console.error("[plan/generate] error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
