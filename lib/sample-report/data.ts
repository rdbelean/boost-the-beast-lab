import type { PdfReportContent, PdfScores, PdfUserProfile } from "@/lib/pdf/generateReport";
import type { HeroSummary } from "@/lib/reports/hero-summary";
import type { DataInsights } from "@/lib/reports/data-insights";
import type { ScoreDataBasis } from "@/lib/reports/score-data-basis";

export const SAMPLE_SCORES_DISPLAY = {
  activity: {
    activity_score_0_100: 67,
    total_met_minutes_week: 1640,
    activity_category: "MODERATE",
  },
  sleep: {
    sleep_score_0_100: 58,
    sleep_band: "Ausreichend",
    sleep_duration_band: "7–8h",
    sleep_duration_score: 72,
    sleep_quality_score: 55,
    wakeup_score: 60,
    recovery_score: 51,
  },
  vo2max: {
    fitness_score_0_100: 74,
    vo2max_estimated: 46.2,
    vo2max_band: "Gut",
  },
  metabolic: {
    metabolic_score_0_100: 71,
    metabolic_band: "Solide",
    bmi: 23.8,
    bmi_category: "Normal",
  },
  stress: {
    stress_score_0_100: 52,
    stress_band: "Erhöht",
  },
  overall_score_0_100: 65,
  overall_band: "Gut",
};

export const SAMPLE_PDF_SCORES: PdfScores = {
  overall: { score: 65, band: "gut" },
  activity: { score: 67, band: "moderat aktiv" },
  sleep: { score: 58, band: "ausreichend" },
  vo2max: { score: 74, band: "gut", estimated: 46.2 },
  metabolic: { score: 71, band: "solide" },
  stress: { score: 52, band: "erhöht" },
  recovery: { score: 51, band: "moderat" },
  total_met: 1640,
  training_days: 3,
  sitting_hours: 8,
  sleep_duration_hours: 7.2,
};

export const SAMPLE_PDF_USER: PdfUserProfile = {
  email: "beispiel@boostthebeast.com",
  age: 32,
  gender: "male",
  bmi: 23.8,
  bmi_category: "Normal",
};

export const SAMPLE_PDF_CONTENT: PdfReportContent = {
  headline: "Performance Index 65/100 — gut mit klarem Optimierungspotenzial.",
  executive_summary:
    "Dein Overall Performance Index liegt bei 65/100 (Gut). Die fünf Dimensionen liefern ein klares Bild: Schlaf 58, Recovery 51, Aktivität 67, Stoffwechsel 71 und Stress 52. Der stärkste Hebel für den nächsten Qualitätssprung liegt im Bereich Schlaf und Stressregulation.",
  critical_flag: null,
  top_priority:
    "Hebel Nr. 1: Schlaf & Recovery. Eine konsistente Schlafroutine mit 7,5–8h Zieldauer kann deinen Overall Score binnen 30 Tagen um +8 bis +12 Punkte heben — und zieht Stress, Recovery und Aktivitätsqualität automatisch mit.",
  systemic_connections_overview:
    "Schlaf, Stress und Recovery bilden ein Dreieck: Jeder der drei Faktoren limitiert die anderen beiden. Deine Aktivität (67) und dein Metabolic (71) zeigen solide Ausgangswerte — aber ohne stabile Erholung werden diese Dimensionen langfristig stagnieren.",
  prognose_30_days:
    "Bei konsequenter Umsetzung der Schlaf- und Stress-Empfehlungen ist ein realistischer Overall-Zuwachs von +8 bis +14 Punkten möglich — vorausgesetzt, die Maßnahmen werden mindestens 5 von 7 Tagen umgesetzt.",
  disclaimer:
    "Alle Angaben sind modellbasierte Performance-Insights auf Basis exemplarischer Musterdaten. Kein Ersatz für medizinische Diagnostik.",
  executive_findings: [
    {
      type: "weakness",
      headline: "Schlaf als limitierender Faktor",
      body: "Mit 58/100 im Schlaf-Score und einer geschätzten Schlafdauer unter 7,5h liegt hier der größte Hebel. Fehlender Tiefschlaf begrenzt die Testosteron-Ausschüttung, hemmt die Glykogen-Resynthese und verlängert die Regenerationszeit um bis zu 40%.",
      related_dimension: "sleep",
    },
    {
      type: "strength",
      headline: "Solide metabolische Basis",
      body: "BMI 23.8 (Normal) und ein Metabolic Score von 71 zeigen eine gesunde Körperzusammensetzung. Diese Basis schützt vor insulinresistenz-getriebenen Leistungseinbußen und bildet das Fundament für nachhaltige Progression.",
      related_dimension: "metabolic",
    },
    {
      type: "connection",
      headline: "Stress-Sleep-Recovery-Kaskade",
      body: "Dein Stress Score (52) und dein Sleep Score (58) reinforzieren sich gegenseitig negativ. Chronisch erhöhter Cortisol-Spiegel verzögert den Schlafbeginn und reduziert die REM-Phasen — was wiederum den Stress-Puffer für den nächsten Tag reduziert.",
      related_dimension: "stress",
    },
  ],
  cross_insights: [
    {
      dimension_a: "sleep",
      dimension_b: "stress",
      headline: "Schlaf × Stress: Der tägliche Regelkreis",
      body: "Jede Nacht mit unter 7h Schlaf erhöht den Cortisolspiegel am Folgetag messbar. Das erklärt, warum dein Stress Score (52) trotz moderater Aktivität nicht auf >65 steigt: Der Stressor 'Schlafmangel' arbeitet gegen jede andere Intervention.",
    },
    {
      dimension_a: "vo2max",
      dimension_b: "activity",
      headline: "VO2max × Aktivität: Das Intensitäts-Gap",
      body: "Dein VO2max (74) liegt über deinem Aktivitäts-Score (67). Das deutet darauf hin, dass du ausreichend Cardio-Fitness mitbringst, aber die Trainingsintensität nicht konsequent in den VO2max-relevanten Bereich (>80% HFmax) geht.",
    },
    {
      dimension_a: "metabolic",
      dimension_b: "activity",
      headline: "Metabolic × Sitzzeit: Der stille Gegenspieler",
      body: "Trotz solidem BMI und Metabolic Score (71) begrenzt eine Sitzzeit von ca. 8h/Tag den Wert. Studies zeigen: >6h Sitzen/Tag wirkt als unabhängiger CVD-Risikofaktor — unabhängig vom Trainingspensum.",
    },
  ],
  daily_life_protocol: {
    morning: [
      { habit: "500 ml Wasser + 10 Min Tageslicht vor dem ersten Kaffee", why_specific_to_user: "Dein Morgen-Cortisol ist bei Stress 52 bereits erhöht — Tageslicht stabilisiert ihn und verhindert den Mittags-Crash.", time_cost_min: 10 },
      { habit: "30 g Protein im Frühstück (z.B. Quark + Beeren + Nüsse)", why_specific_to_user: "Stabilisiert den Blutzucker für die nächsten 4h und verhindert Heißhunger vor dem Mittag.", time_cost_min: 5 },
      { habit: "3× tief einatmen vor dem ersten Blick aufs Handy", why_specific_to_user: "Verschiebt den Sympathikus-Trigger um 2–3 Minuten — messbar weniger Stress-Reaktivität über den Tag.", time_cost_min: 1 },
    ],
    work_day: [
      { habit: "Alle 45–60 Min 2 Min aufstehen und bewegen", why_specific_to_user: "Deine 8h/Tag Sitzzeit ist der größte Hebel für deinen Metabolic Score (71) — kurz unterbrochen reduziert das das CVD-Risiko messbar.", time_cost_min: 2 },
      { habit: "Mittags 10 Min draußen gehen (ohne Handy)", why_specific_to_user: "Senkt den Cortisol-Peak und aktiviert parasympathische Recovery — wichtig bei Stress 52.", time_cost_min: 10 },
    ],
    evening: [
      { habit: "Koffein-Cutoff 14:00", why_specific_to_user: "Koffein-Halbwertszeit 5–7h — bei deinem Sleep Score 58 ist das der schnellste Hebel für Tiefschlaf.", time_cost_min: 0 },
      { habit: "Bildschirm-Cutoff 45 Min vor Bett", why_specific_to_user: "Blaulicht drückt Melatonin und verschlechtert deine REM-Phase — direkter Effekt auf den morgendlichen Recovery-Score.", time_cost_min: 0 },
      { habit: "Schlafzimmer-Temperatur 17–19 °C", why_specific_to_user: "Kerntemperatur muss für Schlaf sinken — bei unregelmäßiger Routine ist das der zuverlässigste Sleep-Onset-Trigger.", time_cost_min: 2 },
    ],
    nutrition_micro: [
      { habit: "Protein-Ziel: 1.6 g/kg Körpergewicht verteilt auf 3–4 Mahlzeiten", why_specific_to_user: "Fundament für Muskelerhalt bei deiner moderaten Trainingsaktivität (67).", time_cost_min: 0 },
      { habit: "4+ Portionen Gemüse täglich als Standard", why_specific_to_user: "Stabilisiert den Metabolic Score (71) und liefert Mikronährstoffe die Recovery direkt unterstützen.", time_cost_min: 5 },
    ],
    total_time_min_per_day: 35,
  },
  action_plan: [
    {
      headline: "Schlaf auf 7,5–8h stabilisieren",
      current_value: "Ø 7.2h, unregelmäßig",
      target_value: "Ø 7.8h, ±20 Min Abweichung",
      metric_source: "Schlafdauer-Tracking 7 Tage",
      week_milestones: [
        { week: "Woche 1", task: "Schlafzeit fixieren", milestone: "7× pünktlich im Bett" },
        { week: "Woche 2", task: "Bildschirmzeit reduzieren", milestone: "Kein Bildschirm 45 Min vor Schlaf" },
        { week: "Woche 3–4", task: "Routine stabilisieren", milestone: "Ø 7.8h erreicht" },
      ],
    },
    {
      headline: "Stress-Downregulation installieren",
      current_value: "Kein tägliches Protokoll",
      target_value: "2× tägl. 5-Min-Pause",
      metric_source: "14 Tage Streak",
      week_milestones: [
        { week: "Woche 1", task: "Morgen-Slot", milestone: "Box Breathing 7× morgens" },
        { week: "Woche 2", task: "Mittags-Slot hinzufügen", milestone: "14-Tage-Streak begonnen" },
        { week: "Woche 3–4", task: "Automatisieren", milestone: "Gewohnheit verankert" },
      ],
    },
    {
      headline: "VO2max-Reize setzen",
      current_value: "Kein dediziertes Intervalltraining",
      target_value: "1× / Woche 4×4-Intervall",
      metric_source: "+3 Punkte Fitness Score in 30 Tagen",
      week_milestones: [
        { week: "Woche 1", task: "Erstes 4×4-Intervall", milestone: "Test-Einheit absolviert" },
        { week: "Woche 2–3", task: "Regelmäßigkeit", milestone: "2× Intervall integriert" },
        { week: "Woche 4", task: "Score-Check", milestone: "+3 Punkte VO2max erwartet" },
      ],
    },
  ],
  modules: {
    sleep: {
      score_context:
        "Dein Sleep Score liegt bei 58/100 bei einer durchschnittlichen Schlafdauer von 7.2h. Die Bewertung ordnet dich in 'Ausreichend' ein — du schläfst genug, aber nicht optimal.",
      key_finding:
        "Die Kombination aus Schlafdauer (knapp unter Optimum) und unregelmäßiger Routine führt zu unvollständiger Tiefschlaf-Regeneration. Der Recovery-Multiplikator zieht den Gesamt-Score nach unten.",
      systemic_connection:
        "Schlaf ist der Governor für Recovery: der sleepMultiplier deckelt die Regeneration — unabhängig von Trainingsqualität.",
      limitation:
        "Schlafqualität und Konsistenz der Routine sind die primären Engpässe. Die Variabilität zwischen Werktagen und Wochenende destabilisiert den circadianen Rhythmus.",
      recommendation:
        "Fixiere Bett- und Aufsteh-Zeit auf ±30 Min über alle 7 Tage. Schlafzimmertemperatur 17–19°C. Kein Bildschirm 45 Min vor Schlaf.",
    },
    recovery: {
      score_context:
        "Recovery Score 51/100 im Band 'Moderat' — berechnet aus Trainingslast, subjektiver Erholung und den Governoren Schlaf und Stress.",
      key_finding:
        "Deine Erholungskapazität hält mit der Trainingslast Schritt, aber ohne Reserve. Schlaf- und Stress-Multiplier limitieren das Gesamtergebnis.",
      systemic_connection:
        "Recovery ist das Produkt aus Trainingssignal × Schlaf × Stress. Kein einzelner Hebel reicht, wenn einer der drei Faktoren limitiert.",
      overtraining_signal: null,
      limitation:
        "Sleep- und Stress-Multiplier arbeiten unter Kapazität und ziehen den Gesamtwert herunter.",
      recommendation:
        "Periodisierung: Eine Hochintensitätswoche gefolgt von einer Deload-Woche. Gleichzeitig Schlaf auf >7.5h stabilisieren.",
    },
    activity: {
      score_context:
        "Dein Activity Score von 67/100 basiert auf 1640 MET-Minuten pro Woche — IPAQ-Kategorie MODERATE.",
      key_finding:
        "Die Trainings- und Alltagsaktivität positioniert dich im Band 'Moderat'. Damit bewegst du dich quantitativ im empfohlenen Bereich — aber knapp.",
      systemic_connection:
        "Aktivität treibt VO2max direkt und wirkt sekundär positiv auf Schlafqualität und metabolische Gesundheit.",
      met_context:
        "WHO-Referenz: 150–300 Min moderate Aktivität/Woche ≈ 20–21% niedrigeres Mortalitätsrisiko (AHA 2022).",
      sitting_flag: null,
      limitation:
        "Das Trainingsvolumen liegt im Bereich der WHO-Mindestempfehlung. Intensitätsspitzen und Zone-2-Cardio fehlen weitgehend.",
      recommendation:
        "3 Trainingstage/Woche um 1 VO2max-Intervall und 1 Zone-2-Einheit (45–60 Min bei 60–70% HFmax) erweitern.",
    },
    metabolic: {
      score_context:
        "Metabolic Score 71/100 bei BMI 23.8 (Normal) — Zusammenspiel aus Körperzusammensetzung, Hydration, Ernährungsrhythmus und Sitzzeit.",
      key_finding:
        "Die metabolische Einordnung landet im Band 'Solide'. Die Körperzusammensetzung ist optimal, aber eine hohe Sitzzeit (8h/Tag) begrenzt das Potenzial.",
      systemic_connection:
        "Sitzzeit ist unabhängig vom Sport ein CVD-Risikofaktor (AHA Science Advisory). Metabolic beeinflusst VO2max indirekt über BMI.",
      bmi_context:
        "BMI ist ein populationsbasierter Schätzer, kein individueller Gesundheitsmarker. Muskuläre Körperzusammensetzung verzerrt ihn nach oben.",
      limitation:
        "Sitzzeit und Mahlzeiten-Rhythmus limitieren die metabolische Grundlast.",
      recommendation:
        "Trinke täglich 30–35 ml/kg Körpergewicht. Sitzblöcke nach max. 45 Min unterbrechen. 4+ Gemüseportionen als Standard.",
    },
    stress: {
      score_context:
        "Stress Score 52/100 (Erhöht) — gewichtete Kombination aus selbstberichtetem Stresslevel und Sleep-/Recovery-Puffer.",
      key_finding:
        "Die Stress-Regulation liegt im Band 'Erhöht'. Der chronische Belastungs-Level verbraucht Ressourcen, die sonst in Adaption fließen würden.",
      systemic_connection:
        "Chronischer Stress hemmt die HPG-Achse (Testosteron ↓) UND verschlechtert die Insulin-Sensitivität — der am weitesten reichende Hebel im System.",
      hpa_context: null,
      limitation:
        "Fehlende bewusste Downregulation verhindert vollständige parasympathische Erholung.",
      recommendation:
        "Installiere zwei 5-Min-Downregulation-Fenster pro Tag: Box-Breathing 4-4-4-4 morgens + mittags.",
    },
    vo2max: {
      score_context:
        "Geschätzter VO2max: 46.2 ml/kg/min (Gut) — algorithmische Schätzung auf Basis von Alter, BMI und Aktivitätskategorie.",
      key_finding:
        "Die kardiorespiratorische Leistungsfähigkeit liegt im Band 'Gut'. VO2max ist einer der stärksten Einzel-Prädiktoren für langfristige Performance und Longevity.",
      systemic_connection:
        "VO2max ist direkt an das Aktivitätslevel gekoppelt — der einzige Hebel zur Steigerung ist Aktivität mit Intensitätskomponente.",
      fitness_context:
        "46.2 ml/kg/min liegt für einen 32-jährigen Mann im oberen Mittelfeld (Cooper Institute / ACSM Normen).",
      estimation_note:
        "Non-Exercise-Schätzung, kein gemessener Laborwert. Für hochpräzise Diagnostik: Spiroergometrie.",
      limitation:
        "Plateau-Risiko ohne periodisierte Intensitätssteigerung.",
      recommendation:
        "1× pro Woche 4×4-Intervall (4 Min bei 90–95% HFmax, 3 Min aktive Pause). Norwegian 4×4 Protocol.",
    },
  },
};

/* ─── Locale-aware band strings for Beispielreport web view ─── */
const SCORE_BANDS: Record<string, {
  sleep: string; vo2max: string; metabolic: string; stress: string; overall: string;
}> = {
  de: { sleep: "Ausreichend", vo2max: "Gut",  metabolic: "Solide",  stress: "Erhöht",   overall: "Gut"  },
  en: { sleep: "Adequate",    vo2max: "Good", metabolic: "Solid",   stress: "Elevated", overall: "Good" },
  it: { sleep: "Sufficiente", vo2max: "Buono", metabolic: "Solido", stress: "Elevato",  overall: "Buono" },
  tr: { sleep: "Yeterli",     vo2max: "İyi",  metabolic: "Sağlam",  stress: "Yüksek",   overall: "İyi"  },
};

export function getSampleScoresDisplay(locale: string) {
  const b = SCORE_BANDS[locale] ?? SCORE_BANDS.de;
  return {
    ...SAMPLE_SCORES_DISPLAY,
    sleep:     { ...SAMPLE_SCORES_DISPLAY.sleep,     sleep_band: b.sleep },
    vo2max:    { ...SAMPLE_SCORES_DISPLAY.vo2max,    vo2max_band: b.vo2max },
    metabolic: { ...SAMPLE_SCORES_DISPLAY.metabolic, metabolic_band: b.metabolic },
    stress:    { ...SAMPLE_SCORES_DISPLAY.stress,    stress_band: b.stress },
    overall_band: b.overall,
  };
}

/* ─── Sample Data for Beispielreport Components ─────────────── */

export function getSampleHeroSummary(locale: string): HeroSummary {
  const isEN = locale === "en";
  const isIT = locale === "it";
  const days = 24;
  const label = isEN
    ? `${days} Days WHOOP Tracking`
    : isIT
    ? `${days} giorni WHOOP Tracking`
    : `${days} Tage WHOOP Tracking`;
  return {
    total_datapoints: 168,
    sources: [{ type: "whoop", icon: "🔥", label }],
    has_any_data: true,
    quality_level: "strong",
    period_start: isEN ? "Mar 28, 2026" : isIT ? "28 mar 2026" : "28. Mär. 2026",
    period_end:   isEN ? "Apr 20, 2026" : isIT ? "20 apr 2026" : "20. Apr. 2026",
  };
}

export function getSampleDataInsights(locale: string): DataInsights {
  const stepsRef = locale === "de" ? "P70 Altersgruppe" : locale === "it" ? "P70 fascia d'eta" : locale === "tr" ? "P70 yas grubu" : "P70 age group";
  const stepsUnit = locale === "de" ? "Schr." : "";
  return {
    sleep: [
      { label_key: "duration",  value: "7.2",  unit: "h",   evaluation: { status: "borderline", reference: "NSF: 7–9h",        color: "#F59E0B" } },
      { label_key: "deep_sleep",value: "84",   unit: "min", evaluation: { status: "borderline", reference: "Opt: 90–120 min",   color: "#F59E0B" } },
      { label_key: "rem",       value: "98",   unit: "min", evaluation: { status: "good",       reference: "Opt: 90–120 min",   color: "#22C55E" } },
      { label_key: "wakeups",   value: "2.1",              evaluation: { status: "good",       reference: "NSF: ≤2",       color: "#22C55E" } },
    ],
    activity: [
      { label_key: "steps",     value: "9500", unit: stepsUnit, evaluation: { status: "good",   reference: "WHO: 8–10k",        color: "#22C55E" } },
      { label_key: "strain",    value: "14.2",               evaluation: { status: "good",      reference: "Opt: 12–16",        color: "#22C55E" } },
      { label_key: "active_kcal",value: "520", unit: "kcal", evaluation: { status: "optimal",   reference: "Opt: >400 kcal",    color: "#22C55E" } },
    ],
    vo2max: [
      { label_key: "value",     value: "46.2", unit: "ml/kg/min", evaluation: { status: "good", reference: stepsRef,           color: "#22C55E" } },
    ],
    metabolic: [
      { label_key: "bmi",       value: "23.8", unit: "kg/m²", evaluation: { status: "optimal", reference: "WHO: 18.5–24.9", color: "#22C55E" } },
      { label_key: "weight",    value: "78.0", unit: "kg" },
    ],
    stress: [
      { label_key: "hrv",       value: "48",   unit: "ms",  evaluation: { status: "borderline", reference: "Opt: ≥55ms",  color: "#F59E0B" } },
      { label_key: "rhr",       value: "57",   unit: "bpm", evaluation: { status: "optimal",   reference: "Opt: 50–65 bpm",    color: "#22C55E" } },
      { label_key: "whoop_recovery", value: "65", unit: "%", evaluation: { status: "good",     reference: "Opt: ≥67%",    color: "#22C55E" } },
    ],
  };
}

export function getSampleScoreDataBasis(locale: string): Record<string, ScoreDataBasis> {
  const whoop = locale === "de" ? "24T WHOOP" : locale === "it" ? "24g WHOOP" : locale === "tr" ? "24G WHOOP" : "24D WHOOP";
  const questionnaire = locale === "de" ? "Fragebogen" : locale === "it" ? "Questionario" : locale === "tr" ? "Anket" : "Questionnaire";
  return {
    activity:  { icon: "🔥", label: whoop,        type: "positive" },
    sleep:     { icon: "🔥", label: whoop,        type: "positive" },
    vo2max:    { icon: "🔥", label: whoop,        type: "positive" },
    metabolic: { icon: "📝", label: questionnaire, type: "neutral"  },
    stress:    { icon: "🔥", label: whoop,        type: "positive" },
  };
}

const INTERPRETATIONS: Record<string, Record<string, string>> = {
  de: {
    activity:
      "Mit Ø 9.500 Schritten täglich und einem Ø Strain von 14,2 liegst du solide im aktiven Bereich. Die 4 Trainingstage pro Woche spiegeln sich im hohen MET-Wert (1.640 MET-min/Woche). Zone-2-Cardio als Ergänzung würde deine aerobe Basis und Recovery mittelfristig verbessern.",
    sleep:
      "Deine Schlafdauer von Ø 7,2h liegt knapp unterhalb des NSF-Optimums für dein Trainingspensum. Der Deep Sleep mit 84min ist der limitierende Faktor — direkte Ursache für schwankende Recovery-Scores. Koffein-Cutoff vor 14 Uhr und konsistente Schlafzeiten sind die schnellsten Hebel.",
    vo2max:
      "Ein geschätzter VO2max von 46,2 ml/kg/min entspricht dem 70. Perzentil für Männer deiner Altersgruppe. Deine aerobe Kapazität ist ausreichend für intensive Kraft- und Ausdauereinheiten ohne kardiovaskuläre Einschränkungen.",
    metabolic:
      "BMI 23,8 liegt ideal im Normalbereich. Ohne Körperkompositionsmessung (InBody/DEXA) bleibt der Metabolic Score eine Näherung. Ein Scan in den nächsten 4 Wochen würde Fett- und Muskelanteil präzisieren und den Score schärfen.",
    stress:
      "HRV 48ms liegt unter dem Optimum für dein Trainingsvolumen. In Kombination mit eingeschränktem Deep Sleep zeigt das: Dein autonomes Nervensystem regeneriert nicht vollständig. Box Breathing 2× täglich und 1 Deload-Woche pro Monat sind die direkten Hebel.",
  },
  en: {
    activity:
      "With an avg. 9,500 steps/day and avg. Strain of 14.2, you are solidly in the active range. The 4 training days per week are reflected in the high MET value (1,640 MET-min/week). Zone-2 cardio as a supplement would improve your aerobic base and recovery in the medium term.",
    sleep:
      "Your avg. sleep duration of 7.2h is just below the NSF optimum for your training load. Deep sleep at 84 min is the limiting factor — the direct cause of fluctuating recovery scores. Caffeine cut-off before 14:00 and consistent sleep times are the fastest levers.",
    vo2max:
      "An estimated VO2max of 46.2 ml/kg/min corresponds to the 70th percentile for men in your age group. Your aerobic capacity is sufficient for intensive strength and endurance sessions without cardiovascular limitations.",
    metabolic:
      "BMI 23.8 is ideally in the normal range. Without body composition measurement (InBody/DEXA), the metabolic score remains an estimate. A scan in the next 4 weeks would refine fat and muscle percentages and sharpen the score.",
    stress:
      "HRV 48ms is below the optimum for your training volume. Combined with restricted deep sleep, this shows your autonomic nervous system is not recovering fully. Box breathing 2× daily and 1 deload week per month are the direct levers.",
  },
  it: {
    activity:
      "Con una media di 9.500 passi/giorno e uno Strain medio di 14,2, sei solidamente nel range attivo. I 4 giorni di allenamento a settimana si riflettono nell'alto valore MET (1.640 MET-min/settimana). Il cardio Zona 2 come integrazione migliorerebbe la tua base aerobica e il recupero nel medio termine.",
    sleep:
      "La tua durata del sonno media di 7,2h è appena al di sotto dell'ottimale NSF per il tuo carico di allenamento. Il sonno profondo a 84 min è il fattore limitante — causa diretta dei recovery score oscillanti. Il limite della caffeina prima delle 14:00 e orari di sonno coerenti sono i leverè più rapidi.",
    vo2max:
      "Un VO2max stimato di 46,2 ml/kg/min corrisponde al 70° percentile per uomini della tua fascia d'età. La tua capacità aerobica è sufficiente per intense sessioni di forza e resistenza senza limitazioni cardiovascolari.",
    metabolic:
      "BMI 23,8 è idealmente nel range normale. Senza misurazione della composizione corporea (InBody/DEXA), il metabolic score rimane una stima. Una scansione nelle prossime 4 settimane precisherebbe la percentuale di grasso e muscoli e affinerebbe il punteggio.",
    stress:
      "HRV 48ms è al di sotto dell'ottimale per il tuo volume di allenamento. Combinato con un sonno profondo ridotto, questo mostra che il tuo sistema nervoso autonomo non si recupera completamente. La respirazione box 2× al giorno e 1 settimana di deload al mese sono le leve dirette.",
  },
  tr: {
    activity:
      "Gunlük ort. 9.500 adim ve ort. 14,2 Strain ile aktif aralıktasın. Haftadaki 4 antrenman günü yüksek MET değerinde (1.640 MET-dak/hafta) yansıyor. Tamamlayıcı olarak Zon-2 kardiyo orta vadede aerobik bazini ve iyilesmeyi geliştirir.",
    sleep:
      "Ort. 7,2 saatlik uyku süren antrenman yükleri icin NSF optimumunun hemen altında. Derin uyku 84 dk ile sınırlayıcı faktör — dalgalı recovery skorlarının doğrudan nedeni. 14:00 önce kafein kesimi ve tutarlı uyku saatleri en hızlı kaldıraclardır.",
    vo2max:
      "Tahmini 46,2 ml/kg/dak VO2max, yaş grubundaki erkekler için 70. persentile karşılık gelir. Aerobik kapasiteniz kardiyovasküler kısıtlama olmaksızın yoğun kuvvet ve dayanıklılık antrenmanları için yeterlidir.",
    metabolic:
      "BMI 23,8 ideal olarak normal aralıkta. Vücut kompozisyonu ölçümü (InBody/DEXA) olmadan metabolik skor bir tahmin olmaya devam ediyor. Önce 4 haftada bir tarama yag ve kas yüzdesini netlestirir ve skoru keskinlestirir.",
    stress:
      "HRV 48ms antrenman hacmin için optimumun altında. Kısıtlı derin uyku ile birleşince bu, otonom sinir sisteminin tam olarak iyileşmediğini gösteriyor. Günde 2× box breathing ve ayda 1 deload haftası doğrudan kaldıraclardır.",
  },
};

export function getSampleInterpretations(locale: string): Record<string, string> {
  return INTERPRETATIONS[locale] ?? INTERPRETATIONS.de;
}

/** @deprecated Use getSampleDataInsights(locale), getSampleScoreDataBasis(locale), getSampleInterpretations(locale) */
export const SAMPLE_DATA_INSIGHTS = getSampleDataInsights("de");
/** @deprecated Use getSampleScoreDataBasis(locale) */
export const SAMPLE_SCORE_DATA_BASIS = getSampleScoreDataBasis("de");
/** @deprecated Use getSampleInterpretations(locale) */
export const SAMPLE_INTERPRETATIONS = getSampleInterpretations("de");
