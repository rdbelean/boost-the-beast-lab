import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ paid: false, error: "Missing session_id" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("paid_sessions")
      .select("stripe_session_id, product_id, status")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("[stripe/verify] db error", error);
      return NextResponse.json({ paid: false }, { status: 500 });
    }

    const paid = !!data && (data.status === "paid" || data.status === "complete");
    return NextResponse.json({ paid, productId: data?.product_id ?? null });
  } catch (err) {
    console.error("[stripe/verify] error", err);
    return NextResponse.json({ paid: false }, { status: 500 });
  }
}
