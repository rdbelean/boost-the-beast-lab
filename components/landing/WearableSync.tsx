"use client";
import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

const CARDS = [
  {
    title: "WHOOP",
    metrics: "Schlaf · Recovery · Strain · HRV",
    days: "30 Tage Daten",
    logo: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
        <circle cx="20" cy="20" r="15" stroke="#E63222" strokeWidth="1.5" />
        <path
          d="M11 16l3 9 3-7 3 7 3-9"
          stroke="#E63222"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 16l3 9"
          stroke="#E63222"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "APPLE HEALTH",
    metrics: "HRV · HF · Schritte · VO2max",
    days: "Direkt aus deinem iPhone",
    logo: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
        <path
          d="M20 32s-11-6.8-11-15.5A6.5 6.5 0 0 1 20 12a6.5 6.5 0 0 1 11 4.5C31 25.2 20 32 20 32z"
          stroke="#E63222"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M12 20h4l2-4 3 8 2-4h5"
          stroke="#E63222"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const USPS = [
  {
    title: "30 Tage echte Daten",
    sub: "Keine Momentaufnahme, sondern der Durchschnitt.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect x="4" y="6" width="20" height="18" rx="2" stroke="#E63222" strokeWidth="1.5" />
        <path d="M4 11h20" stroke="#E63222" strokeWidth="1.5" />
        <path d="M9 4v4M19 4v4" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 17l3 3 6-6" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Präzisere Scores",
    sub: "Gemessen statt geschätzt.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <path d="M4 22h20" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 22V14M12 22V9M18 22V11M24 22V6" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Daten bleiben bei dir",
    sub: "ZIP wird nur im Browser verarbeitet.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect x="6" y="13" width="16" height="11" rx="2" stroke="#E63222" strokeWidth="1.5" />
        <path d="M9 13v-3a5 5 0 0 1 10 0v3" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="18" r="1.5" fill="#E63222" />
      </svg>
    ),
  },
  {
    title: "Kein Muss",
    sub: "Analyse funktioniert vollständig ohne Wearable.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <circle cx="14" cy="14" r="10" stroke="#E63222" strokeWidth="1.5" />
        <path d="M14 9v5l3 2" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
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
          <div className={styles.wearableOptionalBadge}>
            <span className={styles.wearableOptionalDot} aria-hidden />
            OPTIONAL · KEIN MUSS
          </div>
          <p className={styles.sectionLabel}>KOMPATIBLE GERÄTE</p>
          <h2 className={styles.sectionTitle}>
            DEINE DATEN. DEINE ANALYSE.
            <br />
            NOCH PRÄZISER.
          </h2>
          <p className={styles.wearableSubtitle}>
            Die komplette Analyse funktioniert auch <strong>ohne Wearable</strong>.
            Wer eins hat, kann WHOOP oder Apple Health optional verbinden — als
            Add-on, um die Scores mit echten Daten zu schärfen.
          </p>
        </div>

        <div
          ref={cardsRef}
          className={`${styles.wearableCards} ${styles.reveal}`}
        >
          {CARDS.map((card) => (
            <div key={card.title} className={styles.wearableCard}>
              <div className={styles.wearableCardHead}>
                <div className={styles.wearableCardLogo} aria-hidden>
                  {card.logo}
                </div>
                <span className={styles.wearableCardPill}>ADD-ON</span>
              </div>
              <div className={styles.wearableCardTitle}>{card.title}</div>
              <div className={styles.wearableCardMetrics}>{card.metrics}</div>
              <div className={styles.wearableCardDays}>{card.days}</div>
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
