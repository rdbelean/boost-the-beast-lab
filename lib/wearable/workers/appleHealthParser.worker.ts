// Apple Health SAX streaming parser — runs in a Web Worker so the 1–2 GB
// export.xml parse doesn't block the main thread or balloon heap.
//
// Contract:
//   Main → Worker: { type: "parse", file: File }
//   Worker → Main: { type: "progress", bytesProcessed: number, totalBytes: number }
//   Worker → Main: { type: "done", result: WearableParseResult }
//   Worker → Main: { type: "error", code: string, message: string }
//   Main → Worker: { type: "abort" }  → worker resolves by stopping the parse

import JSZip from "jszip";
import sax from "sax";
import { APPLE_TYPE_SET, APPLE_ASLEEP_VALUES, APPLE_RECORD_TYPES } from "../apple/recordTypes";
import type {
  ParseWarning,
  WearableMetrics,
  WearableParseResult,
} from "../types";

type Ctx = typeof self & { postMessage: (m: unknown) => void };
const ctx = self as Ctx;

interface RunningStats {
  sum: number;
  count: number;
}
const emptyStats = (): RunningStats => ({ sum: 0, count: 0 });
const mean = (s: RunningStats): number | null =>
  s.count > 0 ? s.sum / s.count : null;
const round = (v: number | null, d: number): number | undefined =>
  v == null ? undefined : Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

let aborted = false;

ctx.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data as { type: string; file?: File };
  if (msg.type === "abort") {
    aborted = true;
    return;
  }
  if (msg.type === "parse" && msg.file) {
    parseAppleHealth(msg.file).catch((err: Error) => {
      ctx.postMessage({
        type: "error",
        code: "parse_failed",
        message: err.message ?? "Unbekannter Fehler",
      });
    });
  }
});

async function parseAppleHealth(file: File) {
  const t0 = performance.now();
  const warnings: ParseWarning[] = [];

  // Window: last 30 days from now.
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Load ZIP (JSZip handles the whole file in memory — unavoidable for ZIPs,
  // but ZIPs are usually 100–500 MB; the 1–2 GB figure is the uncompressed
  // export.xml inside. We stream the INNER file, not the outer ZIP).
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    ctx.postMessage({
      type: "error",
      code: "not_a_zip",
      message: "Die Datei ist keine gültige ZIP. Apple Health exportiert einen 'export.zip'.",
    });
    return;
  }

  // Find export.xml — it's at "apple_health_export/export.xml" or similar.
  let xmlEntry: JSZip.JSZipObject | null = null;
  for (const [name, entry] of Object.entries(zip.files)) {
    if (name.toLowerCase().endsWith("export.xml") && !entry.dir) {
      xmlEntry = entry;
      break;
    }
  }
  if (!xmlEntry) {
    ctx.postMessage({
      type: "error",
      code: "missing_xml",
      message: "export.xml nicht im ZIP gefunden.",
    });
    return;
  }

  // Running aggregators — fixed-size, no record arrays ever.
  const stats = {
    heartRate: emptyStats(),
    restingHeartRate: emptyStats(),
    hrvSdnn: emptyStats(),
    steps: emptyStats(),
    activeKcal: emptyStats(),
    vo2Max: { lastValue: null as number | null, lastDate: 0 },
    bodyMass: { lastValue: null as number | null, lastDate: 0 },
    // Sleep: accumulate per-night asleep minutes, then compute mean duration.
    sleepPerNight: new Map<string, number>(), // date (YYYY-MM-DD) → asleep minutes
    // Any day that had at least one step/HR/HRV sample — used so
    // day-wearers (no sleep tracking) still get a non-zero days_covered.
    activeDays: new Set<string>(),
  };

  // strict=true: Apple Health export.xml is well-formed and we MUST preserve
  // tag casing. In non-strict mode sax uppercases tag names, so <Record>
  // arrives as "RECORD" and all our Record-name checks silently miss every
  // record, producing an empty aggregate.
  const parser = sax.parser(true, {
    lowercase: false,
    trim: true,
    normalize: false,
    xmlns: false,
    position: false,
  });

  let progressBytes = 0;
  let lastProgressPost = 0;
  // Rough estimate: Apple Health export.xml is ~3× the compressed ZIP size.
  const approxXmlBytes = file.size * 3;

  parser.onerror = (_err: Error) => {
    // sax stops on its own; we swallow and resume since Apple exports
    // occasionally have encoding issues that the parser can recover from.
    parser.resume();
  };

  parser.onopentag = (node) => {
    if (node.name !== "Record") return;
    const attrs = node.attributes as Record<string, string | undefined>;
    const type = attrs.type;
    if (!type || !APPLE_TYPE_SET.has(type)) return;

    const startDateStr = attrs.startDate;
    const endDateStr = attrs.endDate;
    const valueStr = attrs.value;
    if (!startDateStr) return;

    const startMs = Date.parse(startDateStr);
    if (!Number.isFinite(startMs) || startMs < cutoff) return;

    const value = valueStr != null ? Number(valueStr) : NaN;
    const dayBucket = startDateStr.slice(0, 10);

    switch (type) {
      case APPLE_RECORD_TYPES.heartRate:
        if (Number.isFinite(value) && value > 0) {
          stats.heartRate.sum += value;
          stats.heartRate.count += 1;
          stats.activeDays.add(dayBucket);
        }
        break;
      case APPLE_RECORD_TYPES.restingHeartRate:
        if (Number.isFinite(value) && value > 0) {
          stats.restingHeartRate.sum += value;
          stats.restingHeartRate.count += 1;
          stats.activeDays.add(dayBucket);
        }
        break;
      case APPLE_RECORD_TYPES.hrvSdnn:
        if (Number.isFinite(value) && value > 0) {
          // Apple exports HRV SDNN already in ms (unit="ms" on the record).
          stats.hrvSdnn.sum += value;
          stats.hrvSdnn.count += 1;
          stats.activeDays.add(dayBucket);
        }
        break;
      case APPLE_RECORD_TYPES.stepCount:
        if (Number.isFinite(value) && value >= 0) {
          stats.steps.sum += value;
          stats.steps.count += 1;
          stats.activeDays.add(dayBucket);
        }
        break;
      case APPLE_RECORD_TYPES.activeEnergyBurned:
        if (Number.isFinite(value) && value >= 0) {
          stats.activeKcal.sum += value;
          stats.activeKcal.count += 1;
        }
        break;
      case APPLE_RECORD_TYPES.vo2Max:
        if (Number.isFinite(value) && value > 0 && startMs > stats.vo2Max.lastDate) {
          stats.vo2Max.lastValue = value;
          stats.vo2Max.lastDate = startMs;
        }
        break;
      case APPLE_RECORD_TYPES.bodyMass:
        if (Number.isFinite(value) && value > 0 && startMs > stats.bodyMass.lastDate) {
          stats.bodyMass.lastValue = value;
          stats.bodyMass.lastDate = startMs;
        }
        break;
      case APPLE_RECORD_TYPES.sleepAnalysis: {
        if (!valueStr || !APPLE_ASLEEP_VALUES.has(valueStr)) return;
        if (!endDateStr) return;
        const endMs = Date.parse(endDateStr);
        if (!Number.isFinite(endMs) || endMs <= startMs) return;
        const durationMin = (endMs - startMs) / (60 * 1000);
        // Bucket by the date of startDate (local time approximation).
        const bucket = startDateStr.slice(0, 10);
        stats.sleepPerNight.set(
          bucket,
          (stats.sleepPerNight.get(bucket) ?? 0) + durationMin,
        );
        break;
      }
    }
  };

  // Stream the inner XML. JSZip's internalStream emits chunks as Uint8Array
  // — we decode chunk-by-chunk and feed sax. This keeps heap flat even for
  // 2 GB uncompressed exports.
  await new Promise<void>((resolve, reject) => {
    const decoder = new TextDecoder("utf-8");
    // JSZip's internalStream is documented but not in @types/jszip. Cast it.
    interface JSZipStream {
      on(event: "data", cb: (chunk: Uint8Array) => void): JSZipStream;
      on(event: "end", cb: () => void): JSZipStream;
      on(event: "error", cb: (err: Error) => void): JSZipStream;
      pause(): JSZipStream;
      resume(): JSZipStream;
    }
    const entryWithStream = xmlEntry as JSZip.JSZipObject & {
      internalStream(type: "uint8array"): JSZipStream;
    };
    const stream = entryWithStream.internalStream("uint8array");

    stream.on("data", (chunk: Uint8Array) => {
      if (aborted) {
        stream.pause();
        resolve();
        return;
      }
      progressBytes += chunk.byteLength;
      try {
        parser.write(decoder.decode(chunk, { stream: true }));
      } catch {
        // sax resumed above; silently drop chunk on hard failure.
      }

      const now = performance.now();
      if (now - lastProgressPost > 500) {
        lastProgressPost = now;
        ctx.postMessage({
          type: "progress",
          bytesProcessed: progressBytes,
          totalBytes: approxXmlBytes,
        });
      }
    });

    stream.on("end", () => {
      try {
        parser.write(decoder.decode()); // flush
        parser.close();
      } catch {
        /* ignore */
      }
      resolve();
    });

    stream.on("error", (err: Error) => reject(err));
    stream.resume();
  });

  if (aborted) {
    ctx.postMessage({ type: "error", code: "aborted", message: "Parse abgebrochen." });
    return;
  }

  // Compute aggregates.
  const sleepBuckets = Array.from(stats.sleepPerNight.entries());
  // Filter out obviously-short nights (<90 min probably just naps / data gaps).
  const validNights = sleepBuckets.filter(([, min]) => min >= 90);

  const avgSleepHours =
    validNights.length > 0
      ? validNights.reduce((s, [, min]) => s + min, 0) / validNights.length / 60
      : null;

  const daysCovered = new Set<string>(stats.activeDays);
  for (const [d] of validNights) daysCovered.add(d);

  const days_covered = Math.min(30, daysCovered.size);

  if (days_covered < 3) {
    warnings.push({
      code: "short_window",
      message: `Nur ${days_covered} Tage Apple-Health-Daten in den letzten 30 Tagen`,
    });
  }

  // Build window_start / window_end from the cutoff and most recent signal.
  const latestDate = new Date(
    Math.max(
      stats.vo2Max.lastDate,
      stats.bodyMass.lastDate,
      ...Array.from(stats.sleepPerNight.keys()).map((d) => Date.parse(d)),
    ) || Date.now(),
  );
  const windowStart = new Date(latestDate);
  windowStart.setDate(windowStart.getDate() - 30);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const avgSteps =
    stats.steps.count > 0
      ? stats.steps.sum / Math.max(1, daysCovered.size)
      : null;
  const avgActiveKcal =
    stats.activeKcal.count > 0
      ? stats.activeKcal.sum / Math.max(1, daysCovered.size)
      : null;

  const metrics: WearableMetrics = {
    sleep: {
      avg_duration_hours: round(avgSleepHours, 2),
      // Apple Health doesn't provide efficiency natively.
      // We could compute (asleep / inBed) but many exports lack inBed, so omit.
    },
    recovery: {
      avg_hrv_ms: round(mean(stats.hrvSdnn), 1),
      avg_rhr_bpm: round(mean(stats.restingHeartRate), 1),
      // Apple doesn't provide a pre-computed recovery score; scoring engine
      // synthesizes one from HRV+RHR via hrvRhrToBaseRecovery().
    },
    activity: {
      avg_steps: round(avgSteps, 0),
      avg_active_kcal: round(avgActiveKcal, 0),
    },
    body: {
      last_weight_kg: round(stats.bodyMass.lastValue, 1),
    },
    vo2max: {
      last_value: round(stats.vo2Max.lastValue, 1),
    },
  };

  const result: WearableParseResult = {
    source: "apple_health",
    schema_version: "apple_v1",
    window_start: iso(windowStart),
    window_end: iso(latestDate),
    days_covered,
    metrics,
    parse_warnings: warnings,
    parse_duration_ms: Math.round(performance.now() - t0),
    file_size_bytes: file.size,
  };

  ctx.postMessage({ type: "done", result });
}
