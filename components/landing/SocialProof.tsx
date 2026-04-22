"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Case-study subjects: pro footballers Marco coached for years. Swapping out
// the old 1:1-coaching testimonials because elite-athlete pedigree is stronger
// social proof than anonymous weight-loss quotes, and ties the Lab methodology
// to measurable pro-level outcomes. More athletes exist — we surface two to
// avoid bloat and signal "more available" via a footer hint.
const CASE_STUDIES = [
  {
    id: "jens",
    photoSrc: "/marco-jens.jpg",
    hasPhoto: true,
    photoAlt: "Jens Castrop mit Marco",
    initials: "JC",
  },
  {
    id: "mehmet",
    photoSrc: "/mehmet-aydin.jpg",
    hasPhoto: true,
    photoAlt: "Mehmet Aydin mit Marco",
    initials: "MA",
  },
] as const;

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
          {CASE_STUDIES.map((study, i) => (
            <div
              key={study.id}
              ref={(el) => { if (el) cardRefs.current[i] = el; }}
              className={`${styles.socialProofCard} ${styles.caseStudyCard} ${styles.reveal}`}
            >
              <div className={styles.caseStudyPhoto}>
                {study.hasPhoto ? (
                  <Image
                    src={study.photoSrc}
                    alt={study.photoAlt}
                    width={600}
                    height={600}
                    sizes="(max-width: 900px) 90vw, 440px"
                    className={styles.caseStudyPhotoImg}
                  />
                ) : (
                  <div className={styles.caseStudyPhotoFallback} aria-hidden>
                    <span className={styles.caseStudyInitials}>{study.initials}</span>
                  </div>
                )}
              </div>
              <div className={styles.caseStudyBody}>
                <span className={styles.caseStudyClub}>{t(`case_studies.${study.id}.club`)}</span>
                <h3 className={styles.caseStudyName}>{t(`case_studies.${study.id}.name`)}</h3>
                <p className={styles.caseStudyStory}>{t(`case_studies.${study.id}.story`)}</p>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.caseStudiesMoreHint}>{t("case_studies_more_hint")}</p>

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
