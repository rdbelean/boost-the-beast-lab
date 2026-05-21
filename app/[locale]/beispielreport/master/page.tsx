"use client";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getSampleMasterPlan } from "@/lib/sample-report/sampleMasterPlan";
import SampleReportBanner from "@/components/sample-report/SampleReportBanner";
import styles from "@/app/[locale]/plans/master/master.module.css";

// Static sample master weekly plan. Mirrors the production /plans/master
// table layout (same CSS module) but renders directly from the committed
// sample data — no sessionStorage, no /api/master-plan/generate, no auth,
// no PDF download.
//
// Teaser censor: Monday (index 0) renders fully visible. Tuesday–Sunday
// (1–6) have their 4 content cells CSS-blurred so the reader gets a feel
// for the structure without seeing the actual prescriptions. Matches the
// PDF teaser pattern from /api/sample-report/master-pdf (censorDays =
// [1,2,3,4,5,6] in generateMasterPlanPDF).
const CENSORED_CELL_STYLE = {
  filter: "blur(5px)",
  userSelect: "none" as const,
  pointerEvents: "none" as const,
  opacity: 0.82,
};

export default function SampleMasterPlanPage() {
  const t = useTranslations("results.master_plan");
  const tSample = useTranslations("sample");
  const { locale } = useParams() as { locale: string };
  const plan = getSampleMasterPlan(locale);

  return (
    <>
      <SampleReportBanner />
      <main className={styles.wrap}>
        <header className={styles.header}>
          <Link href="/beispielreport" className={styles.back}>
            ← {t("back_to_results")}
          </Link>
          <h1 className={styles.title}>{plan.title}</h1>
          {plan.subtitle && <p className={styles.subtitle}>{plan.subtitle}</p>}
        </header>

        <section className={styles.introBlock}>
          <h2 className={styles.introHeading}>{t("strategy_heading")}</h2>
          <p className={styles.introText}>{plan.intro}</p>
        </section>

        <section className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("col_day")}</th>
                <th>{t("col_training")}</th>
                <th>{t("col_nutrition")}</th>
                <th>{t("col_recovery")}</th>
                <th>{t("col_stress")}</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((row, rowIdx) => {
                const cellStyle = rowIdx === 0 ? undefined : CENSORED_CELL_STYLE;
                const ariaHidden = rowIdx === 0 ? undefined : true;
                return (
                  <tr key={row.day}>
                    <td className={styles.dayCell}>{t(`day_${row.day}`)}</td>
                    <td style={cellStyle} aria-hidden={ariaHidden}>
                      <ul className={styles.cellList}>
                        {row.training.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td style={cellStyle} aria-hidden={ariaHidden}>
                      <ul className={styles.cellList}>
                        {row.nutrition.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td style={cellStyle} aria-hidden={ariaHidden}>
                      <ul className={styles.cellList}>
                        {row.recovery.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td style={cellStyle} aria-hidden={ariaHidden}>
                      <ul className={styles.cellList}>
                        {row.stress_anchor.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p
            style={{
              marginTop: 18,
              fontSize: 13,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.55)",
              fontStyle: "italic",
              textAlign: "center",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            🔒 {tSample("unlock_hint")}
          </p>
        </section>
      </main>
    </>
  );
}
