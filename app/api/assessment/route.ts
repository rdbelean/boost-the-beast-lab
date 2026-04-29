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
import type { Locale, ReportType, ScoreBand } from "@/lib/supabase/types";

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
  /** User's first name — required, used for personalized email greeting. */
  first_name?: string | null;
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
  /** Bildschirmzeit vor dem Einschlafen — wird als Text-Label gespeichert und
   *  vom Report-Prompt als präziser Alltags-Hebel konsumiert. */
  screen_time_before_sleep?: "kein" | "unter_30" | "30_60" | "ueber_60" | null;
  /** Personalisierungs-Inputs. Nullable, damit alte Clients nicht brechen. */
  main_goal?: "feel_better" | "body_comp" | "performance" | "stress_sleep" | "longevity" | null;
  time_budget?: "minimal" | "moderate" | "committed" | "athlete" | null;
  experience_level?: "beginner" | "restart" | "intermediate" | "advanced" | null;
  /** Phase-2 Tiefen-Inputs — feeden direkt in Daily-Protocol-Prompt. */
  nutrition_painpoint?: "cravings_evening" | "low_protein" | "no_energy" | "no_time" | "none" | null;
  stress_source?: "job" | "family" | "finances" | "health" | "future" | "none" | null;
  recovery_ritual?: "sport" | "nature" | "cooking" | "reading" | "meditation" | "social" | "none" | null;
  /** Phase-1-Datenflussfix: diese drei wurden zuvor verworfen / verzerrt
   *  (daily_steps gar nicht im Body, training_days nur indirekt aus
   *  moderate_days/vigorous_days rekonstruierbar). Jetzt als eigene
   *  responses-Rows persistiert. Optional damit ältere Clients nicht brechen. */
  daily_steps?: number;
  training_days_self_reported?: number;
  training_intensity_self_reported?: string;
  /** Optional: links a prior wearable upload (from /api/wearable/persist) into this assessment. */
  wearable_upload_id?: string;
  /** UI locale at submit time. Drives Claude report language, PDF labels,
   *  and email copy. Defaults to "de" on the DB side if omitted. */
  locale?: Locale;
  /** Optional freetext (max 1000 chars). User's main goal in own words. */
  main_goal_freetext?: string | null;
  /** Optional freetext (max 1000 chars). Sports + frequency in own words. */
  training_type_freetext?: string | null;
}

function isLocale(v: unknown): v is Locale {
  return v === "de" || v === "en" || v === "it" || v === "tr";
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
  if (typeof body.first_name === "string" && body.first_name.trim().length === 0) {
    return "first_name must not be empty";
  }
  if (typeof body.first_name === "string" && body.first_name.length > 100) {
    return "first_name exceeds 100 characters";
  }
  if (!["metabolic", "recovery", "complete"].includes(body.reportType as string)) {
    return "Invalid reportType";
  }
  if (!["male", "female", "diverse"].includes(body.gender as string)) {
    return "Invalid gender";
  }
  if (typeof body.main_goal_freetext === "string" && body.main_goal_freetext.length > 1000) {
    return "main_goal_freetext exceeds 1000 characters";
  }
  if (typeof body.training_type_freetext === "string" && body.training_type_freetext.length > 1000) {
    return "training_type_freetext exceeds 1000 characters";
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

  // ── Offline Demo Mode: run scoring + PDF without Supabase ──
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

    // Forward to report/generate via demoContext to produce the PDF.
    let downloadUrl: string | null = null;
    try {
      const demoContext = {
        reportType: body.reportType,
        user: {
          email: body.email,
          age: body.age,
          gender: body.gender,
          height_cm: body.height_cm,
          weight_kg: body.weight_kg,
        },
        result,
        sleepDurationHours: body.sleep_duration_hours,
        sleep_quality_label: body.sleep_quality as string,
        wakeup_frequency_label: body.wakeups as string,
        morning_recovery_1_10: body.recovery_1_10,
        stress_level_1_10: body.stress_level_1_10,
        meals_per_day: body.meals_per_day,
        water_litres: body.water_litres,
        sitting_hours_per_day: body.sitting_hours,
        fruit_veg_label: body.fruit_veg as string,
        standing_hours_per_day: body.standing_hours_per_day,
      };
      const origin = req.nextUrl.origin;
      const genRes = await fetch(`${origin}/api/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoContext }),
      });
      if (genRes.ok) {
        const genJson = await genRes.json();
        downloadUrl = genJson.downloadUrl ?? null;
      }
    } catch {
      // PDF generation is best-effort in demo mode — scores are always returned.
    }

    return NextResponse.json({
      success: true,
      assessmentId: null,
      scores: result,
      downloadUrl,
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

    const trimmedFirstName =
      typeof body.first_name === "string" ? body.first_name.trim().slice(0, 100) : null;

    let userId: string;
    if (existingUser) {
      userId = existingUser.id as string;
      const updatePayload: Record<string, unknown> = {
        age: body.age,
        gender: body.gender,
        height_cm: body.height_cm,
        weight_kg: body.weight_kg,
        updated_at: new Date().toISOString(),
      };
      if (trimmedFirstName) updatePayload.first_name = trimmedFirstName;
      const { error: updateErr } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", userId);
      if (updateErr) throw updateErr;
    } else {
      const { data: created, error: insertErr } = await supabase
        .from("users")
        .insert({
          email: body.email,
          first_name: trimmedFirstName,
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
    const locale: Locale = isLocale(body.locale) ? body.locale : "de";
    const { data: assessment, error: assessmentErr } = await supabase
      .from("assessments")
      .insert({
        user_id: userId,
        assessment_type: testMode ? "test" : "full",
        instrument_version_id: instrument?.id ?? null,
        status: "processing",
        report_type: body.reportType,
        locale,
      })
      .select("id")
      .single();
    if (assessmentErr) throw assessmentErr;
    const assessmentId = assessment.id as string;

    // 4. Persist raw responses.
    const responseRows = Object.entries(body)
      .filter(([k]) => k !== "email" && k !== "reportType" && k !== "wearable_upload_id")
      .map(([k, v]) => ({
        assessment_id: assessmentId,
        question_code: k,
        raw_value: String(v),
        normalized_value: typeof v === "number" ? v : null,
      }));
    const { error: respErr } = await supabase.from("responses").insert(responseRows);
    if (respErr) throw respErr;

    // 4b. Optional wearable upload — link to this assessment if present.
    let wearableOverrides:
      | NonNullable<FullAssessmentInputs["wearable"]>
      | undefined;
    if (body.wearable_upload_id) {
      const { data: wUp } = await supabase
        .from("wearable_uploads")
        .select("id, source, days_covered, metrics")
        .eq("id", body.wearable_upload_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (wUp) {
        const m = wUp.metrics as Record<string, Record<string, number> | undefined>;
        wearableOverrides = {
          source: wUp.source as "whoop" | "apple_health",
          days_covered: wUp.days_covered,
          sleep: m.sleep
            ? {
                duration_hours: m.sleep.avg_duration_hours,
                efficiency_pct: m.sleep.avg_efficiency_pct,
                wakeups_per_night: m.sleep.avg_wakeups,
              }
            : undefined,
          recovery: m.recovery
            ? {
                whoop_recovery_0_100:
                  wUp.source === "whoop" ? m.recovery.avg_score : undefined,
                hrv_ms: m.recovery.avg_hrv_ms,
                rhr_bpm: m.recovery.avg_rhr_bpm,
              }
            : undefined,
          activity: m.activity
            ? {
                daily_steps: m.activity.avg_steps,
                whoop_strain_0_21:
                  wUp.source === "whoop" ? m.activity.avg_strain : undefined,
                active_kcal: m.activity.avg_active_kcal,
              }
            : undefined,
          vo2max: m.vo2max
            ? { measured_ml_kg_min: m.vo2max.last_value }
            : undefined,
          body: m.body ? { weight_kg: m.body.last_weight_kg } : undefined,
        };

        await supabase
          .from("wearable_uploads")
          .update({ assessment_id: assessmentId })
          .eq("id", wUp.id);

        const dsKey = wUp.source === "whoop" ? "whoop" : "apple_health";
        await supabase
          .from("assessments")
          .update({
            data_sources: {
              form: true,
              [dsKey]: { days: wUp.days_covered, upload_id: wUp.id },
            },
          })
          .eq("id", assessmentId);
      }
    }

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
      wearable: wearableOverrides,
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

    // 10. Return scores immediately. The client is responsible for calling
    // /api/report/generate afterwards with { assessmentId }.
    //
    // WHY: Previously this endpoint did `await fetch('/api/report/generate')`,
    // which chained two serverless invocations under one outer timeout.
    // Claude (30-60s) + Puppeteer PDF (5-15s) + Supabase Storage upload
    // consistently pushed the outer response past Vercel's gateway limit and
    // surfaced as a 504. Splitting into two client-initiated calls gives
    // each endpoint its own fresh timeout budget.
    return NextResponse.json({
      success: true,
      assessmentId,
      scores: result,
      downloadUrl: null,
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
