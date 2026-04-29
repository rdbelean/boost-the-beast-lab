// Fire-and-forget PDF pre-generation trigger.
//
// Called by the results page right after assessment completes. Returns in <1 s.
// For plan PDFs that already have base64 from the frontend: decodes + uploads
// to Supabase Storage immediately (synchronously, fast).
// For the main_report: fires a background worker via a non-awaited fetch.
// Once everything is uploaded, dispatches the report email (idempotently).

import { NextRequest, NextResponse } from "next/server";
import {
  uploadPlanPdf,
  processMainReport,
  getEmailSignedUrl,
  type PlanPdfType,
} from "@/lib/pdf/background-generator";
import { getStatus, type PdfType } from "@/lib/pdf/status";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { loadReportContext } from "@/lib/reports/report-context";
import { downloadStoragePdf } from "@/lib/pdf/fetchPdfBytes";
import {
  sendReportEmail,
  type PlanAttachment,
  type PlanType,
  type ScoreSummary,
} from "@/lib/email/sendReport";
import type { Locale } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PLAN_TYPES: PlanPdfType[] = [
  "plan_activity",
  "plan_metabolic",
  "plan_recovery",
  "plan_stress",
];

const PLAN_TYPE_TO_EMAIL_TYPE: Record<PlanPdfType, PlanType> = {
  plan_activity: "activity",
  plan_metabolic: "metabolic",
  plan_recovery: "recovery",
  plan_stress: "stress",
};

function resendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && key.length > 8;
}

// Acquires a per-assessment send lock by atomically setting email_sent_at.
// Returns true exactly once per assessment; subsequent calls return false.
async function acquireEmailLock(assessmentId: string): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("report_jobs")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("assessment_id", assessmentId)
    .is("email_sent_at", null)
    .select("id");
  if (error) {
    console.error("[prepare-pdfs] acquireEmailLock failed:", error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

async function releaseEmailLock(assessmentId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("report_jobs")
    .update({ email_sent_at: null })
    .eq("assessment_id", assessmentId);
}

async function dispatchReportEmail(
  assessmentId: string,
  locale: Locale,
): Promise<void> {
  if (!resendConfigured()) {
    console.warn("[prepare-pdfs] RESEND_API_KEY not configured — skipping email");
    return;
  }

  const acquired = await acquireEmailLock(assessmentId);
  if (!acquired) {
    console.log(`[prepare-pdfs] email already sent for ${assessmentId} — skipping`);
    return;
  }

  let didSend = false;
  try {
    // Main report must be ready — without it we never send.
    const mainStatus = await getStatus(assessmentId, "main_report" as PdfType, locale);
    if (mainStatus?.status !== "ready" || !mainStatus.storage_path) {
      console.warn(`[prepare-pdfs] main_report not ready for ${assessmentId} — releasing lock`);
      await releaseEmailLock(assessmentId);
      return;
    }

    const ctx = await loadReportContext(assessmentId);
    if (!ctx.ok) {
      console.error(`[prepare-pdfs] loadReportContext failed: ${ctx.error.message}`);
      await releaseEmailLock(assessmentId);
      return;
    }
    const email = ctx.context.user.email;
    if (!email) {
      console.warn(`[prepare-pdfs] no email on file for ${assessmentId}`);
      await releaseEmailLock(assessmentId);
      return;
    }

    const mainBuffer = await downloadStoragePdf("Reports", mainStatus.storage_path);
    if (!mainBuffer) {
      console.warn(`[prepare-pdfs] main_report bytes missing for ${assessmentId}`);
      await releaseEmailLock(assessmentId);
      return;
    }

    const planAttachments: PlanAttachment[] = await Promise.all(
      PLAN_TYPES.map(async (pdfType) => {
        const emailType = PLAN_TYPE_TO_EMAIL_TYPE[pdfType];
        try {
          const row = await getStatus(assessmentId, pdfType, locale);
          if (row?.status === "ready" && row.storage_path) {
            const buf = await downloadStoragePdf("report-pdfs", row.storage_path);
            if (buf) return { type: emailType, buffer: buf, fallbackUrl: null };
          }
          // Plan not ready or buffer missing — emit a fallback link the
          // user can click later. Best-effort signed URL; if signing
          // fails we still send the email with that card showing
          // "still being prepared" without a link.
          let fallbackUrl: string | null = null;
          if (row?.status === "ready" && row.storage_path) {
            try {
              fallbackUrl = await getEmailSignedUrl(pdfType, row.storage_path);
            } catch (err) {
              console.error(`[prepare-pdfs] signed url failed for ${pdfType}:`, err);
            }
          }
          return { type: emailType, buffer: null, fallbackUrl };
        } catch (err) {
          console.error(`[prepare-pdfs] plan attachment ${pdfType} failed:`, err);
          return { type: emailType, buffer: null, fallbackUrl: null };
        }
      }),
    );

    const result = ctx.context.scoring.result as {
      overall_score_0_100?: number;
      activity?: { activity_score_0_100?: number };
      sleep?: { sleep_score_0_100?: number };
      vo2max?: { fitness_score_0_100?: number };
      metabolic?: { metabolic_score_0_100?: number };
      stress?: { stress_score_0_100?: number };
    };
    const scores: ScoreSummary = {
      overall: Math.round(result.overall_score_0_100 ?? 0),
      activity: Math.round(result.activity?.activity_score_0_100 ?? 0),
      sleep: Math.round(result.sleep?.sleep_score_0_100 ?? 0),
      vo2max: Math.round(result.vo2max?.fitness_score_0_100 ?? 0),
      metabolic: Math.round(result.metabolic?.metabolic_score_0_100 ?? 0),
      stress: Math.round(result.stress?.stress_score_0_100 ?? 0),
    };

    await sendReportEmail({
      email,
      firstName: ctx.context.user.first_name,
      scores,
      locale,
      assessmentId,
      mainReportBuffer: mainBuffer,
      planAttachments,
    });

    didSend = true;
    console.log(`[prepare-pdfs] email dispatched for ${assessmentId}`);
  } catch (err) {
    console.error(`[prepare-pdfs] dispatchReportEmail failed:`, err);
  } finally {
    if (!didSend) {
      // Roll back the lock so a future /prepare-pdfs call (e.g. when the
      // user re-opens /results?id=...) gets a fresh attempt.
      await releaseEmailLock(assessmentId);
    }
  }
}

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

      // Once uploads have settled, dispatch the email (idempotent — the
      // helper bails out if it already ran for this assessment).
      await dispatchReportEmail(assessment_id, l);
    })();

    return NextResponse.json({ queued: true });
  } catch (err) {
    console.error("[prepare-pdfs] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
