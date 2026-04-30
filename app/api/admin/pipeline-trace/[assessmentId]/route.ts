// Diagnostic endpoint for the autonomous server-side pipeline.
//
// Returns the chronological list of pipeline_trace rows for one
// assessment so we can pinpoint where a hung/failed run got stuck —
// without needing Vercel-CLI or Dashboard access.
//
// Usage:
//   GET /api/admin/pipeline-trace/<assessmentId>
//
// Auth: NONE in this phase. The path requires an exact assessmentId
// (UUID) to look up; treat it the same trust model as
// /api/report/download/[id] and /api/results/[id]. Tighten when account
// linkage becomes mandatory.
//
// Response shape:
//   {
//     assessmentId: string,
//     stages: Array<{ stage, detail, duration_ms, created_at }>,
//     summary: {
//       first_seen: string | null,
//       last_seen: string | null,
//       last_stage: string | null,
//       error_count: number,
//     },
//     migration_status?: "table_missing" — only when the trace table
//                                          isn't applied yet
//   }

import { NextRequest, NextResponse } from "next/server";
import { readTrace, type PipelineTraceRow } from "@/lib/server/pipeline-trace";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
): Promise<NextResponse> {
  const { assessmentId } = await params;
  if (!assessmentId) {
    return NextResponse.json(
      { error: "Missing assessmentId" },
      { status: 400 },
    );
  }

  const rows: PipelineTraceRow[] = await readTrace(assessmentId);

  // readTrace returns [] both for "no rows" AND "table missing". The
  // helper logs the table-missing case to console; this endpoint surfaces
  // an empty-but-OK response either way. Operators can verify via the
  // function logs whether the table exists.
  const errorCount = rows.filter((r) =>
    r.stage.includes("failed") || r.stage === "pipeline_error",
  ).length;

  return NextResponse.json({
    assessmentId,
    stages: rows.map((r) => ({
      stage: r.stage,
      detail: r.detail,
      duration_ms: r.duration_ms,
      created_at: r.created_at,
    })),
    summary: {
      first_seen: rows[0]?.created_at ?? null,
      last_seen: rows[rows.length - 1]?.created_at ?? null,
      last_stage: rows[rows.length - 1]?.stage ?? null,
      error_count: errorCount,
    },
  });
}
