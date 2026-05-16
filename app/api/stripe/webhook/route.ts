import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { expectedPriceCents } from "@/lib/products/prices";

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

  const supabase = getSupabaseServiceClient();

  // ── Event deduplication ────────────────────────────────────────────
  // Stripe retries webhook delivery on any non-2xx response. Without
  // dedup, a retried event can re-trigger side effects (refund flag set
  // twice, double-counted accounts). INSERT into stripe_events_processed
  // with the unique event.id; PK collision (23505) = duplicate.
  {
    const { error: dupErr } = await supabase
      .from("stripe_events_processed")
      .insert({
        event_id: event.id,
        type: event.type,
        meta: { livemode: event.livemode },
      });
    if (dupErr) {
      // 23505 = unique_violation. Any other error is logged but we still
      // try to process — better to risk a double-process than to drop
      // a real event because of a transient DB hiccup.
      if (dupErr.code === "23505") {
        console.log(
          "[stripe/webhook] duplicate event ignored",
          event.id,
          event.type,
        );
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.warn(
        "[stripe/webhook] dedup insert failed (continuing):",
        dupErr.message,
      );
    }
  }

  // ── checkout.session.completed ──────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const productId = session.metadata?.productId ?? null;
    const email =
      session.customer_details?.email ?? session.customer_email ?? null;
    const amount = session.amount_total ?? 0;
    const metaLocale = session.metadata?.locale;
    const locale =
      metaLocale === "de" ||
      metaLocale === "en" ||
      metaLocale === "it" ||
      metaLocale === "tr"
        ? metaLocale
        : null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    // ── Amount validation ────────────────────────────────────────────
    // session.amount_total can be tampered with at the Checkout creation
    // step (someone forging a Stripe API call with sk_test_*). The
    // server-side webhook is the LAST line of defence: compare against
    // the canonical price map. Mismatch = persist as suspicious, do NOT
    // grant report access.
    const expected = expectedPriceCents(productId);
    const amountMatches = expected !== null && amount === expected;
    if (!amountMatches) {
      console.error(
        "[stripe/webhook] AMOUNT MISMATCH",
        JSON.stringify({
          event_id: event.id,
          session_id: session.id,
          product_id: productId,
          amount_paid: amount,
          amount_expected: expected,
        }),
      );
    }

    // Retrieve the PaymentIntent to get the saved payment_method id +
    // the charge id (needed later for refund correlation).
    let paymentMethodId: string | null = null;
    let chargeId: string | null = null;
    try {
      if (session.payment_intent) {
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;
        const pi = await stripe.paymentIntents.retrieve(piId, {
          expand: ["latest_charge"],
        });
        paymentMethodId =
          typeof pi.payment_method === "string"
            ? pi.payment_method
            : pi.payment_method?.id ?? null;
        if (pi.latest_charge) {
          chargeId =
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge.id;
        }
      }
    } catch (err) {
      console.error("[stripe/webhook] pi retrieve failed", err);
    }

    try {
      const { error } = await supabase.from("paid_sessions").upsert(
        {
          stripe_session_id: session.id,
          product_id: productId,
          email,
          amount_cents: amount,
          amount_expected: expected,
          suspicious: !amountMatches,
          currency: session.currency ?? "eur",
          status: session.payment_status ?? "paid",
          customer_id: customerId,
          payment_method_id: paymentMethodId,
          stripe_charge_id: chargeId,
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

    return NextResponse.json({
      received: true,
      suspicious: !amountMatches,
    });
  }

  // ── charge.refunded ─────────────────────────────────────────────────
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const chargeId = charge.id;
    const refundedAt = new Date().toISOString();
    try {
      const { error } = await supabase
        .from("paid_sessions")
        .update({ refunded_at: refundedAt })
        .eq("stripe_charge_id", chargeId);
      if (error) {
        console.error("[stripe/webhook] refund update failed", error);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      console.log(
        "[stripe/webhook] refund recorded",
        chargeId,
        "amount_refunded:",
        charge.amount_refunded,
      );
    } catch (err) {
      console.error("[stripe/webhook] refund handler error", err);
      return NextResponse.json({ error: "Handler error" }, { status: 500 });
    }
    return NextResponse.json({ received: true, refunded: true });
  }

  return NextResponse.json({ received: true });
}
