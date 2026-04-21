"use client";
import type { ScoreDataBasis } from "@/lib/reports/score-data-basis";

interface ScoreDataBadgeProps {
  basis: ScoreDataBasis;
}

const typeColors: Record<string, string> = {
  positive: "rgba(74, 222, 128, 0.85)",
  neutral:  "rgba(251, 191, 36, 0.8)",
  muted:    "rgba(255, 255, 255, 0.28)",
};

const typeBg: Record<string, string> = {
  positive: "rgba(74, 222, 128, 0.08)",
  neutral:  "rgba(251, 191, 36, 0.07)",
  muted:    "rgba(255, 255, 255, 0.04)",
};

export default function ScoreDataBadge({ basis }: ScoreDataBadgeProps) {
  const color = typeColors[basis.type] ?? typeColors.muted;
  const bg    = typeBg[basis.type]    ?? typeBg.muted;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        background: bg,
        borderRadius: 4,
        border: `1px solid ${color}40`,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 10 }}>{basis.icon}</span>
      <span
        style={{
          fontSize: 9,
          color,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        {basis.label}
      </span>
    </div>
  );
}
