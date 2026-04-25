// Fire-and-forget PDF pre-generation trigger.
//
// Called by the results page right after assessment completes. Returns in <1 s.
// For plan PDFs that already have base64 from the frontend: decodes + uploads
// to Supabase Storage immediately (synchronously, fast).
// For the main_report: fires a background worker via a non-awaited fetch.

import { NextRequest, NextResponse } from "next/server";
import { uploadPlanPdf, processMainReport, type PlanPdfType } from "@/lib/pdf/background-generator";
import type { Locale } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PLAN_TYPES: PlanPdfType[] = [
  "plan_activity",
  "plan_metabolic",
  "plan_recovery",
  "plan_stress",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      assessment_id: string;
      locale: string;
      plan_pdfs?: Partial<Record<PlanPdfType, string>>;
    };

    const { assessment_id, locale, plan_pdfs = {} } = body;

    if (!assessment_id || !locale) {
      return NextResponse.json(
        { error: "Missing assessment_id or locale" },
        { status: 400 },
      );
    }

    const l = locale as Locale;

    // Kick off everything in parallel — do NOT await; return immediately.
    void (async () => {
      const tasks: Promise<unknown>[] = [];

      // ── main_report: verify Storage + mark ready ────────────────────────
      tasks.push(processMainReport(assessment_id, l).catch((err) => {
        console.error("[prepare-pdfs] main_report:", err);
      }));

      // ── plan PDFs ────────────────────────────────────────────────────────
      // Only personalised AI-generated PDFs (uploaded by the frontend) are
      // persisted to Storage. If the frontend did not provide base64 (e.g.
      // the AI call failed during /analyse), we skip the upload entirely
      // and leave Storage empty for that plan. The plan page falls back to
      // on-demand rendering via /api/plan/pdf when Storage is empty.
      for (const pdfType of PLAN_TYPES) {
        const base64 = plan_pdfs[pdfType];

        if (!base64) {
          console.warn(`[prepare-pdfs] ${pdfType}: no base64 provided — skipping upload (on-demand fallback applies)`);
          continue;
        }

        tasks.push(
          uploadPlanPdf(assessment_id, pdfType, l, base64).catch((err) => {
            console.error(`[prepare-pdfs] ${pdfType} upload:`, err);
          }),
        );
      }

      await Promise.allSettled(tasks);
    })();

    return NextResponse.json({ queued: true });
  } catch (err) {
    console.error("[prepare-pdfs] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
