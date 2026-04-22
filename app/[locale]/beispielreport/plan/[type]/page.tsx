"use client";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { type PlanType, PLAN_COLORS } from "@/lib/plan/buildPlan";
import { getSamplePlan } from "@/lib/sample-report/samplePlans";
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

export default function SamplePlanPage() {
  const t = useTranslations("plans_detail");
  const tResults = useTranslations("results");
  const tSample = useTranslations("sample");
  const { locale, type } = useParams() as { locale: string; type: string };

  if (!VALID_TYPES.includes(type as PlanType)) {
    return (
      <>
        {/* Amber banner — sticky, outside .page to avoid overflow trapping */}
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

  const plan = getSamplePlan(locale, type);
  const color = plan.color ?? PLAN_COLORS[type as PlanType];
  const urgency = plan.score != null ? urgencyBucket(plan.score) : null;

  function openSamplePdf() {
    const url = `/api/sample-report/plan-pdf?type=${type}&locale=${locale}`;
    const tab = window.open("", "_blank");
    if (tab && !tab.closed) tab.location.href = url;
    else window.open(url, "_blank");
  }

  return (
    <>
      {/* Amber banner — sticky at top:0 z-index:100. Must live OUTSIDE .page
          so no overflow:hidden ancestor can break position:sticky on Safari. */}
      <SampleReportBanner />

      <div className={styles.page}>
        {/* Plan header — NOT sticky: scrolls away when user scrolls down.
            The amber banner above is the only persistent sticky element. */}
        <div className={styles.header} style={{ position: "relative" }}>
          <Link href="/beispielreport" className={styles.backLink}>{t("back_to_report_upper")}</Link>
          <div className={styles.headerTitle} style={{ color }}>{plan.title}</div>
          <button onClick={openSamplePdf} className={styles.printBtn}>
            {t("pdf_download")}
          </button>
        </div>

        <div className={styles.container} id="plan-content">
          <div className={styles.hero}>
            <span className={styles.tag} style={{ color, borderColor: color }}>{t("tag")}</span>
            <h1 className={styles.title}>{plan.title}</h1>

            {plan.score != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "var(--font-oswald), sans-serif", letterSpacing: "0.04em" }}>
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
                      <span className={styles.bullet} style={{ color }}>▸</span>
                      {item}
                    </li>
                  ))}
                  {Array.from({ length: censoredCount }).map((_, i) => (
                    <CensoredItem key={`censored-${i}`} variant="line">
                      <li className={styles.blockItem}>
                        <span className={styles.bullet} style={{ color }}>▸</span>
                        {visibleItems[0]}
                      </li>
                    </CensoredItem>
                  ))}
                </ul>

                {censoredCount > 0 && (
                  <p style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "#555", letterSpacing: "0.04em" }}>
                    {tSample("censored_habits_hint", { count: censoredCount })}
                  </p>
                )}

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
                          {block.rationale}
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
