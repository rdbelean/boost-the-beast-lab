"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// 24-hour money-back card. Sits right under <Products /> as risk-reversal
// directly at the pricing block. Refund process is manual via Stripe
// dashboard — the conditions line under the trust-symbols spells out the
// concrete email + 5-7 business-days timeline so the promise is honest.
export default function GuaranteeCard() {
  const t = useTranslations("guarantee");
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

  return (
    <section className={styles.guaranteeSection}>
      <div className={styles.container}>
        <div ref={ref} className={`${styles.guaranteeCard} ${styles.reveal}`}>
          <div className={styles.guaranteeIcon} aria-hidden>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2l10 4v8c0 6.5-4.5 11-10 12-5.5-1-10-5.5-10-12V6l10-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 14l3.5 3.5L19 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className={styles.guaranteeHeadline}>{t("headline")}</h3>
          <p className={styles.guaranteeBody}>{t("body")}</p>
          <p className={styles.guaranteeSubtext}>{t("subtext")}</p>
          <p className={styles.guaranteeTrustLine}>{t("trust_line")}</p>
          <p className={styles.guaranteeConditions}>{t("conditions")}</p>
        </div>
      </div>
    </section>
  );
}
