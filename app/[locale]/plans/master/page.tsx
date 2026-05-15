"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MasterPlan } from "@/lib/master-plan/schema";
import styles from "./master.module.css";

interface CachedMasterPlan {
  plan: MasterPlan;
  pdfBase64: string;
}

function tryReadSessionPlan(): CachedMasterPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("btb_master_plan");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMasterPlan;
    if (!parsed.plan || !parsed.pdfBase64) return null;
    return parsed;
  } catch {
    return null;
  }
}

function downloadFilenameFor(locale: string): string {
  if (locale === "en") return "MasterPlan.pdf";
  if (locale === "it") return "Piano-Master.pdf";
  if (locale === "tr") return "Master-Plan.pdf";
  return "Masterplan.pdf"; // de + default
}

// Downloads the PDF with a proper, locale-aware filename. Uses the anchor +
// download-attribute pattern because Blob URLs carry no filename hint —
// window.open(blobUrl) would surface as "Unknown.pdf" in Chrome.
function downloadPdfFromBase64(b64: string, locale: string): void {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadFilenameFor(locale);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function MasterPlanPage() {
  return (
    <Suspense fallback={null}>
      <MasterPlanPageInner />
    </Suspense>
  );
}

function MasterPlanPageInner() {
  const t = useTranslations("results.master_plan");
  const { locale } = useParams() as { locale: string };
  const searchParams = useSearchParams();
  const [cached, setCached] = useState<CachedMasterPlan | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const initial = tryReadSessionPlan();
    console.log("[MasterPlan/FE/page] mount", {
      hasCached: !!initial,
      url: typeof window !== "undefined" ? window.location.pathname : "?",
    });
    setCached(initial);
  }, []);

  // Poll sessionStorage in case parallel pre-generation finishes after mount.
  useEffect(() => {
    if (cached) return;
    setPolling(true);
    let pollCount = 0;
    const id = setInterval(() => {
      pollCount++;
      const found = tryReadSessionPlan();
      if (found) {
        console.log("[MasterPlan/FE/page] sessionStorage filled after polling", { pollCount });
        setCached(found);
        setPolling(false);
        clearInterval(id);
      }
    }, 2_000);
    // give up after 90s
    const giveUp = setTimeout(() => {
      clearInterval(id);
      setPolling(false);
      console.warn("[MasterPlan/FE/page] polling timed out — sessionStorage still empty after 90s");
    }, 90_000);
    return () => {
      clearInterval(id);
      clearTimeout(giveUp);
    };
  }, [cached]);

  async function regenerate(): Promise<void> {
    const assessmentId = searchParams?.get("id");
    if (!assessmentId) {
      setError(t("error_no_id"));
      return;
    }
    setRetrying(true);
    setError("");
    const startedAt = Date.now();
    // Client-side timeout matched to /api/master-plan/generate maxDuration (240s)
    // plus a small buffer. Without this, the browser holds the fetch forever
    // when the Vercel function times out at the gateway.
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(new Error("client-timeout-250s")), 250_000);
    console.log("[MasterPlan/FE/regenerate] start", { assessmentId, locale });
    try {
      const res = await fetch("/api/master-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, locale }),
        signal: ac.signal,
      });
      const elapsedMs = Date.now() - startedAt;
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[MasterPlan/FE/regenerate] non-ok response", {
          status: res.status,
          elapsedMs,
          bodySnippet: txt.slice(0, 500),
        });
        setError(`${t("error_generic")}: ${txt.slice(0, 200)}`);
        setRetrying(false);
        return;
      }
      const data = (await res.json()) as CachedMasterPlan;
      if (!data.plan || !data.pdfBase64) {
        console.error("[MasterPlan/FE/regenerate] response missing plan/pdfBase64", {
          elapsedMs,
          hasPlan: !!data.plan,
          hasPdf: !!data.pdfBase64,
        });
        setError(t("error_generic"));
        setRetrying(false);
        return;
      }
      try {
        const payload = JSON.stringify(data);
        sessionStorage.setItem("btb_master_plan", payload);
        console.log("[MasterPlan/FE/regenerate] wrote bundle to sessionStorage", {
          elapsedMs,
          payloadKb: Math.round(payload.length / 1024),
        });
      } catch (storageErr) {
        console.error("[MasterPlan/FE/regenerate] sessionStorage write failed (probably quota)", {
          error: (storageErr as Error).message,
          pdfSizeKb: Math.round(data.pdfBase64.length * 0.75 / 1024),
        });
        // Continue — we'll still set the in-memory cache so the user sees the plan,
        // they just won't be able to reload the page and find it cached.
      }
      setCached(data);
    } catch (e) {
      const elapsedMs = Date.now() - startedAt;
      const msg = (e as Error).message;
      console.error("[MasterPlan/FE/regenerate] fetch threw", { elapsedMs, error: msg });
      setError(`${t("error_generic")}: ${msg}`);
    } finally {
      clearTimeout(timeoutId);
      setRetrying(false);
    }
  }

  const plan = cached?.plan;

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <Link href={`/results${searchParams?.get("id") ? `?id=${searchParams.get("id")}` : ""}`} className={styles.back}>
          ← {t("back_to_results")}
        </Link>
        <h1 className={styles.title}>{plan?.title ?? t("title_fallback")}</h1>
        {plan?.subtitle && <p className={styles.subtitle}>{plan.subtitle}</p>}
      </header>

      {!plan && polling && (
        <div className={styles.notice}>
          <p>{t("still_generating")}</p>
          <div className={styles.spinner} aria-hidden="true" />
        </div>
      )}

      {!plan && !polling && (
        <div className={styles.notice}>
          <p>{error || t("not_ready")}</p>
          <button onClick={regenerate} disabled={retrying} className={styles.retryBtn}>
            {retrying ? t("retrying") : t("retry")}
          </button>
        </div>
      )}

      {plan && cached && (
        <>
          <button
            type="button"
            onClick={() => downloadPdfFromBase64(cached.pdfBase64, locale)}
            className={styles.downloadBtn}
          >
            {t("open_pdf")}
          </button>

          <section className={styles.introBlock}>
            <h2 className={styles.introHeading}>{t("strategy_heading")}</h2>
            <p className={styles.introText}>{plan.intro}</p>
          </section>

          <section className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("col_day")}</th>
                  <th>{t("col_training")}</th>
                  <th>{t("col_nutrition")}</th>
                  <th>{t("col_recovery")}</th>
                  <th>{t("col_stress")}</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((row) => (
                  <tr key={row.day}>
                    <td className={styles.dayCell}>{t(`day_${row.day}`)}</td>
                    <td>
                      <ul className={styles.cellList}>
                        {row.training.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul className={styles.cellList}>
                        {row.nutrition.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul className={styles.cellList}>
                        {row.recovery.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul className={styles.cellList}>
                        {row.stress_anchor.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
