// Recovery interpretations — training recovery status bands with explicit
// sleep and stress dependency callouts (they are multiplicative governors,
// not additive factors).

import type { RecoveryBand } from "../scoring/recovery";

export interface RecoveryBandInterpretation {
  finding: string;
  overtraining_context: string;
  sleep_stress_dependency: string;
  recommendation: string;
  study_basis: string[];
}

export const RECOVERY_INTERPRETATIONS: Record<
  RecoveryBand,
  RecoveryBandInterpretation
> = {
  critical: {
    finding:
      "Deine Erholungskapazität ist deutlich defizitär. Die Kombination aus Trainingslast, subjektivem Erholungsgefühl und den Governoren Schlaf/Stress lässt wenig bis keinen Spielraum für weitere Adaptationsreize.",
    overtraining_context:
      "Dieses Muster entspricht dem Übergang von funktionalem zu nicht-funktionalem Overreaching. Bleibt es länger als 2–3 Wochen bestehen, steigt das Risiko für OTS (Overtraining Syndrome) mit Kraftverlusten bis zu 14% und erhöhter Verletzungsanfälligkeit.",
    sleep_stress_dependency:
      "Selbst bei optimaler Trainingsplanung bleibt Recovery bei diesem Sleep-/Stress-Profil gedeckelt: Wachstumshormon-Ausschüttung, Testosteron-Regeneration und parasympathische Aktivierung arbeiten unter ihrer Kapazität.",
    recommendation:
      "Trainingsvolumen für 5–7 Tage um 30–50% reduzieren, Intensität herausnehmen, Schlaf auf mindestens 7,5 h anheben. Ein Regenerations-Assessment (HRV + Ruhepuls morgens) in 7 Tagen wiederholen.",
    study_basis: [
      "Kaczmarek et al. MDPI (2025)",
      "PMC OTS Review (2025) — OTS-Kontinuum",
      "ScienceDirect OTS Molecular (2025) — bis zu 14% Kraftverlust",
      "Kellmann ARSS/SRSS (2024) — Recovery-Stress-Balance",
    ],
  },
  low: {
    finding:
      "Deine Erholung hinkt der Trainingslast hinterher. Du trainierst oberhalb deiner aktuellen Regenerationskapazität — Adaptation findet noch statt, aber mit abnehmender Effizienz.",
    overtraining_context:
      "Das ist funktionales Overreaching, noch reversibel. Ohne Entlastung in den kommenden 1–2 Wochen kippt es jedoch in einen Zustand, in dem Leistung stagniert oder zurückgeht.",
    sleep_stress_dependency:
      "Sleep- und Stress-Multiplier ziehen den Recovery-Score sichtbar. Das bedeutet: Dein Training ist möglicherweise nicht zu viel — deine Erholungs-Umgebung ist zu dünn.",
    recommendation:
      "Eine Deload-Woche (Volumen −40%, Intensität stabil) einlegen. Parallel den schwächeren Governor (Schlaf oder Stress) gezielt adressieren — der eine Hebel wirkt auf beides.",
    study_basis: [
      "PMC OTS Review (2025)",
      "HRV Narrative Review MDPI (2024)",
      "PRS Scale IJSPP (2022) — Perceived Recovery Status",
    ],
  },
  moderate: {
    finding:
      "Deine Erholung ist ausreichend für deinen aktuellen Trainingsreiz, aber ohne große Reserve. Kleinere Störungen (Schlafverlust, Krankheit, emotionaler Stress) kippen das Gleichgewicht schnell.",
    overtraining_context:
      "Nicht im OTS-Risikobereich — aber auch nicht im Bereich, in dem du aggressive Progression fahren kannst, ohne die Governoren aktiv zu pflegen.",
    sleep_stress_dependency:
      "Schlaf und/oder Stress arbeiten nicht auf vollem Multiplier. Eine Verbesserung in einem der beiden Bereiche hebt Recovery automatisch mit.",
    recommendation:
      "Progression moderat halten (+5–10% Wochenvolumen max). Parallel einen konkreten Hebel bei Schlaf oder Stress priorisieren, um den Multiplier zu heben.",
    study_basis: [
      "HRV Narrative Review MDPI (2024)",
      "Scientific Reports HRV-Training (2025) — Integration psychologisch + physiologisch",
    ],
  },
  good: {
    finding:
      "Deine Erholung trägt dein Training zuverlässig. Die Governoren Schlaf und Stress arbeiten weitgehend uneingeschränkt — Anpassung findet effizient statt.",
    overtraining_context:
      "Kein Risiko im OTS-Kontinuum. Du hast Spielraum für strukturierte Progression und höhere Intensitätsanteile.",
    sleep_stress_dependency:
      "Sleep- und Stress-Multiplier liegen nahe 1.0 — Recovery wird aktuell primär durch dein Trainingssignal definiert, nicht durch Defizite in Umgebungsfaktoren.",
    recommendation:
      "Periodisierung jetzt gezielt einsetzen: Eine Hochintensitäts-Woche pro Meso-Zyklus, gefolgt von einer Deload-Woche hält die Kapazität hoch, ohne zu überfordern.",
    study_basis: [
      "PMC Recovery Strategies Umbrella Review (2022)",
      "Kellmann ARSS/SRSS (2024)",
    ],
  },
  excellent: {
    finding:
      "Deine Erholungskapazität ist im oberen Bereich. Schlaf, Stress und subjektives Erholungsgefühl sind aligned — du regenerierst schneller, als du dich belastest.",
    overtraining_context:
      "OTS-Risiko auf Basis der aktuellen Datenlage praktisch null. Der Körper ist in anaboler Bereitschaft.",
    sleep_stress_dependency:
      "Beide Multiplier bei 1.0. Recovery wird weder von Schlaf noch von Stress limitiert — das bedeutet: Trainingsreiz kann aggressiv gesetzt werden, ohne die Regeneration zu kannibalisieren.",
    recommendation:
      "Nutze das Fenster für gezielte Performance-Blöcke. Dokumentiere HRV morgens, um erste Abweichungen früh zu erkennen — exzellente Recovery-Zustände lassen sich selten länger als 4–6 Wochen halten.",
    study_basis: [
      "PMC Recovery Strategies Umbrella Review (2022)",
      "HRV Narrative Review MDPI (2024)",
    ],
  },
};

export const OVERTRAINING_WARNING =
  "SYSTEMISCHE WARNUNG — ÜBERTRAININGS-RISIKO: Deine Trainingsfrequenz (≥6 Tage/Woche) kombiniert mit einer Basis-Recovery unter 50 entspricht dem Muster nicht-funktionalen Overreachings. PMC OTS Review (2025) und ScienceDirect OTS Molecular (2025) dokumentieren Kraftverluste von bis zu 14% und signifikant erhöhte Verletzungsanfälligkeit in diesem Zustand. Empfehlung: 7 Tage Deload (Volumen −50%, Intensität raus), Schlaf priorisieren, danach Recovery-Check wiederholen. Wenn die Situation länger als 14 Tage anhält, ärztlich abklären lassen.";
