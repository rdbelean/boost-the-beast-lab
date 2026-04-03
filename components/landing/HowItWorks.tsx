"use client";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    label: "ANALYSE",
    title: "15 wissenschaftliche Fragen",
    description:
      "Beantworte präzise Fragen zu Schlaf, Training, Ernährung, Stress und Körperdaten — kalibriert nach WHO & ACSM Richtlinien.",
  },
  {
    number: "02",
    label: "ENGINE",
    title: "KI berechnet deine Scores",
    description:
      "Unser Scoring-Algorithmus analysiert 4 Performance-Dimensionen: Metabolismus, Recovery, Aktivität und Stress & Lifestyle.",
  },
  {
    number: "03",
    label: "REPORT",
    title: "Dein personalisierter Report",
    description:
      "Claude AI generiert einen maßgeschneiderten Report mit konkreten Handlungsempfehlungen — sofort als Premium PDF verfügbar.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{ background: "var(--bg-section-alt)", borderTop: "3px solid var(--accent-red)" }}
    >
      <div className="max-w-6xl mx-auto px-8 py-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="font-headline text-xs tracking-[0.45em] mb-5" style={{ color: "var(--accent-red)" }}>
            DER PROZESS
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
            SO FUNKTIONIERT'S
          </h2>
        </motion.div>

        {/* Steps — vertikal, mit Trennlinie */}
        <div className="flex flex-col">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {/* Trennlinie vor jedem Schritt */}
              <div style={{ height: "1px", background: "var(--border)", marginBottom: "48px" }} />

              {/* Schritt-Inhalt: Nummer links, Text rechts */}
              <div className="flex gap-12 items-start pb-12">

                {/* Nummer */}
                <div
                  className="font-headline font-bold flex-shrink-0"
                  style={{
                    fontSize: "72px",
                    lineHeight: 1,
                    color: "var(--accent-red)",
                    opacity: 0.9,
                    fontFamily: "'Oswald', sans-serif",
                    width: "90px",
                  }}
                >
                  {step.number}
                </div>

                {/* Text */}
                <div className="flex-1 pt-2">
                  <div className="font-headline text-xs tracking-[0.35em] mb-3" style={{ color: "var(--text-muted)" }}>
                    {step.label}
                  </div>
                  <h3 className="font-headline text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                    {step.title}
                  </h3>
                  <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "480px" }}>
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Abschlusslinie */}
          <div style={{ height: "1px", background: "var(--border)" }} />
        </div>
      </div>
    </section>
  );
}
