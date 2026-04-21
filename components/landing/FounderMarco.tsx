"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Marco-Portrait is served from /public/marco-portrait.png (downloaded from
// boostthebeast.com — Marco is the owner of both brands, copyright-safe).
// Next <Image> handles responsive srcset + lazy-loading automatically.

const CREDENTIAL_KEYS = ["1", "2", "3", "4"] as const;

// Press-outlet names rendered as typographic badges. Not actual logos — safer
// IP-wise and brand-consistent with the rest of the site's minimalist look.
// Each entry uses a monospaced caps treatment so it reads as "mentioned in"
// without needing the outlet's brand guidelines / SVGs.
const PRESS_OUTLETS = ["N-TV", "RTL", "MEN'S HEALTH", "BILD"];

export default function FounderMarco() {
  const t = useTranslations("founder");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
  }, []);

  return (
    <section className={styles.founderSection}>
      <div className={styles.container}>
        <div ref={rootRef} className={`${styles.founderGrid} ${styles.reveal}`}>
          {/* Left: portrait + accent frame */}
          <div className={styles.founderPortraitWrap}>
            <div className={styles.founderPortraitFrame}>
              <Image
                src="/marco-portrait.png"
                alt={t("portrait_alt")}
                width={500}
                height={500}
                sizes="(max-width: 900px) 320px, 440px"
                priority={false}
                className={styles.founderPortrait}
              />
            </div>
            <div className={styles.founderPortraitAccent} aria-hidden />
          </div>

          {/* Right: story + credentials */}
          <div className={styles.founderContent}>
            <p className={styles.sectionLabel}>{t("eyebrow")}</p>
            <h2 className={styles.founderHeadline}>{t("headline")}</h2>
            <p className={styles.founderStory}>{t("story")}</p>
            <blockquote className={styles.founderQuote}>
              <span className={styles.founderQuoteMark} aria-hidden>&ldquo;</span>
              {t("quote")}
            </blockquote>

            <ul className={styles.founderCredentials}>
              {CREDENTIAL_KEYS.map((id) => (
                <li key={id} className={styles.founderCredential}>
                  <span className={styles.founderCredentialDot} aria-hidden />
                  {t(`credentials.${id}`)}
                </li>
              ))}
            </ul>

            <div className={styles.founderPressBlock}>
              <span className={styles.founderPressLabel}>{t("press_label")}</span>
              <div className={styles.founderPressList}>
                {PRESS_OUTLETS.map((name) => (
                  <span key={name} className={styles.founderPressItem}>
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <a
              href="https://boostthebeast.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.founderExternalLink}
            >
              {t("external_link")}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M3 9l6-6M4 3h5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
