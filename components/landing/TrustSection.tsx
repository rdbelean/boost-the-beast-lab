"use client";
import { motion } from "framer-motion";

const trustItems = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 3L5 9v9c0 6.075 4.925 11 11 11s11-4.925 11-11V9L16 3z" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M11 16l4 4 7-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "EVIDENZBASIERT",
    description: "Basierend auf WHO & ACSM Richtlinien. Wissenschaftlich kalibriert.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" stroke="var(--accent-red)" strokeWidth="1.5"/>
        <path d="M16 9v7l4.5 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "UNTER 5 MINUTEN",
    description: "KI-generiertes Ergebnis in unter 5 Minuten. Sofort verfügbar.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M8 4h12l8 8v16H8V4z" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M20 4v8h8" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 16h8M12 21h8M12 26h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "PREMIUM PDF",
    description: "Lab-Quality Report. Personalisiert, professionell, druckfertig.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 3l3.09 6.26L26 10.27l-5 4.87 1.18 6.88L16 18.77l-6.18 3.25L11 15.14 6 10.27l6.91-1.01L16 3z" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    title: "KEIN ARZTTERMIN",
    description: "Kein Labor, kein Wartezimmer. Performance Insights — sofort.",
  },
];

export default function TrustSection() {
  return (
    <section style={{ background: "var(--bg-section-alt)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {trustItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "36px 28px",
              }}
            >
              <div className="mb-5">{item.icon}</div>
              <div className="font-headline text-sm font-bold tracking-widest mb-3" style={{ color: "var(--text-primary)" }}>
                {item.title}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
