"use client";
import { useEffect, useRef, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// "Here's the difference" — the answer to the pain-points the user just nodded
// at. Three pillars: scientific depth (brain), real personalisation (user),
// speed (clock). Inline SVGs so we don't pull in an icon library just for
// three glyphs — matches the existing Hero/Trust pattern.
const ICON_PROPS = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.6, stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const BrainIcon = (): ReactElement => (
  <svg {...ICON_PROPS} aria-hidden>
    <path d="M9.5 2a3 3 0 0 0-3 3v.5A3.5 3.5 0 0 0 3 9a3.5 3.5 0 0 0 1.5 2.87A3.5 3.5 0 0 0 3 15a3.5 3.5 0 0 0 3.5 3.5V19a3 3 0 0 0 3 3 2.5 2.5 0 0 0 2.5-2.5V4.5A2.5 2.5 0 0 0 9.5 2Z" />
    <path d="M14.5 2a3 3 0 0 1 3 3v.5A3.5 3.5 0 0 1 21 9a3.5 3.5 0 0 1-1.5 2.87A3.5 3.5 0 0 1 21 15a3.5 3.5 0 0 1-3.5 3.5V19a3 3 0 0 1-3 3 2.5 2.5 0 0 1-2.5-2.5V4.5A2.5 2.5 0 0 1 14.5 2Z" />
  </svg>
);

const UserIcon = (): ReactElement => (
  <svg {...ICON_PROPS} aria-hidden>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ClockIcon = (): ReactElement => (
  <svg {...ICON_PROPS} aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const COLS = [
  { key: "science", Icon: BrainIcon },
  { key: "personal", Icon: UserIcon },
  { key: "fast", Icon: ClockIcon },
] as const;

export default function SolutionReveal() {
  const t = useTranslations("solution");
  const headerRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const el = headerRef.current;
    if (el) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add(styles.visible);
            obs.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      obs.observe(el);
    }
    colRefs.current.forEach((node, i) => {
      if (!node) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => node.classList.add(styles.visible), i * 120);
            obs.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      obs.observe(node);
    });
  }, []);

  return (
    <section className={styles.solutionSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.solutionHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>{t("eyebrow")}</p>
          <h2 className={styles.sectionTitle}>{t("headline")}</h2>
          <p className={styles.solutionBody}>{t("body")}</p>
        </div>

        <div className={styles.solutionGrid}>
          {COLS.map(({ key, Icon }, i) => (
            <div
              key={key}
              ref={(el) => { if (el) colRefs.current[i] = el; }}
              className={`${styles.solutionCard} ${styles.reveal}`}
            >
              <div className={styles.solutionIcon} aria-hidden>
                <Icon />
              </div>
              <h3 className={styles.solutionCardTitle}>{t(`cols.${key}.title`)}</h3>
              <p className={styles.solutionCardBody}>{t(`cols.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
