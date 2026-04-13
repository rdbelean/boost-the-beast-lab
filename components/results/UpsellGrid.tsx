"use client";
import { useState } from "react";

type Upsell = {
  id: string;
  name: string;
  tag?: string;
  price: string;
  priceCents: number;
  description: string;
  features: string[];
  accent: string;
};

const UPSELLS: Upsell[] = [
  {
    id: "bundle-all",
    name: "ALLE 4 OPTIMIERUNGSPLÄNE",
    tag: "BESTSELLER · SPAR 50€",
    price: "€49,99",
    priceCents: 4999,
    description: "Metabolic + Recovery + Activity + Stress — dein vollständiges Upgrade-Kit.",
    features: [
      "30-Tage Ernährungsplan",
      "Schlaf- & Regenerationsprotokoll",
      "12-Wochen Trainingsplan",
      "Anti-Stress & Lifestyle Programm",
    ],
    accent: "#E63222",
  },
  {
    id: "plan-metabolic",
    name: "METABOLIC BOOST PLAN",
    price: "€24,99",
    priceCents: 2499,
    description: "30-Tage individueller Ernährungs- & Stoffwechsel-Optimierungsplan.",
    features: [
      "Personalisierte Makros",
      "Rezept-Vorschläge",
      "Hydrations-Protokoll",
    ],
    accent: "#F59E0B",
  },
  {
    id: "plan-recovery",
    name: "RECOVERY PROTOCOL",
    price: "€24,99",
    priceCents: 2499,
    description: "Persönliches Schlaf- & Regenerationsprotokoll für maximale Erholung.",
    features: [
      "Schlaf-Routine Plan",
      "Stress-Reduktions-Techniken",
      "Regenerations-Tracker",
    ],
    accent: "#3B82F6",
  },
  {
    id: "plan-activity",
    name: "PERFORMANCE TRAINING PLAN",
    price: "€24,99",
    priceCents: 2499,
    description: "12-Wochen individueller Kraft- & Konditionstrainingsplan.",
    features: [
      "Progression nach 12 Wochen",
      "Kraft + Kondition kombiniert",
      "Home- & Gym-Varianten",
    ],
    accent: "#8B5CF6",
  },
  {
    id: "plan-stress",
    name: "STRESS RESET PROGRAM",
    price: "€24,99",
    priceCents: 2499,
    description: "30-Tage Anti-Stress & Lifestyle-Optimierungsprogramm.",
    features: [
      "Tägliche Mini-Übungen",
      "Atemtechniken",
      "Wochen-Reflexions-Prompts",
    ],
    accent: "#22C55E",
  },
];

export function UpsellGrid({ parentSessionId }: { parentSessionId: string | null }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function buy(id: string) {
    setErrorId(null);
    setErrorMsg("");

    if (!parentSessionId) {
      setErrorId(id);
      setErrorMsg("Keine aktive Zahlungssitzung. Bitte Checkout neu starten.");
      return;
    }

    setLoadingId(id);
    try {
      const res = await fetch("/api/stripe/charge-upsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, parentSessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorId(id);
        setErrorMsg(data.error ?? "Zahlung fehlgeschlagen");
        return;
      }
      setPurchased((prev) => new Set(prev).add(id));
    } catch (err) {
      setErrorId(id);
      setErrorMsg("Netzwerkfehler — bitte nochmal versuchen");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section
      style={{
        marginTop: "4rem",
        padding: "3rem 2rem",
        background: "var(--surface-card, #1A1A1A)",
        border: "1px solid var(--border, #333)",
        borderRadius: 0,
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.3em",
          color: "#E63222",
          fontWeight: 700,
          marginBottom: "0.75rem",
        }}
      >
        DEINE NÄCHSTEN SCHRITTE
      </div>
      <h2
        style={{
          fontSize: "1.75rem",
          color: "#fff",
          fontWeight: 800,
          marginBottom: "0.5rem",
          letterSpacing: "0.02em",
        }}
      >
        JETZT UMSETZUNGSPLÄNE FREISCHALTEN
      </h2>
      <p style={{ fontSize: "0.9rem", color: "#999", marginBottom: "2rem", maxWidth: 640 }}>
        Dein Report zeigt dir das <strong>Was</strong>. Die Pläne liefern das <strong>Wie</strong> —
        konkret, Tag für Tag. Ein-Klick-Kauf mit deiner gespeicherten Karte.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {UPSELLS.map((u) => {
          const isPurchased = purchased.has(u.id);
          const isLoading = loadingId === u.id;
          const isError = errorId === u.id;
          const isBundle = u.id === "bundle-all";

          return (
            <div
              key={u.id}
              style={{
                padding: "1.5rem",
                background: "#0E0E0E",
                border: `1px solid ${isBundle ? u.accent : "#2A2A2A"}`,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {u.tag && (
                <div
                  style={{
                    display: "inline-block",
                    alignSelf: "flex-start",
                    background: u.accent,
                    color: "#fff",
                    fontSize: "0.65rem",
                    letterSpacing: "0.15em",
                    padding: "0.3rem 0.6rem",
                    fontWeight: 700,
                    marginBottom: "0.75rem",
                  }}
                >
                  {u.tag}
                </div>
              )}
              <h3
                style={{
                  fontSize: "1rem",
                  color: "#fff",
                  fontWeight: 800,
                  marginBottom: "0.5rem",
                  letterSpacing: "0.02em",
                }}
              >
                {u.name}
              </h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#999",
                  marginBottom: "1rem",
                  minHeight: "2.4rem",
                }}
              >
                {u.description}
              </p>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 1.25rem 0",
                  fontSize: "0.75rem",
                  color: "#CCC",
                }}
              >
                {u.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      padding: "0.25rem 0",
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: u.accent, fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: "auto" }}>
                <div
                  style={{
                    fontSize: "1.5rem",
                    color: u.accent,
                    fontWeight: 800,
                    marginBottom: "0.75rem",
                  }}
                >
                  {u.price}
                </div>

                {isPurchased ? (
                  <button
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      background: "#22C55E",
                      color: "#fff",
                      border: "none",
                      fontSize: "0.75rem",
                      letterSpacing: "0.15em",
                      fontWeight: 700,
                      cursor: "default",
                    }}
                  >
                    ✓ GEKAUFT
                  </button>
                ) : (
                  <button
                    disabled={isLoading}
                    onClick={() => buy(u.id)}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      background: isLoading ? "#444" : u.accent,
                      color: "#fff",
                      border: "none",
                      fontSize: "0.75rem",
                      letterSpacing: "0.15em",
                      fontWeight: 700,
                      cursor: isLoading ? "wait" : "pointer",
                      transition: "background 200ms",
                    }}
                  >
                    {isLoading ? "WIRD GEBUCHT…" : "1-CLICK KAUFEN →"}
                  </button>
                )}

                {isError && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.7rem",
                      color: "#E63222",
                    }}
                  >
                    {errorMsg}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: "0.7rem", color: "#666", marginTop: "1.5rem", textAlign: "center" }}>
        Ein-Klick-Zahlung über deine im vorherigen Checkout gespeicherte Karte · jederzeit in
        deinem Account widerrufbar.
      </p>
    </section>
  );
}
