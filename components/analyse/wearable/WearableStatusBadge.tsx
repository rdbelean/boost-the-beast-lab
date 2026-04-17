"use client";

/**
 * Small pill rendered next to a prefilled form field to communicate
 * that the value came from a wearable. Uses the same accent as other
 * system-status markers in the analyse form.
 */
export default function WearableStatusBadge({
  source,
}: {
  source: "whoop" | "apple_health";
}) {
  const label = source === "whoop" ? "Aus WHOOP" : "Aus Apple Health";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 999,
        border: "1px solid rgba(230, 50, 34, 0.35)",
        background: "rgba(230, 50, 34, 0.08)",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 9,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--accent)",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden style={{ fontSize: 10 }}>✓</span>
      {label}
    </span>
  );
}
