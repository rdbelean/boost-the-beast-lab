"use client";
import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

const steps = [
  {
    num: "01",
    tag: "ANALYSE",
    title: "15 WISSENSCHAFTLICHE FRAGEN",
    text: "Beantworte präzise Fragen zu Schlaf, Training, Ernährung, Stress und Körperdaten — kalibriert nach WHO & ACSM Richtlinien.",
  },
  {
    num: "02",
    tag: "ENGINE",
    title: "KI BERECHNET DEINE SCORES",
    text: "Unser Scoring-Algorithmus analysiert 4 Performance-Dimensionen: Metabolismus, Recovery, Aktivität und Stress & Lifestyle.",
  },
  {
    num: "03",
    tag: "REPORT",
    title: "DEIN PERSONALISIERTER REPORT",
    text: "Claude AI generiert einen maßgeschneiderten Report mit konkreten Handlungsempfehlungen — sofort als Premium PDF verfügbar.",
  },
];

export default function HowItWorks() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const numsRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    // Progress line driven by scroll
    const onScroll = () => {
      const wrap = wrapRef.current;
      const fill = fillRef.current;
      if (!wrap || !fill) return;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const pct = Math.max(0, Math.min(1, (vh - rect.top) / (rect.height + vh * 0.3)));
      fill.style.height = `${pct * 100}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Clip-path reveal on step numbers
    numsRef.current.forEach((el) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
        { threshold: 0.4 }
      );
      obs.observe(el);
    });
  }, []);

  // Scroll reveal for section header
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
    <section id="how-it-works" className={styles.howSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.howHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>DER PROZESS</p>
          <h2 className={styles.sectionTitle}>SO FUNKTIONIERT&apos;S</h2>
        </div>

        <div className={styles.stepsWrap} ref={wrapRef}>
          {/* Vertical progress line */}
          <div className={styles.stepLine}>
            <div className={styles.stepLineFill} ref={fillRef} />
          </div>

          {steps.map((step, i) => (
            <div key={step.num} className={styles.step}>
              <span
                className={styles.stepNum}
                ref={(el) => { if (el) numsRef.current[i] = el; }}
              >
                {step.num}
              </span>
              <div className={styles.stepContent}>
                <p className={styles.stepTag}>{step.tag}</p>
                <h3 className={styles.stepHeading}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
