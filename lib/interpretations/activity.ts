// Activity interpretations — IPAQ category bands with WHO/AHA/AMA mortality
// context. Sitting time is surfaced separately because it is an independent
// CVD risk factor even after adjusting for MVPA (AHA Science Advisory).

import type { ActivityBand, SittingRiskFlag } from "../scoring/activity";

export interface ActivityBandInterpretation {
  finding: string;
  mortality_context: string;
  recommendation: string;
  study_basis: string[];
}

export const ACTIVITY_INTERPRETATIONS: Record<
  ActivityBand,
  ActivityBandInterpretation
> = {
  low: {
    finding:
      "Dein wöchentliches Aktivitätsvolumen liegt unterhalb der WHO-Mindestempfehlung von 150 Minuten moderater oder 75 Minuten intensiver Bewegung. Das limitiert sowohl kardiovaskuläre als auch metabolische Anpassungsprozesse deutlich.",
    mortality_context:
      "Die AHA-Langzeitstudie mit über 100.000 Teilnehmern zeigt, dass das Erreichen der 150–300-Min-Zone eine Mortalitätsreduktion von rund 20–21% bringt — du bewegst dich aktuell unterhalb dieses Schwellenwerts, d.h. der größte Einzel-Hebel für Lebensqualität und Lebenserwartung ist noch ungenutzt.",
    recommendation:
      "Baue das Wochenvolumen schrittweise auf: Start mit 3× 30 Minuten zügigem Gehen, dann 1× intensiveres Training (Intervall, Krafttraining) ergänzen. Ziel: 150 Min moderate Aktivität innerhalb von 6–8 Wochen.",
    study_basis: [
      "WHO Physical Activity Guidelines (2020, 2024)",
      "AHA Circulation Study (2022) — 100.000+ Teilnehmer, 30 Jahre",
      "WHO Global Stats (2024) — 1,8 Mrd Erwachsene inaktiv",
    ],
  },
  moderate: {
    finding:
      "Du erreichst die WHO-Mindestempfehlung. Dein Aktivitätsprofil liefert substanzielle gesundheitliche Vorteile — aber du liegst im unteren bis mittleren Bereich der Kurve, in der zusätzliche Aktivität noch spürbare zusätzliche Effekte bringt.",
    mortality_context:
      "Im Bereich 150–300 Min/Woche moderate Aktivität zeigt die AHA-Evidenz eine Mortalitätsreduktion um 20–21%. Die AMA-Longevity-Analyse (2024) ergänzt: 150–299 Min/Woche intensiv = 21–23% Reduktion Gesamtmortalität und 27–33% Reduktion CVD-Mortalität. Zwei- bis viermal mehr Aktivität bringt nochmal zusätzliche Risikoreduktion.",
    recommendation:
      "Strukturiere Intensität statt nur Volumen: 1–2× pro Woche gezielt intensive Einheiten (z.B. 4×4 Min Intervalle) ergänzen — das verschiebt dich in die Zone mit dem steilsten zusätzlichen Gesundheitsgewinn.",
    study_basis: [
      "WHO Physical Activity Guidelines (2020, 2024)",
      "AHA Circulation Study (2022)",
      "AMA Longevity Study (2024)",
      "IPAQ Meta-Analysis (Cambridge Core)",
    ],
  },
  high: {
    finding:
      "Dein Aktivitätsvolumen liegt im oberen Bereich der IPAQ-Skala. Du bist quantitativ abgesichert — ab hier bestimmen Qualität, Intensitätsverteilung und Regeneration den weiteren Fortschritt.",
    mortality_context:
      "Zwei- bis viermal oberhalb der WHO-Mindestempfehlung zeigt die AHA-Evidenz die maximale Mortalitätsreduktion. Oberhalb dieser Zone flacht die Kurve ab — mehr Volumen bringt nicht mehr Gesundheit, kann aber die Recovery-Last erhöhen.",
    recommendation:
      "Priorität verschiebt sich: 80/20-Intensitätsverteilung (80% niedrig-moderat, 20% hoch-intensiv), strukturierte Deload-Wochen, und — falls nicht vorhanden — ein Krafttraining-Block 2× pro Woche zur Abdeckung der muskulo-skelettalen Komponente.",
    study_basis: [
      "WHO Physical Activity Guidelines (2020, 2024)",
      "AHA Circulation Study (2022) — zwei- bis viermal mehr = zusätzliche Reduktion",
      "AMA Longevity Study (2024)",
    ],
  },
};

export interface SittingFlagPayload {
  flag: "critical" | "elevated";
  text: string;
}

export const SITTING_FLAGS: Record<SittingRiskFlag, SittingFlagPayload | null> = {
  critical: {
    flag: "critical",
    text: "Deine Sitzzeit liegt über 8 Stunden pro Tag. Frontiers (2022) dokumentiert bei dieser Schwelle ein erhöhtes Risiko für 12 chronische Erkrankungen. Die AHA Science Advisory klassifiziert Sitzzeit als unabhängigen CVD-Risikofaktor — dein Training puffert das nur teilweise ab. Praktischer Hebel: Sitz-Blöcke nach spätestens 45 Minuten aktiv unterbrechen (2–3 Minuten gehen, nicht nur aufstehen).",
  },
  elevated: {
    flag: "elevated",
    text: "Deine Sitzzeit (6–8 h/Tag) liegt in einer Zone, in der das metabolische Syndrom-Risiko laut AHA Advisory um den Faktor 1,73 steigt — auch wenn du ausreichend trainierst. Weniger Sitzen zählt zusätzlich zu mehr Training, nicht anstatt.",
  },
  normal: null,
};
