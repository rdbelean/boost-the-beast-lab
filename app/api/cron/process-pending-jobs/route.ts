// Cron backstop for the autonomous server-side pipeline.
//
// Vercel-Cron triggers this endpoint every 60 seconds (configured in
// vercel.json). It scans report_jobs for "stuck" rows and re-fires the
// appropriate stage. Idempotent thanks to the existing locks:
//   - main_report regeneration: skipped if pdf_generation_status is
//     already "ready" (handled by /api/report/generate's flow).
//   - plan PDFs: uploadPlanPdf treats 409-already-exists as success.
//   - email: dispatchReportEmail's email_sent_at lock guarantees one
//     send per assessment.
//
// Two stuck-job categories:
//
//   A) Pipeline never finished — report_jobs.status = "processing" AND
//      created_at < NOW() - 5 min. Re-fire by calling
//      /api/report/generate (which has its own after()-block for plans
//      + email).
//
//   B) Pipeline finished but email never went out — report_jobs.status =
//      "completed" AND email_sent_at IS NULL AND finished_at <
//      NOW() - 5 min. Re-fire dispatchReportEmail directly.
//
// Auth: Vercel-Cron sends Authorization: Bearer <CRON_SECRET> when the
// CRON_SECRET env-var is configured. We verify that header. If
// CRON_SECRET is unset (e.g. dev), we additionally accept the
// `x-vercel-cron: 1` header that Vercel injects for cron-triggered
// requests.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { dispatchReportEmail } from "@/lib/email/dispatch-report";
import { writeTrace } from "@/lib/server/pipeline-trace";
import type { Locale } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const STUCK_PROCESSING_AGE_MS = 5 * 60 * 1000;       // 5 min
const STUCK_NO_EMAIL_AGE_MS = 5 * 60 * 1000;         // 5 min
const MAX_RETRIES_PER_RUN = 5;

interface CronStat {
  re_triggered_pipelines: number;
  re_dispatched_emails: number;
  errors: number;
  scanned: number;
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth === `Bearer ${cronSecret}`) return true;
  }
  // Vercel sets this header for cron-triggered invocations as a fallback.
  if (req.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

interface ReportJobRow {
  assessment_id: string;
  status: string | null;
  email_sent_at: string | null;
  finished_at: string | null;
  created_at: string | null;
}

async function fetchAssessmentLocale(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  assessmentId: string,
): Promise<Locale> {
  const { data } = await supabase
    .from("assessments")
    .select("locale")
    .eq("id", assessmentId)
    .single();
  const raw = (data as { locale?: string } | null)?.locale;
  if (raw === "en" || raw === "it" || raw === "tr") return raw;
  return "de";
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats: CronStat = {
    re_triggered_pipelines: 0,
    re_dispatched_emails: 0,
    errors: 0,
    scanned: 0,
  };

  let supabase: ReturnType<typeof getSupabaseServiceClient>;
  try {
    supabase = getSupabaseServiceClient();
  } catch (err) {
    return NextResponse.json(
      { error: `Supabase init: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  // ── Category A: stuck-processing report_jobs ───────────────────────────
  const stuckProcessingThreshold = new Date(
    Date.now() - STUCK_PROCESSING_AGE_MS,
  ).toISOString();
  const { data: stuckProcessing, error: errA } = await supabase
    .from("report_jobs")
    .select("assessment_id, status, email_sent_at, finished_at, created_at")
    .eq("status", "processing")
    .lt("created_at", stuckProcessingThreshold)
    .limit(MAX_RETRIES_PER_RUN);
  if (errA) {
    console.error("[cron] stuck-processing query failed:", errA.message);
    stats.errors += 1;
  }

  // ── Category B: completed but no email ─────────────────────────────────
  const stuckNoEmailThreshold = new Date(
    Date.now() - STUCK_NO_EMAIL_AGE_MS,
  ).toISOString();
  const { data: stuckNoEmail, error: errB } = await supabase
    .from("report_jobs")
    .select("assessment_id, status, email_sent_at, finished_at, created_at")
    .eq("status", "completed")
    .is("email_sent_at", null)
    .lt("finished_at", stuckNoEmailThreshold)
    .limit(MAX_RETRIES_PER_RUN);
  if (errB) {
    console.error("[cron] stuck-no-email query failed:", errB.message);
    stats.errors += 1;
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : req.nextUrl.origin;

  // Re-fire stuck pipelines (Category A).
  for (const row of (stuckProcessing as ReportJobRow[] | null) ?? []) {
    stats.scanned += 1;
    const assessmentId = row.assessment_id;
    const locale = await fetchAssessmentLocale(supabase, assessmentId);
    await writeTrace({
      assessmentId,
      stage: "cron_picked_up",
      detail: { reason: "stuck_processing", age_ms: Date.now() - new Date(row.created_at!).getTime() },
    });
    try {
      const res = await fetch(`${baseUrl}/api/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, locale }),
      });
      stats.re_triggered_pipelines += 1;
      await writeTrace({
        assessmentId,
        stage: "cron_re_triggered",
        detail: { httpStatus: res.status, reason: "stuck_processing" },
      });
    } catch (err) {
      stats.errors += 1;
      await writeTrace({
        assessmentId,
        stage: "cron_re_triggered",
        detail: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  // Re-dispatch emails for completed-but-unsent (Category B).
  for (const row of (stuckNoEmail as ReportJobRow[] | null) ?? []) {
    stats.scanned += 1;
    const assessmentId = row.assessment_id;
    const locale = await fetchAssessmentLocale(supabase, assessmentId);
    await writeTrace({
      assessmentId,
      stage: "cron_picked_up",
      detail: { reason: "no_email", age_ms: Date.now() - new Date(row.finished_at!).getTime() },
    });
    try {
      await dispatchReportEmail(assessmentId, locale);
      stats.re_dispatched_emails += 1;
      await writeTrace({
        assessmentId,
        stage: "cron_re_triggered",
        detail: { reason: "no_email", outcome: "dispatchReportEmail returned" },
      });
    } catch (err) {
      stats.errors += 1;
      await writeTrace({
        assessmentId,
        stage: "cron_re_triggered",
        detail: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    stats,
  });
}
