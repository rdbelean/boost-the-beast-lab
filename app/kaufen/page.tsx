"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./kaufen.module.css";

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

export default function KaufenPage() {
  const router = useRouter();

  async function handleBuy() {
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "complete-analysis" }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        router.push("/analyse?product=complete-analysis");
      }
    } catch (err) {
      console.error("[kaufen] checkout failed", err);
      alert("Checkout konnte nicht gestartet werden. Bitte erneut versuchen.");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backRow}>← HOME</Link>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M16 1L29.5 8.5V23.5L16 31L2.5 23.5V8.5L16 1Z"
              fill="#2D0A06" stroke="#E63222" strokeWidth="1.5"/>
            <path d="M13 22l3-12 3 12h-2.5v4h-1v-4H13z" fill="#E63222"/>
          </svg>
          <div>
            <span className={styles.logoText}>BOOST THE BEAST</span>
            <span className={styles.logoSub}>PERFORMANCE LAB</span>
          </div>
        </Link>

        <div className={styles.card}>
          {/* Tag */}
          <span className={styles.tag}>VOLLSTÄNDIGES PAKET</span>

          {/* Title */}
          <h1 className={styles.title}>COMPLETE PERFORMANCE ANALYSIS</h1>
          <p className={styles.subtitle}>Dein vollständiger Performance Report + individuelle Optimierungs- & Trainingspläne.</p>

          {/* Features */}
          <ul className={styles.features}>
            {features.map((f) => (
              <li key={f} className={styles.featureItem}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>

          {/* Price */}
          <div className={styles.priceRow}>
            <div className={styles.price}>
              €199<span className={styles.priceCents}>,99</span>
            </div>
            <div className={styles.priceSub}>einmalig · kein Abo</div>
          </div>

          {/* CTAs */}
          <button onClick={handleBuy} className={styles.btnPrimary}>
            JETZT KAUFEN →
          </button>

          <button
            onClick={() => router.push("/analyse?product=complete-analysis")}
            className={styles.btnSkip}
          >
            Skip (Demo — ohne Bezahlung weiter)
          </button>
        </div>

        <p className={styles.disclaimer}>
          Sicherer Checkout · SSL-verschlüsselt · Einmalige Zahlung
        </p>
      </div>
    </div>
  );
}
