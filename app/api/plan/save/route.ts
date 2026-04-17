import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PLAN_TYPES = new Set(["activity", "metabolic", "recovery", "stress"]);

export async function POST(req: NextRequest) {
  try {
    const { assessmentId, planType, pdfBase64 } = await req.json();

    if (!assessmentId || !planType || !pdfBase64) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!VALID_PLAN_TYPES.has(planType)) {
      return NextResponse.json({ error: "Invalid planType" }, { status: 400 });
    }

    const fileType = `plan_${planType}`;
    const fileUrl = `data:application/pdf;base64,${pdfBase64}`;

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("report_artifacts").insert({
      assessment_id: assessmentId,
      file_url: fileUrl,
      file_type: fileType,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[plan/save]", err);
    return NextResponse.json({ error: "Failed to save plan artifact" }, { status: 500 });
  }
}
