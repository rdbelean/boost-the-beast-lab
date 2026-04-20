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
  isWhoopCsv,
  isGpxFile,
  MAX_FILES,
  MAX_ZIP_BYTES,
  MAX_AI_BYTES,
  type BatchFileResult,
} from "@/lib/wearable/upload/batch";
import { mergeWearableResults } from "@/lib/wearable/aggregation/merge";
import { detectFolderIntent, type FolderIntentResult } from "@/lib/wearable/detection/folder-intent";
import { assessDataQuality } from "@/lib/wearable/assessment/data-quality";
import DataQualityBadge from "@/components/analyse/wearable/DataQualityBadge";
import FolderIntentWarning from "@/components/analyse/wearable/FolderIntentWarning";
import type { WearableParseResult, WearableSource } from "@/lib/wearable/types";

// ── Types ──────────────────────────────────────────────────────────────────

type FileEntryStatus = "queued" | "processing" | "done" | "error";
type DetectedType = "whoop_csv" | "whoop_zip" | "apple_zip" | "gpx" | "ai_doc" | "unknown";

interface FileEntry {
  id: string;
  file: File;
  status: FileEntryStatus;
  detectedType: DetectedType;
  result?: WearableParseResult;
  errorMsg?: string;
  groupId?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function detectType(file: File): DetectedType {
  const lower = file.name.toLowerCase();
  if (isWhoopCsv(file)) return "whoop_csv";
  if (isGpxFile(file)) return "gpx";
  if (lower.endsWith(".zip")) {
    if (lower.includes("whoop")) return "whoop_zip";
    if (lower.includes("export") || lower.includes("apple")) return "apple_zip";
    return "unknown";
  }
  if (lower.endsWith(".pdf")) return "ai_doc";
  if (/\.(jpe?g|png|webp|gif)$/.test(lower)) return "ai_doc";
  if (/\.(csv|txt|json)$/.test(lower)) return "ai_doc";
  return "unknown";
}

function fileIcon(file: File): string {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".zip")) return "📦";
  if (lower.endsWith(".pdf")) return "📄";
  if (lower.endsWith(".gpx")) return "🗺";
  if (lower.match(/\.(jpe?g|png|webp|gif)$/)) return "🖼";
  if (lower.match(/\.(csv|txt)$/)) return "📊";
  return "📎";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function extractFromDataTransfer(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = [];

  async function readEntry(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((res) =>
        (entry as FileSystemFileEntry).file(res),
      );
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      let batch: FileSystemEntry[];
      do {
        batch = await new Promise<FileSystemEntry[]>((res) =>
          reader.readEntries(res, () => res([])),
        );
        for (const e of batch) await readEntry(e);
      } while (batch.length > 0);
    }
  }

  const promises: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) promises.push(readEntry(entry));
  }
  await Promise.all(promises);
  return files;
}

let idSeq = 0;
function newId() { return `fe${++idSeq}`; }

// ── Status sort order ──────────────────────────────────────────────────────
const STATUS_ORDER: Record<FileEntryStatus, number> = {
  done:       0,
  processing: 1,
  queued:     1,
  error:      2,
};

// ── Component ──────────────────────────────────────────────────────────────

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
  const [dragActive, setDragActive] = useState(false);

  // 3-phase flow
  const [hasProcessed, setHasProcessed] = useState(false);
  const [showDropzone, setShowDropzone] = useState(true);
  const [isContinuing, setIsContinuing] = useState(false);
  const [showErrors, setShowErrors] = useState(true);

  // Folder-intent pre-flight
  const [pendingRawFiles, setPendingRawFiles] = useState<File[] | null>(null);
  const [folderIntent, setFolderIntent] = useState<FolderIntentResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef     = useRef<AbortController | null>(null);

  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("webkitdirectory", "");
      fileInputRef.current.setAttribute("directory", "");
    }
  }, []);

  // ── Payment gate ────────────────────────────────────────────────────────
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
      } catch { /* fall through */ }
      if (!cancelled) router.replace("/kaufen");
    })();
    return () => { cancelled = true; };
  }, [sessionId, router]);

  // ── Navigation ──────────────────────────────────────────────────────────
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

  // ── Core file-add logic (runs after intent check) ───────────────────────
  function processAddFiles(incoming: File[]) {
    setErrorMsg(null);
    const toAdd: FileEntry[] = [];

    for (const f of incoming) {
      if (f.name.startsWith(".") || f.name === "Thumbs.db") continue;
      const lower = f.name.toLowerCase();
      const zipFile = f.type === "application/zip" || lower.endsWith(".zip");
      const maxBytes = zipFile ? MAX_ZIP_BYTES : MAX_AI_BYTES;
      if (f.size === 0) continue;
      if (f.size > maxBytes) {
        setErrorMsg(zipFile
          ? `"${f.name}" ist zu groß (max. ${formatBytes(maxBytes)} pro ZIP).`
          : t("errors.too_large"));
        continue;
      }
      toAdd.push({ id: newId(), file: f, status: "queued", detectedType: detectType(f) });
    }

    if (toAdd.length === 0) return;

    const currentCount = files.length;
    const available = MAX_FILES - currentCount;

    if (available <= 0) {
      const names = toAdd.map(e => e.file.name).slice(0, 3).join(", ")
        + (toAdd.length > 3 ? ` +${toAdd.length - 3}` : "");
      setErrorMsg(t("errors.files_skipped", { files: names }));
      return;
    }

    const accepted = toAdd.slice(0, available);
    const skipped  = toAdd.slice(available);

    if (skipped.length > 0) {
      const names = skipped.map(e => e.file.name).slice(0, 3).join(", ")
        + (skipped.length > 3 ? ` +${skipped.length - 3}` : "");
      setErrorMsg(t("errors.files_skipped", { files: names }));
    }

    const totalBytes = [...files, ...accepted].reduce((s, e) => s + e.file.size, 0);
    if (totalBytes > 200 * 1024 * 1024) {
      setErrorMsg(t("errors.total_too_large"));
      return;
    }

    setFiles(prev => [...prev, ...accepted]);
  }

  // ── addFiles: runs intent check first ───────────────────────────────────
  function addFiles(incoming: File[]) {
    const relevant = incoming.filter(
      f => !f.name.startsWith(".") && f.name !== "Thumbs.db" && f.size > 0,
    );
    if (relevant.length === 0) return;

    const intent = detectFolderIntent(relevant);
    if (intent.intent !== "normal") {
      setPendingRawFiles(relevant);
      setFolderIntent(intent);
      return;
    }
    processAddFiles(relevant);
  }

  function handleFolderWarningContinue() {
    const pending = pendingRawFiles;
    setPendingRawFiles(null);
    setFolderIntent(null);
    if (pending) processAddFiles(pending);
  }

  function handleFolderWarningCancel() {
    setPendingRawFiles(null);
    setFolderIntent(null);
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(e => e.id !== id));
    setErrorMsg(null);
  }

  function clearAll() {
    setFiles([]);
    setErrorMsg(null);
    setHasProcessed(false);
    setShowDropzone(true);
    setShowErrors(true);
  }

  // ── Input handlers ───────────────────────────────────────────────────────
  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) addFiles(picked);
    e.target.value = "";
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const extracted = await extractFromDataTransfer(e.dataTransfer.items);
    if (extracted.length > 0) addFiles(extracted);
    else {
      const plain = Array.from(e.dataTransfer.files);
      if (plain.length) addFiles(plain);
    }
  }

  // ── Error label ──────────────────────────────────────────────────────────
  function errorLabel(err: Error): string {
    if (err instanceof UploadError) {
      const code = err.code;
      if (code === "apple_ecg") return t("errors.apple_ecg");
      if (
        code === "empty_file" || code === "too_large" || code === "unknown_zip" ||
        code === "unsupported_format" || code === "heic_unsupported" ||
        code === "low_confidence" || code === "server_error"
      ) return t(`errors.${code}`);
    }
    if (err instanceof WhoopParseError || err instanceof AppleHealthParseError) {
      return err.message;
    }
    return err.message;
  }

  // ── Result description ───────────────────────────────────────────────────
  function resultDescription(entry: FileEntry): string {
    const r = entry.result;
    if (!r) return "";
    const { source, days_covered, metrics } = r;
    if (source === "whoop") return t("review.result_whoop", { days: days_covered });
    if (source === "apple_health") return t("review.result_apple", { days: days_covered });
    if (source === "gpx") return t("review.result_gpx", { days: days_covered });
    if (metrics.body?.body_fat_pct != null || metrics.body?.skeletal_muscle_kg != null)
      return t("review.result_body_comp");
    if (metrics.sleep?.avg_duration_hours != null) return t("review.result_sleep");
    if (metrics.body?.last_weight_kg != null) return t("review.result_weight");
    return t("review.result_generic");
  }

  // ── Batch processing ─────────────────────────────────────────────────────
  async function processFiles() {
    const queuedEntries = files.filter(e => e.status === "queued");
    if (queuedEntries.length === 0) return;

    const batchErr = validateBatch(queuedEntries.map(e => e.file));
    if (batchErr === "too_many_files") { setErrorMsg(t("errors.too_many_files")); return; }
    if (batchErr === "total_too_large") { setErrorMsg(t("errors.total_too_large")); return; }

    setErrorMsg(null);
    setProcessing(true);
    setOverallProgress(5);
    setDoneCount(0);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const queuedIds = queuedEntries.map(e => e.id);
    const total = queuedEntries.length;
    let finished = 0;

    const batchResults: BatchFileResult[] = await batchDispatch(
      queuedEntries.map(e => e.file),
      {
        signal,
        onFileStart: (idx) => {
          setCurrentFileLabel(queuedEntries[idx]?.file.name ?? "");
          const id = queuedIds[idx];
          setFiles(prev => prev.map(e => e.id === id ? { ...e, status: "processing" } : e));
        },
        onFileProgress: (_, pct) => {
          const base = (finished / total) * 80;
          const slice = (1 / total) * 80;
          setOverallProgress(5 + base + slice * (pct / 100));
        },
        onFileDone: (idx, result) => {
          finished++;
          setDoneCount(finished);
          setOverallProgress(5 + (finished / total) * 80);
          const id = queuedIds[idx];
          setFiles(prev => prev.map(e => e.id === id ? { ...e, status: "done", result } : e));
        },
        onFileError: (idx, err) => {
          finished++;
          setDoneCount(finished);
          const id = queuedIds[idx];
          setFiles(prev =>
            prev.map(e =>
              e.id === id ? { ...e, status: "error", errorMsg: errorLabel(err) } : e,
            ),
          );
        },
      },
    );

    if (signal.aborted) { setProcessing(false); return; }

    // Attach groupId so handleContinue can deduplicate WHOOP/GPX groups.
    setFiles(prev => prev.map(e => {
      const idx = queuedIds.indexOf(e.id);
      if (idx === -1) return e;
      const br = batchResults[idx];
      return br?.groupId ? { ...e, groupId: br.groupId } : e;
    }));

    setProcessing(false);
    setHasProcessed(true);
    setShowDropzone(false);
    setShowErrors(false); // errors section starts collapsed
  }

  // ── Continue: persist + navigate ─────────────────────────────────────────
  async function handleContinue() {
    const successEntries = files.filter(e => e.status === "done" && e.result);

    if (successEntries.length === 0) {
      goToAnalyse();
      return;
    }

    setIsContinuing(true);
    setErrorMsg(null);

    const seen = new Set<string>();
    const uniqueSuccesses = successEntries.filter(e => {
      if (!e.groupId) return true;
      if (seen.has(e.groupId)) return false;
      seen.add(e.groupId);
      return true;
    });

    const successResults = uniqueSuccesses.map(e => e.result!);
    const successNames   = uniqueSuccesses.map(e => e.file.name);

    let persistPayload: Record<string, unknown>;

    if (successResults.length === 1) {
      persistPayload = { ...successResults[0] };
    } else {
      const merged = mergeWearableResults({ results: successResults, fileNames: successNames });
      const latestEnd     = successResults.map(r => r.window_end).sort().at(-1)  ?? new Date().toISOString().slice(0, 10);
      const earliestStart = successResults.map(r => r.window_start).sort().at(0) ?? latestEnd;
      const maxDays       = Math.max(...successResults.map(r => r.days_covered));
      const totalBytes    = uniqueSuccesses.reduce((s, e) => s + e.file.size, 0);
      const allWarnings   = successResults.flatMap(r => r.parse_warnings);
      void (([...new Set(successResults.map((r) => r.source))] as WearableSource[]));

      persistPayload = {
        source: "merged",
        schema_version: "1.0",
        window_start: earliestStart,
        window_end:   latestEnd,
        days_covered: maxDays,
        metrics:      merged,
        file_size_bytes:    totalBytes,
        parse_duration_ms:  0,
        parse_warnings:     allWarnings,
        total_files_count:  successResults.length,
        source_files:       merged.sources_used,
        merge_provenance:   merged.field_provenance,
      };
    }

    try {
      const persistRes = await fetch("/api/wearable/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(persistPayload),
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

      const metricsToStore = successResults.length === 1
        ? successResults[0].metrics
        : mergeWearableResults({ results: successResults, fileNames: successNames });

      try {
        sessionStorage.setItem("btb_wearable", JSON.stringify({
          uploadId:     persistJson.uploadId,
          source:       persistPayload.source,
          days_covered: persistPayload.days_covered,
          metrics:      metricsToStore,
        }));
      } catch { /**/ }

      goToAnalyse(persistJson.uploadId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("errors.unknown"));
      setIsContinuing(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setProcessing(false);
    setOverallProgress(0);
    setFiles(prev =>
      prev.map(e =>
        e.status === "processing" || e.status === "queued"
          ? { ...e, status: "queued" }
          : e,
      ),
    );
  }

  // ── Type badge ────────────────────────────────────────────────────────────
  function typeBadge(type: DetectedType) {
    const labelMap: Record<DetectedType, string> = {
      whoop_csv: t("file_list.type_whoop"),
      whoop_zip: t("file_list.type_whoop"),
      apple_zip: t("file_list.type_apple"),
      gpx:       "GPX",
      ai_doc:    t("file_list.type_scan"),
      unknown:   t("file_list.type_unknown"),
    };
    return (
      <span className={`${styles.typeBadge} ${styles[`typeBadge_${type}`]}`}>
        {labelMap[type]}
      </span>
    );
  }

  if (!paymentChecked) return null;

  const hasFiles     = files.length > 0;
  const totalFiles   = files.length;
  const queuedCount  = files.filter(e => e.status === "queued").length;
  const successCount = files.filter(e => e.status === "done").length;
  const errorCount   = files.filter(e => e.status === "error").length;
  const allFailed    = hasProcessed && successCount === 0;

  // Sort: done first, then queued/processing, then error
  const sortedFiles = [...files].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );

  // Quality assessment from current successful results
  const successResults = files
    .filter(e => e.status === "done" && e.result)
    .map(e => e.result!);
  const quality = assessDataQuality(successResults, totalFiles);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.label}>{t("label")}</div>
        <h1 className={styles.headline}>{t("headline")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>

        <div className={styles.privacyBanner}>
          <svg
            className={styles.shieldIcon}
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
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
            <div className={styles.fileListHeader}>
              <span className={styles.fileListTitle}>
                {t("file_list.header")} ({totalFiles})
              </span>
              {!processing && (
                <button className={styles.clearAllBtn} onClick={clearAll}>
                  {t("file_list.clear_all")}
                </button>
              )}
            </div>

            {/* Successful + queued/processing files */}
            {sortedFiles
              .filter(e => e.status !== "error")
              .map(entry => (
                <div
                  key={entry.id}
                  className={`${styles.fileItem} ${entry.status === "done" ? styles.fileItem_done : ""}`}
                >
                  <span className={styles.fileIconEmoji} aria-hidden>
                    {fileIcon(entry.file)}
                  </span>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{entry.file.name}</span>
                    <div className={styles.fileMeta}>
                      <span>{formatBytes(entry.file.size)}</span>
                      {typeBadge(entry.detectedType)}
                    </div>
                    {entry.status === "done" && entry.result && (
                      <span className={styles.resultDesc}>{resultDescription(entry)}</span>
                    )}
                  </div>
                  <span className={`${styles.fileStatus} ${styles[`fileStatus_${entry.status}`]}`}>
                    {entry.status === "processing" && <span className={styles.spinner} aria-hidden />}
                    {entry.status === "done"  && "✓"}
                    {entry.status === "queued" && <span className={styles.queueDot} />}
                  </span>
                  {!processing && (
                    <button
                      className={styles.fileRemove}
                      onClick={() => removeFile(entry.id)}
                      aria-label={t("multi.remove")}
                    >×</button>
                  )}
                </div>
              ))}

            {/* Collapsible error section */}
            {errorCount > 0 && (
              <div className={styles.errorSection}>
                <button
                  className={styles.errorSectionToggle}
                  onClick={() => setShowErrors(v => !v)}
                >
                  <span>{t("review.errors_section", { count: errorCount })}</span>
                  <span className={styles.errorToggleArrow}>
                    {showErrors ? t("review.errors_hide") : t("review.errors_show")}
                  </span>
                </button>

                {showErrors && sortedFiles
                  .filter(e => e.status === "error")
                  .map(entry => (
                    <div
                      key={entry.id}
                      className={`${styles.fileItem} ${styles.fileItem_error}`}
                    >
                      <span className={styles.fileIconEmoji} aria-hidden>
                        {fileIcon(entry.file)}
                      </span>
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>{entry.file.name}</span>
                        <div className={styles.fileMeta}>
                          <span>{formatBytes(entry.file.size)}</span>
                          {typeBadge(entry.detectedType)}
                        </div>
                        {entry.errorMsg && (
                          <span className={styles.fileError}>{entry.errorMsg}</span>
                        )}
                      </div>
                      <span className={`${styles.fileStatus} ${styles.fileStatus_error}`}>✕</span>
                      {!processing && (
                        <button
                          className={styles.fileRemove}
                          onClick={() => removeFile(entry.id)}
                          aria-label={t("multi.remove")}
                        >×</button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── Drop zone ─────────────────────────────────────── */}
        {showDropzone && (
          <div
            className={`${styles.uploadZone} ${dragActive ? styles.uploadZoneActive : ""}`}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <svg
              className={styles.uploadIcon}
              width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden
            >
              <path d="M20 28V12M12 20l8-8 8 8" stroke="#E63222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="6" y="30" width="28" height="4" rx="1" stroke="#E63222" strokeWidth="1.5" />
            </svg>

            <div className={styles.uploadLabel}>{t("dropzone.title")}</div>
            <div className={styles.uploadHint}>{t("dropzone.subtitle")}</div>

            {!hasFiles && (
              <>
                <div className={styles.uploadSupports}>{t("dropzone.supports")}</div>
                <div className={styles.uploadMeta}>{t("dropzone.max_size")}</div>
              </>
            )}

            <div className={styles.uploadBtnRow}>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                {t("dropzone.btn_select")}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className={styles.uploadInput}
              onChange={handleFilesChange}
            />
          </div>
        )}

        {/* ── Process CTA ───────────────────────────────────── */}
        {queuedCount > 0 && !processing && (
          <button className={styles.processBtn} onClick={processFiles}>
            {queuedCount === 1
              ? t("multi.process_btn_one")
              : t("multi.process_btn_other", { count: queuedCount })}
          </button>
        )}

        {/* ── Review panel ──────────────────────────────────── */}
        {hasProcessed && !processing && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewHeader}>
              <span className={styles.reviewTitle}>{t("review.title")}</span>
              <span className={`${styles.reviewSummary} ${allFailed ? styles.reviewSummaryFailed : ""}`}>
                {t("review.summary", { success: successCount, total: totalFiles })}
              </span>
            </div>

            {/* Data quality badge */}
            <DataQualityBadge quality={quality} />

            {allFailed && (
              <div className={styles.allFailedWarning}>
                {t("review.all_failed_warning")}
              </div>
            )}

            <button
              className={styles.continueBtn}
              onClick={handleContinue}
              disabled={isContinuing}
            >
              {isContinuing && <span className={styles.spinner} aria-hidden />}
              {t("review.continue_btn")}
            </button>

            {!showDropzone && (
              <button
                className={styles.addMoreLink}
                onClick={() => setShowDropzone(true)}
              >
                {t("review.add_more")}
              </button>
            )}
          </div>
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
                <br />{t("overlay.title_batch_2")}
              </div>
            ) : (
              <div className={styles.overlayTitle}>
                {t("overlay.title_1")}<br />{t("overlay.title_2")}
              </div>
            )}
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${overallProgress}%` }} />
            </div>
            <div className={styles.progressText}>
              {Math.floor(overallProgress)}%
              {currentFileLabel && ` · ${currentFileLabel}`}
            </div>
            {totalFiles > 1 && (
              <div className={styles.overlayBatchFiles}>
                {files.map(e => (
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

      {/* ── Folder-intent warning modal ───────────────────── */}
      {folderIntent && folderIntent.intent !== "normal" && (
        <FolderIntentWarning
          intent={folderIntent}
          onContinue={handleFolderWarningContinue}
          onCancel={handleFolderWarningCancel}
        />
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
