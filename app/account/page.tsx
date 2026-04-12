"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./account.module.css";
import BackButton from "@/components/ui/BackButton";

/* ─── Demo report history ───────────────────────────────────── */
const DEMO_REPORTS = [
  {
    id: "rpt-20260312",
    date: "12. März 2026",
    overall: 61,
    band: "GUT",
    scores: { activity: 58, sleep: 67, vo2max: 55, metabolic: 62, stress: 63 },
  },
  {
    id: "rpt-20260215",
    date: "15. Feb. 2026",
    overall: 54,
    band: "MITTEL",
    scores: { activity: 49, sleep: 60, vo2max: 48, metabolic: 57, stress: 56 },
  },
  {
    id: "rpt-20260110",
    date: "10. Jan. 2026",
    overall: 47,
    band: "MITTEL",
    scores: { activity: 41, sleep: 52, vo2max: 44, metabolic: 51, stress: 49 },
  },
];

function bandColor(score: number) {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#E63222";
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className={styles.miniBarTrack}>
      <div className={styles.miniBarFill} style={{ width: `${score}%`, background: color }} />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function AccountPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <BackButton />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.accountHeader}>
          <div>
            <div className={styles.accountTag}>MEIN ACCOUNT</div>
            <h1 className={styles.accountTitle}>REPORT-HISTORIE</h1>
            <p className={styles.accountSub}>
              Alle deine bisherigen Performance-Analysen auf einen Blick.
            </p>
          </div>
          <button
            className={styles.newAnalysisBtn}
            onClick={() => router.push("/kaufen")}
          >
            NEUE ANALYSE →
          </button>
        </div>

        {/* Demo notice */}
        <div className={styles.demoNotice}>
          Demo-Modus — Beispiel-Reports zur Veranschaulichung
        </div>

        {/* Report list */}
        <div className={styles.reportList}>
          {DEMO_REPORTS.map((report, i) => {
            const color = bandColor(report.overall);
            return (
              <div key={report.id} className={styles.reportCard} style={{ animationDelay: `${i * 0.08}s` }}>
                {/* Top row */}
                <div className={styles.reportCardTop}>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportDate}>{report.date}</span>
                    <span className={styles.reportId}>{report.id}</span>
                  </div>
                  <div className={styles.reportOverall}>
                    <span className={styles.reportScore} style={{ color }}>
                      {report.overall}
                    </span>
                    <span className={styles.reportScoreMax}>/100</span>
                    <span
                      className={styles.reportBand}
                      style={{ color, borderColor: color, background: `${color}18` }}
                    >
                      {report.band}
                    </span>
                  </div>
                </div>

                {/* Sub-scores */}
                <div className={styles.subScores}>
                  {(
                    [
                      { key: "activity",  label: "ACTIVITY",  score: report.scores.activity,  color: "#E63222" },
                      { key: "sleep",     label: "SLEEP",     score: report.scores.sleep,     color: "#3B82F6" },
                      { key: "vo2max",    label: "VO2MAX",    score: report.scores.vo2max,    color: "#8B5CF6" },
                      { key: "metabolic", label: "METABOLIC", score: report.scores.metabolic, color: "#F59E0B" },
                      { key: "stress",    label: "STRESS",    score: report.scores.stress,    color: "#22C55E" },
                    ] as const
                  ).map((s) => (
                    <div key={s.key} className={styles.subScore}>
                      <div className={styles.subScoreLabel}>{s.label}</div>
                      <ScoreBar score={s.score} color={s.color} />
                      <div className={styles.subScoreVal} style={{ color: bandColor(s.score) }}>
                        {s.score}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className={styles.reportActions}>
                  <button className={styles.viewBtn} disabled title="Bald verfügbar">
                    REPORT ANSEHEN
                  </button>
                  <button className={styles.pdfBtn} disabled title="Bald verfügbar">
                    PDF ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state hint */}
        <div className={styles.emptyHint}>
          Zukünftige Analysen werden hier automatisch gespeichert.
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <Link href="/kaufen" className={styles.ctaBtn}>
            NEUE ANALYSE STARTEN →
          </Link>
          <Link href="/" className={styles.ctaSecondary}>
            ← STARTSEITE
          </Link>
        </div>
      </div>
    </div>
  );
}
