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
  MAX_FILES,
  MAX_ZIP_BYTES,
  MAX_AI_BYTES,
  type BatchFileResult,
} from "@/lib/wearable/upload/batch";
import { mergeWearableResults } from "@/lib/wearable/aggregation/merge";
import type { WearableParseResult, WearableSource } from "@/lib/wearable/types";

// ── Types ──────────────────────────────────────────────────────────────────

type FileEntryStatus = "queued" | "processing" | "done" | "error";
type DetectedType = "whoop_csv" | "whoop_zip" | "apple_zip" | "ai_doc" | "unknown";

interface FileEntry {
  id: string;
  file: File;
  status: FileEntryStatus;
  detectedType: DetectedType;
  result?: WearableParseResult;
  errorMsg?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function detectType(file: File): DetectedType {
  const lower = file.name.toLowerCase();
  if (isWhoopCsv(file)) return "whoop_csv";
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
  if (lower.match(/\.(jpe?g|png|webp|gif)$/)) return "🖼";
  if (lower.match(/\.(csv|txt)$/)) return "📊";
  return "📎";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Recursively collect all File objects from a drag-drop DataTransferItemList,
// including files inside dropped folders.
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
      // readEntries may return results in batches — keep reading until empty.
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef     = useRef<AbortController | null>(null);

  // webkitdirectory is non-standard — set imperatively after mount.
  // With this attribute the native dialog allows both individual file
  // selection (cmd+click) and full folder selection in Chrome/Safari/Edge.
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

  // ── File queue management ───────────────────────────────────────────────
  function addFiles(incoming: File[]) {
    setErrorMsg(null);
    const toAdd: FileEntry[] = [];

    for (const f of incoming) {
      // Skip hidden/system files from folder drops
      if (f.name.startsWith(".") || f.name === "Thumbs.db") continue;

      const lower = f.name.toLowerCase();
      const zipFile = f.type === "application/zip" || lower.endsWith(".zip");
      const maxBytes = zipFile ? MAX_ZIP_BYTES : MAX_AI_BYTES;

      if (f.size === 0) continue; // skip empty files silently

      if (f.size > maxBytes) {
        setErrorMsg(zipFile
          ? `"${f.name}" ist zu groß (max. ${formatBytes(maxBytes)} pro ZIP).`
          : t("errors.too_large"));
        continue;
      }

      toAdd.push({ id: newId(), file: f, status: "queued", detectedType: detectType(f) });
    }

    if (toAdd.length === 0) return;

    setFiles((prev) => {
      const combined = [...prev, ...toAdd];
      if (combined.length > MAX_FILES) {
        setErrorMsg(t("errors.too_many_files"));
        return prev.concat(toAdd.slice(0, MAX_FILES - prev.length));
      }
      const totalBytes = combined.reduce((s, e) => s + e.file.size, 0);
      if (totalBytes > 200 * 1024 * 1024) {
        setErrorMsg(t("errors.total_too_large"));
        return prev; // reject entire batch if it blows the total
      }
      return combined;
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((e) => e.id !== id));
    setErrorMsg(null);
  }

  function clearAll() {
    setFiles([]);
    setErrorMsg(null);
  }

  // ── Input handlers ───────────────────────────────────────────────────────
  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) addFiles(picked);
    e.target.value = ""; // reset so same files can be re-added after removal
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const extracted = await extractFromDataTransfer(e.dataTransfer.items);
    if (extracted.length > 0) addFiles(extracted);
    else {
      // Fallback for browsers that don't support webkitGetAsEntry
      const plain = Array.from(e.dataTransfer.files);
      if (plain.length) addFiles(plain);
    }
  }

  // ── Error label helper ───────────────────────────────────────────────────
  function errorLabel(err: Error): string {
    if (err instanceof UploadError) {
      const code = err.code;
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

  // ── Batch processing ─────────────────────────────────────────────────────
  async function processFiles() {
    const batchErr = validateBatch(files.map((e) => e.file));
    if (batchErr === "too_many_files") { setErrorMsg(t("errors.too_many_files")); return; }
    if (batchErr === "total_too_large") { setErrorMsg(t("errors.total_too_large")); return; }

    setErrorMsg(null);
    setProcessing(true);
    setOverallProgress(5);
    setDoneCount(0);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // Reset statuses to queued
    setFiles((prev) => prev.map((e) => ({ ...e, status: "queued" as FileEntryStatus })));

    let finished = 0;
    const total = files.length;
    // Snapshot file IDs so index→id mapping doesn't drift during processing
    const fileIds = files.map((e) => e.id);

    const batchResults: BatchFileResult[] = await batchDispatch(
      files.map((e) => e.file),
      {
        signal,
        onFileStart: (idx) => {
          setCurrentFileLabel(files[idx]?.file.name ?? "");
          const id = fileIds[idx];
          setFiles((prev) =>
            prev.map((e) => e.id === id ? { ...e, status: "processing" } : e),
          );
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
          const id = fileIds[idx];
          setFiles((prev) =>
            prev.map((e) => e.id === id ? { ...e, status: "done", result } : e),
          );
        },
        onFileError: (idx, err) => {
          finished++;
          setDoneCount(finished);
          const id = fileIds[idx];
          setFiles((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, status: "error", errorMsg: errorLabel(err) } : e,
            ),
          );
        },
      },
    );

    if (signal.aborted) {
      setProcessing(false);
      return;
    }

    // Deduplicate grouped WHOOP CSV results (all files in the group share the same result).
    const seen = new Set<string>();
    const uniqueSuccesses = batchResults.filter((r) => {
      if (!r.result) return false;
      if (!r.groupId) return true;
      if (seen.has(r.groupId)) return false;
      seen.add(r.groupId);
      return true;
    });

    if (uniqueSuccesses.length === 0) {
      setErrorMsg(t("errors.all_failed"));
      setProcessing(false);
      return;
    }

    setOverallProgress(88);
    setCurrentFileLabel(t("parsing.saving"));

    const successResults = uniqueSuccesses.map((r) => r.result!);
    const successNames   = uniqueSuccesses.map((r) => r.file.name);

    let persistPayload: Record<string, unknown>;

    if (successResults.length === 1) {
      persistPayload = { ...successResults[0] };
    } else {
      const merged = mergeWearableResults({ results: successResults, fileNames: successNames });
      const latestEnd     = successResults.map((r) => r.window_end).sort().at(-1)  ?? new Date().toISOString().slice(0, 10);
      const earliestStart = successResults.map((r) => r.window_start).sort().at(0) ?? latestEnd;
      const maxDays       = Math.max(...successResults.map((r) => r.days_covered));
      const totalBytes    = uniqueSuccesses.reduce((s, r) => s + r.file.size, 0);
      const allWarnings   = successResults.flatMap((r) => r.parse_warnings);
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

      const metricsToStore = successResults.length === 1
        ? successResults[0].metrics
        : mergeWearableResults({ results: successResults, fileNames: successNames });

      try {
        sessionStorage.setItem("btb_wearable", JSON.stringify({
          uploadId:    persistJson.uploadId,
          source:      persistPayload.source,
          days_covered: persistPayload.days_covered,
          metrics:     metricsToStore,
        }));
      } catch { /**/ }

      goToAnalyse(persistJson.uploadId);
    } catch (err) {
      if (signal.aborted) { setProcessing(false); return; }
      setErrorMsg(err instanceof Error ? err.message : t("errors.unknown"));
      setProcessing(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setProcessing(false);
    setOverallProgress(0);
    setFiles((prev) =>
      prev.map((e) =>
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

  const hasFiles  = files.length > 0;
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

            {files.map((entry) => (
              <div key={entry.id} className={styles.fileItem}>
                <span className={styles.fileIconEmoji} aria-hidden>
                  {fileIcon(entry.file)}
                </span>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{entry.file.name}</span>
                  <div className={styles.fileMeta}>
                    <span>{formatBytes(entry.file.size)}</span>
                    {typeBadge(entry.detectedType)}
                  </div>
                  {entry.status === "error" && entry.errorMsg && (
                    <span className={styles.fileError}>{entry.errorMsg}</span>
                  )}
                </div>
                <span className={`${styles.fileStatus} ${styles[`fileStatus_${entry.status}`]}`}>
                  {entry.status === "processing" && <span className={styles.spinner} aria-hidden />}
                  {entry.status === "done"  && "✓"}
                  {entry.status === "error" && "✕"}
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
          </div>
        )}

        {/* ── Drop zone ─────────────────────────────────────── */}
        <div
          className={`${styles.uploadZone} ${dragActive ? styles.uploadZoneActive : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
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

          <div className={styles.uploadLabel}>
            {t("dropzone.title")}
          </div>
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
