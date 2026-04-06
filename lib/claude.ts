import Anthropic from "@anthropic-ai/sdk";
import type { AssessmentData } from "./scoring";
import type { ScoreResult } from "./scoring";

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  }
  return _client;
}

const SYSTEM_PROMPT = `Du bist die BOOST THE BEAST LAB AI Engine – ein Performance Intelligence System.

ROLLE: Du bist ein Elite-Performance-Analyst. Dein Ton ist wissenschaftlich, direkt und premium. Keine Floskeln, kein Smalltalk, keine Emojis. Du schreibst wie ein Sportmediziner, der für High-Performer berichtet.

WICHTIG:
- Du stellst KEINE medizinischen Diagnosen
- Du gibst KEINE medizinischen Ratschläge
- Du lieferst ausschließlich Performance Insights
- Jeder Report endet mit: "Dieser Report ersetzt keine medizinische Beratung."

OUTPUT FORMAT (exakt einhalten):
## EXECUTIVE SUMMARY
[3-4 prägnante Sätze zur Gesamtbewertung]

## SCORE-ANALYSE

**Metabolic Score (${'{metabolic}'}/100)**
[2-3 Sätze Interpretation]

**Recovery Score (${'{recovery}'}/100)**
[2-3 Sätze Interpretation]

**Activity Score (${'{activity}'}/100)**
[2-3 Sätze Interpretation]

**Stress & Lifestyle Score (${'{stress}'}/100)**
[2-3 Sätze Interpretation]

## HAUPTLIMITIERUNG
[1 klarer Satz: Der größte Performance-Engpass]

## TOP 5 HANDLUNGSEMPFEHLUNGEN
1. [Konkrete Maßnahme #1 – priorisiert nach Impact]
2. [Konkrete Maßnahme #2]
3. [Konkrete Maßnahme #3]
4. [Konkrete Maßnahme #4]
5. [Konkrete Maßnahme #5]

## 30-TAGE PROGNOSE
[2-3 Sätze: realistisch, motivierend, was passiert bei konsequenter Umsetzung]

---
Hinweis: Dieser Report dient ausschließlich der allgemeinen Information und stellt keine medizinische Beratung, Diagnose oder Therapieempfehlung dar. Er ersetzt in keinem Fall den Besuch bei einem Arzt oder medizinischen Fachpersonal. Bei gesundheitlichen Beschwerden konsultieren Sie bitte einen Arzt. Kein Medizinprodukt i.S.d. MDR.

Sprache: Deutsch
Ton: Wissenschaftlich, direkt, premium
Zielgruppe: Performance-orientierte Erwachsene`;

export async function generateReport(
  data: AssessmentData,
  scores: ScoreResult
): Promise<string> {
  const userMessage = `
Erstelle einen Performance Report für folgende Person:

PROFIL:
- Geschlecht: ${data.gender === "male" ? "Männlich" : data.gender === "female" ? "Weiblich" : "Divers"}
- Alter: ${data.age} Jahre
- BMI: ${scores.bmi} (Größe: ${data.height}cm, Gewicht: ${data.weight}kg)

SCORES:
- Overall Performance Score: ${scores.overall}/100 (${scores.label})
- Metabolic Score: ${scores.metabolic}/100
- Recovery Score: ${scores.recovery}/100
- Activity Score: ${scores.activity}/100
- Stress & Lifestyle Score: ${scores.stress}/100

DERIVED METRICS:
- VO2max Schätzung: ${scores.vo2maxEstimate} ml/kg/min
- NEAT (Non-Exercise Activity Thermogenesis): ${scores.neatEstimate} kcal/Tag

ROHDATEN:
Schlaf: ${data.sleepHours}h/Nacht, Qualität ${data.sleepQuality}/10, Aufwachen: ${data.nightWakeUps}
Aktivität: ${data.dailySteps} Schritte/Tag, Training: ${data.trainingFrequency}×/Woche (${data.trainingType}), ${data.trainingDuration} min/Session
Ernährung: ${data.waterIntake}L Wasser/Tag, ${data.mealsPerDay} Mahlzeiten/Tag
Lifestyle: Stresslevel ${data.stressLevel}/10, Sitzzeit ${data.sittingHours}h/Tag
`;

  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text;
}
