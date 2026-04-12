"use client";
import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

const steps = [
  {
    num: "01",
    tag: "PAKET WÄHLEN",
    title: "DEIN PERFORMANCE-PAKET",
    text: "Wähle deinen vollständigen Performance Report inkl. individueller Optimierungs- & Trainingspläne — einmalig, kein Abo.",
  },
  {
    num: "02",
    tag: "ANMELDEN",
    title: "ACCOUNT ERSTELLEN",
    text: "Erstelle deinen sicheren Account mit E-Mail & Passwort — damit dein Report dauerhaft gespeichert und jederzeit abrufbar ist.",
  },
  {
    num: "03",
    tag: "ANALYSE-PROTOKOLL",
    title: "20 WISSENSCHAFTLICHE FRAGEN",
    text: "Beantworte präzise Fragen zu Schlaf, Training, Ernährung, Stress und Körperdaten — kalibriert nach WHO & ACSM Richtlinien.",
  },
  {
    num: "04",
    tag: "REPORT",
    title: "DEIN PERSONALISIERTER REPORT",
    text: "Dein Performance Report mit Fitnessscore, Einzelanalysen und individuellen Optimierungsplänen — sofort als Premium PDF verfügbar.",
  },
];

export default function HowItWorks() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const numsRef = useRef<HTMLSpanElement[]>([]);

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
