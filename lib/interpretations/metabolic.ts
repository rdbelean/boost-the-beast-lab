// Metabolic interpretations — BMI, sitting, hydration, meal pattern, fruit/veg.
// Always includes BMI disclaimer: BMI is a population-level estimator, not an
// individual diagnostic. Muscular users get misclassified upward.

import type { MetabolicBand, BMICategory } from "../scoring/metabolic";

export interface MetabolicBandInterpretation {
  finding: string;
  bmi_disclaimer: string;
  sitting_note: string;
  recommendation: string;
  study_basis: string[];
}

const BMI_DISCLAIMER_STANDARD =
  "BMI ist ein populationsbasierter Schätzer, kein individueller Gesundheitsmarker. Bei überdurchschnittlicher Muskelmasse überschätzt der BMI das metabolische Risiko — ein Leistungssportler kann mit BMI 28 vollkommen metabolisch gesund sein.";

const SITTING_NOTE_STANDARD =
  "Sitzzeit ist laut AHA Science Advisory ein unabhängiger CVD-Risikofaktor, der sich NICHT vollständig durch Sport kompensieren lässt. Frontiers (2022) verknüpft >6h Sitzen/Tag mit erhöhtem Risiko für 12 chronische Erkrankungen.";

export const METABOLIC_INTERPRETATIONS: Record<
  MetabolicBand,
  MetabolicBandInterpretation
> = {
  low: {
    finding:
      "Dein metabolisches Profil zeigt mehrere belastende Einzelfaktoren gleichzeitig. Die Kombination aus Körperzusammensetzung, Hydration, Ernährungsrhythmus und/oder Sitzzeit erzeugt eine Grundlast, die Insulin-Sensitivität und CVD-Risiko ungünstig verschiebt.",
    bmi_disclaimer: BMI_DISCLAIMER_STANDARD,
    sitting_note: SITTING_NOTE_STANDARD,
    recommendation:
      "Fokussiere drei parallel wirkende Hebel: (1) Wasseraufnahme auf mindestens 30 ml/kg Körpergewicht, (2) Sitz-Blöcke strikt unter 45 Minuten, (3) mindestens 4 Portionen Obst/Gemüse täglich. Diese drei Interventionen zusammen verschieben den Score innerhalb von 4 Wochen messbar nach oben.",
    study_basis: [
      "WHO BMI Classification",
      "JAMA Network Open Meal Timing Meta-Analysis (2024)",
      "Frontiers Sedentary & CVD Meta-Analysis (2022)",
      "BMC Medicine Hydration & Cognition (2023)",
      "Network Meta-Analysis T2DM (199.403 Teilnehmer)",
    ],
  },
  moderate: {
    finding:
      "Dein metabolisches Profil ist mittelgut — keine akuten Risikomarker, aber auch keine Reserve. Einzelne Faktoren (typischerweise Sitzzeit oder Hydration) ziehen den Score, während andere bereits solide sind.",
    bmi_disclaimer: BMI_DISCLAIMER_STANDARD,
    sitting_note: SITTING_NOTE_STANDARD,
    recommendation:
      "Identifiziere den schwächsten Einzelfaktor aus BMI, Sitzzeit, Wasser, Mahlzeiten-Rhythmus oder Obst/Gemüse. Meist bringt ein fokussierter Angriff auf diesen einen Faktor über 4 Wochen den größten Sprung.",
    study_basis: [
      "JAMA Network Open Meal Timing Meta-Analysis (2024)",
      "PMC Eating Frequency Meta-Analysis (2023)",
      "Frontiers Sedentary & CVD (2022)",
    ],
  },
  good: {
    finding:
      "Dein metabolisches Profil ist solide. Körperzusammensetzung, Hydration, Ernährung und Aktivitätsrhythmus arbeiten weitgehend zusammen — du hast metabolische Reserve und unterstützt Recovery, Schlaf und Performance aktiv.",
    bmi_disclaimer: BMI_DISCLAIMER_STANDARD,
    sitting_note: SITTING_NOTE_STANDARD,
    recommendation:
      "Feintuning statt Umbau: 8h-Essensfenster als Standard, abendliche Mahlzeit mindestens 3h vor dem Schlafen, Mikro-Nährstoffdichte priorisieren. Chrononutrition-Evidenz (2024) zeigt, dass Timing die metabolischen Outcomes messbar weiter verbessert.",
    study_basis: [
      "JAMA Network Open Meal Timing Meta-Analysis (2024)",
      "PMC Chrononutrition (2024)",
      "WHO BMI Classification",
    ],
  },
  excellent: {
    finding:
      "Dein metabolisches Profil ist im oberen Bereich. Alle Einzelkomponenten spielen zusammen — das ist eine seltene Kombination und schafft eine hohe metabolische Toleranz gegenüber kurzfristigen Abweichungen (Reisen, Stress, Trainingszyklen).",
    bmi_disclaimer: BMI_DISCLAIMER_STANDARD,
    sitting_note: SITTING_NOTE_STANDARD,
    recommendation:
      "Status halten und Regelmäßigkeit priorisieren. Die größte Gefahr liegt in schleichenden Veränderungen — ein 3-monatiger Selbst-Check der Einzelmarker verhindert unbemerkte Verschlechterungen.",
    study_basis: [
      "WHO BMI Classification",
      "JAMA Network Open Meal Timing Meta-Analysis (2024)",
      "PMC Chrononutrition (2024)",
    ],
  },
};

export const BMI_CONTEXT_NOTES: Record<BMICategory, string> = {
  underweight:
    "BMI <18,5 — laut WHO untergewichtig. Das kann bei manchen Menschen physiologisch normal sein, ist aber häufig mit verminderter Knochendichte, geringerer Muskelmasse und reduzierter Immunkompetenz assoziiert. Individuelle Abklärung empfohlen.",
  normal:
    "BMI 18,5–24,9 — laut WHO im Normalbereich. In diesem Bereich ist das populationsbezogene Risiko für metabolische Erkrankungen am niedrigsten. BMI bleibt dennoch ein Schätzer — Körperzusammensetzung (Muskel/Fett) zählt mehr.",
  overweight:
    "BMI 25–29,9 — laut WHO übergewichtig. Wichtig: Bei überdurchschnittlicher Muskelmasse (Kraftsport, Kampfsport) überschätzt der BMI hier das Risiko systematisch. Tailoring via Körperfett-Messung ist aussagekräftiger als BMI allein.",
  obese_i:
    "BMI 30–34,9 — WHO Adipositas Klasse I. In Kombination mit metabolisch ungesunden Markern (Sitzzeit, niedrige Aktivität, schlechter Schlaf) steigt das T2DM-Risiko laut Network-Meta-Analyse (199.403 TN) signifikant. Körperzusammensetzung und Lebensstil entscheiden über das reale Risiko.",
  obese_ii:
    "BMI 35–39,9 — WHO Adipositas Klasse II. Hier ist das kumulative Risiko auch bei moderater Aktivität deutlich erhöht. Metabolische Reserve ist eingeschränkt — strukturierte Intervention (Ernährung + Bewegung + ggf. medizinische Begleitung) ist wirksamer als isolierte Einzelmaßnahmen.",
  obese_iii:
    "BMI ≥40 — WHO Adipositas Klasse III. Das metabolische und kardiovaskuläre Risiko ist in diesem Bereich substanziell erhöht. Dringende Empfehlung: ärztliche Begleitung für strukturierte, langfristige Intervention. Selbstberichtete Scores ersetzen keine klinische Einschätzung.",
};
