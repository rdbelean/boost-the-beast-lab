"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Real testimonials lifted verbatim from boostthebeast.com/krasse-stimmen (Marcos
// Personal-Training site). We label them honestly: "these speak about Marco's 1:1
// coaching — the Lab is the same methodology as software". Doesn't feel manipulative,
// and it's the only social proof available before Lab-customer testimonials pile up.
const TESTIMONIAL_KEYS = ["1", "2", "3"] as const;

// Marco's Google Business link surfaces on the "all 80 reviews" CTA. Keep
// externalized here instead of hardcoding in every locale string since the
// URL is the same across languages.
const GOOGLE_REVIEWS_URL = "https://g.page/boostthebeast";

const STAR = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path d="M9 1.5l2.36 4.78 5.27.77-3.82 3.72.9 5.25L9 13.55l-4.71 2.47.9-5.25L1.37 7.05l5.27-.77L9 1.5z" fill="#F5A623" />
  </svg>
);

export default function SocialProof() {
  const t = useTranslations("social_proof");
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const el = headerRef.current;
    if (el) {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
        { threshold: 0.2 },
      );
      obs.observe(el);
    }
    cardRefs.current.forEach((node, i) => {
      if (!node) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => node.classList.add(styles.visible), i * 120);
            obs.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      obs.observe(node);
    });
  }, []);

  return (
    <section className={styles.socialProofSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.socialProofHeader} ${styles.reveal}`}>
          {/* Big trust badge: 5,0★ + 80 reviews + verification source. */}
          <div className={styles.socialProofBadge}>
            <div className={styles.socialProofStars} aria-label={t("badge_rating")}>
              {STAR}{STAR}{STAR}{STAR}{STAR}
            </div>
            <div className={styles.socialProofBadgeText}>
              <span className={styles.socialProofRating}>{t("badge_rating")}</span>
              <span className={styles.socialProofDot}>·</span>
              <span className={styles.socialProofReviews}>{t("badge_reviews_count")}</span>
            </div>
            <span className={styles.socialProofSource}>{t("badge_source")}</span>
          </div>

          <p className={styles.sectionLabel}>{t("eyebrow")}</p>
          <h2 className={styles.sectionTitle}>{t("headline")}</h2>
          <p className={styles.socialProofDisclaimer}>{t("context_disclaimer")}</p>
        </div>

        <div className={styles.socialProofGrid}>
          {TESTIMONIAL_KEYS.map((id, i) => (
            <div
              key={id}
              ref={(el) => { if (el) cardRefs.current[i] = el; }}
              className={`${styles.socialProofCard} ${styles.reveal}`}
            >
              <div className={styles.socialProofCardStars} aria-hidden>
                {STAR}{STAR}{STAR}{STAR}{STAR}
              </div>
              <blockquote className={styles.socialProofQuote}>
                &ldquo;{t(`testimonials.${id}.quote`)}&rdquo;
              </blockquote>
              <div className={styles.socialProofAttribution}>
                <span className={styles.socialProofName}>{t(`testimonials.${id}.name`)}</span>
                <span className={styles.socialProofMeta}>{t(`testimonials.${id}.meta`)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.socialProofFooter}>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialProofAllReviews}
          >
            {t("all_reviews_cta")}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
