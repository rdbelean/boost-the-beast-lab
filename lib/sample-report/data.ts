import type { PdfReportContent, PdfScores, PdfUserProfile } from "@/lib/pdf/generateReport";

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
