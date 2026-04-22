import type { PdfReportContent, PdfScores } from "@/lib/pdf/generateReport";

// DE — same as the original in data.ts, kept here for the 3-locale map
const DE: PdfReportContent = {
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

const EN: PdfReportContent = {
  headline: "Performance Index 65/100 — good with clear optimization potential.",
  executive_summary:
    "Your Overall Performance Index is 65/100 (Good). The five dimensions paint a clear picture: Sleep 58, Recovery 51, Activity 67, Metabolism 71 and Stress 52. The strongest lever for the next quality leap lies in Sleep and Stress Regulation.",
  critical_flag: null,
  top_priority:
    "Lever #1: Sleep & Recovery. A consistent sleep routine with a target of 7.5–8h can raise your Overall Score by +8 to +12 points within 30 days — and automatically improves Stress, Recovery and Activity quality.",
  systemic_connections_overview:
    "Sleep, Stress and Recovery form a triangle: each of the three factors limits the other two. Your Activity (67) and Metabolic (71) show solid baseline values — but without stable recovery these dimensions will stagnate long-term.",
  prognose_30_days:
    "With consistent implementation of the sleep and stress recommendations, a realistic Overall gain of +8 to +14 points is achievable — provided the measures are applied at least 5 out of 7 days.",
  disclaimer:
    "All information represents model-based performance insights derived from sample data. Not a substitute for medical diagnostics.",
  executive_findings: [
    {
      type: "weakness",
      headline: "Sleep as the limiting factor",
      body: "With a Sleep Score of 58/100 and an estimated sleep duration below 7.5h, this is the biggest lever. Insufficient deep sleep limits testosterone release, impairs glycogen resynthesis and extends recovery time by up to 40%.",
      related_dimension: "sleep",
    },
    {
      type: "strength",
      headline: "Solid metabolic foundation",
      body: "BMI 23.8 (Normal) and a Metabolic Score of 71 indicate a healthy body composition. This foundation protects against insulin-resistance-driven performance losses and forms the basis for sustainable progression.",
      related_dimension: "metabolic",
    },
    {
      type: "connection",
      headline: "Stress–Sleep–Recovery cascade",
      body: "Your Stress Score (52) and Sleep Score (58) reinforce each other negatively. Chronically elevated cortisol delays sleep onset and reduces REM phases — which in turn reduces the stress buffer for the following day.",
      related_dimension: "stress",
    },
  ],
  cross_insights: [
    {
      dimension_a: "sleep",
      dimension_b: "stress",
      headline: "Sleep × Stress: The daily feedback loop",
      body: "Every night with under 7h of sleep measurably raises cortisol the next day. That's why your Stress Score (52) fails to climb above 65 despite moderate activity: the stressor 'sleep deprivation' works against every other intervention.",
    },
    {
      dimension_a: "vo2max",
      dimension_b: "activity",
      headline: "VO2max × Activity: The intensity gap",
      body: "Your VO2max (74) sits above your Activity Score (67). This indicates you have adequate cardiovascular fitness but training intensity doesn't consistently reach the VO2max-relevant zone (>80% MHR).",
    },
    {
      dimension_a: "metabolic",
      dimension_b: "activity",
      headline: "Metabolic × Sitting time: The silent antagonist",
      body: "Despite a solid BMI and Metabolic Score (71), approximately 8h/day of sitting limits the result. Studies show: >6h sitting/day is an independent CVD risk factor — regardless of training volume.",
    },
  ],
  daily_life_protocol: {
    morning: [
      { habit: "500 ml water + 10 min sunlight before your first coffee", why_specific_to_user: "Your morning cortisol is already elevated at Stress 52 — sunlight stabilises it and prevents the midday crash.", time_cost_min: 10 },
      { habit: "30 g protein at breakfast (e.g. quark + berries + nuts)", why_specific_to_user: "Stabilises blood sugar for the next 4h and prevents cravings before lunch.", time_cost_min: 5 },
      { habit: "3 deep breaths before looking at your phone", why_specific_to_user: "Delays the sympathetic trigger by 2–3 minutes — measurably less stress reactivity throughout the day.", time_cost_min: 1 },
    ],
    work_day: [
      { habit: "Stand up and move for 2 min every 45–60 min", why_specific_to_user: "Your 8h/day sitting time is the biggest lever for your Metabolic Score (71) — brief interruptions measurably reduce CVD risk.", time_cost_min: 2 },
      { habit: "10 min walk outside at lunch (without phone)", why_specific_to_user: "Lowers the cortisol peak and activates parasympathetic recovery — important at Stress 52.", time_cost_min: 10 },
    ],
    evening: [
      { habit: "Caffeine cut-off at 14:00", why_specific_to_user: "Caffeine half-life 5–7h — with your Sleep Score of 58, this is the quickest lever for deep sleep.", time_cost_min: 0 },
      { habit: "Screen cut-off 45 min before bed", why_specific_to_user: "Blue light suppresses melatonin and degrades your REM phase — direct impact on morning Recovery Score.", time_cost_min: 0 },
      { habit: "Bedroom temperature 17–19 °C", why_specific_to_user: "Core temperature must drop for sleep onset — with an irregular routine this is the most reliable sleep-onset trigger.", time_cost_min: 2 },
    ],
    nutrition_micro: [
      { habit: "Protein target: 1.6 g/kg body weight spread across 3–4 meals", why_specific_to_user: "Foundation for muscle preservation given your moderate training activity (67).", time_cost_min: 0 },
      { habit: "4+ portions of vegetables daily as the default", why_specific_to_user: "Stabilises Metabolic Score (71) and provides micronutrients that directly support recovery.", time_cost_min: 5 },
    ],
    total_time_min_per_day: 35,
  },
  action_plan: [
    {
      headline: "Stabilise sleep at 7.5–8h",
      current_value: "Avg 7.2h, irregular",
      target_value: "Avg 7.8h, ±20 min deviation",
      metric_source: "7-day sleep duration tracking",
      week_milestones: [
        { week: "Week 1", task: "Fix sleep time", milestone: "7× in bed on time" },
        { week: "Week 2", task: "Reduce screen time", milestone: "No screen 45 min before sleep" },
        { week: "Week 3–4", task: "Stabilise routine", milestone: "Avg 7.8h achieved" },
      ],
    },
    {
      headline: "Install stress downregulation",
      current_value: "No daily protocol",
      target_value: "2× daily 5-min break",
      metric_source: "14-day streak",
      week_milestones: [
        { week: "Week 1", task: "Morning slot", milestone: "Box breathing 7× mornings" },
        { week: "Week 2", task: "Add midday slot", milestone: "14-day streak started" },
        { week: "Week 3–4", task: "Automate", milestone: "Habit anchored" },
      ],
    },
    {
      headline: "Add VO2max stimuli",
      current_value: "No dedicated interval training",
      target_value: "1× per week 4×4 interval",
      metric_source: "+3 points Fitness Score in 30 days",
      week_milestones: [
        { week: "Week 1", task: "First 4×4 interval", milestone: "Test session completed" },
        { week: "Week 2–3", task: "Build consistency", milestone: "2× interval integrated" },
        { week: "Week 4", task: "Score check", milestone: "+3 points VO2max expected" },
      ],
    },
  ],
  modules: {
    sleep: {
      score_context:
        "Your Sleep Score is 58/100 with an average sleep duration of 7.2h. The rating places you in 'Adequate' — you sleep enough, but not optimally.",
      key_finding:
        "The combination of sleep duration (just below optimum) and an irregular routine leads to incomplete deep-sleep regeneration. The recovery multiplier pulls the overall score down.",
      systemic_connection:
        "Sleep is the governor for recovery: the sleep multiplier caps regeneration — regardless of training quality.",
      limitation:
        "Sleep quality and routine consistency are the primary bottlenecks. Variability between weekdays and weekends destabilises the circadian rhythm.",
      recommendation:
        "Fix bed and wake times to within ±30 min across all 7 days. Bedroom temperature 17–19°C. No screens 45 min before sleep.",
    },
    recovery: {
      score_context:
        "Recovery Score 51/100 in the 'Moderate' band — calculated from training load, subjective recovery and the sleep and stress governors.",
      key_finding:
        "Your recovery capacity keeps pace with training load, but without reserve. Sleep and stress multipliers limit the overall result.",
      systemic_connection:
        "Recovery is the product of training signal × sleep × stress. No single lever is enough if any one of the three factors is limited.",
      overtraining_signal: null,
      limitation:
        "Sleep and stress multipliers are operating below capacity, dragging the overall value down.",
      recommendation:
        "Periodise: one high-intensity week followed by a deload week. Simultaneously stabilise sleep above 7.5h.",
    },
    activity: {
      score_context:
        "Your Activity Score of 67/100 is based on 1,640 MET-minutes per week — IPAQ category MODERATE.",
      key_finding:
        "Training and everyday activity place you in the 'Moderate' band. You are quantitatively within the recommended range — but only just.",
      systemic_connection:
        "Activity drives VO2max directly and has a secondary positive effect on sleep quality and metabolic health.",
      met_context:
        "WHO reference: 150–300 min moderate activity/week ≈ 20–21% lower mortality risk (AHA 2022).",
      sitting_flag: null,
      limitation:
        "Training volume is at the WHO minimum recommendation. Intensity peaks and Zone 2 cardio are largely absent.",
      recommendation:
        "Add 1 VO2max interval and 1 Zone 2 session (45–60 min at 60–70% MHR) to your current 3 training days per week.",
    },
    metabolic: {
      score_context:
        "Metabolic Score 71/100 at BMI 23.8 (Normal) — interaction of body composition, hydration, meal timing and sitting time.",
      key_finding:
        "Metabolic classification lands in the 'Solid' band. Body composition is optimal, but high sitting time (8h/day) limits the potential.",
      systemic_connection:
        "Sitting time is an independent CVD risk factor regardless of sport (AHA Science Advisory). Metabolic influences VO2max indirectly via BMI.",
      bmi_context:
        "BMI is a population-based estimate, not an individual health marker. Muscular body composition biases it upward.",
      limitation:
        "Sitting time and meal rhythm limit the metabolic baseline.",
      recommendation:
        "Drink 30–35 ml/kg body weight daily. Break sitting blocks after max 45 min. 4+ vegetable portions as the daily standard.",
    },
    stress: {
      score_context:
        "Stress Score 52/100 (Elevated) — weighted combination of self-reported stress level and sleep/recovery buffer.",
      key_finding:
        "Stress regulation is in the 'Elevated' band. The chronic load level consumes resources that would otherwise flow into adaptation.",
      systemic_connection:
        "Chronic stress suppresses the HPG axis (testosterone ↓) AND impairs insulin sensitivity — the widest-reaching lever in the system.",
      hpa_context: null,
      limitation:
        "Absence of deliberate downregulation prevents complete parasympathetic recovery.",
      recommendation:
        "Install two 5-min downregulation windows per day: Box Breathing 4-4-4-4 morning + midday.",
    },
    vo2max: {
      score_context:
        "Estimated VO2max: 46.2 ml/kg/min (Good) — algorithmic estimate based on age, BMI and activity category.",
      key_finding:
        "Cardiorespiratory performance is in the 'Good' band. VO2max is one of the strongest single predictors of long-term performance and longevity.",
      systemic_connection:
        "VO2max is directly linked to activity level — the only lever for improvement is activity with an intensity component.",
      fitness_context:
        "46.2 ml/kg/min places a 32-year-old male in the upper-middle range (Cooper Institute / ACSM norms).",
      estimation_note:
        "Non-exercise estimate, not a measured lab value. For high-precision diagnostics: cardiopulmonary exercise test.",
      limitation:
        "Plateau risk without periodised intensity progression.",
      recommendation:
        "1× per week 4×4 interval (4 min at 90–95% MHR, 3 min active rest). Norwegian 4×4 Protocol.",
    },
  },
};

const IT: PdfReportContent = {
  headline: "Indice di Performance 65/100 — buono con chiaro potenziale di ottimizzazione.",
  executive_summary:
    "Il tuo Indice di Performance Complessivo è 65/100 (Buono). Le cinque dimensioni offrono un quadro chiaro: Sonno 58, Recovery 51, Attività 67, Metabolismo 71 e Stress 52. La leva più potente per il prossimo salto qualitativo si trova nel sonno e nella regolazione dello stress.",
  critical_flag: null,
  top_priority:
    "Leva n. 1: Sonno & Recovery. Una routine di sonno costante con obiettivo 7,5–8h può alzare il tuo punteggio complessivo di +8 a +12 punti in 30 giorni — e trascina automaticamente con sé Stress, Recovery e qualità dell'attività.",
  systemic_connections_overview:
    "Sonno, Stress e Recovery formano un triangolo: ognuno dei tre fattori limita gli altri due. La tua Attività (67) e il tuo Metabolismo (71) mostrano valori di partenza solidi — ma senza un recupero stabile queste dimensioni stagneranno a lungo termine.",
  prognose_30_days:
    "Con un'implementazione costante delle raccomandazioni su sonno e stress, un guadagno realistico nel punteggio complessivo di +8 a +14 punti è raggiungibile — a condizione che le misure vengano applicate almeno 5 giorni su 7.",
  disclaimer:
    "Tutte le informazioni sono insight di performance basati su modelli e dati campione esemplificativi. Non sostituiscono una diagnostica medica.",
  executive_findings: [
    {
      type: "weakness",
      headline: "Il sonno come fattore limitante",
      body: "Con un punteggio Sonno di 58/100 e una durata stimata inferiore a 7,5h, qui si trova la leva più grande. Il sonno profondo insufficiente limita il rilascio di testosterone, compromette la risintesi del glicogeno e prolunga il tempo di recupero fino al 40%.",
      related_dimension: "sleep",
    },
    {
      type: "strength",
      headline: "Base metabolica solida",
      body: "BMI 23,8 (Normale) e un punteggio Metabolico di 71 indicano una composizione corporea sana. Questa base protegge dalle perdite di prestazione legate alla resistenza all'insulina e costituisce il fondamento per una progressione sostenibile.",
      related_dimension: "metabolic",
    },
    {
      type: "connection",
      headline: "Cascata Stress–Sonno–Recovery",
      body: "Il tuo punteggio Stress (52) e il punteggio Sonno (58) si rinforzano negativamente a vicenda. Il cortisolo cronicamente elevato ritarda l'inizio del sonno e riduce le fasi REM — il che a sua volta riduce il buffer per lo stress del giorno successivo.",
      related_dimension: "stress",
    },
  ],
  cross_insights: [
    {
      dimension_a: "sleep",
      dimension_b: "stress",
      headline: "Sonno × Stress: Il ciclo di feedback quotidiano",
      body: "Ogni notte con meno di 7h di sonno aumenta misurabilmente il cortisolo il giorno dopo. Questo spiega perché il tuo punteggio Stress (52) non riesce a salire oltre 65 nonostante l'attività moderata: il fattore stressante 'privazione del sonno' lavora contro ogni altro intervento.",
    },
    {
      dimension_a: "vo2max",
      dimension_b: "activity",
      headline: "VO2max × Attività: Il gap di intensità",
      body: "Il tuo VO2max (74) è superiore al tuo punteggio Attività (67). Questo indica che hai una fitness cardiovascolare adeguata, ma l'intensità dell'allenamento non raggiunge costantemente la zona rilevante per il VO2max (>80% FCmax).",
    },
    {
      dimension_a: "metabolic",
      dimension_b: "activity",
      headline: "Metabolismo × Sedentarietà: L'antagonista silenzioso",
      body: "Nonostante un BMI solido e un punteggio Metabolico (71), circa 8h/giorno da seduto limitano il risultato. Gli studi mostrano: >6h seduto/giorno è un fattore di rischio cardiovascolare indipendente — indipendentemente dal volume di allenamento.",
    },
  ],
  daily_life_protocol: {
    morning: [
      { habit: "500 ml d'acqua + 10 min di luce solare prima del primo caffè", why_specific_to_user: "Il tuo cortisolo mattutino è già elevato con Stress 52 — la luce solare lo stabilizza e previene il crollo pomeridiano.", time_cost_min: 10 },
      { habit: "30 g di proteine a colazione (es. quark + frutti di bosco + noci)", why_specific_to_user: "Stabilizza la glicemia per le successive 4h e previene i picchi di fame prima di pranzo.", time_cost_min: 5 },
      { habit: "3 respiri profondi prima di guardare il telefono", why_specific_to_user: "Ritarda il trigger del sistema simpatico di 2–3 minuti — reattività allo stress misurabilmente inferiore durante la giornata.", time_cost_min: 1 },
    ],
    work_day: [
      { habit: "Alzarsi e muoversi 2 min ogni 45–60 min", why_specific_to_user: "Le tue 8h/giorno seduto sono la leva principale per il tuo punteggio Metabolico (71) — brevi interruzioni riducono misurabilmente il rischio cardiovascolare.", time_cost_min: 2 },
      { habit: "10 min di camminata all'aperto a pranzo (senza telefono)", why_specific_to_user: "Riduce il picco di cortisolo e attiva il recupero parasimpatico — importante con Stress 52.", time_cost_min: 10 },
    ],
    evening: [
      { habit: "Limite caffeina alle 14:00", why_specific_to_user: "Emivita della caffeina 5–7h — con il tuo punteggio Sonno di 58 questa è la leva più rapida per il sonno profondo.", time_cost_min: 0 },
      { habit: "Stop schermi 45 min prima di dormire", why_specific_to_user: "La luce blu sopprime la melatonina e degrada la fase REM — effetto diretto sul punteggio Recovery mattutino.", time_cost_min: 0 },
      { habit: "Temperatura camera da letto 17–19 °C", why_specific_to_user: "La temperatura corporea deve scendere per l'inizio del sonno — con una routine irregolare è il trigger più affidabile.", time_cost_min: 2 },
    ],
    nutrition_micro: [
      { habit: "Obiettivo proteico: 1,6 g/kg di peso corporeo distribuiti su 3–4 pasti", why_specific_to_user: "Fondamento per il mantenimento muscolare data la tua attività fisica moderata (67).", time_cost_min: 0 },
      { habit: "4+ porzioni di verdure al giorno come standard", why_specific_to_user: "Stabilizza il punteggio Metabolico (71) e fornisce micronutrienti che supportano direttamente il recupero.", time_cost_min: 5 },
    ],
    total_time_min_per_day: 35,
  },
  action_plan: [
    {
      headline: "Stabilizzare il sonno a 7,5–8h",
      current_value: "Media 7,2h, irregolare",
      target_value: "Media 7,8h, deviazione ±20 min",
      metric_source: "Monitoraggio durata sonno 7 giorni",
      week_milestones: [
        { week: "Settimana 1", task: "Fissare l'orario di sonno", milestone: "7× a letto puntuale" },
        { week: "Settimana 2", task: "Ridurre il tempo schermo", milestone: "Nessuno schermo 45 min prima del sonno" },
        { week: "Settimana 3–4", task: "Stabilizzare la routine", milestone: "Media 7,8h raggiunta" },
      ],
    },
    {
      headline: "Installare la downregolazione dello stress",
      current_value: "Nessun protocollo quotidiano",
      target_value: "2× al giorno pausa da 5 min",
      metric_source: "Streak di 14 giorni",
      week_milestones: [
        { week: "Settimana 1", task: "Slot mattutino", milestone: "Box breathing 7× al mattino" },
        { week: "Settimana 2", task: "Aggiungere slot di mezzogiorno", milestone: "Streak di 14 giorni iniziato" },
        { week: "Settimana 3–4", task: "Automatizzare", milestone: "Abitudine ancorata" },
      ],
    },
    {
      headline: "Aggiungere stimoli VO2max",
      current_value: "Nessun allenamento intervallato dedicato",
      target_value: "1× settimana intervallo 4×4",
      metric_source: "+3 punti Fitness Score in 30 giorni",
      week_milestones: [
        { week: "Settimana 1", task: "Primo intervallo 4×4", milestone: "Sessione test completata" },
        { week: "Settimana 2–3", task: "Costruire la regolarità", milestone: "2× intervalli integrati" },
        { week: "Settimana 4", task: "Controllo punteggio", milestone: "+3 punti VO2max attesi" },
      ],
    },
  ],
  modules: {
    sleep: {
      score_context:
        "Il tuo punteggio Sonno è 58/100 con una durata media di 7,2h. La valutazione ti colloca in 'Sufficiente' — dormi abbastanza, ma non in modo ottimale.",
      key_finding:
        "La combinazione di durata del sonno (leggermente sotto l'ottimale) e routine irregolare porta a una rigenerazione incompleta del sonno profondo. Il moltiplicatore di recupero trascina verso il basso il punteggio complessivo.",
      systemic_connection:
        "Il sonno è il regolatore del recupero: il moltiplicatore del sonno limita la rigenerazione — indipendentemente dalla qualità dell'allenamento.",
      limitation:
        "La qualità del sonno e la coerenza della routine sono i colli di bottiglia principali. La variabilità tra giorni feriali e weekend destabilizza il ritmo circadiano.",
      recommendation:
        "Fissa orari di coricamento e sveglia entro ±30 min per tutti i 7 giorni. Temperatura camera 17–19°C. Nessuno schermo 45 min prima di dormire.",
    },
    recovery: {
      score_context:
        "Punteggio Recovery 51/100 nella fascia 'Moderato' — calcolato dal carico di allenamento, dal recupero soggettivo e dai regolatori sonno e stress.",
      key_finding:
        "La capacità di recupero tiene il passo con il carico di allenamento, ma senza riserva. I moltiplicatori di sonno e stress limitano il risultato complessivo.",
      systemic_connection:
        "Il recupero è il prodotto del segnale di allenamento × sonno × stress. Nessuna singola leva è sufficiente se uno dei tre fattori è limitato.",
      overtraining_signal: null,
      limitation:
        "I moltiplicatori di sonno e stress operano sotto capacità, trascinando verso il basso il valore complessivo.",
      recommendation:
        "Periodizzare: una settimana ad alta intensità seguita da una settimana di scarico. Contemporaneamente stabilizzare il sonno sopra 7,5h.",
    },
    activity: {
      score_context:
        "Il tuo punteggio Attività di 67/100 si basa su 1.640 minuti MET per settimana — categoria IPAQ MODERATA.",
      key_finding:
        "L'attività di allenamento e quotidiana ti posiziona nella fascia 'Moderato'. Quantitativamente sei nell'intervallo raccomandato — ma solo appena.",
      systemic_connection:
        "L'attività guida direttamente il VO2max e ha un effetto secondario positivo sulla qualità del sonno e sulla salute metabolica.",
      met_context:
        "Riferimento OMS: 150–300 min di attività moderata/settimana ≈ rischio di mortalità inferiore del 20–21% (AHA 2022).",
      sitting_flag: null,
      limitation:
        "Il volume di allenamento è al livello minimo raccomandato dall'OMS. Picchi di intensità e cardio in Zona 2 sono largamente assenti.",
      recommendation:
        "Aggiungere 1 intervallo VO2max e 1 sessione Zona 2 (45–60 min al 60–70% FCmax) agli attuali 3 giorni di allenamento settimanali.",
    },
    metabolic: {
      score_context:
        "Punteggio Metabolico 71/100 con BMI 23,8 (Normale) — interazione di composizione corporea, idratazione, ritmo dei pasti e tempo seduto.",
      key_finding:
        "La classificazione metabolica atterra nella fascia 'Solido'. La composizione corporea è ottimale, ma un elevato tempo seduto (8h/giorno) ne limita il potenziale.",
      systemic_connection:
        "Il tempo seduto è un fattore di rischio cardiovascolare indipendente dallo sport (AHA Science Advisory). Il metabolismo influenza indirettamente il VO2max tramite il BMI.",
      bmi_context:
        "Il BMI è una stima basata sulla popolazione, non un indicatore sanitario individuale. Una composizione corporea muscolare lo distorce verso l'alto.",
      limitation:
        "Il tempo seduto e il ritmo dei pasti limitano il metabolismo basale.",
      recommendation:
        "Bere 30–35 ml/kg di peso corporeo al giorno. Interrompere i blocchi di sedentarietà dopo max 45 min. 4+ porzioni di verdure come standard quotidiano.",
    },
    stress: {
      score_context:
        "Punteggio Stress 52/100 (Elevato) — combinazione ponderata del livello di stress auto-riferito e del buffer sonno/recupero.",
      key_finding:
        "La regolazione dello stress è nella fascia 'Elevato'. Il livello di carico cronico consuma risorse che altrimenti fluirebbero nell'adattamento.",
      systemic_connection:
        "Lo stress cronico sopprime l'asse HPG (testosterone ↓) E compromette la sensibilità all'insulina — la leva con il più ampio impatto nel sistema.",
      hpa_context: null,
      limitation:
        "L'assenza di downregolazione consapevole impedisce il recupero parasimpatico completo.",
      recommendation:
        "Installare due finestre di downregolazione da 5 min al giorno: respirazione a box 4-4-4-4 mattina + mezzogiorno.",
    },
    vo2max: {
      score_context:
        "VO2max stimato: 46,2 ml/kg/min (Buono) — stima algoritmica basata su età, BMI e categoria di attività.",
      key_finding:
        "La performance cardiorespiratoria è nella fascia 'Buono'. Il VO2max è uno dei predittori singoli più forti per la performance a lungo termine e la longevità.",
      systemic_connection:
        "Il VO2max è direttamente collegato al livello di attività — l'unica leva per migliorarlo è l'attività con una componente di intensità.",
      fitness_context:
        "46,2 ml/kg/min colloca un uomo di 32 anni nel range medio-alto (norme Cooper Institute / ACSM).",
      estimation_note:
        "Stima non di laboratorio, non un valore misurato. Per diagnostica ad alta precisione: test cardiopolmonare da sforzo.",
      limitation:
        "Rischio di plateau senza progressione di intensità periodizzata.",
      recommendation:
        "1× a settimana intervallo 4×4 (4 min al 90–95% FCmax, 3 min di pausa attiva). Protocollo Norwegian 4×4.",
    },
  },
};

const LOCALE_MAP: Record<string, PdfReportContent> = { de: DE, en: EN, it: IT };

export function getSamplePdfContent(locale: string): PdfReportContent {
  return LOCALE_MAP[locale] ?? DE;
}

export function getSamplePdfScores(locale: string): PdfScores {
  const BANDS: Record<string, { overall: string; activity: string; sleep: string; vo2max: string; metabolic: string; stress: string; recovery: string }> = {
    de: { overall: "gut", activity: "moderat aktiv", sleep: "ausreichend", vo2max: "gut", metabolic: "solide", stress: "erhöht", recovery: "moderat" },
    en: { overall: "good", activity: "moderately active", sleep: "adequate", vo2max: "good", metabolic: "solid", stress: "elevated", recovery: "moderate" },
    it: { overall: "buono", activity: "moderatamente attivo", sleep: "sufficiente", vo2max: "buono", metabolic: "solido", stress: "elevato", recovery: "moderato" },
    tr: { overall: "iyi", activity: "orta aktif", sleep: "yeterli", vo2max: "iyi", metabolic: "sağlam", stress: "yüksek", recovery: "orta" },
  };
  const b = BANDS[locale] ?? BANDS.de;
  return {
    overall:   { score: 65, band: b.overall },
    activity:  { score: 67, band: b.activity },
    sleep:     { score: 58, band: b.sleep },
    vo2max:    { score: 74, band: b.vo2max, estimated: 46.2 },
    metabolic: { score: 71, band: b.metabolic },
    stress:    { score: 52, band: b.stress },
    recovery:  { score: 51, band: b.recovery },
    total_met: 1640,
    training_days: 3,
    sitting_hours: 8,
    sleep_duration_hours: 7.2,
  };
}
