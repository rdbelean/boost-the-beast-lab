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

function getPlanMeta(locale: string): PlanMeta {
  if (locale === "en") return PLAN_META_EN;
  if (locale === "it") return PLAN_META_IT;
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

FORMAT: Ausschließlich valides JSON. Keine Markdown-Backticks. Beginne direkt mit {

STRUKTUR — genau 6 Blöcke mit je 5–8 Einträgen:
{
  "blocks": [
    { "heading": "Deine Ausgangslage", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "Monitoring & Fortschritt", "items": ["...", "...", "...", "...", "...", "..."] }
  ]
}

Block 1 "Deine Ausgangslage": Alle relevanten Scores mit Einordnung, Vergleich mit Referenzwerten, was die Zahlen konkret bedeuten.
Blöcke 2–5: Konkrete, evidenzbasierte Protokolle und Maßnahmen spezifisch für den Plan-Typ. Jeder Eintrag ist ein vollständiger Satz mit Begründung und konkreten Zahlen.
Block 6 "Monitoring & Fortschritt": Wie misst man Fortschritt, in welchem Zeitraum, welche Indikatoren, wann eine Neue Analyse sinnvoll ist.

SPRACHE: Deutsch, professionell, direkt, fachlich fundiert.`;

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
    return [
      { heading: "Deine Ausgangslage", items: [`Metabolic Score: ${score}/100 (${s.metabolic.metabolic_band})`, `BMI: ${bmi} kg/m² — WHO-Kategorie: ${cat} (Normalbereich: 18,5–24,9 kg/m²)`, `Activity Score: ${s.activity.activity_score_0_100}/100 — MET-Minuten/Woche: ${s.activity.total_met_minutes_week}`, `Sleep Score: ${s.sleep.sleep_score_0_100}/100 — Covassin RCT 2022: Schlafmangel erhöht viszerales Bauchfett unabhängig von der Ernährung`, `Stress Score: ${s.stress.stress_score_0_100}/100 — chronischer Stress senkt Insulinsensitivität und erhöht Cortisol-getriebene Fetteinlagerung`] },
      { heading: "Ernährungs-Protokoll (ISSN/EFSA-Standard)", items: ["3 Hauptmahlzeiten + 1–2 Snacks — gleichmäßige Energieverteilung stabilisiert Blutzucker und vermeidet Heißhunger", "Protein: 1,6–2,2 g/kg KG/Tag (ISSN Position Stand) — für aktive Personen zur Muskelmasseerhaltung essenziell", "Kohlenhydrate: komplex und ballaststoffreich — Vollkorn, Hülsenfrüchte, Gemüse vor verarbeiteten Produkten priorisieren", "Gesättigte Fette: <10% der Gesamtenergie (WHO) — ungesättigte Fettsäuren (Oliven, Nüsse, Avocado) bevorzugen", "Gemüse & Obst: ≥400g/Tag (WHO-Mindestempfehlung) — am einfachsten: ≥2 Portionen Gemüse pro Hauptmahlzeit", "JAMA 2024: frühes Essen (Kalorienaufnahme bis 15:00 Uhr betont) → nachweislich bessere Gewichtskontrolle in 29 RCTs"] },
      { heading: "Hydrations-Protokoll", items: ["Grundbedarf: 30–35 ml × Körpergewicht (kg) pro Tag — bei 80 kg entspricht das 2,4–2,8 l", "Sport-Ergänzung: +500–750 ml pro Trainingsstunde — bei Schwitzen höherer Bedarf", "Morgens: 300–500 ml Wasser direkt nach dem Aufstehen — reaktiviert Stoffwechsel nach Nüchtern-Phase", "Timing: Wasser vor dem Essen trinken — reduziert Kalorienaufnahme und unterstützt Sättigung", "Zuckerhaltige Getränke vollständig durch Wasser, Mineralwasser oder ungesüßten Tee ersetzen"] },
      { heading: "Sitzzeit-Management & Alltagsaktivität", items: ["Frontiers 2022: >6h Sitzen/Tag erhöht Risiko für 12 chronische Erkrankungen — auch bei regelmäßigem Training", "AHA Science Advisory: Sitzzeit erhöht Metabolisches-Syndrom-Odds um Faktor 1.73 nach Sport-Adjustierung", "Bewegungspause alle 45–60 Min: 5 Min Stehen, Gehen, Treppensteigen — unterbricht metabolische Stagnation", "Aktive Mittagspause (15–20 Min Gehen) zählt als moderate Aktivität und senkt Blutzuckerspitzen nach dem Essen"] },
      { heading: "Schlaf & Stress als metabolische Hebel", items: [`Dein Sleep Score ${s.sleep.sleep_score_0_100}/100: Schlafmangel erhöht Ghrelin (Hungersignal) und senkt Leptin (Sättigungshormon) messbar`, "Kaczmarek 2025: Schlafmangel → Cortisol↑ → erhöhte Gluconeogenese → Blutzucker destabilisiert", `Stress Score ${s.stress.stress_score_0_100}/100: chronischer Stress → Insulin-Sensitivität↓ → Fetteinlagerung bevorzugt im viszeralen Bereich`, "Sondrup 2022: Schlafmangel → signifikant erhöhte Insulinresistenz — metabolische Medikamente können das nicht kompensieren"] },
      { heading: "Monitoring & Fortschritt", items: ["Mahlzeiten für 14 Tage tracken (App) — Ziel: Muster, nicht Kalorien-Obsession", "Körpergewicht 1×/Woche morgens nüchtern — gleiche Uhrzeit, gleiche Bedingungen", "Nachhaltiges Tempo: max. 0,5–1,0 kg/Woche Gewichtsveränderung (WHO-Empfehlung für langfristigen Erfolg)", "Taillenumfang alle 4 Wochen messen — besserer Indikator für viszerales Fett als Körpergewicht allein", "Alle 8 Wochen: Neue Analyse für objektive Score-Entwicklung"] },
    ];
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
  return [
    { heading: "Deine Ausgangslage", items: [`Stress & Lifestyle Score: ${score}/100 (${band})`, `Sleep Score: ${s.sleep.sleep_score_0_100}/100 — direktes Wechselspiel: Stress erhöht Cortisol → Schlafarchitektur wird fragmentiert`, `Activity Score: ${s.activity.activity_score_0_100}/100 — Bewegung ist das effektivste Stress-Tool (nach Pharmaka)`, `Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 — PMC 2024: chronischer Stress → Insulinsensitivität↓, viszerale Fetteinlagerung↑`, "Psychoneuroendocrinology 2024: Mindfulness (g=0.345) und Entspannung (g=0.347) sind die effektivsten nicht-pharmakologischen Cortisol-Interventionen"] },
    { heading: "Tägliches Stress-Protokoll", items: ["Morgenroutine: 10 Min strukturierte Entspannung (Atemübung, Meditation oder stilles Journaling) — senkt Cortisol-Spike direkt nach dem Aufwachen", "Atemtechnik 4-7-8: 4 s einatmen (Nase) · 7 s halten · 8 s ausatmen (Mund) — aktiviert Parasympathikus in unter 90 Sekunden", "Mittagspause: 15–20 Min vollständig offline und ohne Arbeitsbezug — verhindert kumulativen Stressaufbau", "Abendroutine: To-do-Liste für morgen schreiben — Gedanken aus dem präfrontalen Kortex auslagern für besseren Schlafbeginn", "Box-Breathing (4-4-4-4): 4 Min täglich — klinisch validiert zur HRV-Verbesserung und Cortisol-Senkung (Navy SEAL Protokoll)"] },
    { heading: "Sport als neurobiologisches Stress-Tool", items: ["Moderate Ausdauer (65–75% HFmax), 3×/Woche: Cortisol langfristig senken durch Sensitivisierung der HPA-Achse", "Psychoneuroendocrinology 2024: aerobe Aktivität ist die einzige Intervention, die gleichzeitig Cortisol senkt UND Serotonin/BDNF erhöht", "Yoga/Pilates 2×/Woche: Kombination aus Bewegung und kontrollierter Atmung — synergistischer Effekt auf Parasympathikus", "KEIN intensives HIIT oder Maximalbelastung bei akutem Stresslevel >8/10 — erhöht Cortisol weiter und erhöht Verletzungsrisiko messbar", "Natur-Bewegung: 20 Min in natürlicher Umgebung senkt Cortisol-Spiegel nachweisbar (Univ. Michigan, 2020 meta-analysis)"] },
    { heading: "Schlaf als Anti-Stress-Intervention", items: ["7–9h Schlaf ist die kostenloseste und wirksamste Anti-Cortisol-Maßnahme — alles andere ist Symptombehandlung", "Kaczmarek 2025: Schlafmangel → Cortisol↑ und Testosteron↓ gleichzeitig — HPA-HPG-Achsen-Kaskade", "Schlafzeit stabilisieren auf ±30 Min täglich: normalisiert zirkadianen Rhythmus und senkt Baseline-Cortisol in 2–4 Wochen", "Kein Alkohol als Einschlafhilfe: unterbricht REM-Schlaf, erhöht nächtliche Cortisol-Pegel und verschlechtert Recovery"] },
    { heading: "Lifestyle-Optimierung & Resilienz", items: ["Digitale Auszeiten: 1–2h/Tag komplett offline (kein Smartphone, kein Social Media) — reduziert kognitiven Dauerstress", "Soziale Face-to-Face-Interaktion: nachgewiesen stressreduzierend durch Oxytocin-Ausschüttung (meta-analytisch belegt)", "Alkohol: >14 Einheiten/Woche aktivieren die Stressachse nachhaltig und verschlechtern Schlafarchitektur", "Koffein nach 14:00 Uhr: verlängert Cortisol-Halbwertszeit und erhöht Schlaflatenz — bei Stressbelastung zuerst hier ansetzen", "Frontiers 2022: >6h Sitzen/Tag → Risikofaktor für 12 chronische Erkrankungen unabhängig vom Stressmanagement"] },
    { heading: "Monitoring & Fortschritt", items: ["Subjektiven Stresslevel täglich 1–10 bewerten — 2-Wochen-Muster zeigen Trigger und Eskalationspunkte", "HRV (Heart Rate Variability) tracken (wenn verfügbar): steigt bei effektivem Stress-Management messbar in 4–8 Wochen", "Schlafqualität und Einschlafzeit korrelieren direkt mit Stressniveau — nutze sie als proximalen Indikator", "Kortisol-Signale im Alltag: Konzentrationsschwäche, Reizbarkeit, Heißhunger auf Zucker/Fett — alle sind Biomarker", "Alle 8 Wochen: Neue Analyse für objektiven Stress Score Vergleich"] },
  ];
}

// ── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(type: PlanType, s: ScoreInput, p: PlanPersonalization = {}): string {
  const overall = `Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})`;
  const personalizationBlock = `
USER PERSONALISIERUNG (PFLICHT berücksichtigen):
- Hauptziel: ${p.main_goal ?? "feel_better (Default)"}
- Zeitbudget: ${p.time_budget ?? "moderate (Default)"}
- Erfahrungslevel: ${p.experience_level ?? "intermediate (Default)"}
- Aktuelle Trainingstage/Woche: ${p.training_days ?? "nicht angegeben"}

HARTE REGELN:
- Wenn time_budget="minimal" (10–20 Min/Tag): KEINE Sessions >15 Min. Micro-Workouts + Alltagsbewegung priorisieren. NIE Zone-2-45-Min empfehlen.
- Wenn experience_level ∈ {beginner, restart}: MAX 2–3 Einheiten/Woche. NIE 4–5×. Erste 2 Wochen: Habit-Aufbau, nicht Volumen.
- Wenn main_goal ∈ {feel_better, stress_sleep, longevity}: Training kommt NACH Schlaf/Stress/Ernährungs-Fixes in der Priorität. Keine HIIT-Empfehlungen.
- Wenn training_days=0: Starten bei 1×/Woche. NIE 5×/Woche als Startempfehlung.
- NUR wenn main_goal="performance" UND time_budget ∈ {committed, athlete} UND experience_level ∈ {intermediate, advanced}: DANN sind 4–5 Einheiten/Woche angebracht.
`;

  if (type === "activity") {
    const gap = Math.max(0, 600 - s.activity.total_met_minutes_week);
    return `${overall}
${personalizationBlock}

ACTIVITY-PLAN — Nutzerdaten:
- Activity Score: ${s.activity.activity_score_0_100}/100 — IPAQ-Kategorie: ${s.activity.activity_category}
- MET-Minuten/Woche: ${s.activity.total_met_minutes_week} (WHO-Ziel ≥600, Lücke: ${gap > 0 ? gap + " MET-min" : "kein Defizit"})
- VO2max (algorithmische Schätzung): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band}) — Recovery-Kapazität
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (BMI: ${s.metabolic.bmi}, ${s.metabolic.bmi_category})

Generiere einen detaillierten, personalisierten Activity-Plan. Nutze alle übermittelten Zahlen und erkläre das Warum hinter jeder Empfehlung.`;
  }

  if (type === "metabolic") {
    return `${overall}
${personalizationBlock}
METABOLIC-PLAN — Nutzerdaten:
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- BMI: ${s.metabolic.bmi} kg/m² (${s.metabolic.bmi_category}) — WHO-Normalbereich: 18,5–24,9 kg/m²
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-Minuten/Woche: ${s.activity.total_met_minutes_week}
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band}) — Covassin RCT 2022: Schlafmangel → viszerales Bauchfett
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band}) — Cortisol-Einfluss auf Insulinsensitivität

Generiere einen detaillierten, personalisierten Metabolic-Plan mit konkreten Protokollen.`;
  }

  if (type === "recovery") {
    return `${overall}
${personalizationBlock}
RECOVERY-PLAN — Nutzerdaten:
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Schlafdauer-Band: ${s.sleep.sleep_duration_band} (NSF: 7–9h empfohlen)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-Minuten/Woche: ${s.activity.total_met_minutes_week} (Trainingslast)
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band}) — direkte Wechselwirkung mit Recovery
- VO2max (Schätzung): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})

Generiere einen detaillierten, personalisierten Recovery-Plan mit wissenschaftlich begründeten Protokollen.`;
  }

  return `${overall}
${personalizationBlock}
STRESS & LIFESTYLE-PLAN — Nutzerdaten:
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band}) — Stress/Schlaf-Wechselwirkung
- Activity Score: ${s.activity.activity_score_0_100}/100 — Sport als Cortisol-Regulationswerkzeug
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band}) — Cortisol → Insulinsensitivität
- Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})

Generiere einen detaillierten, personalisierten Stress & Lifestyle-Plan mit konkreten Downregulations-Protokollen.`;
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

    if (!hasValidKey(process.env.ANTHROPIC_API_KEY)) {
      const fallback = buildFallbackBlocks(planType, scores, personalization);
      return NextResponse.json({ ...meta, locale, blocks: fallback });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userPrompt = buildUserPrompt(planType, scores, personalization);
    const langDirective =
      locale === "en" ? "\n\nIMPORTANT: Respond entirely in English." :
      locale === "it" ? "\n\nIMPORTANT: Rispondi interamente in italiano." :
      locale === "ko" ? "\n\nIMPORTANT: 전적으로 한국어로 답변하십시오 (친근한 존댓말)." : "";

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: SYSTEM_PROMPT + langDirective,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    const parsed = JSON.parse(text) as { blocks: PlanBlock[] };

    return NextResponse.json({ ...meta, locale, blocks: parsed.blocks });
  } catch (err) {
    console.error("[plan/generate] error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
