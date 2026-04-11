import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { generatePDF, type PdfReportContent } from "@/lib/pdf/generateReport";
import { sendReportEmail } from "@/lib/email/sendReport";

export const runtime = "nodejs";
export const maxDuration = 120;

const PROMPT_VERSION = "btb_report_v1.1.0";
const STORAGE_BUCKET = "reports";

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

export async function POST(req: NextRequest) {
  let assessmentId: string | undefined;
  try {
    const body = await req.json();
    assessmentId = body?.assessmentId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!assessmentId) {
    return NextResponse.json({ error: "Missing assessmentId" }, { status: 400 });
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

    // 3. Call Claude.
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

    let report: PdfReportContent;
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

    // 5. Upload PDF to Supabase Storage.
    const fileName = `btb-report-${assessmentId}.pdf`;
    const storagePath = `${assessmentId}/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) {
      throw new Error(
        `Supabase Storage upload failed: ${uploadErr.message}. ` +
          `Make sure the bucket "${STORAGE_BUCKET}" exists (create it in the Supabase Dashboard).`,
      );
    }

    // Create a signed URL valid for 30 days.
    const { data: signed, error: signErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30);
    if (signErr) throw signErr;
    const downloadUrl = signed.signedUrl;

    // 6. Persist artifact reference.
    await supabase.from("report_artifacts").insert({
      assessment_id: assessmentId,
      file_url: downloadUrl,
      file_type: "pdf",
    });

    // 7. Send email via Resend.
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
      // Do not fail the whole job — PDF is stored, user can still get it via artifact row.
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
