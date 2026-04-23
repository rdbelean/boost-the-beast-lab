"use client";
import { useTranslations, useLocale } from "next-intl";
import styles from "./SampleReportBanner.module.css";

export default function SampleReportBanner() {
  const t = useTranslations("sample_report");
  const locale = useLocale();

  function openSamplePdf() {
    const url = `/api/sample-report/pdf?locale=${locale}`;
    const tab = window.open("", "_blank");
    if (tab && !tab.closed) tab.location.href = url;
    else window.open(url, "_blank");
  }

  return (
    <div role="banner" className={styles.banner}>
      <div className={styles.left}>
        <span className={styles.label}>{t("banner_label")}</span>
        <span className={styles.desc}>{t("banner_desc")}</span>
      </div>
      <button onClick={openSamplePdf} className={styles.cta}>
        {t("cta_btn_pdf")} ↓
      </button>
    </div>
  );
}
