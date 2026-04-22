"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./plan.module.css";
import { buildPlan, type PlanType, type PlanContent } from "@/lib/plan/buildPlan";

function openBlobInTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function openPlanAsPDF(plan: PlanContent, _planType: string, cachedPdfBase64?: string | null, locale = "de") {
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
    body: JSON.stringify({ plan, locale }),
  });
  if (!res.ok) throw new Error("PDF generation failed");
  openBlobInTab(await res.blob());
}

/* ─── Urgency bucket ─────────────────────────────────────── */
// Mirrors the helper in /results — locale-agnostic keys + colors. The
// label string itself comes from results.urgency.* so the two pages
// stay synchronized.
type UrgencyKey = "critical" | "action" | "optimize" | "finetune" | "top";
function urgencyBucket(score: number): { key: UrgencyKey; color: string } {
  if (score <= 30) return { key: "critical", color: "#DC2626" };
  if (score <= 50) return { key: "action",   color: "#B45309" };
  if (score <= 70) return { key: "optimize", color: "#A1A1AA" };
  if (score <= 85) return { key: "finetune", color: "#4D7C0F" };
  return                 { key: "top",       color: "#15803D" };
}


/* ─── Plan Page ─────────────────────────────────────────────── */
export default function PlanPage() {
  const t = useTranslations("plans_detail");
  const tResults = useTranslations("results");
  const locale = useLocale();
  const { type } = useParams() as { type: string };
  const [plan, setPlan] = useState<PlanContent | null>(null);
  const [cachedPdfBase64, setCachedPdfBase64] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("btb_results");
      if (!raw) { setError(t("error_no_data")); return; }
      const data = JSON.parse(raw);
      if (!data?.scores) { setError(t("error_no_scores")); return; }
      const validTypes: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
      if (!validTypes.includes(type as PlanType)) { setError(t("error_unknown_type")); return; }

      if (data.assessmentId) setAssessmentId(data.assessmentId);

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
        body: JSON.stringify({ type, scores: data.scores, locale }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((ai) => {
          if (ai?.blocks?.length) {
            setPlan((prev) => prev ? { ...prev, blocks: ai.blocks, source: ai.source ?? prev.source } : prev);
          }
        })
        .catch(() => {});
    } catch {
      setError(t("error_loading"));
    }
  }, [type, t]);

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function handleDownload() {
    if (pdfDownloading) return;

    // Fast path: Storage-backed signed URL
    if (assessmentId) {
      setPdfDownloading(true);
      const pdfType = `plan_${type}`;
      try {
        const res = await fetch(
          `/api/reports/pdf-url?assessment_id=${assessmentId}&pdf_type=${pdfType}&locale=${locale}`,
        );
        const json = await res.json() as { ready?: boolean; url?: string; status?: string };

        if (json.ready && json.url) {
          window.open(json.url, "_blank", "noopener,noreferrer");
          setPdfDownloading(false);
          return;
        }

        if (json.status === "generating" || json.status === "pending") {
          // Poll until ready (max 60 s)
          let elapsed = 0;
          pollRef.current = setInterval(async () => {
            elapsed += 2000;
            if (elapsed > 60_000) {
              clearInterval(pollRef.current!);
              setPdfDownloading(false);
              return;
            }
            const r2 = await fetch(
              `/api/reports/pdf-url?assessment_id=${assessmentId}&pdf_type=${pdfType}&locale=${locale}`,
            ).then((r) => r.json()) as { ready?: boolean; url?: string };
            if (r2.ready && r2.url) {
              clearInterval(pollRef.current!);
              window.open(r2.url, "_blank", "noopener,noreferrer");
              setPdfDownloading(false);
            }
          }, 2000);
          return;
        }
      } catch {
        // fall through to local generation
      }
      setPdfDownloading(false);
    }

    // Fallback: cached base64 or on-demand generation
    if (!plan) return;
    try {
      await openPlanAsPDF(plan, type, cachedPdfBase64, locale);
    } catch {
      // silent — user sees nothing is happening which is acceptable
    }
  }

  if (error) return (
    <div className={styles.page}>
      <div className={styles.errorBox}>
        <p>{error}</p>
        <Link href="/results" className={styles.backLink}>{t("back_to_report")}</Link>
      </div>
    </div>
  );

  if (!plan) return (
    <div className={styles.page} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase" }}>
        {t("loading")}
      </div>
    </div>
  );

  const urgency = plan.score != null ? urgencyBucket(plan.score) : null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/results" className={styles.backLink}>{t("back_to_report_upper")}</Link>
        <div className={styles.headerTitle} style={{ color: plan.color }}>{plan.title}</div>
        <button onClick={handleDownload} disabled={pdfDownloading} className={styles.printBtn}>
          {pdfDownloading ? "..." : t("pdf_download")}
        </button>
      </div>

      <div className={styles.container} id="plan-content">
        <div className={styles.hero}>
          <span className={styles.tag} style={{ color: plan.color, borderColor: plan.color }}>{t("tag")}</span>
          <h1 className={styles.title}>{plan.title}</h1>

          {/* Score + urgency label */}
          {plan.score != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: plan.color, fontFamily: "var(--font-oswald), sans-serif", letterSpacing: "0.04em" }}>
                {plan.score}<span style={{ fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>/100</span>
              </span>
              {urgency && (
                <span style={{
                  display: "inline-block",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: urgency.color,
                  border: `1px solid ${urgency.color}`,
                  background: `${urgency.color}18`,
                  padding: "3px 10px",
                  borderRadius: 2,
                  fontFamily: "var(--font-oswald), sans-serif",
                  textTransform: "uppercase",
                  lineHeight: 1.35,
                  maxWidth: "100%",
                }}>
                  {tResults(`urgency.${urgency.key}`)}
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
                  {t("rationale_label")}
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
            {t("back_to_report_upper")}
          </Link>
        </div>

        <p className={styles.disclaimer}>
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
