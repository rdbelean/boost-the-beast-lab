// Background PDF generation helpers.
// Called exclusively from server-side route handlers — never from the browser.
//
// Strategy:
//  - main_report: the PDF already exists in the "Reports" bucket (written by
//    report/generate). We just verify it's there and mark it "ready".
//  - plan PDFs:   the frontend pre-computes them and passes base64 strings to
//    prepare-pdfs. We decode and upload to the "report-pdfs" bucket. If base64
//    is absent we re-generate via generatePlanPDF (legacy / fallback path).

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { upsertStatus, type PdfType } from "./status";
import type { Locale } from "@/lib/supabase/types";

const REPORTS_BUCKET = "Reports";
const PLANS_BUCKET = "report-pdfs";

// ── main_report ───────────────────────────────────────────────────────────────

export async function processMainReport(
  assessmentId: string,
  locale: Locale,
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const path = `${assessmentId}/btb-report-${assessmentId}.pdf`;

  await upsertStatus(assessmentId, "main_report", locale, "generating");

  const { data, error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .list(assessmentId);

  if (error || !data?.some((f) => f.name === `btb-report-${assessmentId}.pdf`)) {
    await upsertStatus(assessmentId, "main_report", locale, "failed");
    throw new Error(`main_report PDF not found in Storage: ${path}`);
  }

  await upsertStatus(assessmentId, "main_report", locale, "ready", path);
}

// ── plan PDFs ─────────────────────────────────────────────────────────────────

export type PlanPdfType = Exclude<PdfType, "main_report">;

const PLAN_TYPE_MAP: Record<PlanPdfType, string> = {
  plan_activity: "activity",
  plan_metabolic: "metabolic",
  plan_recovery: "recovery",
  plan_stress: "stress",
};

export async function uploadPlanPdf(
  assessmentId: string,
  pdfType: PlanPdfType,
  locale: Locale,
  pdfBase64: string,
): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const planKey = PLAN_TYPE_MAP[pdfType];
  const storagePath = `${assessmentId}/${locale}/${planKey}.pdf`;

  const byteChars = Buffer.from(pdfBase64, "base64");

  await upsertStatus(assessmentId, pdfType, locale, "generating");

  const { error } = await supabase.storage
    .from(PLANS_BUCKET)
    .upload(storagePath, byteChars, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    // 409 = object already exists. The frontend uploaded the personalised AI
    // plan first; a later worker call must NOT overwrite it. Treat as success.
    const message = error.message ?? "";
    const alreadyExists =
      /already exists|duplicate|409/i.test(message) ||
      ("statusCode" in error && (error as { statusCode?: string }).statusCode === "409");
    if (alreadyExists) {
      await upsertStatus(assessmentId, pdfType, locale, "ready", storagePath);
      return storagePath;
    }
    await upsertStatus(assessmentId, pdfType, locale, "failed");
    throw new Error(`Storage upload failed for ${pdfType}: ${message}`);
  }

  await upsertStatus(assessmentId, pdfType, locale, "ready", storagePath);
  return storagePath;
}

// ── signed URL ────────────────────────────────────────────────────────────────

export async function getSignedUrl(
  pdfType: PdfType,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const bucket = pdfType === "main_report" ? REPORTS_BUCKET : PLANS_BUCKET;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

// 7-day signed URL for use in email links — long enough that a casual reader
// who opens the email a few days later still gets a working link, short
// enough that a leaked URL doesn't grant indefinite access. The default
// 1-hour `getSignedUrl` is kept for in-app UI flows (less leaky).
export const EMAIL_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function getEmailSignedUrl(
  pdfType: PdfType,
  storagePath: string,
): Promise<string> {
  return getSignedUrl(pdfType, storagePath, EMAIL_SIGNED_URL_TTL_SECONDS);
}
