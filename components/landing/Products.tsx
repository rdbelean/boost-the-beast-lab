"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const products = [
  {
    id: "metabolic",
    tag: "EINZELREPORT",
    name: "METABOLIC PERFORMANCE SCORE",
    price: "29",
    question: "Wie effizient arbeitet dein Stoffwechsel?",
    features: [
      "BMI & Körperkompositions-Analyse",
      "Ernährungs- & Hydrations-Score",
      "Sitzzeit & Lifestyle-Bewertung",
      "AI-generierte Empfehlungen",
      "Premium PDF Report",
    ],
    highlight: false,
  },
  {
    id: "recovery",
    tag: "EINZELREPORT",
    name: "RECOVERY & REGENERATION SCORE",
    price: "29",
    question: "Wie gut erholt sich dein Körper?",
    features: [
      "Schlafqualität & -dauer Analyse",
      "Regenerations-Effizienz-Score",
      "Stressbelastungs-Index",
      "AI-generierte Empfehlungen",
      "Premium PDF Report",
    ],
    highlight: false,
  },
  {
    id: "complete-analysis",
    tag: "BUNDLE — BESTSELLER",
    name: "COMPLETE PERFORMANCE ANALYSIS",
    price: "79",
    question: "Alle Scores. Ein vollständiger Report.",
    features: [
      "Metabolic Performance Score",
      "Recovery & Regeneration Score",
      "Activity Performance Score",
      "Stress & Lifestyle Score",
      "Overall Performance Index",
      "Detaillierter AI-Report",
      "30-Tage Prognose",
      "Premium PDF Report",
    ],
    highlight: true,
  },
];

export default function Products() {
  return (
    <section id="products" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-6xl mx-auto px-8 py-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="font-headline text-xs tracking-[0.45em] mb-5" style={{ color: "var(--accent-red)" }}>
            DEINE REPORTS
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
            WÄHLE DEINEN REPORT
          </h2>
        </motion.div>

        {/* Cards — vertikal gestapelt */}
        <div className="flex flex-col gap-6">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: p.highlight ? "var(--surface-elevated)" : "var(--surface-card)",
                border: p.highlight ? "1px solid var(--accent-red)" : "1px solid var(--border)",
                borderRadius: "6px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Roter Akzent-Streifen oben */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "var(--gradient-red)" }} />

              <div className="flex flex-col md:flex-row gap-0">

                {/* Links: Name + Features */}
                <div className="flex-1 p-10">
                  {/* Tag */}
                  <div className="mb-6">
                    <span
                      className="font-headline text-xs tracking-[0.25em] px-3 py-1"
                      style={{
                        background: p.highlight ? "var(--gradient-red)" : "rgba(255,255,255,0.07)",
                        color: p.highlight ? "#fff" : "var(--text-muted)",
                        borderRadius: "2px",
                      }}
                    >
                      {p.tag}
                    </span>
                  </div>

                  <h3 className="font-headline text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    {p.name}
                  </h3>
                  <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
                    {p.question}
                  </p>

                  {/* Features in 2 Spalten */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {p.features.map((f) => (
                      <div key={f} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                          <path d="M2 7l3.5 3.5L12 3" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rechts: Preis + CTA */}
                <div
                  className="flex flex-col items-center justify-center px-10 py-10 md:py-0 gap-6"
                  style={{
                    minWidth: "220px",
                    borderLeft: "1px solid var(--border)",
                    background: p.highlight ? "rgba(230,50,34,0.05)" : "rgba(0,0,0,0.1)",
                  }}
                >
                  <div className="text-center">
                    <div
                      className="font-mono-data font-bold"
                      style={{ fontSize: "48px", lineHeight: 1, color: p.highlight ? "var(--accent-red)" : "var(--text-primary)" }}
                    >
                      €{p.price}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>einmalig</div>
                  </div>

                  <Link
                    href={`/assessment?product=${p.id}`}
                    className={p.highlight ? "btn-primary justify-center text-sm w-full" : "btn-secondary justify-center text-sm w-full"}
                    style={{ textAlign: "center" }}
                  >
                    STARTEN →
                  </Link>

                  {/* Trust Points */}
                  <div className="flex flex-col gap-2 w-full">
                    {[
                      "Sofortiger Download",
                      "Einmalig, kein Abo",
                      "PDF inklusive",
                    ].map((point) => (
                      <div key={point} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                          <path d="M2 6l3 3 5-5" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {point}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
