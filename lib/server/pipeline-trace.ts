// Pipeline-trace helper — write per-stage rows to the pipeline_trace
// table so we can diagnose autonomous server-side runs without
// Vercel-CLI access. Read-back via /api/admin/pipeline-trace/[id].
//
// Defensive on missing-table: if supabase/add_pipeline_trace.sql has
// not been applied, writeTrace() logs a warning and returns null
// without throwing. Production must never block on observability.

import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type PipelineStage =
  // /api/assessment lifecycle
  | "submit_received"
  | "trigger_dispatched"
  | "trigger_failed"
  // /api/report/generate lifecycle
  | "main_report_started"
  | "main_report_skipped_cached"
  | "main_report_completed"
  | "main_report_failed"
  // plans (after()-block of /api/report/generate)
  | "plans_wait_started"
  | "plans_wait_done"
  | "plan_fallback_started"
  | "plan_fallback_completed"
  | "plan_fallback_failed"
  // email
  | "email_dispatch_started"
  | "email_sent"
  | "email_skipped_lock"
  | "email_failed"
  // cron-backstop
  | "cron_picked_up"
  | "cron_re_triggered"
  // generic error fence
  | "pipeline_error";

export interface PipelineTraceRow {
  id: string;
  assessment_id: string;
  stage: PipelineStage | string;
  detail: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}

interface WriteTraceArgs {
  assessmentId: string;
  stage: PipelineStage;
  detail?: Record<string, unknown>;
  durationMs?: number;
}

function isMissingTableError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /relation .*pipeline_trace.* does not exist|could not find .*pipeline_trace|table .* pipeline_trace.*not found/i.test(
    message,
  );
}

/**
 * Append one row to pipeline_trace. Best-effort: never throws; logs a
 * warning if the table is missing or the insert fails. Returns the
 * inserted row's id when successful, null otherwise.
 */
export async function writeTrace(args: WriteTraceArgs): Promise<string | null> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("pipeline_trace")
      .insert({
        assessment_id: args.assessmentId,
        stage: args.stage,
        detail: args.detail ?? null,
        duration_ms: args.durationMs ?? null,
      })
      .select("id")
      .single();

    if (error) {
      if (isMissingTableError(error.message)) {
        console.warn(
          "[pipeline-trace] table missing — apply " +
            "supabase/add_pipeline_trace.sql to enable diagnosis. " +
            "Skipping write (graceful fallback).",
        );
        return null;
      }
      console.error(
        `[pipeline-trace] insert failed for ${args.stage}:`,
        error.message,
      );
      return null;
    }

    return (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.error("[pipeline-trace] unexpected error:", err);
    return null;
  }
}

/**
 * Read all trace rows for an assessment, ordered chronologically.
 * Used by the diagnostic endpoint /api/admin/pipeline-trace/[id].
 */
export async function readTrace(
  assessmentId: string,
): Promise<PipelineTraceRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("pipeline_trace")
    .select("id, assessment_id, stage, detail, duration_ms, created_at")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) {
      console.warn(
        "[pipeline-trace] table missing during read — apply migration",
      );
      return [];
    }
    console.error("[pipeline-trace] read failed:", error.message);
    return [];
  }

  return (data ?? []) as PipelineTraceRow[];
}

// Exported for unit testing the predicate directly.
export const _internal = { isMissingTableError };
