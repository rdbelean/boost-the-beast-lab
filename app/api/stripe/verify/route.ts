import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_test_your")) return null;
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ paid: false, error: "Missing session_id" }, { status: 400 });
  }

  try {
    // Fast path: check DB (populated by webhook)
    try {
      const supabase = getSupabaseServiceClient();
      const { data } = await supabase
        .from("paid_sessions")
        .select("stripe_session_id, product_id, status")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (data && (data.status === "paid" || data.status === "complete")) {
        return NextResponse.json({ paid: true, productId: data.product_id ?? null });
      }
    } catch {
      // DB unavailable — fall through to Stripe direct check
    }

    // Fallback: ask Stripe directly (handles race where webhook hasn't fired yet)
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ paid: false, error: "Stripe not configured" }, { status: 503 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.status === "complete";
    const productId = session.metadata?.productId ?? null;

    return NextResponse.json({ paid, productId });
  } catch (err) {
    console.error("[stripe/verify] error", err);
    return NextResponse.json({ paid: false }, { status: 500 });
  }
}
