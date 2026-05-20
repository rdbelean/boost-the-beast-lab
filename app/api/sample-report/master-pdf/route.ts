import { NextResponse } from "next/server";
import { generateMasterPlanPDF } from "@/lib/pdf/generateMasterPlan";
import { getSampleMasterPlan } from "@/lib/sample-report/sampleMasterPlan";
import type { Locale } from "@/lib/supabase/types";

// Sample master-plan PDF download. Mirrors /api/sample-report/pdf and
// /api/sample-report/plan-pdf — on-the-fly generation, dezent diagonal
// "BEISPIEL" watermark, no caching.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") ?? "de") as Locale;

  const plan = getSampleMasterPlan(locale);
  const { bytes } = await generateMasterPlanPDF({ plan, locale, isSample: true });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="btb-beispiel-masterplan-${locale}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
