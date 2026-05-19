"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";
import { isVercelPreviewClient } from "@/lib/utils/is-vercel-preview";

// Trust-first hero (v2): old 3-line headline restored, single primary CTA,
// Marco-mini-card to the right on desktop / below on mobile, press-line
// directly under the CTA, then 4-stat trust bar (2 animated numbers + 2
// check-icon labels).
export default function Hero() {
  const t = useTranslations("hero");
  const locale = useLocale();
  const statsRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Skip-Button nur auf *.vercel.app-Hosts. Hostname-Check nach Hydration
  // (useEffect) damit kein SSR-/CSR-Markup-Mismatch entsteht.
  const [showSkip, setShowSkip] = useState(false);
  useEffect(() => {
    setShowSkip(isVercelPreviewClient());
  }, []);

  function handleSkip() {
    document.cookie = "btb_paid=true; path=/; max-age=86400; SameSite=Lax";
    sessionStorage.setItem("btb_paid", "true");
    window.location.href = `/${locale}/analyse/prepare?product=complete-analysis&paid=true&preview_skip=true`;
  }

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

  const stats = [
    { target: 26, label: t("stats.questions") },
    { target: 5, label: t("stats.scores") },
    { target: 0, label: t("stats.deep_analysis"), static: true as const },
    { target: 0, label: t("stats.evidence_database"), static: true as const },
  ];

  return (
    <section className={styles.hero}>
      <div className={styles.heroNoise} aria-hidden />
      <div className={styles.heroGhost} aria-hidden>BEAST</div>

      <div className={`${styles.container} ${styles.heroInner}`}>
        {/* Desktop layout: text-block left, marco-mini-card right.
            Mobile: marco-card collapses below the CTA. */}
        <div className={styles.heroLayout}>
          <div className={styles.heroTextBlock}>
            {/* Eyebrow */}
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden />
              <span className={styles.eyebrowText}>{t("eyebrow")}</span>
            </div>

            {/* Headline — 3 lines, third line is the accent payoff */}
            <h1 className={styles.headline}>
              <span className={styles.headlineLine}>{t("headline_1")}</span>
              <span className={styles.headlineLine}>{t("headline_2")}</span>
              <span className={`${styles.headlineLine} ${styles.headlineAccent}`}>{t("headline_3")}</span>
            </h1>

            {/* Subtitle */}
            <p className={styles.subtitle}>{t("subtitle")}</p>

            {/* Primary CTA — single button, no decision paralysis */}
            <div className={styles.ctaRow}>
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  const target = document.getElementById("products");
                  if (target) {
                    const top = window.scrollY + target.getBoundingClientRect().top;
                    window.scrollTo({ top, behavior: "auto" });
                  }
                }}
              >
                {t("cta_primary")}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Trust-Mini-Bar: press logos as text under the CTA */}
            <p className={styles.trustMiniBar}>{t("trust_bar.press")}</p>

            {/* CTA sub-line — risk-free framing */}
            <p className={styles.ctaSub}>{t("cta_sub")}</p>

            {showSkip && (
              <div style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={handleSkip}
                  style={{
                    padding: "12px 24px",
                    background: "#FACC15",
                    color: "#0A0A0A",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 700,
                    fontSize: "13px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                  }}
                >
                  🧪 Skip Payment (Preview only) → Questionnaire
                </button>
              </div>
            )}
          </div>

          {/* Marco mini-card — credibility chip visible in the first 7 seconds */}
          <aside className={styles.heroMarcoCard} aria-label={t("marco_card.name")}>
            <div className={styles.heroMarcoAvatar}>
              <Image
                src="/marco-portrait.jpg"
                alt={t("marco_card.name")}
                width={72}
                height={72}
                sizes="72px"
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </div>
            <div className={styles.heroMarcoText}>
              <p className={styles.heroMarcoName}>{t("marco_card.name")}</p>
              <p className={styles.heroMarcoRole}>{t("marco_card.role")}</p>
              <p className={styles.heroMarcoCredential}>{t("marco_card.credential")}</p>
            </div>
          </aside>
        </div>

        {/* Stats — 4 trust signals: 2 animated numbers + 2 check-icon labels */}
        <div className={styles.statsBar} ref={statsRef}>
          {stats.map(({ target, label, static: isStatic }) => (
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
                  data-suffix=""
                  data-prefix=""
                >
                  0
                </span>
              )}
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={styles.scrollIndicator} aria-hidden>
        <span className={styles.scrollText}>{t("scroll")}</span>
        <span className={styles.scrollArrow}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </section>
  );
}
