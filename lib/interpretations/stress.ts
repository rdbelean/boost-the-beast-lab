// Stress interpretations — HPA-axis framing, systemic impact on sleep,
// recovery, metabolic and testosterone. Evidence-backed interventions with
// effect sizes where available.

import type { StressBand } from "../scoring/stress";

export interface StressBandInterpretation {
  finding: string;
  systemic_impact: string;
  recommendation: string;
  study_basis: string[];
}

export const STRESS_INTERPRETATIONS: Record<StressBand, StressBandInterpretation> =
  {
    critical: {
      finding:
        "Dein Stress-Profil liegt im kritischen Bereich. Die Kombination aus hohem subjektivem Stresslevel und reduziertem Sleep-/Recovery-Puffer deutet auf eine dauerhaft aktivierte HPA-Achse hin — chronische Glucocorticoid-Exposition mit messbaren Systemfolgen.",
      systemic_impact:
        "Chronischer Stress hemmt die HPG-Achse (Testosteron sinkt), verschlechtert die Insulin-Sensitivität, senkt die kardiovaskuläre Resilienz und beeinträchtigt strukturell Präfrontalkortex und Hippocampus (PMC Chronic Stress & Cognition 2024). Kein anderer einzelner Faktor beeinflusst so viele Module gleichzeitig negativ.",
      recommendation:
        "Sofortige Downregulation ist Priorität. Mindfulness-basierte Interventionen und Entspannungsverfahren zeigen in einer RCT-Meta-Analyse (Psychoneuroendocrinology 2024) Effektstärken g=0.345 bzw. g=0.347 auf Cortisol-Senkung. Konkret: 2× täglich 10 Minuten strukturierte Atem- oder Meditationspraxis, plus Schlaf-Priorität. Bei anhaltender Belastung ärztlich/therapeutisch abklären.",
      study_basis: [
        "StatPearls NCBI (2024) — SAM/HPA/Immune Response",
        "PMC Chronic Stress & Cognition (2024)",
        "Frontiers Allostatic Load (2025)",
        "Tandfonline Testosterone & Cortisol (2023)",
        "Psychoneuroendocrinology Meta-Analysis (2024)",
      ],
    },
    high: {
      finding:
        "Dein Stress-Level liegt hoch. Subjektive Belastung und unzureichender Erholungs-Puffer erzeugen allostatische Last — dein Körper zahlt laufend die 'Kosten der Anpassung' (Allostatic Load Modell).",
      systemic_impact:
        "In diesem Bereich beginnen die sekundären Effekte sichtbar zu werden: Schlafqualität leidet, Recovery wird gedeckelt, Testosteron-Regeneration ist gebremst, viszerale Fetteinlagerung wird begünstigt. Das Burnout-Risiko steigt, wenn der Zustand länger als 4–6 Wochen anhält.",
      recommendation:
        "Zwei evidenzbasierte Hebel parallel: (1) strukturierte Downregulation (10 Min Box-Breathing 4-4-4-4 oder Meditation zweimal täglich), (2) Schlaf-Priorität (feste Zeiten, 7,5+ h Ziel). Entspannungsverfahren und Mindfulness zeigen in Meta-Analysen praktisch identische Cortisol-senkende Wirkung.",
      study_basis: [
        "Frontiers Allostatic Load (2025)",
        "PMC Immunology of Stress JCM (2024)",
        "Psychoneuroendocrinology Meta-Analysis (2024)",
        "Regensburg Burnout Project",
      ],
    },
    elevated: {
      finding:
        "Dein Stress-Level ist erhöht, aber noch kompensierbar. Der Sleep-Puffer arbeitet teilweise — du hast Ressourcen, aber der Stress-Recovery-Saldo ist nicht stabil positiv.",
      systemic_impact:
        "Kellmann's Recovery-Stress-Balance zeigt: Anhaltendes Ungleichgewicht verschlechtert die Trainingstoleranz, noch bevor klinische Marker auffällig werden. Die Auswirkungen treffen zuerst Schlafqualität und Erholungsgefühl, dann Trainingsleistung.",
      recommendation:
        "Eine tägliche 5-Minuten-Downregulation-Routine (Box-Breathing, Nasenatmung in Ruhe) installieren. Parallel: Stressoren konkret identifizieren — was ist strukturell (Arbeitsdichte), was situativ (akute Projekte)? Strukturelle Stressoren brauchen andere Interventionen als situative.",
      study_basis: [
        "Kellmann ARSS/SRSS (2024)",
        "PMC Stress & Sport Performance PNEI (2024)",
        "HRV Narrative Review MDPI (2024)",
      ],
    },
    moderate: {
      finding:
        "Dein Stress-Level ist moderat. Du hast Resilienz-Reserve, und der Sleep-/Recovery-Puffer arbeitet weitgehend. Kleinere akute Stressoren kannst du ohne systemische Folgen abfangen.",
      systemic_impact:
        "In diesem Bereich arbeitet die HPA-Achse in gesundem Tagesrhythmus. Akuter Stress ist adaptiv (fördert Fokus und Leistung), ohne in Immunsuppression oder Testosteron-Suppression zu kippen.",
      recommendation:
        "Status halten. Der größte Schutz gegen Abrutschen ist Regelmäßigkeit: feste Schlafenszeiten, tägliche Bewegung, und eine stabile (wenn auch kurze) Downregulation-Routine als Versicherung.",
      study_basis: [
        "StatPearls NCBI (2024)",
        "PMC Immunology of Stress JCM (2024)",
      ],
    },
    low_stress: {
      finding:
        "Dein Stress-Profil liegt im optimalen Bereich. Subjektive Belastung niedrig, Sleep- und Recovery-Puffer voll aktiv — die HPA-Achse hat Erholungs-Fenster und arbeitet unauffällig.",
      systemic_impact:
        "Maximale Rückkopplung positiv: Testosteron-Regeneration, Insulin-Sensitivität, Immunfunktion und parasympathische Aktivierung sind alle unterstützt. Dein Körper hat Ressourcen für Performance-Fokus statt nur für Selbsterhalt.",
      recommendation:
        "Nutze das Fenster: In stressfreien Phasen entstehen die messbarsten Trainings- und Gesundheitsfortschritte. Strukturierte Performance-Blöcke sind jetzt am wirksamsten — und eine bewusste Stress-Routine als Versicherung für kommende hohe Phasen einbauen.",
      study_basis: [
        "PMC Stress & Sport Performance PNEI (2024)",
        "Frontiers Allostatic Load (2025)",
      ],
    },
  };

export const CHRONIC_STRESS_WARNING =
  "SYSTEMISCHE WARNUNG — CHRONISCHER STRESS: Dein selbstberichtetes Stresslevel (≥8/10) kombiniert mit einem Sleep-Score unter 50 entspricht einem Muster, das in der Allostatic-Load-Literatur (Frontiers 2025) mit Multi-System-Dysregulation assoziiert ist: CVD-Risiko, Schlafarchitektur, Testosteron, Insulin-Sensitivität und Resilienz verschlechtern sich gleichzeitig. Priorität: Schlaf auf mindestens 7,5h anheben und eine strukturierte Downregulation-Routine (Meditation, Atemarbeit) etablieren. Bei Persistenz >2 Wochen ärztliche/therapeutische Begleitung erwägen.";

export const HPA_AXIS_WARNING =
  "SYSTEMISCHE WARNUNG — HPA-ACHSEN-BELASTUNG: Die Kombination aus erhöhtem Stress (≥7/10) und reduzierter Schlafqualität (Sleep-Score <55) deutet auf eine beginnende HPA-Achsen-Dysregulation hin. PMC Chronic Stress & Cognition (2024) dokumentiert in diesem Muster eine Glucocorticoid-Rezeptor-Downregulation mit Folgen für Präfrontalkortex und Hippocampus. Frühintervention (Schlaf-Priorisierung + tägliche Downregulation) ist hier besonders wirksam, bevor das Muster chronifiziert.";
