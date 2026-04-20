// Assesses the overall quality of a set of successfully parsed wearable
// results so the UI can display a human-readable verdict rather than a
// confusing ratio like "4 von 50 erfolgreich".

import type { WearableParseResult } from "../types";

export type DataQuality = "strong" | "good" | "minimal" | "none";

export interface DataQualityResult {
  level: DataQuality;
  successCount: number;
  failureCount: number;
  totalDays: number;
  /** Human-readable primary source label, e.g. "WHOOP" or "Apple Health". */
  primarySource?: string;
  gpxSessions?: number;
}

export function assessDataQuality(
  successResults: WearableParseResult[],
  totalFiles: number,
): DataQualityResult {
  const successCount = successResults.length;
  const failureCount = totalFiles - successCount;

  if (successCount === 0) {
    return { level: "none", successCount: 0, failureCount, totalDays: 0 };
  }

  const totalDays = Math.max(...successResults.map((r) => r.days_covered));

  const whoopResult  = successResults.find((r) => r.source === "whoop");
  const appleResult  = successResults.find((r) => r.source === "apple_health");
  const gpxResults   = successResults.filter((r) => r.source === "gpx");
  const hasBodyScan  = successResults.some(
    (r) =>
      (r.source === "ai_document" || r.source === "ai_image") &&
      r.metrics.body?.body_fat_pct != null,
  );

  // STRONG: WHOOP >= 14 days, or Apple Health with a body-comp scan
  if (
    (whoopResult && whoopResult.days_covered >= 14) ||
    (appleResult && appleResult.days_covered >= 14) ||
    (appleResult && hasBodyScan)
  ) {
    const primarySource = whoopResult
      ? "WHOOP"
      : appleResult
      ? "Apple Health"
      : "Scan";
    return {
      level: "strong",
      successCount,
      failureCount,
      totalDays,
      primarySource,
      gpxSessions: gpxResults.length,
    };
  }

  // GOOD: any wearable source (incl. short WHOOP/Apple), body scan, or >= 3 GPX sessions
  const hasAnyWearable = whoopResult || appleResult;
  if (hasAnyWearable || hasBodyScan || gpxResults.length >= 3) {
    const primarySource = whoopResult
      ? "WHOOP"
      : appleResult
      ? "Apple Health"
      : gpxResults.length > 0
      ? "GPX"
      : "Scan";
    return {
      level: "good",
      successCount,
      failureCount,
      totalDays,
      primarySource,
      gpxSessions: gpxResults.length,
    };
  }

  // MINIMAL: some data, but no wearable or body scan
  return {
    level: "minimal",
    successCount,
    failureCount,
    totalDays,
    gpxSessions: gpxResults.length,
  };
}
