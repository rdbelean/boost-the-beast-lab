"use client";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildPlan, type PlanType } from "@/lib/plan/buildPlan";
import { SAMPLE_SCORES_DISPLAY } from "@/lib/sample-report/data";
import styles from "@/app/[locale]/plans/[type]/plan.module.css";
import SampleReportBanner from "@/components/sample-report/SampleReportBanner";
import { CensoredItem } from "@/components/sample-report/CensoredItem";

const VALID_TYPES: PlanType[] = ["activity", "metabolic", "recovery", "stress"];

type UrgencyKey = "critical" | "action" | "optimize" | "finetune" | "top";
function urgencyBucket(score: number): { key: UrgencyKey; color: string } {
  if (score <= 30) return { key: "critical", color: "#DC2626" };
  if (score <= 50) return { key: "action",   color: "#B45309" };
  if (score <= 70) return { key: "optimize", color: "#A1A1AA" };
  if (score <= 85) return { key: "finetune", color: "#4D7C0F" };
  return                 { key: "top",       color: "#15803D" };
}

// Dummy placeholder text for censored items — never reveals real content.
const CENSORED_PLACEHOLDER = "Detaillierte Empfehlung und Protokoll für diesen Bereich — vollständig personalisiert auf deine Werte";
const CENSORED_RATIONALE   = "Wissenschaftliche Einordnung und Evidenz-Basis für diese Maßnahmen aus validierten Studien verfügbar in der Vollversion deines Plans";

export default function SamplePlanPage() {
  const t = useTranslations("plans_detail");
  const tResults = useTranslations("results");
  const tSample = useTranslations("sample");
  const locale = useLocale();
  const { type } = useParams() as { type: string };

  if (!VALID_TYPES.includes(type as PlanType)) {
    return (
      <>
        <SampleReportBanner />
        <div className={styles.page}>
          <div className={styles.errorBox}>
            <p>{t("error_unknown_type")}</p>
            <Link href="/beispielreport" className={styles.backLink}>{t("back_to_report")}</Link>
          </div>
        </div>
      </>
    );
  }

  const plan = buildPlan(type as PlanType, SAMPLE_SCORES_DISPLAY);
  const urgency = plan.score != null ? urgencyBucket(plan.score) : null;

  function openSamplePdf() {
    const newTab = window.open("", "_blank");
    const url = `/api/sample-report/plan-pdf?type=${type}&locale=${locale}`;
    if (newTab && !newTab.closed) newTab.location.href = url;
    else window.open(url, "_blank");
  }

  return (
    <>
      {/* Sticky amber banner outside .page so overflow-x:hidden cannot trap it */}
      <SampleReportBanner />

      <div className={styles.page}>
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

          {plan.blocks.map((block, blockIndex) => {
            const isFirstBlock = blockIndex === 0;
            const visibleItems = isFirstBlock ? block.items : block.items.slice(0, 2);
            const censoredCount = isFirstBlock ? 0 : Math.max(0, block.items.length - 2);

            return (
              <section key={block.heading} className={styles.block}>
                <h2 className={styles.blockHeading}>{block.heading}</h2>

                <ul className={styles.blockList}>
                  {visibleItems.map((item) => (
                    <li key={item} className={styles.blockItem}>
                      <span className={styles.bullet} style={{ color: plan.color }}>▸</span>
                      {item}
                    </li>
                  ))}
                  {/* Censored items: dummy text with blur + lock overlay */}
                  {Array.from({ length: censoredCount }).map((_, i) => (
                    <CensoredItem key={`censored-item-${i}`} variant="line">
                      <li className={styles.blockItem}>
                        <span className={styles.bullet} style={{ color: plan.color }}>▸</span>
                        {CENSORED_PLACEHOLDER}
                      </li>
                    </CensoredItem>
                  ))}
                </ul>

                {/* Hint below censored items */}
                {censoredCount > 0 && (
                  <p style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "#555", letterSpacing: "0.04em", margin: "0.75rem 0 0" }}>
                    {tSample("censored_habits_hint", { count: censoredCount })}
                  </p>
                )}

                {/* Rationale: visible for block 0, censored for all others */}
                {block.rationale && (
                  isFirstBlock ? (
                    <div style={{
                      marginTop: 14,
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.04)",
                      borderLeft: `2px solid rgba(255,255,255,0.12)`,
                      borderRadius: "0 4px 4px 0",
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 6, fontFamily: "var(--font-oswald), sans-serif" }}>
                        {t("rationale_label")}
                      </div>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>
                        {block.rationale}
                      </p>
                    </div>
                  ) : (
                    <CensoredItem variant="block">
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 6, fontFamily: "var(--font-oswald), sans-serif" }}>
                          {t("rationale_label")}
                        </div>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>
                          {CENSORED_RATIONALE}
                        </p>
                      </div>
                    </CensoredItem>
                  )
                )}
              </section>
            );
          })}

          <div className={styles.actions}>
            <Link href="/beispielreport" className={styles.btnSecondary}>
              {t("back_to_report_upper")}
            </Link>
          </div>

          <p className={styles.disclaimer}>
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </>
  );
}
