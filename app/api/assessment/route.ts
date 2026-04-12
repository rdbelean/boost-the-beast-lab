import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  runFullScoring,
  type FullAssessmentInputs,
  type Gender,
  type FruitVegLevel,
  type SleepQualityLabel,
  type WakeupFrequency,
} from "@/lib/scoring/index";
import type { ReportType, ScoreBand } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// TODO: STRIPE WEBHOOK VERIFICATION
// Bevor der Assessment-Flow startet, Payment-Status über Stripe-Session
// oder Webhook-Signature prüfen. Nur wenn bezahlt → Report generieren.
// Solange wir im Test-Modus sind, läuft der Flow ohne Bezahlung durch.
function isTestMode(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.TEST_MODE === "true" ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true"
  );
}

interface AssessmentRequestBody {
  email: string;
  reportType: ReportType;
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  fruit_veg: FruitVegLevel;
  // Activity — IPAQ raw
  walking_days: number;
  walking_minutes_per_day: number;
  /** Optional new-UI override: hours on feet per day (standing + walking). */
  standing_hours_per_day?: number;
  /** Optional override: total walking MET minutes / week (bypasses bout cap). */
  walking_total_minutes_week?: number;
  moderate_days: number;
  moderate_minutes_per_day: number;
  vigorous_days: number;
  vigorous_minutes_per_day: number;
  // Sleep
  sleep_duration_hours: number;
  sleep_quality: SleepQualityLabel;
  wakeups: WakeupFrequency;
  recovery_1_10: number;
  // Metabolic / lifestyle
  meals_per_day: number;
  water_litres: number;
  sitting_hours: number;
  // Stress
  stress_level_1_10: number;
}

function bandForScore(score: number): ScoreBand {
  if (score < 40) return "low";
  if (score < 65) return "moderate";
  if (score < 85) return "high";
  return "very_high";
}

function validate(body: Partial<AssessmentRequestBody>): string | null {
  const required: (keyof AssessmentRequestBody)[] = [
    "email",
    "reportType",
    "age",
    "gender",
    "height_cm",
    "weight_kg",
  ];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return `Missing required field: ${k}`;
    }
  }
  if (!["metabolic", "recovery", "complete"].includes(body.reportType as string)) {
    return "Invalid reportType";
  }
  if (!["male", "female", "diverse"].includes(body.gender as string)) {
    return "Invalid gender";
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: AssessmentRequestBody;
  try {
    body = (await req.json()) as AssessmentRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // ── Offline Demo Mode: skip DB + PDF when Supabase is not configured ──
  // Returns scores immediately (no Claude, no PDF, no email). This keeps the
  // analyse flow working on Vercel even if env vars are partially missing or
  // Puppeteer (which requires a local Chromium) isn't available.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const scoringInputs: FullAssessmentInputs = {
      age: body.age,
      gender: body.gender,
      height_cm: body.height_cm,
      weight_kg: body.weight_kg,
      activity: {
        walking_days: body.walking_days,
        walking_minutes_per_day: body.walking_minutes_per_day,
        walking_total_minutes_week: body.walking_total_minutes_week,
        moderate_days: body.moderate_days,
        moderate_minutes_per_day: body.moderate_minutes_per_day,
        vigorous_days: body.vigorous_days,
        vigorous_minutes_per_day: body.vigorous_minutes_per_day,
      },
      sleep: {
        duration_hours: body.sleep_duration_hours,
        quality: body.sleep_quality,
        wakeups: body.wakeups,
        recovery_1_10: body.recovery_1_10,
      },
      metabolic: {
        meals_per_day: body.meals_per_day,
        water_litres: body.water_litres,
        sitting_hours: body.sitting_hours,
        fruit_veg: body.fruit_veg,
      },
      stress: { stress_level_1_10: body.stress_level_1_10 },
    };
    const result = runFullScoring(scoringInputs);
    return NextResponse.json({
      success: true,
      assessmentId: null,
      scores: result,
      downloadUrl: null,
      testMode: true,
    });
  }

  const supabase = getSupabaseServiceClient();

  try {
    // 1. Upsert user by email.
    const { data: existingUser, error: userLookupErr } = await supabase
      .from("users")
      .select("*")
      .eq("email", body.email)
      .maybeSingle();
    if (userLookupErr) throw userLookupErr;

    let userId: string;
    if (existingUser) {
      userId = existingUser.id as string;
      const { error: updateErr } = await supabase
        .from("users")
        .update({
          age: body.age,
          gender: body.gender,
          height_cm: body.height_cm,
          weight_kg: body.weight_kg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (updateErr) throw updateErr;
    } else {
      const { data: created, error: insertErr } = await supabase
        .from("users")
        .insert({
          email: body.email,
          age: body.age,
          gender: body.gender,
          height_cm: body.height_cm,
          weight_kg: body.weight_kg,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      userId = created.id as string;
    }

    // 2. Resolve active instrument version.
    const { data: instrument } = await supabase
      .from("instrument_versions")
      .select("id")
      .eq("instrument_name", "btb_assessment_v1")
      .eq("version", "1.0.0")
      .maybeSingle();

    // 3. Create assessment.
    // NOTE: Test mode is encoded via assessment_type='test' instead of a
    // dedicated is_test_mode column — that keeps this endpoint working even
    // if the schema's is_test_mode migration hasn't been applied yet.
    const testMode = isTestMode();
    const { data: assessment, error: assessmentErr } = await supabase
      .from("assessments")
      .insert({
        user_id: userId,
        assessment_type: testMode ? "test" : "full",
        instrument_version_id: instrument?.id ?? null,
        status: "processing",
        report_type: body.reportType,
      })
      .select("id")
      .single();
    if (assessmentErr) throw assessmentErr;
    const assessmentId = assessment.id as string;

    // 4. Persist raw responses.
    const responseRows = Object.entries(body)
      .filter(([k]) => k !== "email" && k !== "reportType")
      .map(([k, v]) => ({
        assessment_id: assessmentId,
        question_code: k,
        raw_value: String(v),
        normalized_value: typeof v === "number" ? v : null,
      }));
    const { error: respErr } = await supabase.from("responses").insert(responseRows);
    if (respErr) throw respErr;

    // 5. Run scoring.
    const scoringInputs: FullAssessmentInputs = {
      age: body.age,
      gender: body.gender,
      height_cm: body.height_cm,
      weight_kg: body.weight_kg,
      activity: {
        walking_days: body.walking_days,
        walking_minutes_per_day: body.walking_minutes_per_day,
        walking_total_minutes_week: body.walking_total_minutes_week,
        moderate_days: body.moderate_days,
        moderate_minutes_per_day: body.moderate_minutes_per_day,
        vigorous_days: body.vigorous_days,
        vigorous_minutes_per_day: body.vigorous_minutes_per_day,
      },
      sleep: {
        duration_hours: body.sleep_duration_hours,
        quality: body.sleep_quality,
        wakeups: body.wakeups,
        recovery_1_10: body.recovery_1_10,
      },
      metabolic: {
        meals_per_day: body.meals_per_day,
        water_litres: body.water_litres,
        sitting_hours: body.sitting_hours,
        fruit_veg: body.fruit_veg,
      },
      stress: { stress_level_1_10: body.stress_level_1_10 },
    };
    const result = runFullScoring(scoringInputs);

    // 6. Persist derived metrics.
    const derivedRows = [
      { metric_code: "bmi", value: result.metabolic.bmi, unit: "kg/m2" },
      { metric_code: "walking_met_minutes_week", value: result.activity.walking_met, unit: "MET-min/wk" },
      { metric_code: "moderate_met_minutes_week", value: result.activity.moderate_met, unit: "MET-min/wk" },
      { metric_code: "vigorous_met_minutes_week", value: result.activity.vigorous_met, unit: "MET-min/wk" },
      { metric_code: "total_met_minutes_week", value: result.activity.total_met_minutes_week, unit: "MET-min/wk" },
      { metric_code: "vo2max_estimated", value: result.vo2max.vo2max_estimated, unit: "ml/kg/min" },
    ].map((m) => ({
      assessment_id: assessmentId,
      ...m,
      source_rule_version: "1.0.0",
    }));

    // Category is text, not numeric — store in responses-style row so we don't hit numeric type.
    // Instead, insert as separate numeric metrics and encode category via interpretation_key on scores.
    const { error: metricsErr } = await supabase
      .from("derived_metrics")
      .insert(derivedRows);
    if (metricsErr) throw metricsErr;

    // 7. Persist scores.
    const scoreRows = [
      {
        score_code: "activity_score",
        score_value: result.activity.activity_score_0_100,
        band: bandForScore(result.activity.activity_score_0_100),
        interpretation_key: `activity_${result.activity.activity_category.toLowerCase()}`,
      },
      {
        score_code: "sleep_score",
        score_value: result.sleep.sleep_score_0_100,
        band: bandForScore(result.sleep.sleep_score_0_100),
        interpretation_key: `sleep_${result.sleep.sleep_band}`,
      },
      {
        score_code: "vo2max_score",
        score_value: result.vo2max.fitness_score_0_100,
        band: bandForScore(result.vo2max.fitness_score_0_100),
        interpretation_key: `vo2_${result.vo2max.fitness_level_band.toLowerCase().replace(" ", "_")}`,
      },
      {
        score_code: "metabolic_score",
        score_value: result.metabolic.metabolic_score_0_100,
        band: bandForScore(result.metabolic.metabolic_score_0_100),
        interpretation_key: `metabolic_${result.metabolic.bmi_category}`,
      },
      {
        score_code: "stress_score",
        score_value: result.stress.stress_score_0_100,
        band: bandForScore(result.stress.stress_score_0_100),
        interpretation_key: `stress_${result.stress.stress_band}`,
      },
      {
        score_code: "overall_score",
        score_value: result.overall_score_0_100,
        band: bandForScore(result.overall_score_0_100),
        interpretation_key: `overall_${result.overall_band}`,
      },
    ].map((s) => ({ assessment_id: assessmentId, ...s }));
    const { error: scoreErr } = await supabase.from("scores").insert(scoreRows);
    if (scoreErr) throw scoreErr;

    // 8. Mark assessment completed.
    await supabase
      .from("assessments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", assessmentId);

    // 9. Create report job in pending state.
    await supabase.from("report_jobs").insert({
      assessment_id: assessmentId,
      status: "pending",
    });

    // 10. Trigger AI report generation.
    // Always awaited — Vercel kills Lambdas after response, so fire-and-forget
    // never completes. With maxDuration=120 we have enough headroom for
    // Claude (~50s) + PDF (~5s) + Storage + Email.
    const origin = req.nextUrl.origin;
    let downloadUrl: string | null = null;

    try {
      const genRes = await fetch(`${origin}/api/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      const genJson = (await genRes.json()) as {
        downloadUrl?: string;
        error?: string;
      };
      if (!genRes.ok) {
        console.error("[assessment] report generation failed", genJson.error);
      } else {
        downloadUrl = genJson.downloadUrl ?? null;
      }
    } catch (e) {
      console.error("[assessment] report trigger failed", e);
    }

    return NextResponse.json({
      success: true,
      assessmentId,
      scores: result,
      downloadUrl,
      testMode,
    });
  } catch (err) {
    console.error("[assessment] error", err);
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
          ? (err as { message?: string }).message ?? JSON.stringify(err)
          : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
