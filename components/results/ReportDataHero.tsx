"use client";
import { useTranslations } from "next-intl";
import type { HeroSummary } from "@/lib/reports/hero-summary";

interface ReportDataHeroProps {
  summary: HeroSummary | null;
}

// All quality levels use green variants — never yellow/orange warning tones.
const qualityColors: Record<string, string> = {
  excellent: "#16A34A",
  strong:    "#22C55E",
  good:      "#4ADE80",
  secured:   "#22C55E",
  // legacy fallbacks
  minimal:   "#4ADE80",
  none:      "#22C55E",
};

export default function ReportDataHero({ summary }: ReportDataHeroProps) {
  const t = useTranslations("results");

  if (!summary || !summary.has_any_data) {
    const securedColor = qualityColors.secured;
    return (
      <section
        style={{
          margin: "0 0 32px",
          padding: "20px 24px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", marginBottom: 10, textTransform: "uppercase" }}>
          {t("hero.label")}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>
          {t("hero.fallback_title")}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, maxWidth: 480, marginBottom: 14 }}>
          {t("hero.quality_secured_message")}
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 10px",
          background: `${securedColor}14`,
          borderRadius: 4,
          border: `1px solid ${securedColor}40`,
        }}>
          <span style={{ fontSize: 10, color: securedColor, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.06em", fontWeight: 600 }}>
            {t("hero.quality_secured_badge")}
          </span>
        </div>
      </section>
    );
  }

  const qColor = qualityColors[summary.quality_level] ?? qualityColors.good;
  const badgeKey = `hero.quality_${summary.quality_level}_badge` as "hero.quality_strong_badge";
  const msgKey  = `hero.quality_${summary.quality_level}_message` as "hero.quality_strong_message";

  return (
    <section
      style={{
        margin: "0 0 32px",
        padding: "20px 24px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", marginBottom: 12, textTransform: "uppercase" }}>
        {t("hero.label")}
      </div>

      {/* Big datapoints number — always green */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: qColor, fontFamily: "var(--font-jetbrains-mono), monospace", lineHeight: 1 }}>
          {summary.total_datapoints.toLocaleString()}
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-inter), sans-serif" }}>
          {t("hero.datapoints_label")}
        </span>
      </div>

      {/* Source badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {summary.sources.map((src) => (
          <div
            key={src.type}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontSize: 13 }}>{src.icon}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-inter), sans-serif" }}>
              {src.label}
            </span>
          </div>
        ))}
      </div>

      {/* Period */}
      {(summary.period_start || summary.period_end) && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", marginBottom: 10, letterSpacing: "0.04em" }}>
          {t("hero.period_label")} {summary.period_start} – {summary.period_end}
        </div>
      )}

      {/* Quality message */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.55, maxWidth: 520, marginBottom: 12 }}>
        {t(msgKey)}
      </div>

      {/* Quality badge — always green */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px",
        background: `${qColor}14`,
        borderRadius: 4,
        border: `1px solid ${qColor}40`,
      }}>
        <span style={{ fontSize: 10, color: qColor, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.06em", fontWeight: 600 }}>
          {t(badgeKey)}
        </span>
      </div>
    </section>
  );
}
