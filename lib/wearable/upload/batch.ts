// Processes a list of files through the wearable dispatch pipeline in
// parallel, with a per-AI-request concurrency cap of 3.
//
// ZIP files (WHOOP, Apple Health) run in the browser and are not counted
// against the AI concurrency limit. Non-ZIP files ≤ 15 MB go to the
// Claude API via /api/wearable/parse-document.

import {
  dispatchAnyFile,
  UploadError,
  WhoopParseError,
  AppleHealthParseError,
} from "./dispatch";
import type { WearableParseResult } from "../types";

export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_ZIP_BYTES = 50 * 1024 * 1024;   // 50 MB per ZIP
export const MAX_AI_BYTES = 15 * 1024 * 1024;    // 15 MB per AI doc
const AI_CONCURRENCY = 3;

export type BatchFileStatus = "queued" | "processing" | "done" | "error";

export interface BatchFileResult {
  file: File;
  result: WearableParseResult | null;
  error: UploadError | WhoopParseError | AppleHealthParseError | Error | null;
}

export interface BatchOptions {
  signal?: AbortSignal;
  onFileStart?: (index: number) => void;
  onFilePhase?: (index: number, phase: "reading" | "streaming" | "analyzing") => void;
  onFileProgress?: (index: number, pct: number) => void;
  onFileDone?: (index: number, result: WearableParseResult) => void;
  onFileError?: (index: number, err: Error) => void;
}

function isZip(file: File): boolean {
  return (
    file.type === "application/zip" ||
    file.name.toLowerCase().endsWith(".zip")
  );
}

class Semaphore {
  private slots: number;
  private queue: Array<() => void> = [];
  constructor(slots: number) { this.slots = slots; }
  acquire(): Promise<void> {
    if (this.slots > 0) { this.slots--; return Promise.resolve(); }
    return new Promise((resolve) => this.queue.push(resolve));
  }
  release(): void {
    const next = this.queue.shift();
    if (next) { next(); } else { this.slots++; }
  }
}

export function validateBatch(files: File[]): string | null {
  if (files.length === 0) return null;
  if (files.length > MAX_FILES) return `too_many_files`;
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return `total_too_large`;
  return null;
}

export async function batchDispatch(
  files: File[],
  opts: BatchOptions = {},
): Promise<BatchFileResult[]> {
  const { signal, onFileStart, onFilePhase, onFileProgress, onFileDone, onFileError } = opts;
  const aiSem = new Semaphore(AI_CONCURRENCY);
  const results: BatchFileResult[] = new Array(files.length).fill(null);

  const tasks = files.map((file, idx) =>
    async () => {
      if (signal?.aborted) {
        results[idx] = { file, result: null, error: new Error("aborted") };
        return;
      }
      onFileStart?.(idx);
      const needsSem = !isZip(file);
      if (needsSem) await aiSem.acquire();
      try {
        const result = await dispatchAnyFile(file, {
          signal,
          onPhase: (phase) => onFilePhase?.(idx, phase),
          onProgress: (pct) => onFileProgress?.(idx, pct),
        });
        results[idx] = { file, result, error: null };
        onFileDone?.(idx, result);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        results[idx] = { file, result: null, error: e };
        onFileError?.(idx, e);
      } finally {
        if (needsSem) aiSem.release();
      }
    },
  );

  // Run all tasks in parallel (AI concurrency is throttled by the semaphore).
  await Promise.all(tasks.map((t) => t()));

  return results;
}
