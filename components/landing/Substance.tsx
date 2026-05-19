"use client";
import { useEffect, useRef, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// "What's actually in the analysis?" — two-column facts section that
// follows Marco's letter. Left: the scientific basis (WHO/ACSM/AASM,
// 10,000+ data points). Right: what the user actually gets out of it
// (5 scores, 4 12-week plans, Master Weekly Plan). The bridge-lead
// connects emotional trust → factual substance.
const BASIS_ITEMS = ["1", "2", "3", "4", "5", "6", "7"] as const;
const OUTPUT_ITEMS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

function CheckIcon({ tint }: { tint: "muted" | "accent" }): ReactElement {
  const color = tint === "accent" ? "var(--accent)" : "var(--text-muted)";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 4 }}>
      <path d="M2 7l3 3 7-7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Substance() {
  const t = useTranslations("substance");
  const headerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    [headerRef, leftRef, rightRef].forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add(styles.visible), i * 100);
            obs.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      obs.observe(el);
    });
  }, []);

  return (
    <section className={styles.substanceSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.substanceHeader} ${styles.reveal}`}>
          <p className={styles.substanceBridge}>{t("bridge")}</p>
          <p className={styles.sectionLabel}>{t("eyebrow")}</p>
          <h2 className={styles.sectionTitle}>{t("headline")}</h2>
          <p className={styles.substanceSub}>{t("sub")}</p>
        </div>

        <div className={styles.substanceGrid}>
          <div ref={leftRef} className={`${styles.substanceColumn} ${styles.reveal}`}>
            <p className={styles.substanceColHeader}>{t("basis.header")}</p>
            <ul className={styles.substanceList}>
              {BASIS_ITEMS.map((id) => (
                <li key={id} className={styles.substanceItem}>
                  <CheckIcon tint="muted" />
                  <span>{t(`basis.items.${id}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div ref={rightRef} className={`${styles.substanceColumn} ${styles.reveal}`}>
            <p className={`${styles.substanceColHeader} ${styles.substanceColHeaderAccent}`}>{t("output.header")}</p>
            <ul className={styles.substanceList}>
              {OUTPUT_ITEMS.map((id) => (
                <li key={id} className={styles.substanceItem}>
                  <CheckIcon tint="accent" />
                  <span>{t(`output.items.${id}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className={styles.substanceCloser}>{t("closer")}</p>
      </div>
    </section>
  );
}
