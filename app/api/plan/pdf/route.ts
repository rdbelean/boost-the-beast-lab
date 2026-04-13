import { NextRequest, NextResponse } from "next/server";
import { generatePlanPDF, type PlanPdfInput } from "@/lib/pdf/generatePlan";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { plan: PlanPdfInput };
    const { plan } = body;

    if (!plan?.title || !Array.isArray(plan?.blocks)) {
      return NextResponse.json({ error: "Missing plan data" }, { status: 400 });
    }

    const pdfBytes = await generatePlanPDF(plan);

    const slug = plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const filename = `btb-${slug}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[plan/pdf] error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
