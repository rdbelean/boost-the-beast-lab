// Client-side GPX parser. Runs in the browser (uses DOMParser).
// Accepts one or more .gpx files and aggregates them into a single
// WearableParseResult with activity metrics.
//
// Extracts per-track:
//   • Distance (km) — Haversine sum of trkpt lat/lon pairs
//   • Duration (min) — first/last <time> timestamps
//   • Avg pace (min/km) — duration / distance
//   • Activity type — inferred from avg pace
//   • Max HR — from Garmin/Polar <extensions> if present
//
// Aggregates across files:
//   • avg_met_minutes_week
//   • fitness.max_hr (if any file has HR data)

import type { WearableParseResult, ParseWarning } from "../types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type ActivityType = "run" | "cycle" | "walk";

function inferActivityType(avgPaceMinPerKm: number): ActivityType {
  if (avgPaceMinPerKm < 4) return "cycle";
  if (avgPaceMinPerKm > 10) return "walk";
  return "run";
}

// MET values by activity type (conservative midpoints per ACSM)
const MET_BY_TYPE: Record<ActivityType, number> = {
  run:   8.0,
  cycle: 6.8,
  walk:  3.5,
};

// Find the first descendant element with a given local name (namespace-safe).
function findByLocalName(el: Element, localName: string): Element | null {
  const all = el.querySelectorAll("*");
  for (const child of all) {
    if (child.localName === localName) return child;
  }
  return null;
}

// ── Per-file parse ───────────────────────────────────────────────────────────

interface GpxSession {
  distanceKm: number;
  durationMin: number;
  activityType: ActivityType;
  maxHr?: number;
  date: string; // ISO YYYY-MM-DD
}

function parseOneGpxText(text: string): GpxSession | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  if (doc.querySelector("parsererror")) return null;

  const trkpts = Array.from(doc.querySelectorAll("trkpt"));
  if (trkpts.length < 2) return null;

  let distanceKm = 0;
  let maxHr: number | undefined;

  for (let i = 1; i < trkpts.length; i++) {
    const prev = trkpts[i - 1];
    const curr = trkpts[i];

    const lat1 = parseFloat(prev.getAttribute("lat") ?? "");
    const lon1 = parseFloat(prev.getAttribute("lon") ?? "");
    const lat2 = parseFloat(curr.getAttribute("lat") ?? "");
    const lon2 = parseFloat(curr.getAttribute("lon") ?? "");

    if (isFinite(lat1) && isFinite(lon1) && isFinite(lat2) && isFinite(lon2)) {
      const d = haversineKm(lat1, lon1, lat2, lon2);
      // Skip GPS noise jumps > 5 km between consecutive points
      if (d < 5) distanceKm += d;
    }

    // Extract HR from Garmin/Polar extensions (<gpxtpx:hr> or <ns3:hr>)
    const hrEl = findByLocalName(curr, "hr");
    if (hrEl?.textContent) {
      const hr = parseInt(hrEl.textContent.trim());
      if (hr > 0 && hr < 260) {
        maxHr = maxHr == null ? hr : Math.max(maxHr, hr);
      }
    }
  }

  if (distanceKm < 0.1) return null;

  // Duration from first/last timestamps
  const firstTime = trkpts[0].querySelector("time")?.textContent;
  const lastTime  = trkpts[trkpts.length - 1].querySelector("time")?.textContent;

  let durationMin = 0;
  let date = new Date().toISOString().slice(0, 10);

  if (firstTime && lastTime) {
    const start = new Date(firstTime);
    const end   = new Date(lastTime);
    if (isFinite(start.getTime()) && isFinite(end.getTime())) {
      durationMin = (end.getTime() - start.getTime()) / 60_000;
      date = start.toISOString().slice(0, 10);
    }
  }

  if (durationMin <= 0) {
    // Estimate: assume 6 min/km average if no timestamps
    durationMin = distanceKm * 6;
  }

  const avgPace = durationMin / distanceKm;

  return {
    distanceKm,
    durationMin,
    activityType: inferActivityType(avgPace),
    maxHr,
    date,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function parseGpxFiles(files: File[]): Promise<WearableParseResult> {
  const t0 = performance.now();
  const warnings: ParseWarning[] = [];
  const sessions: GpxSession[] = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const session = parseOneGpxText(text);
      if (session) {
        sessions.push(session);
      } else {
        warnings.push({
          code: "gpx_parse_failed",
          message: `No usable track data in ${file.name}`,
        });
      }
    } catch (err) {
      warnings.push({
        code: "gpx_read_error",
        message: `Could not read ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  if (sessions.length === 0) {
    throw new Error(
      "Keine verwertbaren GPX-Tracks gefunden. Bitte stelle sicher, dass die Dateien GPS-Koordinaten enthalten.",
    );
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date));
  const windowStart = sessions[0].date;
  const windowEnd   = sessions[sessions.length - 1].date;

  const startMs = new Date(windowStart).getTime();
  const endMs   = new Date(windowEnd).getTime();
  const daysCovered = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);

  const totalActiveMin = sessions.reduce((s, r) => s + r.durationMin, 0);

  // avg MET-minutes per week
  const weeks = Math.max(1, daysCovered / 7);
  const totalMetMin = sessions.reduce((s, r) => s + r.durationMin * MET_BY_TYPE[r.activityType], 0);
  const avgMetMinPerWeek = totalMetMin / weeks;

  const overallMaxHr = sessions.reduce<number | undefined>(
    (m, r) => (r.maxHr != null ? (m == null ? r.maxHr : Math.max(m, r.maxHr)) : m),
    undefined,
  );

  const totalBytes = files.reduce((s, f) => s + f.size, 0);

  return {
    source: "gpx",
    schema_version: "1.0",
    window_start: windowStart,
    window_end:   windowEnd,
    days_covered: daysCovered,
    metrics: {
      activity: {
        avg_met_minutes_week: Math.round(avgMetMinPerWeek),
        avg_active_kcal: Math.round(totalActiveMin / weeks * 7), // rough kcal/week
      },
      ...(overallMaxHr != null ? { fitness: { max_hr: overallMaxHr } } : {}),
    },
    parse_warnings: warnings,
    parse_duration_ms: Math.round(performance.now() - t0),
    file_size_bytes: totalBytes,
  };
}
