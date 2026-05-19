"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Premium-Look full-width trust strip directly under the Hero.
// 4-column grid with vertical dividers + 5-star rating block — feels like
// a press / network bar, not a basic text line. Pure text + SVG, no logos
// (rechtlich sicher, no club marks).
const ITEM_KEYS = ["bundesliga", "national_team", "pro_clubs", "experience"] as const;

function FiveStars() {
  return (
    <span className={styles.trustBarStars} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function TrustBar() {
  const t = useTranslations("trust_bar");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.2 },
    );
    obs.observe(el);
  }, []);

  return (
    <section className={styles.trustBarSection}>
      <div ref={ref} className={`${styles.trustBarInner} ${styles.reveal}`}>
        <p className={styles.trustBarEyebrow}>{t("eyebrow")}</p>

        <div className={styles.trustBarGrid}>
          {ITEM_KEYS.map((key, i) => (
            <div key={key} className={styles.trustBarItem}>
              <span className={styles.trustBarItemLabel}>{t(`items.${key}`)}</span>
              {i < ITEM_KEYS.length - 1 && (
                <span className={styles.trustBarDivider} aria-hidden />
              )}
            </div>
          ))}
        </div>

        <div className={styles.trustBarRating}>
          <FiveStars />
          <span className={styles.trustBarRatingValue}>{t("rating_value")}</span>
          <span className={styles.trustBarRatingMeta}>{t("rating_meta")}</span>
        </div>
      </div>
    </section>
  );
}
