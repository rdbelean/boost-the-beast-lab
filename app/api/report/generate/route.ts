import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { generatePDF, type PdfReportContent, type PdfWearableRows, type PdfHeroData } from "@/lib/pdf/generateReport";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";
import { sendReportEmail } from "@/lib/email/sendReport";
import type { Locale } from "@/lib/supabase/types";
import {
  runFullScoring,
  type FullScoringResult,
  type FullAssessmentInputs,
  type Gender,
  type FruitVegLevel,
  type SleepQualityLabel,
  type WakeupFrequency,
} from "@/lib/scoring/index";
import {
  buildReportPrompts,
  trainingIntensityLabel,
  SLEEP_QUALITY_LABEL,
  WAKEUP_LABEL,
  FRUIT_VEG_LABEL,
  FALLBACK_NOT_SPECIFIED,
  type PremiumPromptContext,
} from "@/lib/report/prompts/full-prompts";

export const runtime = "nodejs";
// Vercel Pro allows up to 300s. Claude Opus + 8k tokens regularly crosses
// 90–120s, so we need the full runway.
export const maxDuration = 300;

const PROMPT_VERSION = "btb_report_v3.1.0";
const STORAGE_BUCKET = "Reports";

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

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// `buildStubReport` and its helpers were removed deliberately. When
// ANTHROPIC_API_KEY is missing or invalid, the route returns a 503 and the
// caller surfaces an error UI. We do NOT substitute a deterministic
// German-only stub for personalised AI output.

interface ResponseRow {
  question_code: string;
  raw_value: string;
  normalized_value: number | null;
}

// ── Offline Demo Mode ─────────────────────────────────────────────────────

interface DemoContext {
  reportType: string;
  // URL locale captured when the client built the body. Drives Claude
  // output language, PDF chrome, and disclaimer. Falls back to "de" on
  // the server if the client forgot to send it.
  locale?: Locale;
  user: { email: string; age: number; gender: string; height_cm: number; weight_kg: number };
  result: FullScoringResult;
  sleepDurationHours: number;
  // Optional raw-input extras — used by the premium prompt when available.
  sleep_quality_label?: string;
  wakeup_frequency_label?: string;
  morning_recovery_1_10?: number;
  stress_level_1_10?: number;
  meals_per_day?: number;
  water_litres?: number;
  fruit_veg_label?: string;
  standing_hours_per_day?: number;
  sitting_hours_per_day?: number;
  training_days?: number;
  daily_steps?: number;
  screen_time_before_sleep?: string | null;
  main_goal?: PremiumPromptContext["main_goal"];
  time_budget?: PremiumPromptContext["time_budget"];
  experience_level?: PremiumPromptContext["experience_level"];
  nutrition_painpoint?: PremiumPromptContext["nutrition_painpoint"];
  stress_source?: PremiumPromptContext["stress_source"];
  recovery_ritual?: PremiumPromptContext["recovery_ritual"];
  data_sources?: PremiumPromptContext["data_sources"];
}

function demoBand(score: number): string {
  if (score < 40) return "low";
  if (score < 65) return "moderate";
  if (score < 85) return "high";
  return "very_high";
}

async function handleDemoReport(req: NextRequest, ctx: DemoContext): Promise<NextResponse> {
  const r = ctx.result;
  const demoLocale: Locale =
    ctx.locale === "en" || ctx.locale === "it" || ctx.locale === "tr"
      ? ctx.locale
      : "de";

  if (!anthropicConfigured()) {
    console.error("[report/generate/demo] ANTHROPIC_API_KEY missing/invalid — refusing to generate stub");
    return NextResponse.json({ error: "ai_unavailable", code: "missing_api_key" }, { status: 503 });
  }

  const activityScore = r.activity.activity_score_0_100;
  const activityBand = demoBand(activityScore);
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
  {
    const { systemPrompt, userPrompt } = buildReportPrompts({
      reportType: ctx.reportType,
      locale: demoLocale,
      age: ctx.user.age,
      gender: ctx.user.gender,
      result: r,
      sleep_duration_hours: ctx.sleepDurationHours,
      sleep_quality_label: ctx.sleep_quality_label ?? FALLBACK_NOT_SPECIFIED[demoLocale],
      wakeup_frequency_label: ctx.wakeup_frequency_label ?? FALLBACK_NOT_SPECIFIED[demoLocale],
      morning_recovery_1_10: ctx.morning_recovery_1_10 ?? 5,
      stress_level_1_10: ctx.stress_level_1_10 ?? 5,
      meals_per_day: ctx.meals_per_day ?? 3,
      water_litres: ctx.water_litres ?? 2,
      fruit_veg_label: ctx.fruit_veg_label ?? FALLBACK_NOT_SPECIFIED[demoLocale],
      standing_hours_per_day: ctx.standing_hours_per_day ?? 3,
      sitting_hours_per_day: ctx.sitting_hours_per_day ?? r.metabolic.sitting_hours,
      training_days: ctx.training_days ?? 0,
      training_intensity_label: trainingIntensityLabel(r, demoLocale),
      daily_steps: ctx.daily_steps ?? 0,
      screen_time_before_sleep: ctx.screen_time_before_sleep ?? null,
      main_goal: ctx.main_goal ?? null,
      time_budget: ctx.time_budget ?? null,
      experience_level: ctx.experience_level ?? null,
      nutrition_painpoint: ctx.nutrition_painpoint ?? null,
      stress_source: ctx.stress_source ?? null,
      recovery_ritual: ctx.recovery_ritual ?? null,
      data_sources: ctx.data_sources,
    });
    const anthropic = getAnthropic();
    const message = await callAnthropicWithRetry(anthropic, {
      // Sonnet 4.6 is ~2-3× faster than Opus for this structured paraphrase
      // task and keeps the total latency under the Vercel timeout.
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      system: systemPrompt,
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
  }

  const pdfBuffer = await generatePDF(
    report,
    {
      sleep: { score: sleepScore, band: sleepBand },
      recovery: { score: r.recovery.recovery_score_0_100, band: r.recovery.recovery_band },
      activity: { score: activityScore, band: activityBand },
      metabolic: { score: metabolicScore, band: metabolicBand },
      stress: { score: stressScore, band: stressBand },
      vo2max: { score: vo2Score, band: vo2Band, estimated: vo2Estimated },
      overall: { score: overallScore, band: overallBand },
      total_met: totalMet,
      sleep_duration_hours: sleepDuration,
      sitting_hours: r.metabolic.sitting_hours,
      training_days: ctx.training_days ?? 0,
    },
    {
      email: ctx.user.email,
      age: ctx.user.age,
      gender: ctx.user.gender,
      bmi,
      bmi_category: bmiCategory,
    },
    demoLocale,
  );

  // In demo mode, try to save to /public/test-reports for local dev.
  // On Vercel the filesystem outside /tmp is read-only — fall back to
  // returning the PDF as a base64 data URL that the client can open directly.
  let downloadUrl: string | null = null;
  try {
    const fileName = `btb-report-demo-${Date.now()}.pdf`;
    const publicDir = path.join(process.cwd(), "public", "test-reports");
    await mkdir(publicDir, { recursive: true });
    await writeFile(path.join(publicDir, fileName), Buffer.from(pdfBuffer));
    downloadUrl = `${req.nextUrl.origin}/test-reports/${fileName}`;
  } catch {
    // Filesystem is read-only (Vercel prod) — embed PDF as base64 data URL
    const b64 = Buffer.from(pdfBuffer).toString("base64");
    downloadUrl = `data:application/pdf;base64,${b64}`;
  }

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
    try {
      return await handleDemoReport(req, demoContext);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[report/generate] handleDemoReport error:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const assessmentId = body?.assessmentId as string | undefined;
  if (!assessmentId) {
    return NextResponse.json({ error: "Missing assessmentId or demoContext" }, { status: 400 });
  }

  // Top-level try/catch wrapping EVERYTHING so lambda never crashes with
  // a raw "An error occurred" plain-text response — always return JSON.
  let supabase: ReturnType<typeof getSupabaseServiceClient>;
  try {
    supabase = getSupabaseServiceClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[report/generate] supabase init failed", msg);
    return NextResponse.json({ error: `Supabase init: ${msg}` }, { status: 500 });
  }

  let jobId: string | undefined;
  try {
    const { data: jobRow } = await supabase
      .from("report_jobs")
      .select("id")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    jobId = jobRow?.id as string | undefined;
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[report/generate] job setup failed", msg);
    return NextResponse.json({ error: `Job setup: ${msg}` }, { status: 500 });
  }

  try {
    // 1. Load assessment, user, scores, metrics, responses.
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("id, report_type, user_id, data_sources, locale")
      .eq("id", assessmentId)
      .single();
    if (aErr) throw aErr;

    const locale: Locale =
      assessment.locale === "en" ||
      assessment.locale === "it" ||
      assessment.locale === "tr"
        ? assessment.locale
        : "de";

    const { data: user, error: uErr } = await supabase
      .from("users")
      .select("email, age, gender, height_cm, weight_kg")
      .eq("id", assessment.user_id)
      .single();
    if (uErr) throw uErr;

    // Scores and derived metrics are re-derived from responses below via
    // runFullScoring() — no need to fetch them separately.
    const responsesRes = await supabase
      .from("responses")
      .select("question_code, raw_value, normalized_value")
      .eq("assessment_id", assessmentId);
    if (responsesRes.error) throw responsesRes.error;

    const responses = (responsesRes.data ?? []) as ResponseRow[];

    // 2. Reconstruct the full scoring inputs from the stored responses.
    //    This lets us re-run runFullScoring() to get the richer v3 result
    //    (interpretation bundle, systemic warnings, recovery module) even
    //    when the assessment was persisted under an older scoring version.
    const respMap = new Map<string, string>(
      responses.map((r) => [r.question_code, r.raw_value]),
    );
    const num = (k: string, fallback: number): number => {
      const v = respMap.get(k);
      const n = v != null ? Number(v) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };
    const str = <T extends string>(k: string, fallback: T): T =>
      (respMap.get(k) as T | undefined) ?? fallback;

    const reconstructed: FullAssessmentInputs = {
      age: user.age ?? num("age", 30),
      gender: (user.gender as Gender) ?? str<Gender>("gender", "diverse"),
      height_cm: user.height_cm ?? num("height_cm", 175),
      weight_kg: user.weight_kg ?? num("weight_kg", 75),
      activity: {
        walking_days: num("walking_days", 5),
        walking_minutes_per_day: num("walking_minutes_per_day", 30),
        walking_total_minutes_week: respMap.has("walking_total_minutes_week")
          ? num("walking_total_minutes_week", 0)
          : undefined,
        moderate_days: num("moderate_days", 0),
        moderate_minutes_per_day: num("moderate_minutes_per_day", 0),
        vigorous_days: num("vigorous_days", 0),
        vigorous_minutes_per_day: num("vigorous_minutes_per_day", 0),
      },
      sleep: {
        duration_hours: num("sleep_duration_hours", 7),
        quality: str<SleepQualityLabel>("sleep_quality", "mittel"),
        wakeups: str<WakeupFrequency>("wakeups", "selten"),
        recovery_1_10: num("recovery_1_10", 5),
      },
      metabolic: {
        meals_per_day: num("meals_per_day", 3),
        water_litres: num("water_litres", 2),
        sitting_hours: num("sitting_hours", 6),
        fruit_veg: str<FruitVegLevel>("fruit_veg", "moderate"),
      },
      stress: { stress_level_1_10: num("stress_level_1_10", 5) },
    };

    // Optional wearable overrides. `assessments.data_sources` is populated by
    // /api/assessment when a wearable_upload_id was submitted; we look up the
    // linked wearable_uploads row and build a WearableOverrides object.
    const dataSources = assessment.data_sources as
      | { form?: true; whoop?: { days: number; upload_id?: string }; apple_health?: { days: number; upload_id?: string } }
      | null;
    let pdfWearableRows: PdfWearableRows | undefined;
    if (dataSources?.whoop || dataSources?.apple_health) {
      const source = dataSources.whoop ? "whoop" : "apple_health";
      const { data: wUp } = await supabase
        .from("wearable_uploads")
        .select("source, days_covered, metrics")
        .eq("assessment_id", assessmentId)
        .eq("source", source)
        .maybeSingle();
      if (wUp) {
        const m = wUp.metrics as Record<string, Record<string, number> | undefined>;
        reconstructed.wearable = {
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
          vo2max: m.vo2max ? { measured_ml_kg_min: m.vo2max.last_value } : undefined,
          body: m.body ? { weight_kg: m.body.last_weight_kg } : undefined,
        };

        // Build localized PDF stat-box rows from raw wearable metrics.
        const W_LABELS: Record<Locale, Record<string, string>> = {
          de: { dur: "Ø Schlafdauer", eff: "Schlafeffizienz", deep: "Tiefschlaf", rem: "REM", steps: "Ø Schritte", strain: "Ø Strain", kcal: "Ø Aktiv-kcal", hrv: "Ø HRV", rhr: "Ø Ruhepuls", rec: "Ø Recovery", vo2: "VO2max", bmi: "BMI", fat: "Körperfett", muscle: "Muskelmasse" },
          en: { dur: "Avg Sleep", eff: "Sleep Eff.", deep: "Deep Sleep", rem: "REM", steps: "Avg Steps", strain: "Avg Strain", kcal: "Active kcal", hrv: "Avg HRV", rhr: "Avg RHR", rec: "Avg Recovery", vo2: "VO2max", bmi: "BMI", fat: "Body Fat", muscle: "Muscle Mass" },
          it: { dur: "Durata Sonno", eff: "Efficienza Sonno", deep: "Sonno Profondo", rem: "REM", steps: "Passi Medi", strain: "Strain Medio", kcal: "kcal Attive", hrv: "HRV Medio", rhr: "FC a Riposo", rec: "Recupero Medio", vo2: "VO2max", bmi: "BMI", fat: "Grasso Corporeo", muscle: "Massa Muscolare" },
          tr: { dur: "Ort. Uyku", eff: "Uyku Verim.", deep: "Derin Uyku", rem: "REM", steps: "Ort. Adım", strain: "Ort. Strain", kcal: "Aktif kcal", hrv: "Ort. HRV", rhr: "İstirahat Nabzı", rec: "Ort. Recovery", vo2: "VO2max", bmi: "BMI", fat: "Vücut Yağı", muscle: "Kas Kütlesi" },
        };
        const wLabels = W_LABELS[locale] ?? W_LABELS.en;
        pdfWearableRows = {};
        if (m.sleep) {
          const sr: Array<[string, string]> = [];
          if (m.sleep.avg_duration_hours != null) sr.push([wLabels.dur, `${m.sleep.avg_duration_hours.toFixed(1)} h`]);
          if (m.sleep.avg_efficiency_pct != null) sr.push([wLabels.eff, `${Math.round(m.sleep.avg_efficiency_pct)}%`]);
          if (m.sleep.avg_deep_sleep_min != null) sr.push([wLabels.deep, `${Math.round(m.sleep.avg_deep_sleep_min)} min`]);
          if (m.sleep.avg_rem_min != null) sr.push([wLabels.rem, `${Math.round(m.sleep.avg_rem_min)} min`]);
          if (sr.length) pdfWearableRows.sleep = sr;
        }
        if (m.activity) {
          const ar: Array<[string, string]> = [];
          if (m.activity.avg_steps != null) ar.push([wLabels.steps, Math.round(m.activity.avg_steps).toString()]);
          if (m.activity.avg_strain != null) ar.push([wLabels.strain, m.activity.avg_strain.toFixed(1)]);
          if (m.activity.avg_active_kcal != null) ar.push([wLabels.kcal, Math.round(m.activity.avg_active_kcal).toString()]);
          if (ar.length) pdfWearableRows.activity = ar;
        }
        if (m.recovery) {
          const rr: Array<[string, string]> = [];
          if (m.recovery.avg_hrv_ms != null) rr.push([wLabels.hrv, `${Math.round(m.recovery.avg_hrv_ms)} ms`]);
          if (m.recovery.avg_rhr_bpm != null) rr.push([wLabels.rhr, `${Math.round(m.recovery.avg_rhr_bpm)} bpm`]);
          if (m.recovery.avg_score != null) rr.push([wLabels.rec, `${Math.round(m.recovery.avg_score)}%`]);
          if (rr.length) pdfWearableRows.stress = rr;
        }
        if (m.vo2max?.last_value != null) {
          pdfWearableRows.vo2max = [[wLabels.vo2, `${m.vo2max.last_value.toFixed(1)} ml/kg/min`]];
        }
        if (m.body) {
          const br: Array<[string, string]> = [];
          if (m.body.bmi != null) br.push([wLabels.bmi, m.body.bmi.toFixed(1)]);
          if (m.body.body_fat_pct != null) br.push([wLabels.fat, `${m.body.body_fat_pct.toFixed(1)}%`]);
          if (m.body.skeletal_muscle_kg != null) br.push([wLabels.muscle, `${m.body.skeletal_muscle_kg.toFixed(1)} kg`]);
          if (br.length) pdfWearableRows.metabolic = br;
        }
      }
    }

    const result = runFullScoring(reconstructed);
    const sleepDuration = reconstructed.sleep.duration_hours;
    const standingHours = num(
      "standing_hours_per_day",
      reconstructed.activity.walking_total_minutes_week
        ? reconstructed.activity.walking_total_minutes_week / 60 / 5
        : 3,
    );
    const trainingDays = Math.max(
      reconstructed.activity.moderate_days,
      reconstructed.activity.vigorous_days,
    );

    // 3. Build the premium v3 prompts (shared with the demo handler).
    //    Monolithic per-locale via buildReportPrompts — no parametrised
    //    LANGUAGE_DIRECTIVE / LANG_LOCK_HEADER override anymore.
    const { systemPrompt, userPrompt } = buildReportPrompts({
      reportType: assessment.report_type ?? "complete",
      locale,
      age: reconstructed.age,
      gender: reconstructed.gender,
      result,
      sleep_duration_hours: sleepDuration,
      sleep_quality_label:
        SLEEP_QUALITY_LABEL[locale][reconstructed.sleep.quality] ??
        SLEEP_QUALITY_LABEL[locale].mittel,
      wakeup_frequency_label:
        WAKEUP_LABEL[locale][reconstructed.sleep.wakeups] ??
        WAKEUP_LABEL[locale].selten,
      morning_recovery_1_10: reconstructed.sleep.recovery_1_10,
      stress_level_1_10: reconstructed.stress.stress_level_1_10,
      meals_per_day: reconstructed.metabolic.meals_per_day,
      water_litres: reconstructed.metabolic.water_litres,
      fruit_veg_label:
        FRUIT_VEG_LABEL[locale][reconstructed.metabolic.fruit_veg] ??
        FRUIT_VEG_LABEL[locale].moderate,
      standing_hours_per_day: standingHours,
      sitting_hours_per_day: reconstructed.metabolic.sitting_hours,
      training_days: trainingDays,
      training_intensity_label: trainingIntensityLabel(result, locale),
      daily_steps: num("schrittzahl", 0),
      // Neue v2-Felder — aus responses-Tabelle gelesen. Fehlende Werte
      // werden im Prompt als "nicht angegeben" ausgespielt und dort per
      // Default-Fallback (feel_better / moderate / intermediate) behandelt.
      screen_time_before_sleep: respMap.get("screen_time_before_sleep") ?? null,
      main_goal: (respMap.get("main_goal") as PremiumPromptContext["main_goal"]) ?? null,
      time_budget: (respMap.get("time_budget") as PremiumPromptContext["time_budget"]) ?? null,
      experience_level:
        (respMap.get("experience_level") as PremiumPromptContext["experience_level"]) ?? null,
      // Phase-2 Tiefen-Inputs
      nutrition_painpoint:
        (respMap.get("nutrition_painpoint") as PremiumPromptContext["nutrition_painpoint"]) ?? null,
      stress_source:
        (respMap.get("stress_source") as PremiumPromptContext["stress_source"]) ?? null,
      recovery_ritual:
        (respMap.get("recovery_ritual") as PremiumPromptContext["recovery_ritual"]) ?? null,
      data_sources: dataSources
        ? {
            form: true,
            whoop: dataSources.whoop ? { days: dataSources.whoop.days } : undefined,
            apple_health: dataSources.apple_health
              ? { days: dataSources.apple_health.days }
              : undefined,
          }
        : undefined,
    });

    // Legacy bandings kept for PDF + downstream (PDF uses simple 0–100 bands).
    const bmi = result.metabolic.bmi;
    const bmiCategory = result.metabolic.bmi_category;
    const activityScore = result.activity.activity_score_0_100;
    const activityBand = demoBand(activityScore);
    const totalMet = result.activity.total_met_minutes_week;
    const sleepScore = result.sleep.sleep_score_0_100;
    const sleepBand = demoBand(sleepScore);
    const vo2ScoreNum = result.vo2max.fitness_score_0_100;
    const vo2Band = demoBand(vo2ScoreNum);
    const vo2Estimated = result.vo2max.vo2max_estimated;
    const metabolicScore = result.metabolic.metabolic_score_0_100;
    const metabolicBand = demoBand(metabolicScore);
    const stressScore = result.stress.stress_score_0_100;
    const stressBand = demoBand(stressScore);
    const overallScore = result.overall_score_0_100;
    const overallBand = result.overall_band;

    // 4. Call Claude. No API key → fail with 503 instead of substituting a
    // German-only deterministic stub.
    if (!anthropicConfigured()) {
      console.error("[report/generate] ANTHROPIC_API_KEY missing/invalid — refusing to substitute stub");
      throw new Error("ai_unavailable: missing API key");
    }
    let report: PdfReportContent;
    {
      const anthropic = getAnthropic();
      const message = await callAnthropicWithRetry(anthropic, {
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        system: systemPrompt,
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
    }

    // 4b. Build heroData from wearable metrics (for PDF cover stamp).
    let heroData: PdfHeroData | undefined;
    if (pdfWearableRows && dataSources) {
      const heroSources: Array<{ label: string }> = [];
      if (dataSources.whoop) heroSources.push({ label: "WHOOP" });
      if (dataSources.apple_health) heroSources.push({ label: "Apple Health" });
      if (dataSources.form) {
        const formLabel: Record<Locale, string> = {
          de: "Fragebogen",
          en: "Questionnaire",
          it: "Questionario",
          tr: "Anket",
        };
        heroSources.push({ label: formLabel[locale] ?? "Questionnaire" });
      }

      // Estimate datapoints: sleep(4) + activity(3) + recovery(3) + vo2(1) + body(3) per day/entry
      let dp = 0;
      const days = dataSources.whoop?.days ?? dataSources.apple_health?.days ?? 0;
      if (pdfWearableRows.sleep) dp += days * 4;
      if (pdfWearableRows.activity) dp += days * 3;
      if (pdfWearableRows.stress) dp += days * 3;
      if (pdfWearableRows.vo2max) dp += 1;
      if (pdfWearableRows.metabolic) dp += 3;

      const multiSource = heroSources.length >= 2;
      const quality_level: PdfHeroData["quality_level"] =
        multiSource || dp >= 200              ? "excellent" :
        dp >= 100   || days >= 14             ? "strong" :
        dp > 0      || heroSources.length > 0 ? "good" : "secured";

      heroData = { sources: heroSources, quality_level, total_datapoints: dp };
    }

    // 4c. Run premium AI calls in parallel (executive_findings, cross_insights, action_plan).
    //     All are best-effort — failures silently leave the fields undefined.
    if (anthropicConfigured() && assessmentId) {
      const anthropic = getAnthropic();
      const scoresObj = { activity: activityScore, sleep: sleepScore, vo2max: vo2ScoreNum, metabolic: metabolicScore, stress: stressScore };

      // Sub-calls hatten vorher nur Scores + Alter/Geschlecht — Claude konnte
      // keine konkreten User-Werte zitieren, also blieb der Output generisch.
      // Wir reichen denselben Kontext durch den `buildPremiumUserPrompt` bekommt.
      const subCtx = {
        sleep_duration_h: reconstructed.sleep.duration_hours,
        sleep_quality:
          SLEEP_QUALITY_LABEL[locale][reconstructed.sleep.quality] ??
          SLEEP_QUALITY_LABEL[locale].mittel,
        wakeups:
          WAKEUP_LABEL[locale][reconstructed.sleep.wakeups] ??
          WAKEUP_LABEL[locale].selten,
        morning_recovery_1_10: reconstructed.sleep.recovery_1_10,
        stress_1_10: reconstructed.stress.stress_level_1_10,
        training_days: trainingDays,
        training_intensity: trainingIntensityLabel(result, locale),
        sitting_h: reconstructed.metabolic.sitting_hours,
        standing_h: standingHours,
        daily_steps: num("schrittzahl", 0),
        meals: reconstructed.metabolic.meals_per_day,
        water_l: reconstructed.metabolic.water_litres,
        fruit_veg:
          FRUIT_VEG_LABEL[locale][reconstructed.metabolic.fruit_veg] ??
          FRUIT_VEG_LABEL[locale].moderate,
        screen_time_before_sleep: respMap.get("screen_time_before_sleep") ?? FALLBACK_NOT_SPECIFIED[locale],
        main_goal: respMap.get("main_goal") ?? "feel_better",
        time_budget: respMap.get("time_budget") ?? "moderate",
        experience_level: respMap.get("experience_level") ?? "intermediate",
        nutrition_painpoint: respMap.get("nutrition_painpoint") ?? FALLBACK_NOT_SPECIFIED[locale],
        stress_source: respMap.get("stress_source") ?? FALLBACK_NOT_SPECIFIED[locale],
        recovery_ritual: respMap.get("recovery_ritual") ?? FALLBACK_NOT_SPECIFIED[locale],
      };
      const rawContextBlock = `
User profile: age ${user.age}, gender ${user.gender}, BMI ${bmi}
Main goal: ${subCtx.main_goal}
Time budget: ${subCtx.time_budget}
Experience level: ${subCtx.experience_level}
Nutrition painpoint: ${subCtx.nutrition_painpoint}
Main stress source: ${subCtx.stress_source}
Favorite recovery ritual: ${subCtx.recovery_ritual}
Raw inputs (CITE AT LEAST ONE NUMBER VERBATIM in each finding/insight/goal):
- Sleep: ${subCtx.sleep_duration_h}h / quality ${subCtx.sleep_quality} / wakeups ${subCtx.wakeups} / recovery ${subCtx.morning_recovery_1_10}/10 / screen-cutoff ${subCtx.screen_time_before_sleep}
- Stress: ${subCtx.stress_1_10}/10 (source: ${subCtx.stress_source})
- Activity: ${subCtx.training_days} days/wk (${subCtx.training_intensity}), ${subCtx.sitting_h}h sitting, ${subCtx.standing_h}h standing, ${subCtx.daily_steps} steps/day
- Nutrition: ${subCtx.meals} meals/day, ${subCtx.water_l}L water, ${subCtx.fruit_veg} fruit/veg (painpoint: ${subCtx.nutrition_painpoint})

When the user has a specific nutrition_painpoint or stress_source, the related finding/insight/goal MUST name that painpoint/source explicitly (not generic "improve nutrition" — instead "address your evening cravings by…").`;

      const localeDirective =
        locale === "de" ? 'Language: German, du-Form.' :
        locale === "it" ? 'Lingua: Italiano, forma "tu".' :
        locale === "tr" ? 'Dil: Türkçe, samimi "sen" hitabı (resmi "siz" değil).' :
        "Language: English, second person.";

      // If goal = non-performance AND beginner/restart AND minimal/moderate time →
      // force the action plan to be lifestyle-goals-only (no training goals).
      const lifestyleOnly =
        subCtx.main_goal !== "performance" &&
        (subCtx.experience_level === "beginner" || subCtx.experience_level === "restart") &&
        (subCtx.time_budget === "minimal" || subCtx.time_budget === "moderate");

      const buildFindingsPrompt = () => `You are generating 3 executive performance findings for a fitness report.
Scores: ${JSON.stringify(scoresObj)}
${rawContextBlock}

${localeDirective}

Return ONLY valid JSON array with exactly 3 objects, no markdown:
[{"type":"weakness","headline":"...","body":"...","related_dimension":"..."},
 {"type":"strength","headline":"...","body":"...","related_dimension":"..."},
 {"type":"connection","headline":"...","body":"...","related_dimension":"..."}]
Each headline ≤8 words. Body ≤60 words AND must reference at least one raw user value verbatim (e.g. "weil du 6.4 h schläfst..."). Generic advice ("reduziere Stress", "schlafe besser") forbidden.`;

      const buildInsightsPrompt = () => `Generate 2-3 cross-dimension performance insights for this athlete.
Scores: ${JSON.stringify(scoresObj)}
${rawContextBlock}

${localeDirective}

Return ONLY valid JSON array, no markdown:
[{"dimension_a":"sleep","dimension_b":"stress","headline":"...","body":"..."}]
Body ≤50 words each AND must cite at least one raw value from the user data. Only include pairs with meaningful interaction. Generic "X affects Y"-phrases forbidden unless backed by a specific user number.`;

      const buildPlanPrompt = () => `Generate a 30-day action plan with exactly 3 goals for this athlete.
Scores: ${JSON.stringify(scoresObj)}
${rawContextBlock}

MANDATORY rules:
- Focus on the 3 lowest-scored dimensions (unless overridden by lifestyle-only rule below)
- Each goal's headline AND current_value MUST reference a verbatim number from the raw user data above (e.g. current_value "6.4h sleep")
- Each week_milestones array MUST contain exactly 4 objects — never strings, never empty
- Each milestone object: {"week":"Week 1","task":"<concrete action max 70 chars>","milestone":"<measurable target>"}
- Respect time_budget: if "minimal" → NEVER recommend sessions >15 min. If "moderate" → max 30-45 min sessions.
- Respect experience_level: if "beginner"/"restart" → NEVER recommend >3 training sessions/wk.
${
  lifestyleOnly
    ? "- LIFESTYLE-ONLY MODE ACTIVE: user goal is not performance AND experience is beginner/restart AND time is limited. ALL 3 goals MUST be lifestyle goals (sleep, stress, nutrition, daily habits) — ZERO training-volume goals. No \"train 3x/week\" headlines."
    : ""
}
${
  locale === "de"
    ? '- Language: German, du-Form. Week labels: "KW 1", "KW 2", "KW 3", "KW 4"'
    : locale === "it"
    ? '- Language: Italian, tu-form. Week labels: "Settimana 1", "Settimana 2", "Settimana 3", "Settimana 4"'
    : locale === "tr"
    ? '- Language: Turkish, informal "sen". Week labels: "1. Hafta", "2. Hafta", "3. Hafta", "4. Hafta"'
    : '- Language: English, second person. Week labels: "Week 1", "Week 2", "Week 3", "Week 4"'
}

Return ONLY valid JSON array, no markdown:
[{"headline":"...","current_value":"...","target_value":"...","delta_pct":15,"metric_source":"...",
  "week_milestones":[
    {"week":"KW 1","task":"specific measurable action","milestone":"intermediate target"},
    {"week":"KW 2","task":"specific measurable action","milestone":"intermediate target"},
    {"week":"KW 3","task":"specific measurable action","milestone":"intermediate target"},
    {"week":"KW 4","task":"final push action","milestone":"goal reached"}
  ]}]`;

      const [findingsRes, insightsRes, planRes] = await Promise.allSettled<Anthropic.Message>([
        callAnthropicWithRetry(anthropic, { model: "claude-haiku-4-5-20251001", max_tokens: 1200, messages: [{ role: "user", content: buildFindingsPrompt() }] }) as Promise<Anthropic.Message>,
        callAnthropicWithRetry(anthropic, { model: "claude-haiku-4-5-20251001", max_tokens: 800,  messages: [{ role: "user", content: buildInsightsPrompt() }] }) as Promise<Anthropic.Message>,
        callAnthropicWithRetry(anthropic, { model: "claude-haiku-4-5-20251001", max_tokens: 1200, messages: [{ role: "user", content: buildPlanPrompt() }] }) as Promise<Anthropic.Message>,
      ]);

      const parseJson = (res: PromiseSettledResult<Anthropic.Message>) => {
        if (res.status !== "fulfilled") return null;
        const c = res.value.content[0];
        if (c.type !== "text") return null;
        try {
          const cleaned = c.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
          return JSON.parse(cleaned);
        } catch { return null; }
      };

      const findings = parseJson(findingsRes);
      if (Array.isArray(findings)) report.executive_findings = findings;

      const insights = parseJson(insightsRes);
      if (Array.isArray(insights)) report.cross_insights = insights;

      const plan = parseJson(planRes);
      if (Array.isArray(plan)) report.action_plan = plan;
    }

    // 4. Generate PDF (pdf-lib — pure JS, no native deps, works on Vercel).
    let pdfBuffer: Uint8Array | null = null;
    let downloadUrl: string | null = null;

    try {
      pdfBuffer = await generatePDF(
        report,
        {
          sleep: { score: sleepScore, band: sleepBand },
          recovery: {
            score: result.recovery.recovery_score_0_100,
            band: result.recovery.recovery_band,
          },
          activity: { score: activityScore, band: activityBand },
          metabolic: { score: metabolicScore, band: metabolicBand },
          stress: { score: stressScore, band: stressBand },
          vo2max: {
            score: vo2ScoreNum,
            band: vo2Band,
            estimated: vo2Estimated,
          },
          overall: { score: overallScore, band: overallBand },
          total_met: totalMet,
          sleep_duration_hours: sleepDuration,
          sitting_hours: result.metabolic.sitting_hours,
          training_days: trainingDays,
        },
        {
          email: user.email,
          age: user.age,
          gender: user.gender,
          bmi,
          bmi_category: bmiCategory,
        },
        locale,
        pdfWearableRows,
        heroData,
      );
    } catch (pdfErr) {
      const pdfErrMsg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
      console.warn("[report/generate] PDF generation failed:", pdfErrMsg);
      if (jobId) {
        await supabase
          .from("report_jobs")
          .update({ error_message: `PDF: ${pdfErrMsg.slice(0, 500)}` })
          .eq("id", jobId);
      }
    }

    // 5. Store PDF — try Supabase Storage, then local fs, then base64 data URL.
    //    downloadUrl is always set if pdfBuffer exists.
    if (pdfBuffer) {
      const fileName = `btb-report-${assessmentId}.pdf`;
      const storagePath = `${assessmentId}/${fileName}`;

      try {
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (uploadErr) throw uploadErr;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
        downloadUrl = `${appUrl}/api/report/download/${assessmentId}`;
      } catch (storageErr) {
        const storageMsg = storageErr instanceof Error ? storageErr.message : String(storageErr);
        console.warn(`[report/generate] Supabase Storage failed (${storageMsg}) — trying fs fallback`);
        try {
          const publicDir = path.join(process.cwd(), "public", "test-reports");
          await mkdir(publicDir, { recursive: true });
          await writeFile(path.join(publicDir, fileName), Buffer.from(pdfBuffer));
          downloadUrl = `${req.nextUrl.origin}/test-reports/${fileName}`;
        } catch {
          // Vercel read-only filesystem — embed as base64 so the browser can
          // open the PDF immediately without any external storage dependency.
          console.warn("[report/generate] fs write failed — using base64 data URL");
          downloadUrl = `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString("base64")}`;
        }
      }
    }

    // 6. Persist artifact reference (only if PDF was generated).
    if (downloadUrl) {
      await supabase.from("report_artifacts").insert({
        assessment_id: assessmentId,
        file_url: downloadUrl,
        file_type: "pdf",
      });
    }

    // 7. Send email via Resend (skipped if not configured or no PDF).
    if (resendConfigured() && downloadUrl) {
      try {
        await sendReportEmail(user.email, downloadUrl, {
          overall: overallScore,
          activity: activityScore,
          sleep: sleepScore,
          vo2max: vo2ScoreNum,
          metabolic: metabolicScore,
          stress: stressScore,
        }, locale);
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
    const { code, status } = classifyError(err);
    return NextResponse.json({ error: "ai_unavailable", code }, { status });
  }
}

function classifyError(err: unknown): { code: string; status: number } {
  if (err instanceof Error && err.message.startsWith("ai_unavailable:")) {
    return { code: "missing_api_key", status: 503 };
  }
  if (err instanceof Anthropic.APIError) {
    const body = typeof err.message === "string" ? err.message : "";
    if (/credit balance|billing|insufficient_quota/i.test(body)) {
      return { code: "provider_billing", status: 503 };
    }
    if (err.status === 429 || /rate_limit/i.test(body)) {
      return { code: "provider_rate_limit", status: 503 };
    }
    if (err.status === 529 || /overloaded/i.test(body)) {
      return { code: "provider_overloaded", status: 503 };
    }
    return { code: "provider_error", status: 503 };
  }
  return { code: "internal", status: 500 };
}
