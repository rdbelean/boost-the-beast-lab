"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

const STEP_KEYS = ["package", "signup", "protocol", "report"] as const;

export default function HowItWorks() {
  const t = useTranslations("how");
  const wrapRef = useRef<HTMLDivElement>(null);
  const numsRef = useRef<HTMLSpanElement[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);

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
      </div>
    </section>
  );
}
