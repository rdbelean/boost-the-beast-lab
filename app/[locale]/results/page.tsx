"use client";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./results.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/* ─── Animated Counter ──────────────────────────────────────── */
function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function AnimNum({ target }: { target: number }) {
  return <>{useCountUp(target)}</>;
}

/* ─── Urgency label ─────────────────────────────────────────── */
// Urgency buckets map score → (key, color). Translation happens at the
// call site so the helper stays locale-agnostic (easier to reuse in
// Server Components and PDFs later).
type UrgencyKey = "critical" | "action" | "optimize" | "finetune" | "top";
function urgencyBucket(score: number): { key: UrgencyKey; color: string } {
  if (score <= 30) return { key: "critical", color: "#DC2626" };
  if (score <= 50) return { key: "action",   color: "#B45309" };
  if (score <= 70) return { key: "optimize", color: "#A1A1AA" };
  if (score <= 85) return { key: "finetune", color: "#4D7C0F" };
  return                 { key: "top",       color: "#15803D" };
}

/* ─── Color helpers ─────────────────────────────────────────── */
function scoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#E63222";
}

type BadgeKey = "good" | "medium" | "low";
function scoreBadgeKey(score: number): BadgeKey {
  if (score >= 70) return "good";
  if (score >= 40) return "medium";
  return "low";
}

/* ─── Radar Chart (SVG) ─────────────────────────────────────── */
interface RadarScores { metabolic: number; sleep: number; activity: number; stress: number; vo2max: number }
function RadarChart({ scores }: { scores: RadarScores }) {
  const categories = [
    { label: "Activity", value: scores.activity },
    { label: "Sleep", value: scores.sleep },
    { label: "VO2max", value: scores.vo2max },
    { label: "Metabolic", value: scores.metabolic },
    { label: "Stress", value: scores.stress },
  ];
  const cx = 190, cy = 190, maxR = 140;
  const n = categories.length;

  function polarToCart(angle: number, r: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const rings = [25, 50, 75, 100];
  const gridPaths = rings.map((pct) => {
    const r = (pct / 100) * maxR;
    const pts = Array.from({ length: n }, (_, i) => polarToCart((360 / n) * i, r));
    return pts.map((p) => `${p.x},${p.y}`).join(" ");
  });

  const axes = Array.from({ length: n }, (_, i) => polarToCart((360 / n) * i, maxR));
  const dataPts = categories.map((cat, i) => polarToCart((360 / n) * i, (cat.value / 100) * maxR));
  const dataPath = dataPts.map((p) => `${p.x},${p.y}`).join(" ");
  const labelPts = categories.map((cat, i) => ({ ...polarToCart((360 / n) * i, maxR + 24), label: cat.label }));

  return (
    <svg viewBox="0 0 380 380" className={styles.radarSvg}>
      {gridPaths.map((pts, i) => <polygon key={i} points={pts} fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.5" />)}
      {axes.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" opacity="0.3" />)}
      <polygon points={dataPath} fill="rgba(230,50,34,0.15)" stroke="#E63222" strokeWidth="2" />
      {dataPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="#E63222" stroke="#fff" strokeWidth="2" />)}
      {labelPts.map((p, i) => (
        <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="var(--text-secondary)" fontFamily="var(--font-oswald), sans-serif" fontSize="11" letterSpacing="0.08em">
          {p.label.toUpperCase()}
        </text>
      ))}
    </svg>
  );
}

/* ─── Types ─────────────────────────────────────────────────── */
interface ResultsData {
  activity: { activity_score_0_100: number; total_met_minutes_week: number; activity_category: string };
  sleep: { sleep_score_0_100: number; sleep_band: string; sleep_duration_band: string; sleep_duration_score: number; sleep_quality_score: number; wakeup_score: number; recovery_score: number };
  metabolic: { metabolic_score_0_100: number; metabolic_band: string; bmi: number; bmi_category: string };
  stress: { stress_score_0_100: number; stress_band: string };
  vo2max: { fitness_score_0_100: number; vo2max_estimated: number; vo2max_band: string };
  overall_score_0_100: number;
  overall_band: string;
}

/* ─── Main Results Dashboard ────────────────────────────────── */
export default function ResultsPage() {
  const t = useTranslations("results");
  const [scores, setScores] = useState<ResultsData | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pdfRetrying, setPdfRetrying] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveCode, setSaveCode] = useState("");
  const [saveSending, setSaveSending] = useState(false);
  const [saveStep, setSaveStep] = useState<"email" | "code">("email");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Check auth state once the results are loaded so we can decide whether to
  // show the "save to account" banner.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setIsLoggedIn(!!data.user);
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveSendCode(e: React.FormEvent) {
    e.preventDefault();
    setSaveSending(true);
    setSaveError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: saveEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSaveStep("code");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Fehler beim Senden");
    } finally {
      setSaveSending(false);
    }
  }

  async function handleSaveVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setSaveSending(true);
    setSaveError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        email: saveEmail,
        token: saveCode.trim(),
        type: "email",
      });
      if (error) throw error;
      try {
        await fetch("/api/auth/link", { method: "POST" });
      } catch {
        // Non-fatal
      }
      setIsLoggedIn(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Code ungültig");
    } finally {
      setSaveSending(false);
    }
  }

  async function handleSaveGoogle() {
    setSaveSending(true);
    setSaveError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/results`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Fehler");
      setSaveSending(false);
    }
  }

  useEffect(() => {
    const raw = sessionStorage.getItem("btb_results");
    if (!raw) {
      setError("Keine Ergebnisse gefunden. Bitte starte die Analyse neu.");
      return;
    }
    try {
      const data = JSON.parse(raw);
      setScores(data.scores);
      setDownloadUrl(data.downloadUrl ?? null);
      setAssessmentId(data.assessmentId ?? null);
    } catch {
      setError("Ergebnisse konnten nicht geladen werden.");
    }
  }, []);

  async function retryPdfGeneration() {
    if (!assessmentId) {
      setPdfError(t("pdf_error_no_assessment"));
      return;
    }
    setPdfRetrying(true);
    setPdfError(null);
    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      // Read raw text first — the server can return non-JSON on lambda crash
      const rawText = await res.text();
      let data: { downloadUrl?: string; error?: string } | null = null;
      try {
        data = JSON.parse(rawText) as { downloadUrl?: string; error?: string };
      } catch {
        // Not JSON — surface the raw text so we can see the actual error
        setPdfError(
          t("pdf_error_server", {
            status: res.status,
            body: rawText.slice(0, 300) || t("pdf_error_empty"),
          }),
        );
        return;
      }
      if (!res.ok) {
        setPdfError(data?.error ?? t("pdf_error_generic", { status: res.status }));
        return;
      }
      if (data?.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        const raw = sessionStorage.getItem("btb_results");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            parsed.downloadUrl = data.downloadUrl;
            sessionStorage.setItem("btb_results", JSON.stringify(parsed));
          } catch {}
        }
      } else {
        setPdfError(t("pdf_error_no_url"));
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : t("pdf_error_network"));
    } finally {
      setPdfRetrying(false);
    }
  }

  if (error) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorInner}>
          <div className={styles.errorTitle}>{t("error_title")}</div>
          <p className={styles.errorText}>{error}</p>
          <Link href="/analyse" className={styles.errorBtn}>{t("restart")}</Link>
        </div>
      </div>
    );
  }

  if (!scores) return null;

  const overall = scores.overall_score_0_100;
  const labelColor = scoreColor(overall);

  const scoreEntries = [
    {
      key: "activity",
      label: t("score_entries.activity.label"),
      color: "#E63222",
      score: scores.activity.activity_score_0_100,
      desc: t("score_entries.activity.desc", {
        met: scores.activity.total_met_minutes_week,
        category: scores.activity.activity_category,
      }),
    },
    {
      key: "sleep",
      label: t("score_entries.sleep.label"),
      color: "#3B82F6",
      score: scores.sleep.sleep_score_0_100,
      desc: t("score_entries.sleep.desc", {
        duration: scores.sleep.sleep_duration_band,
        quality: scores.sleep.sleep_band,
      }),
    },
    {
      key: "vo2max",
      label: t("score_entries.vo2max.label"),
      color: "#8B5CF6",
      score: scores.vo2max.fitness_score_0_100,
      desc: t("score_entries.vo2max.desc", {
        vo2: scores.vo2max.vo2max_estimated,
        band: scores.vo2max.vo2max_band,
      }),
    },
    {
      key: "metabolic",
      label: t("score_entries.metabolic.label"),
      color: "#F59E0B",
      score: scores.metabolic.metabolic_score_0_100,
      desc: t("score_entries.metabolic.desc", {
        bmi: scores.metabolic.bmi,
        category: scores.metabolic.bmi_category,
        band: scores.metabolic.metabolic_band,
      }),
    },
    {
      key: "stress",
      label: t("score_entries.stress.label"),
      color: "#22C55E",
      score: scores.stress.stress_score_0_100,
      desc: t("score_entries.stress.desc", { band: scores.stress.stress_band }),
    },
  ];

  const benchmarks: Record<string, number> = { activity: 48, sleep: 55, vo2max: 45, metabolic: 58, stress: 52 };

  const ringSize = 220;
  const ringR = (ringSize / 2) - 12;
  const circumference = 2 * Math.PI * ringR;
  const offset = circumference - (overall / 100) * circumference;

  const radarScores: RadarScores = {
    activity: scores.activity.activity_score_0_100,
    sleep: scores.sleep.sleep_score_0_100,
    vo2max: scores.vo2max.fitness_score_0_100,
    metabolic: scores.metabolic.metabolic_score_0_100,
    stress: scores.stress.stress_score_0_100,
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className={styles.headerBtnSecondary}>{t("back_home")}</Link>
        <div className={styles.headerTitle}>{t("header_title")}</div>
        <div className={styles.headerActions}>
          <Link href="/analyse" className={`${styles.headerBtnSecondary} ${styles.hideOnMobile}`}>{t("new_analysis")}</Link>
          {downloadUrl ? (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className={styles.headerBtnPrimary}>
              {t("pdf_download")}
            </a>
          ) : (
            <button
              onClick={retryPdfGeneration}
              disabled={pdfRetrying}
              className={styles.headerBtnPrimary}
              style={{ opacity: pdfRetrying ? 0.5 : 1, cursor: pdfRetrying ? "wait" : "pointer" }}
              title={pdfError ?? undefined}
            >
              {pdfRetrying ? t("pdf_generating") : t("pdf_generate")}
            </button>
          )}
        </div>
      </div>

      <div className={styles.container} id="results-content">

        {/* ─── SAVE TO ACCOUNT BANNER ──────────────────── */}
        {isLoggedIn === false && (
          <section
            style={{
              margin: "0 0 32px 0",
              padding: "24px 28px",
              background: "linear-gradient(135deg, rgba(230,50,34,0.12) 0%, rgba(230,50,34,0.04) 100%)",
              border: "1px solid rgba(230,50,34,0.35)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #E63222 0%, #ff6b4a 100%)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px" }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.25em",
                    color: "#E63222",
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  {t("save_banner.label")}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                  {saveStep === "email"
                    ? t("save_banner.title_email")
                    : t("save_banner.title_code")}
                </div>
                <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>
                  {saveStep === "email"
                    ? t("save_banner.desc_email")
                    : t("save_banner.desc_code", { email: saveEmail })}
                </div>
              </div>

              <div style={{ flex: "1 1 340px", display: "flex", flexDirection: "column", gap: 8 }}>
                {saveStep === "email" ? (
                  <>
                    <form onSubmit={handleSaveSendCode} style={{ display: "flex", gap: 8 }}>
                      <input
                        type="email"
                        required
                        placeholder={t("save_banner.email_placeholder")}
                        value={saveEmail}
                        onChange={(e) => setSaveEmail(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          background: "#0A0A0A",
                          border: "1px solid #333",
                          color: "#fff",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={saveSending || !saveEmail}
                        style={{
                          padding: "12px 18px",
                          background: "#E63222",
                          color: "#fff",
                          border: "none",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          cursor: saveSending ? "wait" : "pointer",
                          opacity: saveSending ? 0.6 : 1,
                        }}
                      >
                        {saveSending ? t("save_banner.sending") : t("save_banner.send_code")}
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={handleSaveGoogle}
                      disabled={saveSending}
                      style={{
                        padding: "10px 14px",
                        background: "#fff",
                        color: "#1a1a1a",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: saveSending ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 18 18">
                        <path d="M17.64 9.20c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.79 2.73v2.27h2.9c1.69-1.56 2.67-3.86 2.67-6.64z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.47-.81 5.96-2.17l-2.9-2.27c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34C2.45 15.98 5.48 18 9 18z" fill="#34A853"/>
                        <path d="M3.96 10.71c-.18-.54-.29-1.11-.29-1.71s.11-1.17.29-1.71V4.95H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.05l3-2.34z" fill="#FBBC04"/>
                        <path d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.96 4.95l3 2.34C4.67 5.17 6.66 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                      {t("save_banner.google_btn")}
                    </button>
                  </>
                ) : (
                  <>
                    <form onSubmit={handleSaveVerifyCode} style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        autoFocus
                        placeholder="123456"
                        value={saveCode}
                        onChange={(e) => setSaveCode(e.target.value.replace(/\D/g, ""))}
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          background: "#0A0A0A",
                          border: "1px solid #333",
                          color: "#fff",
                          fontSize: 18,
                          letterSpacing: "0.3em",
                          textAlign: "center",
                          fontFamily: "var(--font-oswald), sans-serif",
                          outline: "none",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={saveSending || saveCode.length !== 6}
                        style={{
                          padding: "12px 18px",
                          background: "#E63222",
                          color: "#fff",
                          border: "none",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          cursor: saveSending ? "wait" : "pointer",
                          opacity: saveSending ? 0.6 : 1,
                        }}
                      >
                        {saveSending ? t("save_banner.sending") : t("save_banner.verify_btn")}
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => { setSaveStep("email"); setSaveCode(""); setSaveError(null); }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#888",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      {t("save_banner.back_other_email")}
                    </button>
                  </>
                )}
                {saveError && (
                  <div style={{ fontSize: 11, color: "#E63222" }}>{saveError}</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ─── HERO: Overall Score ──────────────────────── */}
        <section className={styles.heroSection}>
          <div className={styles.heroLabel}>{t("hero_label")}</div>
          <h1 className={styles.heroTitle}>{t("hero_title")}</h1>

          <div className={styles.ringWrap}>
            <svg className={styles.ringBg} width="100%" height="100%" viewBox={`0 0 ${ringSize} ${ringSize}`}>
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringR} />
            </svg>
            <svg
              className={styles.ringFg}
              width="100%" height="100%"
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              style={{ transform: "rotate(-90deg)", "--circumference": circumference, "--offset": offset } as React.CSSProperties}
            >
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={ringR}
                stroke={labelColor}
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                style={{ animation: "ringDraw 1.8s cubic-bezier(0.16,1,0.3,1) forwards", "--circumference": circumference, "--offset": offset } as React.CSSProperties}
              />
            </svg>
            <div className={styles.ringCenter}>
              <span className={styles.ringValue} style={{ color: labelColor }}><AnimNum target={overall} /></span>
              <span className={styles.ringSuffix}>/100</span>
            </div>
          </div>

          <div className={styles.labelBadge} style={{ color: labelColor, borderColor: labelColor, background: `${labelColor}18` }}>
            {scores.overall_band.toUpperCase()}
          </div>
        </section>

        {/* ─── SCORE CARDS ─────────────────────────────── */}
        <section className={styles.scoresSection}>
          <div className={styles.sectionLabel}>{t("subscores_label")}</div>
          <div className={styles.scoresGrid}>
            {scoreEntries.map((entry, i) => {
              const c = scoreColor(entry.score);
              return (
                <div key={entry.key} className={styles.scoreCard} style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={styles.scoreCardTop}>
                    <div>
                      <div className={styles.scoreCardLabel}>{entry.label}</div>
                      <div className={styles.scoreCardValue} style={{ color: c }}>
                        <AnimNum target={entry.score} /><span className={styles.scoreCardMax}>/100</span>
                      </div>
                    </div>
                    <div className={styles.scoreCardBadge} style={{ background: `${c}18`, color: c }}>
                      {t(`badges.${scoreBadgeKey(entry.score)}`)}
                    </div>
                  </div>
                  <div className={styles.scoreCardBar}>
                    <div className={styles.scoreCardBarFill} style={{ width: `${entry.score}%`, background: c, animationDelay: `${0.2 + i * 0.1}s` }} />
                  </div>
                  <div className={styles.scoreCardDesc}>{entry.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── DERIVED METRICS ──────────────────────────── */}
        <section className={styles.scoresSection}>
          <div className={styles.sectionLabel}>{t("derived_metrics_label")}</div>
          <div className={styles.scoresGrid}>
            <div className={styles.scoreCard} style={{ animationDelay: "0.1s" }}>
              <div className={styles.scoreCardTop}>
                <div>
                  <div className={styles.scoreCardLabel}>{t("vo2max_card.label")}</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(scores.vo2max.fitness_score_0_100) }}>
                    {scores.vo2max.vo2max_estimated}<span className={styles.scoreCardMax}> ml/kg/min</span>
                  </div>
                </div>
                <div className={styles.scoreCardBadge} style={{ background: `${scoreColor(scores.vo2max.fitness_score_0_100)}18`, color: scoreColor(scores.vo2max.fitness_score_0_100) }}>
                  {scores.vo2max.vo2max_band}
                </div>
              </div>
              <div className={styles.scoreCardDesc}>
                {t("vo2max_card.desc")}
              </div>
            </div>

            <div className={styles.scoreCard} style={{ animationDelay: "0.15s" }}>
              <div className={styles.scoreCardTop}>
                <div>
                  <div className={styles.scoreCardLabel}>{t("bmi_card.label")}</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(scores.metabolic.metabolic_score_0_100) }}>
                    {scores.metabolic.bmi}<span className={styles.scoreCardMax}> kg/m²</span>
                  </div>
                </div>
                <div className={styles.scoreCardBadge} style={{ background: `${scoreColor(scores.metabolic.metabolic_score_0_100)}18`, color: scoreColor(scores.metabolic.metabolic_score_0_100) }}>
                  {scores.metabolic.bmi_category.toUpperCase()}
                </div>
              </div>
              <div className={styles.scoreCardDesc}>
                {t("bmi_card.desc")}
              </div>
            </div>

            <div className={styles.scoreCard} style={{ animationDelay: "0.2s" }}>
              <div className={styles.scoreCardTop}>
                <div>
                  <div className={styles.scoreCardLabel}>{t("met_card.label")}</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(scores.activity.activity_score_0_100) }}>
                    {scores.activity.total_met_minutes_week}<span className={styles.scoreCardMax}> MET-min</span>
                  </div>
                </div>
                <div className={styles.scoreCardBadge} style={{ background: `${scoreColor(scores.activity.activity_score_0_100)}18`, color: scoreColor(scores.activity.activity_score_0_100) }}>
                  {scores.activity.activity_category}
                </div>
              </div>
              <div className={styles.scoreCardDesc}>
                {t("met_card.desc")}
              </div>
            </div>
          </div>
        </section>

        {/* ─── RADAR CHART ─────────────────────────────── */}
        <section className={styles.radarSection}>
          <div className={styles.sectionLabel}>{t("radar_label")}</div>
          <div className={styles.radarGrid}>
            <RadarChart scores={radarScores} />
            <div className={styles.radarMeta}>
              {scoreEntries.map((entry, i) => (
                <div key={entry.key} className={styles.radarItem} style={{ animationDelay: `${0.4 + i * 0.08}s` }}>
                  <div className={styles.radarDot} style={{ background: entry.color }} />
                  <div className={styles.radarItemLabel}>{entry.label}</div>
                  <div className={styles.radarItemValue} style={{ color: scoreColor(entry.score) }}>{entry.score}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── BENCHMARK COMPARISON ────────────────────── */}
        <section className={styles.benchmarkSection}>
          <div className={styles.sectionLabel}>{t("benchmark_label")}</div>
          {scoreEntries.map((entry, i) => (
            <div key={entry.key} className={styles.benchmarkRow} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={styles.benchmarkLabel}>{entry.label}</div>
              <div className={styles.benchmarkBars}>
                <div className={styles.benchmarkBarWrap}>
                  <div className={styles.benchmarkBarFill} style={{ width: `${entry.score}%`, background: entry.color, animationDelay: `${0.3 + i * 0.1}s` }} />
                  <span className={styles.benchmarkBarLabel}>{entry.score}</span>
                </div>
                <div className={styles.benchmarkBarRef}>
                  <div className={styles.benchmarkBarRefFill} style={{ width: `${benchmarks[entry.key]}%` }} />
                  <span className={styles.benchmarkBarRefLabel}>⌀ {benchmarks[entry.key]}</span>
                </div>
              </div>
            </div>
          ))}
          <div className={styles.benchmarkLegend}>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: "var(--accent)" }} />{t("benchmark_legend.your_score")}</div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: "rgba(255,255,255,0.15)" }} />{t("benchmark_legend.average")}</div>
          </div>
        </section>

        {/* ─── SLEEP DETAIL ────────────────────────────── */}
        <section className={styles.scoresSection}>
          <div className={styles.sectionLabel}>{t("sleep_detail_label")}</div>
          <div className={styles.scoresGrid}>
            {[
              { key: "duration", label: t("sleep_detail.duration.label"), score: scores.sleep.sleep_duration_score, desc: t("sleep_detail.duration.desc", { band: scores.sleep.sleep_duration_band }) },
              { key: "quality", label: t("sleep_detail.quality.label"), score: scores.sleep.sleep_quality_score, desc: t("sleep_detail.quality.desc") },
              { key: "wakeup", label: t("sleep_detail.wakeup.label"), score: scores.sleep.wakeup_score, desc: t("sleep_detail.wakeup.desc") },
              { key: "recovery", label: t("sleep_detail.recovery.label"), score: scores.sleep.recovery_score, desc: t("sleep_detail.recovery.desc") },
            ].map((s, i) => {
              const c = scoreColor(s.score);
              return (
                <div key={s.key} className={styles.scoreCard} style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className={styles.scoreCardTop}>
                    <div>
                      <div className={styles.scoreCardLabel}>{s.label}</div>
                      <div className={styles.scoreCardValue} style={{ color: c }}>{s.score}<span className={styles.scoreCardMax}>/100</span></div>
                    </div>
                    <div className={styles.scoreCardBadge} style={{ background: `${c}18`, color: c }}>{t(`badges.${scoreBadgeKey(s.score)}`)}</div>
                  </div>
                  <div className={styles.scoreCardBar}>
                    <div className={styles.scoreCardBarFill} style={{ width: `${s.score}%`, background: c }} />
                  </div>
                  <div className={styles.scoreCardDesc}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── INDIVIDUELLE PLÄNE ──────────────────────── */}
        <section className={styles.plansSection}>
          <h2 className={styles.plansSectionHeading}>{t("plans.heading")}</h2>
          <p className={styles.plansSubtitle}>
            {t("plans.subtitle")}
          </p>
          <div className={styles.plansGrid}>
            {[
              { type: "activity",  color: "#E63222", score: scores.activity.activity_score_0_100 },
              { type: "metabolic", color: "#F59E0B", score: scores.metabolic.metabolic_score_0_100 },
              { type: "recovery",  color: "#3B82F6", score: scores.sleep.sleep_score_0_100 },
              { type: "stress",    color: "#22C55E", score: scores.stress.stress_score_0_100 },
            ].map((plan) => (
              <Link key={plan.type} href={`/plans/${plan.type}`} className={styles.planCard}>
                <div className={styles.planCardAccent} style={{ background: plan.color }} />
                <div className={styles.planCardBody}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div className={styles.planCardScore} style={{ color: plan.color, marginBottom: 0 }}>
                      {plan.score}<span className={styles.planCardScoreSub}>/100</span>
                    </div>
                    {(() => { const u = urgencyBucket(plan.score); return (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: u.color, border: `1px solid ${u.color}`, background: `${u.color}18`, padding: "2px 7px", borderRadius: 2, whiteSpace: "nowrap" }}>
                        {t(`urgency.${u.key}`)}
                      </span>
                    ); })()}
                  </div>
                  <div className={styles.planCardLabel}>{t(`plans.${plan.type as "activity"|"metabolic"|"recovery"|"stress"}.label`)}</div>
                  <div className={styles.planCardDesc}>{t(`plans.${plan.type as "activity"|"metabolic"|"recovery"|"stress"}.desc`)}</div>
                </div>
                <div className={styles.planCardCta} style={{ color: plan.color }}>
                  <span>{t(`plans.${plan.type as "activity"|"metabolic"|"recovery"|"stress"}.cta`)} →</span>
                  <span className={styles.planCardArrow}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── BOTTOM CTA ──────────────────────────────── */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaBtns}>
            {downloadUrl ? (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className={styles.ctaBtnPrimary}>
                {t("bottom_cta.btn_download")}
              </a>
            ) : (
              <button
                onClick={retryPdfGeneration}
                disabled={pdfRetrying}
                className={styles.ctaBtnPrimary}
                style={{ opacity: pdfRetrying ? 0.5 : 1, cursor: pdfRetrying ? "wait" : "pointer" }}
              >
                {pdfRetrying ? t("pdf_generating") : t("pdf_generate")}
              </button>
            )}
          </div>
          {pdfError && (
            <div style={{ marginTop: "0.75rem", color: "#DC2626", fontSize: "0.8rem", textAlign: "center" }}>
              {pdfError}
            </div>
          )}
          <p className={styles.ctaDisclaimer}>
            {t("bottom_cta.disclaimer")}
          </p>
        </section>

        {/* ─── LAB UPSELL ──────────────────────────────── */}
        <section className={styles.upsellSection}>
          <div className={styles.upsellTag}>{t("upsell.tag")}</div>
          <h2 className={styles.upsellTitle}>{t("upsell.title")}</h2>
          <p className={styles.upsellText}>
            {t("upsell.text")}
          </p>
          <div className={styles.upsellFeatures}>
            {(t.raw("upsell.features") as string[]).map((f) => (
              <div key={f} className={styles.upsellFeatureItem}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M2 7l3.5 3.5L12 3" stroke="#E63222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </div>
            ))}
          </div>
          <a href="https://boostthebeast.com/" target="_blank" rel="noopener noreferrer" className={styles.upsellBtn}>
            {t("upsell.btn")}
          </a>
          <p className={styles.upsellNote}>{t("upsell.note")}</p>
        </section>
      </div>
    </div>
  );
}
