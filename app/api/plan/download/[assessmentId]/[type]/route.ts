import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STORAGE_BUCKET = "Reports";
const STORAGE_PLAN_PREFIX = "plans";
const VALID_TYPES = new Set(["activity", "metabolic", "recovery", "stress"]);

/** Streams a stored plan PDF from Supabase Storage.
 *  Path shape mirrors /api/plan/save upload target:
 *    plans/{assessmentId}/{type}.pdf
 *  Falls back to reading the legacy data: URL out of report_artifacts if
 *  the Storage object doesn't exist (migration compatibility for old plans
 *  that were written before the Storage move). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string; type: string }> },
) {
  const { assessmentId, type } = await params;

  if (!assessmentId || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid plan identifier" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const storagePath = `${STORAGE_PLAN_PREFIX}/${assessmentId}/${type}.pdf`;

  // 1. Preferred path — pull from Storage
  const { data: fileBlob, error: storageErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (!storageErr && fileBlob) {
    const buf = await fileBlob.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="btb-plan-${type}-${assessmentId}.pdf"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  // 2. Legacy fallback — read the data: URL out of report_artifacts.
  //    Only used for assessments created BEFORE the Storage migration;
  //    after the migration every save also uploads to Storage.
  const { data: artifact } = await supabase
    .from("report_artifacts")
    .select("file_url")
    .eq("assessment_id", assessmentId)
    .eq("file_type", `plan_${type}`)
    .maybeSingle();

  if (artifact?.file_url && typeof artifact.file_url === "string" && artifact.file_url.startsWith("data:")) {
    try {
      const b64 = artifact.file_url.split(",")[1] ?? "";
      const buf = Buffer.from(b64, "base64");
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="btb-plan-${type}-${assessmentId}.pdf"`,
          "Cache-Control": "private, max-age=86400",
        },
      });
    } catch {
      /* fall through to 404 */
    }
  }

  return NextResponse.json({ error: "Plan not found" }, { status: 404 });
}
