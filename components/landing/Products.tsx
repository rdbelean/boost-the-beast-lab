"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

const CheckIcon = ({ color = "#22C55E" }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 7l3.5 3.5L12 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const products = [
  {
    id: "metabolic",
    tag: "EINZELREPORT",
    name: "METABOLIC PERFORMANCE SCORE",
    question: "Wie effizient arbeitet dein Stoffwechsel?",
    price: 29,
    highlight: false,
    features: [
      "BMI & Körperkompositions-Analyse",
      "Ernährungs- & Hydrations-Score",
      "Sitzzeit & Lifestyle-Bewertung",
      "AI-generierte Empfehlungen",
      "Premium PDF Report",
    ],
  },
  {
    id: "recovery",
    tag: "EINZELREPORT",
    name: "RECOVERY & REGENERATION SCORE",
    question: "Wie gut erholt sich dein Körper?",
    price: 29,
    highlight: false,
    features: [
      "Schlafqualität & -dauer Analyse",
      "Regenerations-Effizienz-Score",
      "Stressbelastungs-Index",
      "AI-generierte Empfehlungen",
      "Premium PDF Report",
    ],
  },
  {
    id: "complete-analysis",
    tag: "BUNDLE — BESTSELLER",
    name: "COMPLETE PERFORMANCE ANALYSIS",
    question: "Alle Scores. Ein vollständiger Report.",
    price: 79,
    highlight: true,
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
  },
];

export default function Products() {
  const refs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => { el.classList.add(styles.visible); }, i * 100);
            obs.disconnect();
          }
        },
        { threshold: 0.12 }
      );
      obs.observe(el);
    });
  }, []);

  const headerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
  }, []);

  return (
    <section id="products" className={styles.productsSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.productsHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>DEINE REPORTS</p>
          <h2 className={styles.sectionTitle}>WÄHLE DEINEN REPORT</h2>
        </div>

        <div className={styles.cardsStack}>
          {products.map((p, i) => (
            <div
              key={p.id}
              ref={(el) => { if (el) refs.current[i] = el; }}
              className={`${styles.card} ${p.highlight ? styles.cardHighlight : ""} ${styles.reveal}`}
            >
              {/* Left */}
              <div className={styles.cardLeft}>
                {p.highlight ? (
                  <span className={`${styles.cardTag} ${styles.cardTagHighlight}`}>{p.tag}</span>
                ) : (
                  <span className={styles.cardTag}>{p.tag}</span>
                )}
                <h3 className={styles.cardName}>{p.name}</h3>
                <p className={styles.cardQuestion}>{p.question}</p>
                <div className={styles.featuresGrid}>
                  {p.features.map((f) => (
                    <div key={f} className={styles.featureItem}>
                      <CheckIcon color={p.highlight ? "#E63222" : "#22C55E"} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right */}
              <div className={`${styles.cardRight} ${p.highlight ? styles.cardRightHighlight : ""}`}>
                <div className={`${styles.price} ${p.highlight ? styles.priceAccent : ""}`}>
                  €{p.price}
                </div>
                <div className={styles.priceSub}>einmalig</div>

                <Link
                  href={`/assessment?product=${p.id}`}
                  className={`${styles.cardBtn} ${p.highlight ? styles.cardBtnPrimary : styles.cardBtnSecondary}`}
                >
                  STARTEN →
                </Link>

                <div className={styles.trustPoints}>
                  {["Sofortiger Download", "Einmalig, kein Abo", "PDF inklusive"].map((t) => (
                    <div key={t} className={styles.trustPoint}>
                      <CheckIcon color="#22C55E" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
