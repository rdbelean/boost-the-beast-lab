"use client";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

const PRODUCTS: Record<string, { name: string; price: number; features: string[]; tag?: string }> = {
  metabolic: {
    name: "METABOLIC PERFORMANCE SCORE",
    price: 29,
    features: [
      "BMI & Körperkompositions-Analyse",
      "Ernährungs- & Hydrations-Score",
      "Sitzzeit & Lifestyle-Bewertung",
      "AI-generierte Empfehlungen",
      "Premium PDF Report",
    ],
  },
  recovery: {
    name: "RECOVERY & REGENERATION SCORE",
    price: 29,
    features: [
      "Schlafqualität & -dauer Analyse",
      "Regenerations-Effizienz-Score",
      "Stressbelastungs-Index",
      "AI-generierte Empfehlungen",
      "Premium PDF Report",
    ],
  },
  "complete-analysis": {
    name: "COMPLETE PERFORMANCE ANALYSIS",
    price: 79,
    tag: "BESTSELLER",
    features: [
      "Metabolic Performance Score",
      "Recovery & Regeneration Score",
      "Activity Performance Score",
      "Stress & Lifestyle Score",
      "Overall Performance Index",
      "Detaillierter AI-Report (900 Wörter)",
      "30-Tage Prognose",
      "Premium PDF Report",
    ],
  },
};

export default function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const product = PRODUCTS[productId];

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div className="text-center">
          <div className="font-headline text-white text-2xl mb-4">PRODUKT NICHT GEFUNDEN</div>
          <Link href="/#products" className="btn-primary">ZURÜCK ZU DEN REPORTS</Link>
        </div>
      </div>
    );
  }

  function handleCheckout() {
    // Demo mode: simulate payment and redirect to assessment
    router.push("/results");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="px-6 h-14 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-section-alt)" }}
      >
        <Link href="/" className="font-headline text-sm tracking-widest text-white">
          BOOST THE BEAST LAB
        </Link>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--success)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1a6 6 0 100 12A6 6 0 007 1z" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          SSL-gesicherte Verbindung
        </div>
      </div>

      {/* Demo Mode Banner */}
      <div
        className="px-6 py-3 text-center text-xs font-headline tracking-widest"
        style={{ background: "rgba(245,158,11,0.12)", color: "var(--warning)", borderBottom: "1px solid rgba(245,158,11,0.2)" }}
      >
        DEMO-MODUS · ZAHLUNG WIRD SIMULIERT · KEINE ECHTE TRANSAKTION
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          {/* Product Summary */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="font-headline text-xs tracking-[0.3em] mb-6" style={{ color: "var(--text-muted)" }}>
              DEINE BESTELLUNG
            </div>

            <div
              className="p-8 relative overflow-hidden"
              style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 gradient-red" />

              {product.tag && (
                <div className="inline-block mb-4 px-3 py-1 font-headline text-xs tracking-widest gradient-red text-white">
                  {product.tag}
                </div>
              )}

              <h2 className="font-headline text-xl font-bold text-white mb-6 leading-tight">
                {product.name}
              </h2>

              <ul className="space-y-3 mb-8">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
                      <path d="M2 7l4 4 6-7" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div
                className="flex justify-between items-center pt-6"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span className="font-headline text-sm tracking-widest" style={{ color: "var(--text-secondary)" }}>
                  GESAMT
                </span>
                <div className="flex items-end gap-1">
                  <span className="font-mono-data text-4xl font-bold" style={{ color: "var(--accent-red)" }}>
                    €{product.price}
                  </span>
                  <span className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>einmalig</span>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { icon: "🔒", label: "SSL Verschlüsselt" },
                { icon: "⚡", label: "Sofort verfügbar" },
                { icon: "📄", label: "PDF Download" },
              ].map(({ icon, label }) => (
                <div key={label} className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  <div className="text-lg mb-1">{icon}</div>
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Payment form */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="font-headline text-xs tracking-[0.3em] mb-6" style={{ color: "var(--text-muted)" }}>
              ZAHLUNGSDETAILS
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block font-headline text-xs tracking-widest mb-2" style={{ color: "var(--text-secondary)" }}>
                  E-MAIL
                </label>
                <input
                  type="email"
                  defaultValue="demo@boostthebeast.com"
                  className="w-full px-4 py-3 text-sm outline-none transition-colors"
                  style={{
                    background: "#2A2A2A",
                    border: "1px solid #444",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent-red)")}
                  onBlur={(e) => (e.target.style.borderColor = "#444")}
                />
              </div>

              {/* Card number */}
              <div>
                <label className="block font-headline text-xs tracking-widest mb-2" style={{ color: "var(--text-secondary)" }}>
                  KARTENNUMMER
                </label>
                <input
                  type="text"
                  defaultValue="4242 4242 4242 4242"
                  className="w-full px-4 py-3 text-sm font-mono-data outline-none"
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                  readOnly
                />
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Demo-Karte (Stripe Test)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-headline text-xs tracking-widest mb-2" style={{ color: "var(--text-secondary)" }}>
                    ABLAUFDATUM
                  </label>
                  <input
                    type="text"
                    defaultValue="12/28"
                    className="w-full px-4 py-3 text-sm font-mono-data outline-none"
                    style={{ background: "#2A2A2A", border: "1px solid #444", color: "var(--text-secondary)" }}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block font-headline text-xs tracking-widest mb-2" style={{ color: "var(--text-secondary)" }}>
                    CVC
                  </label>
                  <input
                    type="text"
                    defaultValue="424"
                    className="w-full px-4 py-3 text-sm font-mono-data outline-none"
                    style={{ background: "#2A2A2A", border: "1px solid #444", color: "var(--text-secondary)" }}
                    readOnly
                  />
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleCheckout}
                className="btn-primary w-full py-5 text-base justify-center mt-4"
              >
                JETZT BEZAHLEN · €{product.price}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
                Demo-Modus. Keine echte Zahlung wird verarbeitet.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
