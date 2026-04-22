// Background worker — generates and stores a single plan PDF.
// Called by prepare-pdfs when no pre-computed base64 is available.
// Reconstruction path: load scores from DB → buildPlan → generatePlanPDF → upload.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { upsertStatus, type PdfType } from "@/lib/pdf/status";
import { uploadPlanPdf, type PlanPdfType } from "@/lib/pdf/background-generator";
import { buildPlan, type PlanType } from "@/lib/plan/buildPlan";
import { generatePlanPDF } from "@/lib/pdf/generatePlan";
import type { Locale } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const PDF_TYPE_TO_PLAN: Record<PlanPdfType, PlanType> = {
  plan_activity: "activity",
  plan_metabolic: "metabolic",
  plan_recovery: "recovery",
  plan_stress: "stress",
};

export async function POST(req: NextRequest) {
  let assessmentId = "";
  let pdfType: PdfType = "plan_activity";
  let locale: Locale = "de";

  try {
    const body = await req.json() as {
      assessment_id: string;
      pdf_type: PdfType;
      locale: string;
    };
    assessmentId = body.assessment_id;
    pdfType = body.pdf_type;
    locale = (body.locale ?? "de") as Locale;

    if (!assessmentId || !pdfType || pdfType === "main_report") {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    await upsertStatus(assessmentId, pdfType, locale, "generating");

    const supabase = getSupabaseServiceClient();

    // ── Load scores from DB ──────────────────────────────────────────────────
    const [scoresRes, metricsRes, userRes, assessmentRes] = await Promise.all([
      supabase
        .from("scores")
        .select("score_code, score_value, band, interpretation_key")
        .eq("assessment_id", assessmentId),
      supabase
        .from("derived_metrics")
        .select("metric_code, value")
        .eq("assessment_id", assessmentId),
      supabase
        .from("assessments")
        .select("user_id")
        .eq("id", assessmentId)
        .single(),
      supabase
        .from("assessments")
        .select("id")
        .eq("id", assessmentId)
        .single(),
    ]);

    if (scoresRes.error) throw scoresRes.error;
    if (assessmentRes.error) throw assessmentRes.error;

    const scoreMap = Object.fromEntries(
      (scoresRes.data ?? []).map((r) => [r.score_code, r]),
    );
    const metricMap = Object.fromEntries(
      (metricsRes.data ?? []).map((r) => [r.metric_code, r.value as number]),
    );

    // ── Reconstruct scores object for buildPlan ──────────────────────────────
    const bmi = metricMap["bmi"] ?? 22;
    const bmiCategory =
      bmi < 18.5 ? "underweight" :
      bmi < 25   ? "normal"      :
      bmi < 30   ? "overweight"  : "obese";

    const interpretKey = (scoreMap["stress_score"]?.interpretation_key ?? "stress_medium") as string;
    const stressBand = interpretKey.replace("stress_", "") as string;

    const vo2InterpKey = (scoreMap["vo2max_score"]?.interpretation_key ?? "vo2_average") as string;
    const vo2Band = vo2InterpKey.replace("vo2_", "") as string;

    const sleepInterpKey = (scoreMap["sleep_score"]?.interpretation_key ?? "sleep_medium") as string;
    const sleepBand = sleepInterpKey.replace("sleep_", "") as string;

    const actInterpKey = (scoreMap["activity_score"]?.interpretation_key ?? "activity_moderate") as string;
    const actCategory = actInterpKey.replace("activity_", "") as string;

    const scores = {
      activity: {
        activity_score_0_100: scoreMap["activity_score"]?.score_value ?? 50,
        activity_category: actCategory,
        total_met_minutes_week: metricMap["total_met_minutes_week"] ?? 500,
      },
      sleep: {
        sleep_score_0_100: scoreMap["sleep_score"]?.score_value ?? 50,
        sleep_band: sleepBand,
        sleep_duration_band: "normal",
      },
      metabolic: {
        metabolic_score_0_100: scoreMap["metabolic_score"]?.score_value ?? 50,
        bmi,
        bmi_category: bmiCategory,
      },
      stress: {
        stress_score_0_100: scoreMap["stress_score"]?.score_value ?? 50,
        stress_band: stressBand,
      },
      vo2max: {
        fitness_score_0_100: scoreMap["vo2max_score"]?.score_value ?? 50,
        vo2max_estimated: metricMap["vo2max_estimated"] ?? 40,
        vo2max_band: vo2Band,
      },
      overall_score_0_100: scoreMap["overall_score"]?.score_value ?? 50,
      overall_band: scoreMap["overall_score"]?.band ?? "medium",
    };

    // ── Build plan + generate PDF ────────────────────────────────────────────
    const planType = PDF_TYPE_TO_PLAN[pdfType as PlanPdfType];
    const plan = buildPlan(planType, scores);

    const pdfBytes = await generatePlanPDF({ ...plan, locale });
    const base64 = Buffer.from(pdfBytes).toString("base64");

    await uploadPlanPdf(assessmentId, pdfType as PlanPdfType, locale, base64);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[generate-single-pdf] error:", err);
    if (assessmentId && pdfType) {
      await upsertStatus(assessmentId, pdfType, locale, "failed").catch(() => {});
    }
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
