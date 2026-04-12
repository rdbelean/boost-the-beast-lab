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

/* ─── Comparison row: shows old → new with arrow + delta ─────── */
function CompareRow({
  label,
  color,
  current,
  previous,
}: {
  label: string;
  color: string;
  current: number;
  previous: number | null;
}) {
  const delta = previous !== null ? current - previous : null;
  const improved = delta !== null && delta > 0;
  const declined = delta !== null && delta < 0;

  return (
    <div className={styles.compareRow}>
      <div className={styles.compareLabel}>{label}</div>

      {/* Bar */}
      <div className={styles.compareBarWrap}>
        <div
          className={styles.compareBarFill}
          style={{ width: `${current}%`, background: color }}
        />
        {previous !== null && (
          <div
            className={styles.compareBarPrev}
            style={{ width: `${previous}%` }}
          />
        )}
      </div>

      {/* Scores */}
      <div className={styles.compareScores}>
        {/* Old score (crossed out, gray) */}
        {previous !== null && (
          <span className={styles.compareOld}>{previous}</span>
        )}
        {previous !== null && (
          <span className={styles.compareArrowMid}>→</span>
        )}
        {/* New score */}
        <span className={styles.compareNew} style={{ color: bandColor(current) }}>
          {current}
        </span>
        {/* Arrow + delta */}
        {delta !== null && (
          <span
            className={
              improved
                ? styles.compareDeltaPos
                : declined
                ? styles.compareDeltaNeg
                : styles.compareDeltaZero
            }
          >
            {improved ? "↑" : declined ? "↓" : "→"}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
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

        <div className={styles.demoNotice}>
          Demo-Modus — Beispiel-Reports zur Veranschaulichung
        </div>

        {/* ─── Gesamtfortschritt ────────────────────────── */}
        {DEMO_REPORTS.length >= 2 && (
          <section className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressTitle}>GESAMTFORTSCHRITT</span>
              <span className={styles.progressRange}>{oldest.date} → {latest.date}</span>
            </div>

            {/* Overall highlight */}
            <div className={styles.overallBanner}>
              <div className={styles.overallBannerLeft}>
                <div className={styles.overallBannerLabel}>OVERALL PERFORMANCE SCORE</div>
                <div className={styles.overallBannerRow}>
                  <span className={styles.overallOld}>{oldest.overall}</span>
                  <span className={styles.overallBannerArrow}>→</span>
                  <span className={styles.overallNew} style={{ color: bandColor(latest.overall) }}>
                    {latest.overall}
                  </span>
                  <span className={latest.overall > oldest.overall ? styles.overallDeltaPos : styles.overallDeltaNeg}>
                    {latest.overall > oldest.overall ? "↑" : "↓"}
                    {latest.overall > oldest.overall ? `+${latest.overall - oldest.overall}` : latest.overall - oldest.overall}
                  </span>
                </div>
              </div>
              <div className={styles.overallBannerRight}>
                <div className={styles.overallPctLabel}>VERBESSERUNG</div>
                <div className={styles.overallPct} style={{ color: "#22C55E" }}>
                  +{Math.round(((latest.overall - oldest.overall) / oldest.overall) * 100)}%
                </div>
              </div>
            </div>

            {/* Sub-score comparison table */}
            <div className={styles.compareTable}>
              <div className={styles.compareTableHeader}>
                <span></span>
                <span></span>
                <div className={styles.compareTableHeadScores}>
                  <span className={styles.compareTableHeadOld}>{oldest.date}</span>
                  <span></span>
                  <span className={styles.compareTableHeadNew}>{latest.date}</span>
                  <span className={styles.compareTableHeadDelta}>DIFF</span>
                </div>
              </div>
              {SCORE_DEFS.map((def) => (
                <CompareRow
                  key={def.key}
                  label={def.label}
                  color={def.color}
                  current={latest.scores[def.key]}
                  previous={oldest.scores[def.key]}
                />
              ))}
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
            const prev = DEMO_REPORTS[i + 1] ?? null;
            const overallColor = bandColor(report.overall);
            const overallDelta = prev ? report.overall - prev.overall : null;

            return (
              <div key={report.id} className={styles.reportCard} style={{ animationDelay: `${i * 0.08}s` }}>

                {/* ── Top row ─────────────────────────────── */}
                <div className={styles.reportCardTop}>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportDate}>{report.date}</span>
                    <span className={styles.reportId}>{report.id}</span>
                  </div>
                  <div className={styles.reportOverall}>
                    {prev && (
                      <span className={styles.overallPrevScore}>{prev.overall}</span>
                    )}
                    {prev && <span className={styles.overallSep}>→</span>}
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
                    {overallDelta !== null && (
                      <span
                        className={
                          overallDelta > 0
                            ? styles.compareDeltaPos
                            : overallDelta < 0
                            ? styles.compareDeltaNeg
                            : styles.compareDeltaZero
                        }
                      >
                        {overallDelta > 0 ? "↑" : overallDelta < 0 ? "↓" : "→"}
                        {overallDelta > 0 ? `+${overallDelta}` : overallDelta}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Sub-score comparison ─────────────────── */}
                <div className={styles.subScoreList}>
                  {SCORE_DEFS.map((def) => {
                    const current = report.scores[def.key];
                    const prevScore = prev?.scores[def.key] ?? null;
                    const delta = prevScore !== null ? current - prevScore : null;
                    return (
                      <div key={def.key} className={styles.subScoreRow}>
                        <span className={styles.subScoreRowLabel}>{def.label}</span>
                        <div className={styles.subScoreBarTrack}>
                          <div
                            className={styles.subScoreBarFill}
                            style={{ width: `${current}%`, background: def.color }}
                          />
                          {prevScore !== null && (
                            <div
                              className={styles.subScoreBarPrev}
                              style={{ width: `${prevScore}%` }}
                            />
                          )}
                        </div>
                        <div className={styles.subScoreRowRight}>
                          {prevScore !== null && (
                            <span className={styles.subScoreOld}>{prevScore}</span>
                          )}
                          {prevScore !== null && (
                            <span className={styles.subScoreSep}>→</span>
                          )}
                          <span
                            className={styles.subScoreCurrent}
                            style={{ color: bandColor(current) }}
                          >
                            {current}
                          </span>
                          {delta !== null && (
                            <span
                              className={
                                delta > 0
                                  ? styles.compareDeltaPos
                                  : delta < 0
                                  ? styles.compareDeltaNeg
                                  : styles.compareDeltaZero
                              }
                            >
                              {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"}
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Actions ─────────────────────────────── */}
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
