"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import BackButton from "@/components/ui/BackButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Demo: direkt weiterleiten
    setTimeout(() => router.push("/kaufen"), 600);
  }

  return (
    <div className={styles.page}>
      <BackButton />
      <div className={styles.card}>
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

        <h1 className={styles.title}>LOGIN / ACCOUNT ERSTELLEN</h1>
        <p className={styles.subtitle}>Melde dich an oder erstelle deinen Account, um fortzufahren.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>E-MAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="deine@email.de"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>PASSWORT</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className={styles.btn}>
            {loading ? "..." : "LOGIN / ACCOUNT ERSTELLEN →"}
          </button>
        </form>

        <button type="button" onClick={() => router.push("/kaufen")} className={styles.btnSkip}>
          Überspringen (Demo)
        </button>
        <p className={styles.demoHint}>E-Mail & Passwort — Demo-Platzhalter</p>
      </div>
    </div>
  );
}
