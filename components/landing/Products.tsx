"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import styles from "@/app/landing.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const CheckIcon = ({ color = "#22C55E" }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 7l3.5 3.5L12 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const features = [
  "Overall Performance Index (0–100)",
  "Metabolic Performance Score",
  "Recovery & Regeneration Score",
  "Activity Performance Score",
  "Stress & Lifestyle Score",
  "VO2max Schätzung (ml/kg/min)",
  "Individuelle Optimierungspläne",
  "Individuelle Trainingspläne",
  "30-Tage Performance Prognose",
  "KI-generierter Premium PDF Report",
];

export default function Products() {
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
  }, []);

  return (
    <section id="products" className={styles.productsSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.productsHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>DEIN PAKET</p>
          <h2 className={styles.sectionTitle}>COMPLETE PERFORMANCE ANALYSIS</h2>
        </div>

        <div className={styles.cardsStack}>
          <div
            ref={cardRef}
            className={`${styles.card} ${styles.cardHighlight} ${styles.reveal}`}
          >
            {/* Left */}
            <div className={styles.cardLeft}>
              <span className={`${styles.cardTag} ${styles.cardTagHighlight}`}>VOLLSTÄNDIGES PAKET</span>
              <h3 className={styles.cardName}>COMPLETE PERFORMANCE ANALYSIS</h3>
              <p className={styles.cardQuestion}>Dein vollständiger Performance Report + individuelle Optimierungs- & Trainingspläne.</p>
              <div className={styles.featuresGrid}>
                {features.map((f) => (
                  <div key={f} className={styles.featureItem}>
                    <CheckIcon color="#E63222" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className={`${styles.cardRight} ${styles.cardRightHighlight}`}>
              <div className={`${styles.price} ${styles.priceAccent}`}>
                €39<span style={{ fontSize: "0.55em", verticalAlign: "super" }}>,90</span>
              </div>
              <div className={styles.priceSub}>einmalig</div>

              <button
                onClick={async () => {
                  const supabase = getSupabaseBrowserClient();
                  const { data } = await supabase.auth.getUser();
                  router.push(data.user ? "/kaufen" : "/login?next=/kaufen");
                }}
                className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
              >
                ANALYSE STARTEN →
              </button>

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
        </div>
      </div>
    </section>
  );
}
