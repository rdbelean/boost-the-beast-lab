import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { generatePDF, type PdfReportContent } from "@/lib/pdf/generateReport";
import { sendReportEmail } from "@/lib/email/sendReport";
import type { FullScoringResult } from "@/lib/scoring/index";

export const runtime = "nodejs";
export const maxDuration = 120;

const PROMPT_VERSION = "btb_report_v1.1.0";
const STORAGE_BUCKET = "reports";

function hasValidKey(key: string | undefined): boolean {
  if (!key) return false;
  if (key.length < 20) return false;
  if (key.includes("your_") || key.includes("dein-")) return false;
  return true;
}

function anthropicConfigured(): boolean {
  return hasValidKey(process.env.ANTHROPIC_API_KEY);
}

function resendConfigured(): boolean {
  return hasValidKey(process.env.RESEND_API_KEY);
}

const SYSTEM_PROMPT = `Du bist das Performance Intelligence System von BOOST THE BEAST LAB.
Du erhältst strukturierte, bereits berechnete Performance-Scores.
Deine einzige Aufgabe ist die präzise textliche Interpretation.

ABSOLUTE GRENZEN — diese Regeln sind nicht verhandelbar:
- Keine medizinischen Diagnosen
- Keine Krankheitsbehauptungen
- Keine Heilversprechen
- Keine Aussagen die eine Labordiagnostik oder ärztliche
  Untersuchung ersetzen könnten
- Kein Halluzinieren von Werten die nicht im Input stehen
- Immer als 'Performance-Insight' oder 'Einordnung' formulieren
- Nie als 'Diagnose', 'Befund' oder 'medizinisches Ergebnis'

TON: Klar, direkt, wissenschaftlich. Wie ein Elite-Coach der
Daten erklärt — nicht wie ein Arzt, nicht wie ein Influencer.
SPRACHE: Deutsch. Fachlich aber verständlich.
LÄNGE: Jede Interpretation 2-4 Sätze. Empfehlung 1-2 Sätze.

Antworte AUSSCHLIESSLICH als valides JSON:
{
  "headline": string,
  "executive_summary": string,
  "modules": {
    "activity": { "score_context": string, "main_finding": string, "limitation": string, "recommendation": string },
    "sleep":    { "score_context": string, "main_finding": string, "limitation": string, "recommendation": string },
    "metabolic":{ "score_context": string, "main_finding": string, "limitation": string, "recommendation": string },
    "stress":   { "score_context": string, "main_finding": string, "limitation": string, "recommendation": string },
    "vo2max":   { "score_context": string, "main_finding": string, "limitation": string, "recommendation": string }
  },
  "top_priority": string,
  "prognose_30_days": string,
  "disclaimer": "Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz für medizinische Diagnostik."
}`;

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Deterministic fallback report — used when ANTHROPIC_API_KEY is not configured.
// Produces plausible German prose derived directly from the computed scores
// so the end-to-end flow works for visual/manual testing without an LLM.
interface StubInputs {
  activityScore: number;
  activityBand: string;
  activityCategory: string;
  totalMet: number;
  sleepScore: number;
  sleepBand: string;
  sleepDuration: number;
  vo2Score: number;
  vo2Band: string;
  vo2Estimated: number;
  metabolicScore: number;
  metabolicBand: string;
  bmi: number;
  bmiCategory: string;
  stressScore: number;
  stressBand: string;
  overallScore: number;
  overallBand: string;
}

function pickWeakestModule(i: StubInputs): string {
  const entries: Array<[string, number]> = [
    ["Schlaf", i.sleepScore],
    ["Aktivität", i.activityScore],
    ["Stoffwechsel", i.metabolicScore],
    ["Stress", i.stressScore],
    ["Kardiorespiratorische Fitness (VO2max)", i.vo2Score],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

function buildStubReport(i: StubInputs): PdfReportContent {
  const weakest = pickWeakestModule(i);
  const overallTone =
    i.overallScore >= 80
      ? "exzellent"
      : i.overallScore >= 65
        ? "gut"
        : i.overallScore >= 50
          ? "solide mit klarem Optimierungspotenzial"
          : "aktuell limitiert — mit hohem Hebel durch gezielte Interventionen";

  return {
    headline: `Performance Index ${i.overallScore}/100 — ${overallTone}.`,
    executive_summary: `Dein Overall Performance Index liegt bei ${i.overallScore}/100 (${i.overallBand}). Die fünf Module liefern ein klares Bild: die Aktivität bewegt sich im Bereich ${i.activityBand} (${i.activityScore}), der Schlafscore bei ${i.sleepScore} (${i.sleepBand}), die metabolische Gesundheit bei ${i.metabolicScore} (${i.metabolicBand}), Stress-Regulation bei ${i.stressScore} (${i.stressBand}) und die kardiorespiratorische Fitness bei ${i.vo2Score} (${i.vo2Band}). Der größte Hebel liegt aktuell im Bereich ${weakest}.`,
    modules: {
      activity: {
        score_context: `Dein Activity Score von ${i.activityScore}/100 basiert auf ${i.totalMet} MET-Minuten pro Woche und ergibt die IPAQ-Kategorie ${i.activityCategory}.`,
        main_finding: `Die Trainings- und Alltagsaktivität positioniert dich im Band "${i.activityBand}". Damit bewegst du dich quantitativ ${i.activityCategory === "HIGH" ? "bereits überdurchschnittlich" : i.activityCategory === "MODERATE" ? "im empfohlenen Bereich" : "unterhalb der WHO-Mindestempfehlung"}.`,
        limitation: i.activityCategory === "HIGH"
          ? "Das Volumen ist solide; Qualität, Intensitätsverteilung und Regeneration werden zum limitierenden Faktor."
          : "Das wöchentliche MET-Minuten-Volumen reicht nicht aus, um den vollen kardiovaskulären und metabolischen Effekt zu erzielen.",
        recommendation: i.activityCategory === "HIGH"
          ? "Strukturiere Trainingsintensitäten nach 80/20-Prinzip und priorisiere ein Regenerationstool pro Woche."
          : "Ziele auf mindestens 150 min moderate oder 75 min intensive Aktivität pro Woche, idealerweise verteilt auf 4–5 Tage.",
      },
      sleep: {
        score_context: `Dein Sleep Score liegt bei ${i.sleepScore}/100 bei einer durchschnittlichen Schlafdauer von ${i.sleepDuration}h. Die PSQI-adaptierte Bewertung ordnet dich in "${i.sleepBand}" ein.`,
        main_finding: `Die Kombination aus Schlafdauer, subjektiver Qualität und Erholungsgefühl ergibt ein ${i.sleepBand === "excellent" ? "herausragendes" : i.sleepBand === "good" ? "solides" : "verbesserungswürdiges"} Recovery-Profil.`,
        limitation: i.sleepScore >= 85
          ? "Keine signifikante Limitierung; Stabilität der Routine ist der nächste Hebel."
          : "Schlafqualität und/oder nächtliche Unterbrechungen drücken den Gesamt-Score und limitieren die Regeneration.",
        recommendation: "Fixiere Bett- und Aufsteh-Zeit auf ±30 Minuten über sieben Tage und halte die Schlafzimmer-Temperatur bei 17–19 °C.",
      },
      metabolic: {
        score_context: `Metabolic Score ${i.metabolicScore}/100 bei BMI ${i.bmi} (${i.bmiCategory}) — Zusammenspiel aus Körperzusammensetzung, Hydration, Ernährungsrhythmus und Sitzzeit.`,
        main_finding: `Die metabolische Einordnung landet im Band "${i.metabolicBand}". ${i.bmiCategory === "normal" ? "Die Körperzusammensetzung liegt im optimalen Bereich." : `Die BMI-Kategorie "${i.bmiCategory}" wirkt als relevanter Modifier auf den Score.`}`,
        limitation: i.metabolicScore >= 80
          ? "Keine akuten Engpässe; Feintuning bei Mikro-Nährstoffdichte und Timing möglich."
          : "Hydration, Mahlzeiten-Rhythmus oder Sitzzeit limitieren die metabolische Grundlast.",
        recommendation: "Trinke täglich 30–35 ml pro kg Körpergewicht, unterbrich Sitzblöcke nach spätestens 45 Minuten und setze 4+ Gemüseportionen als Standard.",
      },
      stress: {
        score_context: `Stress Score ${i.stressScore}/100 (${i.stressBand}) — gewichtete Kombination aus selbstberichtetem Stresslevel und messbarer Erholungskapazität.`,
        main_finding: `Die Stress-Regulation befindet sich im Band "${i.stressBand}". ${i.stressScore >= 75 ? "Die autonome Belastung ist niedrig und unterstützt Anpassungsprozesse." : "Der chronische Belastungs-Level verbraucht Ressourcen, die sonst in Adaption fließen würden."}`,
        limitation: i.stressScore >= 75
          ? "Kein akuter Engpass; die Resilienz-Reserve ist vorhanden."
          : "Fehlende bewusste Downregulation verhindert vollständige parasympathische Erholung.",
        recommendation: "Installiere zwei 5-Minuten-Downregulation-Fenster pro Tag (Box-Breathing 4-4-4-4 oder Nasenatmung in Ruhe).",
      },
      vo2max: {
        score_context: `Geschätzter VO2max: ${i.vo2Estimated} ml/kg/min (${i.vo2Band}) — Non-Exercise-Schätzung auf Basis von Alter, BMI und Aktivitätskategorie.`,
        main_finding: `Die kardiorespiratorische Leistungsfähigkeit liegt im Band "${i.vo2Band}". VO2max ist einer der stärksten Einzel-Prädiktoren für langfristige Performance.`,
        limitation: i.vo2Score >= 70
          ? "Plateau-Risiko ohne periodisierte Intensitätssteigerung."
          : "Limitiert durch geringe oder unspezifische Intensitätsverteilung im aktuellen Trainingsprofil.",
        recommendation: "Integriere 1× pro Woche ein VO2max-Intervall (z.B. 4×4 min bei 90–95% HFmax, dazwischen 3 min aktive Pause).",
      },
    },
    top_priority: `Hebel Nr. 1: ${weakest}. Der größte messbare Score-Gewinn in 30 Tagen liegt hier.`,
    prognose_30_days: `Bei konsequenter Umsetzung der Empfehlungen ist ein realistischer Overall-Zuwachs von +6 bis +12 Punkten möglich — vorausgesetzt, die Maßnahmen werden mindestens 5 von 7 Tagen umgesetzt.`,
    disclaimer: "Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz für medizinische Diagnostik.",
  };
}

interface ScoreRow {
  score_code: string;
  score_value: number;
  band: string | null;
  interpretation_key: string | null;
}
interface MetricRow {
  metric_code: string;
  value: number;
  unit: string | null;
}
interface ResponseRow {
  question_code: string;
  raw_value: string;
  normalized_value: number | null;
}

function pickScore(rows: ScoreRow[], code: string) {
  const r = rows.find((x) => x.score_code === code);
  return r
    ? { score: Number(r.score_value), band: r.band ?? "", interpretation_key: r.interpretation_key ?? "" }
    : { score: 0, band: "", interpretation_key: "" };
}
function pickMetric(rows: MetricRow[], code: string): number | null {
  const r = rows.find((x) => x.metric_code === code);
  return r ? Number(r.value) : null;
}
function pickResponse(rows: ResponseRow[], code: string): string | null {
  const r = rows.find((x) => x.question_code === code);
  return r ? r.raw_value : null;
}

// ── Offline Demo Mode ─────────────────────────────────────────────────────

interface DemoContext {
  reportType: string;
  user: { email: string; age: number; gender: string; height_cm: number; weight_kg: number };
  result: FullScoringResult;
  sleepDurationHours: number;
}

function demoBand(score: number): string {
  if (score < 40) return "low";
  if (score < 65) return "moderate";
  if (score < 85) return "high";
  return "very_high";
}

async function handleDemoReport(req: NextRequest, ctx: DemoContext): Promise<NextResponse> {
  const r = ctx.result;

  const activityScore = r.activity.activity_score_0_100;
  const activityBand = demoBand(activityScore);
  const activityCategory = r.activity.activity_category.toUpperCase();
  const totalMet = r.activity.total_met_minutes_week;

  const sleepScore = r.sleep.sleep_score_0_100;
  const sleepBand = demoBand(sleepScore);
  const sleepDuration = ctx.sleepDurationHours;

  const vo2Score = r.vo2max.fitness_score_0_100;
  const vo2Band = demoBand(vo2Score);
  const vo2Estimated = r.vo2max.vo2max_estimated;

  const metabolicScore = r.metabolic.metabolic_score_0_100;
  const metabolicBand = demoBand(metabolicScore);
  const bmi = r.metabolic.bmi;
  const bmiCategory = r.metabolic.bmi_category;

  const stressScore = r.stress.stress_score_0_100;
  const stressBand = demoBand(stressScore);

  const overallScore = r.overall_score_0_100;
  const overallBand = r.overall_band;

  let report: PdfReportContent;
  if (anthropicConfigured()) {
    const userPrompt = `Erstelle einen Performance Report für folgendes Profil:

NUTZERPROFIL:
- Alter: ${ctx.user.age} Jahre
- Geschlecht: ${ctx.user.gender}
- BMI: ${bmi} (${bmiCategory})

SCORES (0-100):
- Activity Score: ${activityScore} (${activityBand})
  Gesamt MET-min/Woche: ${totalMet}
  Kategorie: ${activityCategory}
- Sleep Score: ${sleepScore} (${sleepBand})
  Schlafdauer: ${sleepDuration}h
- VO2max Score: ${vo2Score} (${vo2Band})
  Geschätzter VO2max: ${vo2Estimated} ml/kg/min
- Metabolic Score: ${metabolicScore} (${metabolicBand})
- Stress Score: ${stressScore} (${stressBand})
- Overall Performance Index: ${overallScore} (${overallBand})

REPORT TYP: ${ctx.reportType}

Erstelle den Report jetzt.`;
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected Anthropic response type");
    try {
      const cleaned = content.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      report = JSON.parse(cleaned) as PdfReportContent;
    } catch (e) {
      throw new Error(`Claude returned invalid JSON: ${(e as Error).message}`);
    }
  } else {
    console.warn("[report/generate/demo] ANTHROPIC_API_KEY not configured — using stub report");
    report = buildStubReport({
      activityScore, activityBand, activityCategory, totalMet,
      sleepScore, sleepBand, sleepDuration,
      vo2Score, vo2Band, vo2Estimated,
      metabolicScore, metabolicBand, bmi, bmiCategory,
      stressScore, stressBand,
      overallScore, overallBand,
    });
  }

  const pdfBuffer = await generatePDF(
    report,
    {
      activity: { score: activityScore, band: activityBand },
      sleep: { score: sleepScore, band: sleepBand },
      vo2max: { score: vo2Score, band: vo2Band, estimated: vo2Estimated },
      metabolic: { score: metabolicScore, band: metabolicBand },
      stress: { score: stressScore, band: stressBand },
      overall: { score: overallScore, band: overallBand },
      total_met: totalMet,
      sleep_duration_hours: sleepDuration,
    },
    {
      email: ctx.user.email,
      age: ctx.user.age,
      gender: ctx.user.gender,
      bmi,
      bmi_category: bmiCategory,
    },
  );

  const fileName = `btb-report-demo-${Date.now()}.pdf`;
  const publicDir = path.join(process.cwd(), "public", "test-reports");
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(publicDir, fileName), Buffer.from(pdfBuffer));
  const downloadUrl = `${req.nextUrl.origin}/test-reports/${fileName}`;

  return NextResponse.json({ success: true, downloadUrl, report });
}

// ── DB-backed handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const demoContext = body?.demoContext as DemoContext | undefined;
  if (demoContext) {
    return handleDemoReport(req, demoContext);
  }

  const assessmentId = body?.assessmentId as string | undefined;
  if (!assessmentId) {
    return NextResponse.json({ error: "Missing assessmentId or demoContext" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: jobRow } = await supabase
    .from("report_jobs")
    .select("id")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const jobId = jobRow?.id as string | undefined;
  if (jobId) {
    await supabase
      .from("report_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        prompt_version: PROMPT_VERSION,
      })
      .eq("id", jobId);
  }

  try {
    // 1. Load assessment, user, scores, metrics, responses.
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("id, report_type, user_id")
      .eq("id", assessmentId)
      .single();
    if (aErr) throw aErr;

    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("email, age, gender, height_cm, weight_kg")
      .eq("id", assessment.user_id)
      .single();
    if (uErr) throw uErr;

    const [scoresRes, metricsRes, responsesRes] = await Promise.all([
      supabase
        .from("scores")
        .select("score_code, score_value, band, interpretation_key")
        .eq("assessment_id", assessmentId),
      supabase
        .from("derived_metrics")
        .select("metric_code, value, unit")
        .eq("assessment_id", assessmentId),
      supabase
        .from("responses")
        .select("question_code, raw_value, normalized_value")
        .eq("assessment_id", assessmentId),
    ]);
    if (scoresRes.error) throw scoresRes.error;
    if (metricsRes.error) throw metricsRes.error;
    if (responsesRes.error) throw responsesRes.error;

    const scores = (scoresRes.data ?? []) as ScoreRow[];
    const metrics = (metricsRes.data ?? []) as MetricRow[];
    const responses = (responsesRes.data ?? []) as ResponseRow[];

    const bmi = pickMetric(metrics, "bmi") ?? 0;
    const bmiCategory =
      bmi === 0
        ? "unknown"
        : bmi < 18.5
          ? "underweight"
          : bmi < 25
            ? "normal"
            : bmi < 30
              ? "overweight"
              : bmi < 35
                ? "obese_i"
                : bmi < 40
                  ? "obese_ii"
                  : "obese_iii";

    const activity = pickScore(scores, "activity_score");
    const sleep = pickScore(scores, "sleep_score");
    const vo2Score = pickScore(scores, "vo2max_score");
    const metabolic = pickScore(scores, "metabolic_score");
    const stress = pickScore(scores, "stress_score");
    const overall = pickScore(scores, "overall_score");

    const totalMet = pickMetric(metrics, "total_met_minutes_week") ?? 0;
    const vo2Estimated = pickMetric(metrics, "vo2max_estimated") ?? 0;
    const sleepDuration = Number(pickResponse(responses, "sleep_duration_hours") ?? 0);

    const activityCategory = activity.interpretation_key.replace("activity_", "").toUpperCase();

    // 2. Build Claude user-prompt from deterministic data only.
    const userPrompt = `Erstelle einen Performance Report für folgendes Profil:

NUTZERPROFIL:
- Alter: ${user.age} Jahre
- Geschlecht: ${user.gender}
- BMI: ${bmi} (${bmiCategory})

SCORES (0-100):
- Activity Score: ${activity.score} (${activity.band})
  Gesamt MET-min/Woche: ${totalMet}
  Kategorie: ${activityCategory}
- Sleep Score: ${sleep.score} (${sleep.band})
  Schlafdauer: ${sleepDuration}h
- VO2max Score: ${vo2Score.score} (${vo2Score.band})
  Geschätzter VO2max: ${vo2Estimated} ml/kg/min
- Metabolic Score: ${metabolic.score} (${metabolic.band})
- Stress Score: ${stress.score} (${stress.band})
- Overall Performance Index: ${overall.score} (${overall.band})

REPORT TYP: ${assessment.report_type}

Erstelle den Report jetzt.`;

    // 3. Call Claude — or fall back to deterministic stub if no API key.
    let report: PdfReportContent;
    if (anthropicConfigured()) {
      const anthropic = getAnthropic();
      const message = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected Anthropic response type");
      }

      try {
        const cleaned = content.text
          .trim()
          .replace(/^```(?:json)?/i, "")
          .replace(/```$/i, "")
          .trim();
        report = JSON.parse(cleaned) as PdfReportContent;
      } catch (e) {
        throw new Error(`Claude returned invalid JSON: ${(e as Error).message}`);
      }
    } else {
      console.warn("[report/generate] ANTHROPIC_API_KEY not configured — using stub report");
      report = buildStubReport({
        activityScore: activity.score,
        activityBand: activity.band,
        activityCategory,
        totalMet: totalMet,
        sleepScore: sleep.score,
        sleepBand: sleep.band,
        sleepDuration: sleepDuration,
        vo2Score: vo2Score.score,
        vo2Band: vo2Score.band,
        vo2Estimated: vo2Estimated,
        metabolicScore: metabolic.score,
        metabolicBand: metabolic.band,
        bmi,
        bmiCategory,
        stressScore: stress.score,
        stressBand: stress.band,
        overallScore: overall.score,
        overallBand: overall.band,
      });
    }

    // 4. Generate PDF.
    const pdfBuffer = await generatePDF(
      report,
      {
        activity: { score: activity.score, band: activity.band },
        sleep: { score: sleep.score, band: sleep.band },
        vo2max: {
          score: vo2Score.score,
          band: vo2Score.band,
          estimated: vo2Estimated,
        },
        metabolic: { score: metabolic.score, band: metabolic.band },
        stress: { score: stress.score, band: stress.band },
        overall: { score: overall.score, band: overall.band },
        total_met: totalMet,
        sleep_duration_hours: sleepDuration,
      },
      {
        email: user.email,
        age: user.age,
        gender: user.gender,
        bmi,
        bmi_category: bmiCategory,
      },
    );

    // 5. Upload PDF → Supabase Storage, with a local fallback for dev/test.
    const fileName = `btb-report-${assessmentId}.pdf`;
    const storagePath = `${assessmentId}/${fileName}`;
    let downloadUrl: string;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.warn(
        `[report/generate] Supabase Storage upload failed (${uploadErr.message}) — falling back to public/test-reports`,
      );
      const publicDir = path.join(process.cwd(), "public", "test-reports");
      await mkdir(publicDir, { recursive: true });
      const localPath = path.join(publicDir, fileName);
      await writeFile(localPath, Buffer.from(pdfBuffer));
      const origin = req.nextUrl.origin;
      downloadUrl = `${origin}/test-reports/${fileName}`;
    } else {
      const { data: signed, error: signErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 30);
      if (signErr) throw signErr;
      downloadUrl = signed.signedUrl;
    }

    // 6. Persist artifact reference.
    await supabase.from("report_artifacts").insert({
      assessment_id: assessmentId,
      file_url: downloadUrl,
      file_type: "pdf",
    });

    // 7. Send email via Resend (skipped if not configured).
    if (resendConfigured()) {
      try {
        await sendReportEmail(user.email, downloadUrl, {
          overall: overall.score,
          activity: activity.score,
          sleep: sleep.score,
          vo2max: vo2Score.score,
          metabolic: metabolic.score,
          stress: stress.score,
        });
      } catch (emailErr) {
        console.error("[report/generate] email delivery failed", emailErr);
        // Non-fatal — PDF is still persisted and linked.
      }
    } else {
      console.warn("[report/generate] RESEND_API_KEY not configured — skipping email");
    }

    // 8. Mark report job completed.
    if (jobId) {
      await supabase
        .from("report_jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json({ success: true, downloadUrl, report });
  } catch (err) {
    console.error("[report/generate] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (jobId) {
      await supabase
        .from("report_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq("id", jobId);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
