"use client";
import Link from "next/link";

const style: React.CSSProperties = {
  position: "fixed",
  top: "20px",
  left: "20px",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontFamily: "var(--font-oswald), sans-serif",
  fontWeight: 600,
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.5)",
  textDecoration: "none",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "2px",
  padding: "8px 14px",
  transition: "color 0.2s, border-color 0.2s, background 0.2s",
};

export default function BackButton({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} style={style}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#fff";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      HOME
    </Link>
  );
}
