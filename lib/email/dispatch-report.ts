// Email dispatch — extracted from /api/reports/prepare-pdfs/route.ts so
// /api/report/generate can call it directly via after() as a server-side
// backup for the mobile-tab-switch case (frontend never reaches /results,
// no /api/reports/prepare-pdfs trigger, no email).
//
// The extracted logic is byte-equivalent to the prior in-route version.
// The DB-atomic lock on report_jobs.email_sent_at ensures exactly one
// email per assessment, regardless of how many callers fire in parallel.

import {
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

// Detects "column ... does not exist" Supabase errors. We see this on
// installs where the supabase/add_email_sent_at.sql migration hasn't run.
// Also matches PostgREST's "Could not find column" 400-response wording.
export function isMissingColumnError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /column .+ does not exist|could not find .* column|column .* email_sent_at/i.test(message);
}

export interface EmailLockResult {
  acquired: boolean;
  // True when the migration is missing — caller should send anyway, since
  // a "best-effort double-send" is better than zero emails.
  bypassMigrationMissing: boolean;
}

/**
 * Atomically claims the per-assessment send lock. Returns acquired=true
 * exactly once per assessment in normal operation. If the email_sent_at
 * column doesn't exist (migration not yet applied), returns
 * bypassMigrationMissing=true so the caller can still send (without
 * idempotency) — landing one email beats landing zero.
 */
export async function acquireEmailLock(assessmentId: string): Promise<EmailLockResult> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("report_jobs")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("assessment_id", assessmentId)
    .is("email_sent_at", null)
    .select("id");

  if (error) {
    if (isMissingColumnError(error.message)) {
      console.warn(
        "[email-dispatch] report_jobs.email_sent_at column missing — " +
          "supabase/add_email_sent_at.sql has not been applied. Sending " +
          "without idempotency lock as a best-effort fallback.",
      );
      return { acquired: false, bypassMigrationMissing: true };
    }
    console.error("[email-dispatch] acquireEmailLock failed:", error.message);
    return { acquired: false, bypassMigrationMissing: false };
  }
  return {
    acquired: Array.isArray(data) && data.length > 0,
    bypassMigrationMissing: false,
  };
}

export async function releaseEmailLock(assessmentId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("report_jobs")
    .update({ email_sent_at: null })
    .eq("assessment_id", assessmentId);
  if (error && !isMissingColumnError(error.message)) {
    console.error("[email-dispatch] releaseEmailLock failed:", error.message);
  }
}

/**
 * Sends the report email with main-report + 4 plan PDFs as attachments.
 * Idempotent via DB lock — second call for the same assessmentId is a
 * no-op log. If a plan PDF is missing in Storage, falls back to a signed
 * URL card in the email body. Email content is identical to the
 * prior in-route version.
 */
export async function dispatchReportEmail(
  assessmentId: string,
  locale: Locale,
): Promise<void> {
  console.log(`[email-dispatch] start id=${assessmentId} locale=${locale}`);

  if (!resendConfigured()) {
    console.warn(
      "[email-dispatch] RESEND_API_KEY not configured — skipping email. " +
        "Set RESEND_API_KEY in Vercel env vars to enable delivery.",
    );
    return;
  }

  const lock = await acquireEmailLock(assessmentId);
  if (!lock.acquired && !lock.bypassMigrationMissing) {
    console.log(
      `[email-dispatch] email already sent (or lock-error) for ${assessmentId} — skipping`,
    );
    return;
  }
  if (lock.bypassMigrationMissing) {
    console.log(
      `[email-dispatch] proceeding without idempotency lock for ${assessmentId}`,
    );
  } else {
    console.log(`[email-dispatch] lock acquired for ${assessmentId}`);
  }

  let didSend = false;
  try {
    // Main report must be ready — without it we never send.
    const mainStatus = await getStatus(assessmentId, "main_report" as PdfType, locale);
    console.log(
      `[email-dispatch] main_report status=${mainStatus?.status ?? "missing"} path=${mainStatus?.storage_path ?? "n/a"}`,
    );
    if (mainStatus?.status !== "ready" || !mainStatus.storage_path) {
      console.warn(
        `[email-dispatch] main_report not ready for ${assessmentId} — releasing lock + aborting`,
      );
      if (lock.acquired) await releaseEmailLock(assessmentId);
      return;
    }

    const ctx = await loadReportContext(assessmentId);
    if (!ctx.ok) {
      console.error(
        `[email-dispatch] loadReportContext failed: code=${ctx.error.code} msg=${ctx.error.message}`,
      );
      if (lock.acquired) await releaseEmailLock(assessmentId);
      return;
    }
    const email = ctx.context.user.email;
    if (!email) {
      console.warn(`[email-dispatch] no email on file for ${assessmentId} — aborting`);
      if (lock.acquired) await releaseEmailLock(assessmentId);
      return;
    }
    console.log(
      `[email-dispatch] context loaded — to=${email} firstName=${ctx.context.user.first_name ?? "(null)"}`,
    );

    const mainBuffer = await downloadStoragePdf("Reports", mainStatus.storage_path);
    if (!mainBuffer) {
      console.warn(
        `[email-dispatch] main_report bytes missing in Storage for ${assessmentId} — aborting`,
      );
      if (lock.acquired) await releaseEmailLock(assessmentId);
      return;
    }
    console.log(`[email-dispatch] main_report buffer: ${mainBuffer.length} bytes`);

    const planAttachments: PlanAttachment[] = await Promise.all(
      PLAN_TYPES.map(async (pdfType) => {
        const emailType = PLAN_TYPE_TO_EMAIL_TYPE[pdfType];
        try {
          const row = await getStatus(assessmentId, pdfType, locale);
          if (row?.status === "ready" && row.storage_path) {
            const buf = await downloadStoragePdf("report-pdfs", row.storage_path);
            if (buf) {
              console.log(
                `[email-dispatch] ${pdfType}: attached ${buf.length} bytes`,
              );
              return { type: emailType, buffer: buf, fallbackUrl: null };
            }
          }
          // Plan not ready (or buffer missing) — emit a fallback link the
          // user can click later. Best-effort signed URL; if signing
          // fails we still send the email with that card showing
          // "still being prepared" without a link.
          let fallbackUrl: string | null = null;
          if (row?.status === "ready" && row.storage_path) {
            try {
              fallbackUrl = await getEmailSignedUrl(pdfType, row.storage_path);
            } catch (err) {
              console.error(
                `[email-dispatch] signed url failed for ${pdfType}:`,
                err,
              );
            }
          }
          console.log(
            `[email-dispatch] ${pdfType}: no buffer, status=${row?.status ?? "missing"}, fallbackUrl=${fallbackUrl ? "set" : "null"}`,
          );
          return { type: emailType, buffer: null, fallbackUrl };
        } catch (err) {
          console.error(
            `[email-dispatch] plan attachment ${pdfType} failed:`,
            err,
          );
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

    console.log(
      `[email-dispatch] sending via Resend — attachments=${planAttachments.filter((p) => p.buffer).length + 1}`,
    );
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
    console.log(`[email-dispatch] SUCCESS — email dispatched for ${assessmentId}`);
  } catch (err) {
    console.error(`[email-dispatch] FAILED for ${assessmentId}:`, err);
  } finally {
    if (!didSend && lock.acquired) {
      // Roll back the lock so a future dispatch (e.g. when the user
      // re-opens /results?id=...) gets a fresh attempt.
      await releaseEmailLock(assessmentId);
    }
  }
}
