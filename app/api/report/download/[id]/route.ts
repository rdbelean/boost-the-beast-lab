import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireOwnership } from "@/lib/auth/ownership";

const STORAGE_BUCKET = "Reports";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: assessmentId } = await params;

  if (!assessmentId) {
    return NextResponse.json({ error: "Missing assessment ID" }, { status: 400 });
  }

  // Block UUID-enumeration: only the assessment owner (auth user or
  // guest with valid Stripe session cookie) can download.
  const forbidden = await requireOwnership(req, assessmentId);
  if (forbidden) return forbidden;

  const supabase = getSupabaseServiceClient();

  const storagePath = `${assessmentId}/btb-report-${assessmentId}.pdf`;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const arrayBuffer = await data.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="btb-report-${assessmentId}.pdf"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
