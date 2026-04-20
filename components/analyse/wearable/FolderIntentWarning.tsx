"use client";

import { useTranslations } from "next-intl";
import type { FolderIntentResult } from "@/lib/wearable/detection/folder-intent";

interface Props {
  intent: FolderIntentResult;
  onContinue: () => void;
  onCancel: () => void;
}

export default function FolderIntentWarning({ intent, onContinue, onCancel }: Props) {
  const t = useTranslations("analyse_prepare");

  const description =
    intent.intent === "apple_ecg_folder"
      ? t("upload.folder_intent.apple_ecg_description")
      : intent.intent === "apple_gpx_folder"
      ? t("upload.folder_intent.apple_gpx_description")
      : t("upload.folder_intent.apple_mixed_description");

  const countLabel =
    intent.intent === "apple_ecg_folder"
      ? `${intent.ecgCount} EKG-Dateien`
      : intent.intent === "apple_gpx_folder"
      ? `${intent.gpxCount} GPX-Tracks`
      : `${intent.ecgCount} EKG + ${intent.gpxCount} GPX`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 12, 0.95)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          maxWidth: 500,
          width: "100%",
          background: "var(--surface-card, #111113)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4,
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* eyebrow */}
        <div
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(251, 191, 36, 0.85)",
          }}
        >
          📂 {t("upload.folder_intent.apple_subfolder_detected")}
        </div>

        {/* headline */}
        <div>
          <h2
            style={{
              fontFamily: "var(--font-oswald), sans-serif",
              fontWeight: 700,
              fontSize: 22,
              textTransform: "uppercase",
              color: "#fff",
              margin: "0 0 6px",
            }}
          >
            {countLabel}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: 13,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.7)",
              margin: 0,
            }}
          >
            {description}
          </p>
        </div>

        {/* tip box */}
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(251,191,36,0.05)",
            borderLeft: "2px solid rgba(251,191,36,0.4)",
            borderRadius: 2,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: 12,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.65)",
              margin: 0,
              whiteSpace: "pre-line",
            }}
          >
            💡 {t("upload.folder_intent.main_export_tip")}
          </p>
        </div>

        {/* actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "13px 20px",
              background: "var(--accent, #E63222)",
              border: "none",
              borderRadius: 3,
              fontFamily: "var(--font-oswald), sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {t("upload.folder_intent.cancel_and_reupload")}
          </button>
          <button
            onClick={onContinue}
            style={{
              padding: "11px 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 3,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              cursor: "pointer",
            }}
          >
            {t("upload.folder_intent.process_anyway")}
          </button>
        </div>
      </div>
    </div>
  );
}
