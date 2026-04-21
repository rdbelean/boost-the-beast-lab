import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PLAN_TYPES = new Set(["activity", "metabolic", "recovery", "stress"]);
const STORAGE_BUCKET = "Reports"; // reuse existing bucket; avoid needing a new bucket in Supabase
const STORAGE_PLAN_PREFIX = "plans"; // → plans/{assessmentId}/{type}.pdf

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
    const supabase = getSupabaseServiceClient();

    // 1. Decode base64 to bytes so we can upload to Storage as a real PDF
    //    (statt als data:application/pdf;base64,... in der DB — das war
    //    der Haupt-Grund warum /account mit alten Plans 10 MB base64 auf
    //    einmal ausliefert und das Laden 5 min dauert).
    let pdfBytes: Uint8Array | null = null;
    try {
      const binaryString = Buffer.from(pdfBase64, "base64");
      pdfBytes = new Uint8Array(binaryString);
    } catch (decodeErr) {
      console.warn("[plan/save] base64 decode failed:", decodeErr);
    }

    // 2. Try Supabase Storage first (preferred path: fast CDN-served PDFs).
    let fileUrl: string | null = null;
    if (pdfBytes && pdfBytes.byteLength > 0) {
      const storagePath = `${STORAGE_PLAN_PREFIX}/${assessmentId}/${planType}.pdf`;
      try {
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (upErr) throw upErr;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
        fileUrl = `${appUrl}/api/plan/download/${assessmentId}/${planType}`;
      } catch (storageErr) {
        const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
        console.warn(`[plan/save] Storage upload failed (${msg}) — falling back to data: URL`);
      }
    }

    // 3. Fallback: store as data: URL (legacy path — keeps /account working
    //    even if Storage is misconfigured). Old rows with data: URLs are
    //    still supported by AccountView.
    if (!fileUrl) {
      fileUrl = `data:application/pdf;base64,${pdfBase64}`;
    }

    // 4. Upsert-ähnlich: delete existing row(s) for this assessment+type
    //    bevor wir neu einfügen. Verhindert Duplikate bei Retries.
    await supabase
      .from("report_artifacts")
      .delete()
      .eq("assessment_id", assessmentId)
      .eq("file_type", fileType);

    const { error: insertErr } = await supabase.from("report_artifacts").insert({
      assessment_id: assessmentId,
      file_url: fileUrl,
      file_type: fileType,
    });

    if (insertErr) throw insertErr;

    // 5. Delete plan artifacts for all other assessments of the same user.
    //    Plans are only kept for the most recent report — older ones are pruned.
    const { data: ownerRow } = await supabase
      .from("assessments")
      .select("user_id")
      .eq("id", assessmentId)
      .single();

    if (ownerRow?.user_id) {
      const { data: others } = await supabase
        .from("assessments")
        .select("id")
        .eq("user_id", ownerRow.user_id)
        .neq("id", assessmentId);

      const otherIds = (others ?? []).map((a: { id: string }) => a.id);
      if (otherIds.length) {
        await supabase
          .from("report_artifacts")
          .delete()
          .in("assessment_id", otherIds)
          .like("file_type", "plan_%");
        // Note: we intentionally don't delete the underlying Storage objects
        // for old assessments — they're pruned lazily when the user's next
        // plan is saved. Storage cost is negligible (~500 KB per plan).
      }
    }

    return NextResponse.json({ ok: true, url: fileUrl });
  } catch (err) {
    console.error("[plan/save]", err);
    return NextResponse.json({ error: "Failed to save plan artifact" }, { status: 500 });
  }
}
