import { generatePDF, PdfReportContent, PdfScores, PdfUserProfile } from './lib/pdf/generateReport';
import { writeFileSync } from 'fs';
async function main() {
  const content: PdfReportContent = {
    headline: 'Performance Index 62/100 — solide mit klarem Optimierungspotenzial.',
    executive_summary: 'Dein Overall Performance Index liegt bei 62/100 (moderate). Die sechs Module liefern ein klares Bild: Schlaf 65 (good), Recovery 70 (good), Aktivitaet 55 (moderate), Stoffwechsel 72 (good), Stress 60 (moderate) und kardiorespiratorische Fitness 50 (moderate). Der groesste Hebel liegt aktuell im Bereich Stress und Aktivitaet. Chronischer Stress hemmt die HPG-Achse und limitiert gleichzeitig die Schlafqualitaet — ein Doppel-Effekt, der beide Module nach unten zieht. Mit gezielten Massnahmen in diesen Bereichen ist ein Zuwachs von plus 8 bis 12 Punkten in 30 Tagen realistisch.',
    critical_flag: null,
    modules: {
      sleep: {
        score_context: 'Dein Sleep Score liegt bei 65/100 bei einer durchschnittlichen Schlafdauer von 7h. Die Bewertung ordnet dich in das Band "good" ein. Der Score setzt sich zusammen aus Schlafdauer (40%), subjektiver Schlafqualitaet (30%), naechlichen Unterbrechungen (20%) und Erholungsgefuehl morgens (10%). Damit liegst du oberhalb des Bevölkerungsdurchschnitts von etwa 55 Punkten.',
        key_finding: 'Deine Schlafarchitektur zeigt ausreichende Dauer, aber die subjektive Qualitaet deutet auf Verbesserungspotenzial hin. Der Sleep Governor limitiert deine Regeneration subtil — jedes Trainingsprogramm laeuft gegen diese Wand, wenn der Score unter 70 bleibt. Nächtliche Unterbrechungen oder schlechte Schlafqualitaet reduzieren die Tiefschlafphasen, in denen Wachstumshormon ausgeschuettet wird.',
        systemic_connection: 'Schlaf ist der Governor fuer Recovery: der sleepMultiplier deckelt die Regeneration direkt. Schlechter Schlaf reduziert Testosteron (bis zu 15% bei weniger als 5h), erhoeft Cortisol und verschlechtert die Insulinsensitivitaet — unabhaengig von Ernaehrung und Training.',
        limitation: 'Schlafqualitaet und gelegentliche naechliche Unterbrechungen druecken den Gesamt-Score und limitieren die Regenerationstiefe. Die Schlafdauer liegt im optimalen Bereich, jedoch koennte die Qualitaet noch verbessert werden.',
        recommendation: 'Fixiere Bett- und Aufstehzeit auf plus minus 30 Minuten ueber sieben Tage. Halte die Schlafzimmer-Temperatur bei 17-19 Grad Celsius. Vermeide blaues Licht 60 Minuten vor dem Schlafen. Diese drei Massnahmen steigern erfahrungsgemaess den Sleep Score um 5-8 Punkte.',
      },
      recovery: {
        score_context: 'Recovery Score 70/100 im Band "good" — berechnet aus Trainingslast, subjektiver Erholung und den Governoren Schlaf und Stress. Trainingslast (35%), Schlaf-Multiplier (35%), Stress-Multiplier (30%). Du liegst deutlich ueber dem Durchschnitt von 50 Punkten.',
        key_finding: 'Deine Erholung traegt dein Training zuverlaessig und mit Spielraum fuer Progression. Die Governoren Schlaf und Stress arbeiten im akzeptablen Bereich — das signalisiert, dass dein Koerper die gesetzten Trainingsreize grundsaetzlich verarbeiten kann.',
        systemic_connection: 'Recovery ist das Produkt aus Trainingssignal mal Schlaf mal Stress. Kein einzelner Hebel reicht, wenn einer der drei Faktoren limitiert. Eine Verbesserung des Schlaf-Scores um 10 Punkte wuerde den Recovery-Score um circa 3-5 Punkte anheben.',
        limitation: 'Die self-reported Messung kann Overreaching unterschaetzen. Objektive Marker wie HRV oder Ruhepuls wuerden das Bild praezisieren.',
        recommendation: 'Periodisierung einsetzen: Eine Hochintensitaets-Woche, gefolgt von einer Deload-Woche fuer optimale Adaptation. Integriere aktive Recovery-Einheiten (leichtes Schwimmen, Yoga) an Ruhetagen.',
      },
      activity: {
        score_context: 'Dein Activity Score von 55/100 basiert auf 1200 MET-Minuten pro Woche und ergibt die IPAQ-Kategorie MODERATE. Der Score setzt sich zusammen aus Walking-Aktivitaet (MET 3.3), moderater Aktivitaet (MET 4.0) und intensiver Aktivitaet (MET 8.0). Du liegst im empfohlenen Bereich der WHO-Mindestempfehlung von 150 Minuten pro Woche.',
        key_finding: 'Die Trainings- und Alltagsaktivitaet positioniert dich im "moderate" Band. Das Aktivitaetsvolumen erfullt die WHO-Grundanforderungen, liegt aber noch unter dem Niveau, das maximale kardiovaskulaere und metabolische Benefits bringt. Studien zeigen, dass erst bei 300+ MET-Minuten pro Woche der volle protektive Effekt erreicht wird.',
        systemic_connection: 'Aktivitaet treibt VO2max direkt an — jede Steigerung des Aktivitaetsvolumens um 10% erhoht den geschaetzten VO2max um circa 0.5-1 ml/kg/min. Zusaetzlich verbessert regelmaessige moderate Aktivitaet die Schlafqualitaet und die Insulinsensitivitaet nachhaltig.',
        limitation: 'Das woechentliche MET-Minuten-Volumen von 1200 reicht nicht aus, um den vollen kardiovaskulaeren Schutzeffekt zu erzielen. Das Ziel von 500+ MET-Minuten wuerde den Score in das "high" Band heben.',
        recommendation: 'Erhoehe das Aktivitaetsvolumen schrittweise um 10% pro Woche. Fuege eine zusaetzliche 30-muetige moderate Einheit pro Woche hinzu. Ziel: 300 Minuten moderate oder 150 Minuten intensive Aktivitaet pro Woche fuer maximalen kardiovaskulaeren Effekt.',
      },
      metabolic: {
        score_context: 'Metabolic Score 72/100 bei BMI 24.5 (normal) — Zusammenspiel aus Koerperzusammensetzung (BMI, 30%), Hydration (20%), Ernaehrungsrhythmus (25%) und Sitzzeit (25%). Dein Score liegt im "good" Band, klar ueber dem Durchschnitt von 55 Punkten.',
        key_finding: 'Die metabolische Einordnung ist solide. Die Koerperzusammensetzung mit BMI 24.5 liegt im optimalen WHO-Bereich (18.5-24.9). Sitzzeit und Ernaehrungsrhythmus bieten noch Optimierungspotenzial — beide Faktoren beeinflussen Insulinsensitivitaet und Cortisol-Rhythmus direkt.',
        systemic_connection: 'Sitzzeit ist unabhaengig vom Sport ein CVD-Risikofaktor (AHA Science Advisory). Mehr als 6 Stunden Sitzen pro Tag erhoht das Metabolisches-Syndrom-Risiko um Faktor 1.73 — auch nach Adjustierung fuer Sport. Metabolic beeinflusst VO2max indirekt ueber BMI.',
        limitation: 'BMI ist ein populationsbasierter Schätzer, kein individueller Gesundheitsmarker. Muskulaere Koerperzusammensetzung kann den BMI nach oben verzerren. Fuer praezise Koerperzusammensetzungsanalyse waere DEXA oder Bioimpedanz erforderlich.',
        recommendation: 'Trinke taeglich 30-35 ml pro kg Koerpergewicht. Unterbreche Sitzbloecke nach spaetestens 45 Minuten mit 5 Minuten Bewegung. Setze 4+ Gemuese- und Obstportionen als taeglich Standard. Zeitlich eingeschraenktes Essen (10-Stunden-Fenster) kann die Insulinsensitivitaet verbessern.',
      },
      stress: {
        score_context: 'Stress Score 60/100 (moderate) — gewichtete Kombination aus selbstberichtetem Stresslevel (50%), Sleep-Buffer (25%) und Recovery-Buffer (25%). Du liegst im mittleren Bereich. Ein Score unter 65 signalisiert aktiven Handlungsbedarf, da Stress systemisch alle anderen Module beeinflusst.',
        key_finding: 'Die Stress-Regulation zeigt moderaten Handlungsbedarf. Der chronische Belastungs-Level verbraucht Ressourcen, die sonst in Adaptation und Performance fliessen wuerden. Chronischer Stress aktiviert dauerhaft die HPA-Achse, was zu erhoehtem Basiscortisol und in der Folge zu reduzierter Testosteronproduktion fuehrt.',
        systemic_connection: 'Chronischer Stress hemmt die HPG-Achse (Testosteron sinkt um bis zu 15%) UND verschlechtert die Insulinsensitivitaet gleichzeitig. Das ist der am weitesten reichende systemische Hebel in deinem Profil — eine Verbesserung des Stress-Scores wuerde Activity, Sleep und Metabolic mitliften.',
        limitation: 'Stressmessung auf Basis von Selbstangaben kann chronischen Stress unterschaetzen, da Gewoehnungseffekte die subjektive Wahrnehmung daempfen. HRV-Messung wuerde das Bild objektivieren.',
        recommendation: 'Installiere zwei 5-Minuten-Downregulation-Fenster pro Tag. Box-Breathing (4-4-4-4 Sekunden) oder Nasenatmung in Ruhe aktivieren den Parasympathikus nachweislich. Zusaetzlich: Sport als Stress-Tool — 20 Minuten moderate Aktivitaet senken Cortisol fuer 4-6 Stunden.',
      },
      vo2max: {
        score_context: 'Geschaetzter VO2max: 38 ml/kg/min (moderate) — algorithmische Schaetzung auf Basis des Jackson Non-Exercise Prediction Models (Alter, BMI, Aktivitaetskategorie). Der Score von 50/100 ordnet dich im "moderate" Band ein. Referenzwerte fuer Maenner 30-35 Jahre: unter 38 = below average, 38-43 = average, 44-48 = good, ueber 49 = excellent.',
        key_finding: 'Die kardiorespiratorische Leistungsfaehigkeit liegt im durchschnittlichen Bereich fuer deine Alters- und Geschlechtsgruppe. VO2max ist einer der staerksten unabhaengigen Praediktoren fuer Gesamtmortalitaet und kardiovaskulaere Gesundheit — ein Anstieg um 1 MET (3.5 ml/kg/min) reduziert das Sterblichkeitsrisiko um 13-15%.',
        systemic_connection: 'VO2max ist direkt an das Aktivitaetslevel gekoppelt. Mehr Aktivitaet mit Intensitaetskomponente ist der einzige evidence-based Weg zur Steigerung. Gleichzeitig wird VO2max durch BMI und koerperliche Zusammensetzung beeinflusst — Gewichtsreduktion bei Uebergewicht steigert den Wert direkt.',
        limitation: 'Dies ist eine Non-Exercise-Schaetzung — kein gemessener Laborwert. Die Praezision liegt bei plus minus 5-7 ml/kg/min. Fuer praezise Diagnostik und gezielte Trainingssteuerung ist eine Spiroergometrie im Labor erforderlich.',
        recommendation: 'Integriere 1x pro Woche ein VO2max-Intervall: 4x4 Minuten bei 90-95% HFmax, dazwischen 3 Minuten aktive Pause. Diese Methode (Norwegian 4x4) ist wissenschaftlich am besten belegt fuer VO2max-Steigerung. Erwarte nach 8-12 Wochen einen Anstieg von 3-5 ml/kg/min.',
      },
    },
    top_priority: 'Hebel Nr. 1: Stress. Der groesste messbare Score-Gewinn in 30 Tagen liegt hier — eine Verbesserung des Stress-Scores um 10 Punkte wuerde Activity, Sleep und Metabolic mitliften, da Stress der systemisch weitreichendste Faktor in deinem Profil ist.',
    prognose_30_days: 'Bei konsequenter Umsetzung der Empfehlungen ist ein Overall-Zuwachs von plus 8 bis 12 Punkten in 30 Tagen realistisch.',
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
    email: 'max.mustermann@test.com', age: 32, gender: 'male', bmi: 24.5, bmi_category: 'normal',
  };
  console.log('Generating PDF...');
  const t = Date.now();
  const buf = await generatePDF(content, scores, user);
  console.log('Done in', Date.now() - t, 'ms, size:', (buf.length/1024).toFixed(1), 'KB');
  const { writeFileSync } = await import('fs');
  writeFileSync('/tmp/btb-test.pdf', buf);
  console.log('Saved to /tmp/btb-test.pdf');
  open('/tmp/btb-test.pdf');
}
main().catch(e => { console.error(e); process.exit(1); });
