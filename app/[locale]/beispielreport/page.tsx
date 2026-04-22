"use client";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "@/app/[locale]/results/results.module.css";
import { SAMPLE_SCORES_DISPLAY, SAMPLE_PDF_CONTENT } from "@/lib/sample-report/data";
import SampleReportBanner from "@/components/sample-report/SampleReportBanner";

/* ─── Helpers ───────────────────────────────────────────────── */
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

/* ─── Radar Chart ────────────────────────────────────────────── */
interface RadarScores { metabolic: number; sleep: number; activity: number; stress: number; vo2max: number }
function RadarChart({ scores }: { scores: RadarScores }) {
  const categories = [
    { label: "Activity", value: scores.activity },
    { label: "Sleep", value: scores.sleep },
    { label: "VO2max", value: scores.vo2max },
    { label: "Metabolic", value: scores.metabolic },
    { label: "Stress", value: scores.stress },
  ];
  const cx = 190, cy = 190, maxR = 140, n = categories.length;
  const polarToCart = (angle: number, r: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
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

/* ─── Main Page ─────────────────────────────────────────────── */
export default function BeispielreportPage() {
  const t = useTranslations("results");
  const ts = useTranslations("sample_report");
  const locale = useLocale();

  const scores = SAMPLE_SCORES_DISPLAY;
  const overall = scores.overall_score_0_100;
  const labelColor = scoreColor(overall);

  const scoreEntries = [
    { key: "activity", label: t("score_entries.activity.label"), color: "#E63222", score: scores.activity.activity_score_0_100, desc: t("score_entries.activity.desc", { met: scores.activity.total_met_minutes_week, category: scores.activity.activity_category }) },
    { key: "sleep", label: t("score_entries.sleep.label"), color: "#3B82F6", score: scores.sleep.sleep_score_0_100, desc: t("score_entries.sleep.desc", { duration: scores.sleep.sleep_duration_band, quality: scores.sleep.sleep_band }) },
    { key: "vo2max", label: t("score_entries.vo2max.label"), color: "#8B5CF6", score: scores.vo2max.fitness_score_0_100, desc: t("score_entries.vo2max.desc", { vo2: scores.vo2max.vo2max_estimated, band: scores.vo2max.vo2max_band }) },
    { key: "metabolic", label: t("score_entries.metabolic.label"), color: "#F59E0B", score: scores.metabolic.metabolic_score_0_100, desc: t("score_entries.metabolic.desc", { bmi: scores.metabolic.bmi, category: scores.metabolic.bmi_category, band: scores.metabolic.metabolic_band }) },
    { key: "stress", label: t("score_entries.stress.label"), color: "#22C55E", score: scores.stress.stress_score_0_100, desc: t("score_entries.stress.desc", { band: scores.stress.stress_band }) },
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

  function openSamplePdf() {
    const newTab = window.open("", "_blank");
    const url = `/api/sample-report/pdf?locale=${locale}`;
    if (newTab && !newTab.closed) newTab.location.href = url;
    else window.open(url, "_blank");
  }

  return (
    <>
      {/* Sticky amber banner lives OUTSIDE .page so overflow-x:hidden on .page
          cannot trap it. z-index 100 keeps it above all other content. */}
      <SampleReportBanner />

      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/" className={styles.headerBtnSecondary}>{t("back_home")}</Link>
          <div className={styles.headerTitle}>{ts("page_title")}</div>
          <div className={styles.headerActions}>
            <button onClick={openSamplePdf} className={styles.headerBtnSecondary} style={{ cursor: "pointer", background: "none", border: "1px solid #333" }}>
              {ts("cta_btn_pdf")}
            </button>
          </div>
        </div>

        <div className={styles.container} id="results-content">

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
                style={{ transform: "rotate(-90deg)" } as React.CSSProperties}
              >
                <circle
                  cx={ringSize / 2} cy={ringSize / 2} r={ringR}
                  stroke={labelColor}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className={styles.ringCenter}>
                <span className={styles.ringValue} style={{ color: labelColor }}>{overall}</span>
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
                          {entry.score}<span className={styles.scoreCardMax}>/100</span>
                        </div>
                      </div>
                      <div className={styles.scoreCardBadge} style={{ background: `${c}18`, color: c }}>
                        {t(`badges.${scoreBadgeKey(entry.score)}`)}
                      </div>
                    </div>
                    <div className={styles.scoreCardBar}>
                      <div className={styles.scoreCardBarFill} style={{ width: `${entry.score}%`, background: c }} />
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
              <div className={styles.scoreCard}>
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
                <div className={styles.scoreCardDesc}>{t("vo2max_card.desc")}</div>
              </div>

              <div className={styles.scoreCard}>
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
                <div className={styles.scoreCardDesc}>{t("bmi_card.desc")}</div>
              </div>

              <div className={styles.scoreCard}>
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
                <div className={styles.scoreCardDesc}>{t("met_card.desc")}</div>
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
                    <div className={styles.benchmarkBarFill} style={{ width: `${entry.score}%`, background: entry.color }} />
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

          {/* ─── TOP PRIORITY ────────────────────────────── */}
          <section className={styles.scoresSection}>
            <div className={styles.sectionLabel}>{ts("unlock.top_priority_title")}</div>
            <div className={styles.scoreCard} style={{ padding: "1.5rem" }}>
              <p style={{ fontSize: "0.875rem", color: "#d0d0d0", lineHeight: 1.7, margin: 0 }}>
                {SAMPLE_PDF_CONTENT.top_priority}
              </p>
            </div>
          </section>

          {/* ─── 30-DAY FORECAST ─────────────────────────── */}
          <section className={styles.scoresSection}>
            <div className={styles.sectionLabel}>{ts("unlock.forecast_title")}</div>
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.8rem", color: "#888", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
                {SAMPLE_PDF_CONTENT.prognose_30_days}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {SAMPLE_PDF_CONTENT.action_plan?.map((goal, i) => (
                <div key={i} style={{
                  background: "#111",
                  border: "1px solid #1e1e1e",
                  padding: "1.25rem 1.5rem",
                }}>
                  <div style={{
                    fontFamily: "var(--font-oswald), sans-serif",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: "#fff",
                    marginBottom: "0.625rem",
                  }}>
                    {goal.headline}
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#888", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                    <span>{goal.current_value}</span>
                    <span style={{ color: "#555" }}>→</span>
                    <span style={{ color: "#bbb" }}>{goal.target_value}</span>
                  </div>
                  {goal.week_milestones?.map((m, j) => (
                    <div key={j} style={{
                      display: "flex",
                      gap: "0.75rem",
                      fontSize: "0.75rem",
                      color: "#666",
                      paddingTop: "0.375rem",
                      borderTop: j === 0 ? "1px solid #1a1a1a" : undefined,
                    }}>
                      <span style={{ color: "#555", flexShrink: 0, minWidth: "4.5rem" }}>{m.week}</span>
                      <span>{m.task}</span>
                      <span style={{ color: "#444", marginLeft: "auto", flexShrink: 0 }}>→ {m.milestone}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ─── DAILY LIFE PROTOCOL ─────────────────────── */}
          <section className={styles.scoresSection}>
            <div className={styles.sectionLabel}>{ts("unlock.protocol_title")}</div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}>
              {(["morning", "work_day", "evening", "nutrition_micro"] as const).map((slot) => {
                const habits = SAMPLE_PDF_CONTENT.daily_life_protocol?.[slot] ?? [];
                return (
                  <div key={slot} style={{
                    background: "#111",
                    border: "1px solid #1e1e1e",
                    padding: "1.25rem",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-oswald), sans-serif",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      color: "#E63222",
                      marginBottom: "0.875rem",
                    }}>
                      {ts(`unlock.protocol_${slot}`)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                      {habits.map((h, i) => (
                        <div key={i}>
                          <div style={{ fontSize: "0.8rem", color: "#d0d0d0", lineHeight: 1.45, marginBottom: "0.25rem" }}>
                            {h.habit}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "#666", lineHeight: 1.5 }}>
                            {h.why_specific_to_user}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
