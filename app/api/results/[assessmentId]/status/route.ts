// Lightweight pipeline-status endpoint.
//
// /analyse uses this to poll while the autonomous server-side pipeline
// runs. Returns one of:
//   - queued   — assessment exists, pipeline not started yet
//   - running  — main_report or plans still in progress
//   - ready    — main_report + all 4 plans ready in Storage AND email_sent_at set
//   - failed   — report_jobs.status === "failed"
//
// Includes a coarse progress percentage (0-100) so the loading UI can
// show meaningful motion. Counted by checking which of the 5 PDFs are
// already "ready" plus whether the email has been sent.
//
// Response is intentionally minimal — meant to be polled every 5s. No
// heavy joins. ~2 DB reads per call (report_jobs row + 5 status rows
// fetched in one IN-query).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 10;

type PipelineStatus = "queued" | "running" | "ready" | "failed";

interface StatusResponse {
  status: PipelineStatus;
  progress: number;
  detail?: {
    main_report_ready: boolean;
    plans_ready_count: number;
    email_sent: boolean;
  };
  error?: string;
}

const PLAN_PDF_TYPES = [
  "plan_activity",
  "plan_metabolic",
  "plan_recovery",
  "plan_stress",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
): Promise<NextResponse<StatusResponse>> {
  const { assessmentId } = await params;
  if (!assessmentId) {
    return NextResponse.json(
      { status: "failed", progress: 0, error: "Missing assessmentId" },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof getSupabaseServiceClient>;
  try {
    supabase = getSupabaseServiceClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "failed", progress: 0, error: `Supabase init: ${message}` },
      { status: 500 },
    );
  }

  // 1. report_jobs row — drives the failed/processing/completed signal.
  const { data: jobRow, error: jobErr } = await supabase
    .from("report_jobs")
    .select("status, email_sent_at, finished_at, error_message")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (jobErr) {
    return NextResponse.json(
      { status: "failed", progress: 0, error: jobErr.message },
      { status: 500 },
    );
  }
  if (!jobRow) {
    // No report_job yet — assessment may exist but pipeline not started.
    return NextResponse.json(
      { status: "queued", progress: 0 },
      { status: 200 },
    );
  }

  if (jobRow.status === "failed") {
    return NextResponse.json(
      {
        status: "failed",
        progress: 0,
        error: (jobRow.error_message as string | null) ?? "report_jobs.status=failed",
      },
      { status: 200 },
    );
  }

  // 2. PDF generation status rows for main_report + 4 plans.
  const { data: pdfRows } = await supabase
    .from("pdf_generation_status")
    .select("pdf_type, status")
    .eq("assessment_id", assessmentId);

  const readyByType: Record<string, boolean> = {};
  for (const row of pdfRows ?? []) {
    readyByType[row.pdf_type as string] =
      (row.status as string | null) === "ready";
  }

  const mainReady = readyByType["main_report"] === true;
  const plansReadyCount = PLAN_PDF_TYPES.filter((t) => readyByType[t]).length;
  const emailSent = jobRow.email_sent_at != null;

  // Progress weighting:
  //   main_report  — 40%
  //   each plan    — 12.5% × 4 = 50%
  //   email sent   — 10%
  // Total: 100%
  let progress = 0;
  if (mainReady) progress += 40;
  progress += plansReadyCount * 12.5;
  if (emailSent) progress += 10;
  progress = Math.min(100, Math.round(progress));

  const fullyReady = mainReady && plansReadyCount === 4 && emailSent;
  let pipelineStatus: PipelineStatus;
  if (fullyReady) {
    pipelineStatus = "ready";
  } else if (
    jobRow.status === "completed" &&
    !emailSent &&
    Date.now() - new Date(jobRow.finished_at as string | Date).getTime() > 120_000
  ) {
    // Edge case: report_jobs marked completed >2min ago but email still
    // missing → likely a stuck dispatch. Surface as "running" (not ready)
    // so frontend keeps polling; the cron-backstop will re-fire dispatch
    // within 60s.
    pipelineStatus = "running";
  } else {
    pipelineStatus = "running";
  }

  return NextResponse.json({
    status: pipelineStatus,
    progress,
    detail: {
      main_report_ready: mainReady,
      plans_ready_count: plansReadyCount,
      email_sent: emailSent,
    },
  });
}
