"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./plan.module.css";
import { buildPlan, type PlanType, type PlanContent } from "@/lib/plan/buildPlan";

// Sets the URL on a pre-opened tab so the PDF renders inline.
// Falls back to window.open if the tab reference is lost.
function showPdfInTab(tab: Window | null, url: string) {
  if (tab && !tab.closed) {
    tab.location.href = url;
  } else {
    window.open(url, "_blank");
  }
}

function showBytesInTab(tab: Window | null, bytes: Uint8Array | ArrayBuffer) {
  const blob = new Blob([bytes as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  showPdfInTab(tab, url);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
  const { locale, type } = useParams() as { locale: string; type: string };
  const [plan, setPlan] = useState<PlanContent | null>(null);
  const [cachedPdfBase64, setCachedPdfBase64] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [error, setError] = useState("");

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
      // Only use cached plan if it was generated for the same locale;
      // mismatches (locale change or pre-fix cache without .locale) fall
      // through to path 2 so the user gets correctly-localised blocks.
      const cached = data.plans?.[type as PlanType];
      if (cached?.blocks?.length && cached.locale === locale) {
        const base = buildPlan(type as PlanType, data.scores, locale);
        setPlan({
          ...base,
          blocks: cached.blocks,
          source: cached.source ?? base.source,
        });
        if (cached.pdfBase64) setCachedPdfBase64(cached.pdfBase64);
        return;
      }

      // 2. No cache (legacy flow / manual nav) — build static + fetch AI
      const initial = buildPlan(type as PlanType, data.scores, locale);
      setPlan(initial);

      fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, scores: data.scores, locale }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((ai) => {
          if (ai?.blocks?.length) {
            setPlan((prev) => prev ? {
              ...prev,
              blocks: ai.blocks,
              source: ai.source ?? prev.source,
              ...(ai.title    ? { title: ai.title }       : {}),
              ...(ai.subtitle ? { subtitle: ai.subtitle } : {}),
            } : prev);
          }
        })
        .catch(() => {});
    } catch {
      setError(t("error_loading"));
    }
  }, [type, t]);

  async function handleDownload() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    console.log("[Download] Button clicked", { type, assessmentId, hasBase64: !!cachedPdfBase64 });

    // Open a blank tab SYNCHRONOUSLY before any await so popup blockers
    // treat it as a direct user gesture.
    const newTab = window.open("", "_blank");

    try {
      // Fast path: Storage-backed signed URL (single check, no polling)
      if (assessmentId) {
        try {
          console.log("[Download] Checking Storage...");
          const res = await fetch(
            `/api/reports/pdf-url?assessment_id=${assessmentId}&pdf_type=plan_${type}&locale=${locale}`,
          );
          const json = await res.json() as { ready?: boolean; url?: string };
          if (json.ready && json.url) {
            console.log("[Download] Storage URL ready — opening in tab");
            showPdfInTab(newTab, json.url);
            return;
          }
          console.log("[Download] Storage not ready, using local fallback");
        } catch {
          console.log("[Download] Storage check failed, using local fallback");
        }
      }

      // Baseline: cached base64 (instant) or on-demand API generation
      if (cachedPdfBase64) {
        console.log("[Download] Using cached base64");
        const byteChars = atob(cachedPdfBase64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        showBytesInTab(newTab, bytes);
        console.log("[Download] Done (base64)");
        return;
      }

      if (!plan) throw new Error("Plan not loaded yet");
      console.log("[Download] Generating PDF on-demand via API");
      const res = await fetch("/api/plan/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, locale }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const buf = await res.arrayBuffer();
      showBytesInTab(newTab, buf);
      console.log("[Download] Done (on-demand)");
    } catch (err) {
      console.error("[Download] Failed:", err);
      if (newTab && !newTab.closed) newTab.close();
      alert(t("error_loading"));
    } finally {
      setPdfDownloading(false);
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
