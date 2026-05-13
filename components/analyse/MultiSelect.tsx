"use client";
import styles from "@/app/[locale]/analyse/analyse.module.css";
import { toggleMultiSelect } from "@/lib/analyse/multi-select-toggle";

interface MultiSelectProps {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Value-IDs die exklusiv sind: ihre Auswahl entfernt alle anderen,
   *  Auswahl irgendeiner anderen Option entfernt die exklusive. */
  exclusiveValues?: readonly string[];
}

export default function MultiSelect({
  options, value, onChange, exclusiveValues = [],
}: MultiSelectProps) {
  return (
    <div className={styles.radioGroup}>
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(toggleMultiSelect(value, opt.value, exclusiveValues))}
            aria-pressed={active}
            className={`${styles.radioBtn} ${active ? styles.radioBtnActive : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
