// Recovery endpoint for /results and /plans/[type].
//
// Both pages historically read the entire report payload from
// sessionStorage["btb_results"], which is wiped during /analyse submit.
// If the user closes the tab between submit and the next page load,
// the data is gone forever and the pages render the "Keine Ergebnisse"
// error with no recovery path.
//
// This endpoint reconstructs the same shape from the database so a
// reloaded page can rehydrate via /results?id={assessmentId}. The
// frontend keeps using sessionStorage as a fast path; this is the
// fallback when the cache is missing or stale.

import { NextRequest, NextResponse } from "next/server";
import { loadReportContext } from "@/lib/reports/report-context";
import { getStatus, type PdfType } from "@/lib/pdf/status";

export const runtime = "nodejs";
export const maxDuration = 15;

const PLAN_TYPES: { type: "activity" | "metabolic" | "recovery" | "stress"; pdfType: PdfType }[] = [
  { type: "activity", pdfType: "plan_activity" },
  { type: "metabolic", pdfType: "plan_metabolic" },
  { type: "recovery", pdfType: "plan_recovery" },
  { type: "stress", pdfType: "plan_stress" },
];

// TODO: lock down auth — today /api/report/download/[id] also accepts
// any assessmentId without an auth gate, so this endpoint is consistent
// with that trust model. Tighten both together when account linkage
// is mandatory.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const { assessmentId } = await params;
  if (!assessmentId) {
    return NextResponse.json({ error: "Missing assessmentId" }, { status: 400 });
  }

  const ctx = await loadReportContext(assessmentId);
  if (!ctx.ok) {
    const status = ctx.error.code === "no_assessment" || ctx.error.code === "no_user" ? 404 : 500;
    return NextResponse.json({ error: ctx.error.message, code: ctx.error.code }, { status });
  }

  const locale = ctx.context.meta.locale;
  const scores = ctx.context.scoring.result;

  // Each plan's status. Returning the bool is enough for the recovery
  // path — the existing /plans/[type] page falls back to /api/plan/generate
  // when no cached blocks exist, which works as long as we hand over the
  // assessmentId. URLs come in Phase 2 once long-lived signed URLs land.
  const planStatuses = await Promise.all(
    PLAN_TYPES.map(async ({ type, pdfType }) => {
      try {
        const row = await getStatus(assessmentId, pdfType, locale);
        return { type, ready: row?.status === "ready" };
      } catch {
        return { type, ready: false };
      }
    }),
  );

  return NextResponse.json({
    assessmentId,
    locale,
    scores,
    downloadUrl: `/api/report/download/${assessmentId}`,
    plans: Object.fromEntries(planStatuses.map((p) => [p.type, { ready: p.ready }])),
  });
}
