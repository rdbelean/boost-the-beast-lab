import { NextRequest, NextResponse } from "next/server";
import { generateMasterPlanPDF } from "@/lib/pdf/generateMasterPlan";
import { MasterPlanSchema } from "@/lib/master-plan/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { plan: unknown; locale?: string };
    const { plan, locale } = body;

    const parse = MasterPlanSchema.safeParse(plan);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid plan shape" }, { status: 400 });
    }

    const { bytes, overflowed } = await generateMasterPlanPDF({
      plan: parse.data,
      locale: locale ?? "de",
    });

    if (overflowed) {
      // The /api/master-plan/generate path should have caught this in its retry
      // loop. If we land here, it means a downstream caller passed an
      // already-overflowing plan. Surface clearly rather than hide it.
      return NextResponse.json({ error: "master_plan_overflow_unfixable" }, { status: 502 });
    }

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="btb-master-weekly-plan.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[master-plan/pdf] error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
