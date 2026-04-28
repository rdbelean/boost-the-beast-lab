"use client";
import styles from "@/app/[locale]/analyse/analyse.module.css";

interface FreetextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  formatCounter: (current: number, max: number) => string;
  maxLength?: number;
}

export default function FreetextField({
  value,
  onChange,
  placeholder,
  formatCounter,
  maxLength = 1000,
}: FreetextFieldProps) {
  const current = value.length;
  const warn = current > maxLength * 0.9;

  return (
    <div className={styles.freetextWrap}>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
      />
      <span
        className={`${styles.textareaCounter} ${warn ? styles.textareaCounterWarn : ""}`}
      >
        {formatCounter(current, maxLength)}
      </span>
    </div>
  );
}
