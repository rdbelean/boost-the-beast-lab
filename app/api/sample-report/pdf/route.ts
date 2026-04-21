import { NextResponse } from "next/server";
import { generatePDF } from "@/lib/pdf/generateReport";
import { SAMPLE_PDF_CONTENT, SAMPLE_PDF_SCORES, SAMPLE_PDF_USER } from "@/lib/sample-report/data";
import type { Locale } from "@/lib/supabase/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") ?? "de") as Locale;

  const bytes = await generatePDF(
    SAMPLE_PDF_CONTENT,
    SAMPLE_PDF_SCORES,
    SAMPLE_PDF_USER,
    locale,
    undefined,
    undefined,
    true,
  );

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="btb-beispielreport.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
