"use client";
import { useTranslations } from "next-intl";
import styles from "./CensoredItem.module.css";

const LOCK_SVG = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect x="2" y="5.5" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3.5 5.5V3.5a2.5 2.5 0 0 1 5 0V5.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

interface Props {
  children: React.ReactNode;
  variant?: "line" | "block";
}

export function CensoredItem({ children, variant = "line" }: Props) {
  const t = useTranslations("sample");
  return (
    <div className={styles[`censored_${variant}`]}>
      <div className={styles.content} aria-hidden="true">
        {children}
      </div>
      <div className={styles.overlay}>
        {LOCK_SVG}
        <span>{t("unlock_to_see")}</span>
      </div>
    </div>
  );
}
