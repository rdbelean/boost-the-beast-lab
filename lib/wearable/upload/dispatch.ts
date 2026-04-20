// Single client-side entry point for the unified upload flow.
//
// Routes a user-supplied file to the right parser:
//   • ZIP from Apple Health → parseAppleHealthZip (Web Worker, 1–2 GB capable)
//   • ZIP from WHOOP        → parseWhoopZip (main thread, small files)
//   • PDF / image / text    → POST /api/wearable/parse-document (Claude)
//
// Each branch returns the same WearableParseResult shape so the UI doesn't
// have to branch further. The server AI path is only hit for files under
// 15 MB; larger files that aren't WHOOP or Apple ZIPs fail fast with a
// helpful error code the UI can surface.

import JSZip from "jszip";
import { parseWhoopZip, WhoopParseError } from "@/lib/wearable/whoop/parser";
import {
  parseAppleHealthZip,
  AppleHealthParseError,
} from "@/lib/wearable/apple/parser";
import { parseGpxFiles } from "@/lib/wearable/gpx/parser";
import { isAppleHealthEcgCsv } from "@/lib/wearable/detection/apple-ecg";
import type { WearableParseResult } from "@/lib/wearable/types";

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "empty_file"
      | "too_large"
      | "unsupported_format"
      | "unknown_zip"
      | "heic_unsupported"
      | "low_confidence"
      | "apple_ecg"
      | "server_error",
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export interface DispatchOptions {
  signal?: AbortSignal;
  onPhase?: (phase: "reading" | "streaming" | "analyzing") => void;
  onProgress?: (pct: number) => void;
}

const AI_MAX_BYTES = 15 * 1024 * 1024; // 15 MB

type ZipKind = "apple" | "whoop" | "unknown";

/**
 * Peek at a ZIP's entry list without fully extracting. JSZip reads the
 * central directory only (O(KB)), so this works even on a 2 GB Apple
 * Health export without running out of memory.
 */
async function peekZipKind(file: File): Promise<ZipKind> {
  try {
    const zip = await JSZip.loadAsync(file);
    const names = Object.keys(zip.files);
    // Apple signature: top-level "apple_health_export/" directory holding
    // export.xml. We check for the filename fragment since the root may
    // differ across iOS versions.
    const hasApple = names.some((n) => n.toLowerCase().endsWith("export.xml"));
    if (hasApple) return "apple";
    // WHOOP signature (post-April-2026 format): physiological_cycles.csv
    // is the primary file. Older exports also have sleeps.csv + workouts.csv.
    const hasWhoop = names.some((n) =>
      /physiological_cycles\.csv$/i.test(n) || /^sleeps\.csv$/i.test(n),
    );
    if (hasWhoop) return "whoop";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Route any user-selected file to the right parser. Throws UploadError
 * with a typed code on failure so the UI can localize and show guidance.
 */
export async function dispatchAnyFile(
  file: File,
  opts: DispatchOptions = {},
): Promise<WearableParseResult> {
  if (file.size === 0) {
    throw new UploadError("File is empty", "empty_file");
  }

  const lower = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  const isZip = mime === "application/zip" || lower.endsWith(".zip");

  // GPX → parse directly in the browser (no AI needed).
  if (lower.endsWith(".gpx")) {
    return parseGpxFiles([file]);
  }

  // ZIP → detect and delegate to the appropriate browser parser.
  if (isZip) {
    opts.onPhase?.("reading");
    const kind = await peekZipKind(file);
    if (kind === "apple") {
      opts.onPhase?.("streaming");
      return parseAppleHealthZip(file, {
        signal: opts.signal,
        onProgress: opts.onProgress,
      });
    }
    if (kind === "whoop") {
      opts.onPhase?.("reading");
      return parseWhoopZip(file);
    }
    throw new UploadError(
      "ZIP archive is not a WHOOP or Apple Health export",
      "unknown_zip",
    );
  }

  // Server AI route — hard size cap.
  if (file.size > AI_MAX_BYTES) {
    throw new UploadError("File exceeds 15 MB limit", "too_large");
  }

  // HEIC catch — the server rejects these with a clear code too, but
  // catching it here saves a roundtrip.
  if (
    mime === "image/heic" ||
    mime === "image/heif" ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif")
  ) {
    throw new UploadError(
      "HEIC/HEIF images are not supported; export as JPG or PNG",
      "heic_unsupported",
    );
  }

  // Apple Health ECG CSVs contain raw 500 Hz voltage samples — not health metrics.
  if ((lower.endsWith(".csv") || lower.endsWith(".txt")) && await isAppleHealthEcgCsv(file)) {
    throw new UploadError(
      "Apple Health ECG raw data — not useful for health metrics",
      "apple_ecg",
    );
  }

  opts.onPhase?.("analyzing");
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/wearable/parse-document", {
    method: "POST",
    body: form,
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      hint?: string;
    } | null;
    const code = body?.error ?? "server_error";
    // Map known server codes to UploadError codes.
    if (code === "too_large") throw new UploadError("File too large", "too_large");
    if (code === "unsupported_type") {
      throw new UploadError(
        "Unsupported file type",
        body?.hint === "heic_unsupported" ? "heic_unsupported" : "unsupported_format",
      );
    }
    throw new UploadError(`Server error: ${code}`, "server_error");
  }

  const result = (await res.json()) as WearableParseResult;

  // Low-confidence extractions are surfaced as UploadError so the UI can
  // ask the user to confirm or retry with a clearer document.
  const lowConfWarning = result.parse_warnings.find(
    (w) => w.code === "low_confidence",
  );
  if (lowConfWarning) {
    throw new UploadError(lowConfWarning.message, "low_confidence");
  }

  // Re-throw UploadError on parse errors from the helpers so the UI has
  // one uniform error surface. The parseWhoopZip and parseAppleHealthZip
  // already throw their own typed errors which we catch downstream.
  return result;
}

// Re-export so /analyse/prepare can check instanceof without importing both.
export { WhoopParseError, AppleHealthParseError };
