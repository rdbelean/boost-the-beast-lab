// Status check + signed URL endpoint.
// Frontend polls this every 2 s while a PDF is generating.
// Returns { ready: true, url } once ready, or { ready: false, status } while pending/generating.

import { NextRequest, NextResponse } from "next/server";
import { getStatus, type PdfType } from "@/lib/pdf/status";
import { getSignedUrl } from "@/lib/pdf/background-generator";
import type { Locale } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const assessmentId = searchParams.get("assessment_id");
  const pdfType = searchParams.get("pdf_type") as PdfType | null;
  const locale = (searchParams.get("locale") ?? "de") as Locale;

  if (!assessmentId || !pdfType) {
    return NextResponse.json({ error: "Missing assessment_id or pdf_type" }, { status: 400 });
  }

  try {
    const row = await getStatus(assessmentId, pdfType, locale);

    if (!row || row.status === "pending" || row.status === "generating") {
      return NextResponse.json({ ready: false, status: row?.status ?? "pending" });
    }

    if (row.status === "failed") {
      return NextResponse.json({ ready: false, status: "failed" });
    }

    // status === "ready"
    if (!row.storage_path) {
      return NextResponse.json({ ready: false, status: "generating" });
    }

    const url = await getSignedUrl(pdfType, row.storage_path);
    return NextResponse.json({ ready: true, url });
  } catch (err) {
    console.error("[pdf-url] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
