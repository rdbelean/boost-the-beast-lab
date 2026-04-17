"use client";

import { useState } from "react";

export interface WearableUploadRow {
  id: string;
  source: "whoop" | "apple_health";
  window_start: string;
  window_end: string;
  days_covered: number;
  assessment_id: string | null;
  created_at: string;
}

export default function WearablePanel({
  uploads: initialUploads,
}: {
  uploads: WearableUploadRow[];
}) {
  const [uploads, setUploads] = useState(initialUploads);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Wearable-Daten wirklich löschen? Dein Report bleibt bestehen.")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/wearable/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      setUploads((u) => u.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Löschung fehlgeschlagen");
    } finally {
      setDeleting(null);
    }
  }

  if (uploads.length === 0) return null;

  return (
    <section
      style={{
        marginTop: 48,
        padding: "32px 28px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid #333",
        borderRadius: 4,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 8,
        }}
      >
        DSGVO · ART. 17
      </div>
      <h2
        style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#fff",
          margin: "0 0 8px",
        }}
      >
        WEARABLE-DATEN
      </h2>
      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: 13,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.6)",
          margin: "0 0 20px",
        }}
      >
        Anonymisierte Aggregate aus deinen WHOOP- oder Apple-Health-Exports.
        Du kannst jeden Import unabhängig von deinen Reports löschen.
      </p>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 16,
            borderLeft: "3px solid rgb(239, 68, 68)",
            background: "rgba(239, 68, 68, 0.08)",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 12,
            color: "rgb(252, 165, 165)",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {uploads.map((up) => (
          <div
            key={up.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #2a2a2e",
              borderRadius: 2,
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-oswald), sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#fff",
                  marginBottom: 2,
                }}
              >
                {up.source === "whoop" ? "WHOOP" : "Apple Health"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {up.days_covered} Tage · {up.window_start} bis {up.window_end}
                {up.assessment_id ? " · verknüpft mit Report" : " · noch nicht verknüpft"}
              </div>
            </div>
            <button
              onClick={() => handleDelete(up.id)}
              disabled={deleting === up.id}
              style={{
                padding: "8px 14px",
                fontFamily: "var(--font-oswald), sans-serif",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: deleting === up.id ? "rgba(255,255,255,0.3)" : "rgba(239, 68, 68, 0.9)",
                background: "transparent",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: 2,
                cursor: deleting === up.id ? "wait" : "pointer",
                flexShrink: 0,
              }}
            >
              {deleting === up.id ? "Lösche..." : "Löschen"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
