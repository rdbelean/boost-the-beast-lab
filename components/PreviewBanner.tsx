import { isPreviewDeployment } from "@/lib/utils/is-preview";

export default function PreviewBanner() {
  if (!isPreviewDeployment()) return null;
  return (
    <div
      style={{
        background: "#FACC15",
        color: "#0A0A0A",
        textAlign: "center",
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        fontFamily: "var(--font-jetbrains-mono), monospace",
      }}
    >
      🧪 PREVIEW DEPLOYMENT — Bezahlflow umgangen, alle AI-Calls live
    </div>
  );
}
