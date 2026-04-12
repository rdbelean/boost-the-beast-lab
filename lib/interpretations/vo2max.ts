// VO2max interpretations — cardiorespiratory fitness bands with explicit
// estimation disclaimer: this is a non-exercise derived value, not a measured
// test result. Use ambiguity language, never diagnostic language.

import type { FitnessBand } from "../scoring/vo2max";

export interface VO2MaxBandInterpretation {
  finding: string;
  fitness_context: string;
  activity_link: string;
  recommendation: string;
  study_basis: string[];
}

export const VO2MAX_INTERPRETATIONS: Record<
  FitnessBand,
  VO2MaxBandInterpretation
> = {
  "Very Poor": {
    finding:
      "Deine geschätzte kardiorespiratorische Fitness liegt im niedrigsten Band für dein Alter und Geschlecht. VO2max ist einer der stärksten Einzelprädiktoren für langfristige Lebenserwartung — in diesem Bereich ist der Hebel für messbare Veränderung am größten.",
    fitness_context:
      "Die Bänder sind alters- und geschlechtsspezifisch (Cooper Institute / ACSM). Ein Wert in dieser Zone ist kein Urteil über dich, sondern ein Ausgangspunkt — der Fortschritt pro Trainingswoche ist hier typischerweise am größten.",
    activity_link:
      "VO2max ist direkt an deine Aktivitäts-Kategorie gekoppelt: Der Sprung von LOW auf MODERATE in der IPAQ-Kategorisierung verschiebt den geschätzten VO2max-Wert spürbar nach oben.",
    recommendation:
      "Start mit 2–3× pro Woche zügigem Gehen/Radfahren (30 Min), dann nach 3–4 Wochen eine Intervalleinheit ergänzen (z.B. 6× 1 Min zügig / 2 Min locker). Dieser Ansatz ist in Leitlinien (ACSM) für Einsteiger als sicher und wirksam dokumentiert.",
    study_basis: [
      "Cooper Institute VO2max Norms",
      "ACSM Guidelines",
      "IPAQ/VO2max Non-Exercise Prediction Formula",
    ],
  },
  Poor: {
    finding:
      "Deine geschätzte VO2max liegt unter dem Altersdurchschnitt. Das limitiert sowohl alltägliche Belastbarkeit als auch Trainingsadaption.",
    fitness_context:
      "Alters- und geschlechtsspezifisch eingeordnet: Dein Wert ist unterhalb dessen, was für dein Profil typisch wäre. Kein akutes Risiko, aber ungenutztes Potenzial.",
    activity_link:
      "Mit deinem aktuellen Aktivitätsprofil bleibt der VO2max-Schätzer wahrscheinlich auf diesem Niveau. Mehr Volumen UND eine Intensitätskomponente heben den Wert.",
    recommendation:
      "1× pro Woche eine strukturierte Intervalleinheit (z.B. 4–6× 2 Min zügig, 2 Min locker) zusätzlich zum Grundausdauerbereich. Bei konsequenter Umsetzung sind Verbesserungen von 5–10% über 8–12 Wochen realistisch.",
    study_basis: [
      "Cooper Institute VO2max Norms",
      "ACSM Guidelines",
    ],
  },
  Fair: {
    finding:
      "Deine geschätzte VO2max liegt im durchschnittlichen Bereich für dein Alter und Geschlecht. Solide Basis, aber noch Spielraum nach oben — besonders wenn du jünger bist.",
    fitness_context:
      "In diesem Band sind die gesundheitlichen Grundvorteile gegeben, der weitere Gewinn an Lebenserwartung pro zusätzlichem Punkt ist aber noch spürbar — oberhalb dieses Bereichs flacht die Kurve langsam ab.",
    activity_link:
      "Aktivitätsvolumen ist wahrscheinlich im moderaten Bereich. Der nächste Hebel liegt in der Intensitäts-Progression, nicht nur im Volumen.",
    recommendation:
      "Gezielte VO2max-Intervalle 1× pro Woche: Norwegian 4×4 (4 Min bei 90–95% HFmax, 3 Min aktive Pause) — eines der am besten untersuchten Protokolle für VO2max-Steigerung.",
    study_basis: [
      "Cooper Institute VO2max Norms",
      "ACSM Guidelines",
    ],
  },
  Good: {
    finding:
      "Deine geschätzte VO2max ist überdurchschnittlich. Du hast eine solide kardiorespiratorische Basis, die sowohl Alltag als auch Training gut trägt.",
    fitness_context:
      "In diesem Band liegt der Gesundheitsbenefit nahe am Optimum der Kurve. Weitere Steigerungen verbessern Leistung spürbar, der zusätzliche Gesundheitsgewinn wird aber kleiner.",
    activity_link:
      "Dein Aktivitätslevel trägt diesen Wert. Solange das Volumen stabil bleibt, ist der Schätzer stabil.",
    recommendation:
      "Periodisierung einsetzen: Alternierende Meso-Zyklen aus Grundausdauer-Blöcken und intensiven Blöcken halten die Adaptation am Laufen, ohne in ein Plateau zu kippen.",
    study_basis: [
      "Cooper Institute VO2max Norms",
      "ACSM Guidelines",
    ],
  },
  Excellent: {
    finding:
      "Deine geschätzte VO2max ist im oberen Bereich für dein Alter und Geschlecht. Das ist ein signifikanter Performance-Vorteil und korreliert mit niedrigem langfristigem Mortalitätsrisiko.",
    fitness_context:
      "In diesem Band liegt ein deutlicher Lebenserwartungs-Vorteil. Die weitere Steigerung ist möglich, aber härter erarbeitet — Trainingsqualität und Regeneration werden zu den Schlüsselfaktoren.",
    activity_link:
      "Hohe Aktivitätskategorie plus strukturierte Intensitätsverteilung. Weitere Zuwächse hängen stärker von Recovery und Schlaf ab als vom reinen Trainingsvolumen.",
    recommendation:
      "Intensitätsblöcke strukturiert einsetzen (z.B. 2–3 Wochen hoch, 1 Woche Deload). Recovery-Monitoring (HRV, subjektives Gefühl) wird jetzt zum limitierenden Faktor, nicht mehr das Training selbst.",
    study_basis: [
      "Cooper Institute VO2max Norms",
      "ACSM Guidelines",
    ],
  },
  Superior: {
    finding:
      "Deine geschätzte VO2max liegt im Spitzenbereich für dein Alter und Geschlecht — ein Wert, den nur ein kleiner Prozentsatz erreicht. Kardiorespiratorisch spielst du in der obersten Kategorie.",
    fitness_context:
      "In diesem Band liegt der maximale Lebenserwartungs-Benefit. Weitere VO2max-Steigerungen sind physiologisch zunehmend schwer, der Fokus verschiebt sich von Maximalwert-Jagd auf Leistungs-Erhaltung über Jahre.",
    activity_link:
      "Du bist in der höchsten IPAQ-Kategorie und die Schätzformel spiegelt das. In dieser Zone limitieren nicht mehr Volumen/Intensität, sondern Schlaf, Stress und Ernährung die weiteren Fortschritte.",
    recommendation:
      "Erhalt und Spezifität statt Steigerung: Periodisierung mit sport-spezifischen Intensitäten, Recovery-Prioritäten und Langzeit-Monitoring (Trend wichtiger als einzelne Messung).",
    study_basis: [
      "Cooper Institute VO2max Norms",
      "ACSM Guidelines",
    ],
  },
};

export const VO2MAX_DISCLAIMER =
  "Dieser VO2max-Wert ist eine algorithmische Schätzung auf Basis einer validierten Non-Exercise-Formel (Alter, BMI, Aktivitätskategorie, Geschlecht). Er ist KEIN gemessener Laborwert und ersetzt keine Spiroergometrie oder einen klinischen Belastungstest. Die Schätzung liefert eine robuste Einordnung für Performance-Insights — nicht mehr, nicht weniger.";
