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
  "Anthropometrische Rohdaten werden eingelesen & validiert...",
  "BMI-Kalkulation · Körperzusammensetzung wird analysiert...",
  "VO2max-Schätzung via Jackson & Pollock Protokoll läuft...",
  "NEAT-Kalkulation · Non-Exercise Thermogenesis wird ermittelt...",
  "Metabolic Performance Score wird multi-variabel gewichtet...",
  "Recovery-Algorithmus korreliert Schlaf- & Regenerationsdaten...",
  "Aktivitätslevel wird gegen WHO & ACSM-Richtlinien abgeglichen...",
  "Stress-Indikatoren & Lifestyle-Marker werden korreliert...",
  "KI-Modell generiert personalisierten Performance-Report...",
  "Benchmark-Datenbank & Referenzwerte werden integriert...",
  "Gesamtanalyse wird finalisiert & Qualität geprüft...",
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

/* ─── Insight data for weak scores ──────────────────────────── */
const INSIGHT_DATA: Record<string, {
  icon: string;
  weakLabel: string;
  tips: string[];
  ctaText: string;
  ctaButton: string;
  ctaLink: string;
}> = {
  metabolic: {
    icon: "⚡",
    weakLabel: "VERBESSERUNGSPOTENZIAL ERKANNT",
    tips: [
      "Erhöhe deine Wasseraufnahme auf 2–3 Liter pro Tag — Dehydration senkt den Stoffwechsel um bis zu 3%.",
      "Verteile deine Mahlzeiten auf 3–5 über den Tag — konstante Energiezufuhr hält den Metabolismus aktiv.",
      "Reduziere Sitzzeit: alle 45 Minuten aufstehen und 2–3 Minuten bewegen steigert NEAT signifikant.",
      "Mehr Protein in jeder Mahlzeit (1.6–2.2g/kg Körpergewicht) erhöht den thermischen Effekt der Nahrung.",
    ],
    ctaText: "Dein Stoffwechsel arbeitet unter seinem Potenzial. Ein detaillierter Metabolic Report zeigt dir exakt, wo die Engpässe liegen.",
    ctaButton: "DETAILLIERTE ANALYSE →",
    ctaLink: "https://boost-the-beast-lab.vercel.app",
  },
  recovery: {
    icon: "🌙",
    weakLabel: "REGENERATION UNTER DURCHSCHNITT",
    tips: [
      "Ziel: 7–9 Stunden Schlaf pro Nacht — jede Stunde unter 7h reduziert die Recovery um ~15%.",
      "Bildschirmzeit 60 Minuten vor dem Schlafen reduzieren — Blaulicht unterdrückt Melatonin um bis zu 50%.",
      "Schlafzimmer auf 16–18°C kühlen — optimale Temperatur für Tiefschlafphasen.",
      "Feste Schlafenszeit einhalten (auch am Wochenende) — stabilisiert den zirkadianen Rhythmus innerhalb von 2 Wochen.",
    ],
    ctaText: "Schlechte Recovery ist der #1 Performance-Killer. Ein Recovery Deep-Dive zeigt dir deine individuellen Schlaf-Optimierungen.",
    ctaButton: "RECOVERY REPORT →",
    ctaLink: "https://boost-the-beast-lab.vercel.app",
  },
  activity: {
    icon: "🏃",
    weakLabel: "AKTIVITÄTSLEVEL ZU NIEDRIG",
    tips: [
      "WHO-Empfehlung: mindestens 150 Minuten moderate Aktivität pro Woche — du liegst darunter.",
      "Steigere schrittweise auf 8.000–10.000 Schritte/Tag — jeder zusätzliche 1.000 Schritte senken das Mortalitätsrisiko um 6%.",
      "Kombiniere Kraft- und Ausdauertraining (Hybrid) — bringt die höchste Verbesserung im Activity Score.",
      "Kurze Bewegungseinheiten (10–15 Min) über den Tag verteilen wenn längere Sessions nicht möglich sind.",
    ],
    ctaText: "Dein Körper bewegt sich zu wenig. Ein Activity Performance Report gibt dir einen personalisierten Trainingsplan.",
    ctaButton: "ACTIVITY ANALYSE →",
    ctaLink: "https://boost-the-beast-lab.vercel.app",
  },
  stress: {
    icon: "🧠",
    weakLabel: "STRESSBELASTUNG ERHÖHT",
    tips: [
      "5–10 Minuten tägliche Atemübungen (Box Breathing: 4-4-4-4) senken Cortisol nachweislich um bis zu 25%.",
      "Bewegung ist der effektivste Stress-Puffer — selbst 20 Minuten Gehen senkt Stresshormone signifikant.",
      "Sitzzeit unter 8 Stunden halten — prolongiertes Sitzen erhöht Cortisol und inflammatorische Marker.",
      "Schlafqualität verbessern hat den stärksten Einzeleffekt auf Stress-Resilienz.",
    ],
    ctaText: "Chronischer Stress zerstört Performance. Ein Lifestyle Report analysiert deine Stressoren und gibt dir einen konkreten Aktionsplan.",
    ctaButton: "LIFESTYLE REPORT →",
    ctaLink: "https://boost-the-beast-lab.vercel.app",
  },
};

/* ─── Insight Card Component ───────────────────────────────── */
function InsightCard({ scoreKey, score, label, color }: {
  scoreKey: string; score: number; label: string; color: string;
}) {
  const [open, setOpen] = useState(false);
  const data = INSIGHT_DATA[scoreKey];
  if (!data || score >= 60) return null;

  return (
    <div className={styles.insightCard}>
      <div className={styles.insightCardHeader} onClick={() => setOpen(!open)}>
        <div className={styles.insightCardLeft}>
          <div
            className={styles.insightCardIcon}
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}
          >
            <span style={{ fontSize: 18 }}>{data.icon}</span>
          </div>
          <div className={styles.insightCardMeta}>
            <span className={styles.insightCardLabel}>{data.weakLabel}</span>
            <span className={styles.insightCardTitle}>{label}</span>
          </div>
        </div>
        <div className={styles.insightCardScore} style={{ color }}>
          {score}<span className={styles.insightCardScoreSuffix}>/100</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`${styles.insightCardChevron} ${open ? styles.insightCardChevronOpen : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className={`${styles.insightCardBody} ${open ? styles.insightCardBodyOpen : ""}`}>
        <div className={styles.insightCardContent}>
          <div className={styles.insightTips}>
            {data.tips.map((tip, i) => (
              <div key={i} className={styles.insightTip}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.insightTipIcon}>
                  <path d="M2 8l5 5 7-8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {tip}
              </div>
            ))}
          </div>
          <div className={styles.insightCta}>
            <div className={styles.insightCtaText}>
              <span className={styles.insightCtaTextBold}>{data.ctaText}</span>
            </div>
            <a href={data.ctaLink} className={styles.insightCtaBtn}>
              {data.ctaButton}
            </a>
          </div>
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
      // Fire AI request immediately in background
      const reportPromise = fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      // Steps 0–7: fake deep-analysis phase (~7 s)
      const preAiDurations = [600, 900, 1100, 850, 800, 1000, 950, 900];
      for (let i = 0; i < preAiDurations.length; i++) {
        setProcessingStep(i);
        await new Promise((r) => setTimeout(r, preAiDurations[i]));
      }

      // Step 8: wait for AI + minimum display time (3 s)
      setProcessingStep(8);
      const [aiResult] = await Promise.all([
        reportPromise,
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      if (aiResult?.report) setReport(aiResult.report);

      // Steps 9–10: finalization phase (~1.5 s)
      setProcessingStep(9);
      await new Promise((r) => setTimeout(r, 800));
      setProcessingStep(10);
      await new Promise((r) => setTimeout(r, 700));

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
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BTB-Performance-Report-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF error:", err);
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
    metabolic: `BMI: ${scores.bmi} · VO2max: ~${scores.vo2maxEstimate} ml/kg/min · Körperzusammensetzung, Hydration und Mahlzeitenfrequenz.`,
    recovery: "Schlafdauer, -qualität und nächtliche Unterbrechungen bestimmen deine Regenerationskapazität.",
    activity: `NEAT: ~${scores.neatEstimate} kcal/Tag · Gesamtaktivität, Training und Alltagsbewegung nach ACSM.`,
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

      <div className={styles.container} id="pdf-content">

        {/* ─── HERO: Overall Score ──────────────────────── */}
        <section className={styles.heroSection}>
          <div className={styles.heroLabel}>DEIN ERGEBNIS</div>
          <h1 className={styles.heroTitle}>OVERALL PERFORMANCE SCORE</h1>

          <div className={styles.ringWrap}>
            <svg
              className={styles.ringBg}
              width="100%"
              height="100%"
              viewBox={`0 0 ${ringSize} ${ringSize}`}
            >
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringR} />
            </svg>
            <svg
              className={styles.ringFg}
              width="100%"
              height="100%"
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

        {/* ─── DERIVED METRICS ──────────────────────────── */}
        <section className={styles.scoresSection}>
          <div className={styles.sectionLabel}>DERIVED METRICS</div>
          <div className={styles.scoresGrid}>
            <div className={styles.scoreCard} style={{ animationDelay: "0.1s" }}>
              <div className={styles.scoreCardTop}>
                <div>
                  <div className={styles.scoreCardLabel}>VO2MAX SCHÄTZUNG</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(scores.vo2maxEstimate > 40 ? 70 : scores.vo2maxEstimate > 30 ? 50 : 20) }}>
                    {scores.vo2maxEstimate}
                    <span className={styles.scoreCardMax}> ml/kg/min</span>
                  </div>
                </div>
                <div
                  className={styles.scoreCardBadge}
                  style={{
                    background: scores.vo2maxEstimate >= 45 ? "rgba(34,197,94,0.12)" : scores.vo2maxEstimate >= 35 ? "rgba(245,158,11,0.12)" : "rgba(230,50,34,0.12)",
                    color: scores.vo2maxEstimate >= 45 ? "#22C55E" : scores.vo2maxEstimate >= 35 ? "#F59E0B" : "#E63222",
                  }}
                >
                  {scores.vo2maxEstimate >= 45 ? "GUT" : scores.vo2maxEstimate >= 35 ? "MITTEL" : "NIEDRIG"}
                </div>
              </div>
              <div className={styles.scoreCardDesc}>
                Geschätzte maximale Sauerstoffaufnahme basierend auf Alter, BMI, Trainingsfrequenz und Aktivitätslevel. Referenz: Jackson et al. (1990).
              </div>
            </div>

            <div className={styles.scoreCard} style={{ animationDelay: "0.15s" }}>
              <div className={styles.scoreCardTop}>
                <div>
                  <div className={styles.scoreCardLabel}>NEAT — ALLTAGSAKTIVITÄT</div>
                  <div className={styles.scoreCardValue} style={{ color: scoreColor(scores.neatEstimate > 500 ? 70 : scores.neatEstimate > 300 ? 50 : 20) }}>
                    {scores.neatEstimate}
                    <span className={styles.scoreCardMax}> kcal/Tag</span>
                  </div>
                </div>
                <div
                  className={styles.scoreCardBadge}
                  style={{
                    background: scores.neatEstimate >= 500 ? "rgba(34,197,94,0.12)" : scores.neatEstimate >= 300 ? "rgba(245,158,11,0.12)" : "rgba(230,50,34,0.12)",
                    color: scores.neatEstimate >= 500 ? "#22C55E" : scores.neatEstimate >= 300 ? "#F59E0B" : "#E63222",
                  }}
                >
                  {scores.neatEstimate >= 500 ? "AKTIV" : scores.neatEstimate >= 300 ? "MODERAT" : "GERING"}
                </div>
              </div>
              <div className={styles.scoreCardDesc}>
                Non-Exercise Activity Thermogenesis — Kalorienverbrauch durch Alltagsbewegung (ohne Sport). Basierend auf Schrittzahl, Sitzzeit und Gewicht.
              </div>
            </div>
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

        {/* ─── INSIGHTS / UPSELL ─────────────────────────── */}
        {scoreEntries.some((e) => scores[e.key] < 60) && (
          <section className={styles.insightsSection}>
            <div className={styles.sectionLabel}>DEINE SCHWACHSTELLEN — SO VERBESSERST DU DICH</div>
            <div className={styles.insightCards}>
              {scoreEntries.map((entry) => (
                <InsightCard
                  key={entry.key}
                  scoreKey={entry.key}
                  score={scores[entry.key]}
                  label={entry.label}
                  color={entry.color}
                />
              ))}
            </div>
          </section>
        )}

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
            Hinweis: Dieser Report dient ausschließlich der allgemeinen Information und ersetzt keinen
            Arztbesuch, keine medizinische Diagnose oder Therapieempfehlung. Bei gesundheitlichen
            Beschwerden konsultieren Sie bitte einen Arzt. Kein Medizinprodukt i.S.d. MDR.
          </p>
        </section>
      </div>
    </div>
  );
}
