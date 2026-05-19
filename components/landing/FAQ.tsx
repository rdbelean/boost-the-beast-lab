"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// 7 most common objections, native <details>/<summary> accordion (no
// npm dependency). Chevron rotation animated via CSS. Each item is
// independent — multiple can be open at once, which is what we want
// for a scannable Q-and-A section.
// Note: item 8 ("money-back guarantee" question) is intentionally not in
// the list on main. Lives only on the prompt-experiment-v1 preview branch
// until the refund process is operationalised.
const ITEMS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export default function FAQ() {
  const t = useTranslations("faq");
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    [headerRef, listRef].forEach((ref, i) => {
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
    <section className={styles.faqSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.faqHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>{t("eyebrow")}</p>
          <h2 className={styles.sectionTitle}>{t("headline")}</h2>
        </div>

        <div ref={listRef} className={`${styles.faqList} ${styles.reveal}`}>
          {ITEMS.map((id) => (
            <details key={id} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQuestionText}>{t(`items.${id}.q`)}</span>
                <span className={styles.faqChevron} aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </summary>
              <p className={styles.faqAnswer}>{t(`items.${id}.a`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
