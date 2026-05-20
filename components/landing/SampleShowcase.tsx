"use client";
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// 6 sample PDFs available for free download. Order on the right = visual
// reading order for the stack mockup on the left (main report on top,
// master plan + 4 detail plans fanned underneath).
type ItemKey = "main" | "master" | "activity" | "metabolic" | "recovery" | "stress";

interface ShowcaseItem {
  key: ItemKey;
  buildHref: (locale: string) => string;
  // Stack-card-class for the visual mockup on the left.
  stackClass: keyof typeof styles | string;
}

const ITEMS: ShowcaseItem[] = [
  {
    key: "main",
    buildHref: (l) => `/api/sample-report/pdf?locale=${l}`,
    stackClass: "sampleStackCardMain",
  },
  {
    key: "master",
    buildHref: (l) => `/api/sample-report/master-pdf?locale=${l}`,
    stackClass: "sampleStackCardMaster",
  },
  {
    key: "activity",
    buildHref: (l) => `/api/sample-report/plan-pdf?type=activity&locale=${l}`,
    stackClass: "sampleStackCardActivity",
  },
  {
    key: "metabolic",
    buildHref: (l) => `/api/sample-report/plan-pdf?type=metabolic&locale=${l}`,
    stackClass: "sampleStackCardMetabolic",
  },
  {
    key: "recovery",
    buildHref: (l) => `/api/sample-report/plan-pdf?type=recovery&locale=${l}`,
    stackClass: "sampleStackCardRecovery",
  },
  {
    key: "stress",
    buildHref: (l) => `/api/sample-report/plan-pdf?type=stress&locale=${l}`,
    stackClass: "sampleStackCardStress",
  },
];

// Small mock cover used inside each stack card — minimal SVG-ish layout
// so we don't ship any heavy assets just for the mockup.
function StackCardContent({ accent }: { accent: boolean }) {
  return (
    <div className={styles.sampleStackCardInner}>
      <div className={`${styles.sampleStackCardBar} ${accent ? styles.sampleStackCardBarAccent : ""}`} />
      <div className={styles.sampleStackCardLines}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export default function SampleShowcase() {
  const t = useTranslations("sample_showcase");
  const locale = useLocale();
  const headerRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    [headerRef, mockupRef, gridRef].forEach((ref, i) => {
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
    <section className={styles.sampleShowcaseSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.sampleShowcaseHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>{t("eyebrow")}</p>
          <h2 className={styles.sectionTitle}>{t("headline")}</h2>
          <p className={styles.sampleShowcaseSub}>{t("sub")}</p>
        </div>

        <div className={styles.sampleShowcaseGrid}>
          {/* Left: 3D PDF-stack mockup */}
          <div ref={mockupRef} className={`${styles.sampleStackMockup} ${styles.reveal}`} aria-hidden>
            <div className={`${styles.sampleStackCard} ${styles.sampleStackCardStress}`}>
              <StackCardContent accent={false} />
            </div>
            <div className={`${styles.sampleStackCard} ${styles.sampleStackCardRecovery}`}>
              <StackCardContent accent={false} />
            </div>
            <div className={`${styles.sampleStackCard} ${styles.sampleStackCardMetabolic}`}>
              <StackCardContent accent={false} />
            </div>
            <div className={`${styles.sampleStackCard} ${styles.sampleStackCardActivity}`}>
              <StackCardContent accent={false} />
            </div>
            <div className={`${styles.sampleStackCard} ${styles.sampleStackCardMaster}`}>
              <StackCardContent accent={false} />
            </div>
            <div className={`${styles.sampleStackCard} ${styles.sampleStackCardMain}`}>
              <div className={styles.sampleStackCardInner}>
                <div className={styles.sampleStackCoverEyebrow}>{t("mockup.main_report_sub")}</div>
                <div className={styles.sampleStackCoverTitle}>{t("mockup.main_report_title")}</div>
                <div className={`${styles.sampleStackCardBar} ${styles.sampleStackCardBarAccent}`} />
                <div className={styles.sampleStackCardLines}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>

          {/* Right: 6 download tiles */}
          <div ref={gridRef} className={`${styles.sampleDownloadGrid} ${styles.reveal}`}>
            {ITEMS.map(({ key, buildHref }) => (
              <a
                key={key}
                href={buildHref(locale)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sampleDownloadTile}
                aria-label={`${t(`items.${key}.title`)} — ${t("button_action")}`}
              >
                <div className={styles.sampleDownloadTileMain}>
                  <span className={styles.sampleDownloadTileTitle}>{t(`items.${key}.title`)}</span>
                  <span className={styles.sampleDownloadTileSub}>{t(`items.${key}.sub`)}</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden className={styles.sampleDownloadTileIcon}>
                  <path d="M9 3v9M5 8l4 4 4-4M3 15h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <a href={`/${locale}/beispielreport`} className={styles.sampleViewOnlineCta}>
          {t("view_online_cta")}
        </a>
      </div>
    </section>
  );
}
