"use client";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildPlan, type PlanType } from "@/lib/plan/buildPlan";
import { SAMPLE_SCORES_DISPLAY } from "@/lib/sample-report/data";
import styles from "@/app/[locale]/plans/[type]/plan.module.css";

const VALID_TYPES: PlanType[] = ["activity", "metabolic", "recovery", "stress"];

type UrgencyKey = "critical" | "action" | "optimize" | "finetune" | "top";
function urgencyBucket(score: number): { key: UrgencyKey; color: string } {
  if (score <= 30) return { key: "critical", color: "#DC2626" };
  if (score <= 50) return { key: "action",   color: "#B45309" };
  if (score <= 70) return { key: "optimize", color: "#A1A1AA" };
  if (score <= 85) return { key: "finetune", color: "#4D7C0F" };
  return                 { key: "top",       color: "#15803D" };
}

export default function SamplePlanPage() {
  const t = useTranslations("plans_detail");
  const ts = useTranslations("sample_report");
  const tResults = useTranslations("results");
  const locale = useLocale();
  const { type } = useParams() as { type: string };

  if (!VALID_TYPES.includes(type as PlanType)) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <p>{t("error_unknown_type")}</p>
          <Link href="/beispielreport" className={styles.backLink}>{t("back_to_report")}</Link>
        </div>
      </div>
    );
  }

  const plan = buildPlan(type as PlanType, SAMPLE_SCORES_DISPLAY);
  const urgency = plan.score != null ? urgencyBucket(plan.score) : null;

  function openSamplePdf() {
    const newTab = window.open("", "_blank");
    const url = `/api/sample-report/plan-pdf?type=${type}&locale=${locale}`;
    if (newTab && !newTab.closed) {
      newTab.location.href = url;
    } else {
      window.open(url, "_blank");
    }
  }

  return (
    <div className={styles.page}>
      {/* Amber sample banner */}
      <div
        role="banner"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "linear-gradient(90deg, #92400E 0%, #B45309 50%, #92400E 100%)",
          borderBottom: "1px solid #D97706",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "#FEF3C7",
            letterSpacing: "0.02em",
          }}
        >
          {ts("sample_plan_banner")}
        </span>
        <Link
          href="/analyse"
          style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#1A1A1A",
            background: "#FCD34D",
            padding: "8px 18px",
            borderRadius: 2,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {ts("sample_plan_cta_start")} →
        </Link>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <Link href="/beispielreport" className={styles.backLink}>{t("back_to_report_upper")}</Link>
        <div className={styles.headerTitle} style={{ color: plan.color }}>{plan.title}</div>
        <button onClick={openSamplePdf} className={styles.printBtn}>
          {t("pdf_download")}
        </button>
      </div>

      <div className={styles.container} id="plan-content">
        <div className={styles.hero}>
          <span className={styles.tag} style={{ color: plan.color, borderColor: plan.color }}>{t("tag")}</span>
          <h1 className={styles.title}>{plan.title}</h1>

          {plan.score != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: plan.color, fontFamily: "var(--font-oswald), sans-serif", letterSpacing: "0.04em" }}>
                {plan.score}<span style={{ fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>/100</span>
              </span>
              {urgency && (
                <span style={{
                  display: "inline-block",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: urgency.color,
                  border: `1px solid ${urgency.color}`,
                  background: `${urgency.color}18`,
                  padding: "3px 10px",
                  borderRadius: 2,
                  fontFamily: "var(--font-oswald), sans-serif",
                  textTransform: "uppercase",
                  lineHeight: 1.35,
                }}>
                  {tResults(`urgency.${urgency.key}`)}
                </span>
              )}
            </div>
          )}

          <p className={styles.subtitle}>{plan.subtitle}</p>
          <p className={styles.source}>{plan.source}</p>
        </div>

        {plan.blocks.map((block) => (
          <section key={block.heading} className={styles.block}>
            <h2 className={styles.blockHeading}>{block.heading}</h2>

            {/* First 2 items visible, rest blurred */}
            <ul className={styles.blockList}>
              {block.items.slice(0, 2).map((item) => (
                <li key={item} className={styles.blockItem}>
                  <span className={styles.bullet} style={{ color: plan.color }}>▸</span>
                  {item}
                </li>
              ))}
            </ul>

            {block.items.length > 2 && (
              <div style={{ position: "relative", marginTop: "0.75rem" }}>
                <ul className={styles.blockList} style={{ filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }} aria-hidden="true">
                  {block.items.slice(2).map((item, i) => (
                    <li key={i} className={styles.blockItem}>
                      <span className={styles.bullet} style={{ color: plan.color }}>▸</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}>
                  <span style={{
                    fontFamily: "var(--font-oswald), sans-serif",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.4)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    padding: "4px 10px",
                    background: "rgba(0,0,0,0.5)",
                  }}>
                    {ts("unlock.lock_badge")}
                  </span>
                </div>
              </div>
            )}
          </section>
        ))}

        {/* CTA */}
        <div style={{
          marginTop: "3rem",
          padding: "2rem",
          background: "#111",
          border: "1px solid #222",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#FCD34D",
          }}>
            {ts("cta_label")}
          </div>
          <div style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#fff",
          }}>
            {ts("cta_title")}
          </div>
          <Link href="/analyse" style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#1A1A1A",
            background: "#FCD34D",
            padding: "0.875rem 2rem",
            textDecoration: "none",
            display: "inline-block",
            marginTop: "0.5rem",
          }}>
            {ts("cta_btn_primary")} →
          </Link>
        </div>

        <div className={styles.actions} style={{ marginTop: "1.5rem" }}>
          <Link href="/beispielreport" className={styles.btnSecondary}>
            {t("back_to_report_upper")}
          </Link>
        </div>

        <p className={styles.disclaimer}>
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
