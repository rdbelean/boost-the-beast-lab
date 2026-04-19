"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import styles from "./prepare.module.css";
import {
  dispatchAnyFile,
  UploadError,
  WhoopParseError,
  AppleHealthParseError,
} from "@/lib/wearable/upload/dispatch";
import type { WearableParseResult } from "@/lib/wearable/types";

function PrepareContent() {
  const t = useTranslations("analyse_prepare");
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const product = params.get("product") ?? "complete-analysis";

  const [paymentChecked, setPaymentChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsingLabel, setParsingLabel] = useState(t("parsing.reading_zip"));

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionId) {
        if (!cancelled) router.replace("/kaufen");
        return;
      }
      try {
        const res = await fetch(
          `/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`,
        );
        const data = await res.json();
        if (!cancelled && data.paid) {
          setPaymentChecked(true);
          return;
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) router.replace("/kaufen");
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  function goToAnalyse(extra?: string) {
    const qs = new URLSearchParams();
    if (sessionId) qs.set("session_id", sessionId);
    qs.set("product", product);
    if (extra) qs.set("wearable", extra);
    router.push(`/analyse?${qs.toString()}`);
  }

  async function handleSkip() {
    try {
      sessionStorage.removeItem("btb_wearable");
    } catch {
      /* ignore */
    }
    goToAnalyse();
  }

  async function handleFile(file: File) {
    setErrorMsg(null);
    setParsing(true);
    setProgress(5);
    setParsingLabel(t("parsing.reading_zip"));

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const result: WearableParseResult = await dispatchAnyFile(file, {
        signal,
        onPhase: (phase) => {
          if (phase === "streaming") setParsingLabel(t("parsing.streaming_apple"));
          else if (phase === "analyzing") setParsingLabel(t("parsing.analyzing_document"));
          else setParsingLabel(t("parsing.reading_zip"));
        },
        onProgress: (pct) => {
          setProgress(Math.max(5, pct));
        },
      });

      if (signal.aborted) return;

      setProgress(85);
      setParsingLabel(t("parsing.saving"));

      const persistRes = await fetch("/api/wearable/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
        signal,
      });
      const persistJson = (await persistRes.json().catch(() => null)) as {
        uploadId?: string;
        error?: string;
      } | null;
      if (!persistRes.ok || !persistJson?.uploadId) {
        throw new Error(
          persistJson?.error ?? t("errors.server", { status: persistRes.status }),
        );
      }

      setProgress(100);

      try {
        sessionStorage.setItem(
          "btb_wearable",
          JSON.stringify({
            uploadId: persistJson.uploadId,
            source: result.source,
            days_covered: result.days_covered,
            metrics: result.metrics,
          }),
        );
      } catch {
        /* ignore storage errors */
      }

      goToAnalyse(persistJson.uploadId);
    } catch (err) {
      if (signal.aborted) {
        setParsing(false);
        return;
      }

      let msg: string;
      if (err instanceof UploadError) {
        // Map typed codes to localized error strings.
        const code = err.code;
        if (code === "empty_file" || code === "too_large" || code === "unknown_zip"
          || code === "unsupported_format" || code === "heic_unsupported"
          || code === "low_confidence" || code === "server_error") {
          msg = t(`errors.${code}`);
        } else {
          msg = err.message;
        }
      } else if (err instanceof WhoopParseError || err instanceof AppleHealthParseError) {
        msg = err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      } else {
        msg = t("errors.unknown");
      }
      setErrorMsg(msg);
      setParsing(false);
      setProgress(0);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setParsing(false);
    setProgress(0);
  }

  if (!paymentChecked) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.label}>{t("label")}</div>
        <h1 className={styles.headline}>{t("headline")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>

        <div className={styles.privacyBanner}>
          <svg
            className={styles.shieldIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <strong>{t("privacy_banner.strong")}</strong>
            {t("privacy_banner.text")}
          </div>
        </div>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        <label
          className={styles.uploadZone}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add(styles.uploadZoneActive);
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove(styles.uploadZoneActive);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove(styles.uploadZoneActive);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <svg
            className={styles.uploadIcon}
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden
          >
            <path d="M20 28V12M12 20l8-8 8 8" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="6" y="30" width="28" height="4" rx="1" stroke="#E63222" strokeWidth="1.5" />
          </svg>
          <div className={styles.uploadLabel}>{t("dropzone.title")}</div>
          <div className={styles.uploadHint}>{t("dropzone.subtitle")}</div>
          <div className={styles.uploadSupports}>{t("dropzone.supports")}</div>
          <div className={styles.uploadMeta}>{t("dropzone.max_size")}</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,.pdf,application/pdf,image/jpeg,image/png,image/webp,image/gif,.csv,text/csv,.txt,text/plain,.json,application/json"
            className={styles.uploadInput}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>

        <button className={styles.skipLink} onClick={handleSkip}>
          {t("skip.link")}
        </button>
      </div>

      {parsing && (
        <div className={styles.overlay}>
          <div className={styles.overlayInner}>
            <div className={styles.overlayLabel}>{t("overlay.label")}</div>
            <div className={styles.overlayTitle}>
              {t("overlay.title_1")}<br />{t("overlay.title_2")}
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className={styles.progressText}>
              {Math.floor(progress)}% · {parsingLabel}
            </div>
            <div className={styles.overlayReassurance}>{t("overlay.reassurance")}</div>
            <button className={styles.overlayCancel} onClick={handleCancel}>
              {t("overlay.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PreparePage() {
  return (
    <Suspense fallback={null}>
      <PrepareContent />
    </Suspense>
  );
}
