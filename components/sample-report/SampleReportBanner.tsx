"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function SampleReportBanner() {
  const t = useTranslations("sample_report");

  return (
    <div
      role="banner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "linear-gradient(90deg, #92400E 0%, #B45309 50%, #92400E 100%)",
        borderBottom: "1px solid #D97706",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#FDE68A",
            background: "rgba(0,0,0,0.25)",
            padding: "3px 8px",
            borderRadius: 2,
            whiteSpace: "nowrap",
          }}
        >
          {t("banner_label")}
        </span>
        <span
          style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "#FEF3C7",
            letterSpacing: "0.02em",
          }}
        >
          {t("banner_desc")}
        </span>
      </div>
      <Link
        href="/analyse"
        style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#1A1A1A",
          background: "#FCD34D",
          padding: "8px 18px",
          borderRadius: 2,
          textDecoration: "none",
          whiteSpace: "nowrap",
          transition: "background 0.2s",
        }}
      >
        {t("banner_cta")} →
      </Link>
    </div>
  );
}
