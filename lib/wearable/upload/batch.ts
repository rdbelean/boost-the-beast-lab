// Processes a list of files through the wearable dispatch pipeline in
// parallel, with a per-AI-request concurrency cap of 3.
//
// Special case: loose WHOOP CSV files (physiological_cycles.csv, sleeps.csv,
// workouts.csv, journal.csv) are detected and grouped automatically — they are
// parsed as a single WHOOP export via parseWhoopCsvFiles, not individually.
//
// All results are indexed by the original file position in the input array.
// Files that belong to a WHOOP CSV group share the same WearableParseResult
// and carry the same groupId so callers can deduplicate.

import {
  dispatchAnyFile,
  UploadError,
  WhoopParseError,
  AppleHealthParseError,
} from "./dispatch";
import { parseWhoopCsvFiles } from "../whoop/parser";
import type { WearableParseResult } from "../types";

export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_ZIP_BYTES = 50 * 1024 * 1024;    // 50 MB per ZIP
export const MAX_AI_BYTES = 15 * 1024 * 1024;     // 15 MB per AI doc
const AI_CONCURRENCY = 3;

// Canonical WHOOP CSV file names (case-insensitive match).
const WHOOP_CSV_NAMES = new Set([
  "physiological_cycles.csv",
  "sleeps.csv",
  "workouts.csv",
  "journal.csv",
]);

export function isWhoopCsv(file: File): boolean {
  return WHOOP_CSV_NAMES.has(file.name.toLowerCase());
}

export type BatchFileStatus = "queued" | "processing" | "done" | "error";

export interface BatchFileResult {
  file: File;
  result: WearableParseResult | null;
  error: UploadError | WhoopParseError | AppleHealthParseError | Error | null;
  /** Set for all files that were processed together as a WHOOP CSV group. */
  groupId?: string;
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
  if (files.length > MAX_FILES) return "too_many_files";
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return "total_too_large";
  return null;
}

const WHOOP_CSV_GROUP_ID = "whoop_csvs";

export async function batchDispatch(
  files: File[],
  opts: BatchOptions = {},
): Promise<BatchFileResult[]> {
  const { signal, onFileStart, onFilePhase, onFileProgress, onFileDone, onFileError } = opts;
  const aiSem = new Semaphore(AI_CONCURRENCY);

  // Partition files: WHOOP CSVs get grouped; everything else is dispatched individually.
  const whoopIndices: number[] = [];
  const otherIndices: number[] = [];
  files.forEach((f, i) => {
    if (isWhoopCsv(f)) whoopIndices.push(i);
    else otherIndices.push(i);
  });

  const results: BatchFileResult[] = new Array(files.length).fill(null);
  const tasks: Array<() => Promise<void>> = [];

  // ── WHOOP CSV group ────────────────────────────────────────────────────────
  if (whoopIndices.length > 0) {
    tasks.push(async () => {
      if (signal?.aborted) {
        whoopIndices.forEach((idx) => {
          results[idx] = { file: files[idx], result: null, error: new Error("aborted"), groupId: WHOOP_CSV_GROUP_ID };
        });
        return;
      }
      whoopIndices.forEach((idx) => onFileStart?.(idx));
      try {
        const whoopFiles = whoopIndices.map((i) => files[i]);
        const result = await parseWhoopCsvFiles(whoopFiles);
        whoopIndices.forEach((idx) => {
          results[idx] = { file: files[idx], result, error: null, groupId: WHOOP_CSV_GROUP_ID };
          onFileDone?.(idx, result);
        });
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        whoopIndices.forEach((idx) => {
          results[idx] = { file: files[idx], result: null, error: e, groupId: WHOOP_CSV_GROUP_ID };
          onFileError?.(idx, e);
        });
      }
    });
  }

  // ── Individual files ───────────────────────────────────────────────────────
  for (const idx of otherIndices) {
    const file = files[idx];
    tasks.push(async () => {
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
    });
  }

  await Promise.all(tasks.map((t) => t()));
  return results;
}
