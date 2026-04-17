"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./kaufen.module.css";

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 7l3.5 3.5L12 3" stroke="#E63222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Feature keys are shared with the landing page's products namespace so we
// only translate the list once. Keep in sync with messages/*.json.
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

export default function KaufenPage() {
  const t = useTranslations("kaufen");
  const tProducts = useTranslations("products");
  const router = useRouter();
  const [buying, setBuying] = useState(false);

  async function handleBuy() {
    setBuying(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "complete-analysis" }),
      });
      const { url } = await res.json();
      if (url) { window.location.href = url; return; }
      router.push("/analyse?product=complete-analysis");
    } catch {
      alert(t("error_checkout"));
      setBuying(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backRow}>{t("back_home")}</Link>
        <Link href="/" className={styles.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" width={58} height={36} alt="" aria-hidden="true" style={{ objectFit: "contain" }} />
          <div>
            <span className={styles.logoText}>BOOST THE BEAST</span>
            <span className={styles.logoSub}>PERFORMANCE LAB</span>
          </div>
        </Link>

        <div className={styles.card}>
          <span className={styles.tag}>{t("tag")}</span>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>
            {t("subtitle")}
          </p>
          <ul className={styles.features}>
            {FEATURE_KEYS.map((key) => (
              <li key={key} className={styles.featureItem}><CheckIcon />{tProducts(`features.${key}`)}</li>
            ))}
          </ul>
          <div className={styles.priceRow}>
            <div className={styles.price}>€39<span className={styles.priceCents}>,90</span></div>
            <div className={styles.priceSub}>{t("price_sub")}</div>
          </div>
          <button onClick={handleBuy} disabled={buying} className={styles.btnPrimary}>
            {buying ? t("cta_loading") : t("cta_buy")}
          </button>
        </div>

        <p className={styles.disclaimer}>
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
