"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import styles from "@/app/landing.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const CheckIcon = ({ color = "#22C55E" }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 7l3.5 3.5L12 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FEATURE_KEYS = [
  "overall",
  "metabolic",
  "recovery",
  "activity",
  "stress",
  "vo2max",
  "optimization_plans",
  "training_plans",
  "forecast",
  "pdf",
] as const;

const TRUST_KEYS = ["instant_download", "one_time", "pdf_included"] as const;

export default function Products() {
  const t = useTranslations("products");
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
  }, []);

  return (
    <section id="products" className={styles.productsSection}>
      <div className={styles.container}>
        <div ref={headerRef} className={`${styles.productsHeader} ${styles.reveal}`}>
          <p className={styles.sectionLabel}>{t("section_label")}</p>
          <h2 className={styles.sectionTitle}>{t("section_title")}</h2>
        </div>

        <div className={styles.cardsStack}>
          <div
            ref={cardRef}
            className={`${styles.card} ${styles.cardHighlight} ${styles.reveal}`}
          >
            {/* Left */}
            <div className={styles.cardLeft}>
              <span className={`${styles.cardTag} ${styles.cardTagHighlight}`}>{t("card_tag")}</span>
              <h3 className={styles.cardName}>{t("card_name")}</h3>
              <p className={styles.cardQuestion}>{t("card_question")}</p>
              <div className={styles.featuresGrid}>
                {FEATURE_KEYS.map((key) => (
                  <div key={key} className={styles.featureItem}>
                    <CheckIcon color="#E63222" />
                    {t(`features.${key}`)}
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className={`${styles.cardRight} ${styles.cardRightHighlight}`}>
              <div className={`${styles.price} ${styles.priceAccent}`}>
                €39<span style={{ fontSize: "0.55em", verticalAlign: "super" }}>,90</span>
              </div>
              <div className={styles.priceSub}>{t("price_sub")}</div>

              {/* Anchor-pricing: compares against Marco's 1:1 hourly rate so
                  the €39.90 lands as "less than one hour with Marco". Big
                  perceived-value lift for ~5 lines of markup. */}
              <div className={styles.anchorPrice}>
                <span className={styles.anchorPriceLabel}>{t("anchor_price_label")}</span>
                <span className={styles.anchorPriceLine}>
                  {t("anchor_price_pt_prefix")}{" "}
                  <strong>{t("anchor_price_pt_value")}</strong>
                </span>
                <span className={styles.anchorPriceLine}>
                  {t("anchor_price_sw_prefix")}{" "}
                  <strong>{t("anchor_price_sw_value")}</strong>
                </span>
              </div>

              <button
                onClick={async () => {
                  const supabase = getSupabaseBrowserClient();
                  const { data } = await supabase.auth.getUser();
                  router.push(data.user ? "/kaufen" : "/login?next=/kaufen");
                }}
                className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
              >
                {t("cta")}
              </button>

              <div className={styles.trustPoints}>
                {TRUST_KEYS.map((key) => (
                  <div key={key} className={styles.trustPoint}>
                    <CheckIcon color="#22C55E" />
                    {t(`trust_points.${key}`)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
