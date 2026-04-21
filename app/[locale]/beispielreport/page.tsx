"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "@/app/[locale]/results/results.module.css";
import lockedStyles from "@/components/sample-report/LockedSection.module.css";
import { SAMPLE_SCORES_DISPLAY, SAMPLE_PDF_CONTENT } from "@/lib/sample-report/data";
import SampleReportBanner from "@/components/sample-report/SampleReportBanner";
import SampleReportCta from "@/components/sample-report/SampleReportCta";
import UnlockOverlay from "@/components/sample-report/UnlockOverlay";

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

  return (
    <div className={styles.page}>
      <SampleReportBanner />

      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className={styles.headerBtnSecondary}>{t("back_home")}</Link>
        <div className={styles.headerTitle}>{ts("page_title")}</div>
        <div className={styles.headerActions}>
          <Link href="/analyse" className={`${styles.headerBtnPrimary}`}>{ts("header_cta")}</Link>
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

        {/* ─── LOCKED PREMIUM SECTIONS ─────────────────── */}
        {/* Three "upgrade to unlock" blocks that sit between the free preview
            and the final CTA. Each shows a teaser (section label + 1–2 real
            rows from the sample data), then a blurred body with an overlay
            linking back to /kaufen. This converts the sample-report page
            from a passive preview into an active sales funnel. */}

        {/* TOP PRIORITY (partial — first 2 lines readable, rest blurred) */}
        <section className={`${styles.scoresSection} ${lockedStyles.wrap}`}>
          <div className={lockedStyles.sectionLabel}>{ts("unlock.top_priority_title")}</div>
          <div className={lockedStyles.blurredPartial} aria-hidden="true">
            <div className={lockedStyles.cardFull}>
              <div className={lockedStyles.cardHeadline}>{ts("unlock.top_priority_title")}</div>
              <p className={lockedStyles.cardBody}>{SAMPLE_PDF_CONTENT.top_priority}</p>
            </div>
          </div>
          <UnlockOverlay
            title={ts("unlock.top_priority_title")}
            description={ts("unlock.top_priority_desc")}
          />
        </section>

        {/* 30-DAY FORECAST (fully blurred) */}
        <section className={`${styles.scoresSection} ${lockedStyles.wrap}`}>
          <div className={lockedStyles.sectionLabel}>{ts("unlock.forecast_title")}</div>
          <div className={lockedStyles.blurred} aria-hidden="true">
            <div className={lockedStyles.cardFull}>
              <div className={lockedStyles.cardHeadline}>{ts("unlock.forecast_title")}</div>
              <p className={lockedStyles.cardBody}>{SAMPLE_PDF_CONTENT.prognose_30_days}</p>
            </div>
            <div className={lockedStyles.cardFull}>
              <div className={lockedStyles.cardHeadline}>{SAMPLE_PDF_CONTENT.action_plan?.[0]?.headline}</div>
              <p className={lockedStyles.cardBody}>
                {SAMPLE_PDF_CONTENT.action_plan?.[0]?.current_value} →{" "}
                {SAMPLE_PDF_CONTENT.action_plan?.[0]?.target_value}
              </p>
            </div>
          </div>
          <UnlockOverlay
            title={ts("unlock.forecast_title")}
            description={ts("unlock.forecast_desc")}
          />
        </section>

        {/* DAILY LIFE PROTOCOL (first 2 habits in Morning visible, rest blurred) */}
        <section className={`${styles.scoresSection} ${lockedStyles.wrap}`}>
          <div className={lockedStyles.sectionLabel}>{ts("unlock.protocol_title")}</div>
          <div className={lockedStyles.blurredPartial} aria-hidden="true">
            <div className={lockedStyles.protocolGrid}>
              {(["morning", "work_day", "evening", "nutrition_micro"] as const).map((slot) => {
                const habits = SAMPLE_PDF_CONTENT.daily_life_protocol?.[slot] ?? [];
                return (
                  <div key={slot} className={lockedStyles.protocolCol}>
                    <div className={lockedStyles.protocolColTitle}>{ts(`unlock.protocol_${slot}`)}</div>
                    {habits.slice(0, 2).map((h, i) => (
                      <div key={i} className={lockedStyles.protocolHabit}>
                        <span className={lockedStyles.protocolHabitTitle}>{h.habit}</span>
                        <span className={lockedStyles.protocolHabitWhy}>{h.why_specific_to_user}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <UnlockOverlay
            title={ts("unlock.protocol_title")}
            description={ts("unlock.protocol_desc")}
          />
        </section>

        {/* ─── CONVERSION CTA ──────────────────────────── */}
        <SampleReportCta />

      </div>
    </div>
  );
}
