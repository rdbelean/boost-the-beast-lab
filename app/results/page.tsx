"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { AssessmentData } from "@/lib/scoring";
import type { ScoreResult } from "@/lib/scoring";
import { calculateAllScores } from "@/lib/scoring";
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
function RadarChart({ scores }: { scores: ScoreResult }) {
  const categories = [
    { label: "Metabolic", value: scores.metabolic },
    { label: "Recovery", value: scores.recovery },
    { label: "Activity", value: scores.activity },
    { label: "Stress", value: scores.stress },
  ];
  const cx = 190, cy = 190, maxR = 140;
  const n = categories.length;

  function polarToCart(angle: number, r: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // Grid rings
  const rings = [25, 50, 75, 100];
  const gridPaths = rings.map((pct) => {
    const r = (pct / 100) * maxR;
    const pts = Array.from({ length: n }, (_, i) => {
      const angle = (360 / n) * i;
      return polarToCart(angle, r);
    });
    return pts.map((p) => `${p.x},${p.y}`).join(" ");
  });

  // Axes
  const axes = Array.from({ length: n }, (_, i) => {
    const angle = (360 / n) * i;
    return polarToCart(angle, maxR);
  });

  // Data polygon
  const dataPts = categories.map((cat, i) => {
    const angle = (360 / n) * i;
    const r = (cat.value / 100) * maxR;
    return polarToCart(angle, r);
  });
  const dataPath = dataPts.map((p) => `${p.x},${p.y}`).join(" ");

  // Labels
  const labelPts = categories.map((cat, i) => {
    const angle = (360 / n) * i;
    const p = polarToCart(angle, maxR + 24);
    return { ...p, label: cat.label, value: cat.value };
  });

  return (
    <svg viewBox="0 0 380 380" className={styles.radarSvg}>
      {/* Grid */}
      {gridPaths.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.5" />
      ))}
      {/* Axes */}
      {axes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" opacity="0.3" />
      ))}
      {/* Data fill */}
      <polygon points={dataPath} fill="rgba(230,50,34,0.15)" stroke="#E63222" strokeWidth="2" />
      {/* Data dots */}
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5" fill="#E63222" stroke="#fff" strokeWidth="2" />
      ))}
      {/* Labels */}
      {labelPts.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-secondary)"
          fontFamily="'Oswald', sans-serif"
          fontSize="11"
          letterSpacing="0.08em"
        >
          {p.label.toUpperCase()}
        </text>
      ))}
    </svg>
  );
}

/* ─── Report Text Renderer ──────────────────────────────────── */
function ReportText({ text }: { text: string }) {
  const sections = text.split(/^## /m).filter(Boolean);
  return (
    <div className={styles.reportCards}>
      {sections.map((section, i) => {
        const lines = section.split("\n");
        const title = lines[0].trim().replace(/^##\s*/, "");
        const body = lines.slice(1).join("\n").trim();
        return (
          <div
            key={i}
            className={`${styles.reportCard} ${i % 2 === 0 ? styles.reportCardEven : styles.reportCardOdd}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className={styles.reportCardTitle}>{title}</div>
            <div
              className={styles.reportCardBody}
              dangerouslySetInnerHTML={{
                __html: body
                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                  .replace(/^(\d+\. )/gm, '<span style="color:var(--accent);font-weight:600">$1</span>'),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Processing Screen ─────────────────────────────────────── */
const STEPS = [
  "Daten werden verarbeitet...",
  "Scores werden berechnet...",
  "AI generiert deinen Report...",
  "Report wird finalisiert...",
];

function ProcessingScreen({ step }: { step: number }) {
  return (
    <div className={styles.processingScreen}>
      <div className={styles.processingInner}>
        <div className={styles.processingRing}>
          <svg className={styles.processingRingSvg} width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="var(--accent)" strokeWidth="4"
              strokeDasharray="50 150" strokeLinecap="round" transform="rotate(-90 40 40)" />
          </svg>
          <div className={styles.processingRingDot}>
            <div className={styles.processingRingDotInner} />
          </div>
        </div>
        <div className={styles.processingTitle}>DEINE DATEN WERDEN ANALYSIERT</div>
        <div className={styles.processingSteps}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`${styles.processingStep} ${i < step ? styles.stepDone : i === step ? styles.stepActive : ""}`}
            >
              <span className={styles.stepIcon}>
                {i < step ? "✓" : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Results Dashboard ────────────────────────────────── */
export default function ResultsPage() {
  const [processingStep, setProcessingStep] = useState(0);
  const [scores, setScores] = useState<ScoreResult | null>(null);
  const [report, setReport] = useState<string>("");
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [error, setError] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const raw = sessionStorage.getItem("btb_assessment");
    if (!raw) {
      setError("Keine Assessment-Daten gefunden. Bitte starte die Analyse neu.");
      return;
    }

    const data: AssessmentData = JSON.parse(raw);
    setAssessmentData(data);

    // Calculate scores locally (instant)
    const localScores = calculateAllScores(data);

    async function run() {
      setProcessingStep(0);
      await new Promise((r) => setTimeout(r, 500));
      setProcessingStep(1);

      // Set scores immediately from local calc
      await new Promise((r) => setTimeout(r, 500));
      setProcessingStep(2);

      // Try API for report text
      try {
        const res = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          const result = await res.json();
          setReport(result.report);
        }
      } catch {
        // Report is optional — dashboard still works
      }

      setProcessingStep(3);
      await new Promise((r) => setTimeout(r, 600));
      setScores(localScores);
    }

    run();
  }, []);

  async function downloadPdf() {
    if (!scores || !assessmentData) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, report, data: assessmentData }),
      });
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BTB-Performance-Report-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  // Error state
  if (error) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorInner}>
          <div className={styles.errorTitle}>FEHLER</div>
          <p className={styles.errorText}>{error}</p>
          <Link href="/assessment" className={styles.errorBtn}>NEU STARTEN</Link>
        </div>
      </div>
    );
  }

  // Processing state
  if (!scores) return <ProcessingScreen step={processingStep} />;

  const labelColor = scoreColor(scores.overall);

  const scoreDescriptions = {
    metabolic: `BMI: ${scores.bmi} · Dein metabolischer Status basiert auf Körperzusammensetzung, Hydration, Mahlzeitenfrequenz und Sitzzeit.`,
    recovery: "Schlafdauer, -qualität und nächtliche Unterbrechungen bestimmen deine Regenerationskapazität.",
    activity: "Gesamtaktivität, Trainingsfrequenz, -dauer und -art nach ACSM-Richtlinien bewertet.",
    stress: "Stresslevel, sedentäres Verhalten und Schlafqualität als Lifestyle-Indikatoren kombiniert.",
  };

  const scoreEntries = [
    { key: "metabolic" as const, label: "METABOLIC PERFORMANCE", color: "#E63222" },
    { key: "recovery" as const, label: "RECOVERY & REGENERATION", color: "#3B82F6" },
    { key: "activity" as const, label: "ACTIVITY PERFORMANCE", color: "#F59E0B" },
    { key: "stress" as const, label: "STRESS & LIFESTYLE", color: "#8B5CF6" },
  ];

  // Benchmark averages (illustrative population averages)
  const benchmarks: Record<string, number> = {
    metabolic: 55, recovery: 50, activity: 45, stress: 48,
  };

  // Ring geometry
  const ringSize = 220;
  const ringR = (ringSize / 2) - 12;
  const circumference = 2 * Math.PI * ringR;
  const offset = circumference - (scores.overall / 100) * circumference;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>BOOST THE BEAST LAB · PERFORMANCE REPORT</div>
        <div className={styles.headerActions}>
          <Link href="/assessment" className={styles.headerBtnSecondary}>Neue Analyse</Link>
          <button onClick={downloadPdf} disabled={pdfLoading} className={styles.headerBtnPrimary}>
            {pdfLoading ? "..." : "PDF DOWNLOAD"}
          </button>
        </div>
      </div>

      <div className={styles.container}>

        {/* ─── HERO: Overall Score ──────────────────────── */}
        <section className={styles.heroSection}>
          <div className={styles.heroLabel}>DEIN ERGEBNIS</div>
          <h1 className={styles.heroTitle}>OVERALL PERFORMANCE SCORE</h1>

          <div className={styles.ringWrap}>
            <svg
              className={styles.ringBg}
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
            >
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringR} />
            </svg>
            <svg
              className={styles.ringFg}
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              style={{
                transform: "rotate(-90deg)",
                "--circumference": circumference,
                "--offset": offset,
              } as React.CSSProperties}
            >
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringR}
                stroke={labelColor}
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                style={{
                  animation: `ringDraw 1.8s cubic-bezier(0.16,1,0.3,1) forwards`,
                  "--circumference": circumference,
                  "--offset": offset,
                } as React.CSSProperties}
              />
            </svg>
            <div className={styles.ringCenter}>
              <span className={styles.ringValue} style={{ color: labelColor }}>
                <AnimNum target={scores.overall} />
              </span>
              <span className={styles.ringSuffix}>/100</span>
            </div>
          </div>

          <div
            className={styles.labelBadge}
            style={{ color: labelColor, borderColor: labelColor, background: `${labelColor}18` }}
          >
            {scores.label}
          </div>
        </section>

        {/* ─── SCORE CARDS ─────────────────────────────── */}
        <section className={styles.scoresSection}>
          <div className={styles.sectionLabel}>SUBSCORES IM DETAIL</div>
          <div className={styles.scoresGrid}>
            {scoreEntries.map((entry, i) => {
              const s = scores[entry.key];
              const c = scoreColor(s);
              return (
                <div
                  key={entry.key}
                  className={styles.scoreCard}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={styles.scoreCardTop}>
                    <div>
                      <div className={styles.scoreCardLabel}>{entry.label}</div>
                      <div className={styles.scoreCardValue} style={{ color: c }}>
                        <AnimNum target={s} />
                        <span className={styles.scoreCardMax}>/100</span>
                      </div>
                    </div>
                    <div
                      className={styles.scoreCardBadge}
                      style={{ background: `${c}18`, color: c }}
                    >
                      {scoreBadge(s)}
                    </div>
                  </div>
                  <div className={styles.scoreCardBar}>
                    <div
                      className={styles.scoreCardBarFill}
                      style={{ width: `${s}%`, background: c, animationDelay: `${0.2 + i * 0.1}s` }}
                    />
                  </div>
                  <div className={styles.scoreCardDesc}>
                    {scoreDescriptions[entry.key]}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── RADAR CHART ─────────────────────────────── */}
        <section className={styles.radarSection}>
          <div className={styles.sectionLabel}>PERFORMANCE PROFIL</div>
          <div className={styles.radarGrid}>
            <RadarChart scores={scores} />
            <div className={styles.radarMeta}>
              {scoreEntries.map((entry, i) => (
                <div
                  key={entry.key}
                  className={styles.radarItem}
                  style={{ animationDelay: `${0.4 + i * 0.08}s` }}
                >
                  <div className={styles.radarDot} style={{ background: entry.color }} />
                  <div className={styles.radarItemLabel}>{entry.label}</div>
                  <div className={styles.radarItemValue} style={{ color: scoreColor(scores[entry.key]) }}>
                    {scores[entry.key]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── BENCHMARK COMPARISON ────────────────────── */}
        <section className={styles.benchmarkSection}>
          <div className={styles.sectionLabel}>VERGLEICH — DEIN SCORE VS. DURCHSCHNITT</div>
          {scoreEntries.map((entry, i) => {
            const s = scores[entry.key];
            return (
              <div
                key={entry.key}
                className={styles.benchmarkRow}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={styles.benchmarkLabel}>{entry.label}</div>
                <div className={styles.benchmarkBars}>
                  <div className={styles.benchmarkBarWrap}>
                    <div
                      className={styles.benchmarkBarFill}
                      style={{ width: `${s}%`, background: entry.color, animationDelay: `${0.3 + i * 0.1}s` }}
                    />
                    <span className={styles.benchmarkBarLabel}>{s}</span>
                  </div>
                  <div className={styles.benchmarkBarRef}>
                    <div
                      className={styles.benchmarkBarRefFill}
                      style={{ width: `${benchmarks[entry.key]}%` }}
                    />
                    <span className={styles.benchmarkBarRefLabel}>⌀ {benchmarks[entry.key]}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div className={styles.benchmarkLegend}>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: "var(--accent)" }} />
              DEIN SCORE
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: "rgba(255,255,255,0.15)" }} />
              DURCHSCHNITT
            </div>
          </div>
        </section>

        {/* ─── AI REPORT ───────────────────────────────── */}
        {report && (
          <section className={styles.reportSection}>
            <div className={styles.reportHeader}>
              <div className={styles.sectionLabel} style={{ margin: 0 }}>AI-GENERIERTER PERFORMANCE REPORT</div>
              <div className={styles.reportBadge}>CLAUDE AI</div>
            </div>
            <ReportText text={report} />
          </section>
        )}

        {/* ─── BOTTOM CTA ──────────────────────────────── */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaBtns}>
            <button onClick={downloadPdf} disabled={pdfLoading} className={styles.ctaBtnPrimary}>
              {pdfLoading ? "WIRD ERSTELLT..." : "REPORT ALS PDF HERUNTERLADEN"}
            </button>
            <Link href="/assessment" className={styles.ctaBtnSecondary}>
              NEUE ANALYSE STARTEN
            </Link>
          </div>
          <p className={styles.ctaDisclaimer}>
            Dieser Report ersetzt keine medizinische Beratung. · BOOST THE BEAST LAB
          </p>
        </section>
      </div>
    </div>
  );
}
