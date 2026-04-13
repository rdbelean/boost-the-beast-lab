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

const UPSELL_PRODUCTS: Record<string, { name: string; price: number; description: string }> = {
  "plan-metabolic": {
    name: "Metabolic Boost Plan",
    price: 2499,
    description: "30-Tage individueller Ernährungs- & Stoffwechsel-Optimierungsplan",
  },
  "plan-recovery": {
    name: "Recovery Protocol",
    price: 2499,
    description: "Persönliches Schlaf- & Regenerationsprotokoll",
  },
  "plan-activity": {
    name: "Performance Training Plan",
    price: 2499,
    description: "12-Wochen individueller Kraft- & Konditionstrainingsplan",
  },
  "plan-stress": {
    name: "Stress Reset Program",
    price: 2499,
    description: "30-Tage Anti-Stress & Lifestyle-Optimierungsprogramm",
  },
  "bundle-all": {
    name: "Alle 4 Optimierungspläne — Bundle",
    price: 4999,
    description: "Metabolic + Recovery + Activity + Stress",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { productId, parentSessionId } = await req.json();
    const product = UPSELL_PRODUCTS[productId];

    if (!product) {
      return NextResponse.json({ error: "Unbekanntes Upsell-Produkt" }, { status: 400 });
    }
    if (!parentSessionId) {
      return NextResponse.json({ error: "Keine Original-Session" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe nicht konfiguriert" }, { status: 503 });
    }

    const supabase = getSupabaseServiceClient();
    const { data: parent, error: parentErr } = await supabase
      .from("paid_sessions")
      .select("customer_id, payment_method_id, email")
      .eq("stripe_session_id", parentSessionId)
      .maybeSingle();

    if (parentErr || !parent) {
      return NextResponse.json({ error: "Original-Session nicht gefunden" }, { status: 404 });
    }
    if (!parent.customer_id || !parent.payment_method_id) {
      return NextResponse.json(
        { error: "Keine gespeicherte Zahlungsmethode — bitte Checkout erneut durchlaufen" },
        { status: 400 },
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.price,
      currency: "eur",
      customer: parent.customer_id,
      payment_method: parent.payment_method_id,
      off_session: true,
      confirm: true,
      description: product.name,
      metadata: {
        productId,
        parentSessionId,
        upsell: "true",
      },
    });

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Zahlung nicht abgeschlossen: ${paymentIntent.status}` },
        { status: 402 },
      );
    }

    // Record the upsell purchase (use PI id as unique key since there's no checkout session)
    await supabase.from("paid_sessions").upsert(
      {
        stripe_session_id: paymentIntent.id,
        product_id: productId,
        email: parent.email,
        amount_cents: product.price,
        currency: "eur",
        status: "paid",
        customer_id: parent.customer_id,
        payment_method_id: parent.payment_method_id,
        parent_session_id: parentSessionId,
      },
      { onConflict: "stripe_session_id" },
    );

    return NextResponse.json({
      success: true,
      productId,
      amount: product.price,
      name: product.name,
    });
  } catch (err) {
    const error = err as Stripe.errors.StripeError;
    console.error("[charge-upsell] error", error);
    // Card authentication required → return a flag so frontend can redirect to new Checkout
    if (error.code === "authentication_required") {
      return NextResponse.json(
        { error: "Karte benötigt 3DS — bitte erneut bestätigen", requiresAction: true },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: error.message || "Upsell-Zahlung fehlgeschlagen" },
      { status: 500 },
    );
  }
}
