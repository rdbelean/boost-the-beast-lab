"use client";
import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

const CARDS = [
  {
    logo: "W",
    title: "WHOOP",
    metrics: "Schlaf · Recovery · Strain · HRV",
    days: "30 Tage Daten",
  },
  {
    logo: "",
    title: "APPLE HEALTH",
    metrics: "HRV · HF · Schritte · VO2max",
    days: "Direkt aus deinem iPhone",
  },
];

const USPS = [
  { icon: "30d", title: "30 Tage echte Daten", sub: "Keine Momentaufnahme, sondern der Durchschnitt." },
  { icon: "±", title: "Präzisere Scores", sub: "Gemessen statt geschätzt." },
  { icon: "🔒", title: "Daten bleiben bei dir", sub: "ZIP wird nur im Browser verarbeitet." },
  { icon: "✕", title: "Kein Zwang", sub: "Analyse funktioniert auch ohne Wearable." },
];

export default function WearableSync() {
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const uspsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targets = [headerRef.current, cardsRef.current, uspsRef.current].filter(
      (el): el is HTMLDivElement => el != null,
    );
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  return (
    <section className={styles.wearableSection}>
      <div className={styles.container}>
        <div
          ref={headerRef}
          className={`${styles.wearableHeader} ${styles.reveal}`}
        >
          <p className={styles.sectionLabel}>KOMPATIBLE GERÄTE</p>
          <h2 className={styles.sectionTitle}>
            DEINE DATEN. DEINE ANALYSE.
            <br />
            NOCH PRÄZISER.
          </h2>
          <p className={styles.wearableSubtitle}>
            Nutze Daten aus deinem WHOOP oder Apple Health um deine Scores auf
            das nächste Level zu heben. Kein anderes deutsches Analyse-System
            macht das.
          </p>
        </div>

        <div
          ref={cardsRef}
          className={`${styles.wearableCards} ${styles.reveal}`}
        >
          {CARDS.map((card) => (
            <div key={card.title} className={styles.wearableCard}>
              <div className={styles.wearableCardLogo} aria-hidden>
                {card.logo}
              </div>
              <div className={styles.wearableCardDays}>{card.days}</div>
              <div className={styles.wearableCardTitle}>{card.title}</div>
              <div className={styles.wearableCardMetrics}>{card.metrics}</div>
            </div>
          ))}
        </div>

        <div
          ref={uspsRef}
          className={`${styles.wearableUsps} ${styles.reveal}`}
        >
          {USPS.map((usp) => (
            <div key={usp.title} className={styles.wearableUsp}>
              <div className={styles.wearableUspIcon} aria-hidden>
                {usp.icon}
              </div>
              <div className={styles.wearableUspTitle}>{usp.title}</div>
              <div className={styles.wearableUspSub}>{usp.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
