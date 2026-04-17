"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import styles from "./plan.module.css";
import { buildPlan, type PlanType, type PlanContent } from "@/lib/plan/buildPlan";

function openBlobInTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function openPlanAsPDF(plan: PlanContent, _planType: string, cachedPdfBase64?: string | null) {
  if (cachedPdfBase64) {
    const byteChars = atob(cachedPdfBase64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    openBlobInTab(new Blob([bytes], { type: "application/pdf" }));
    return;
  }
  const res = await fetch("/api/plan/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error("PDF generation failed");
  openBlobInTab(await res.blob());
}

/* ─── Urgency label ──────────────────────────────────────── */
function urgencyLabel(score: number): { text: string; color: string } {
  if (score <= 30) return { text: "KRITISCH",              color: "#DC2626" };
  if (score <= 50) return { text: "HANDLUNGSBEDARF",       color: "#B45309" };
  if (score <= 70) return { text: "OPTIMIERUNGSPOTENZIAL", color: "#A1A1AA" };
  if (score <= 85) return { text: "FEINTUNING",            color: "#4D7C0F" };
  return                 { text: "TOP-LEVEL",              color: "#15803D" };
}


/* ─── Plan Page ─────────────────────────────────────────────── */
export default function PlanPage() {
  const { type } = useParams() as { type: string };
  const [plan, setPlan] = useState<PlanContent | null>(null);
  const [cachedPdfBase64, setCachedPdfBase64] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("btb_results");
      if (!raw) { setError("Keine Analyse-Daten gefunden. Bitte starte die Analyse neu."); return; }
      const data = JSON.parse(raw);
      if (!data?.scores) { setError("Scores nicht verfügbar."); return; }
      const validTypes: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
      if (!validTypes.includes(type as PlanType)) { setError("Unbekannter Plan-Typ."); return; }

      // 1. Check sessionStorage for a pre-generated plan (from /analyse)
      const cached = data.plans?.[type as PlanType];
      if (cached?.blocks?.length) {
        // Use the pre-generated content directly — no second API call.
        setPlan({
          ...buildPlan(type as PlanType, data.scores),
          blocks: cached.blocks,
          source: cached.source ?? buildPlan(type as PlanType, data.scores).source,
        });
        if (cached.pdfBase64) setCachedPdfBase64(cached.pdfBase64);
        return;
      }

      // 2. No cache (legacy flow / manual nav) — build static + fetch AI
      const initial = buildPlan(type as PlanType, data.scores);
      setPlan(initial);

      fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, scores: data.scores }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((ai) => {
          if (ai?.blocks?.length) {
            setPlan((prev) => prev ? { ...prev, blocks: ai.blocks, source: ai.source ?? prev.source } : prev);
          }
        })
        .catch(() => {});
    } catch {
      setError("Plan konnte nicht geladen werden.");
    }
  }, [type]);

  if (error) return (
    <div className={styles.page}>
      <div className={styles.errorBox}>
        <p>{error}</p>
        <Link href="/results" className={styles.backLink}>← Zurück zum Report</Link>
      </div>
    </div>
  );

  if (!plan) return (
    <div className={styles.page} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase" }}>
        Wird geladen…
      </div>
    </div>
  );

  const urgency = plan.score != null ? urgencyLabel(plan.score) : null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/results" className={styles.backLink}>← ZURÜCK ZUM REPORT</Link>
        <div className={styles.headerTitle} style={{ color: plan.color }}>{plan.title}</div>
        <button onClick={() => openPlanAsPDF(plan, type, cachedPdfBase64)} className={styles.printBtn}>
          PDF DOWNLOAD ↓
        </button>
      </div>

      <div className={styles.container} id="plan-content">
        <div className={styles.hero}>
          <span className={styles.tag} style={{ color: plan.color, borderColor: plan.color }}>INDIVIDUELLER PLAN</span>
          <h1 className={styles.title}>{plan.title}</h1>

          {/* Score + urgency label */}
          {plan.score != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: plan.color, fontFamily: "var(--font-oswald), sans-serif", letterSpacing: "0.04em" }}>
                {plan.score}<span style={{ fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>/100</span>
              </span>
              {urgency && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: urgency.color,
                  border: `1px solid ${urgency.color}`,
                  background: `${urgency.color}18`,
                  padding: "3px 10px",
                  borderRadius: 2,
                  fontFamily: "var(--font-oswald), sans-serif",
                }}>
                  {urgency.text}
                </span>
              )}
            </div>
          )}

          <p className={styles.subtitle}>{plan.subtitle}</p>
          <p className={styles.source}>{plan.source}</p>
        </div>

        {plan.blocks.map((block) => (
          <section key={block.heading} className={styles.block}>
            <h2 className={styles.blockHeading}>{block.heading}</h2>
            <ul className={styles.blockList}>
              {block.items.map((item) => (
                <li key={item} className={styles.blockItem}>
                  <span className={styles.bullet} style={{ color: plan.color }}>▸</span>
                  {item}
                </li>
              ))}
            </ul>
            {block.rationale && (
              <div style={{
                marginTop: 14,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.04)",
                borderLeft: `2px solid rgba(255,255,255,0.12)`,
                borderRadius: "0 4px 4px 0",
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 6, fontFamily: "var(--font-oswald), sans-serif" }}>
                  WISSENSCHAFTLICHE EINORDNUNG
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>
                  {block.rationale}
                </p>
              </div>
            )}
          </section>
        ))}

        <div className={styles.actions}>
          <Link href="/results" className={styles.btnSecondary}>
            ← ZURÜCK ZUM REPORT
          </Link>
        </div>

        <p className={styles.disclaimer}>
          Alle Empfehlungen basieren auf publizierten Leitlinien (WHO, ACSM, NSF, EFSA) und den individuell berechneten Scores.
          Kein Ersatz für medizinische oder sportmedizinische Beratung.
        </p>
      </div>
    </div>
  );
}
