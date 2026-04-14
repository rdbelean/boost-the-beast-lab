// Shared plan builder — used by both /analyse (for pre-generation) and
// /plans/[type] (for page rendering). The content is deterministic from
// scores; /api/plan/generate layers an AI-enhanced version on top.

export type PlanType = "activity" | "metabolic" | "recovery" | "stress";

export interface PlanBlock {
  heading: string;
  items: string[];
  rationale?: string;
}

export interface PlanContent {
  title: string;
  subtitle: string;
  color: string;
  source: string;
  score?: number;
  blocks: PlanBlock[];
}

export const PLAN_COLORS: Record<PlanType, string> = {
  activity: "#E63222",
  metabolic: "#F59E0B",
  recovery: "#3B82F6",
  stress: "#22C55E",
};

export function buildPlan(type: PlanType, scores: Record<string, unknown>): PlanContent {
  const s = scores as {
    activity: { activity_score_0_100: number; activity_category: string; total_met_minutes_week: number };
    sleep: { sleep_score_0_100: number; sleep_duration_band: string };
    metabolic: { metabolic_score_0_100: number; bmi: number; bmi_category: string };
    stress: { stress_score_0_100: number; stress_band: string };
    vo2max: { vo2max_estimated: number };
  };

  if (type === "activity") {
    const score = s.activity.activity_score_0_100;
    const met = s.activity.total_met_minutes_week;
    const level = score < 40 ? "niedrig" : score < 65 ? "moderat" : score < 80 ? "gut" : "hoch";
    const whoTarget = 600;
    const gap = Math.max(0, whoTarget - met);
    return {
      title: "ACTIVITY-PLAN",
      subtitle: "Individueller Plan zur Verbesserung deiner Aktivitätswerte",
      color: PLAN_COLORS.activity,
      source: "Basiert auf: WHO Global Action Plan 2018–2030, ACSM Exercise Guidelines, IPAQ Short Form, Ainsworth MET Compendium (2011)",
      score,
      blocks: [
        {
          heading: "Deine Ausgangslage",
          items: [
            `Activity Score: ${score}/100 (${level})`,
            `MET-Minuten/Woche: ${met} (WHO-Ziel: ≥600 MET-min/Woche)`,
            `${gap > 0 ? `Lücke zum WHO-Minimum: ${gap} MET-min/Woche` : "WHO-Mindestempfehlung bereits erfüllt."}`,
          ],
          rationale: `Dein Activity Score basiert auf dem IPAQ Short Form (International Physical Activity Questionnaire) — einem weltweit validierten Erhebungsinstrument, das in über 50 Ländern klinisch erprobt wurde (Craig et al., 2003). MET-Minuten (Metabolic Equivalent of Task × Minuten) quantifizieren den Energieaufwand relativ zur Ruherate. Gehen entspricht 3,3 MET, moderate Aktivität 4,0 MET, intensive Aktivität 8,0 MET nach dem Ainsworth Compendium. ${gap > 0 ? `Die Lücke von ${gap} MET-min/Woche bedeutet konkret: du benötigst ca. ${Math.round(gap / 4)} Minuten moderate Aktivität zusätzlich pro Woche, um das WHO-Minimum zu erreichen.` : "Das Erreichen des WHO-Minimums ist bereits eine starke Basis — das Potenzial liegt jetzt in Optimierung, nicht im Einstieg."}`,
        },
        {
          heading: "Wochenziel (WHO/ACSM-Standard)",
          items: [
            "≥150 Min moderate Aktivität ODER ≥75 Min intensive Aktivität pro Woche",
            "≥2× Krafttraining pro Woche (alle Hauptmuskelgruppen)",
            "Sitzzeit auf max. 8 h/Tag begrenzen — jede Stunde kurze Bewegungspause",
            score < 40
              ? "Einstieg: 3×/Woche 30 Min zügiges Gehen (3,3 MET)"
              : score < 65
              ? "Aufbau: 4×/Woche Mischtraining (Kraft + Ausdauer), progressive Steigerung"
              : "Performance: 5×/Woche strukturiertes Training, Periodisierung einführen",
          ],
          rationale: "Die Empfehlung von 150 Min/Woche moderater Aktivität ist keine willkürliche Zahl: Prospektivstudien mit über 655.000 Teilnehmern zeigen, dass bereits dieses Minimum das Sterblichkeitsrisiko um 31 % gegenüber Inaktivität senkt (Arem et al., JAMA Internal Medicine, 2015). Krafttraining 2×/Woche ist essenziell, weil Ausdauertraining allein keine ausreichende Muskelproteinsyntheseaktivierung liefert — Muskelmasse ist ein unabhängiger Prädiktor für metabolische Gesundheit und Langlebigkeit (McLeod et al., 2019). Sitzunterbrechungen alle 60 Min senken postprandiale Glukosespiegel messbar, unabhängig vom Gesamttraining (Dunstan et al., Diabetes Care, 2012).",
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
          rationale: "Die Wochenstruktur folgt dem Prinzip der Periodisierung und dem FITT-Modell (Frequency, Intensity, Time, Type) der ACSM. Wechselnde Intensitäten (moderate Ausdauer + Intervalle) optimieren sowohl aerobe Kapazität als auch anaerobe Schwelle. Der aktive Erholungstag (Mittwoch) fördert den venösen Rückfluss und reduziert Muskelkater (DOMS) ohne die Erholung zu verlangsamen. Zwei Kraft-Einheiten mit je einem Ruhetag dazwischen entsprechen dem ACSM-Empfehlungsstandard für Muskelaufbau — weniger führt nicht zu ausreichender Superkompensation.",
        },
        {
          heading: "Monitoring & Progression",
          items: [
            "Schrittziel: ≥8.000 Schritte/Tag als Basis (Basisaktivität)",
            "MET-Minuten pro Woche mit Fitness-App tracken",
            "Alle 4 Wochen: Trainingsvolumen um 5–10 % steigern (progressive Überladung, ACSM)",
            "Alle 8 Wochen: Neue Analyse durchführen um Fortschritt zu messen",
          ],
          rationale: "8.000 Schritte/Tag ist der wissenschaftlich validierte Schwellenwert, ab dem signifikante Reduktionen der kardiovaskulären Sterblichkeit und Diabetes-Inzidenz nachweisbar sind (Paluch et al., JAMA Neurology, 2022). Die 5–10 % Steigerungsregel pro Monat basiert auf dem Prinzip der progressiven Überladung nach DeLorme (1945), bestätigt durch aktuelle Meta-Analysen: Überschreitung von 10 %/Woche erhöht das Verletzungsrisiko signifikant. Eine Neuanalyse alle 8 Wochen ist sinnvoll, weil sich kardiorespiratorische Fitness nach 6–8 Wochen konsistenten Trainings messbar verändert (Boule et al., Diabetologia, 2001).",
        },
      ],
    };
  }

  if (type === "metabolic") {
    const score = s.metabolic.metabolic_score_0_100;
    const bmi = s.metabolic.bmi;
    const cat = s.metabolic.bmi_category;
    return {
      title: "METABOLIC-PLAN",
      subtitle: "Individueller Plan zur Optimierung deiner metabolischen Performance",
      color: PLAN_COLORS.metabolic,
      source: "Basiert auf: WHO BMI-Klassifikation, EFSA Nährwertempfehlungen, DGE Ernährungskreis, ISSN Position Stand 2017",
      score,
      blocks: [
        {
          heading: "Deine Ausgangslage",
          items: [
            `Metabolic Score: ${score}/100`,
            `BMI: ${bmi} kg/m² — Kategorie: ${cat} (WHO-Klassifikation)`,
            `WHO-Normalbereich: 18,5–24,9 kg/m²`,
          ],
          rationale: `Der BMI (Body Mass Index = Körpergewicht / Körpergröße²) ist das Standard-Screening-Tool der WHO für kardiovaskuläre und metabolische Risiken. Bei einem BMI von ${bmi} (${cat}) ist folgendes wichtig: Jeder BMI-Punkt über 25 erhöht das Risiko für Typ-2-Diabetes um ca. 7 %, Hypertonie um ca. 5 % und kardiovaskuläre Erkrankungen um ca. 4 % (Prospective Studies Collaboration, Lancet, 2009). Der Metabolic Score kombiniert BMI mit Aktivitätsdaten, da Muskulatur den BMI-Wert ohne gesundheitliches Risiko erhöhen kann — daher ist der Score kontextsensitiver als der BMI allein.`,
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
          rationale: "Protein von 1,6–2,2 g/kg/Tag ist der ISSN-evidenzbasierte Bereich für optimale Muskelproteinsynthese — unterhalb davon ist die Aminosäureverfügbarkeit für MPS limitierend (Morton et al., British Journal of Sports Medicine, 2018). Komplexe Kohlenhydrate mit niedrigem glykämischen Index reduzieren postprandiale Insulinspiegel und stabilisieren Energie — dies ist besonders relevant für metabolische Gesundheit (Jenkins et al., NEJM, 2008). Ungesättigte Fettsäuren (Omega-3, Olivenöl) aktivieren anti-inflammatorische Signalwege (NF-κB-Inhibition) und verbessern die Insulinsensitivität messbar. ≥400 g Gemüse/Obst täglich senkt das Krebsrisiko um 10–15 % und liefert Mikronährstoffe, die die Energiestoffwechsel-Enzyme (z. B. B-Vitamine für Citrat-Zyklus) optimal versorgen.",
        },
        {
          heading: "Hydrations-Protokoll",
          items: [
            "Wasserbedarf: ca. 35 ml × Körpergewicht (kg) pro Tag als Richtwert",
            "Bei intensivem Training: +500–750 ml pro Trainingsstunde",
            "Morgens: 300–500 ml Wasser direkt nach dem Aufstehen",
            "Zuckerhaltige Getränke vollständig durch Wasser oder ungesüßten Tee ersetzen",
          ],
          rationale: "Bereits 2 % Dehydration verschlechtert die kognitive Leistung, erhöht die gefühlte Anstrengung beim Training und reduziert die Kraft um bis zu 6 % (Sawka et al., Medicine & Science in Sports & Exercise, 2007). Das Morgenwasser (300–500 ml) rehydriert nach der natürlichen nächtlichen Dehydration und steigert den Grundumsatz kurzfristig um ca. 30 % über 30–40 Min durch thermogene Wirkung (Boschmann et al., Journal of Clinical Endocrinology, 2003). Zuckerhaltige Getränke tragen in Deutschland durchschnittlich 150–300 kcal/Tag bei, ohne Sättigungseffekt — ihre Elimination ist eine der effizientesten Einzelmaßnahmen zur Kalorienreduktion.",
        },
        {
          heading: "Monitoring",
          items: [
            "Mahlzeiten für 2 Wochen tracken (App) — Muster erkennen",
            "Körpergewicht 1×/Woche (gleiche Uhrzeit, nüchtern) messen",
            "Ziel: nachhaltiger Gewichtsverlust max. 0,5–1 kg/Woche (WHO-Empfehlung)",
            "Alle 8 Wochen: Neue Analyse durchführen",
          ],
          rationale: "Selbst-Monitoring der Ernährung ist eine der am besten belegten Verhaltensinterventionen: eine Meta-Analyse von 15 RCTs zeigt, dass Ernährungs-Tracking das Gewichtsverlust-Outcome durchschnittlich verdoppelt (Burke et al., Journal of the Academy of Nutrition and Dietetics, 2011). Wöchentliche Gewichtsmessung (statt täglich) reduziert die Variabilität durch Wassereinlagerungen und gibt ein stabileres Signal. Das 0,5–1 kg/Woche-Ziel sichert, dass die Gewichtsabnahme primär aus Fettgewebe stammt — schnellerer Verlust erhöht den Muskelabbau-Anteil messbar (Stiegler & Cunliffe, Sports Medicine, 2006).",
        },
      ],
    };
  }

  if (type === "recovery") {
    const score = s.sleep.sleep_score_0_100;
    const band = s.sleep.sleep_duration_band;
    return {
      title: "RECOVERY-PLAN",
      subtitle: "Individueller Plan zur Verbesserung deiner Regeneration",
      color: PLAN_COLORS.recovery,
      source: "Basiert auf: NSF Sleep Guidelines, PSQI-Skala, ACSM Recovery Protocols, Walker (2017) Why We Sleep",
      score,
      blocks: [
        {
          heading: "Deine Ausgangslage",
          items: [
            `Sleep & Recovery Score: ${score}/100`,
            `Schlafdauer-Band: ${band}`,
            "NSF-Empfehlung für Erwachsene (18–64 J.): 7–9 Stunden/Nacht",
          ],
          rationale: `Dein Sleep Score basiert auf dem PSQI (Pittsburgh Sleep Quality Index), einem klinisch validierten Instrument mit einem Kappa-Wert von 0,75 (gut übereinstimmend) gegenüber polysomnographischen Messungen. Der Score integriert Schlafdauer, Qualität, Einschlaflatenz und Erholungsgefühl. Schlafdauer-Band "${band}" ist dabei der gewichtigste Einzelfaktor: Unter 7 Stunden Schlaf sind nachweislich erhöhte Cortisol-Spiegel, reduzierte Insulinsensitivität (−20–30 %) und verschlechterte Immunfunktion (−70 % NK-Zell-Aktivität) dokumentiert (Walker, 2017; Spiegel et al., Lancet, 1999).`,
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
          rationale: "Die Schlafenszeit-Konsistenz ist entscheidend, weil der circadiane Rhythmus (SCN im Hypothalamus) durch regelmäßige Licht-Dunkel-Zyklen synchronisiert wird — Abweichungen >1 h am Wochenende verursachen \"Social Jetlag\", der mit einem 1,5-fach erhöhten Adipositas-Risiko assoziiert ist (Roenneberg et al., 2012). Die Raumtemperatur von 16–18 °C unterstützt den natürlichen Körpertemperaturabfall um 0,5–1 °C, der für den Schlafbeginn notwendig ist. Koffein hat eine Halbwertszeit von 5–6 Stunden — nach 14:00 Uhr eingenommenes Koffein ist um 23:00 Uhr noch zu 25–50 % aktiv und unterdrückt Adenosin, den primären Schlafdruck-Mediator.",
        },
        {
          heading: "Trainings-Recovery-Protokoll",
          items: [
            "Nach intensivem Training: ≥48 h Regenerationszeit für gleiche Muskelgruppe",
            "Aktive Erholung: 20 Min leichtes Ausdauertraining oder Spaziergang an Ruhetagen",
            "Kälteanwendung (Kältebad 10–15 °C, 10–15 Min): nachgewiesen entzündungshemmend",
            "Schlaf als primäres Recovery-Tool: jede Stunde zusätzlicher Schlaf reduziert Cortisol",
          ],
          rationale: "Die 48-Stunden-Regel für Muskelregeneration basiert auf der Kinetik der Muskelproteinsynthese (MPS): MPS bleibt nach intensivem Training 24–48 h erhöht, training in diesem Zeitfenster auf dieselbe Gruppe stört die Synthese-Phase (Damas et al., 2016). Kältebäder (10–15 °C) aktivieren noradrenerge Systeme, reduzieren pro-inflammatorische Zytokine (IL-6, TNF-α) und beschleunigen die DOMS-Reduktion um ca. 20 % in Meta-Analysen (Hohenauer et al., PLOS ONE, 2015). Schlaf ist das potenteste Recovery-Tool: während des Tiefschlafs (SWS) wird 70 % des täglichen Wachstumshormons ausgeschüttet — das primäre Signal für Muskelreparatur.",
        },
        {
          heading: "Wochenstruktur",
          items: [
            "Mindestens 1 vollständiger Ruhetag pro Woche ohne strukturiertes Training",
            "Deload-Woche alle 4–6 Trainingswochen: Volumen um 40–50 % reduzieren",
            "Schlafqualität täglich bewerten (1–10) — Muster über 2 Wochen tracken",
          ],
          rationale: "Der Ruhetag ist keine Schwäche — er ist physiologisch notwendig: ohne regelmäßige Entlastung steigt der Cortisolspiegel chronisch an (Overtraining Syndrome, Kreher & Schwartz, 2012), was Schlaf, Immunfunktion und Leistungsfähigkeit dauerhaft verschlechtert. Die Deload-Woche alle 4–6 Wochen ist ein Konzept aus dem Periodisierungsmodell — das Trainingsvolumen zu reduzieren erlaubt vollständige neuronale und strukturelle Anpassung, was nach der Deload-Woche oft zu einem \"Supercompensation Bounce\" führt (Zatsiorsky & Kraemer, 2006). Tägliches Schlaf-Tracking über 14 Tage deckt Muster auf, die für Einzeltage unsichtbar sind — z. B. systematisch schlechterer Schlaf nach Alkohol, späten Mahlzeiten oder hoher Trainingslast.",
        },
      ],
    };
  }

  // stress
  const score = s.stress.stress_score_0_100;
  const band = s.stress.stress_band;
  return {
    title: "STRESS & LIFESTYLE-PLAN",
    subtitle: "Individueller Plan zur Optimierung von Stress und Lifestyle",
    color: PLAN_COLORS.stress,
    source: "Basiert auf: WHO Mental Health Guidelines, APA Stress Management, MBSR Kabat-Zinn, Cohen PSS-10 Skala",
    score,
    blocks: [
      {
        heading: "Deine Ausgangslage",
        items: [
          `Stress & Lifestyle Score: ${score}/100`,
          `Stress-Band: ${band}`,
          "Chronischer Stress erhöht Cortisol → beeinträchtigt Schlaf, Metabolismus und Immunsystem",
        ],
        rationale: `Dein Stress Score basiert auf der PSS-10 (Perceived Stress Scale, Cohen et al., 1983) — dem am häufigsten zitierten Stressmessinstrument weltweit. Das Stress-Band "${band}" reflektiert die wahrgenommene Kontrollierbarkeit und Überlastung. Chronisch erhöhtes Cortisol (>20 µg/dl Morgenwert) ist kausal mit: Hippocampus-Atrophie (−5–10 % Volumenreduktion), erhöhter viszeraler Fettakkumulation, gestörter Glucoseregulation und supprimierter Immunantwort assoziiert (McEwen, 2007). Die gute Nachricht: kortikale Plastizität bedeutet, dass gezielte Interventionen innerhalb von 8 Wochen messbare neurobiologische Veränderungen erzeugen können.`,
      },
      {
        heading: "Tägliches Stress-Protokoll",
        items: [
          "Morgenroutine: 10 Min strukturierte Entspannung (Atemübung, Meditation oder Journaling)",
          "Atemtechnik 4-7-8: 4 s einatmen, 7 s halten, 8 s ausatmen — aktiviert Parasympathikus",
          "Mittagspause: 15–20 Min ohne Bildschirm und ohne Arbeitsbezug",
          "Abendroutine: To-do-Liste für morgen schreiben → Gedanken aus dem Kopf auslagern",
        ],
        rationale: "Bereits 10 Min tägliche Meditation über 8 Wochen reduziert die Amygdala-Dichte (Stresszentrum) und erhöht die präfrontale Kortexaktivität (Stressregulation) messbar im MRT — das ist der neurobiologische Mechanismus hinter MBSR (Hölzel et al., Psychiatry Research, 2011). Die 4-7-8-Atemtechnik verlängert die Ausatmung, was den Vagusnerv stimuliert und die Herzratenvariabilität (HRV) erhöht — ein direkter Marker parasympathischer Aktivierung und Stressresistenz. Journaling (\"Expressive Writing\") reduziert laut Pennebaker & Smyth (2016) nachweislich emotionalen Leidensdruck durch kognitive Neustrukturierung traumatischer oder stressiger Erlebnisse.",
      },
      {
        heading: "Lifestyle-Optimierung",
        items: [
          "Digitale Auszeiten: 1–2 h/Tag komplett offline (kein Smartphone, kein Social Media)",
          "Soziale Kontakte: regelmäßige Face-to-Face-Interaktionen — nachgewiesen stressreduzierend",
          "Natur: 20 Min in natürlicher Umgebung senken Cortisol messbar (Studie: Univ. Michigan)",
          "Alkohol limitieren: >14 Einheiten/Woche erhöhen Stressachse und verschlechtern Schlaf",
        ],
        rationale: "Social-Media-Nutzung >3 h/Tag ist in prospektiven Studien mit einem 2,7-fach erhöhten Depressionsrisiko assoziiert (Twenge et al., 2018) — vermutlich durch sozialen Vergleich, Schlafunterbrechungen und Dopamin-Feedback-Loops. Face-to-Face-Sozialisation stimuliert Oxytocin-Ausschüttung, das die HPA-Achsenaktivität (Cortisol-System) direkt dämpft. \"Shinrin-Yoku\" (Waldtherapie) zeigt in kontrollierten Studien nach nur 20 Min signifikante Cortisol-Senkungen von 12–16 % sowie Blutdruckreduktionen (Li, 2010). Alkohol erhöht kurzfristig GABA und senkt Glutamat (Entspannungsgefühl), langfristig jedoch reguliert das Gehirn die Rezeptoren hoch — was Angst und Stressreaktivität im nüchternen Zustand verstärkt (Sinha, 2008).",
      },
      {
        heading: "Sport als Stress-Tool",
        items: [
          "Moderate Ausdauerbelastung (65–75 % HFmax) 3×/Woche senkt Cortisolspiegel langfristig",
          "Yoga/Pilates: 2×/Woche — kombiniert Bewegung und Entspannung",
          "KEIN intensives Training bei akutem Stress >8/10 — erhöht Verletzungsrisiko",
        ],
        rationale: "Aerobe Ausdauerbelastung bei 65–75 % der maximalen Herzfrequenz (\"Fatburning Zone\") erhöht die Stressresistenz durch drei Mechanismen: (1) Ausschüttung von Beta-Endorphinen und BDNF (Brain-Derived Neurotrophic Factor, \"Dünger für Nervenzellen\"), (2) HPA-Achsen-Desensitivierung durch wiederholten moderaten Cortisol-Anstieg mit Erholung, (3) Erhöhung der HRV als Marker besserer vegetativer Stressregulation (Blumenthal et al., JAMA Psychiatry, 1999). Yoga kombiniert Bewegung, Atemkontrolle und Achtsamkeit — Meta-Analysen zeigen Verbesserungen der Stresswerte vergleichbar mit kognitiver Verhaltenstherapie (Cramer et al., Depression and Anxiety, 2013). Hochintensives Training bei akutem Stress erhöht den Cortisolspiegel additiv — das Verletzungsrisiko steigt durch verminderte Konzentration und erhöhte Muskelspannung.",
      },
    ],
  };
}
