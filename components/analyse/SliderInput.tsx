"use client";
import { useRef, useCallback } from "react";
import styles from "@/app/analyse/analyse.module.css";

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export default function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: SliderInputProps) {
  const trackRef = useRef<HTMLInputElement>(null);

  const updatePct = useCallback((v: number) => {
    const el = trackRef.current;
    if (!el) return;
    const pct = ((v - min) / (max - min)) * 100;
    el.style.setProperty("--pct", `${pct}%`);
  }, [min, max]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    updatePct(v);
    onChange(v);
  };

  // Set initial pct
  const initPct = ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.sliderWrap}>
      <div className={styles.sliderTop}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue}>
          {value}
          {unit && <span className={styles.sliderUnit}>{unit}</span>}
        </span>
      </div>
      <div className={styles.sliderTrack}>
        <input
          ref={trackRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={styles.sliderInput}
          style={{ "--pct": `${initPct}%` } as React.CSSProperties}
        />
      </div>
      <div className={styles.sliderMinMax}>
        <span className={styles.sliderMin}>{min}{unit}</span>
        <span className={styles.sliderMax}>{max}{unit}</span>
      </div>
    </div>
  );
}
