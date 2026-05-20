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
export default function SampleMasterPlanPage() {
  const t = useTranslations("results.master_plan");
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
              {plan.rows.map((row) => (
                <tr key={row.day}>
                  <td className={styles.dayCell}>{t(`day_${row.day}`)}</td>
                  <td>
                    <ul className={styles.cellList}>
                      {row.training.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul className={styles.cellList}>
                      {row.nutrition.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul className={styles.cellList}>
                      {row.recovery.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul className={styles.cellList}>
                      {row.stress_anchor.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
