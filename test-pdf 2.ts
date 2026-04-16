import { generatePDF, PdfReportContent, PdfScores, PdfUserProfile } from './lib/pdf/generateReport';
import { writeFileSync } from 'fs';

async function main() {
  const content: PdfReportContent = {
    headline: 'Performance Index 62/100 — solide mit klarem Optimierungspotenzial.',
    executive_summary: 'Dein Overall Performance Index liegt bei 62/100 (moderate). Die sechs Module liefern ein klares Bild: Schlaf 65 (good), Recovery 70 (good), Aktivitaet 55 (moderate), Stoffwechsel 72 (good), Stress 60 (moderate) und kardiorespiratorische Fitness 50 (moderate). Der groesste Hebel liegt aktuell im Bereich Stress und Aktivitaet. Chronischer Stress hemmt die HPG-Achse und limitiert gleichzeitig die Schlafqualitaet — ein Doppel-Effekt, der beide Module nach unten zieht.',
    critical_flag: null,
    modules: {
      sleep: {
        score_context: 'Dein Sleep Score liegt bei 65/100 bei einer durchschnittlichen Schlafdauer von 7h. Die Bewertung ordnet dich in "good" ein. Die Kombination aus subjektiver Qualitaet und Erholungsgefuehl ergibt ein solides Recovery-Profil.',
        key_finding: 'Deine Schlafarchitektur zeigt ausreichende Dauer, aber die subjektive Qualitaet deutet auf Raum fuer Verbesserung hin. Der Sleep Governor limitiert deine Regeneration subtil.',
        systemic_connection: 'Schlaf ist der Governor fuer Recovery: der sleepMultiplier deckelt die Regeneration — unabhaengig von Trainingsqualitaet und ernaehrungsbedingten Massnahmen.',
        limitation: 'Schlafqualitaet und gelegentliche naechliche Unterbrechungen druecken den Gesamt-Score und limitieren die Regenerationstiefe.',
        recommendation: 'Fixiere Bett- und Aufstehzeit auf +-30 Minuten ueber sieben Tage und halte die Schlafzimmer-Temperatur bei 17-19 Grad Celsius.',
      },
      recovery: {
        score_context: 'Recovery Score 70/100 im Band "good" — berechnet aus Trainingslast, subjektiver Erholung und den Governoren Schlaf und Stress.',
        key_finding: 'Deine Erholung traegt dein Training zuverlassig und mit Spielraum fuer Progression. Die aktuellen Governoren Schlaf und Stress arbeiten im akzeptablen Bereich.',
        systemic_connection: 'Recovery ist das Produkt aus Trainingssignal mal Schlaf mal Stress. Kein einzelner Hebel reicht, wenn einer der drei Faktoren limitiert.',
        limitation: 'Sleep- oder Stress-Multiplier koennten weiter optimiert werden, um das volle Erholungspotenzial auszuschoepfen.',
        recommendation: 'Periodisierung einsetzen: Eine Hochintensitaets-Woche, gefolgt von einer Deload-Woche fuer optimale Adaptation.',
      },
      activity: {
        score_context: 'Dein Activity Score von 55/100 basiert auf 1200 MET-Minuten pro Woche und ergibt die IPAQ-Kategorie MODERATE.',
        key_finding: 'Die Trainings- und Alltagsaktivitaet positioniert dich im Band "moderate". Du bewegst dich quantitativ im empfohlenen Bereich der WHO-Mindestempfehlung.',
        systemic_connection: 'Aktivitaet treibt VO2max direkt und wirkt sekundaer positiv auf Schlafqualitaet und metabolische Gesundheit durch erhoehte Insulin-Sensitivitaet.',
        limitation: 'Das woechentliche MET-Minuten-Volumen reicht nicht aus, um den vollen kardiovaskulaeren und metabolischen Effekt zu erzielen.',
        recommendation: 'Ziele auf mindestens 150 min moderate oder 75 min intensive Aktivitaet pro Woche, idealerweise verteilt auf 4-5 Tage.',
      },
      metabolic: {
        score_context: 'Metabolic Score 72/100 bei BMI 24.5 (normal) — Zusammenspiel aus Koerperzusammensetzung, Hydration, Ernaehrungsrhythmus und Sitzzeit.',
        key_finding: 'Die metabolische Einordnung landet im Band "good". Die Koerperzusammensetzung liegt im optimalen Bereich und unterstuetzt die Gesamtperformance.',
        systemic_connection: 'Sitzzeit ist unabhaengig vom Sport ein CVD-Risikofaktor. Metabolic beeinflusst VO2max indirekt ueber BMI und koerperliche Zusammensetzung.',
        limitation: 'Hydration, Mahlzeiten-Rhythmus oder Sitzzeit koennten die metabolische Grundlast weiter verbessern.',
        recommendation: 'Trinke taeglich 30-35 ml pro kg Koerpergewicht, unterbreche Sitzbloecke nach spaetestens 45 Minuten und setze 4+ Gemueseportionen als Standard.',
      },
      stress: {
        score_context: 'Stress Score 60/100 (moderate) — gewichtete Kombination aus selbstberichtetem Stresslevel und Sleep/Recovery-Puffer.',
        key_finding: 'Die Stress-Regulation befindet sich im Band "moderate". Der chronische Belastungs-Level verbraucht Ressourcen, die sonst in Adaption fliessen wuerden.',
        systemic_connection: 'Chronischer Stress hemmt die HPG-Achse (Testosteron sinkt) UND verschlechtert die Insulin-Sensitivitaet gleichzeitig — der am weitesten reichende Hebel im System.',
        limitation: 'Fehlende bewusste Downregulation verhindert vollstaendige parasympathische Erholung nach Belastungsphasen.',
        recommendation: 'Installiere zwei 5-Minuten-Downregulation-Fenster pro Tag (Box-Breathing 4-4-4-4 oder Nasenatmung in Ruhe).',
      },
      vo2max: {
        score_context: 'Geschaetzter VO2max: 38 ml/kg/min (moderate) — algorithmische Schaetzung auf Basis von Alter, BMI und Aktivitaetskategorie.',
        key_finding: 'Die kardiorespiratorische Leistungsfaehigkeit liegt im Band "moderate". VO2max ist einer der staerksten Einzel-Praediktoren fuer langfristige Performance und Longevity.',
        systemic_connection: 'VO2max ist direkt an das Aktivitaetslevel gekoppelt — der einzige Hebel zur Steigerung ist Aktivitaet mit Intensitaetskomponente und ausreichender Recovery.',
        limitation: 'Limitiert durch geringes oder unspezifisches Intensitaetsprofil im aktuellen Trainingsprogramm.',
        recommendation: 'Integriere 1x pro Woche ein VO2max-Intervall (z.B. 4x4 min bei 90-95% HFmax, dazwischen 3 min aktive Pause).',
      },
    },
    top_priority: 'Hebel Nr. 1: Stress. Der groesste messbare Score-Gewinn in 30 Tagen liegt hier — und zieht mindestens 2 weitere Module mit nach oben. Chronischer Stress hemmt gleichzeitig Testosteron-Produktion und Insulin-Sensitivitaet.',
    prognose_30_days: 'Bei konsequenter Umsetzung der Empfehlungen ist ein realistischer Overall-Zuwachs von +6 bis +12 Punkten moeglich.',
    disclaimer: 'Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz fuer medizinische Diagnostik. VO2max ist eine algorithmische Schaetzung — keine Labormessung.',
  };

  const scores: PdfScores = {
    sleep: { score: 65, band: 'good' },
    recovery: { score: 70, band: 'good' },
    activity: { score: 55, band: 'moderate' },
    metabolic: { score: 72, band: 'good' },
    stress: { score: 60, band: 'moderate' },
    vo2max: { score: 50, band: 'moderate', estimated: 38 },
    overall: { score: 62, band: 'moderate' },
    total_met: 1200,
    sleep_duration_hours: 7,
    sitting_hours: 8,
    training_days: 3,
  };

  const user: PdfUserProfile = {
    email: 'test@boostthebeast.com',
    age: 32,
    gender: 'male',
    bmi: 24.5,
    bmi_category: 'normal',
  };

  console.log('Generating PDF with pdf-lib...');
  const t = Date.now();
  const buf = await generatePDF(content, scores, user);
  console.log('Done in', Date.now() - t, 'ms');
  console.log('Size:', buf.length, 'bytes (', (buf.length / 1024).toFixed(1), 'KB)');
  writeFileSync('/tmp/btb-test-report.pdf', buf);
  console.log('Saved to /tmp/btb-test-report.pdf');
}
main().catch(e => { console.error('FAILED:', e); process.exit(1); });
