"use client";
import Link from "next/link";
import { useState } from "react";
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
      alert("Checkout konnte nicht gestartet werden. Bitte erneut versuchen.");
      setBuying(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backRow}>← HOME</Link>
        <Link href="/" className={styles.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" width={58} height={36} alt="" aria-hidden="true" style={{ objectFit: "contain" }} />
          <div>
            <span className={styles.logoText}>BOOST THE BEAST</span>
            <span className={styles.logoSub}>PERFORMANCE LAB</span>
          </div>
        </Link>

        <div className={styles.card}>
          <span className={styles.tag}>VOLLSTÄNDIGES PAKET</span>
          <h2 className={styles.title}>COMPLETE PERFORMANCE ANALYSIS</h2>
          <p className={styles.subtitle}>
            Dein vollständiger Performance Report + individuelle Optimierungs- & Trainingspläne.
          </p>
          <ul className={styles.features}>
            {features.map((f) => (
              <li key={f} className={styles.featureItem}><CheckIcon />{f}</li>
            ))}
          </ul>
          <div className={styles.priceRow}>
            <div className={styles.price}>€39<span className={styles.priceCents}>,90</span></div>
            <div className={styles.priceSub}>einmalig · kein Abo</div>
          </div>
          <button onClick={handleBuy} disabled={buying} className={styles.btnPrimary}>
            {buying ? "WIRD GESTARTET…" : "JETZT KAUFEN →"}
          </button>
        </div>

        <p className={styles.disclaimer}>
          Sicherer Checkout · SSL-verschlüsselt · Einmalige Zahlung
        </p>
      </div>
    </div>
  );
}
