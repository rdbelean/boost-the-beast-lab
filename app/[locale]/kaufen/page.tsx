"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./kaufen.module.css";
import { isVercelPreviewClient } from "@/lib/utils/is-vercel-preview";

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
  const locale = useLocale();
  const router = useRouter();
  const [buying, setBuying] = useState(false);

  // Skip-Button nur auf *.vercel.app-Hosts. Hostname-Check nach Hydration
  // (useEffect) damit kein SSR-/CSR-Markup-Mismatch entsteht.
  const [showSkip, setShowSkip] = useState(false);
  useEffect(() => {
    setShowSkip(isVercelPreviewClient());
  }, []);

  function handleSkipPayment() {
    // Cookie für proxy.ts (Server-Side Paid-Gate) — akzeptiert truthy Wert.
    document.cookie = "btb_paid=true; path=/; max-age=86400; SameSite=Lax";
    // SessionStorage für analyse/page.tsx Frontend-Paid-Check.
    sessionStorage.setItem("btb_paid", "true");
    // Direkt zum Fragebogen — überspringt /analyse/prepare (Wearable-
    // Upload), das auf Preview ohne btb_stripe_session-Cookie eh nicht
    // funktioniert. ?paid=true triggert den existierenden devBypass in
    // app/[locale]/analyse/page.tsx Z. 366–399.
    window.location.href = `/${locale}/analyse?product=complete-analysis&paid=true&preview_skip=true`;
  }

  async function handleBuy() {
    setBuying(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "complete-analysis", locale }),
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

          {showSkip && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                border: "2px dashed #FACC15",
                borderRadius: "8px",
                background: "rgba(250, 204, 21, 0.1)",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#FACC15",
                  marginBottom: "8px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                🧪 Preview Deployment
              </p>
              <button
                type="button"
                onClick={handleSkipPayment}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  background: "#FACC15",
                  color: "#0A0A0A",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Skip Payment → Direct to Questionnaire
              </button>
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.6)",
                  marginTop: "8px",
                }}
              >
                Wearable-Upload wird übersprungen. Direkt zum Fragebogen + neuer Report-Flow.
              </p>
            </div>
          )}
        </div>

        <p className={styles.disclaimer}>
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
