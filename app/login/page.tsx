"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./login.module.css";
import BackButton from "@/components/ui/BackButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(errorParam);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // Browser redirects to Google — no further client code runs.
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Google-Login fehlgeschlagen");
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <BackButton />
      <div className={styles.card}>
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
        <p className={styles.subtitle}>
          Melde dich passwortlos an — wir schicken dir einen Login-Link per E-Mail.
        </p>

        {errorMsg && (
          <div
            style={{
              background: "rgba(230,50,34,0.12)",
              border: "1px solid #E63222",
              color: "#ff6b6b",
              padding: "12px 14px",
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            <strong>Fehler:</strong> {errorMsg}
          </div>
        )}

        {sent ? (
          <div
            style={{
              padding: "24px 20px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#22C55E",
              textAlign: "center",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              ✓ CHECK DEIN POSTFACH
            </div>
            <div style={{ color: "#ccc" }}>
              Wir haben dir einen Login-Link an <strong style={{ color: "#fff" }}>{email}</strong> geschickt.
              Klick den Link um eingeloggt zu werden.
            </div>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                padding: "14px 18px",
                background: "#fff",
                color: "#1a1a1a",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.02em",
                cursor: loading ? "wait" : "pointer",
                marginBottom: 16,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.79 2.73v2.27h2.9c1.69-1.56 2.67-3.86 2.67-6.64z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.47-.81 5.96-2.17l-2.9-2.27c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34C2.45 15.98 5.48 18 9 18z" fill="#34A853"/>
                <path d="M3.96 10.71c-.18-.54-.29-1.11-.29-1.71s.11-1.17.29-1.71V4.95H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.05l3-2.34z" fill="#FBBC04"/>
                <path d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.96 4.95l3 2.34C4.67 5.17 6.66 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Weiter mit Google
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "20px 0",
                color: "#666",
                fontSize: 11,
                letterSpacing: "0.2em",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#333" }} />
              ODER PER E-MAIL
              <div style={{ flex: 1, height: 1, background: "#333" }} />
            </div>

            <form onSubmit={handleMagicLink} className={styles.form}>
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

              <button type="submit" disabled={loading || !email} className={styles.btn}>
                {loading ? "WIRD GESENDET…" : "LOGIN-LINK SENDEN →"}
              </button>
            </form>

            <p style={{ fontSize: 11, color: "#666", textAlign: "center", marginTop: 16 }}>
              Kein Passwort nötig · Sicherer Login-Link per E-Mail
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <LoginContent />
    </Suspense>
  );
}
