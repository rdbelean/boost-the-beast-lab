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

function openPdfFromBase64(b64: string): void {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
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
    setCached(tryReadSessionPlan());
  }, []);

  // Poll sessionStorage in case parallel pre-generation finishes after mount.
  useEffect(() => {
    if (cached) return;
    setPolling(true);
    const id = setInterval(() => {
      const found = tryReadSessionPlan();
      if (found) {
        setCached(found);
        setPolling(false);
        clearInterval(id);
      }
    }, 2_000);
    // give up after 90s
    const giveUp = setTimeout(() => {
      clearInterval(id);
      setPolling(false);
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
    try {
      const res = await fetch("/api/master-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, locale }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setError(`${t("error_generic")}: ${txt.slice(0, 200)}`);
        setRetrying(false);
        return;
      }
      const data = (await res.json()) as CachedMasterPlan;
      if (!data.plan || !data.pdfBase64) {
        setError(t("error_generic"));
        setRetrying(false);
        return;
      }
      try {
        sessionStorage.setItem("btb_master_plan", JSON.stringify(data));
      } catch {
        /* ignore quota errors */
      }
      setCached(data);
    } catch (e) {
      setError(`${t("error_generic")}: ${(e as Error).message}`);
    } finally {
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
            onClick={() => openPdfFromBase64(cached.pdfBase64)}
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
