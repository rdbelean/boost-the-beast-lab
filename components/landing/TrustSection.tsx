"use client";
import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

const items = [
  {
    title: "EVIDENZBASIERT",
    text: "Basierend auf WHO & ACSM Richtlinien. Wissenschaftlich kalibriert.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M18 3L6 10v10c0 7.18 5.82 13 12 13s12-5.82 12-13V10L18 3z"
          stroke="#E63222" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 18l5 5 8-8" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "UNTER 5 MINUTEN",
    text: "KI-generiertes Ergebnis in unter 5 Minuten. Sofort verfügbar.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="14" stroke="#E63222" strokeWidth="1.5"/>
        <path d="M18 10v8l5 2.5" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "PREMIUM PDF",
    text: "Lab-Quality Report. Personalisiert, professionell, druckfertig.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M10 4h14l9 9v19H10V4z" stroke="#E63222" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M24 4v9h9" stroke="#E63222" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M14 18h8M14 24h8M14 30h5" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "KEIN ARZTTERMIN",
    text: "Kein Labor, kein Wartezimmer. Performance Insights — sofort.",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M18 3l3.5 7 7.5 1.1-5.5 5.4 1.3 7.7L18 21l-6.8 3.2 1.3-7.7L7 11.1l7.5-1.1L18 3z"
          stroke="#E63222" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function TrustSection() {
  const refs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add(styles.visible), i * 80);
            obs.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
    });
  }, []);

  return (
    <section className={styles.trustSection}>
      <div className={styles.container}>
        <div className={styles.trustGrid}>
          {items.map((item, i) => (
            <div
              key={item.title}
              ref={(el) => { if (el) refs.current[i] = el; }}
              className={`${styles.trustCard} ${styles.reveal}`}
            >
              <div className={styles.trustIcon}>{item.icon}</div>
              <h3 className={styles.trustTitle}>{item.title}</h3>
              <p className={styles.trustText}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
