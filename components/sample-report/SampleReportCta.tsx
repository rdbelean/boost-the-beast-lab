"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function SampleReportCta() {
  const t = useTranslations("sample_report");

  return (
    <section
      style={{
        margin: "48px 0 0 0",
        padding: "48px 40px",
        background: "linear-gradient(135deg, rgba(230,50,34,0.12) 0%, rgba(230,50,34,0.04) 100%)",
        border: "1px solid rgba(230,50,34,0.35)",
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, #E63222 0%, #ff6b4a 100%)",
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.25em",
          color: "#E63222",
          marginBottom: 12,
        }}
      >
        {t("cta_label")}
      </div>
      <h2
        style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.04em",
          margin: "0 0 12px 0",
          lineHeight: 1.2,
        }}
      >
        {t("cta_title")}
      </h2>
      <p
        style={{
          color: "#999",
          fontSize: 14,
          lineHeight: 1.6,
          maxWidth: 520,
          margin: "0 auto 32px auto",
        }}
      >
        {t("cta_desc")}
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        <Link
          href="/analyse"
          style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#fff",
            background: "#E63222",
            padding: "16px 40px",
            borderRadius: 2,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
        >
          {t("cta_btn_primary")}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <a
          href="/api/sample-report/pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "#aaa",
            background: "transparent",
            padding: "15px 32px",
            borderRadius: 2,
            border: "1px solid #333",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {t("cta_btn_pdf")}
        </a>
      </div>
    </section>
  );
}
