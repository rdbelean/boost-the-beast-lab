// ============================================================================
// Monolithic plan-AI prompts, one complete build path per locale.
//
// Why monolithic and not parametrised:
// Prior iterations (system-prompts.ts + deep-rules.ts + response-prefix.ts +
// dynamic language-directive + reminder-suffix) still produced German output
// for EN/IT/TR. The hypothesis is that Claude was pulled back into German by
// residual traces of the shared parametrised structure. This file removes
// the parametrisation entirely: each locale has its own complete builder
// with no cross-locale references.
//
// Claude only ever sees text in the target locale within a single request
// (system prompt + user prompt + response prefix are all one language).
// ============================================================================

type Locale = "de" | "en" | "it" | "tr";

export type PlanType = "activity" | "metabolic" | "recovery" | "stress";

export type ScoreInput = {
  activity: { activity_score_0_100: number; activity_category: string; total_met_minutes_week: number };
  sleep: { sleep_score_0_100: number; sleep_duration_band: string; sleep_band: string };
  metabolic: { metabolic_score_0_100: number; bmi: number; bmi_category: string; metabolic_band: string };
  stress: { stress_score_0_100: number; stress_band: string };
  vo2max: { fitness_score_0_100: number; vo2max_estimated: number; vo2max_band: string };
  overall_score_0_100: number;
  overall_band: string;
};

export interface PlanPersonalization {
  main_goal?: "feel_better" | "body_comp" | "performance" | "stress_sleep" | "longevity" | null;
  time_budget?: "minimal" | "moderate" | "committed" | "athlete" | null;
  experience_level?: "beginner" | "restart" | "intermediate" | "advanced" | null;
  training_days?: number | null;
  nutrition_painpoint?: "cravings_evening" | "low_protein" | "no_energy" | "no_time" | "none" | null;
  stress_source?: "job" | "family" | "finances" | "health" | "future" | "none" | null;
  recovery_ritual?: "sport" | "nature" | "cooking" | "reading" | "meditation" | "social" | "none" | null;
}

interface BuildArgs {
  type: PlanType;
  scores: ScoreInput;
  personalization: PlanPersonalization;
}

function normalize(locale: string | undefined): Locale {
  if (locale === "en" || locale === "it" || locale === "tr") return locale;
  return "de";
}

// ============================================================================
// SYSTEM PROMPTS — one per locale, inhaltlich 1:1 identisch, only language differs.
// SYSTEM_PROMPT_DE is byte-identical to the prior SYSTEM_PROMPT_DE in
// lib/plan/prompts/system-prompts.ts (itself byte-identical to the original
// inline prompt in app/api/plan/generate/route.ts).
// ============================================================================

const SYSTEM_PROMPT_DE = `Du bist das Plan-Generierungs-System von BOOST THE BEAST LAB — ein präzises wissenschaftliches Performance-Tool.

Deine Nutzer sind ambitionierte Athleten (25–40) und High-Performer (30–50). Sie wollen keine Wellness-Ratschläge. Sie wollen exakte, evidenzbasierte Protokolle — abgeleitet aus ihren persönlichen Daten.

ABSOLUTE GRENZEN:
- Keine medizinischen Diagnosen oder Heilversprechen
- Ausschließlich die im Input übermittelten Zahlen und Scores verwenden — keine erfundenen Werte
- Keine Studien erfinden oder falsch attributieren
- VO2max immer als algorithmische Schätzung kommunizieren
- BMI als Populationsschätzer kommunizieren, nicht als individuelles Urteil
- Alle Aussagen als Performance-Insight formulieren, nie als Befund

WISSENSCHAFTLICHE BASIS (darfst du nutzen und explizit referenzieren):
- WHO Physical Activity Guidelines 2020/2024: 150–300 Min moderate Aktivität/Woche, ≥2× Krafttraining
- IPAQ MET-Kategorisierung: Walking 3.3 MET · Moderate 4.0 MET · Vigorous 8.0 MET
- AHA Circulation 2022 (100.000 TN, 30 Jahre): 150–300 Min/Woche moderate Aktivität = 20–21% niedrigeres Mortalitätsrisiko
- AMA Longevity 2024: 150–299 Min/Woche intensive Aktivität = 21–23% niedrigere Gesamtmortalität, 27–33% niedrigere CVD-Mortalität
- NSF/AASM Schlafempfehlungen: 7–9h für 18–64-Jährige, 7–8h für 65+
- Covassin et al. RCT 2022: Schlafmangel → signifikant mehr viszerales Bauchfett (unabhängig von Ernährung)
- Kaczmarek et al. MDPI 2025: Schlafmangel → Cortisol↑, Testosteron↓, GH↓ → Muskelregeneration limitiert
- Sondrup et al. Sleep Medicine Reviews 2022: Schlafmangel → signifikant erhöhte Insulinresistenz
- JAMA Network Open Meal Timing 2024 (29 RCTs): frühes Essen + zeitlich eingeschränktes Essen → größerer Gewichtsverlust
- ISSN Position Stand: Proteinzufuhr 1,6–2,2 g/kg KG/Tag für aktive Personen zur Muskelmasse-Optimierung
- Psychoneuroendocrinology Meta-Analysis 2024: Mindfulness (g=0.345) und Entspannung (g=0.347) am effektivsten zur Cortisol-Senkung
- PMC Chronic Stress & Cognition 2024: chronische Glucocorticoid-Ausschüttung → HPA-Dysregulation
- Frontiers Sedentary & CVD 2022: >6h Sitzen/Tag → erhöhtes Risiko für 12 chronische Erkrankungen — unabhängig vom Trainingspensum
- AHA Science Advisory: Sitzzeit erhöht Metabolisches-Syndrom-Odds um Faktor 1.73 nach MVPA-Adjustierung
- PMC OTS Review 2025 & ScienceDirect OTS Molecular 2025: unzureichende Recovery → Kraftverluste bis 14%
- ACSM Position Stand: Deload-Wochen alle 4–6 Wochen, Volumenreduktion 40–50%

TON-REGELN:
- Direkt, klar, wie ein Elite-Coach — nicht wie ein Wellness-Blog
- Das WARUM hinter jeder Empfehlung mit echter wissenschaftlicher Begründung
- VERBOTENE FLOSKELN: "es ist wichtig, dass", "du solltest versuchen", "achte darauf", "vergiss nicht", "denk daran"
- Stattdessen: direkte Aussagen. Statt "Es ist wichtig, genug zu schlafen" → "Dein Recovery-Deckel liegt bei einem Sleep-Score unter 65 — jedes weitere Training läuft gegen diese Grenze."
- Nutze die echten Zahlen aus dem Input: MET-Minuten, BMI, VO2max-Schätzung, Score-Werte, Bänder

FORMAT: Valid JSON only. No markdown backticks. Start directly with {

STRUCTURE — exactly 6 blocks with 5–8 items each:
{
  "blocks": [
    { "heading": "[BLOCK_1_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "[BLOCK_6_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] }
  ]
}

Block 1 [BLOCK_1_HEADING]: All relevant scores with context, comparison to reference values, what the numbers mean concretely.
Blocks 2–5: Concrete, evidence-based protocols and measures specific to the plan type. Each item is a complete sentence with reasoning and concrete numbers.
Block 6 [BLOCK_6_HEADING]: How to measure progress, over what timeframe, which indicators, when a new analysis makes sense.`;

const SYSTEM_PROMPT_EN = `You are the plan-generation system of BOOST THE BEAST LAB — a precise, scientific performance tool.

Your users are ambitious athletes (25–40) and high-performers (30–50). They do not want wellness advice. They want exact, evidence-based protocols — derived from their personal data.

ABSOLUTE LIMITS:
- No medical diagnoses or promises of cure
- Use exclusively the numbers and scores provided in the input — no invented values
- Do not invent studies or misattribute them
- Always communicate VO2max as an algorithmic estimate
- Communicate BMI as a population-level estimator, not an individual verdict
- Phrase every statement as a performance insight, never as a diagnosis

SCIENTIFIC BASIS (you may use and explicitly reference these):
- WHO Physical Activity Guidelines 2020/2024: 150–300 min moderate activity/week, ≥2× strength training
- IPAQ MET categorisation: Walking 3.3 MET · Moderate 4.0 MET · Vigorous 8.0 MET
- AHA Circulation 2022 (100,000 participants, 30 years): 150–300 min/week moderate activity = 20–21% lower mortality risk
- AMA Longevity 2024: 150–299 min/week vigorous activity = 21–23% lower all-cause mortality, 27–33% lower CVD mortality
- NSF/AASM sleep recommendations: 7–9h for 18–64 year olds, 7–8h for 65+
- Covassin et al. RCT 2022: sleep deprivation → significantly more visceral abdominal fat (independent of nutrition)
- Kaczmarek et al. MDPI 2025: sleep deprivation → cortisol↑, testosterone↓, GH↓ → muscle regeneration limited
- Sondrup et al. Sleep Medicine Reviews 2022: sleep deprivation → significantly elevated insulin resistance
- JAMA Network Open Meal Timing 2024 (29 RCTs): early eating + time-restricted eating → greater weight loss
- ISSN Position Stand: protein intake 1.6–2.2 g/kg body weight/day for active individuals for muscle-mass optimisation
- Psychoneuroendocrinology Meta-Analysis 2024: Mindfulness (g=0.345) and relaxation (g=0.347) most effective for cortisol reduction
- PMC Chronic Stress & Cognition 2024: chronic glucocorticoid release → HPA dysregulation
- Frontiers Sedentary & CVD 2022: >6h sitting/day → elevated risk for 12 chronic diseases — independent of training volume
- AHA Science Advisory: sitting time raises metabolic-syndrome odds by factor 1.73 after MVPA adjustment
- PMC OTS Review 2025 & ScienceDirect OTS Molecular 2025: insufficient recovery → strength losses up to 14%
- ACSM Position Stand: deload weeks every 4–6 weeks, volume reduction 40–50%

TONE RULES:
- Direct, clear, like an elite coach — not like a wellness blog
- The WHY behind every recommendation with genuine scientific grounding
- FORBIDDEN PHRASES: "it's important that", "you should try to", "make sure to", "don't forget", "remember to"
- Instead: direct statements. Instead of "It's important to get enough sleep" → "Your recovery ceiling sits at a sleep score under 65 — every additional session runs against that limit."
- Use the real numbers from the input: MET minutes, BMI, VO2max estimate, score values, bands

FORMAT: Valid JSON only. No markdown backticks. Start directly with {

STRUCTURE — exactly 6 blocks with 5–8 items each:
{
  "blocks": [
    { "heading": "[BLOCK_1_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "[BLOCK_6_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] }
  ]
}

Block 1 [BLOCK_1_HEADING]: All relevant scores with context, comparison to reference values, what the numbers mean concretely.
Blocks 2–5: Concrete, evidence-based protocols and measures specific to the plan type. Each item is a complete sentence with reasoning and concrete numbers.
Block 6 [BLOCK_6_HEADING]: How to measure progress, over what timeframe, which indicators, when a new analysis makes sense.`;

const SYSTEM_PROMPT_IT = `Sei il sistema di generazione piani di BOOST THE BEAST LAB — uno strumento di performance preciso e scientifico.

I tuoi utenti sono atleti ambiziosi (25–40) e high performer (30–50). Non vogliono consigli di wellness. Vogliono protocolli esatti, basati sull'evidenza — derivati dai loro dati personali.

LIMITI ASSOLUTI:
- Nessuna diagnosi medica né promesse di cura
- Usa esclusivamente i numeri e gli score forniti nell'input — nessun valore inventato
- Non inventare studi né attribuirli erroneamente
- Comunica sempre il VO2max come stima algoritmica
- Comunica il BMI come stimatore di popolazione, non come giudizio individuale
- Formula ogni affermazione come performance insight, mai come diagnosi

BASE SCIENTIFICA (puoi usarla e citarla esplicitamente):
- WHO Physical Activity Guidelines 2020/2024: 150–300 min attività moderata/settimana, ≥2× allenamento di forza
- Categorizzazione IPAQ MET: Walking 3.3 MET · Moderate 4.0 MET · Vigorous 8.0 MET
- AHA Circulation 2022 (100.000 partecipanti, 30 anni): 150–300 min/settimana di attività moderata = 20–21% rischio di mortalità inferiore
- AMA Longevity 2024: 150–299 min/settimana di attività intensa = 21–23% mortalità totale inferiore, 27–33% mortalità CVD inferiore
- Raccomandazioni sonno NSF/AASM: 7–9h per 18–64 anni, 7–8h per 65+
- Covassin et al. RCT 2022: privazione del sonno → significativamente più grasso viscerale addominale (indipendente dalla nutrizione)
- Kaczmarek et al. MDPI 2025: privazione del sonno → cortisolo↑, testosterone↓, GH↓ → rigenerazione muscolare limitata
- Sondrup et al. Sleep Medicine Reviews 2022: privazione del sonno → insulino-resistenza significativamente elevata
- JAMA Network Open Meal Timing 2024 (29 RCT): mangiare presto + time-restricted eating → maggior perdita di peso
- ISSN Position Stand: apporto proteico 1,6–2,2 g/kg peso corporeo/giorno per persone attive per ottimizzazione della massa muscolare
- Psychoneuroendocrinology Meta-Analysis 2024: Mindfulness (g=0.345) e rilassamento (g=0.347) più efficaci per la riduzione del cortisolo
- PMC Chronic Stress & Cognition 2024: rilascio cronico di glucocorticoidi → disregolazione HPA
- Frontiers Sedentary & CVD 2022: >6h seduti/giorno → rischio elevato per 12 malattie croniche — indipendente dal volume di allenamento
- AHA Science Advisory: tempo seduto aumenta le odds di sindrome metabolica di un fattore 1,73 dopo aggiustamento MVPA
- PMC OTS Review 2025 & ScienceDirect OTS Molecular 2025: recupero insufficiente → perdita di forza fino al 14%
- ACSM Position Stand: settimane di deload ogni 4–6 settimane, riduzione del volume 40–50%

REGOLE DI TONO:
- Diretto, chiaro, come un coach d'élite — non come un blog di wellness
- Il PERCHÉ dietro ogni raccomandazione con reale fondamento scientifico
- FRASI VIETATE: "è importante che", "dovresti provare a", "assicurati di", "non dimenticare", "ricorda di"
- Invece: affermazioni dirette. Invece di "È importante dormire abbastanza" → "Il tuo tetto di recupero è a uno sleep score sotto 65 — ogni ulteriore sessione va contro quel limite."
- Usa i numeri reali dall'input: MET-minuti, BMI, stima VO2max, valori di score, bande

FORMAT: Valid JSON only. No markdown backticks. Start directly with {

STRUCTURE — exactly 6 blocks with 5–8 items each:
{
  "blocks": [
    { "heading": "[BLOCK_1_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "[BLOCK_6_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] }
  ]
}

Blocco 1 [BLOCK_1_HEADING]: Tutti gli score rilevanti con contesto, confronto con valori di riferimento, cosa significano concretamente i numeri.
Blocchi 2–5: Protocolli e misure concrete basate sull'evidenza, specifiche per il tipo di piano. Ogni voce è una frase completa con motivazione e numeri concreti.
Blocco 6 [BLOCK_6_HEADING]: Come misurare i progressi, in quale arco di tempo, quali indicatori, quando una nuova analisi ha senso.`;

const SYSTEM_PROMPT_TR = `BOOST THE BEAST LAB'ın plan üretim sistemisin — hassas, bilimsel bir performans aracı.

Kullanıcıların hırslı sporcular (25–40) ve yüksek performanslı kişiler (30–50). Wellness tavsiyesi istemiyorlar. Kişisel verilerinden türetilmiş — kesin, kanıta dayalı protokoller istiyorlar.

MUTLAK SINIRLAR:
- Tıbbi teşhis veya iyileşme vaadi yok
- Yalnızca inputta verilen sayıları ve skorları kullan — uydurma değer yok
- Çalışma uydurma veya yanlış atfetme yok
- VO2max'ı her zaman algoritmik tahmin olarak ilet
- BMI'yı bireysel yargı değil, popülasyon tahmini olarak ilet
- Her ifadeyi bir performans içgörüsü olarak kur, tanı olarak değil

BİLİMSEL TEMEL (kullanabilir ve açıkça referans gösterebilirsin):
- WHO Fiziksel Aktivite Kılavuzu 2020/2024: 150–300 dk orta aktivite/hafta, ≥2× kuvvet antrenmanı
- IPAQ MET kategorizasyonu: Walking 3.3 MET · Moderate 4.0 MET · Vigorous 8.0 MET
- AHA Circulation 2022 (100.000 katılımcı, 30 yıl): 150–300 dk/hafta orta aktivite = %20–21 daha düşük mortalite riski
- AMA Longevity 2024: 150–299 dk/hafta yoğun aktivite = %21–23 daha düşük toplam mortalite, %27–33 daha düşük CVD mortalitesi
- NSF/AASM uyku önerileri: 18–64 yaş için 7–9sa, 65+ için 7–8sa
- Covassin et al. RCT 2022: uyku yetersizliği → anlamlı şekilde daha fazla visseral karın yağı (beslenmeden bağımsız)
- Kaczmarek et al. MDPI 2025: uyku yetersizliği → kortizol↑, testosteron↓, GH↓ → kas rejenerasyonu kısıtlı
- Sondrup et al. Sleep Medicine Reviews 2022: uyku yetersizliği → anlamlı şekilde artmış insülin direnci
- JAMA Network Open Meal Timing 2024 (29 RCT): erken yeme + zaman kısıtlı beslenme → daha fazla kilo kaybı
- ISSN Position Stand: aktif bireyler için kas kütlesi optimizasyonu için 1,6–2,2 g/kg vücut ağırlığı/gün protein alımı
- Psychoneuroendocrinology Meta-Analysis 2024: Mindfulness (g=0.345) ve gevşeme (g=0.347) kortizol azaltımında en etkili
- PMC Chronic Stress & Cognition 2024: kronik glukokortikoid salınımı → HPA disregülasyonu
- Frontiers Sedentary & CVD 2022: >6sa oturma/gün → 12 kronik hastalık için yüksek risk — antrenman hacminden bağımsız
- AHA Science Advisory: oturma süresi, MVPA ayarlamasından sonra metabolik sendrom oranını 1,73 katına çıkarır
- PMC OTS Review 2025 & ScienceDirect OTS Molecular 2025: yetersiz iyileşme → %14'e varan kuvvet kaybı
- ACSM Position Stand: her 4–6 haftada deload haftaları, %40–50 hacim azaltımı

TON KURALLARI:
- Doğrudan, net, elit bir antrenör gibi — wellness blogu gibi değil
- Her önerinin arkasındaki NEDEN'i gerçek bilimsel temelle açıkla
- YASAK İFADELER: "önemli olan", "denemeyi düşünmelisin", "unutma ki", "dikkat et", "hatırla"
- Bunun yerine: doğrudan ifadeler. "Yeterince uyumak önemli" yerine → "Toparlanma tavanın 65 altı uyku skorunda — her ek seans bu sınıra karşı çalışıyor."
- Inputtan gerçek sayıları kullan: MET dakikaları, BMI, VO2max tahmini, skor değerleri, bantlar

FORMAT: Valid JSON only. No markdown backticks. Start directly with {

STRUCTURE — exactly 6 blocks with 5–8 items each:
{
  "blocks": [
    { "heading": "[BLOCK_1_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "...", "items": ["...", "...", "...", "...", "...", "..."] },
    { "heading": "[BLOCK_6_HEADING]", "items": ["...", "...", "...", "...", "...", "..."] }
  ]
}

Blok 1 [BLOCK_1_HEADING]: Bağlamıyla tüm ilgili skorlar, referans değerlerle karşılaştırma, sayıların somut anlamı.
Bloklar 2–5: Plan tipine özgü somut, kanıta dayalı protokoller ve önlemler. Her madde gerekçe ve somut sayılarla tam bir cümle.
Blok 6 [BLOCK_6_HEADING]: İlerleme nasıl ölçülür, hangi zaman dilimi içinde, hangi göstergelerle, ne zaman yeni bir analiz mantıklı.`;

// ============================================================================
// RESPONSE PREFIXES — pre-seed Claude's assistant turn to hard-anchor the
// output language via the block-1 heading in the target locale.
// Prepended to response.content[0].text before JSON.parse.
// ============================================================================

const RESPONSE_PREFIX_DE = `{\n  "blocks": [\n    {\n      "heading": "Deine Ausgangslage",\n      "items": [\n        "`;
const RESPONSE_PREFIX_EN = `{\n  "blocks": [\n    {\n      "heading": "Your Starting Point",\n      "items": [\n        "`;
const RESPONSE_PREFIX_IT = `{\n  "blocks": [\n    {\n      "heading": "La Tua Situazione Attuale",\n      "items": [\n        "`;
const RESPONSE_PREFIX_TR = `{\n  "blocks": [\n    {\n      "heading": "Mevcut Durumun",\n      "items": [\n        "`;

// ============================================================================
// USER-PROMPT BUILDERS — one monolithic function per locale.
// Each inlines its own personalisation labels, hard rules, deep-rule maps,
// and closings. No cross-locale dictionary lookups.
// ============================================================================

// ── DE ───────────────────────────────────────────────────────────────────────

function buildUserPromptDE({ type, scores: s, personalization: p }: BuildArgs): string {
  const overall = `Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})`;

  const deepRules: string[] = [];
  if (p.nutrition_painpoint && p.nutrition_painpoint !== "none" && (type === "metabolic" || type === "activity")) {
    const np: Record<string, string> = {
      cravings_evening: 'Mindestens 1 Block MUSS "Heißhunger abends" explizit adressieren — konkret mit Protein-Timing (z.B. 30 g Protein beim Abendessen stabilisiert Blutzucker → weniger Cravings in der Nacht).',
      low_protein: "Mindestens 1 Block MUSS Protein-Targets konkret machen (z.B. 1,6–2,2 g/kg KG/Tag → Portionen × Mahlzeit runterbrechen).",
      no_energy: "Mindestens 1 Block MUSS Energie-Timing adressieren (Frühstücks-Timing, Koffein-Cutoff, Blutzucker-Stabilisierung).",
      no_time: "Mindestens 1 Block MUSS Meal-Prep-Friction reduzieren (Sonntags 30-Min-Prep, 2–3 Protein-Quellen vorkochen).",
    };
    const entry = np[p.nutrition_painpoint];
    if (entry) deepRules.push(entry);
  }
  if (p.stress_source && p.stress_source !== "none" && (type === "stress" || type === "recovery")) {
    const ss: Record<string, string> = {
      job: 'Mindestens 1 Block MUSS Arbeits-Stress-Recovery adressieren (z.B. 3-Min-Atem-Reset nach letztem Meeting, klare Feierabend-Transition, keine Arbeits-Mails nach 20 Uhr).',
      family: 'Mindestens 1 Block MUSS Familien-Transitionen adressieren (z.B. 10 Min Allein-Zeit nach Heimkommen, bevor in den Familien-Modus).',
      finances: 'Mindestens 1 Block MUSS Finanz-Stress-Cognitive-Load adressieren (z.B. 1× pro Woche 20-Min-Finanz-Check in festem Zeitslot — reduziert diffuse Dauer-Sorge).',
      health: 'Mindestens 1 Block MUSS Gesundheits-Unsicherheit kalibrieren (z.B. Abend-Journal: 3 kontrollierbare Dinge heute).',
      future: 'Mindestens 1 Block MUSS Zukunfts-Angst kalibrieren (z.B. Journaling auf "3 heute-kontrollierbare Dinge" fokussieren).',
    };
    const entry = ss[p.stress_source];
    if (entry) deepRules.push(entry);
  }
  if (p.recovery_ritual && p.recovery_ritual !== "none") {
    const rr: Record<string, string> = {
      sport: "Baue auf dem Ritual SPORT auf — keine komplett neue Routine aufzwingen.",
      nature: 'Integriere NATUR-Exposure explizit (z.B. "5 Min draußen zwischen 2 Meetings" statt nur "Atem-Pause").',
      cooking: "KOCHEN als Regenerations-Anker nutzen — z.B. 1× pro Woche Meal-Prep als bewusste Down-Time framen.",
      reading: "LESEN als Abend-Cutoff-Ritual framen (letzte 30 Min vor Schlaf: Papier-Buch, kein Screen).",
      meditation: "MEDITATION ausbauen statt komplett neu einführen — Dauer langsam steigern.",
      social: 'Soziale Interaktion als Regenerations-Tool framen (z.B. "1× pro Woche ungestörte Zeit mit wichtiger Person").',
    };
    const entry = rr[p.recovery_ritual];
    if (entry) deepRules.push(entry);
  }
  const deepRulesBlock = deepRules.length
    ? `\nTIEFEN-REGELN (diese Ausprägungen sind USER-spezifisch und müssen im Plan namentlich auftauchen):\n${deepRules.map((r) => `- ${r}`).join("\n")}\n`
    : "";

  const personalization = `
USER PERSONALISIERUNG (PFLICHT berücksichtigen):
- Hauptziel: ${p.main_goal ?? "feel_better (Default)"}
- Zeitbudget: ${p.time_budget ?? "moderate (Default)"}
- Erfahrungslevel: ${p.experience_level ?? "intermediate (Default)"}
- Aktuelle Trainingstage/Woche: ${p.training_days ?? "nicht angegeben"}
- Ernährungs-Painpoint: ${p.nutrition_painpoint ?? "nicht angegeben"}
- Haupt-Stressor: ${p.stress_source ?? "nicht angegeben"}
- Liebstes Erholungs-Ritual: ${p.recovery_ritual ?? "nicht angegeben"}

HARTE REGELN:
- Wenn time_budget="minimal" (10–20 Min/Tag): KEINE Sessions >15 Min. Micro-Workouts + Alltagsbewegung priorisieren. NIE Zone-2-45-Min empfehlen.
- Wenn experience_level ∈ {beginner, restart}: MAX 2–3 Einheiten/Woche. NIE 4–5×. Erste 2 Wochen: Habit-Aufbau, nicht Volumen.
- Wenn main_goal ∈ {feel_better, stress_sleep, longevity}: Training kommt NACH Schlaf/Stress/Ernährungs-Fixes in der Priorität. Keine HIIT-Empfehlungen.
- Wenn training_days=0: Starten bei 1×/Woche. NIE 5×/Woche als Startempfehlung.
- NUR wenn main_goal="performance" UND time_budget ∈ {committed, athlete} UND experience_level ∈ {intermediate, advanced}: DANN sind 4–5 Einheiten/Woche angebracht.
${deepRulesBlock}`;

  if (type === "activity") {
    const gap = Math.max(0, 600 - s.activity.total_met_minutes_week);
    return `${overall}
${personalization}

ACTIVITY-PLAN — Nutzerdaten:
- Activity Score: ${s.activity.activity_score_0_100}/100 (IPAQ: ${s.activity.activity_category})
- MET-min/week: ${s.activity.total_met_minutes_week} (WHO target ≥600, gap: ${gap > 0 ? gap + " MET-min" : "none"})
- VO2max (estimate): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (BMI: ${s.metabolic.bmi}, ${s.metabolic.bmi_category})

Generiere einen detaillierten, personalisierten Activity-Plan. Nutze alle übermittelten Zahlen und erkläre das Warum hinter jeder Empfehlung.`;
  }

  if (type === "metabolic") {
    return `${overall}
${personalization}
METABOLIC-PLAN — Nutzerdaten:
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- BMI: ${s.metabolic.bmi} kg/m² (${s.metabolic.bmi_category}) (WHO normal: 18.5–24.9)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-min/week: ${s.activity.total_met_minutes_week}
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})

Generiere einen detaillierten, personalisierten Metabolic-Plan mit konkreten Protokollen.`;
  }

  if (type === "recovery") {
    return `${overall}
${personalization}
RECOVERY-PLAN — Nutzerdaten:
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Sleep-duration band: ${s.sleep.sleep_duration_band} (NSF: 7–9h)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-min/week: ${s.activity.total_met_minutes_week}
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- VO2max (estimate): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})

Generiere einen detaillierten, personalisierten Recovery-Plan mit wissenschaftlich begründeten Protokollen.`;
  }

  return `${overall}
${personalization}
STRESS & LIFESTYLE-PLAN — Nutzerdaten:
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Activity Score: ${s.activity.activity_score_0_100}/100
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})

Generiere einen detaillierten, personalisierten Stress & Lifestyle-Plan mit konkreten Downregulations-Protokollen.`;
}

// ── EN ───────────────────────────────────────────────────────────────────────

function buildUserPromptEN({ type, scores: s, personalization: p }: BuildArgs): string {
  const overall = `Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})`;

  const deepRules: string[] = [];
  if (p.nutrition_painpoint && p.nutrition_painpoint !== "none" && (type === "metabolic" || type === "activity")) {
    const np: Record<string, string> = {
      cravings_evening: 'At least 1 block MUST explicitly address evening cravings — concretely with protein timing (e.g. 30 g protein at dinner stabilises blood sugar → fewer cravings at night).',
      low_protein: "At least 1 block MUST make protein targets concrete (e.g. 1.6–2.2 g/kg body weight/day → break down portions × meal).",
      no_energy: "At least 1 block MUST address energy timing (breakfast timing, caffeine cutoff, blood-sugar stabilisation).",
      no_time: "At least 1 block MUST reduce meal-prep friction (Sunday 30-min prep, pre-cook 2–3 protein sources).",
    };
    const entry = np[p.nutrition_painpoint];
    if (entry) deepRules.push(entry);
  }
  if (p.stress_source && p.stress_source !== "none" && (type === "stress" || type === "recovery")) {
    const ss: Record<string, string> = {
      job: 'At least 1 block MUST address work-stress recovery (e.g. 3-min breath reset after the last meeting, clear end-of-day transition, no work emails after 8 pm).',
      family: 'At least 1 block MUST address family transitions (e.g. 10 min alone time after arriving home, before switching into family mode).',
      finances: 'At least 1 block MUST address finance-stress cognitive load (e.g. 1× per week 20-min finance check in a fixed time slot — reduces diffuse background worry).',
      health: 'At least 1 block MUST calibrate health uncertainty (e.g. evening journal: 3 controllable things today).',
      future: 'At least 1 block MUST calibrate future-anxiety (e.g. focus journaling on "3 things controllable today").',
    };
    const entry = ss[p.stress_source];
    if (entry) deepRules.push(entry);
  }
  if (p.recovery_ritual && p.recovery_ritual !== "none") {
    const rr: Record<string, string> = {
      sport: "Build on the user's existing SPORT ritual — do not impose a completely new routine.",
      nature: 'Integrate NATURE exposure explicitly (e.g. "5 min outside between two meetings" instead of just a "breath break").',
      cooking: "Use COOKING as a recovery anchor — e.g. frame weekly meal-prep as deliberate down-time.",
      reading: "Frame READING as an evening cutoff ritual (last 30 min before sleep: paper book, no screen).",
      meditation: "Expand existing MEDITATION rather than introducing it from scratch — raise duration gradually.",
      social: 'Frame social interaction as a recovery tool (e.g. "1× per week uninterrupted time with an important person").',
    };
    const entry = rr[p.recovery_ritual];
    if (entry) deepRules.push(entry);
  }
  const deepRulesBlock = deepRules.length
    ? `\nDEEP RULES (these user-specific signals MUST appear by name in the plan):\n${deepRules.map((r) => `- ${r}`).join("\n")}\n`
    : "";

  const personalization = `
USER PERSONALIZATION (MANDATORY to respect):
- Main goal: ${p.main_goal ?? "feel_better (default)"}
- Time budget: ${p.time_budget ?? "moderate (default)"}
- Experience level: ${p.experience_level ?? "intermediate (default)"}
- Current training days/week: ${p.training_days ?? "not specified"}
- Nutrition pain point: ${p.nutrition_painpoint ?? "not specified"}
- Main stressor: ${p.stress_source ?? "not specified"}
- Favourite recovery ritual: ${p.recovery_ritual ?? "not specified"}

HARD RULES:
- If time_budget="minimal" (10–20 min/day): NO sessions >15 min. Prioritise micro-workouts + daily movement. NEVER recommend Zone-2-45-min.
- If experience_level ∈ {beginner, restart}: MAX 2–3 sessions/week. NEVER 4–5×. First 2 weeks: habit-building, not volume.
- If main_goal ∈ {feel_better, stress_sleep, longevity}: Training ranks AFTER sleep/stress/nutrition fixes. No HIIT recommendations.
- If training_days=0: Start at 1×/week. NEVER 5×/week as a starting point.
- ONLY if main_goal="performance" AND time_budget ∈ {committed, athlete} AND experience_level ∈ {intermediate, advanced}: THEN 4–5 sessions/week is appropriate.
${deepRulesBlock}`;

  if (type === "activity") {
    const gap = Math.max(0, 600 - s.activity.total_met_minutes_week);
    return `${overall}
${personalization}

ACTIVITY PLAN — User data:
- Activity Score: ${s.activity.activity_score_0_100}/100 (IPAQ: ${s.activity.activity_category})
- MET-min/week: ${s.activity.total_met_minutes_week} (WHO target ≥600, gap: ${gap > 0 ? gap + " MET-min" : "none"})
- VO2max (estimate): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (BMI: ${s.metabolic.bmi}, ${s.metabolic.bmi_category})

Generate a detailed, personalised Activity plan. Use every number provided and explain the WHY behind each recommendation.`;
  }

  if (type === "metabolic") {
    return `${overall}
${personalization}
METABOLIC PLAN — User data:
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- BMI: ${s.metabolic.bmi} kg/m² (${s.metabolic.bmi_category}) (WHO normal: 18.5–24.9)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-min/week: ${s.activity.total_met_minutes_week}
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})

Generate a detailed, personalised Metabolic plan with concrete protocols.`;
  }

  if (type === "recovery") {
    return `${overall}
${personalization}
RECOVERY PLAN — User data:
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Sleep-duration band: ${s.sleep.sleep_duration_band} (NSF: 7–9h)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-min/week: ${s.activity.total_met_minutes_week}
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- VO2max (estimate): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})

Generate a detailed, personalised Recovery plan with science-backed protocols.`;
  }

  return `${overall}
${personalization}
STRESS & LIFESTYLE PLAN — User data:
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Activity Score: ${s.activity.activity_score_0_100}/100
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})

Generate a detailed, personalised Stress & Lifestyle plan with concrete down-regulation protocols.`;
}

// ── IT ───────────────────────────────────────────────────────────────────────

function buildUserPromptIT({ type, scores: s, personalization: p }: BuildArgs): string {
  const overall = `Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})`;

  const deepRules: string[] = [];
  if (p.nutrition_painpoint && p.nutrition_painpoint !== "none" && (type === "metabolic" || type === "activity")) {
    const np: Record<string, string> = {
      cravings_evening: 'Almeno 1 blocco DEVE affrontare esplicitamente le voglie serali — concretamente con protein timing (es. 30 g di proteine a cena stabilizzano la glicemia → meno voglie di notte).',
      low_protein: "Almeno 1 blocco DEVE rendere concreti i target proteici (es. 1,6–2,2 g/kg peso corporeo/giorno → ripartire le porzioni × pasto).",
      no_energy: "Almeno 1 blocco DEVE affrontare l'energy timing (timing della colazione, cutoff della caffeina, stabilizzazione glicemica).",
      no_time: "Almeno 1 blocco DEVE ridurre la friction del meal-prep (prep di 30 min la domenica, pre-cuocere 2–3 fonti proteiche).",
    };
    const entry = np[p.nutrition_painpoint];
    if (entry) deepRules.push(entry);
  }
  if (p.stress_source && p.stress_source !== "none" && (type === "stress" || type === "recovery")) {
    const ss: Record<string, string> = {
      job: 'Almeno 1 blocco DEVE affrontare il recupero dallo stress lavorativo (es. reset respiratorio di 3 min dopo l\'ultimo meeting, transizione chiara a fine giornata, niente email di lavoro dopo le 20:00).',
      family: 'Almeno 1 blocco DEVE affrontare le transizioni familiari (es. 10 min da solo/a dopo essere tornato/a a casa, prima di passare in modalità famiglia).',
      finances: 'Almeno 1 blocco DEVE affrontare il carico cognitivo dello stress finanziario (es. 1× a settimana check finanziario di 20 min in uno slot fisso — riduce la preoccupazione diffusa).',
      health: 'Almeno 1 blocco DEVE calibrare l\'incertezza sulla salute (es. journal serale: 3 cose controllabili oggi).',
      future: 'Almeno 1 blocco DEVE calibrare l\'ansia da futuro (es. focalizzare il journaling su "3 cose controllabili oggi").',
    };
    const entry = ss[p.stress_source];
    if (entry) deepRules.push(entry);
  }
  if (p.recovery_ritual && p.recovery_ritual !== "none") {
    const rr: Record<string, string> = {
      sport: "Costruisci sul rituale esistente dello SPORT — non imporre una routine completamente nuova.",
      nature: 'Integra l\'esposizione alla NATURA in modo esplicito (es. "5 min all\'aperto tra due meeting" invece di una semplice "pausa respirazione").',
      cooking: "Usa la CUCINA come ancora di recupero — es. inquadra il meal-prep settimanale come down-time consapevole.",
      reading: "Inquadra la LETTURA come rituale di cutoff serale (ultimi 30 min prima del sonno: libro cartaceo, niente schermo).",
      meditation: "Espandi la MEDITAZIONE già esistente invece di introdurla da zero — aumenta la durata gradualmente.",
      social: 'Inquadra l\'interazione sociale come strumento di recupero (es. "1× a settimana tempo indisturbato con una persona importante").',
    };
    const entry = rr[p.recovery_ritual];
    if (entry) deepRules.push(entry);
  }
  const deepRulesBlock = deepRules.length
    ? `\nREGOLE APPROFONDITE (questi segnali specifici dell'utente DEVONO apparire per nome nel piano):\n${deepRules.map((r) => `- ${r}`).join("\n")}\n`
    : "";

  const personalization = `
PERSONALIZZAZIONE UTENTE (OBBLIGATORIA):
- Obiettivo principale: ${p.main_goal ?? "feel_better (default)"}
- Tempo disponibile: ${p.time_budget ?? "moderate (default)"}
- Livello di esperienza: ${p.experience_level ?? "intermediate (default)"}
- Giorni di allenamento attuali/settimana: ${p.training_days ?? "non specificato"}
- Pain point nutrizionale: ${p.nutrition_painpoint ?? "non specificato"}
- Fattore di stress principale: ${p.stress_source ?? "non specificato"}
- Rituale di recupero preferito: ${p.recovery_ritual ?? "non specificato"}

REGOLE DURE:
- Se time_budget="minimal" (10–20 min/giorno): NESSUNA sessione >15 min. Priorità a micro-workout + movimento quotidiano. MAI consigliare Zone-2-45-min.
- Se experience_level ∈ {beginner, restart}: MAX 2–3 sessioni/settimana. MAI 4–5×. Prime 2 settimane: costruzione dell'abitudine, non volume.
- Se main_goal ∈ {feel_better, stress_sleep, longevity}: L'allenamento viene DOPO la cura di sonno/stress/nutrizione. Niente HIIT.
- Se training_days=0: Partire da 1×/settimana. MAI 5×/settimana come punto di partenza.
- SOLO se main_goal="performance" E time_budget ∈ {committed, athlete} E experience_level ∈ {intermediate, advanced}: ALLORA 4–5 sessioni/settimana sono appropriate.
${deepRulesBlock}`;

  if (type === "activity") {
    const gap = Math.max(0, 600 - s.activity.total_met_minutes_week);
    return `${overall}
${personalization}

PIANO ATTIVITÀ — Dati utente:
- Activity Score: ${s.activity.activity_score_0_100}/100 (IPAQ: ${s.activity.activity_category})
- MET-min/settimana: ${s.activity.total_met_minutes_week} (WHO target ≥600, gap: ${gap > 0 ? gap + " MET-min" : "nessuno"})
- VO2max (stima): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (BMI: ${s.metabolic.bmi}, ${s.metabolic.bmi_category})

Genera un piano attività dettagliato e personalizzato. Usa ogni numero fornito e spiega il PERCHÉ dietro ogni raccomandazione.`;
  }

  if (type === "metabolic") {
    return `${overall}
${personalization}
PIANO METABOLICO — Dati utente:
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- BMI: ${s.metabolic.bmi} kg/m² (${s.metabolic.bmi_category}) (WHO normal: 18,5–24,9)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-min/settimana: ${s.activity.total_met_minutes_week}
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})

Genera un piano metabolico dettagliato e personalizzato con protocolli concreti.`;
  }

  if (type === "recovery") {
    return `${overall}
${personalization}
PIANO RECOVERY — Dati utente:
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Banda durata sonno: ${s.sleep.sleep_duration_band} (NSF: 7–9h)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-min/settimana: ${s.activity.total_met_minutes_week}
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- VO2max (stima): ${s.vo2max.vo2max_estimated} ml/kg/min (${s.vo2max.vo2max_band})

Genera un piano recovery dettagliato e personalizzato con protocolli scientificamente fondati.`;
  }

  return `${overall}
${personalization}
PIANO STRESS & LIFESTYLE — Dati utente:
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Activity Score: ${s.activity.activity_score_0_100}/100
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})

Genera un piano stress & lifestyle dettagliato e personalizzato con protocolli concreti di down-regulation.`;
}

// ── TR ───────────────────────────────────────────────────────────────────────

function buildUserPromptTR({ type, scores: s, personalization: p }: BuildArgs): string {
  const overall = `Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})`;

  const deepRules: string[] = [];
  if (p.nutrition_painpoint && p.nutrition_painpoint !== "none" && (type === "metabolic" || type === "activity")) {
    const np: Record<string, string> = {
      cravings_evening: 'En az 1 blok akşam isteklerini açıkça ele ALMALIDIR — somut olarak protein zamanlamasıyla (örn. akşam yemeğinde 30 g protein kan şekerini dengeler → gece daha az istek).',
      low_protein: "En az 1 blok protein hedeflerini somutlaştırMALIDIR (örn. 1,6–2,2 g/kg vücut ağırlığı/gün → porsiyonları × öğüne böl).",
      no_energy: "En az 1 blok enerji zamanlamasını ele ALMALIDIR (kahvaltı zamanlaması, kafein cutoff'u, kan şekeri dengelenmesi).",
      no_time: "En az 1 blok meal-prep friksiyonunu azaltMALIDIR (pazar 30 dk prep, 2–3 protein kaynağını önceden pişir).",
    };
    const entry = np[p.nutrition_painpoint];
    if (entry) deepRules.push(entry);
  }
  if (p.stress_source && p.stress_source !== "none" && (type === "stress" || type === "recovery")) {
    const ss: Record<string, string> = {
      job: 'En az 1 blok iş stresi iyileşmesini ele ALMALIDIR (örn. son toplantıdan sonra 3 dk nefes reseti, net mesai bitişi geçişi, saat 20:00\'den sonra iş maili yok).',
      family: 'En az 1 blok aile geçişlerini ele ALMALIDIR (örn. eve geldikten sonra aile moduna geçmeden 10 dk yalnız zaman).',
      finances: 'En az 1 blok finans stresinin bilişsel yükünü ele ALMALIDIR (örn. haftada 1× sabit zaman diliminde 20 dk finans kontrolü — yaygın sürekli endişeyi azaltır).',
      health: 'En az 1 blok sağlık belirsizliğini kalibre ETMELIDIR (örn. akşam journal: bugün kontrol edilebilen 3 şey).',
      future: 'En az 1 blok gelecek kaygısını kalibre ETMELIDIR (örn. journaling\'i "bugün kontrol edilebilen 3 şey"e odakla).',
    };
    const entry = ss[p.stress_source];
    if (entry) deepRules.push(entry);
  }
  if (p.recovery_ritual && p.recovery_ritual !== "none") {
    const rr: Record<string, string> = {
      sport: "Kullanıcının mevcut SPOR ritüeli üzerine inşa et — tamamen yeni bir rutin dayatma.",
      nature: 'DOĞA teması olarak açıkça entegre et (örn. sadece "nefes molası" değil, "iki toplantı arasında 5 dk dışarıda").',
      cooking: "YEMEK PİŞİRMEYİ iyileşme çapası olarak kullan — örn. haftalık meal-prep'i bilinçli down-time olarak çerçevele.",
      reading: "OKUMAYI akşam cutoff ritüeli olarak çerçevele (uykudan önceki son 30 dk: kâğıt kitap, ekran yok).",
      meditation: "Mevcut MEDİTASYONU sıfırdan başlatmak yerine genişlet — süreyi kademeli olarak artır.",
      social: 'Sosyal etkileşimi iyileşme aracı olarak çerçevele (örn. "haftada 1× önemli bir kişiyle kesintisiz zaman").',
    };
    const entry = rr[p.recovery_ritual];
    if (entry) deepRules.push(entry);
  }
  const deepRulesBlock = deepRules.length
    ? `\nDERİN KURALLAR (kullanıcıya özel bu sinyaller planda adıyla geçmelidir):\n${deepRules.map((r) => `- ${r}`).join("\n")}\n`
    : "";

  const personalization = `
KULLANICI KİŞİSELLEŞTİRME (ZORUNLU):
- Ana hedef: ${p.main_goal ?? "feel_better (varsayılan)"}
- Zaman bütçesi: ${p.time_budget ?? "moderate (varsayılan)"}
- Deneyim seviyesi: ${p.experience_level ?? "intermediate (varsayılan)"}
- Mevcut antrenman günü/hafta: ${p.training_days ?? "belirtilmedi"}
- Beslenme sorunu: ${p.nutrition_painpoint ?? "belirtilmedi"}
- Ana stres kaynağı: ${p.stress_source ?? "belirtilmedi"}
- En sevilen iyileşme ritüeli: ${p.recovery_ritual ?? "belirtilmedi"}

KATI KURALLAR:
- Eğer time_budget="minimal" (10–20 dk/gün): >15 dk seans YOK. Mikro-workout + günlük hareket önceliklidir. ASLA Zone-2-45-dk önerme.
- Eğer experience_level ∈ {beginner, restart}: MAKS 2–3 seans/hafta. ASLA 4–5×. İlk 2 hafta: alışkanlık inşası, hacim değil.
- Eğer main_goal ∈ {feel_better, stress_sleep, longevity}: Antrenman uyku/stres/beslenme düzeltmelerinden SONRA gelir. HIIT önerme.
- Eğer training_days=0: 1×/hafta ile başla. ASLA 5×/hafta başlangıç önerisi olamaz.
- YALNIZCA main_goal="performance" VE time_budget ∈ {committed, athlete} VE experience_level ∈ {intermediate, advanced} ise: O ZAMAN 4–5 seans/hafta uygundur.
${deepRulesBlock}`;

  if (type === "activity") {
    const gap = Math.max(0, 600 - s.activity.total_met_minutes_week);
    return `${overall}
${personalization}

AKTİVİTE PLANI — Kullanıcı verisi:
- Activity Score: ${s.activity.activity_score_0_100}/100 (IPAQ: ${s.activity.activity_category})
- MET-dk/hafta: ${s.activity.total_met_minutes_week} (WHO target ≥600, gap: ${gap > 0 ? gap + " MET-dk" : "yok"})
- VO2max (tahmin): ${s.vo2max.vo2max_estimated} ml/kg/dk (${s.vo2max.vo2max_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (BMI: ${s.metabolic.bmi}, ${s.metabolic.bmi_category})

Detaylı, kişiselleştirilmiş bir Aktivite planı oluştur. Verilen her sayıyı kullan ve her önerinin NEDENİNİ açıkla.`;
  }

  if (type === "metabolic") {
    return `${overall}
${personalization}
METABOLİK PLAN — Kullanıcı verisi:
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- BMI: ${s.metabolic.bmi} kg/m² (${s.metabolic.bmi_category}) (WHO normal: 18,5–24,9)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-dk/hafta: ${s.activity.total_met_minutes_week}
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})

Detaylı, kişiselleştirilmiş bir Metabolik plan oluştur, somut protokoller ver.`;
  }

  if (type === "recovery") {
    return `${overall}
${personalization}
İYİLEŞME PLANI — Kullanıcı verisi:
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Uyku süresi bandı: ${s.sleep.sleep_duration_band} (NSF: 7–9sa)
- Activity Score: ${s.activity.activity_score_0_100}/100 — MET-dk/hafta: ${s.activity.total_met_minutes_week}
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- VO2max (tahmin): ${s.vo2max.vo2max_estimated} ml/kg/dk (${s.vo2max.vo2max_band})

Detaylı, kişiselleştirilmiş bir İyileşme planı oluştur, bilimsel temelli protokoller ver.`;
  }

  return `${overall}
${personalization}
STRES & YAŞAMBİÇİMİ PLANI — Kullanıcı verisi:
- Stress Score: ${s.stress.stress_score_0_100}/100 (${s.stress.stress_band})
- Sleep Score: ${s.sleep.sleep_score_0_100}/100 (${s.sleep.sleep_band})
- Activity Score: ${s.activity.activity_score_0_100}/100
- Metabolic Score: ${s.metabolic.metabolic_score_0_100}/100 (${s.metabolic.metabolic_band})
- Overall Score: ${s.overall_score_0_100}/100 (${s.overall_band})

Detaylı, kişiselleştirilmiş bir Stres & Yaşambiçimi planı oluştur, somut down-regülasyon protokolleri ver.`;
}

// ============================================================================
// MAIN ENTRY
// ============================================================================

export function buildFullPrompt(
  locale: string | undefined,
  args: BuildArgs,
): { systemPrompt: string; userPrompt: string; responsePrefix: string } {
  const loc = normalize(locale);
  if (loc === "en") {
    return {
      systemPrompt: SYSTEM_PROMPT_EN,
      userPrompt: buildUserPromptEN(args),
      responsePrefix: RESPONSE_PREFIX_EN,
    };
  }
  if (loc === "it") {
    return {
      systemPrompt: SYSTEM_PROMPT_IT,
      userPrompt: buildUserPromptIT(args),
      responsePrefix: RESPONSE_PREFIX_IT,
    };
  }
  if (loc === "tr") {
    return {
      systemPrompt: SYSTEM_PROMPT_TR,
      userPrompt: buildUserPromptTR(args),
      responsePrefix: RESPONSE_PREFIX_TR,
    };
  }
  return {
    systemPrompt: SYSTEM_PROMPT_DE,
    userPrompt: buildUserPromptDE(args),
    responsePrefix: RESPONSE_PREFIX_DE,
  };
}
