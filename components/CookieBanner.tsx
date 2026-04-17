"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

const STORAGE_KEY = "btb_cookie_notice";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie-Hinweis"
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
        Diese Website verwendet ausschließlich technisch notwendige Cookies für
        Login und Zahlungsabwicklung. Kein Tracking, keine Werbung.{" "}
        <Link
          href="/cookies"
          style={{ color: "rgba(255,255,255,0.85)", textDecoration: "underline" }}
        >
          Cookie-Richtlinie
        </Link>
      </p>

      <button
        onClick={dismiss}
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
        Verstanden
      </button>
    </div>
  );
}
