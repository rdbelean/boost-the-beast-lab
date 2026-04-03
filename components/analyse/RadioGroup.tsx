"use client";
import styles from "@/app/analyse/analyse.module.css";

interface RadioGroupProps {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (value: string | number) => void;
}

export default function RadioGroup({ options, value, onChange }: RadioGroupProps) {
  return (
    <div className={styles.radioGroup}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`${styles.radioBtn} ${value === opt.value ? styles.radioBtnActive : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
