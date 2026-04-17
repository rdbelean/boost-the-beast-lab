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

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret || webhookSecret === "whsec_placeholder") {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const productId = session.metadata?.productId ?? null;
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const amount = session.amount_total ?? 0;
    const metaLocale = session.metadata?.locale;
    const locale =
      metaLocale === "de" || metaLocale === "en" || metaLocale === "it"
        ? metaLocale
        : null;
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

    // Retrieve the PaymentIntent to get the saved payment_method id
    let paymentMethodId: string | null = null;
    try {
      if (session.payment_intent) {
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;
        const pi = await stripe.paymentIntents.retrieve(piId);
        paymentMethodId =
          typeof pi.payment_method === "string"
            ? pi.payment_method
            : pi.payment_method?.id ?? null;
      }
    } catch (err) {
      console.error("[stripe/webhook] pi retrieve failed", err);
    }

    try {
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase.from("paid_sessions").upsert(
        {
          stripe_session_id: session.id,
          product_id: productId,
          email,
          amount_cents: amount,
          currency: session.currency ?? "eur",
          status: session.payment_status ?? "paid",
          customer_id: customerId,
          payment_method_id: paymentMethodId,
          locale,
        },
        { onConflict: "stripe_session_id" },
      );
      if (error) {
        console.error("[stripe/webhook] db insert failed", error);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

    } catch (err) {
      console.error("[stripe/webhook] handler error", err);
      return NextResponse.json({ error: "Handler error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
