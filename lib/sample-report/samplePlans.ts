import type { PlanContent } from "@/lib/plan/buildPlan";
import { PLAN_COLORS } from "@/lib/plan/buildPlan";

type SamplePlansMap = Record<string, PlanContent>;

const DE: SamplePlansMap = {
  activity: {
    title: "ACTIVITY-PLAN",
    subtitle: "Individueller Plan zur Verbesserung deiner Aktivitätswerte",
    color: PLAN_COLORS.activity,
    source: "Basiert auf: WHO Global Action Plan 2018–2030, ACSM Exercise Guidelines, IPAQ Short Form, Ainsworth MET Compendium (2011)",
    score: 67,
    blocks: [
      {
        heading: "Deine Ausgangslage",
        items: [
          "Activity Score: 67/100 (gut)",
          "MET-Minuten/Woche: 1640 (WHO-Ziel: ≥600 MET-min/Woche)",
          "WHO-Mindestempfehlung bereits erfüllt.",
        ],
        rationale:
          "Dein Activity Score basiert auf dem IPAQ Short Form (International Physical Activity Questionnaire) — einem weltweit validierten Erhebungsinstrument, das in über 50 Ländern klinisch erprobt wurde (Craig et al., 2003). MET-Minuten (Metabolic Equivalent of Task × Minuten) quantifizieren den Energieaufwand relativ zur Ruherate. Gehen entspricht 3,3 MET, moderate Aktivität 4,0 MET, intensive Aktivität 8,0 MET nach dem Ainsworth Compendium. Das Erreichen des WHO-Minimums ist bereits eine starke Basis — das Potenzial liegt jetzt in Optimierung, nicht im Einstieg.",
      },
      {
        heading: "Wochenziel (WHO/ACSM-Standard)",
        items: [
          "≥150 Min moderate Aktivität ODER ≥75 Min intensive Aktivität pro Woche",
          "≥2× Krafttraining pro Woche (alle Hauptmuskelgruppen)",
          "Sitzzeit auf max. 8 h/Tag begrenzen — jede Stunde kurze Bewegungspause",
          "Performance: 5×/Woche strukturiertes Training, Periodisierung einführen",
        ],
        rationale:
          "Die Empfehlung von 150 Min/Woche moderater Aktivität ist keine willkürliche Zahl: Prospektivstudien mit über 655.000 Teilnehmern zeigen, dass bereits dieses Minimum das Sterblichkeitsrisiko um 31 % gegenüber Inaktivität senkt (Arem et al., JAMA Internal Medicine, 2015). Krafttraining 2×/Woche ist essenziell, weil Ausdauertraining allein keine ausreichende Muskelproteinsyntheseaktivierung liefert — Muskelmasse ist ein unabhängiger Prädiktor für metabolische Gesundheit und Langlebigkeit (McLeod et al., 2019). Sitzunterbrechungen alle 60 Min senken postprandiale Glukosespiegel messbar, unabhängig vom Gesamttraining (Dunstan et al., Diabetes Care, 2012).",
      },
      {
        heading: "Wochenplan (Beispiel)",
        items: [
          "Montag: 30–45 Min Ausdauer (Laufen/Radfahren) — moderate Intensität",
          "Dienstag: 30 Min Krafttraining (Ganzkörper)",
          "Mittwoch: Aktive Erholung — 20–30 Min Gehen oder Yoga",
          "Donnerstag: 30–45 Min Ausdauer — höhere Intensität (Intervalle)",
          "Freitag: 30 Min Krafttraining (Ganzkörper)",
          "Samstag: 45–60 Min Sport deiner Wahl",
          "Sonntag: Erholung — leichte Bewegung optional",
        ],
        rationale:
          "Die Wochenstruktur folgt dem Prinzip der Periodisierung und dem FITT-Modell (Frequency, Intensity, Time, Type) der ACSM. Wechselnde Intensitäten (moderate Ausdauer + Intervalle) optimieren sowohl aerobe Kapazität als auch anaerobe Schwelle. Der aktive Erholungstag (Mittwoch) fördert den venösen Rückfluss und reduziert Muskelkater (DOMS) ohne die Erholung zu verlangsamen. Zwei Kraft-Einheiten mit je einem Ruhetag dazwischen entsprechen dem ACSM-Standard für Muskelaufbau.",
      },
      {
        heading: "Monitoring & Progression",
        items: [
          "Schrittziel: ≥8.000 Schritte/Tag als Basis",
          "MET-Minuten pro Woche mit Fitness-App tracken",
          "Alle 4 Wochen: Trainingsvolumen um 5–10 % steigern (progressive Überladung, ACSM)",
          "Alle 8 Wochen: Neue Analyse durchführen um Fortschritt zu messen",
        ],
        rationale:
          "8.000 Schritte/Tag ist der wissenschaftlich validierte Schwellenwert, ab dem signifikante Reduktionen der kardiovaskulären Sterblichkeit und Diabetes-Inzidenz nachweisbar sind (Paluch et al., JAMA Neurology, 2022). Die 5–10 % Steigerungsregel pro Monat basiert auf dem Prinzip der progressiven Überladung nach DeLorme (1945). Eine Neuanalyse alle 8 Wochen ist sinnvoll, weil sich kardiorespiratorische Fitness nach 6–8 Wochen konsistenten Trainings messbar verändert.",
      },
      {
        heading: "Deine erste Woche — Start-Protokoll",
        items: [
          "Tag 1–2: Ausdauer-Einheit 30 Min bei 65 % HFmax — Basislinie setzen",
          "Tag 3: Erstes Krafttraining — 3 Übungen Ganzkörper (Squat, Push-up, Row), je 3×10",
          "Tag 4: Aktive Pause — 20 Min Spaziergang, kein strukturiertes Training",
          "Tag 5–6: Wiederholung Wochenschema — Ausdauer + Kraft alternierend",
          "Tag 7: Ruhetag — Reflektiere: Was hat geklappt? Was anpassen?",
          "Woche 2: Volumen um 10 % steigern (1 Satz mehr oder 5 Min länger)",
        ],
        rationale:
          "Der erste Schritt ist der schwierigste: Habit-Formation-Forschung zeigt, dass eine neue Gewohnheit im Schnitt 66 Tage braucht, bis sie automatisch wird (Lally et al., 2010). Der Schlüssel in Woche 1 ist nicht maximale Leistung, sondern Konsistenz. 'Minimum Effective Dose' — das kleinste Training, das noch Adaptation erzeugt — ist in der ersten Woche die klügste Strategie.",
      },
    ],
  },

  metabolic: {
    title: "METABOLIC-PLAN",
    subtitle: "Individueller Plan zur Optimierung deiner metabolischen Performance",
    color: PLAN_COLORS.metabolic,
    source: "Basiert auf: WHO BMI-Klassifikation, EFSA Nährwertempfehlungen, DGE Ernährungskreis, ISSN Position Stand 2017",
    score: 71,
    blocks: [
      {
        heading: "Deine Ausgangslage",
        items: [
          "Metabolic Score: 71/100",
          "BMI: 23,8 kg/m² — Kategorie: Normal (WHO-Klassifikation)",
          "WHO-Normalbereich: 18,5–24,9 kg/m²",
        ],
        rationale:
          "Der BMI (Body Mass Index = Körpergewicht / Körpergröße²) ist das Standard-Screening-Tool der WHO für kardiovaskuläre und metabolische Risiken. Bei einem BMI von 23,8 (Normal): Jeder BMI-Punkt über 25 erhöht das Risiko für Typ-2-Diabetes um ca. 7 %, Hypertonie um ca. 5 % und kardiovaskuläre Erkrankungen um ca. 4 % (Prospective Studies Collaboration, Lancet, 2009). Der Metabolic Score kombiniert BMI mit Aktivitätsdaten, da Muskulatur den BMI-Wert ohne gesundheitliches Risiko erhöhen kann — daher ist der Score kontextsensitiver als der BMI allein.",
      },
      {
        heading: "Ernährungs-Protokoll",
        items: [
          "Mahlzeitenfrequenz: 3 Hauptmahlzeiten, 1–2 Snacks — gleichmäßige Energieverteilung",
          "Proteinzufuhr: 1,6–2,2 g/kg Körpergewicht/Tag (ISSN-Empfehlung für aktive Personen)",
          "Kohlenhydrate: komplex und ballaststoffreich (Vollkorn, Hülsenfrüchte, Gemüse)",
          "Fett: ≥20 % der Gesamtenergie, Schwerpunkt ungesättigte Fettsäuren",
          "Gemüse & Obst: ≥400 g/Tag (WHO-Mindestempfehlung)",
        ],
        rationale:
          "Protein von 1,6–2,2 g/kg/Tag ist der ISSN-evidenzbasierte Bereich für optimale Muskelproteinsynthese (Morton et al., British Journal of Sports Medicine, 2018). Komplexe Kohlenhydrate mit niedrigem glykämischen Index reduzieren postprandiale Insulinspiegel und stabilisieren Energie. Ungesättigte Fettsäuren (Omega-3, Olivenöl) aktivieren anti-inflammatorische Signalwege und verbessern die Insulinsensitivität. ≥400 g Gemüse/Obst täglich senkt das Krebsrisiko um 10–15 % und liefert Mikronährstoffe für die Energiestoffwechsel-Enzyme.",
      },
      {
        heading: "Hydrations-Protokoll",
        items: [
          "Wasserbedarf: ca. 35 ml × Körpergewicht (kg) pro Tag als Richtwert",
          "Bei intensivem Training: +500–750 ml pro Trainingsstunde",
          "Morgens: 300–500 ml Wasser direkt nach dem Aufstehen",
          "Zuckerhaltige Getränke vollständig durch Wasser oder ungesüßten Tee ersetzen",
        ],
        rationale:
          "Bereits 2 % Dehydration verschlechtert die kognitive Leistung und reduziert die Kraft um bis zu 6 % (Sawka et al., Medicine & Science in Sports & Exercise, 2007). Das Morgenwasser (300–500 ml) rehydriert nach der natürlichen nächtlichen Dehydration und steigert den Grundumsatz kurzfristig um ca. 30 % über 30–40 Min durch thermogene Wirkung. Zuckerhaltige Getränke tragen durchschnittlich 150–300 kcal/Tag bei, ohne Sättigungseffekt — ihre Elimination ist eine der effizientesten Einzelmaßnahmen zur Kalorienreduktion.",
      },
      {
        heading: "Monitoring",
        items: [
          "Mahlzeiten für 2 Wochen tracken (App) — Muster erkennen",
          "Körpergewicht 1×/Woche (gleiche Uhrzeit, nüchtern) messen",
          "Ziel: nachhaltiger Gewichtsverlust max. 0,5–1 kg/Woche (WHO-Empfehlung)",
          "Alle 8 Wochen: Neue Analyse durchführen",
        ],
        rationale:
          "Selbst-Monitoring der Ernährung ist eine der am besten belegten Verhaltensinterventionen: eine Meta-Analyse zeigt, dass Ernährungs-Tracking das Gewichtsverlust-Outcome durchschnittlich verdoppelt (Burke et al., 2011). Wöchentliche Gewichtsmessung (statt täglich) reduziert die Variabilität durch Wassereinlagerungen. Das 0,5–1 kg/Woche-Ziel sichert, dass die Gewichtsabnahme primär aus Fettgewebe stammt.",
      },
      {
        heading: "Deine erste Woche — Ernährungs-Reset",
        items: [
          "Tag 1: Kühlschrank-Audit — Zuckerhaltige Getränke & Ultra-Processed Food entfernen",
          "Tag 2: Erster Tracking-Tag — alles was du isst in einer App notieren",
          "Tag 3–4: Proteinziel testen — zu jeder Mahlzeit eine Proteinquelle hinzufügen",
          "Tag 5: Wasserflasche (1,5 L) morgens füllen — Ziel: leer bis 18:00 Uhr",
          "Tag 6–7: Meal Prep — 2 Mahlzeiten für die nächste Woche vorkochen",
          "Woche 2: Makro-Tracking aktivieren — Protein-Ziel: 1,6 g/kg täglich erreichen",
        ],
        rationale:
          "Ernährungsumstellungen scheitern in 90 % der Fälle an fehlender Umgebungsgestaltung, nicht an mangelnder Motivation (Wansink & Sobal, 2007). Der Kühlschrank-Audit in Woche 1 nutzt das Prinzip der 'Friction Reduction': wenn Junkfood nicht verfügbar ist, wird es nicht gegessen. Meal Prep reduziert Entscheidungsermüdung — je mehr Mahlzeitenentscheidungen täglich getroffen werden, desto schlechter werden sie.",
      },
    ],
  },

  recovery: {
    title: "RECOVERY-PLAN",
    subtitle: "Individueller Plan zur Verbesserung deiner Regeneration",
    color: PLAN_COLORS.recovery,
    source: "Basiert auf: NSF Sleep Guidelines, PSQI-Skala, ACSM Recovery Protocols, Walker (2017) Why We Sleep",
    score: 58,
    blocks: [
      {
        heading: "Deine Ausgangslage",
        items: [
          "Sleep & Recovery Score: 58/100",
          "Schlafdauer-Band: 7–8h",
          "NSF-Empfehlung für Erwachsene (18–64 J.): 7–9 Stunden/Nacht",
        ],
        rationale:
          "Dein Sleep Score basiert auf dem PSQI (Pittsburgh Sleep Quality Index), einem klinisch validierten Instrument mit einem Kappa-Wert von 0,75 (gut übereinstimmend) gegenüber polysomnographischen Messungen. Der Score integriert Schlafdauer, Qualität, Einschlaflatenz und Erholungsgefühl. Unter 7 Stunden Schlaf sind nachweislich erhöhte Cortisol-Spiegel, reduzierte Insulinsensitivität (−20–30 %) und verschlechterte Immunfunktion (−70 % NK-Zell-Aktivität) dokumentiert (Walker, 2017; Spiegel et al., Lancet, 1999).",
      },
      {
        heading: "Schlaf-Hygiene-Protokoll",
        items: [
          "Feste Schlafenszeit und Aufwachzeit — auch am Wochenende (±30 min Toleranz)",
          "Schlafzimmer: 16–18 °C, vollständig abgedunkelt, keine Bildschirme",
          "Letzte Mahlzeit ≥2 h vor dem Schlafen",
          "Koffein: kein Konsum nach 14:00 Uhr",
          "Bildschirme (Blaulicht): ≥60 Min vor dem Schlafen abschalten oder Blaulichtfilter",
        ],
        rationale:
          "Die Schlafenszeit-Konsistenz ist entscheidend, weil der circadiane Rhythmus durch regelmäßige Licht-Dunkel-Zyklen synchronisiert wird — Abweichungen >1 h am Wochenende verursachen 'Social Jetlag', der mit einem 1,5-fach erhöhten Adipositas-Risiko assoziiert ist (Roenneberg et al., 2012). Raumtemperatur 16–18 °C unterstützt den natürlichen Körpertemperaturabfall für den Schlafbeginn. Koffein hat eine Halbwertszeit von 5–6 h — nach 14:00 Uhr eingenommenes Koffein ist um 23:00 Uhr noch zu 25–50 % aktiv.",
      },
      {
        heading: "Trainings-Recovery-Protokoll",
        items: [
          "Nach intensivem Training: ≥48 h Regenerationszeit für gleiche Muskelgruppe",
          "Aktive Erholung: 20 Min leichtes Ausdauertraining oder Spaziergang an Ruhetagen",
          "Kälteanwendung (Kältebad 10–15 °C, 10–15 Min): nachgewiesen entzündungshemmend",
          "Schlaf als primäres Recovery-Tool: jede Stunde zusätzlicher Schlaf reduziert Cortisol",
        ],
        rationale:
          "Die 48-Stunden-Regel für Muskelregeneration basiert auf der Kinetik der Muskelproteinsynthese (MPS): MPS bleibt nach intensivem Training 24–48 h erhöht — Training in diesem Zeitfenster auf dieselbe Gruppe stört die Synthese-Phase (Damas et al., 2016). Kältebäder (10–15 °C) aktivieren noradrenerge Systeme, reduzieren pro-inflammatorische Zytokine und beschleunigen die DOMS-Reduktion um ca. 20 % in Meta-Analysen (Hohenauer et al., PLOS ONE, 2015). Schlaf ist das potenteste Recovery-Tool: während des Tiefschlafs wird 70 % des täglichen Wachstumshormons ausgeschüttet.",
      },
      {
        heading: "Wochenstruktur",
        items: [
          "Mindestens 1 vollständiger Ruhetag pro Woche ohne strukturiertes Training",
          "Deload-Woche alle 4–6 Trainingswochen: Volumen um 40–50 % reduzieren",
          "Schlafqualität täglich bewerten (1–10) — Muster über 2 Wochen tracken",
        ],
        rationale:
          "Der Ruhetag ist keine Schwäche — er ist physiologisch notwendig: ohne regelmäßige Entlastung steigt der Cortisolspiegel chronisch an (Overtraining Syndrome, Kreher & Schwartz, 2012). Die Deload-Woche alle 4–6 Wochen erlaubt vollständige neuronale und strukturelle Anpassung, was nach der Deload-Woche oft zu einem 'Supercompensation Bounce' führt (Zatsiorsky & Kraemer, 2006). Tägliches Schlaf-Tracking über 14 Tage deckt Muster auf, die für Einzeltage unsichtbar sind.",
      },
      {
        heading: "Deine erste Woche — Sleep Protocol",
        items: [
          "Heute: Schlafenszeit festlegen (z.B. 23:00) und Wecker für selbe Zeit morgen setzen",
          "Ab sofort: Koffein nach 14:00 Uhr streichen — 7 Tage testen",
          "Tag 2: Schlafzimmer-Check — Verdunklung, Temperatur (16–18 °C), Geräte außerhalb laden",
          "Tag 3–7: 30 Min vor Schlaf kein Bildschirm — Ersatz: Buch, leichtes Stretching, Journaling",
          "Täglich: Schlafqualität morgens auf einer 1–10-Skala notieren",
          "Nach 7 Tagen: Durchschnitt berechnen — unter 6 bedeutet weitere Hygiene-Optimierung",
        ],
        rationale:
          "Sleep hygiene interventions sind die evidenzbasierte Erstbehandlung bei Schlafproblemen (CBT-I) — vor jeder Medikation. Der wichtigste Einzel-Faktor ist die konsistente Aufstehzeit: Sie ankert den circadianen Rhythmus. Die 30-Min-Bildschirmpause reduziert blaues Licht (460–490 nm), das die Melatonin-Suppression um bis zu 85 % verursachen kann (Harvard Medical School, 2012).",
      },
    ],
  },

  stress: {
    title: "STRESS & LIFESTYLE-PLAN",
    subtitle: "Individueller Plan zur Optimierung von Stress und Lifestyle",
    color: PLAN_COLORS.stress,
    source: "Basiert auf: WHO Mental Health Guidelines, APA Stress Management, MBSR Kabat-Zinn, Cohen PSS-10 Skala",
    score: 52,
    blocks: [
      {
        heading: "Deine Ausgangslage",
        items: [
          "Stress & Lifestyle Score: 52/100",
          "Stress-Band: Erhöht",
          "Chronischer Stress erhöht Cortisol → beeinträchtigt Schlaf, Metabolismus und Immunsystem",
        ],
        rationale:
          "Dein Stress Score basiert auf der PSS-10 (Perceived Stress Scale, Cohen et al., 1983) — dem am häufigsten zitierten Stressmessinstrument weltweit. Das Stress-Band 'Erhöht' reflektiert die wahrgenommene Kontrollierbarkeit und Überlastung. Chronisch erhöhtes Cortisol ist kausal mit Hippocampus-Atrophie (−5–10 % Volumenreduktion), erhöhter viszeraler Fettakkumulation, gestörter Glucoseregulation und supprimierter Immunantwort assoziiert (McEwen, 2007). Gezielte Interventionen können innerhalb von 8 Wochen messbare neurobiologische Veränderungen erzeugen.",
      },
      {
        heading: "Tägliches Stress-Protokoll",
        items: [
          "Morgenroutine: 10 Min strukturierte Entspannung (Atemübung, Meditation oder Journaling)",
          "Atemtechnik 4-7-8: 4 s einatmen, 7 s halten, 8 s ausatmen — aktiviert Parasympathikus",
          "Mittagspause: 15–20 Min ohne Bildschirm und ohne Arbeitsbezug",
          "Abendroutine: To-do-Liste für morgen schreiben → Gedanken aus dem Kopf auslagern",
        ],
        rationale:
          "Bereits 10 Min tägliche Meditation über 8 Wochen reduziert die Amygdala-Dichte und erhöht die präfrontale Kortexaktivität messbar im MRT — das ist der neurobiologische Mechanismus hinter MBSR (Hölzel et al., Psychiatry Research, 2011). Die 4-7-8-Atemtechnik verlängert die Ausatmung, was den Vagusnerv stimuliert und die Herzratenvariabilität (HRV) erhöht. Journaling reduziert nachweislich emotionalen Leidensdruck durch kognitive Neustrukturierung (Pennebaker & Smyth, 2016).",
      },
      {
        heading: "Lifestyle-Optimierung",
        items: [
          "Digitale Auszeiten: 1–2 h/Tag komplett offline (kein Smartphone, kein Social Media)",
          "Soziale Kontakte: regelmäßige Face-to-Face-Interaktionen — nachgewiesen stressreduzierend",
          "Natur: 20 Min in natürlicher Umgebung senken Cortisol messbar (Studie: Univ. Michigan)",
          "Alkohol limitieren: >14 Einheiten/Woche erhöhen Stressachse und verschlechtern Schlaf",
        ],
        rationale:
          "Social-Media-Nutzung >3 h/Tag ist in prospektiven Studien mit einem 2,7-fach erhöhten Depressionsrisiko assoziiert (Twenge et al., 2018). Face-to-Face-Sozialisation stimuliert Oxytocin-Ausschüttung, das die HPA-Achsenaktivität direkt dämpft. 'Shinrin-Yoku' (Waldtherapie) zeigt nach nur 20 Min signifikante Cortisol-Senkungen von 12–16 % sowie Blutdruckreduktionen (Li, 2010). Alkohol erhöht kurzfristig GABA und senkt Glutamat — langfristig verstärkt es Angst und Stressreaktivität.",
      },
      {
        heading: "Sport als Stress-Tool",
        items: [
          "Moderate Ausdauerbelastung (65–75 % HFmax) 3×/Woche senkt Cortisolspiegel langfristig",
          "Yoga/Pilates: 2×/Woche — kombiniert Bewegung und Entspannung",
          "KEIN intensives Training bei akutem Stress >8/10 — erhöht Verletzungsrisiko",
        ],
        rationale:
          "Aerobe Ausdauerbelastung bei 65–75 % der maximalen Herzfrequenz erhöht die Stressresistenz durch drei Mechanismen: (1) Ausschüttung von Beta-Endorphinen und BDNF, (2) HPA-Achsen-Desensitivierung durch wiederholten moderaten Cortisol-Anstieg mit Erholung, (3) Erhöhung der HRV als Marker besserer vegetativer Stressregulation (Blumenthal et al., JAMA Psychiatry, 1999). Yoga kombiniert Bewegung, Atemkontrolle und Achtsamkeit — Meta-Analysen zeigen Verbesserungen vergleichbar mit kognitiver Verhaltenstherapie (Cramer et al., 2013).",
      },
      {
        heading: "Deine erste Woche — Daily Reset",
        items: [
          "Morgen 1: 4-7-8-Atemübung direkt nach dem Aufwachen — 4 Zyklen (< 2 Minuten)",
          "Tag 1–3: Mittagspause ohne Bildschirm und Handy — auch nur 10 Min zählen",
          "Tag 2: 20 Min in der Natur (Park, Wald, Grünfläche) — ohne Kopfhörer, ohne Handy",
          "Ab Tag 3: Abendritual einführen — To-do-Liste für morgen schreiben vor dem Schlafen",
          "Tag 4–7: Täglich Stress-Level morgens und abends auf 1–10 notieren",
          "Nach 7 Tagen: Muster analysieren — Was erhöht deinen Stress? Was senkt ihn?",
        ],
        rationale:
          "Die erste Woche eines Stress-Programms ist entscheidend für die Compliance: Kleine, sofort spürbare Effekte (wie die 4-7-8-Atemübung) erzeugen Selbstwirksamkeit und Motivation. Stresstagebücher nutzen den 'Observer Effect': allein das Beobachten und Aufschreiben von Stressreaktionen reduziert ihre Intensität, weil die kognitive Verarbeitung den präfrontalen Kortex aktiviert und die Amygdala dämpft (Lieberman et al., Psychological Science, 2007).",
      },
    ],
  },
};

const EN: SamplePlansMap = {
  activity: {
    title: "ACTIVITY PLAN",
    subtitle: "Individual plan to improve your activity metrics",
    color: PLAN_COLORS.activity,
    source: "Based on: WHO Global Action Plan 2018–2030, ACSM Exercise Guidelines, IPAQ Short Form, Ainsworth MET Compendium (2011)",
    score: 67,
    blocks: [
      {
        heading: "Your Baseline",
        items: [
          "Activity Score: 67/100 (good)",
          "MET minutes/week: 1,640 (WHO target: ≥600 MET min/week)",
          "WHO minimum recommendation already met.",
        ],
        rationale:
          "Your Activity Score is based on the IPAQ Short Form (International Physical Activity Questionnaire) — a globally validated assessment instrument clinically tested in over 50 countries (Craig et al., 2003). MET minutes (Metabolic Equivalent of Task × minutes) quantify energy expenditure relative to resting rate. Walking equals 3.3 MET, moderate activity 4.0 MET, intense activity 8.0 MET according to the Ainsworth Compendium. Meeting the WHO minimum is already a strong foundation — the potential now lies in optimization, not in getting started.",
      },
      {
        heading: "Weekly Goal (WHO/ACSM Standard)",
        items: [
          "≥150 min moderate activity OR ≥75 min intense activity per week",
          "≥2× strength training per week (all major muscle groups)",
          "Limit sitting to max. 8 h/day — short movement break every hour",
          "Performance: 5×/week structured training, introduce periodization",
        ],
        rationale:
          "The recommendation of 150 min/week of moderate activity is not arbitrary: prospective studies with over 655,000 participants show that even this minimum reduces mortality risk by 31% compared to inactivity (Arem et al., JAMA Internal Medicine, 2015). Strength training 2×/week is essential because endurance training alone does not provide sufficient muscle protein synthesis activation — muscle mass is an independent predictor of metabolic health and longevity (McLeod et al., 2019). Sitting interruptions every 60 min measurably lower postprandial glucose levels, independent of total training (Dunstan et al., Diabetes Care, 2012).",
      },
      {
        heading: "Weekly Schedule (Example)",
        items: [
          "Monday: 30–45 min endurance (running/cycling) — moderate intensity",
          "Tuesday: 30 min strength training (full body)",
          "Wednesday: Active recovery — 20–30 min walking or yoga",
          "Thursday: 30–45 min endurance — higher intensity (intervals)",
          "Friday: 30 min strength training (full body)",
          "Saturday: 45–60 min sport of your choice",
          "Sunday: Recovery — light movement optional",
        ],
        rationale:
          "The weekly structure follows the periodization principle and the FITT model (Frequency, Intensity, Time, Type) of the ACSM. Alternating intensities (moderate endurance + intervals) optimize both aerobic capacity and anaerobic threshold. The active recovery day (Wednesday) promotes venous return and reduces muscle soreness (DOMS) without slowing recovery. Two strength sessions with a rest day between each meets the ACSM recommendation standard for muscle building.",
      },
      {
        heading: "Monitoring & Progression",
        items: [
          "Step goal: ≥8,000 steps/day as baseline",
          "Track MET minutes per week with a fitness app",
          "Every 4 weeks: increase training volume by 5–10% (progressive overload, ACSM)",
          "Every 8 weeks: new analysis to measure progress",
        ],
        rationale:
          "8,000 steps/day is the scientifically validated threshold at which significant reductions in cardiovascular mortality and diabetes incidence are measurable (Paluch et al., JAMA Neurology, 2022). The 5–10% monthly increase rule is based on the principle of progressive overload by DeLorme (1945). A new analysis every 8 weeks makes sense because cardiorespiratory fitness changes measurably after 6–8 weeks of consistent training.",
      },
      {
        heading: "Your First Week — Start Protocol",
        items: [
          "Days 1–2: Endurance session 30 min at 65% HRmax — set baseline",
          "Day 3: First strength training — 3 full-body exercises (squat, push-up, row), 3×10 each",
          "Day 4: Active break — 20 min walk, no structured training",
          "Days 5–6: Repeat weekly pattern — alternating endurance + strength",
          "Day 7: Rest day — reflect: what worked? What to adjust?",
          "Week 2: Increase volume by 10% (1 more set or 5 min longer)",
        ],
        rationale:
          "The first step is the hardest: habit formation research shows that a new habit takes an average of 66 days to become automatic (Lally et al., 2010). The key in week 1 is not maximum performance, but consistency. 'Minimum Effective Dose' — the smallest training that still produces adaptation — is the smartest strategy in the first week.",
      },
    ],
  },

  metabolic: {
    title: "METABOLIC PLAN",
    subtitle: "Individual plan to optimize your metabolic performance",
    color: PLAN_COLORS.metabolic,
    source: "Based on: WHO BMI Classification, EFSA Nutritional Recommendations, ISSN Position Stand 2017",
    score: 71,
    blocks: [
      {
        heading: "Your Baseline",
        items: [
          "Metabolic Score: 71/100",
          "BMI: 23.8 kg/m² — Category: Normal (WHO Classification)",
          "WHO normal range: 18.5–24.9 kg/m²",
        ],
        rationale:
          "BMI (Body Mass Index = body weight / height²) is the WHO's standard screening tool for cardiovascular and metabolic risks. At a BMI of 23.8 (Normal): each BMI point above 25 increases the risk of type 2 diabetes by approx. 7%, hypertension by approx. 5%, and cardiovascular disease by approx. 4% (Prospective Studies Collaboration, Lancet, 2009). The Metabolic Score combines BMI with activity data, since muscle mass can raise BMI without health risk — making the score more context-sensitive than BMI alone.",
      },
      {
        heading: "Nutrition Protocol",
        items: [
          "Meal frequency: 3 main meals, 1–2 snacks — even energy distribution",
          "Protein intake: 1.6–2.2 g/kg body weight/day (ISSN recommendation for active individuals)",
          "Carbohydrates: complex and fiber-rich (whole grains, legumes, vegetables)",
          "Fat: ≥20% of total energy, focus on unsaturated fatty acids",
          "Vegetables & fruit: ≥400 g/day (WHO minimum recommendation)",
        ],
        rationale:
          "Protein of 1.6–2.2 g/kg/day is the ISSN evidence-based range for optimal muscle protein synthesis (Morton et al., British Journal of Sports Medicine, 2018). Complex carbohydrates with low glycemic index reduce postprandial insulin levels and stabilize energy. Unsaturated fatty acids (Omega-3, olive oil) activate anti-inflammatory pathways and measurably improve insulin sensitivity. ≥400 g vegetables/fruit daily reduces cancer risk by 10–15% and provides micronutrients for energy metabolism enzymes.",
      },
      {
        heading: "Hydration Protocol",
        items: [
          "Water requirement: approx. 35 ml × body weight (kg) per day as a guideline",
          "During intense training: +500–750 ml per training hour",
          "Morning: 300–500 ml water immediately upon waking",
          "Completely replace sugary drinks with water or unsweetened tea",
        ],
        rationale:
          "Even 2% dehydration impairs cognitive performance and reduces strength by up to 6% (Sawka et al., Medicine & Science in Sports & Exercise, 2007). Morning water (300–500 ml) rehydrates after natural overnight dehydration and briefly boosts basal metabolic rate by approx. 30% for 30–40 min through thermogenic effect. Sugary drinks contribute an average of 150–300 kcal/day without satiety effect — eliminating them is one of the most efficient single measures for calorie reduction.",
      },
      {
        heading: "Monitoring",
        items: [
          "Track meals for 2 weeks (app) — identify patterns",
          "Body weight 1×/week (same time, fasted) measurement",
          "Goal: sustainable weight loss max. 0.5–1 kg/week (WHO recommendation)",
          "Every 8 weeks: new analysis",
        ],
        rationale:
          "Self-monitoring of nutrition is one of the best-evidenced behavioral interventions: a meta-analysis shows that nutrition tracking doubles weight loss outcomes on average (Burke et al., 2011). Weekly weight measurement (rather than daily) reduces variability from water retention. The 0.5–1 kg/week target ensures that weight loss comes primarily from fat tissue.",
      },
      {
        heading: "Your First Week — Nutrition Reset",
        items: [
          "Day 1: Refrigerator audit — remove sugary drinks & ultra-processed food",
          "Day 2: First tracking day — log everything you eat in an app",
          "Days 3–4: Test protein goal — add a protein source to every meal",
          "Day 5: Fill water bottle (1.5 L) in the morning — goal: empty by 6 pm",
          "Days 6–7: Meal prep — pre-cook 2 meals for next week",
          "Week 2: Activate macro tracking — protein target: reach 1.6 g/kg daily",
        ],
        rationale:
          "Dietary changes fail in 90% of cases due to lack of environmental design, not lack of motivation (Wansink & Sobal, 2007). The refrigerator audit in week 1 uses the 'friction reduction' principle: if junk food isn't available, it won't be eaten. Meal prep reduces decision fatigue — the more meal decisions made daily, the worse they become. Protein tracking in week 2 is the most important dietary lever.",
      },
    ],
  },

  recovery: {
    title: "RECOVERY PLAN",
    subtitle: "Individual plan to improve your recovery",
    color: PLAN_COLORS.recovery,
    source: "Based on: NSF Sleep Guidelines, PSQI Scale, ACSM Recovery Protocols, Walker (2017) Why We Sleep",
    score: 58,
    blocks: [
      {
        heading: "Your Baseline",
        items: [
          "Sleep & Recovery Score: 58/100",
          "Sleep duration band: 7–8h",
          "NSF recommendation for adults (18–64 years): 7–9 hours/night",
        ],
        rationale:
          "Your Sleep Score is based on the PSQI (Pittsburgh Sleep Quality Index), a clinically validated instrument with a Kappa value of 0.75 (good agreement) compared to polysomnographic measurements. The score integrates sleep duration, quality, sleep onset latency, and sense of recovery. Below 7 hours of sleep, elevated cortisol levels, reduced insulin sensitivity (−20–30%), and impaired immune function (−70% NK cell activity) are documented (Walker, 2017; Spiegel et al., Lancet, 1999).",
      },
      {
        heading: "Sleep Hygiene Protocol",
        items: [
          "Fixed bedtime and wake time — including weekends (±30 min tolerance)",
          "Bedroom: 61–64°F (16–18°C), fully darkened, no screens",
          "Last meal ≥2 h before sleep",
          "Caffeine: no consumption after 2 pm",
          "Screens (blue light): switch off ≥60 min before sleep or use blue light filter",
        ],
        rationale:
          "Bedtime consistency is crucial because the circadian rhythm is synchronized by regular light-dark cycles — deviations >1 h on weekends cause 'social jetlag,' associated with a 1.5-fold increased obesity risk (Roenneberg et al., 2012). Room temperature 16–18°C supports the natural body temperature drop required for sleep onset. Caffeine has a half-life of 5–6 hours — caffeine consumed after 2 pm is still 25–50% active at 11 pm.",
      },
      {
        heading: "Training Recovery Protocol",
        items: [
          "After intense training: ≥48 h recovery time for same muscle group",
          "Active recovery: 20 min light endurance training or walk on rest days",
          "Cold application (cold bath 50–59°F / 10–15°C, 10–15 min): proven anti-inflammatory",
          "Sleep as primary recovery tool: every additional hour of sleep reduces cortisol",
        ],
        rationale:
          "The 48-hour rule for muscle recovery is based on the kinetics of muscle protein synthesis (MPS): MPS remains elevated for 24–48 h after intense training; training the same group in this window disrupts the synthesis phase (Damas et al., 2016). Cold baths activate noradrenergic systems, reduce pro-inflammatory cytokines, and accelerate DOMS reduction by approx. 20% in meta-analyses (Hohenauer et al., PLOS ONE, 2015). Sleep is the most potent recovery tool: 70% of daily growth hormone is released during deep sleep.",
      },
      {
        heading: "Weekly Structure",
        items: [
          "At least 1 complete rest day per week without structured training",
          "Deload week every 4–6 training weeks: reduce volume by 40–50%",
          "Evaluate sleep quality daily (1–10) — track patterns over 2 weeks",
        ],
        rationale:
          "Rest days are not a weakness — they are physiologically necessary: without regular unloading, cortisol levels rise chronically (Overtraining Syndrome, Kreher & Schwartz, 2012). The deload week every 4–6 weeks allows complete neural and structural adaptation, often leading to a 'supercompensation bounce' afterward. Daily sleep tracking over 14 days reveals patterns invisible for individual days.",
      },
      {
        heading: "Your First Week — Sleep Protocol",
        items: [
          "Today: Set bedtime (e.g. 11 pm) and alarm for same time tomorrow",
          "Starting now: Cut caffeine after 2 pm — test for 7 days",
          "Day 2: Bedroom check — blackout, temperature (61–64°F / 16–18°C), charge devices outside",
          "Days 3–7: 30 min before sleep: no screens — replacement: book, light stretching, journaling",
          "Daily: Rate sleep quality in the morning on a 1–10 scale",
          "After 7 days: calculate average — below 6 means further hygiene optimization needed",
        ],
        rationale:
          "Sleep hygiene interventions are the evidence-based first-line treatment for sleep problems (CBT-I) — before any medication. The most important single factor is consistent wake time: it anchors the circadian rhythm. The 30-min screen break reduces blue light (460–490 nm), which can cause up to 85% melatonin suppression (Harvard Medical School, 2012).",
      },
    ],
  },

  stress: {
    title: "STRESS & LIFESTYLE PLAN",
    subtitle: "Individual plan to optimize stress and lifestyle",
    color: PLAN_COLORS.stress,
    source: "Based on: WHO Mental Health Guidelines, APA Stress Management, MBSR Kabat-Zinn, Cohen PSS-10 Scale",
    score: 52,
    blocks: [
      {
        heading: "Your Baseline",
        items: [
          "Stress & Lifestyle Score: 52/100",
          "Stress band: Elevated",
          "Chronic stress elevates cortisol → impairs sleep, metabolism, and immune system",
        ],
        rationale:
          "Your Stress Score is based on the PSS-10 (Perceived Stress Scale, Cohen et al., 1983) — the most widely cited stress measurement instrument in the world. The stress band 'Elevated' reflects perceived controllability and overload. Chronically elevated cortisol is causally associated with hippocampal atrophy (−5–10% volume reduction), increased visceral fat accumulation, impaired glucose regulation, and suppressed immune response (McEwen, 2007). Targeted interventions can produce measurable neurobiological changes within 8 weeks.",
      },
      {
        heading: "Daily Stress Protocol",
        items: [
          "Morning routine: 10 min structured relaxation (breathing exercise, meditation, or journaling)",
          "4-7-8 breathing: inhale 4 s, hold 7 s, exhale 8 s — activates parasympathetic nervous system",
          "Lunch break: 15–20 min without screens and without work reference",
          "Evening routine: write tomorrow's to-do list → offload thoughts from your mind",
        ],
        rationale:
          "Just 10 min daily meditation over 8 weeks measurably reduces amygdala density and increases prefrontal cortex activity in MRI — this is the neurobiological mechanism behind MBSR (Hölzel et al., Psychiatry Research, 2011). The 4-7-8 breathing technique prolongs exhalation, stimulating the vagus nerve and increasing heart rate variability (HRV) — a direct marker of parasympathetic activation. Journaling measurably reduces emotional distress through cognitive restructuring (Pennebaker & Smyth, 2016).",
      },
      {
        heading: "Lifestyle Optimization",
        items: [
          "Digital detox: 1–2 h/day completely offline (no smartphone, no social media)",
          "Social contacts: regular face-to-face interactions — proven stress-reducing",
          "Nature: 20 min in a natural environment measurably lowers cortisol (Univ. Michigan study)",
          "Limit alcohol: >14 units/week elevates stress axis and worsens sleep",
        ],
        rationale:
          "Social media use >3 h/day is associated in prospective studies with a 2.7-fold increased depression risk (Twenge et al., 2018). Face-to-face socialization stimulates oxytocin release, directly dampening HPA axis activity. 'Shinrin-Yoku' (forest bathing) shows significant cortisol reductions of 12–16% and blood pressure reductions after just 20 min (Li, 2010). Alcohol short-term increases GABA and decreases glutamate — long-term it amplifies anxiety and stress reactivity when sober.",
      },
      {
        heading: "Exercise as a Stress Tool",
        items: [
          "Moderate endurance (65–75% HRmax) 3×/week lowers cortisol levels long-term",
          "Yoga/Pilates: 2×/week — combines movement and relaxation",
          "NO intense training during acute stress >8/10 — increases injury risk",
        ],
        rationale:
          "Aerobic endurance at 65–75% max heart rate increases stress resistance through three mechanisms: (1) release of beta-endorphins and BDNF, (2) HPA axis desensitization through repeated moderate cortisol rise with recovery, (3) increased HRV as a marker of better autonomic stress regulation (Blumenthal et al., JAMA Psychiatry, 1999). Yoga combines movement, breath control, and mindfulness — meta-analyses show improvements comparable to cognitive behavioral therapy (Cramer et al., 2013). High-intensity training during acute stress additively increases cortisol levels.",
      },
      {
        heading: "Your First Week — Daily Reset",
        items: [
          "Morning 1: 4-7-8 breathing exercise right after waking — 4 cycles (< 2 minutes)",
          "Days 1–3: Lunch break without screens and phone — even just 10 min counts",
          "Day 2: 20 min in nature (park, forest, green area) — no headphones, no phone",
          "From Day 3: Introduce evening ritual — write tomorrow's to-do list before sleeping",
          "Days 4–7: Daily stress level morning and evening on 1–10 scale",
          "After 7 days: analyze patterns — what increases your stress? What reduces it?",
        ],
        rationale:
          "The first week of a stress program is crucial for compliance: small, immediately noticeable effects (like the 4-7-8 breathing exercise) build self-efficacy. Stress diaries use the 'observer effect': merely observing and writing down stress reactions reduces their intensity, as cognitive processing activates the prefrontal cortex and dampens the amygdala (Lieberman et al., Psychological Science, 2007).",
      },
    ],
  },
};

const IT: SamplePlansMap = {
  activity: {
    title: "PIANO ATTIVITÀ",
    subtitle: "Piano individuale per migliorare i tuoi valori di attività",
    color: PLAN_COLORS.activity,
    source: "Basato su: Piano d'Azione Globale OMS 2018–2030, Linee Guida ACSM Exercise, IPAQ Short Form, Ainsworth MET Compendium (2011)",
    score: 67,
    blocks: [
      {
        heading: "La Tua Situazione Attuale",
        items: [
          "Activity Score: 67/100 (buono)",
          "Minuti MET/settimana: 1.640 (Obiettivo OMS: ≥600 MET-min/settimana)",
          "Raccomandazione minima OMS già soddisfatta.",
        ],
        rationale:
          "Il tuo Activity Score si basa sull'IPAQ Short Form (International Physical Activity Questionnaire) — uno strumento di valutazione validato a livello mondiale e testato clinicamente in oltre 50 paesi (Craig et al., 2003). I minuti MET (Metabolic Equivalent of Task × minuti) quantificano il dispendio energetico rispetto al tasso di riposo. Camminare equivale a 3,3 MET, attività moderata 4,0 MET, attività intensa 8,0 MET secondo l'Ainsworth Compendium. Raggiungere il minimo OMS è già una base solida — il potenziale ora sta nell'ottimizzazione, non nell'iniziare.",
      },
      {
        heading: "Obiettivo Settimanale (Standard OMS/ACSM)",
        items: [
          "≥150 min attività moderata O ≥75 min attività intensa a settimana",
          "≥2× allenamento di forza a settimana (tutti i principali gruppi muscolari)",
          "Limitare la sedentarietà a max. 8 h/giorno — breve pausa di movimento ogni ora",
          "Performance: allenamento strutturato 5×/settimana, introdurre la periodizzazione",
        ],
        rationale:
          "La raccomandazione di 150 min/settimana di attività moderata non è arbitraria: studi prospettici con oltre 655.000 partecipanti mostrano che anche questo minimo riduce il rischio di mortalità del 31% rispetto all'inattività (Arem et al., JAMA Internal Medicine, 2015). L'allenamento di forza 2×/settimana è essenziale perché l'allenamento aerobico da solo non fornisce un'attivazione sufficiente della sintesi proteica muscolare — la massa muscolare è un predittore indipendente della salute metabolica e della longevità (McLeod et al., 2019). Interrompere la sedentarietà ogni 60 min riduce misurabilmente i livelli di glucosio postprandiale (Dunstan et al., Diabetes Care, 2012).",
      },
      {
        heading: "Piano Settimanale (Esempio)",
        items: [
          "Lunedì: 30–45 min resistenza (corsa/ciclismo) — intensità moderata",
          "Martedì: 30 min allenamento di forza (corpo intero)",
          "Mercoledì: Recupero attivo — 20–30 min camminata o yoga",
          "Giovedì: 30–45 min resistenza — intensità più alta (intervalli)",
          "Venerdì: 30 min allenamento di forza (corpo intero)",
          "Sabato: 45–60 min sport a scelta",
          "Domenica: Recupero — movimento leggero opzionale",
        ],
        rationale:
          "La struttura settimanale segue il principio della periodizzazione e il modello FITT (Frequenza, Intensità, Tempo, Tipo) dell'ACSM. Alternare le intensità (resistenza moderata + intervalli) ottimizza sia la capacità aerobica che la soglia anaerobica. Il giorno di recupero attivo (mercoledì) favorisce il ritorno venoso e riduce il dolore muscolare (DOMS) senza rallentare il recupero. Due sessioni di forza con un giorno di riposo tra ciascuna rispetta lo standard ACSM per la costruzione muscolare.",
      },
      {
        heading: "Monitoraggio & Progressione",
        items: [
          "Obiettivo passi: ≥8.000 passi/giorno come base",
          "Traccia i minuti MET settimanali con un'app di fitness",
          "Ogni 4 settimane: aumentare il volume di allenamento del 5–10% (sovraccarico progressivo, ACSM)",
          "Ogni 8 settimane: nuova analisi per misurare i progressi",
        ],
        rationale:
          "8.000 passi/giorno è la soglia scientificamente validata a partire dalla quale sono misurabili riduzioni significative della mortalità cardiovascolare e dell'incidenza del diabete (Paluch et al., JAMA Neurology, 2022). La regola dell'aumento del 5–10% mensile si basa sul principio del sovraccarico progressivo di DeLorme (1945). Una nuova analisi ogni 8 settimane ha senso perché la forma cardiorespiratoria cambia misurabilmente dopo 6–8 settimane di allenamento costante.",
      },
      {
        heading: "La Tua Prima Settimana — Protocollo di Avvio",
        items: [
          "Giorni 1–2: Sessione di resistenza 30 min al 65% FCmax — stabilire la baseline",
          "Giorno 3: Primo allenamento di forza — 3 esercizi corpo intero (squat, push-up, rematore), 3×10 ciascuno",
          "Giorno 4: Pausa attiva — 20 min camminata, nessun allenamento strutturato",
          "Giorni 5–6: Ripetere lo schema settimanale — alternare resistenza + forza",
          "Giorno 7: Giorno di riposo — rifletti: cosa ha funzionato? Cosa adattare?",
          "Settimana 2: Aumentare il volume del 10% (1 serie in più o 5 min più a lungo)",
        ],
        rationale:
          "Il primo passo è il più difficile: la ricerca sulla formazione delle abitudini mostra che una nuova abitudine richiede in media 66 giorni per diventare automatica (Lally et al., 2010). La chiave nella settimana 1 non è la massima performance, ma la coerenza. 'Dose Minima Efficace' — il minimo allenamento che produce ancora adattamento — è la strategia più intelligente nella prima settimana.",
      },
    ],
  },

  metabolic: {
    title: "PIANO METABOLICO",
    subtitle: "Piano individuale per ottimizzare le tue prestazioni metaboliche",
    color: PLAN_COLORS.metabolic,
    source: "Basato su: Classificazione BMI OMS, Raccomandazioni Nutrizionali EFSA, ISSN Position Stand 2017",
    score: 71,
    blocks: [
      {
        heading: "La Tua Situazione Attuale",
        items: [
          "Metabolic Score: 71/100",
          "BMI: 23,8 kg/m² — Categoria: Normale (Classificazione OMS)",
          "Range normale OMS: 18,5–24,9 kg/m²",
        ],
        rationale:
          "Il BMI (Body Mass Index = peso corporeo / altezza²) è lo strumento di screening standard dell'OMS per i rischi cardiovascolari e metabolici. Con un BMI di 23,8 (Normale): ogni punto BMI oltre 25 aumenta il rischio di diabete di tipo 2 di circa il 7%, di ipertensione di circa il 5% e di malattie cardiovascolari di circa il 4% (Prospective Studies Collaboration, Lancet, 2009). Il Metabolic Score combina il BMI con i dati di attività, poiché la massa muscolare può aumentare il BMI senza rischio per la salute — rendendo il punteggio più sensibile al contesto rispetto al solo BMI.",
      },
      {
        heading: "Protocollo Nutrizionale",
        items: [
          "Frequenza pasti: 3 pasti principali, 1–2 spuntini — distribuzione energetica uniforme",
          "Apporto proteico: 1,6–2,2 g/kg di peso corporeo/giorno (raccomandazione ISSN per persone attive)",
          "Carboidrati: complessi e ricchi di fibre (cereali integrali, legumi, verdure)",
          "Grassi: ≥20% dell'energia totale, focus su acidi grassi insaturi",
          "Verdure & frutta: ≥400 g/giorno (raccomandazione minima OMS)",
        ],
        rationale:
          "Le proteine da 1,6–2,2 g/kg/giorno sono la gamma basata sull'evidenza ISSN per la sintesi proteica muscolare ottimale (Morton et al., British Journal of Sports Medicine, 2018). I carboidrati complessi a basso indice glicemico riducono i livelli di insulina postprandiale e stabilizzano l'energia. Gli acidi grassi insaturi (Omega-3, olio d'oliva) attivano vie anti-infiammatorie e migliorano misurabilmente la sensibilità all'insulina. ≥400 g di verdure/frutta al giorno riduce il rischio di cancro del 10–15% e fornisce micronutrienti per gli enzimi del metabolismo energetico.",
      },
      {
        heading: "Protocollo di Idratazione",
        items: [
          "Fabbisogno idrico: circa 35 ml × peso corporeo (kg) al giorno come indicazione",
          "Durante allenamento intenso: +500–750 ml per ora di allenamento",
          "Mattino: 300–500 ml d'acqua immediatamente al risveglio",
          "Sostituire completamente le bevande zuccherate con acqua o tè non zuccherato",
        ],
        rationale:
          "Anche solo il 2% di disidratazione compromette le prestazioni cognitive e riduce la forza fino al 6% (Sawka et al., Medicine & Science in Sports & Exercise, 2007). L'acqua mattutina (300–500 ml) reidrata dopo la naturale disidratazione notturna e aumenta brevemente il metabolismo basale di circa il 30% per 30–40 min attraverso l'effetto termogenico. Le bevande zuccherate contribuiscono in media 150–300 kcal/giorno senza effetto saziante — eliminarle è una delle misure più efficienti per la riduzione calorica.",
      },
      {
        heading: "Monitoraggio",
        items: [
          "Traccia i pasti per 2 settimane (app) — identificare i pattern",
          "Peso corporeo 1×/settimana (stessa ora, a digiuno) misurazione",
          "Obiettivo: perdita di peso sostenibile max. 0,5–1 kg/settimana (raccomandazione OMS)",
          "Ogni 8 settimane: nuova analisi",
        ],
        rationale:
          "Il self-monitoring dell'alimentazione è uno degli interventi comportamentali meglio documentati: una meta-analisi mostra che il tracking nutrizionale raddoppia in media i risultati di perdita di peso (Burke et al., 2011). La misurazione del peso settimanale riduce la variabilità dovuta alla ritenzione idrica. L'obiettivo di 0,5–1 kg/settimana garantisce che la perdita di peso provenga principalmente dal tessuto adiposo.",
      },
      {
        heading: "La Tua Prima Settimana — Reset Nutrizionale",
        items: [
          "Giorno 1: Audit del frigorifero — rimuovere bevande zuccherate & cibo ultra-processato",
          "Giorno 2: Primo giorno di tracking — registrare tutto ciò che si mangia in un'app",
          "Giorni 3–4: Testare l'obiettivo proteico — aggiungere una fonte proteica a ogni pasto",
          "Giorno 5: Riempire la borraccia (1,5 L) al mattino — obiettivo: vuota entro le 18:00",
          "Giorni 6–7: Meal prep — precucinare 2 pasti per la prossima settimana",
          "Settimana 2: Attivare il tracking dei macros — obiettivo proteico: raggiungere 1,6 g/kg al giorno",
        ],
        rationale:
          "I cambiamenti alimentari falliscono nel 90% dei casi per mancanza di progettazione ambientale, non per mancanza di motivazione (Wansink & Sobal, 2007). L'audit del frigorifero nella settimana 1 utilizza il principio della 'riduzione dell'attrito': se il junk food non è disponibile, non viene mangiato. Il meal prep riduce l'affaticamento decisionale. Il tracking delle proteine nella settimana 2 è la leva alimentare più importante.",
      },
    ],
  },

  recovery: {
    title: "PIANO RECUPERO",
    subtitle: "Piano individuale per migliorare la tua rigenerazione",
    color: PLAN_COLORS.recovery,
    source: "Basato su: Linee Guida NSF sul Sonno, Scala PSQI, Protocolli di Recupero ACSM, Walker (2017) Why We Sleep",
    score: 58,
    blocks: [
      {
        heading: "La Tua Situazione Attuale",
        items: [
          "Sleep & Recovery Score: 58/100",
          "Banda durata sonno: 7–8h",
          "Raccomandazione NSF per adulti (18–64 anni): 7–9 ore/notte",
        ],
        rationale:
          "Il tuo Sleep Score si basa sul PSQI (Pittsburgh Sleep Quality Index), uno strumento validato clinicamente con un valore Kappa di 0,75 (buona concordanza) rispetto alle misurazioni polisonnografiche. Il punteggio integra durata del sonno, qualità, latenza di addormentamento e sensazione di recupero. Meno di 7 ore di sonno documenta livelli elevati di cortisolo, ridotta sensibilità all'insulina (−20–30%) e funzione immunitaria compromessa (−70% attività NK) (Walker, 2017; Spiegel et al., Lancet, 1999).",
      },
      {
        heading: "Protocollo di Igiene del Sonno",
        items: [
          "Ora fissa di andare a letto e di svegliarsi — anche nei fine settimana (±30 min di tolleranza)",
          "Camera da letto: 16–18°C, completamente oscurata, nessuno schermo",
          "Ultimo pasto ≥2 h prima di dormire",
          "Caffeina: nessun consumo dopo le 14:00",
          "Schermi (luce blu): spegnere ≥60 min prima di dormire o usare filtro luce blu",
        ],
        rationale:
          "La coerenza dell'orario del sonno è fondamentale perché il ritmo circadiano è sincronizzato da cicli regolari luce-buio — deviazioni >1 h nel fine settimana causano 'social jetlag', associato a un rischio di obesità 1,5 volte più alto (Roenneberg et al., 2012). La temperatura ambiente di 16–18°C supporta il naturale calo della temperatura corporea necessario per l'inizio del sonno. La caffeina ha un'emivita di 5–6 ore — assunta dopo le 14:00 è ancora attiva al 25–50% alle 23:00.",
      },
      {
        heading: "Protocollo di Recupero dall'Allenamento",
        items: [
          "Dopo allenamento intenso: ≥48 h di tempo di recupero per lo stesso gruppo muscolare",
          "Recupero attivo: 20 min di leggero allenamento aerobico o passeggiata nei giorni di riposo",
          "Applicazione di freddo (bagno freddo 10–15°C, 10–15 min): comprovato anti-infiammatorio",
          "Il sonno come strumento principale di recupero: ogni ora aggiuntiva di sonno riduce il cortisolo",
        ],
        rationale:
          "La regola delle 48 ore per il recupero muscolare si basa sulla cinetica della sintesi proteica muscolare (MPS): la MPS rimane elevata per 24–48 h dopo un allenamento intenso; allenarsi lo stesso gruppo in questa finestra disturba la fase di sintesi (Damas et al., 2016). I bagni freddi attivano sistemi noradrenergici, riducono le citochine pro-infiammatorie e accelerano la riduzione dei DOMS di circa il 20% nelle meta-analisi (Hohenauer et al., PLOS ONE, 2015). Il sonno è lo strumento di recupero più potente: il 70% dell'ormone della crescita giornaliero viene rilasciato durante il sonno profondo.",
      },
      {
        heading: "Struttura Settimanale",
        items: [
          "Almeno 1 giorno di riposo completo a settimana senza allenamento strutturato",
          "Settimana di deload ogni 4–6 settimane di allenamento: ridurre il volume del 40–50%",
          "Valutare la qualità del sonno ogni giorno (1–10) — tracciare i pattern per 2 settimane",
        ],
        rationale:
          "I giorni di riposo non sono una debolezza — sono fisiologicamente necessari: senza scarico regolare, i livelli di cortisolo aumentano cronicamente (Sindrome da Overtraining, Kreher & Schwartz, 2012). La settimana di deload ogni 4–6 settimane permette un adattamento neurale e strutturale completo, spesso con un 'rimbalzo di supercompensazione' dopo. Il tracking giornaliero del sonno per 14 giorni rivela pattern invisibili per i singoli giorni.",
      },
      {
        heading: "La Tua Prima Settimana — Protocollo del Sonno",
        items: [
          "Oggi: Stabilire l'orario del sonno (es. 23:00) e impostare la sveglia per la stessa ora domani",
          "Da subito: Eliminare la caffeina dopo le 14:00 — testare per 7 giorni",
          "Giorno 2: Controllo camera da letto — oscuramento, temperatura (16–18°C), caricare dispositivi fuori dalla camera",
          "Giorni 3–7: 30 min prima di dormire: nessuno schermo — sostituzione: libro, stretching leggero, journaling",
          "Ogni giorno: Valutare la qualità del sonno al mattino su scala 1–10",
          "Dopo 7 giorni: calcolare la media — sotto 6 significa ulteriore ottimizzazione dell'igiene",
        ],
        rationale:
          "Le interventi di igiene del sonno sono il trattamento di prima linea basato sull'evidenza per i problemi del sonno (CBT-I) — prima di qualsiasi farmaco. Il fattore singolo più importante è l'orario di sveglia coerente: ancora il ritmo circadiano. La pausa di 30 min dagli schermi riduce la luce blu (460–490 nm), che può causare fino all'85% di soppressione della melatonina (Harvard Medical School, 2012).",
      },
    ],
  },

  stress: {
    title: "PIANO STRESS & STILE DI VITA",
    subtitle: "Piano individuale per ottimizzare stress e stile di vita",
    color: PLAN_COLORS.stress,
    source: "Basato su: Linee Guida OMS sulla Salute Mentale, APA Stress Management, MBSR Kabat-Zinn, Scala PSS-10 Cohen",
    score: 52,
    blocks: [
      {
        heading: "La Tua Situazione Attuale",
        items: [
          "Stress & Lifestyle Score: 52/100",
          "Banda stress: Elevato",
          "Lo stress cronico aumenta il cortisolo → compromette sonno, metabolismo e sistema immunitario",
        ],
        rationale:
          "Il tuo Stress Score si basa sul PSS-10 (Perceived Stress Scale, Cohen et al., 1983) — lo strumento di misurazione dello stress più citato al mondo. La banda stress 'Elevato' riflette la percepita controllabilità e il sovraccarico. Il cortisolo cronicamente elevato è causalmente associato con: atrofia dell'ippocampo (−5–10% riduzione del volume), aumentata accumulazione di grasso viscerale, regolazione del glucosio compromessa e risposta immunitaria soppressa (McEwen, 2007). Interventi mirati possono produrre cambiamenti neurobiologici misurabili entro 8 settimane.",
      },
      {
        heading: "Protocollo Giornaliero Anti-Stress",
        items: [
          "Routine mattutina: 10 min di rilassamento strutturato (esercizio di respirazione, meditazione o journaling)",
          "Tecnica di respirazione 4-7-8: inspirare 4 s, trattenere 7 s, espirare 8 s — attiva il sistema parasimpatico",
          "Pausa pranzo: 15–20 min senza schermi e senza riferimento al lavoro",
          "Routine serale: scrivere la to-do list di domani → scaricare i pensieri dalla mente",
        ],
        rationale:
          "Solo 10 min di meditazione quotidiana per 8 settimane riduce misurabilmente la densità dell'amigdala e aumenta l'attività della corteccia prefrontale alla risonanza magnetica — il meccanismo neurobiologico alla base dell'MBSR (Hölzel et al., Psychiatry Research, 2011). La tecnica di respirazione 4-7-8 prolunga l'espirazione, stimolando il nervo vago e aumentando la variabilità della frequenza cardiaca (HRV). Il journaling riduce misurabilmente il disagio emotivo attraverso la ristrutturazione cognitiva (Pennebaker & Smyth, 2016).",
      },
      {
        heading: "Ottimizzazione dello Stile di Vita",
        items: [
          "Disintossicazione digitale: 1–2 h/giorno completamente offline (nessuno smartphone, nessun social media)",
          "Contatti sociali: interazioni regolari faccia a faccia — comprovato riduttore di stress",
          "Natura: 20 min in un ambiente naturale abbassa misurabilmente il cortisolo (studio Univ. Michigan)",
          "Limitare l'alcol: >14 unità/settimana eleva l'asse dello stress e peggiora il sonno",
        ],
        rationale:
          "L'uso dei social media >3 h/giorno è associato negli studi prospettici con un rischio di depressione 2,7 volte maggiore (Twenge et al., 2018). La socializzazione faccia a faccia stimola il rilascio di ossitocina, che smorza direttamente l'attività dell'asse HPA. Lo 'Shinrin-Yoku' (terapia forestale) mostra riduzioni significative del cortisolo del 12–16% e riduzioni della pressione sanguigna dopo soli 20 min (Li, 2010). L'alcol aumenta a breve termine il GABA e diminuisce il glutammato — a lungo termine amplifica l'ansia e la reattività allo stress.",
      },
      {
        heading: "Sport come Strumento Anti-Stress",
        items: [
          "Allenamento aerobico moderato (65–75% FCmax) 3×/settimana abbassa i livelli di cortisolo a lungo termine",
          "Yoga/Pilates: 2×/settimana — combina movimento e rilassamento",
          "NESSUN allenamento intenso durante stress acuto >8/10 — aumenta il rischio di infortuni",
        ],
        rationale:
          "L'allenamento aerobico al 65–75% della frequenza cardiaca massima aumenta la resistenza allo stress attraverso tre meccanismi: (1) rilascio di beta-endorfine e BDNF, (2) desensibilizzazione dell'asse HPA attraverso ripetuto aumento moderato del cortisolo con recupero, (3) aumento dell'HRV come indicatore di migliore regolazione vegetativa dello stress (Blumenthal et al., JAMA Psychiatry, 1999). Lo yoga combina movimento, controllo del respiro e mindfulness — meta-analisi mostrano miglioramenti paragonabili alla terapia cognitivo-comportamentale (Cramer et al., 2013).",
      },
      {
        heading: "La Tua Prima Settimana — Reset Quotidiano",
        items: [
          "Mattino 1: Esercizio di respirazione 4-7-8 subito dopo il risveglio — 4 cicli (< 2 minuti)",
          "Giorni 1–3: Pausa pranzo senza schermi e telefono — anche solo 10 min contano",
          "Giorno 2: 20 min in natura (parco, foresta, area verde) — senza cuffie, senza telefono",
          "Da Giorno 3: Introdurre il rituale serale — scrivere la to-do list di domani prima di dormire",
          "Giorni 4–7: Livello di stress giornaliero mattina e sera su scala 1–10",
          "Dopo 7 giorni: analizzare i pattern — cosa aumenta il tuo stress? Cosa lo riduce?",
        ],
        rationale:
          "La prima settimana di un programma anti-stress è cruciale per la compliance: piccoli effetti immediatamente percepibili (come l'esercizio di respirazione 4-7-8) costruiscono l'autoefficacia. I diari dello stress usano l'effetto 'osservatore': il solo fatto di osservare e scrivere le reazioni allo stress ne riduce l'intensità, poiché l'elaborazione cognitiva attiva la corteccia prefrontale e smorza l'amigdala (Lieberman et al., Psychological Science, 2007).",
      },
    ],
  },
};

const TR: SamplePlansMap = {
  activity: {
    title: "AKTİVİTE PLANI",
    subtitle: "Aktivite değerlerini geliştirmek için kişisel plan",
    color: PLAN_COLORS.activity,
    source: "Baz alınan: DSÖ Küresel Eylem Planı 2018–2030, ACSM Egzersiz Kılavuzları, IPAQ Kısa Form, Ainsworth MET Compendium (2011)",
    score: 67,
    blocks: [
      {
        heading: "Mevcut Durumun",
        items: [
          "Aktivite Skoru: 67/100 (iyi)",
          "MET dakikası/hafta: 1.640 (DSÖ hedefi: ≥600 MET-dak/hafta)",
          "DSÖ minimum önerisi karşılandı.",
        ],
        rationale:
          "Aktivite Skorun, 50'den fazla ülkede klinik olarak test edilmiş, dünya genelinde geçerliliği kanıtlanmış bir değerlendirme aracı olan IPAQ Kısa Formu'na (International Physical Activity Questionnaire) dayanıyor (Craig ve ark., 2003). MET dakikaları (Metabolik Eşdeğer × dakika), dinlenme oranına göre enerji harcamasını sayısallaştırır. Yürüyüş 3,3 MET, orta yoğunluklu aktivite 4,0 MET, yoğun aktivite ise Ainsworth Compendium'a göre 8,0 MET'e karşılık gelir. DSÖ minimumunu karşılamak zaten güçlü bir temel — bundan sonraki potansiyel optimizasyonda, başlangıçta değil.",
      },
      {
        heading: "Haftalık Hedef (DSÖ/ACSM Standardı)",
        items: [
          "Haftada ≥150 dk orta yoğunluklu aktivite VEYA ≥75 dk yoğun aktivite",
          "Haftada ≥2× kuvvet antrenmanı (tüm büyük kas grupları)",
          "Oturmayı günde maks. 8 saatle sınırla — her saat kısa hareket molası",
          "Performans: 5×/hafta yapılandırılmış antrenman, periyodizasyon uygula",
        ],
        rationale:
          "Haftada 150 dk orta aktivite önerisi keyfi değil: 655.000'den fazla katılımcıyla yapılan prospektif çalışmalar, bu minimumun bile hareketsizliğe kıyasla mortalite riskini %31 azalttığını gösteriyor (Arem ve ark., JAMA Internal Medicine, 2015). Haftada 2× kuvvet antrenmanı zorunlu çünkü dayanıklılık antrenmanı tek başına yeterli kas protein sentezi aktivasyonu sağlamıyor — kas kütlesi metabolik sağlık ve uzun ömrün bağımsız bir belirleyicisi (McLeod ve ark., 2019). Her 60 dk'da bir oturma molası, toplam antrenman hacminden bağımsız olarak postprandiyal glükoz düzeylerini ölçülebilir biçimde düşürüyor (Dunstan ve ark., Diabetes Care, 2012).",
      },
      {
        heading: "Haftalık Plan (Örnek)",
        items: [
          "Pazartesi: 30–45 dk dayanıklılık (koşu/bisiklet) — orta yoğunluk",
          "Salı: 30 dk kuvvet antrenmanı (tüm vücut)",
          "Çarşamba: Aktif toparlanma — 20–30 dk yürüyüş veya yoga",
          "Perşembe: 30–45 dk dayanıklılık — daha yüksek yoğunluk (intervallar)",
          "Cuma: 30 dk kuvvet antrenmanı (tüm vücut)",
          "Cumartesi: 45–60 dk tercih ettiğin spor",
          "Pazar: Toparlanma — hafif hareket isteğe bağlı",
        ],
        rationale:
          "Haftalık yapı, ACSM'nin FITT modeline (Frekans, Yoğunluk, Süre, Tür) ve periyodizasyon ilkesine dayanıyor. Değişen yoğunluklar (orta dayanıklılık + intervallar) hem aerobik kapasiteyi hem anaerobik eşiği optimize ediyor. Aktif toparlanma günü (Çarşamba) venöz dönüşü destekler ve toparlanmayı yavaşlatmadan kas ağrısını (DOMS) azaltır. Her biri arasında bir dinlenme günü olan iki kuvvet seansı, kas gelişimi için ACSM standardını karşılıyor.",
      },
      {
        heading: "İzleme ve İlerleme",
        items: [
          "Adım hedefi: temel olarak günde ≥8.000 adım",
          "Haftalık MET dakikalarını bir fitness uygulamasıyla takip et",
          "Her 4 haftada bir: antrenman hacmini %5–10 artır (progresif aşırı yükleme, ACSM)",
          "Her 8 haftada bir: ilerlemeyi ölçmek için yeni analiz",
        ],
        rationale:
          "Günde 8.000 adım, kardiyovasküler mortalite ve diyabet insidansında anlamlı azalmaların ölçülebildiği bilimsel olarak doğrulanmış eşik değeridir (Paluch ve ark., JAMA Neurology, 2022). Aylık %5–10 artış kuralı, DeLorme'un (1945) progresif aşırı yükleme ilkesine dayanıyor. Her 8 haftada yeni bir analiz mantıklı çünkü kardiyorespiratuar form 6–8 haftalık tutarlı antrenmanın ardından ölçülebilir biçimde değişiyor.",
      },
      {
        heading: "Birinci Haftan — Başlangıç Protokolü",
        items: [
          "H1–2: 30 dk %65 MHR'de dayanıklılık seansı — temel çizgiyi belirle",
          "H3: İlk kuvvet antrenmanı — 3 tüm vücut egzersizi (squat, şınav, kürek çekme), her biri 3×10",
          "H4: Aktif mola — 20 dk yürüyüş, yapılandırılmış antrenman yok",
          "H5–6: Haftalık şemayı tekrarla — dayanıklılık + kuvveti dönüşümlü uygula",
          "H7: Dinlenme günü — değerlendirme: ne işe yaradı? Ne ayarlanmalı?",
          "2. Hafta: Hacmi %10 artır (1 set daha veya 5 dk daha uzun)",
        ],
        rationale:
          "İlk adım en zorlu: alışkanlık oluşturma araştırmaları, yeni bir alışkanlığın otomatik hale gelmesinin ortalama 66 gün aldığını gösteriyor (Lally ve ark., 2010). 1. haftadaki anahtar maksimum performans değil, tutarlılık. 'Minimum Etkili Doz' — hâlâ adaptasyon üretebilen en küçük antrenman — ilk haftadaki en akıllı strateji.",
      },
    ],
  },

  metabolic: {
    title: "METABOLİK PLAN",
    subtitle: "Metabolik performansını optimize etmek için kişisel plan",
    color: PLAN_COLORS.metabolic,
    source: "Baz alınan: DSÖ BMI Sınıflandırması, EFSA Beslenme Önerileri, ISSN Pozisyon Bildirisi 2017",
    score: 71,
    blocks: [
      {
        heading: "Mevcut Durumun",
        items: [
          "Metabolik Skor: 71/100",
          "BMI: 23,8 kg/m² — Kategori: Normal (DSÖ Sınıflandırması)",
          "DSÖ normal aralığı: 18,5–24,9 kg/m²",
        ],
        rationale:
          "BMI (Beden Kitle İndeksi = vücut ağırlığı / boy²), DSÖ'nün kardiyovasküler ve metabolik riskler için standart tarama aracı. BMI 23,8 (Normal) ile: 25'in üzerindeki her BMI noktası tip 2 diyabet riskini yaklaşık %7, hipertansiyonu yaklaşık %5 ve kardiyovasküler hastalığı yaklaşık %4 artırıyor (Prospective Studies Collaboration, Lancet, 2009). Metabolik Skor, BMI'yi aktivite verileriyle birleştiriyor çünkü kas kütlesi BMI değerini sağlık riski olmadan artırabilir — bu da skoru tek başına BMI'ye kıyasla daha bağlama duyarlı yapıyor.",
      },
      {
        heading: "Beslenme Protokolü",
        items: [
          "Öğün sıklığı: 3 ana öğün, 1–2 ara öğün — dengeli enerji dağılımı",
          "Protein alımı: günde 1,6–2,2 g/kg vücut ağırlığı (aktif bireyler için ISSN önerisi)",
          "Karbonhidratlar: karmaşık ve lif bakımından zengin (tam tahıllar, baklagiller, sebzeler)",
          "Yağ: toplam enerjinin ≥%20'si, doymamış yağ asitlerine odak",
          "Sebze ve meyve: günde ≥400 g (DSÖ minimum önerisi)",
        ],
        rationale:
          "Günde 1,6–2,2 g/kg protein, optimal kas protein sentezi için ISSN kanıta dayalı aralığı (Morton ve ark., British Journal of Sports Medicine, 2018). Düşük glisemik indeksli kompleks karbonhidratlar postprandiyal insülin düzeylerini azaltır ve enerjiyi stabilize eder. Doymamış yağ asitleri (Omega-3, zeytinyağı) anti-inflamatuar yolları etkinleştirir ve insülin duyarlılığını ölçülebilir biçimde iyileştirir. Günde ≥400 g sebze/meyve kanser riskini %10–15 azaltır ve enerji metabolizması enzimleri için mikro besinler sağlar.",
      },
      {
        heading: "Hidrasyon Protokolü",
        items: [
          "Su ihtiyacı: kılavuz olarak günde yaklaşık 35 ml × vücut ağırlığı (kg)",
          "Yoğun antrenman sırasında: antrenman saati başına +500–750 ml",
          "Sabah: uyanır uyanmaz 300–500 ml su",
          "Şekerli içecekleri tamamen su veya şekersiz çayla değiştir",
        ],
        rationale:
          "Sadece %2 dehidrasyon bile bilişsel performansı bozuyor ve kuvveti %6'ya kadar azaltıyor (Sawka ve ark., Medicine & Science in Sports & Exercise, 2007). Sabah suyu (300–500 ml), doğal gece dehidrasyonundan sonra rehydrasyonu sağlar ve termojenik etki yoluyla 30–40 dk boyunca bazal metabolik hızı yaklaşık %30 kısa süreliğine artırır. Şekerli içecekler tokluk etkisi olmadan ortalama 150–300 kcal/gün katkısında bulunuyor — bunları ortadan kaldırmak kalori azaltma için en etkili tek önlemlerden biri.",
      },
      {
        heading: "İzleme",
        items: [
          "2 hafta boyunca öğünleri takip et (uygulama) — kalıpları belirle",
          "Vücut ağırlığı 1×/hafta (aynı saatte, aç karnına) ölçümü",
          "Hedef: sürdürülebilir kilo kaybı maks. 0,5–1 kg/hafta (DSÖ önerisi)",
          "Her 8 haftada bir: yeni analiz",
        ],
        rationale:
          "Beslenme öz-izlemi en iyi kanıtlanmış davranışsal müdahalelerden biri: bir meta-analiz, beslenme takibinin kilo kaybı sonuçlarını ortalama iki katına çıkardığını gösteriyor (Burke ve ark., 2011). Haftalık ağırlık ölçümü (günlük yerine) su tutma varyasyonunu azaltır. 0,5–1 kg/hafta hedefi, kilo kaybının öncelikle yağ dokusundan geldiğini güvence altına alır.",
      },
      {
        heading: "Birinci Haftan — Beslenme Sıfırlama",
        items: [
          "H1: Buzdolabı denetimi — şekerli içecekleri ve ultra-işlenmiş gıdaları çıkar",
          "H2: İlk takip günü — yediğin her şeyi bir uygulamaya kaydet",
          "H3–4: Protein hedefini test et — her öğüne bir protein kaynağı ekle",
          "H5: Sabah su şişesini (1,5 L) doldur — hedef: 18:00'e kadar biter",
          "H6–7: Meal prep — gelecek hafta için 2 öğün önceden pişir",
          "2. Hafta: Makro takibini etkinleştir — protein hedefi: günde 1,6 g/kg'a ulaş",
        ],
        rationale:
          "Diyet değişiklikleri vakaların %90'ında motivasyon eksikliği nedeniyle değil, çevresel tasarım eksikliği nedeniyle başarısız olur (Wansink & Sobal, 2007). 1. haftadaki buzdolabı denetimi 'sürtünme azaltma' ilkesini kullanıyor: fast food mevcut değilse yenmez. Meal prep karar yorgunluğunu azaltır — günlük ne kadar çok yemek kararı alınırsa o kadar kötü alınır. 2. haftadaki protein takibi en önemli diyet kaldıracı.",
      },
    ],
  },

  recovery: {
    title: "TOPARLANMA PLANI",
    subtitle: "Rejenerasyonunu geliştirmek için kişisel plan",
    color: PLAN_COLORS.recovery,
    source: "Baz alınan: NSF Uyku Kılavuzları, PSQI Ölçeği, ACSM Toparlanma Protokolleri, Walker (2017) Why We Sleep",
    score: 58,
    blocks: [
      {
        heading: "Mevcut Durumun",
        items: [
          "Uyku & Toparlanma Skoru: 58/100",
          "Uyku süresi bandı: 7–8 saat",
          "NSF yetişkin (18–64 yaş) önerisi: 7–9 saat/gece",
        ],
        rationale:
          "Uyku Skorun, polisomnografik ölçümlerle karşılaştırıldığında 0,75 Kappa değerine (iyi uyum) sahip, klinik olarak doğrulanmış bir araç olan PSQI'ya (Pittsburgh Sleep Quality Index) dayanıyor. Skor uyku süresini, kalitesini, uyku başlangıç latansını ve toparlanma hissini entegre ediyor. 7 saatin altındaki uyku süresinde yüksek kortizol düzeyleri, azalmış insülin duyarlılığı (−%20–30) ve bozulmuş bağışıklık fonksiyonu (−%70 NK hücre aktivitesi) belgelenmiş (Walker, 2017; Spiegel ve ark., Lancet, 1999).",
      },
      {
        heading: "Uyku Hijyeni Protokolü",
        items: [
          "Sabit yatma ve uyanma saati — hafta sonları da dahil (±30 dk tolerans)",
          "Yatak odası: 16–18°C, tamamen karartılmış, ekran yok",
          "Son öğün uykudan ≥2 saat önce",
          "Kafein: 14:00'dan sonra tüketim yok",
          "Ekranlar (mavi ışık): uykudan ≥60 dk önce kapat veya mavi ışık filtresi kullan",
        ],
        rationale:
          "Uyku saati tutarlılığı kritik çünkü sirkadiyen ritim düzenli ışık-karanlık döngüleriyle senkronize oluyor — hafta sonlarında >1 saatlik sapmalar, 1,5 kat artmış obezite riskiyle ilişkili 'sosyal jet lag'a neden oluyor (Roenneberg ve ark., 2012). 16–18°C oda sıcaklığı, uyku başlangıcı için gereken doğal vücut sıcaklığı düşüşünü destekler. Kafeinin yarılanma ömrü 5–6 saat — 14:00'dan sonra alınan kafein 23:00'de hâlâ %25–50 aktif.",
      },
      {
        heading: "Antrenman Toparlanma Protokolü",
        items: [
          "Yoğun antrenman sonrası: aynı kas grubu için ≥48 saat toparlanma süresi",
          "Aktif toparlanma: dinlenme günlerinde 20 dk hafif aerobik antrenman veya yürüyüş",
          "Soğuk uygulama (soğuk banyo 10–15°C, 10–15 dk): kanıtlanmış anti-inflamatuar",
          "Birincil toparlanma aracı olarak uyku: her ek uyku saati kortisolü azaltır",
        ],
        rationale:
          "Kas toparlanması için 48 saatlik kural, kas protein sentezi (MPS) kinetiğine dayanıyor: MPS yoğun antrenman sonrası 24–48 saat yüksek kalıyor; aynı grubu bu pencerede çalıştırmak sentez fazını bozuyor (Damas ve ark., 2016). Soğuk banyolar noradrenerjik sistemleri etkinleştirir, pro-inflamatuar sitokinleri azaltır ve meta-analizlerde DOMS azalmasını yaklaşık %20 hızlandırıyor (Hohenauer ve ark., PLOS ONE, 2015). Uyku en güçlü toparlanma aracı: günlük büyüme hormonunun %70'i derin uyku sırasında salınıyor.",
      },
      {
        heading: "Haftalık Yapı",
        items: [
          "Haftada en az 1 yapılandırılmış antrenman olmadan tam dinlenme günü",
          "Her 4–6 antrenman haftasında deload haftası: hacmi %40–50 azalt",
          "Günlük uyku kalitesini değerlendir (1–10) — 2 hafta boyunca kalıpları takip et",
        ],
        rationale:
          "Dinlenme günleri zayıflık değil — fizyolojik zorunluluk: düzenli yüklenme olmadan kortizol kronik olarak yükseliyor (Aşırı Antrenman Sendromu, Kreher & Schwartz, 2012). Her 4–6 haftada deload haftası, tam nöronal ve yapısal adaptasyona olanak tanır — genellikle 'süperkompanzasyon sıçraması'na yol açar. 14 gün boyunca günlük uyku takibi, tek günler için görünmez olan kalıpları ortaya koyar.",
      },
      {
        heading: "Birinci Haftan — Uyku Protokolü",
        items: [
          "Bugün: Yatma saatini belirle (örn. 23:00) ve yarın için aynı saate alarm kur",
          "Hemen şimdi: 14:00'den sonra kafeini kes — 7 gün test et",
          "H2: Yatak odası kontrolü — karartma, sıcaklık (16–18°C), cihazları dışarıda şarj et",
          "H3–7: Uykudan 30 dk önce ekran yok — alternatif: kitap, hafif esneme, günlük tutma",
          "Her gün: Sabah uyku kalitesini 1–10 ölçeğinde değerlendir",
          "7 gün sonra: ortalama hesapla — 6'nın altı daha fazla hijyen optimizasyonu gerektirir",
        ],
        rationale:
          "Uyku hijyeni müdahaleleri, uyku sorunları için kanıta dayalı birinci basamak tedavisi (BDT-U) — herhangi bir ilaçtan önce. En önemli tek faktör tutarlı uyanma saati: sirkadiyen ritmi demirler. 30 dk'lık ekran molası, melatonin baskılanmasına %85'e kadar neden olabilen mavi ışığı (460–490 nm) azaltır (Harvard Medical School, 2012).",
      },
    ],
  },

  stress: {
    title: "STRES VE YAŞAM TARZI PLANI",
    subtitle: "Stres ve yaşam tarzını optimize etmek için kişisel plan",
    color: PLAN_COLORS.stress,
    source: "Baz alınan: DSÖ Ruh Sağlığı Kılavuzları, APA Stres Yönetimi, MBSR Kabat-Zinn, Cohen PSS-10 Ölçeği",
    score: 52,
    blocks: [
      {
        heading: "Mevcut Durumun",
        items: [
          "Stres & Yaşam Tarzı Skoru: 52/100",
          "Stres bandı: Yüksek",
          "Kronik stres kortisolü artırır → uyku, metabolizma ve bağışıklık sistemini bozar",
        ],
        rationale:
          "Stres Skorun, dünyanın en sık atıfta bulunulan stres ölçüm aracı olan PSS-10'a (Perceived Stress Scale, Cohen ve ark., 1983) dayanıyor. 'Yüksek' stres bandı, algılanan kontrol edilebilirliği ve aşırı yüklenmeyi yansıtıyor. Kronik olarak yüksek kortizol: hipokampus atrofisi (−%5–10 hacim azalması), artmış visseral yağ birikimi, bozulmuş glükoz düzenlemesi ve baskılanmış bağışıklık yanıtıyla nedensel olarak ilişkili (McEwen, 2007). Hedefli müdahaleler 8 hafta içinde ölçülebilir nörobiyolojik değişiklikler üretebilir.",
      },
      {
        heading: "Günlük Stres Protokolü",
        items: [
          "Sabah rutini: 10 dk yapılandırılmış rahatlama (nefes egzersizi, meditasyon veya günlük tutma)",
          "4-7-8 nefes tekniği: 4 sn nefes al, 7 sn tut, 8 sn ver — parasempatik sistemi etkinleştirir",
          "Öğle arası: 15–20 dk ekransız ve iş bağlantısı olmadan",
          "Akşam rutini: yarınki yapılacaklar listesini yaz → düşünceleri kafadan boşalt",
        ],
        rationale:
          "Sadece 8 hafta boyunca günlük 10 dk meditasyon, MR'da ölçülebilir biçimde amigdala yoğunluğunu azaltıp prefrontal korteks aktivitesini artırıyor — MBSR'nin altındaki nörobiyolojik mekanizma bu (Hölzel ve ark., Psychiatry Research, 2011). 4-7-8 nefes tekniği uzatılmış nefes verme yoluyla vagus sinirini uyarır ve kalp hızı değişkenliğini (HRV) artırır. Günlük tutma, bilişsel yeniden yapılandırma yoluyla ölçülebilir biçimde duygusal sıkıntıyı azaltıyor (Pennebaker & Smyth, 2016).",
      },
      {
        heading: "Yaşam Tarzı Optimizasyonu",
        items: [
          "Dijital detoks: günde 1–2 saat tamamen çevrimdışı (akıllı telefon yok, sosyal medya yok)",
          "Sosyal temas: düzenli yüz yüze etkileşimler — kanıtlanmış stres azaltıcı",
          "Doğa: doğal ortamda 20 dk kortisolü ölçülebilir biçimde düşürür (Univ. Michigan çalışması)",
          "Alkol kısıtla: haftada >14 birim stres eksenini yükseltir ve uykuyu bozar",
        ],
        rationale:
          "Günde >3 saat sosyal medya kullanımı, prospektif çalışmalarda 2,7 kat artmış depresyon riskiyle ilişkili (Twenge ve ark., 2018). Yüz yüze sosyalleşme oksitosin salgılanmasını uyarır ve HPA ekseni aktivitesini doğrudan baskılar. 'Shinrin-Yoku' (orman terapisi) sadece 20 dk sonra %12–16 kortizol azalması ve kan basıncı düşüşleri gösteriyor (Li, 2010). Alkol kısa vadede GABA'yı artırır ve glutamatı düşürür — uzun vadede anksiyete ve stres reaktivitesini artırır.",
      },
      {
        heading: "Stres Aracı Olarak Spor",
        items: [
          "Orta yoğunluklu aerobik aktivite (%65–75 MHR) 3×/hafta uzun vadede kortizol düzeylerini düşürür",
          "Yoga/Pilates: 2×/hafta — hareketi ve rahatlamayı birleştirir",
          "Akut stres >8/10 iken YOĞUN antrenman YAPMA — yaralanma riskini artırır",
        ],
        rationale:
          "Maksimum kalp hızının %65–75'inde aerobik antrenman, stres direncini üç mekanizma yoluyla artırır: (1) beta-endorfin ve BDNF salınımı, (2) tekrarlayan orta düzeyli kortizol artışı ve toparlanma yoluyla HPA ekseni duyarsızlaşması, (3) daha iyi otonom stres düzenlemesinin göstergesi olarak artmış HRV (Blumenthal ve ark., JAMA Psychiatry, 1999). Yoga, hareketi, nefes kontrolünü ve farkındalığı birleştirir — meta-analizler bilişsel davranışçı terapiye benzer iyileşmeler gösteriyor (Cramer ve ark., 2013).",
      },
      {
        heading: "Birinci Haftan — Günlük Sıfırlama",
        items: [
          "Sabah 1: Uyandıktan hemen sonra 4-7-8 nefes egzersizi — 4 döngü (< 2 dakika)",
          "H1–3: Ekransız ve telefonsuz öğle arası — sadece 10 dk bile sayılır",
          "H2: Doğada 20 dk (park, orman, yeşil alan) — kulaklık yok, telefon yok",
          "H3'ten itibaren: Akşam ritüeli kur — yatmadan önce yarınki yapılacaklar listesini yaz",
          "H4–7: Sabah ve akşam 1–10 ölçeğinde günlük stres seviyesi",
          "7 gün sonra: kalıpları analiz et — stresi ne artırıyor? Ne azaltıyor?",
        ],
        rationale:
          "Bir stres programının ilk haftası uyum açısından kritik: küçük, hemen fark edilebilir etkiler (4-7-8 nefes egzersizi gibi) öz-yeterliliği artırır. Stres günlükleri 'gözlemci etkisi'ni kullanır: stres tepkilerini yalnızca gözlemleyip yazmak yoğunluklarını azaltır çünkü bilişsel işleme prefrontal korteksi etkinleştirir ve amigdalayi baskılar (Lieberman ve ark., Psychological Science, 2007).",
      },
    ],
  },
};

const LOCALE_MAP: Record<string, SamplePlansMap> = { de: DE, en: EN, it: IT, tr: TR };

export function getSamplePlan(locale: string, type: string): PlanContent {
  const plans = LOCALE_MAP[locale] ?? DE;
  return plans[type] ?? DE[type];
}
