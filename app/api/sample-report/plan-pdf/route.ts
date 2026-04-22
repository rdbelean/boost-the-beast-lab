import { NextResponse } from "next/server";
import { generatePlanPDF } from "@/lib/pdf/generatePlan";
import { getSamplePlan } from "@/lib/sample-report/samplePlans";
import type { PlanType } from "@/lib/plan/buildPlan";
import type { Locale } from "@/lib/supabase/types";

const VALID_TYPES: PlanType[] = ["activity", "metabolic", "recovery", "stress"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") ?? "de") as Locale;
  const type = searchParams.get("type") as PlanType | null;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid or missing type" }, { status: 400 });
  }

  const plan = getSamplePlan(locale, type);
  const bytes = await generatePlanPDF({ ...plan, locale, isSample: true });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="btb-sample-plan-${type}-${locale}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
