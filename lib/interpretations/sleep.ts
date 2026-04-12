// Sleep interpretations — bands grounded in NSF/AASM consensus and recent
// evidence on sleep, recovery and metabolic health.
//
// Each band describes:
//   finding         — what this score says in plain language
//   metabolic_link  — how sleep in this band affects insulin/visceral fat
//   recovery_link   — how sleep in this band affects muscle recovery / GH
//   recommendation  — concrete next step
//   study_basis     — the studies that back the above statements

import type { SleepBand } from "../scoring/sleep";

export interface SleepBandInterpretation {
  finding: string;
  metabolic_link: string;
  recovery_link: string;
  recommendation: string;
  study_basis: string[];
}

export const SLEEP_INTERPRETATIONS: Record<SleepBand, SleepBandInterpretation> = {
  poor: {
    finding:
      "Dein Schlafprofil liegt deutlich unterhalb der NSF/AASM-Empfehlung. Die Kombination aus zu wenig Zeit im Bett, schwacher subjektiver Qualität und/oder häufigen Wachphasen deutet darauf hin, dass Tiefschlaf-Phasen (N3) kaum erreicht werden — genau die Phasen, in denen Wachstumshormon am stärksten ausgeschüttet wird.",
    metabolic_link:
      "Chronisch zu kurzer oder fragmentierter Schlaf erhöht die Insulinresistenz signifikant und begünstigt viszerale Fetteinlagerung — unabhängig von der Ernährung. Die HPA-Achse läuft bei chronischem Schlafmangel dauerhaft erhöht, Cortisol bleibt hoch.",
    recovery_link:
      "Ohne ausreichend N3-Anteil fehlt das anabole Fenster: Wachstumshormon-Peak, Testosteron-Regeneration und Muskelreparatur sind limitiert. Subjektive Erholung kann trügen — physiologisch bleibst du im Defizit.",
    recommendation:
      "Priorität 1: Schlafdauer auf mindestens 7 Stunden anheben und Bett-/Aufsteh-Zeit innerhalb eines ±30-Minuten-Fensters stabilisieren. Koffein ab 14:00 eliminieren, Raumtemperatur 17–19 °C.",
    study_basis: [
      "NSF/AASM Consensus — Watson et al. (2015)",
      "Kaczmarek et al. MDPI (2025) — Cortisol↑, Testosteron↓, GH↓",
      "Covassin et al. RCT (2022) — viszerales Fett unter Schlafmangel",
      "Sondrup et al. Sleep Medicine Reviews (2022) — Insulinresistenz",
      "PMC Sleep & Athletic Performance (2024) — GH-Peak in N3",
    ],
  },
  moderate: {
    finding:
      "Dein Schlaf liegt im unteren Normalbereich — ausreichend, um den Tag zu bewältigen, aber nicht ausreichend, um vollständige Regeneration und metabolische Stabilität zu gewährleisten. Mindestens ein Teilbereich (Dauer, Qualität oder Kontinuität) zieht den Gesamtscore.",
    metabolic_link:
      "Grenzwertige Schlafdauer (6–7h) ist in Meta-Analysen mit erhöhter Insulinresistenz und Übergewichts-Risiko assoziiert. Die metabolische Reserve ist schmaler als sie sich anfühlt.",
    recovery_link:
      "Du erreichst N3 zwar, aber fragmentiert. Das reduziert die kumulative Wachstumshormon-Ausschüttung und damit die verfügbare Regeneration zwischen Trainingsreizen.",
    recommendation:
      "Identifiziere den schwächsten Einzelfaktor (Dauer vs. Qualität vs. Durchschlafen) und arbeite dort gezielt — meist Schlafhygiene-Basics: feste Zeiten, dunkler kühler Raum, kein Blaulicht 60 Min vor dem Einschlafen.",
    study_basis: [
      "NSF/AASM Consensus — Watson et al. (2015)",
      "Frontiers Medicine Umbrella Review (2021) — 85 Meta-Analysen",
      "Kalkanis et al. Sleep Medicine Reviews (2025) — Schlafregelmäßigkeit",
    ],
  },
  good: {
    finding:
      "Dein Schlafprofil bewegt sich im empfohlenen Bereich. Dauer, Qualität und Durchschlafen harmonieren weitgehend — du regenerierst solide und hast eine stabile Basis für Training, Stoffwechsel und Stress-Resilienz.",
    metabolic_link:
      "In diesem Bereich arbeitet die Insulin-Sensitivität physiologisch normal und Cortisol folgt einem gesunden Tagesrhythmus. Schlaf unterstützt hier metabolische Gesundheit aktiv.",
    recovery_link:
      "N3-Anteil ist ausreichend für konsistente Wachstumshormon-Ausschüttung. Trainingsreize werden effektiv in Anpassung übersetzt.",
    recommendation:
      "Halte die Routine stabil — der größte zusätzliche Hebel liegt in der Regelmäßigkeit, nicht in mehr Stunden. Gleiche Aufsteh-Zeit auch am Wochenende schärft den circadianen Rhythmus.",
    study_basis: [
      "NSF/AASM Consensus — Watson et al. (2015)",
      "Frontiers Exercise & Sleep Meta-Analysis (2024)",
      "PMC Athletic Recovery Review — N3 und physische Erholung",
    ],
  },
  excellent: {
    finding:
      "Dein Schlaf ist ein aktiver Performance-Vorteil. Dauer, Qualität, Kontinuität und subjektive Erholung liegen alle im oberen Bereich — dein N3-Anteil dürfte optimal sein und die HPA-Achse arbeitet unauffällig.",
    metabolic_link:
      "Insulin-Sensitivität, Appetit-Regulation und Cortisol-Kurve profitieren maximal. Metabolische Resilienz ist hier kein limitierender Faktor.",
    recovery_link:
      "Wachstumshormon-Peaks sind konsistent, Testosteron-Regeneration läuft ungestört — maximale anabole Verfügbarkeit zwischen Trainingsreizen.",
    recommendation:
      "Status halten. Die größte Gefahr: Lebensphasen (Reisen, Stress, Kinder) kippen die Routine schneller als erwartet. Monitoring der Bettzeit-Konsistenz lohnt sich.",
    study_basis: [
      "NSF/AASM Consensus — Watson et al. (2015)",
      "PMC Sleep & Athletic Performance (2024)",
      "Frontiers Medicine Umbrella Review (2021)",
    ],
  },
};

export const SLEEP_CONSISTENCY_NOTE =
  "Unregelmäßiger Schlafrhythmus (wechselnde Bett- und Aufsteh-Zeiten) hat laut aktueller Evidenz (Kalkanis et al., Sleep Medicine Reviews 2025) einen größeren negativen Einfluss auf metabolische und kognitive Marker als bisher angenommen — unabhängig von der absoluten Schlafdauer. Feste Zeiten sind oft der größte Hebel.";
