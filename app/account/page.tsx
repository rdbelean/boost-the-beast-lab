"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./account.module.css";
import BackButton from "@/components/ui/BackButton";

/* ─── Demo data (newest first) ──────────────────────────────── */
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

const SCORE_DEFS = [
  { key: "activity" as const,  label: "ACTIVITY",  color: "#E63222" },
  { key: "sleep" as const,     label: "SLEEP",     color: "#3B82F6" },
  { key: "vo2max" as const,    label: "VO2MAX",    color: "#8B5CF6" },
  { key: "metabolic" as const, label: "METABOLIC", color: "#F59E0B" },
  { key: "stress" as const,    label: "STRESS",    color: "#22C55E" },
];

function bandColor(score: number) {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#E63222";
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className={styles.deltaNeutral}>→ 0</span>;
  if (delta > 0) return (
    <span className={styles.deltaPos}>↑ +{delta}</span>
  );
  return <span className={styles.deltaNeg}>↓ {delta}</span>;
}

function MiniBar({ score, color }: { score: number; color: string }) {
  return (
    <div className={styles.miniBarTrack}>
      <div className={styles.miniBarFill} style={{ width: `${score}%`, background: color }} />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function AccountPage() {
  const router = useRouter();

  const latest = DEMO_REPORTS[0];
  const oldest = DEMO_REPORTS[DEMO_REPORTS.length - 1];

  return (
    <div className={styles.page}>
      <BackButton />

      <div className={styles.container}>

        {/* ─── Header ────────────────────────────────────── */}
        <div className={styles.accountHeader}>
          <div>
            <div className={styles.accountTag}>MEIN ACCOUNT</div>
            <h1 className={styles.accountTitle}>REPORT-HISTORIE</h1>
            <p className={styles.accountSub}>
              Alle deine bisherigen Performance-Analysen auf einen Blick.
            </p>
          </div>
          <button className={styles.newAnalysisBtn} onClick={() => router.push("/kaufen")}>
            NEUE ANALYSE →
          </button>
        </div>

        {/* ─── Demo notice ────────────────────────────────── */}
        <div className={styles.demoNotice}>
          Demo-Modus — Beispiel-Reports zur Veranschaulichung
        </div>

        {/* ─── Progress summary (oldest → newest) ─────────── */}
        {DEMO_REPORTS.length >= 2 && (
          <section className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <div className={styles.progressTitle}>GESAMTFORTSCHRITT</div>
              <div className={styles.progressRange}>
                {oldest.date} → {latest.date}
              </div>
            </div>

            {/* Overall delta banner */}
            <div className={styles.overallDeltaBanner}>
              <div className={styles.overallDeltaLabel}>OVERALL PERFORMANCE</div>
              <div className={styles.overallDeltaRow}>
                <span className={styles.overallFrom}>{oldest.overall}</span>
                <span className={styles.overallArrow}>→</span>
                <span className={styles.overallTo} style={{ color: bandColor(latest.overall) }}>
                  {latest.overall}
                </span>
                <span
                  className={
                    latest.overall - oldest.overall > 0
                      ? styles.overallDeltaPos
                      : latest.overall - oldest.overall < 0
                      ? styles.overallDeltaNeg
                      : styles.overallDeltaNeutral
                  }
                >
                  {latest.overall - oldest.overall > 0 ? "+" : ""}
                  {latest.overall - oldest.overall}
                </span>
              </div>
            </div>

            {/* Sub-score progress grid */}
            <div className={styles.progressGrid}>
              {SCORE_DEFS.map((def) => {
                const from = oldest.scores[def.key];
                const to = latest.scores[def.key];
                const delta = to - from;
                const pct = Math.round((delta / Math.max(from, 1)) * 100);
                return (
                  <div key={def.key} className={styles.progressCard}>
                    <div className={styles.progressCardLabel}>{def.label}</div>
                    <div className={styles.progressCardScores}>
                      <span className={styles.progressFrom}>{from}</span>
                      <span className={styles.progressArrow} style={{ color: def.color }}>→</span>
                      <span className={styles.progressTo} style={{ color: bandColor(to) }}>{to}</span>
                    </div>
                    <div className={styles.progressCardDelta}>
                      <DeltaBadge delta={delta} />
                      <span className={styles.progressPct}>
                        {pct > 0 ? "+" : ""}{pct}%
                      </span>
                    </div>
                    {/* Progress bar: from vs to */}
                    <div className={styles.progressBarCombo}>
                      <div
                        className={styles.progressBarPrev}
                        style={{ width: `${from}%` }}
                      />
                      <div
                        className={styles.progressBarCurrent}
                        style={{ width: `${to}%`, background: def.color }}
                      />
                    </div>
                    <div className={styles.progressBarLegend}>
                      <span>JAN</span>
                      <span>MRZ</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Report list ────────────────────────────────── */}
        <div className={styles.reportListHeader}>
          <span>ALLE ANALYSEN</span>
          <span className={styles.reportCount}>{DEMO_REPORTS.length} Reports</span>
        </div>

        <div className={styles.reportList}>
          {DEMO_REPORTS.map((report, i) => {
            const prevReport = DEMO_REPORTS[i + 1] ?? null;
            const overallColor = bandColor(report.overall);

            return (
              <div
                key={report.id}
                className={styles.reportCard}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Top row */}
                <div className={styles.reportCardTop}>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportDate}>{report.date}</span>
                    <span className={styles.reportId}>{report.id}</span>
                  </div>
                  <div className={styles.reportOverall}>
                    <span className={styles.reportScore} style={{ color: overallColor }}>
                      {report.overall}
                    </span>
                    <span className={styles.reportScoreMax}>/100</span>
                    <span
                      className={styles.reportBand}
                      style={{ color: overallColor, borderColor: overallColor, background: `${overallColor}18` }}
                    >
                      {report.band}
                    </span>
                    {prevReport && (
                      <DeltaBadge delta={report.overall - prevReport.overall} />
                    )}
                  </div>
                </div>

                {/* Sub-scores with deltas */}
                <div className={styles.subScores}>
                  {SCORE_DEFS.map((def) => {
                    const score = report.scores[def.key];
                    const prevScore = prevReport?.scores[def.key] ?? null;
                    const delta = prevScore !== null ? score - prevScore : null;
                    return (
                      <div key={def.key} className={styles.subScore}>
                        <div className={styles.subScoreLabel}>{def.label}</div>
                        <MiniBar score={score} color={def.color} />
                        <div className={styles.subScoreBottom}>
                          <span className={styles.subScoreVal} style={{ color: bandColor(score) }}>
                            {score}
                          </span>
                          {delta !== null && (
                            <span
                              className={
                                delta > 0
                                  ? styles.subDeltaPos
                                  : delta < 0
                                  ? styles.subDeltaNeg
                                  : styles.subDeltaNeutral
                              }
                            >
                              {delta > 0 ? "+" : ""}{delta}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

        <div className={styles.emptyHint}>
          Zukünftige Analysen werden hier automatisch gespeichert.
        </div>

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
