"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CONSENT_KEY, CONSENT_EVENT } from "@/lib/consent";

export default function CookieBanner() {
  const t = useTranslations("cookie_banner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show the banner until the user has made an explicit analytics choice.
    if (typeof window !== "undefined" && !localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function decide(value: "granted" | "denied") {
    localStorage.setItem(CONSENT_KEY, value);
    // Notify listeners (e.g. ClarityAnalytics) without a page reload.
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setVisible(false);
  }

  if (!visible) return null;

  const secondaryButton = {
    flexShrink: 0,
    background: "transparent",
    color: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 2,
    padding: "9px 22px",
    fontFamily: "var(--font-oswald), sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.12em",
    cursor: "pointer",
    textTransform: "uppercase" as const,
  };

  return (
    <div
      role="region"
      aria-label={t("aria_label")}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "rgba(20, 20, 22, 0.97)",
        borderTop: "1px solid rgba(230, 50, 34, 0.25)",
        backdropFilter: "blur(12px)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: 13,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.65)",
          flex: "1 1 300px",
        }}
      >
        {t("text")}{" "}
        <Link
          href="/cookies"
          style={{ color: "rgba(255,255,255,0.85)", textDecoration: "underline" }}
        >
          {t("policy_link")}
        </Link>
      </p>

      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <button onClick={() => decide("denied")} style={secondaryButton}>
          {t("decline")}
        </button>
        <button
          onClick={() => decide("granted")}
          style={{
            flexShrink: 0,
            background: "#E63222",
            color: "#fff",
            border: "none",
            borderRadius: 2,
            padding: "9px 22px",
            fontFamily: "var(--font-oswald), sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.12em",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
