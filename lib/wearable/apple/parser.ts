// Main-thread wrapper around the Apple Health Web Worker. Spawns the worker,
// posts the File, and resolves a promise with the parsed aggregate.

import type { WearableParseResult } from "../types";

export class AppleHealthParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppleHealthParseError";
  }
}

export interface ParseAppleHealthOptions {
  /** Progress callback, fires ~2×/second while parsing. */
  onProgress?: (pct: number) => void;
  /** Abort signal — if triggered, the worker tears down and the promise rejects. */
  signal?: AbortSignal;
}

export async function parseAppleHealthZip(
  file: File,
  options: ParseAppleHealthOptions = {},
): Promise<WearableParseResult> {
  return new Promise<WearableParseResult>((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/appleHealthParser.worker.ts", import.meta.url),
      { type: "module" },
    );

    const cleanup = () => {
      worker.terminate();
      if (options.signal) {
        options.signal.removeEventListener("abort", onAbort);
      }
    };

    const onAbort = () => {
      worker.postMessage({ type: "abort" });
      cleanup();
      reject(new AppleHealthParseError("Parse abgebrochen.", "aborted"));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        cleanup();
        reject(new AppleHealthParseError("Parse abgebrochen.", "aborted"));
        return;
      }
      options.signal.addEventListener("abort", onAbort);
    }

    worker.addEventListener("message", (e: MessageEvent) => {
      const msg = e.data as
        | { type: "progress"; bytesProcessed: number; totalBytes: number }
        | { type: "done"; result: WearableParseResult }
        | { type: "error"; code: string; message: string };

      if (msg.type === "progress" && options.onProgress) {
        const pct =
          msg.totalBytes > 0
            ? Math.min(95, Math.round((msg.bytesProcessed / msg.totalBytes) * 95))
            : 30;
        options.onProgress(pct);
      } else if (msg.type === "done") {
        cleanup();
        resolve(msg.result);
      } else if (msg.type === "error") {
        cleanup();
        reject(new AppleHealthParseError(msg.message, msg.code));
      }
    });

    worker.addEventListener("error", (e) => {
      cleanup();
      reject(
        new AppleHealthParseError(
          e.message || "Worker-Fehler beim Parsen.",
          "worker_error",
        ),
      );
    });

    worker.postMessage({ type: "parse", file });
  });
}
