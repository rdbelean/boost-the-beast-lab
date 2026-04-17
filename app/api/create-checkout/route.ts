import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { Locale } from "@/lib/supabase/types";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith("sk_test_your")) {
    return null;
  }
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

function isLocale(v: unknown): v is Locale {
  return v === "de" || v === "en" || v === "it";
}

// Stripe's Checkout locale param accepts ISO codes that match our locales
// 1:1 here. See https://stripe.com/docs/api/checkout/sessions/create#create_checkout_session-locale
type StripeLocale = "de" | "en" | "it";

interface ProductCopy {
  name: string;
  description: string;
}

// Product copy per locale. Prices are the same (EUR) everywhere —
// the user confirmed EUR across all locales in the plan's TEIL 15 Q3.
// Keys must stay aligned with the productId values below.
const PRODUCTS: Record<Locale, Record<string, ProductCopy & { price: number }>> = {
  de: {
    metabolic: { name: "Metabolic Performance Score", price: 2900, description: "BMI, Ernährungs- & Hydrations-Score, AI-Report, Premium PDF" },
    recovery: { name: "Recovery & Regeneration Score", price: 2900, description: "Schlafanalyse, Regenerations-Score, AI-Report, Premium PDF" },
    "complete-analysis": { name: "Complete Performance Analysis", price: 3990, description: "Alle 4 Scores + Overall Index, AI-Report, 30-Tage Prognose, Premium PDF" },
    "plan-metabolic": { name: "Metabolic Boost Plan", price: 2499, description: "30-Tage individueller Ernährungs- & Stoffwechsel-Optimierungsplan" },
    "plan-recovery": { name: "Recovery Protocol", price: 2499, description: "Persönliches Schlaf- & Regenerationsprotokoll für maximale Erholung" },
    "plan-activity": { name: "Performance Training Plan", price: 2499, description: "12-Wochen individueller Kraft- & Konditionstrainingsplan" },
    "plan-stress": { name: "Stress Reset Program", price: 2499, description: "30-Tage Anti-Stress & Lifestyle-Optimierungsprogramm" },
    "bundle-all": { name: "Alle 4 Optimierungspläne — Bundle", price: 4999, description: "Metabolic + Recovery + Activity + Stress — vollständige Performance-Optimierung" },
  },
  en: {
    metabolic: { name: "Metabolic Performance Score", price: 2900, description: "BMI, nutrition & hydration score, AI report, premium PDF" },
    recovery: { name: "Recovery & Regeneration Score", price: 2900, description: "Sleep analysis, recovery score, AI report, premium PDF" },
    "complete-analysis": { name: "Complete Performance Analysis", price: 3990, description: "All 4 scores + overall index, AI report, 30-day forecast, premium PDF" },
    "plan-metabolic": { name: "Metabolic Boost Plan", price: 2499, description: "30-day personalized nutrition & metabolic optimization plan" },
    "plan-recovery": { name: "Recovery Protocol", price: 2499, description: "Personalized sleep & recovery protocol for maximum restoration" },
    "plan-activity": { name: "Performance Training Plan", price: 2499, description: "12-week personalized strength & conditioning plan" },
    "plan-stress": { name: "Stress Reset Program", price: 2499, description: "30-day anti-stress & lifestyle optimization program" },
    "bundle-all": { name: "All 4 Optimization Plans — Bundle", price: 4999, description: "Metabolic + Recovery + Activity + Stress — full performance optimization" },
  },
  it: {
    metabolic: { name: "Metabolic Performance Score", price: 2900, description: "BMI, score alimentazione e idratazione, report AI, PDF premium" },
    recovery: { name: "Recovery & Regeneration Score", price: 2900, description: "Analisi del sonno, score di recupero, report AI, PDF premium" },
    "complete-analysis": { name: "Complete Performance Analysis", price: 3990, description: "Tutti e 4 gli score + indice complessivo, report AI, previsione a 30 giorni, PDF premium" },
    "plan-metabolic": { name: "Metabolic Boost Plan", price: 2499, description: "Piano personalizzato di 30 giorni per alimentazione e ottimizzazione metabolica" },
    "plan-recovery": { name: "Recovery Protocol", price: 2499, description: "Protocollo personalizzato per sonno e recupero massimo" },
    "plan-activity": { name: "Performance Training Plan", price: 2499, description: "Piano personalizzato di forza e condizionamento di 12 settimane" },
    "plan-stress": { name: "Stress Reset Program", price: 2499, description: "Programma anti-stress e ottimizzazione lifestyle di 30 giorni" },
    "bundle-all": { name: "Tutti e 4 i Piani di Ottimizzazione — Bundle", price: 4999, description: "Metabolic + Recovery + Activity + Stress — ottimizzazione completa della performance" },
  },
};

// T&C message shown on the Stripe checkout consent step. Must mention the
// card-saving + upsell behavior so the "required" terms acceptance is
// informed consent under EU law.
const TOS_MESSAGE: Record<Locale, string> = {
  de: "Mit Bestätigung stimmst du zu, dass Boost the Beast Lab deine Zahlungsdaten speichert und für zukünftige optionale Upsell-Käufe (Trainings- & Ernährungspläne) verwenden darf, die du auf der Ergebnisseite freigibst.",
  en: "By confirming, you agree that Boost the Beast Lab may store your payment details and use them for future optional upsell purchases (training and nutrition plans) that you release on the results page.",
  it: "Confermando, accetti che Boost the Beast Lab possa salvare i tuoi dati di pagamento e utilizzarli per futuri acquisti upsell opzionali (piani di allenamento e alimentazione) che autorizzi nella pagina dei risultati.",
};

const ERROR_MSG: Record<Locale, { not_found: string; checkout_failed: string }> = {
  de: { not_found: "Produkt nicht gefunden", checkout_failed: "Checkout fehlgeschlagen" },
  en: { not_found: "Product not found", checkout_failed: "Checkout failed" },
  it: { not_found: "Prodotto non trovato", checkout_failed: "Checkout non riuscito" },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, email } = body;
    const locale: Locale = isLocale(body.locale) ? body.locale : "de";

    const product = PRODUCTS[locale][productId];
    if (!product) {
      return NextResponse.json({ error: ERROR_MSG[locale].not_found }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ url: null });
    }

    const origin = req.headers.get("origin") ?? "https://boostthebeast-lab.com";
    const stripeLocale: StripeLocale = locale;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: stripeLocale,
      payment_method_types: ["card"],
      customer_email: email || undefined,
      customer_creation: "always",
      payment_intent_data: {
        setup_future_usage: "off_session",
        description: product.name,
      },
      line_items: [
        productId === "complete-analysis" && process.env.STRIPE_PRICE_ID
          ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
          : {
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
      allow_promotion_codes: true,
      metadata: {
        productId,
        locale,
      },
      consent_collection: {
        terms_of_service: "required",
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: TOS_MESSAGE[locale],
        },
      },
      // Locale-prefixed success so the user returns to /de/analyse/prepare,
      // /en/analyse/prepare, etc. The proxy would redirect a bare path, but
      // going direct avoids the extra hop.
      success_url: `${origin}/${locale}/analyse/prepare?product=${productId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/kaufen`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout]", err);
    // Can't read locale here (body may have thrown); fall back to DE.
    return NextResponse.json({ error: ERROR_MSG.de.checkout_failed }, { status: 500 });
  }
}
