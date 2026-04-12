"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

function countUp(el: HTMLElement, target: number, suffix: string, duration = 1500) {
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const stats = [
  { target: 20,  suffix: "",   prefix: "",    label: "FRAGEN" },
  { target: 5,   suffix: "",   prefix: "",    label: "SCORES" },
  { target: 0,   suffix: "",   prefix: "",    label: "TIEFGEHENDE AUSWERTUNG", static: true },
  { target: 0,   suffix: "",   prefix: "",    label: "EVIDENZBASIERTE DATENBANK", static: true },
];

export default function Hero() {
  const statsRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const container = statsRef.current;
    if (!container) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          container.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
            const target = Number(el.dataset.count);
            const suffix = el.dataset.suffix ?? "";
            const prefix = el.dataset.prefix ?? "";
            const start = performance.now();
            const step = (now: number) => {
              const progress = Math.min((now - start) / 1500, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              el.textContent = prefix + Math.round(eased * target) + suffix;
              if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          });
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.heroNoise} aria-hidden />
      <div className={styles.heroGhost} aria-hidden>BEAST</div>

      <div className={`${styles.container} ${styles.heroInner}`}>
        {/* Eyebrow */}
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden />
          <span className={styles.eyebrowText}>PERFORMANCE INTELLIGENCE SYSTEM</span>
        </div>

        {/* Headline */}
        <h1 className={styles.headline}>
          <span className={styles.headlineLine}>DEIN KÖRPER.</span>
          <span className={styles.headlineLine}>DEINE DATEN.</span>
          <span className={`${styles.headlineLine} ${styles.headlineAccent}`}>DEIN LEVEL.</span>
        </h1>

        {/* Subtitle */}
        <p className={styles.subtitle}>
          Performance Diagnostik auf wissenschaftlichem Niveau — ohne Labor, ohne Wartezeit.
        </p>

        {/* CTAs */}
        <div className={styles.ctaRow}>
          <a href="#products" className={styles.btnPrimary}>
            ANALYSE STARTEN
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#how-it-works" className={styles.btnSecondary}>
            WIE ES FUNKTIONIERT
          </a>
        </div>

        {/* Stats */}
        <div className={styles.statsBar} ref={statsRef}>
          {stats.map(({ target, suffix, prefix, label, static: isStatic }) => (
            <div key={label} className={styles.statItem}>
              {isStatic ? (
                <span className={styles.statValue} style={{ color: "var(--accent, #E63222)", fontSize: "20px" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden style={{ display: "block" }}>
                    <path d="M3 11l5.5 5.5L19 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              ) : (
                <span
                  className={styles.statValue}
                  data-count={target}
                  data-suffix={suffix}
                  data-prefix={prefix}
                >
                  {prefix}0{suffix}
                </span>
              )}
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={styles.scrollIndicator} aria-hidden>
        <span className={styles.scrollText}>SCROLL</span>
        <span className={styles.scrollArrow}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </section>
  );
}
