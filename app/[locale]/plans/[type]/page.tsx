"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./plan.module.css";
import { buildPlan, type PlanType, type PlanContent, type PlanBlock } from "@/lib/plan/buildPlan";

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
  return (
    <Suspense fallback={null}>
      <PlanPageInner />
    </Suspense>
  );
}

function PlanPageInner() {
  const t = useTranslations("plans_detail");
  const tResults = useTranslations("results");
  const { locale, type } = useParams() as { locale: string; type: string };
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<PlanContent | null>(null);
  const [cachedPdfBase64, setCachedPdfBase64] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [error, setError] = useState("");
  // Raw diagnostic detail from the server (e.g. error code, status,
  // message snippet). Rendered as a small subtitle under the localized
  // error message so the operator can read what really happened without
  // opening DevTools.
  const [errorDetail, setErrorDetail] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    console.log("[Plans/FE/view] mount", { locale, type, retryKey, pathname: typeof window !== "undefined" ? window.location.pathname : "?" });
    setError("");
    setErrorDetail("");
    setPlan(null);
    const abortController = new AbortController();
    // Hard client-side timeout — must fire just before the server's
    // Vercel maxDuration (180s) so we get a clean abort instead of
    // racing the server. 170s gives a 10s buffer.
    const timeoutId = setTimeout(() => {
      abortController.abort(new Error("client-timeout-170s"));
    }, 170_000);
    try {
      // URL-recovery: if sessionStorage is missing or its assessmentId
      // doesn't match the URL ?id, fetch from /api/results/[id], write
      // it back to sessionStorage, then bump retryKey so this effect
      // re-runs and finds the cached data on the second pass. The
      // mid-flight return below leaves abortController + timeout in a
      // clean state.
      const idFromUrl = searchParams?.get("id") ?? null;
      let raw: string | null = null;
      try { raw = sessionStorage.getItem("btb_results"); } catch { raw = null; }
      type CachedResults = {
        scores?: Record<string, unknown> | null;
        assessmentId?: string | null;
        downloadUrl?: string | null;
        plans?: Record<string, { blocks?: PlanBlock[]; locale?: string; source?: string; pdfBase64?: string }>;
      };
      let data: CachedResults | null = null;
      try { data = raw ? JSON.parse(raw) as CachedResults : null; } catch { data = null; }

      const cacheUsable = !!data?.scores && (!idFromUrl || data.assessmentId === idFromUrl);
      if (!cacheUsable) {
        if (!idFromUrl) { setError(t("error_no_data")); return; }
        clearTimeout(timeoutId);
        fetch(`/api/results/${idFromUrl}`, { cache: "no-store", signal: abortController.signal })
          .then(async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<{
              scores: unknown;
              downloadUrl: string;
              assessmentId: string;
            }>;
          })
          .then((recovered) => {
            try {
              sessionStorage.setItem("btb_results", JSON.stringify({
                scores: recovered.scores,
                downloadUrl: recovered.downloadUrl,
                assessmentId: recovered.assessmentId,
              }));
            } catch { /* private browsing — non-fatal */ }
            // Re-run this effect now that sessionStorage is hydrated.
            setRetryKey((k) => k + 1);
          })
          .catch(() => setError(t("error_no_data")));
        return;
      }
      // From here data is guaranteed to have .scores.
      if (!data?.scores) { setError(t("error_no_scores")); return; }
      const scores = data.scores;
      const validTypes: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
      if (!validTypes.includes(type as PlanType)) { setError(t("error_unknown_type")); return; }

      if (data.assessmentId) setAssessmentId(data.assessmentId);

      // 1. Check sessionStorage for a pre-generated plan (from /analyse)
      // Only use cached plan if it was generated for the same locale;
      // mismatches (locale change or pre-fix cache without .locale) fall
      // through to path 2 so the user gets correctly-localised blocks.
      const cached = data.plans?.[type as PlanType];
      console.log("[Plans/FE/view] cache probe", { hasCache: !!cached?.blocks?.length, cachedLocale: cached?.locale, match: cached?.locale === locale, firstHeading: cached?.blocks?.[0]?.heading });
      if (cached?.blocks?.length && cached.locale === locale) {
        const base = buildPlan(type as PlanType, scores, locale);
        setPlan({
          ...base,
          blocks: cached.blocks,
          source: cached.source ?? base.source,
        });
        if (cached.pdfBase64) setCachedPdfBase64(cached.pdfBase64);
        return;
      }

      // 2. No cache — fetch AI. DO NOT render the German static fallback in
      // the meantime; show the loading state, then either AI content or a
      // clear error. Unpersonalised template text is worse than an error.
      // Phase 2C: prefer the assessmentId-based body so the server loads the
      // canonical ReportContext (full raw inputs + personalization). Legacy
      // body { type, scores, locale } is kept as a fallback for assessments
      // saved before this rollout.
      const planBody = data.assessmentId
        ? { assessmentId: data.assessmentId, type, locale }
        : { type, scores, locale };
      console.log("[Plans/FE/view] POST /api/plan/generate body.locale =", locale, "type =", type, "mode =", data.assessmentId ? "assessmentId" : "legacy-scores");
      fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planBody),
        signal: abortController.signal,
      })
        .then(async (r) => {
          if (!r.ok) {
            const status = r.status;
            const body = await r.json().catch(() => null) as {
              error?: string;
              code?: string;
              errType?: string;
            } | null;
            const detailParts = [
              `HTTP ${status}`,
              body?.code ? `code=${body.code}` : null,
              body?.errType ? `type=${body.errType}` : null,
              body?.error ? `msg="${body.error}"` : null,
            ].filter(Boolean);
            const errorObj = new Error(body?.error ?? `HTTP ${status}`);
            (errorObj as Error & { detail?: string }).detail = detailParts.join(" · ");
            throw errorObj;
          }
          return r.json();
        })
        .then((ai) => {
          clearTimeout(timeoutId);
          console.log("[Plans/FE/view] fresh AI response", { responseLocale: ai?.locale, firstHeading: ai?.blocks?.[0]?.heading, blocksCount: ai?.blocks?.length });
          if (!ai?.blocks?.length) {
            setError(t("error_ai_failed"));
            setErrorDetail("ai_returned_empty_blocks");
            return;
          }
          const base = buildPlan(type as PlanType, scores, locale);
          setPlan({
            ...base,
            blocks: ai.blocks,
            source: ai.source ?? base.source,
            ...(ai.title    ? { title: ai.title }       : {}),
            ...(ai.subtitle ? { subtitle: ai.subtitle } : {}),
          });
        })
        .catch((e: unknown) => {
          clearTimeout(timeoutId);
          if (abortController.signal.aborted) {
            console.warn("[Plans/FE/view] AI fetch aborted (170s timeout)");
            setError(t("error_ai_timeout"));
            setErrorDetail("client-timeout-170s");
            return;
          }
          console.error("[Plans/FE/view] AI fetch failed", e);
          setError(t("error_ai_failed"));
          const detail =
            (e as { detail?: string })?.detail ??
            (e instanceof Error ? e.message : String(e));
          setErrorDetail(detail);
        });
    } catch {
      clearTimeout(timeoutId);
      setError(t("error_loading"));
    }
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [type, t, locale, retryKey, searchParams]);

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

  const isRetryable = error === t("error_ai_failed") || error === t("error_ai_timeout");

  if (error) return (
    <div className={styles.page}>
      <div className={styles.errorBox}>
        <p>{error}</p>
        {errorDetail && (
          <p
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "#888",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            {errorDetail}
          </p>
        )}
        {isRetryable && (
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            style={{
              display: "block",
              margin: "18px auto 10px",
              padding: "10px 22px",
              background: "transparent",
              border: "1px solid #888",
              color: "#eee",
              fontFamily: "var(--font-oswald), sans-serif",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            {t("retry_btn")}
          </button>
        )}
        <Link href="/results" className={styles.backLink}>{t("back_to_report")}</Link>
      </div>
    </div>
  );

  if (!plan) return (
    <div className={styles.page} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 20px" }}>
        <div
          style={{
            width: 28,
            height: 28,
            margin: "0 auto 18px",
            border: "2px solid rgba(255,255,255,0.12)",
            borderTopColor: "rgba(255,255,255,0.5)",
            borderRadius: "50%",
            animation: "btb-spin 1s linear infinite",
          }}
          aria-hidden
        />
        <div style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: 14, letterSpacing: "0.08em", color: "#eee", textTransform: "uppercase", marginBottom: 10 }}>
          {t("loading_ai_primary")}
        </div>
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "#888", lineHeight: 1.5 }}>
          {t("loading_ai_secondary")}
        </div>
        <style>{`@keyframes btb-spin { to { transform: rotate(360deg); } }`}</style>
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
