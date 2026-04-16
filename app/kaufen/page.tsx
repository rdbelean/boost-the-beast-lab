"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./kaufen.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 7l3.5 3.5L12 3" stroke="#E63222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const features = [
  "Overall Performance Index (0–100)",
  "Metabolic Performance Score",
  "Recovery & Regeneration Score",
  "Activity Performance Score",
  "Stress & Lifestyle Score",
  "VO2max Schätzung (ml/kg/min)",
  "Individuelle Optimierungspläne",
  "Individuelle Trainingspläne",
  "30-Tage Performance Prognose",
  "KI-generierter Premium PDF Report",
];

const followUpFeatures = [
  "1x Analyse-Protokoll (20 Fragen)",
  "Aktualisierter Performance Report",
  "Neue Scores & Vergleich mit Vorwerten",
  "Aktualisierte individuelle Pläne",
];

export default function KaufenPage() {
  const router = useRouter();

  // "use"      → user has tokens, show token-use card
  // "purchase" → no tokens or chose to buy, show product cards
  // null       → still checking
  const [tokenMode, setTokenMode] = useState<"use" | "purchase" | null>(null);
  const [tokenCount, setTokenCount] = useState(0);
  const [noTokens, setNoTokens] = useState(false);
  const [highlightFollowUp, setHighlightFollowUp] = useState(false);
  const [buyingMain, setBuyingMain] = useState(false);
  const [buyingFollowUp, setBuyingFollowUp] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNoTokens(params.get("reason") === "no-tokens");

    // ?product=follow-up: skip token check, go straight to purchase with follow-up highlighted
    if (params.get("product") === "follow-up") {
      setHighlightFollowUp(true);
      setTokenMode("purchase");
      return;
    }

    // Check auth + token count
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) { setTokenMode("purchase"); return; }

        const res = await fetch("/api/tokens");
        const json = await res.json();
        const count = json.tokens ?? 0;
        setTokenCount(count);
        setTokenMode(count > 0 ? "use" : "purchase");
      } catch {
        setTokenMode("purchase");
      }
    })();
  }, []);

  async function handleBuyMain() {
    setBuyingMain(true);
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
      alert("Checkout konnte nicht gestartet werden. Bitte erneut versuchen.");
      setBuyingMain(false);
    }
  }

  async function handleBuyFollowUp() {
    setBuyingFollowUp(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "follow-up" }),
      });
      const { url } = await res.json();
      if (url) { window.location.href = url; return; }
      router.push("/analyse");
    } catch {
      alert("Checkout konnte nicht gestartet werden. Bitte erneut versuchen.");
      setBuyingFollowUp(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backRow}>← HOME</Link>
        <Link href="/" className={styles.logo}>
          <img src="/logo-white.svg" width={58} height={36} alt="" aria-hidden="true" style={{ objectFit: "contain" }} />
          <div>
            <span className={styles.logoText}>BOOST THE BEAST</span>
            <span className={styles.logoSub}>PERFORMANCE LAB</span>
          </div>
        </Link>

        {/* ── Loading ───────────────────────────────────────── */}
        {tokenMode === null && (
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
            ···
          </div>
        )}

        {/* ── Token-Use Screen ──────────────────────────────── */}
        {tokenMode === "use" && (
          <div className={styles.tokenCard}>
            <span className={styles.tokenCardBadge}>
              {tokenCount} ANALYSE{tokenCount === 1 ? "" : "N"} VERFÜGBAR
            </span>
            <h1 className={styles.tokenCardTitle}>ANALYSE STARTEN</h1>
            <p className={styles.tokenCardDesc}>
              Du hast noch {tokenCount} Analyse-Token{tokenCount === 1 ? "" : "s"}.
              Starte direkt — ohne neue Zahlung.
            </p>
            <button
              onClick={() => router.push("/analyse")}
              className={styles.btnPrimary}
            >
              TOKEN VERWENDEN →
            </button>
            <button
              onClick={() => setTokenMode("purchase")}
              className={styles.btnSkip}
            >
              Stattdessen neu kaufen ↓
            </button>
          </div>
        )}

        {/* ── Purchase Screen ───────────────────────────────── */}
        {tokenMode === "purchase" && (
          <>
            {noTokens && (
              <div className={styles.noTokensBanner}>
                Du hast keine Analyse-Tokens mehr. Wähle ein Paket um fortzufahren.
              </div>
            )}

            {/* Follow-Up FIRST when coming from no-tokens or ?product=follow-up */}
            {(noTokens || highlightFollowUp) && (
              <div className={styles.card}>
                <span className={styles.tag}>BESTANDSKUNDEN</span>
                <h2 className={styles.title}>FOLLOW-UP PERFORMANCE ANALYSE</h2>
                <p className={styles.subtitle}>
                  Neue Analyse, neue Scores — sieh wie sich deine Performance entwickelt hat.
                </p>
                <ul className={styles.features}>
                  {followUpFeatures.map((f) => (
                    <li key={f} className={styles.featureItem}><CheckIcon />{f}</li>
                  ))}
                </ul>
                <div className={styles.priceRow}>
                  <div className={styles.price}>€19<span className={styles.priceCents}>,90</span></div>
                  <div className={styles.priceSub}>einmalig</div>
                </div>
                <button onClick={handleBuyFollowUp} disabled={buyingFollowUp} className={styles.btnPrimary}>
                  {buyingFollowUp ? "WIRD GESTARTET…" : "FOLLOW-UP STARTEN →"}
                </button>
              </div>
            )}

            {/* Main product */}
            <div className={(noTokens || highlightFollowUp) ? styles.cardSecondary : styles.card}>
              <span className={(noTokens || highlightFollowUp) ? styles.tagMuted : styles.tag}>
                VOLLSTÄNDIGES PAKET
              </span>
              <h2 className={(noTokens || highlightFollowUp) ? styles.titleSmall : styles.title}>
                COMPLETE PERFORMANCE ANALYSIS
              </h2>
              <p className={styles.subtitle}>
                Dein vollständiger Performance Report + individuelle Optimierungs- & Trainingspläne.
              </p>
              <ul className={styles.features}>
                {features.map((f) => (
                  <li key={f} className={styles.featureItem}><CheckIcon />{f}</li>
                ))}
              </ul>
              <div className={styles.priceRow}>
                <div className={(noTokens || highlightFollowUp) ? styles.priceMuted : styles.price}>
                  €39<span className={styles.priceCents}>,90</span>
                </div>
                <div className={styles.priceSub}>einmalig · kein Abo</div>
              </div>
              <button
                onClick={handleBuyMain}
                disabled={buyingMain}
                className={(noTokens || highlightFollowUp) ? styles.btnSecondary : styles.btnPrimary}
              >
                {buyingMain ? "WIRD GESTARTET…" : "JETZT KAUFEN →"}
              </button>
            </div>

            {/* Follow-Up SECONDARY when normal purchase flow */}
            {!noTokens && !highlightFollowUp && (
              <div className={styles.cardSecondary}>
                <span className={styles.tagMuted}>FÜR BESTANDSKUNDEN</span>
                <h2 className={styles.titleSmall}>FOLLOW-UP PERFORMANCE ANALYSE</h2>
                <p className={styles.subtitle}>
                  Tracke deinen Fortschritt — neue Scores, neuer Report, Vergleich mit Vorwerten.
                </p>
                <ul className={styles.features}>
                  {followUpFeatures.map((f) => (
                    <li key={f} className={styles.featureItem}><CheckIcon />{f}</li>
                  ))}
                </ul>
                <div className={styles.priceRow}>
                  <div className={styles.priceMuted}>€19<span className={styles.priceCents}>,90</span></div>
                  <div className={styles.priceSub}>einmalig</div>
                </div>
                <button onClick={handleBuyFollowUp} disabled={buyingFollowUp} className={styles.btnSecondary}>
                  {buyingFollowUp ? "WIRD GESTARTET…" : "FOLLOW-UP STARTEN →"}
                </button>
              </div>
            )}
          </>
        )}

        <p className={styles.disclaimer}>
          Sicherer Checkout · SSL-verschlüsselt · Einmalige Zahlung
        </p>
      </div>
    </div>
  );
}
