"use client";

import { useTranslations } from "next-intl";
import type { DataQualityResult } from "@/lib/wearable/assessment/data-quality";

const LEVEL_STYLES = {
  strong:  { border: "rgba(74, 222, 128, 0.3)",  bg: "rgba(74, 222, 128, 0.06)",  titleColor: "rgb(74, 222, 128)",  icon: "✨" },
  good:    { border: "rgba(134, 239, 172, 0.25)", bg: "rgba(134, 239, 172, 0.04)", titleColor: "rgb(134, 239, 172)", icon: "✓"  },
  minimal: { border: "rgba(251, 191, 36, 0.3)",  bg: "rgba(251, 191, 36, 0.05)",  titleColor: "rgb(252, 211, 77)",  icon: "⚠"  },
  none:    { border: "rgba(255,255,255,0.08)",    bg: "rgba(255,255,255,0.02)",    titleColor: "rgba(255,255,255,0.45)", icon: "—" },
} as const;

export default function DataQualityBadge({ quality }: { quality: DataQualityResult }) {
  const t  = useTranslations("analyse_prepare");
  const st = LEVEL_STYLES[quality.level];
  const { level, totalDays, primarySource = "", gpxSessions = 0 } = quality;

  const title = level === "strong"  ? t("upload.quality.strong_title")
    : level === "good"    ? t("upload.quality.good_title")
    : level === "minimal" ? t("upload.quality.minimal_title")
    : t("upload.quality.none_title");

  const message = level === "strong"
    ? t("upload.quality.strong_message",  { sources: primarySource, days: totalDays })
    : level === "good"
    ? t("upload.quality.good_message",    { days: totalDays, sources: primarySource })
    : level === "minimal"
    ? t("upload.quality.minimal_message")
    : t("upload.quality.none_message");

  const recommendation = level === "good"
    ? t("upload.quality.good_recommendation")
    : level === "minimal"
    ? t("upload.quality.minimal_recommendation")
    : null;

  const gpxNote = gpxSessions > 0 && (level === "strong" || level === "good")
    ? t("upload.quality.gpx_note", { count: gpxSessions })
    : null;

  return (
    <div
      style={{
        border: `1px solid ${st.border}`,
        background: st.bg,
        borderRadius: 4,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{st.icon}</span>
        <span
          style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: st.titleColor,
          }}
        >
          {title}
        </span>
      </div>

      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: 12,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.75)",
          margin: 0,
        }}
      >
        {message}
      </p>

      {gpxNote && (
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 11,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.5)",
            margin: 0,
          }}
        >
          {gpxNote}
        </p>
      )}

      {recommendation && (
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 11,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.45)",
            margin: 0,
          }}
        >
          {recommendation}
        </p>
      )}
    </div>
  );
}
