"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Final closer block — full-width dark section with a single big CTA.
// Same scroll-target as Hero / HowItWorks / MarcoExplanation: #products.
export default function FinalCTA() {
  const t = useTranslations("final_cta");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
  }, []);

  function scrollToProducts() {
    const target = document.getElementById("products");
    if (target) {
      const top = window.scrollY + target.getBoundingClientRect().top;
      window.scrollTo({ top, behavior: "auto" });
    }
  }

  return (
    <section className={styles.finalCtaSection}>
      <div ref={ref} className={`${styles.finalCtaInner} ${styles.reveal}`}>
        <h2 className={styles.finalCtaHeadline}>{t("headline")}</h2>
        <p className={styles.finalCtaBody}>{t("body")}</p>
        <button className={`${styles.btnPrimary} ${styles.finalCtaButton}`} onClick={scrollToProducts}>
          {t("cta")}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <p className={styles.finalCtaMicro}>{t("micro")}</p>
      </div>
    </section>
  );
}
