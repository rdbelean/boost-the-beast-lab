"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Full-width trust strip directly under the Hero. Pure text — no logos,
// no banners — because the categorical claim ("Bundesliga · National team
// players · 15+ years 1:1 coaching") is the actual differentiator on the
// German market and is rechtlich sicher (no club marks).
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
        <p className={styles.trustBarBody}>{t("body")}</p>
        <p className={styles.trustBarSub}>{t("sub")}</p>
      </div>
    </section>
  );
}
