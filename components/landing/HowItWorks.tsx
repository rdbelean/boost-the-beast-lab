"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Three steps (questionnaire → analysis → report). Account-creation is now
// folded into the questionnaire step — it happens implicitly during the
// flow and doesn't deserve its own step.
const STEP_KEYS = ["questionnaire", "analysis", "report"] as const;

export default function HowItWorks() {
  const t = useTranslations("how");
  const wrapRef = useRef<HTMLDivElement>(null);
  const numsRef = useRef<HTMLSpanElement[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    numsRef.current.forEach((el) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
        { threshold: 0.4 }
      );
      obs.observe(el);
    });
  }, []);

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
    const el = ctaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.2 }
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
    <section id="how-it-works" className={styles.howSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.howHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>{t("section_label")}</p>
          <h2 className={styles.sectionTitle}>{t("section_title")}</h2>
        </div>

        <div className={styles.stepsWrap} ref={wrapRef}>
          {STEP_KEYS.map((key, i) => (
            <div key={key} className={styles.step}>
              <span
                className={styles.stepNum}
                ref={(el) => { if (el) numsRef.current[i] = el; }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className={styles.stepContent}>
                <p className={styles.stepTag}>{t(`steps.${key}.tag`)}</p>
                <h3 className={styles.stepHeading}>{t(`steps.${key}.title`)}</h3>
                <p className={styles.stepText}>{t(`steps.${key}.text`)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA after the 3 steps — drives intent right after the mechanism
            has been explained. Same scroll-to-products as the hero CTA. */}
        <div ref={ctaRef} className={`${styles.howCtaRow} ${styles.reveal}`}>
          <button className={styles.btnPrimary} onClick={scrollToProducts}>
            {t("cta_primary")}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
