import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/wearable/:id
 *
 * DSGVO Art. 17 compliance — lets users delete an individual wearable upload
 * independently of their reports. The scrubbed upload row is hard-deleted;
 * the corresponding assessments.data_sources JSONB is nulled out for the
 * source key so the Claude prompt will treat the assessment as form-only
 * on regeneration. The generated PDF report itself is not retroactively
 * rewritten (legitimate archival interest — the user still has a copy).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: uploadId } = await params;
    if (!uploadId) {
      return NextResponse.json({ error: "Missing upload id" }, { status: 400 });
    }

    // Require auth.
    const userClient = await getSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await userClient.auth.getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = getSupabaseServiceClient();

    // Resolve users row.
    const { data: u } = await service
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (!u?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch the upload — ensure owner.
    const { data: upload } = await service
      .from("wearable_uploads")
      .select("id, source, assessment_id")
      .eq("id", uploadId)
      .eq("user_id", u.id)
      .maybeSingle();
    if (!upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    // Scrub the assessments.data_sources reference (best effort).
    if (upload.assessment_id) {
      const { data: asmt } = await service
        .from("assessments")
        .select("data_sources")
        .eq("id", upload.assessment_id)
        .maybeSingle();
      if (asmt?.data_sources) {
        const ds = asmt.data_sources as Record<string, unknown>;
        delete ds[upload.source];
        await service
          .from("assessments")
          .update({ data_sources: ds })
          .eq("id", upload.assessment_id);
      }
    }

    // Hard-delete the row.
    const { error: delErr } = await service
      .from("wearable_uploads")
      .delete()
      .eq("id", upload.id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[wearable/delete]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to delete wearable upload: ${msg}` },
      { status: 500 },
    );
  }
}
