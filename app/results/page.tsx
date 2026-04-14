"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import styles from "./results.module.css";

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
function urgencyLabel(score: number): { text: string; color: string } {
  if (score <= 30) return { text: "KRITISCH",              color: "#DC2626" };
  if (score <= 50) return { text: "HANDLUNGSBEDARF",       color: "#B45309" };
  if (score <= 70) return { text: "OPTIMIERUNGSPOTENZIAL", color: "#A1A1AA" };
  if (score <= 85) return { text: "FEINTUNING",            color: "#4D7C0F" };
  return                 { text: "TOP-LEVEL",              color: "#15803D" };
}

/* ─── Color helpers ─────────────────────────────────────────── */
function scoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#E63222";
}

function scoreBadge(score: number): string {
  if (score >= 70) return "GUT";
  if (score >= 40) return "MITTEL";
  return "NIEDRIG";
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
        <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="var(--text-secondary)" fontFamily="'Oswald', sans-serif" fontSize="11" letterSpacing="0.08em">
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
  const [scores, setScores] = useState<ResultsData | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pdfRetrying, setPdfRetrying] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
      setPdfError("Keine Assessment-ID — bitte Analyse neu starten.");
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
      const data = await res.json();
      if (!res.ok) {
        setPdfError(data?.error ?? `Fehler ${res.status}`);
        return;
      }
      if (data.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        // persist so refresh still has it
        const raw = sessionStorage.getItem("btb_results");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            parsed.downloadUrl = data.downloadUrl;
            sessionStorage.setItem("btb_results", JSON.stringify(parsed));
          } catch {}
        }
      } else {
        setPdfError("Server lieferte keine URL zurück.");
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setPdfRetrying(false);
    }
  }

  if (error) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorInner}>
          <div className={styles.errorTitle}>FEHLER</div>
          <p className={styles.errorText}>{error}</p>
          <Link href="/analyse" className={styles.errorBtn}>NEU STARTEN</Link>
        </div>
      </div>
    );
  }

  if (!scores) return null;

  const overall = scores.overall_score_0_100;
  const labelColor = scoreColor(overall);

  const scoreEntries = [
    { key: "activity", label: "ACTIVITY PERFORMANCE", color: "#E63222", score: scores.activity.activity_score_0_100, desc: `${scores.activity.total_met_minutes_week} MET-min/Woche · IPAQ Kategorie: ${scores.activity.activity_category}` },
    { key: "sleep", label: "SLEEP & RECOVERY", color: "#3B82F6", score: scores.sleep.sleep_score_0_100, desc: `Schlafdauer: ${scores.sleep.sleep_duration_band} · Qualität: ${scores.sleep.sleep_band}` },
    { key: "vo2max", label: "VO2MAX FITNESS", color: "#8B5CF6", score: scores.vo2max.fitness_score_0_100, desc: `Geschätzter VO2max: ${scores.vo2max.vo2max_estimated} ml/kg/min · Band: ${scores.vo2max.vo2max_band}` },
    { key: "metabolic", label: "METABOLIC HEALTH", color: "#F59E0B", score: scores.metabolic.metabolic_score_0_100, desc: `BMI: ${scores.metabolic.bmi} (${scores.metabolic.bmi_category}) · Band: ${scores.metabolic.metabolic_band}` },
    { key: "stress", label: "STRESS & LIFESTYLE", color: "#22C55E", score: scores.stress.stress_score_0_100, desc: `Stress-Band: ${scores.stress.stress_band}` },
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
        <Link href="/" className={styles.headerBtnSecondary}>← HOME</Link>
        <div className={styles.headerTitle}>BOOST THE BEAST LAB · PERFORMANCE REPORT</div>
        <div className={styles.headerActions}>
          <Link href="/analyse" className={`${styles.headerBtnSecondary} ${styles.hideOnMobile}`}>Neue Analyse</Link>
          {downloadUrl ? (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className={styles.headerBtnPrimary}>
              PDF DOWNLOAD
            </a>
          ) : (
            <button
              onClick={retryPdfGeneration}
              disabled={pdfRetrying}
              className={styles.headerBtnPrimary}
              style={{ opacity: pdfRetrying ? 0.5 : 1, cursor: pdfRetrying ? "wait" : "pointer" }}
              title={pdfError ?? undefined}
            >
              {pdfRetrying ? "PDF WIRD GENERIERT…" : "PDF JETZT GENERIEREN"}
            </button>
          )}
        </div>
      </div>

      <div className={styles.container} id="results-content">

        {/* ─── HERO: Overall Score ──────────────────────── */}
        <section className={styles.heroSection}>
          <div className={styles.heroLabel}>DEIN ERGEBNIS</div>
          <h1 className={styles.heroTitle}>OVERALL PERFORMANCE SCORE</h1>

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
          <div className={styles.sectionLabel}>SUBSCORES IM DETAIL</div>
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
                      {scoreBadge(entry.score)}
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
          <div className={styles.sectionLabel}>DERIVED METRICS</div>
          <div className={styles.scoresGrid}>
            <div className={styles.scoreCard} style={{ animationDelay: "0.1s" }}>
              <div className={styles.scoreCardTop}>
                <div>
                  <div className={styles.scoreCardLabel}>VO2MAX SCHÄTZUNG</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(scores.vo2max.fitness_score_0_100) }}>
                    {scores.vo2max.vo2max_estimated}<span className={styles.scoreCardMax}> ml/kg/min</span>
                  </div>
                </div>
                <div className={styles.scoreCardBadge} style={{ background: `${scoreColor(scores.vo2max.fitness_score_0_100)}18`, color: scoreColor(scores.vo2max.fitness_score_0_100) }}>
                  {scores.vo2max.vo2max_band}
                </div>
              </div>
              <div className={styles.scoreCardDesc}>
                Geschätzte maximale Sauerstoffaufnahme basierend auf Alter, BMI und Aktivitätskategorie. Modell: Jackson Non-Exercise (1990).
              </div>
            </div>

            <div className={styles.scoreCard} style={{ animationDelay: "0.15s" }}>
              <div className={styles.scoreCardTop}>
                <div>
                  <div className={styles.scoreCardLabel}>BMI — KÖRPERKOMPOSITION</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(scores.metabolic.metabolic_score_0_100) }}>
                    {scores.metabolic.bmi}<span className={styles.scoreCardMax}> kg/m²</span>
                  </div>
                </div>
                <div className={styles.scoreCardBadge} style={{ background: `${scoreColor(scores.metabolic.metabolic_score_0_100)}18`, color: scoreColor(scores.metabolic.metabolic_score_0_100) }}>
                  {scores.metabolic.bmi_category.toUpperCase()}
                </div>
              </div>
              <div className={styles.scoreCardDesc}>
                WHO-Klassifikation der Körperzusammensetzung. Optimal: 18.5–24.9 kg/m².
              </div>
            </div>

            <div className={styles.scoreCard} style={{ animationDelay: "0.2s" }}>
              <div className={styles.scoreCardTop}>
                <div>
                  <div className={styles.scoreCardLabel}>MET-MINUTEN PRO WOCHE</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(scores.activity.activity_score_0_100) }}>
                    {scores.activity.total_met_minutes_week}<span className={styles.scoreCardMax}> MET-min</span>
                  </div>
                </div>
                <div className={styles.scoreCardBadge} style={{ background: `${scoreColor(scores.activity.activity_score_0_100)}18`, color: scoreColor(scores.activity.activity_score_0_100) }}>
                  {scores.activity.activity_category}
                </div>
              </div>
              <div className={styles.scoreCardDesc}>
                Gesamtaktivitätsvolumen nach IPAQ Short Form. Walking (3.3 MET) + Moderate (4.0 MET) + Vigorous (8.0 MET).
              </div>
            </div>
          </div>
        </section>

        {/* ─── RADAR CHART ─────────────────────────────── */}
        <section className={styles.radarSection}>
          <div className={styles.sectionLabel}>PERFORMANCE PROFIL</div>
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
          <div className={styles.sectionLabel}>VERGLEICH — DEIN SCORE VS. DURCHSCHNITT</div>
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
            <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: "var(--accent)" }} />DEIN SCORE</div>
            <div className={styles.legendItem}><div className={styles.legendDot} style={{ background: "rgba(255,255,255,0.15)" }} />DURCHSCHNITT</div>
          </div>
        </section>

        {/* ─── SLEEP DETAIL ────────────────────────────── */}
        <section className={styles.scoresSection}>
          <div className={styles.sectionLabel}>SLEEP & RECOVERY — DETAILANALYSE</div>
          <div className={styles.scoresGrid}>
            {[
              { label: "SCHLAFDAUER", score: scores.sleep.sleep_duration_score, desc: `Band: ${scores.sleep.sleep_duration_band}` },
              { label: "SCHLAFQUALITÄT", score: scores.sleep.sleep_quality_score, desc: "Subjektive Bewertung (PSQI-adaptiert)" },
              { label: "AUFWACHEN", score: scores.sleep.wakeup_score, desc: "Nächtliche Unterbrechungen" },
              { label: "ERHOLUNG", score: scores.sleep.recovery_score, desc: "Morgens-Erholungsgefühl" },
            ].map((s, i) => {
              const c = scoreColor(s.score);
              return (
                <div key={s.label} className={styles.scoreCard} style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className={styles.scoreCardTop}>
                    <div>
                      <div className={styles.scoreCardLabel}>{s.label}</div>
                      <div className={styles.scoreCardValue} style={{ color: c }}>{s.score}<span className={styles.scoreCardMax}>/100</span></div>
                    </div>
                    <div className={styles.scoreCardBadge} style={{ background: `${c}18`, color: c }}>{scoreBadge(s.score)}</div>
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
          <h2 className={styles.plansSectionHeading}>DEINE 4 INDIVIDUELLEN PLÄNE</h2>
          <p className={styles.plansSubtitle}>
            Personalisiert auf Basis deiner Scores — inklusive in deinem Paket. Jeder Plan enthält konkrete Protokolle, Wochenpläne und wissenschaftliche Empfehlungen.
          </p>
          <div className={styles.plansGrid}>
            {[
              { type: "activity",  label: "ACTIVITY-PLAN",          color: "#E63222", score: scores.activity.activity_score_0_100,  desc: "Trainingsvolumen, Wochenplan & Progression nach WHO/ACSM-Standard", cta: "ZUM ACTIVITY-PLAN" },
              { type: "metabolic", label: "METABOLIC-PLAN",         color: "#F59E0B", score: scores.metabolic.metabolic_score_0_100, desc: "Ernährungs- & Hydrations-Protokoll nach EFSA- und DGE-Richtlinien", cta: "ZUM METABOLIC-PLAN" },
              { type: "recovery",  label: "RECOVERY-PLAN",          color: "#3B82F6", score: scores.sleep.sleep_score_0_100,         desc: "Schlaf-Hygiene, Regenerationsprotokoll & Wochenstruktur nach NSF", cta: "ZUM RECOVERY-PLAN" },
              { type: "stress",    label: "STRESS & LIFESTYLE-PLAN", color: "#22C55E", score: scores.stress.stress_score_0_100,      desc: "Stressreduktion, Lifestyle-Optimierung & Sport als Stress-Tool", cta: "ZUM STRESS-PLAN" },
            ].map((plan) => (
              <Link key={plan.type} href={`/plans/${plan.type}`} className={styles.planCard}>
                <div className={styles.planCardAccent} style={{ background: plan.color }} />
                <div className={styles.planCardBody}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div className={styles.planCardScore} style={{ color: plan.color, marginBottom: 0 }}>
                      {plan.score}<span className={styles.planCardScoreSub}>/100</span>
                    </div>
                    {(() => { const u = urgencyLabel(plan.score); return (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: u.color, border: `1px solid ${u.color}`, background: `${u.color}18`, padding: "2px 7px", borderRadius: 2, whiteSpace: "nowrap" }}>
                        {u.text}
                      </span>
                    ); })()}
                  </div>
                  <div className={styles.planCardLabel}>{plan.label}</div>
                  <div className={styles.planCardDesc}>{plan.desc}</div>
                </div>
                <div className={styles.planCardCta} style={{ color: plan.color }}>
                  <span>{plan.cta} →</span>
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
                REPORT ALS PDF HERUNTERLADEN
              </a>
            ) : (
              <button
                onClick={retryPdfGeneration}
                disabled={pdfRetrying}
                className={styles.ctaBtnPrimary}
                style={{ opacity: pdfRetrying ? 0.5 : 1, cursor: pdfRetrying ? "wait" : "pointer" }}
              >
                {pdfRetrying ? "PDF WIRD GENERIERT…" : "PDF JETZT GENERIEREN"}
              </button>
            )}
          </div>
          {pdfError && (
            <div style={{ marginTop: "0.75rem", color: "#DC2626", fontSize: "0.8rem", textAlign: "center" }}>
              {pdfError}
            </div>
          )}
          <p className={styles.ctaDisclaimer}>
            Hinweis: Dieser Report dient ausschließlich der allgemeinen Information und ersetzt keinen
            Arztbesuch, keine medizinische Diagnose oder Therapieempfehlung. Bei gesundheitlichen
            Beschwerden konsultieren Sie bitte einen Arzt. Kein Medizinprodukt i.S.d. MDR.
          </p>
        </section>

        {/* ─── LAB UPSELL ──────────────────────────────── */}
        <section className={styles.upsellSection}>
          <div className={styles.upsellTag}>NÄCHSTES LEVEL</div>
          <h2 className={styles.upsellTitle}>BEREIT FÜR ECHTE LAB-DIAGNOSTIK?</h2>
          <p className={styles.upsellText}>
            Dein Performance Report basiert auf wissenschaftlichen Modellen — aber die präziseste Messung
            findet im Labor statt. Hol dir eine persönliche Beratung und eine echte
            VO2max-Messung mit Atemmaske (Spiroergometrie) in Düsseldorf.
          </p>
          <div className={styles.upsellFeatures}>
            {[
              "Persönliches Beratungsgespräch mit einem Experten",
              "Präzise VO2max-Messung mit Spiroergometrie",
              "Individuelle Trainings- & Ernährungsberatung",
              "Vor Ort in Düsseldorf · echte Lab-Diagnostik",
            ].map((f) => (
              <div key={f} className={styles.upsellFeatureItem}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M2 7l3.5 3.5L12 3" stroke="#E63222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </div>
            ))}
          </div>
          <a href="https://boostthebeast.com/" target="_blank" rel="noopener noreferrer" className={styles.upsellBtn}>
            TERMIN BUCHEN →
          </a>
          <p className={styles.upsellNote}>Persönliche Beratung · Düsseldorf</p>
        </section>
      </div>
    </div>
  );
}
