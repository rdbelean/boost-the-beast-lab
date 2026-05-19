"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Three pain-cards sit right after the trust bar. Copy is provocative-but-
// specific so the reader nods before the HowItWorks-Section walks them
// through the mechanism. Intersection-observer for a staggered reveal
// matches the rest of the page.
const CARDS = ["1", "2", "3"] as const;

export default function PainPoints() {
  const t = useTranslations("pain_points");
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const transitionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (el) {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
        { threshold: 0.2 },
      );
      obs.observe(el);
    }
    cardRefs.current.forEach((node, i) => {
      if (!node) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => node.classList.add(styles.visible), i * 100);
            obs.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      obs.observe(node);
    });
    const t = transitionRef.current;
    if (t) {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { t.classList.add(styles.visible); obs.disconnect(); } },
        { threshold: 0.2 },
      );
      obs.observe(t);
    }
  }, []);

  return (
    <section className={styles.painSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.painHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>{t("eyebrow")}</p>
          <h2 className={styles.sectionTitle}>{t("headline")}</h2>
          <p className={styles.painSubtitle}>{t("subtitle")}</p>
        </div>

        <div className={styles.painGrid}>
          {CARDS.map((id, i) => (
            <div
              key={id}
              ref={(el) => { if (el) cardRefs.current[i] = el; }}
              className={`${styles.painCard} ${styles.reveal}`}
            >
              <span className={styles.painCardNum}>{`0${i + 1}`}</span>
              <h3 className={styles.painCardTitle}>{t(`cards.${id}.title`)}</h3>
              <p className={styles.painCardBody}>{t(`cards.${id}.body`)}</p>
            </div>
          ))}
        </div>

        {/* Bridge to FounderMarco/HowItWorks — explicit handoff to authority */}
        <p ref={transitionRef} className={`${styles.painTransition} ${styles.reveal}`}>
          {t("transition")}
        </p>
      </div>
    </section>
  );
}
