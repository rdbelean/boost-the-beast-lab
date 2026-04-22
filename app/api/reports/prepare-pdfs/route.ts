// Fire-and-forget PDF pre-generation trigger.
//
// Called by the results page right after assessment completes. Returns in <1 s.
// For plan PDFs that already have base64 from the frontend: decodes + uploads
// to Supabase Storage immediately (synchronously, fast).
// For the main_report: fires a background worker via a non-awaited fetch.

import { NextRequest, NextResponse } from "next/server";
import { upsertStatus, type PdfType } from "@/lib/pdf/status";
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
      for (const pdfType of PLAN_TYPES) {
        const base64 = plan_pdfs[pdfType];

        if (base64) {
          // Frontend already generated the PDF — just upload it.
          tasks.push(
            uploadPlanPdf(assessment_id, pdfType, l, base64).catch((err) => {
              console.error(`[prepare-pdfs] ${pdfType} upload:`, err);
            }),
          );
        } else {
          // No base64 supplied — delegate to the background worker.
          const origin = req.nextUrl.origin;
          tasks.push(
            fetch(`${origin}/api/reports/generate-single-pdf`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assessment_id, pdf_type: pdfType, locale }),
            }).catch((err) => {
              console.error(`[prepare-pdfs] ${pdfType} worker:`, err);
            }),
          );

          // Mark as pending immediately so the client can poll.
          await upsertStatus(assessment_id, pdfType as PdfType, locale, "pending").catch(() => {});
        }
      }

      await Promise.allSettled(tasks);
    })();

    return NextResponse.json({ queued: true });
  } catch (err) {
    console.error("[prepare-pdfs] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
