import { NextResponse } from "next/server";
import { generatePlanPDF } from "@/lib/pdf/generatePlan";
import { buildPlan, type PlanType } from "@/lib/plan/buildPlan";
import { SAMPLE_SCORES_DISPLAY } from "@/lib/sample-report/data";
import type { Locale } from "@/lib/supabase/types";

const VALID_TYPES: PlanType[] = ["activity", "metabolic", "recovery", "stress"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") ?? "de") as Locale;
  const type = searchParams.get("type") as PlanType | null;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid or missing type" }, { status: 400 });
  }

  const plan = buildPlan(type, SAMPLE_SCORES_DISPLAY);
  const bytes = await generatePlanPDF({ ...plan, locale, isSample: true });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="btb-beispiel-plan-${type}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
