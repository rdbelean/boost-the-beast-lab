"use client";
import styles from "./account.module.css";

export interface AccountReport {
  id: string;
  date: string;
  isoDate: string;
  overall: number;
  band: string;
  scores: { activity: number; sleep: number; vo2max: number; metabolic: number; stress: number };
  pdfUrl: string | null;
  planUrls: {
    activity: string | null;
    metabolic: string | null;
    recovery: string | null;
    stress: string | null;
  };
}

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
      <div className={styles.compareBarWrap}>
        <div className={styles.compareBarFill} style={{ width: `${current}%`, background: color }} />
        {previous !== null && (
          <div className={styles.compareBarPrev} style={{ width: `${previous}%` }} />
        )}
      </div>
      <div className={styles.compareScores}>
        {previous !== null && <span className={styles.compareOld}>{previous}</span>}
        {previous !== null && <span className={styles.compareArrowMid}>→</span>}
        <span className={styles.compareNew} style={{ color: bandColor(current) }}>{current}</span>
        {delta !== null && (
          <span
            className={
              improved ? styles.compareDeltaPos : declined ? styles.compareDeltaNeg : styles.compareDeltaZero
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

function DownloadBtn({ url, label, filename }: { url: string | null; label: string; filename: string }) {
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.pdfBtn}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M5 1v6M2 7l3 2 3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {label}
      </a>
    );
  }
  return (
    <span className={styles.pdfBtnDisabled} title="Nicht verfügbar">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
        <path d="M5 1v6M2 7l3 2 3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </span>
  );
}

export default function AccountView({ reports }: { reports: AccountReport[] }) {
  const latest = reports[0];
  const oldest = reports[reports.length - 1];

  return (
    <>
      {reports.length >= 2 && (
        <section className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressTitle}>GESAMTFORTSCHRITT</span>
            <span className={styles.progressRange}>{oldest.date} → {latest.date}</span>
          </div>

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
                  {latest.overall > oldest.overall
                    ? `+${latest.overall - oldest.overall}`
                    : latest.overall - oldest.overall}
                </span>
              </div>
            </div>
            <div className={styles.overallBannerRight}>
              <div className={styles.overallPctLabel}>VERÄNDERUNG</div>
              <div
                className={styles.overallPct}
                style={{ color: latest.overall >= oldest.overall ? "#22C55E" : "#E63222" }}
              >
                {oldest.overall > 0
                  ? `${latest.overall >= oldest.overall ? "+" : ""}${Math.round(
                      ((latest.overall - oldest.overall) / oldest.overall) * 100,
                    )}%`
                  : "—"}
              </div>
            </div>
          </div>

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

      <div className={styles.reportListHeader}>
        <span>ALLE ANALYSEN</span>
        <span className={styles.reportCount}>{reports.length} Reports</span>
      </div>

      <div className={styles.reportList}>
        {reports.map((report, i) => {
          const prev = reports[i + 1] ?? null;
          const overallColor = bandColor(report.overall);
          const overallDelta = prev ? report.overall - prev.overall : null;

          return (
            <div key={report.id} className={styles.reportCard} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className={styles.reportCardTop}>
                <div className={styles.reportMeta}>
                  <span className={styles.reportDate}>{report.date}</span>
                  <span className={styles.reportId}>{report.id.slice(0, 8)}</span>
                </div>
                <div className={styles.reportOverall}>
                  {prev && <span className={styles.overallPrevScore}>{prev.overall}</span>}
                  {prev && <span className={styles.overallSep}>→</span>}
                  <span className={styles.reportScore} style={{ color: overallColor }}>
                    {report.overall}
                  </span>
                  <span className={styles.reportScoreMax}>/100</span>
                  {report.band && (
                    <span
                      className={styles.reportBand}
                      style={{ color: overallColor, borderColor: overallColor, background: `${overallColor}18` }}
                    >
                      {report.band.toUpperCase()}
                    </span>
                  )}
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
                          <div className={styles.subScoreBarPrev} style={{ width: `${prevScore}%` }} />
                        )}
                      </div>
                      <div className={styles.subScoreRowRight}>
                        {prevScore !== null && <span className={styles.subScoreOld}>{prevScore}</span>}
                        {prevScore !== null && <span className={styles.subScoreSep}>→</span>}
                        <span className={styles.subScoreCurrent} style={{ color: bandColor(current) }}>
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

              <div className={styles.reportActions}>
                <DownloadBtn url={report.pdfUrl}              label="Performance Report"    filename={`Performance-Report_${report.isoDate}.pdf`} />
                <DownloadBtn url={report.planUrls.activity}   label="Activity Plan"         filename={`Activity-Plan_${report.isoDate}.pdf`} />
                <DownloadBtn url={report.planUrls.metabolic}  label="Metabolic Plan"        filename={`Metabolic-Plan_${report.isoDate}.pdf`} />
                <DownloadBtn url={report.planUrls.recovery}   label="Recovery Plan"         filename={`Recovery-Plan_${report.isoDate}.pdf`} />
                <DownloadBtn url={report.planUrls.stress}     label="Stress Plan"           filename={`Stress-Lifestyle-Plan_${report.isoDate}.pdf`} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
