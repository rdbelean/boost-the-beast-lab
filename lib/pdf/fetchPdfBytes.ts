// Server-side helper to download a PDF stored in Supabase Storage as a Buffer.
//
// Used by the email-send path in /api/reports/prepare-pdfs to load the
// pre-generated PDFs out of Storage so they can be attached to the report
// email. Returns null when the object is missing — the caller decides
// whether that is fatal (main_report) or graceful-degrade (plan PDFs).

import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type PdfBucket = "Reports" | "report-pdfs";

export async function downloadStoragePdf(
  bucket: PdfBucket,
  path: string,
): Promise<Buffer | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    if (error && !/not.?found|does.?not.?exist|404/i.test(error.message ?? "")) {
      console.error(`[downloadStoragePdf] ${bucket}/${path}: ${error.message}`);
    }
    return null;
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
