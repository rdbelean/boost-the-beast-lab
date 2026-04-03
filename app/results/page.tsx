"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import Link from "next/link";
import type { AssessmentData } from "@/lib/scoring";
import type { ScoreResult } from "@/lib/scoring";

/* ─── Animated number ───────────────────────────────────────── */
function AnimatedNumber({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, duration]);
  return <>{value}</>;
}

/* ─── Score Ring ────────────────────────────────────────────── */
function ScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const r = (size / 2) - 10;
  const circumference = 2 * Math.PI * r;
  const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#E63222";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="8"/>
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
          transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono-data font-bold" style={{ fontSize: size * 0.28, color, lineHeight: 1 }}>
          <AnimatedNumber target={score} duration={1.8} />
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>/100</div>
      </div>
    </div>
  );
}

/* ─── Score Bar Card ────────────────────────────────────────── */
function ScoreCard({
  label, score, description, delay = 0
}: {
  label: string; score: number; description: string; delay?: number;
}) {
  const color = score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--accent-red)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="p-6"
      style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-headline text-xs tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            {label}
          </div>
          <div className="font-mono-data text-3xl font-bold" style={{ color }}>
            <AnimatedNumber target={score} duration={1.6} />
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>/100</span>
          </div>
        </div>
        <div
          className="text-xs px-2 py-1 font-headline"
          style={{
            background: score >= 70 ? "rgba(34,197,94,0.12)" : score >= 40 ? "rgba(245,158,11,0.12)" : "rgba(230,50,34,0.12)",
            color,
          }}
        >
          {score >= 70 ? "GUT" : score >= 40 ? "MITTEL" : "NIEDRIG"}
        </div>
      </div>
      <div className="progress-bar mb-3">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.6, ease: "easeOut", delay: delay + 0.2 }}
          style={{ background: color }}
        />
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{description}</p>
    </motion.div>
  );
}

/* ─── Processing Screen ─────────────────────────────────────── */
function ProcessingScreen({ step }: { step: number }) {
  const steps = [
    "Daten werden verarbeitet...",
    "Scores werden berechnet...",
    "AI generiert deinen Report...",
    "Report wird finalisiert...",
  ];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--primary-black)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm px-6"
      >
        {/* Animated ring */}
        <div className="relative w-24 h-24 mx-auto mb-10">
          <svg className="animate-spin" width="96" height="96" viewBox="0 0 96 96" style={{ animationDuration: "1.5s" }}>
            <circle cx="48" cy="48" r="38" fill="none" stroke="var(--border)" strokeWidth="4"/>
            <circle cx="48" cy="48" r="38" fill="none" stroke="var(--accent-red)" strokeWidth="4"
              strokeDasharray="60 180" strokeLinecap="round" transform="rotate(-90 48 48)"/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full animate-pulse-red" style={{ background: "var(--accent-red)" }}/>
          </div>
        </div>

        <div className="font-headline text-xl font-bold text-white mb-8">
          DEINE DATEN WERDEN ANALYSIERT
        </div>

        <div className="space-y-3">
          {steps.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= step ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 text-sm"
              style={{ color: i <= step ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l4 4 6-7" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : i === step ? (
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent-red)" }}/>
                ) : (
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--border)" }}/>
                )}
              </div>
              {s}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Report Renderer ───────────────────────────────────────── */
function ReportText({ text }: { text: string }) {
  const sections = text.split(/^## /m).filter(Boolean);

  return (
    <div className="space-y-8">
      {sections.map((section, i) => {
        const lines = section.split("\n");
        const title = lines[0].trim();
        const body = lines.slice(1).join("\n").trim();

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6"
            style={{ background: i % 2 === 0 ? "var(--surface-card)" : "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            <div
              className="font-headline text-xs tracking-widest mb-4 pb-3"
              style={{ color: "var(--accent-red)", borderBottom: "1px solid var(--border)" }}
            >
              {title.replace(/^##\s*/, "")}
            </div>
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-secondary)" }}
              dangerouslySetInnerHTML={{
                __html: body
                  .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
                  .replace(/^(\d+\. )/gm, '<span style="color:var(--accent-red);font-weight:600">$1</span>'),
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Main Results Page ─────────────────────────────────────── */
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

    async function run() {
      // Step 0: processing
      setProcessingStep(0);
      await new Promise((r) => setTimeout(r, 600));
      setProcessingStep(1);
      await new Promise((r) => setTimeout(r, 600));

      try {
        // Step 2: call API
        setProcessingStep(2);
        const res = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error("API error");
        const result = await res.json();

        setProcessingStep(3);
        await new Promise((r) => setTimeout(r, 800));

        setScores(result.scores);
        setReport(result.report);
      } catch (e) {
        console.error(e);
        setError("Report-Generierung fehlgeschlagen. Bitte prüfe deinen API-Key in .env.local");
      }
    }

    run();
  }, []);

  async function downloadPdf() {
    if (!scores || !report || !assessmentData) return;
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--primary-black)" }}>
        <div className="max-w-md text-center">
          <div className="font-headline text-xl text-white mb-4">FEHLER</div>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>{error}</p>
          <Link href="/assessment" className="btn-primary">NEU STARTEN</Link>
        </div>
      </div>
    );
  }

  if (!scores) return <ProcessingScreen step={processingStep} />;

  const labelColor =
    scores.label === "ELITE" ? "var(--success)" :
    scores.label === "ÜBERDURCHSCHNITTLICH" ? "var(--warning)" :
    scores.label === "DURCHSCHNITTLICH" ? "var(--warning)" : "var(--accent-red)";

  const scoreDescriptions = {
    metabolic: `BMI: ${scores.bmi} · Dein metabolischer Status basiert auf Körperzusammensetzung, Hydration, Mahlzeitenfrequenz und Sitzzeit.`,
    recovery: "Schlafdauer, -qualität und nächtliche Unterbrechungen bestimmen deine Regenerationskapazität.",
    activity: "Gesamtaktivität, Trainingsfrequenz, -dauer und -art nach ACSM-Richtlinien bewertet.",
    stress: "Stresslevel, sedentäres Verhalten und Schlafqualität als Lifestyle-Indikatoren kombiniert.",
  };

  return (
    <div style={{ background: "var(--primary-black)", minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-6 h-14 flex items-center justify-between"
        style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="font-headline text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
          BOOST THE BEAST LAB · PERFORMANCE REPORT
        </div>
        <div className="flex items-center gap-3">
          <Link href="/assessment" className="btn-secondary text-xs py-2 px-4">
            Neue Analyse
          </Link>
          <button onClick={downloadPdf} disabled={pdfLoading} className="btn-primary text-xs py-2 px-4">
            {pdfLoading ? "..." : "PDF DOWNLOAD"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Overall Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="font-headline text-xs tracking-[0.4em] mb-6" style={{ color: "var(--accent-red)" }}>
            DEIN ERGEBNIS
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-white mb-10">
            OVERALL PERFORMANCE SCORE
          </h1>

          <div className="flex justify-center mb-6">
            <ScoreRing score={scores.overall} size={200} />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="inline-block font-headline text-2xl font-bold px-6 py-2"
            style={{ color: labelColor, border: `1px solid ${labelColor}`, background: `${labelColor}18` }}
          >
            {scores.label}
          </motion.div>
        </motion.div>

        {/* Score Cards */}
        <div className="mb-6">
          <div className="font-headline text-xs tracking-[0.4em] mb-6" style={{ color: "var(--text-muted)" }}>
            SUBSCORES IM DETAIL
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-20">
          <ScoreCard label="METABOLIC PERFORMANCE" score={scores.metabolic} description={scoreDescriptions.metabolic} delay={0} />
          <ScoreCard label="RECOVERY & REGENERATION" score={scores.recovery} description={scoreDescriptions.recovery} delay={0.1} />
          <ScoreCard label="ACTIVITY PERFORMANCE" score={scores.activity} description={scoreDescriptions.activity} delay={0.2} />
          <ScoreCard label="STRESS & LIFESTYLE" score={scores.stress} description={scoreDescriptions.stress} delay={0.3} />
        </div>

        {/* AI Report */}
        {report && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="font-headline text-xs tracking-[0.4em]" style={{ color: "var(--text-muted)" }}>
                AI-GENERIERTER PERFORMANCE REPORT
              </div>
              <div
                className="text-xs px-2 py-0.5 font-headline"
                style={{ background: "rgba(230,50,34,0.12)", color: "var(--accent-red)" }}
              >
                CLAUDE OPUS
              </div>
            </div>
            <ReportText text={report} />
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button onClick={downloadPdf} disabled={pdfLoading} className="btn-primary py-4 px-10">
            {pdfLoading ? "WIRD ERSTELLT..." : "REPORT ALS PDF HERUNTERLADEN"}
          </button>
          <Link href="/assessment" className="btn-secondary py-4 px-8 text-center">
            NEUE ANALYSE STARTEN
          </Link>
        </motion.div>

        <p className="text-center text-xs mt-8" style={{ color: "var(--text-muted)" }}>
          Dieser Report ersetzt keine medizinische Beratung. · BOOST THE BEAST LAB
        </p>
      </div>
    </div>
  );
}
