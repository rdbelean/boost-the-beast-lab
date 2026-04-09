import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_test_your")) {
    return null;
  }
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

const PRODUCTS: Record<string, { name: string; price: number; description: string }> = {
  metabolic: {
    name: "Metabolic Performance Score",
    price: 2900,
    description: "BMI, Ernährungs- & Hydrations-Score, AI-Report, Premium PDF",
  },
  recovery: {
    name: "Recovery & Regeneration Score",
    price: 2900,
    description: "Schlafanalyse, Regenerations-Score, AI-Report, Premium PDF",
  },
  "complete-analysis": {
    name: "Complete Performance Analysis",
    price: 7900,
    description: "Alle 4 Scores + Overall Index, AI-Report, 30-Tage Prognose, Premium PDF",
  },
  "plan-metabolic": {
    name: "Metabolic Boost Plan",
    price: 2499,
    description: "30-Tage individueller Ernährungs- & Stoffwechsel-Optimierungsplan",
  },
  "plan-recovery": {
    name: "Recovery Protocol",
    price: 2499,
    description: "Persönliches Schlaf- & Regenerationsprotokoll für maximale Erholung",
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
    description: "Metabolic + Recovery + Activity + Stress — vollständige Performance-Optimierung",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { productId, email } = await req.json();
    const product = PRODUCTS[productId];

    if (!product) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      // Stripe not configured — return null so frontend falls back to direct assessment
      return NextResponse.json({ url: null });
    }

    const origin = req.headers.get("origin") ?? "https://boost-the-beast-lab.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: product.price,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        productId,
      },
      success_url: `${origin}/assessment?product=${productId}&paid=true`,
      cancel_url: `${origin}/#products`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout]", err);
    return NextResponse.json({ error: "Checkout fehlgeschlagen" }, { status: 500 });
  }
}
