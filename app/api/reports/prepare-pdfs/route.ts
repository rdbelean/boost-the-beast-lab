// PDF pre-generation + email dispatch trigger.
//
// Called by the results page right after assessment completes. Returns in <1 s.
// For plan PDFs that already have base64 from the frontend: decodes + uploads
// to Supabase Storage. For the main_report: verifies its Storage entry.
// Once everything is uploaded, dispatches the report email idempotently.
//
// IMPORTANT: the heavy work runs inside `after()` so Vercel keeps the lambda
// alive until it finishes. The previous `void (async () => ...)()` pattern
// got killed as soon as the HTTP response was sent — emails never went out
// in production.
//
// dispatchReportEmail + lock helpers live in lib/email/dispatch-report.ts so
// /api/report/generate can call them directly via after() as a server-side
// backup for the mobile-tab-switch case.

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  uploadPlanPdf,
  processMainReport,
  type PlanPdfType,
} from "@/lib/pdf/background-generator";
import { dispatchReportEmail } from "@/lib/email/dispatch-report";
import type { Locale } from "@/lib/supabase/types";

export const runtime = "nodejs";
// Bumped from 60s to give `after()` headroom: plan uploads (~10s) +
// downloadStoragePdf x5 (~5s) + Resend API (~3s) is ~20s typical, plus
// a buffer for cold-start and slow networks. Vercel Pro allows up to 300s.
export const maxDuration = 120;

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
    const providedPlanCount = Object.values(plan_pdfs).filter(Boolean).length;
    console.log(
      `[prepare-pdfs] queued id=${assessment_id} locale=${locale} provided_plan_pdfs=${providedPlanCount}`,
    );

    // Use Next.js after() so Vercel keeps the lambda alive until the
    // background work completes. The previous void-IIFE pattern got
    // killed as soon as the response was sent, so emails never landed.
    after(async () => {
      const tasks: Promise<unknown>[] = [];

      // ── main_report: verify Storage + mark ready ────────────────────────
      tasks.push(
        processMainReport(assessment_id, l).catch((err) => {
          console.error("[prepare-pdfs] main_report:", err);
        }),
      );

      // ── plan PDFs ────────────────────────────────────────────────────────
      // Only personalised AI-generated PDFs (uploaded by the frontend) are
      // persisted to Storage. If the frontend did not provide base64 (e.g.
      // the AI call failed during /analyse), we skip the upload entirely
      // and leave Storage empty for that plan. The plan page falls back to
      // on-demand rendering via /api/plan/pdf when Storage is empty.
      for (const pdfType of PLAN_TYPES) {
        const base64 = plan_pdfs[pdfType];
        if (!base64) {
          console.warn(
            `[prepare-pdfs] ${pdfType}: no base64 provided — skipping upload (on-demand fallback applies)`,
          );
          continue;
        }

        tasks.push(
          uploadPlanPdf(assessment_id, pdfType, l, base64).catch((err) => {
            console.error(`[prepare-pdfs] ${pdfType} upload:`, err);
          }),
        );
      }

      await Promise.allSettled(tasks);
      console.log(`[prepare-pdfs] uploads settled — dispatching email`);

      await dispatchReportEmail(assessment_id, l);
    });

    return NextResponse.json({ queued: true });
  } catch (err) {
    console.error("[prepare-pdfs] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
