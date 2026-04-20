"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import styles from "./prepare.module.css";
import {
  UploadError,
  WhoopParseError,
  AppleHealthParseError,
} from "@/lib/wearable/upload/dispatch";
import {
  batchDispatch,
  validateBatch,
  MAX_FILES,
  MAX_ZIP_BYTES,
  MAX_AI_BYTES,
  type BatchFileResult,
} from "@/lib/wearable/upload/batch";
import { mergeWearableResults } from "@/lib/wearable/aggregation/merge";
import type { WearableParseResult, WearableSource } from "@/lib/wearable/types";

type FileEntryStatus = "queued" | "processing" | "done" | "error";

interface FileEntry {
  id: string;
  file: File;
  status: FileEntryStatus;
  result?: WearableParseResult;
  errorMsg?: string;
}

function fileIcon(file: File): string {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".zip")) return "📦";
  if (lower.endsWith(".pdf")) return "📄";
  if (lower.match(/\.(jpe?g|png|webp|gif|heic|heif)$/)) return "🖼";
  if (lower.match(/\.(csv|txt)$/)) return "📊";
  return "📎";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

let idCounter = 0;
function newId() { return `f${++idCounter}`; }

function PrepareContent() {
  const t = useTranslations("analyse_prepare");
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const product = params.get("product") ?? "complete-analysis";

  const [paymentChecked, setPaymentChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentFileLabel, setCurrentFileLabel] = useState("");
  const [doneCount, setDoneCount] = useState(0);
  const [files, setFiles] = useState<FileEntry[]>([]);
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
    return () => { cancelled = true; };
  }, [sessionId, router]);

  function goToAnalyse(extra?: string) {
    const qs = new URLSearchParams();
    if (sessionId) qs.set("session_id", sessionId);
    qs.set("product", product);
    if (extra) qs.set("wearable", extra);
    router.push(`/analyse?${qs.toString()}`);
  }

  async function handleSkip() {
    try { sessionStorage.removeItem("btb_wearable"); } catch { /**/ }
    goToAnalyse();
  }

  function addFiles(incoming: File[]) {
    setErrorMsg(null);
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_FILES) {
        setErrorMsg(t("errors.too_many_files"));
        break;
      }
      const lower = f.name.toLowerCase();
      const isZip = f.type === "application/zip" || lower.endsWith(".zip");
      const maxBytes = isZip ? MAX_ZIP_BYTES : MAX_AI_BYTES;
      if (f.size > maxBytes) {
        setErrorMsg(isZip
          ? `"${f.name}" ist zu groß (max. ${formatBytes(maxBytes)} pro ZIP).`
          : t("errors.too_large"));
        continue;
      }
      next.push({ id: newId(), file: f, status: "queued" });
    }
    const totalBytes = next.reduce((s, e) => s + e.file.size, 0);
    if (totalBytes > 200 * 1024 * 1024) {
      setErrorMsg(t("errors.total_too_large"));
      return;
    }
    setFiles(next);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((e) => e.id !== id));
    setErrorMsg(null);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) addFiles(picked);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.remove(styles.uploadZoneActive);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) addFiles(dropped);
  }

  function errorLabel(err: Error): string {
    if (err instanceof UploadError) {
      const code = err.code;
      if (code === "empty_file" || code === "too_large" || code === "unknown_zip"
        || code === "unsupported_format" || code === "heic_unsupported"
        || code === "low_confidence" || code === "server_error") {
        return t(`errors.${code}`);
      }
    }
    if (err instanceof WhoopParseError || err instanceof AppleHealthParseError) {
      return err.message;
    }
    return err.message;
  }

  async function processFiles() {
    const batchErr = validateBatch(files.map((e) => e.file));
    if (batchErr) {
      setErrorMsg(t(`errors.${batchErr}`));
      return;
    }

    setErrorMsg(null);
    setProcessing(true);
    setOverallProgress(5);
    setDoneCount(0);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // Reset all to queued.
    setFiles((prev) => prev.map((e) => ({ ...e, status: "queued" as FileEntryStatus })));

    let finished = 0;
    const total = files.length;

    const batchResults: BatchFileResult[] = await batchDispatch(
      files.map((e) => e.file),
      {
        signal,
        onFileStart: (idx) => {
          setCurrentFileLabel(files[idx]?.file.name ?? "");
          setFiles((prev) =>
            prev.map((e, i) => i === idx ? { ...e, status: "processing" } : e),
          );
        },
        onFileProgress: (idx, pct) => {
          const base = (finished / total) * 80;
          const slice = (1 / total) * 80;
          setOverallProgress(5 + base + slice * (pct / 100));
          void idx;
        },
        onFileDone: (idx, result) => {
          finished++;
          setDoneCount(finished);
          setOverallProgress(5 + (finished / total) * 80);
          setFiles((prev) =>
            prev.map((e, i) =>
              i === idx ? { ...e, status: "done", result } : e,
            ),
          );
        },
        onFileError: (idx, err) => {
          finished++;
          setDoneCount(finished);
          setFiles((prev) =>
            prev.map((e, i) =>
              i === idx ? { ...e, status: "error", errorMsg: errorLabel(err) } : e,
            ),
          );
        },
      },
    );

    if (signal.aborted) {
      setProcessing(false);
      return;
    }

    const successes = batchResults.filter((r) => r.result != null);
    if (successes.length === 0) {
      setErrorMsg(t("errors.all_failed"));
      setProcessing(false);
      // Restore file list with errors visible.
      return;
    }

    setOverallProgress(88);
    setCurrentFileLabel(t("parsing.saving"));

    // Build persist payload.
    const successResults = successes.map((r) => r.result!);
    const successNames = successes.map((r) => r.file.name);

    let persistPayload: Record<string, unknown>;

    if (successResults.length === 1) {
      // Single result → plain single-source payload.
      persistPayload = {
        ...successResults[0],
      };
    } else {
      // Multi-source → merge and build merged payload.
      const merged = mergeWearableResults({
        results: successResults,
        fileNames: successNames,
      });
      const latestEnd = successResults
        .map((r) => r.window_end)
        .sort()
        .at(-1) ?? new Date().toISOString().slice(0, 10);
      const earliestStart = successResults
        .map((r) => r.window_start)
        .sort()
        .at(0) ?? latestEnd;
      const maxDays = Math.max(...successResults.map((r) => r.days_covered));
      const totalBytes = successes.reduce((s, r) => s + r.file.size, 0);
      const allWarnings = successResults.flatMap((r) => r.parse_warnings);
      const sources = [...new Set(successResults.map((r) => r.source))] as WearableSource[];

      persistPayload = {
        source: "merged",
        schema_version: "1.0",
        window_start: earliestStart,
        window_end: latestEnd,
        days_covered: maxDays,
        metrics: merged,
        file_size_bytes: totalBytes,
        parse_duration_ms: 0,
        parse_warnings: allWarnings,
        total_files_count: successResults.length,
        source_files: merged.sources_used,
        merge_provenance: merged.field_provenance,
      };
      void sources;
    }

    try {
      const persistRes = await fetch("/api/wearable/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(persistPayload),
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

      setOverallProgress(100);

      const primaryResult = successResults[0];
      const metricsToStore = successResults.length === 1
        ? primaryResult.metrics
        : mergeWearableResults({ results: successResults, fileNames: successNames });

      try {
        sessionStorage.setItem(
          "btb_wearable",
          JSON.stringify({
            uploadId: persistJson.uploadId,
            source: persistPayload.source,
            days_covered: persistPayload.days_covered,
            metrics: metricsToStore,
          }),
        );
      } catch { /**/ }

      goToAnalyse(persistJson.uploadId);
    } catch (err) {
      if (signal.aborted) { setProcessing(false); return; }
      const msg = err instanceof Error ? err.message : t("errors.unknown");
      setErrorMsg(msg);
      setProcessing(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setProcessing(false);
    setOverallProgress(0);
    setFiles((prev) => prev.map((e) =>
      e.status === "processing" || e.status === "queued" ? { ...e, status: "queued" } : e,
    ));
  }

  if (!paymentChecked) return null;

  const hasFiles = files.length > 0;
  const doneFiles = files.filter((e) => e.status === "done").length;
  const totalFiles = files.length;

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

        {/* ── File list ─────────────────────────────────────── */}
        {hasFiles && (
          <div className={styles.fileList}>
            {files.map((entry) => (
              <div key={entry.id} className={styles.fileItem}>
                <span className={styles.fileIconEmoji} aria-hidden>
                  {fileIcon(entry.file)}
                </span>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{entry.file.name}</span>
                  <span className={styles.fileMeta}>{formatBytes(entry.file.size)}</span>
                  {entry.status === "error" && entry.errorMsg && (
                    <span className={styles.fileError}>{entry.errorMsg}</span>
                  )}
                </div>
                <span className={`${styles.fileStatus} ${styles[`fileStatus_${entry.status}`]}`}>
                  {entry.status === "processing" && (
                    <span className={styles.spinner} aria-hidden />
                  )}
                  {entry.status === "done" && "✓"}
                  {entry.status === "error" && "✕"}
                  {entry.status === "queued" && "·"}
                </span>
                {!processing && (
                  <button
                    className={styles.fileRemove}
                    onClick={() => removeFile(entry.id)}
                    aria-label={t("multi.remove")}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Drop zone ─────────────────────────────────────── */}
        <label
          className={styles.uploadZone}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add(styles.uploadZoneActive);
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove(styles.uploadZoneActive);
          }}
          onDrop={handleDrop}
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
          <div className={styles.uploadLabel}>
            {hasFiles ? t("dropzone.title_with_files") : t("dropzone.title")}
          </div>
          {!hasFiles && (
            <>
              <div className={styles.uploadHint}>{t("dropzone.subtitle")}</div>
              <div className={styles.uploadSupports}>{t("dropzone.supports")}</div>
              <div className={styles.uploadMeta}>{t("dropzone.max_size")}</div>
            </>
          )}
          {hasFiles && (
            <div className={styles.uploadHint}>{t("dropzone.subtitle")}</div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".zip,application/zip,.pdf,application/pdf,image/jpeg,image/png,image/webp,image/gif,.csv,text/csv,.txt,text/plain,.json,application/json"
            className={styles.uploadInput}
            onChange={handleInputChange}
          />
        </label>

        {/* ── Process CTA ───────────────────────────────────── */}
        {hasFiles && (
          <button className={styles.processBtn} onClick={processFiles}>
            {totalFiles === 1
              ? t("multi.process_btn_one")
              : t("multi.process_btn_other", { count: totalFiles })}
          </button>
        )}

        <button className={styles.skipLink} onClick={handleSkip}>
          {t("skip.link")}
        </button>
      </div>

      {/* ── Processing overlay ────────────────────────────── */}
      {processing && (
        <div className={styles.overlay}>
          <div className={styles.overlayInner}>
            <div className={styles.overlayLabel}>{t("overlay.label")}</div>
            {totalFiles > 1 ? (
              <div className={styles.overlayTitle}>
                {t("overlay.title_batch_1", { current: doneCount, total: totalFiles })}
                <br />
                {t("overlay.title_batch_2")}
              </div>
            ) : (
              <div className={styles.overlayTitle}>
                {t("overlay.title_1")}<br />{t("overlay.title_2")}
              </div>
            )}
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className={styles.progressText}>
              {Math.floor(overallProgress)}%
              {currentFileLabel && ` · ${currentFileLabel}`}
            </div>
            {totalFiles > 1 && (
              <div className={styles.overlayBatchFiles}>
                {files.map((e) => (
                  <span
                    key={e.id}
                    className={`${styles.batchFileDot} ${styles[`batchFileDot_${e.status}`]}`}
                    title={e.file.name}
                  />
                ))}
              </div>
            )}
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
