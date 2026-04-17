"use client";
import styles from "@/app/[locale]/analyse/analyse.module.css";

interface CustomSelectProps {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

export default function CustomSelect({ label, value, options, onChange }: CustomSelectProps) {
  return (
    <div className={styles.selectWrap}>
      {label && <span className={styles.inputLabel}>{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.selectEl}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className={styles.selectArrow}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
}
