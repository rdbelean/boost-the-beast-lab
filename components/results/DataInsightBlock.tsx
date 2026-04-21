"use client";
import { useTranslations } from "next-intl";
import type { MetricRow } from "@/lib/reports/data-insights";

interface DataInsightBlockProps {
  dimension: "sleep" | "activity" | "vo2max" | "metabolic" | "stress";
  rows: MetricRow[];
  interpretation?: string | null;
}

export default function DataInsightBlock({ dimension, rows, interpretation }: DataInsightBlockProps) {
  const t = useTranslations("results");

  if (!rows || rows.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 20,
        padding: "4px 14px 12px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 4,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          marginTop: 14,
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {t("data_insights.section_title")}
      </div>

      {/* Metric rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((row) => {
          let labelText: string;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelText = t(`data_insights.${dimension}.${row.label_key}` as any);
          } catch {
            labelText = row.label_key;
          }
          return (
            <div
              key={row.label_key}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-inter), sans-serif", flexShrink: 0 }}>
                {labelText}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: row.evaluation?.color ?? "rgba(255,255,255,0.85)", fontFamily: "var(--font-jetbrains-mono), monospace", whiteSpace: "nowrap" }}>
                  {row.value}{row.unit ? ` ${row.unit}` : ""}
                </span>
                {row.evaluation && (
                  <span style={{ fontSize: 9, color: row.evaluation.color, opacity: 0.75, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                    {row.evaluation.reference}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI interpretation */}
      {interpretation && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.65,
            fontFamily: "var(--font-inter), sans-serif",
            fontStyle: "italic",
          }}
        >
          {interpretation}
        </div>
      )}
    </div>
  );
}
