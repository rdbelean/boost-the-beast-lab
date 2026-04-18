// Client-side WHOOP export ZIP parser. Runs in the browser — never on the
// server. JSZip extracts the CSVs, PapaParse parses them, aggregate() computes
// the metric averages, and the result is handed off to /api/wearable/persist.

import JSZip from "jszip";
import Papa from "papaparse";
import { detectWhoopSchema } from "./schema";
import { aggregateWhoop } from "./aggregate";
import type { WearableParseResult, ParseWarning } from "../types";

export class WhoopParseError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_a_zip"
      | "missing_csv"
      | "unknown_schema"
      | "empty_window",
  ) {
    super(message);
    this.name = "WhoopParseError";
  }
}

type CSVRow = Record<string, string | undefined>;

async function parseCSV(content: string): Promise<{ headers: string[]; rows: CSVRow[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        resolve({
          headers: result.meta.fields ?? [],
          rows: result.data,
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}

/** Find an entry by case-insensitive basename match. */
function findEntry(zip: JSZip, basename: string): JSZip.JSZipObject | null {
  const lower = basename.toLowerCase();
  for (const [name, entry] of Object.entries(zip.files)) {
    const base = name.split("/").pop()?.toLowerCase();
    if (base === lower) return entry;
  }
  return null;
}

export async function parseWhoopZip(file: File): Promise<WearableParseResult> {
  const t0 = performance.now();
  const warnings: ParseWarning[] = [];

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new WhoopParseError(
      "ZIP-Datei konnte nicht gelesen werden.",
      "not_a_zip",
    );
  }

  // physiological_cycles.csv is the only required file.
  const cyclesEntry = findEntry(zip, "physiological_cycles.csv");
  if (!cyclesEntry) {
    throw new WhoopParseError(
      "Diese ZIP scheint kein WHOOP-Export zu sein. Bitte lade die Datei direkt aus der WHOOP-App hoch.",
      "missing_csv",
    );
  }

  const sleepsEntry = findEntry(zip, "sleeps.csv");
  const workoutsEntry = findEntry(zip, "workouts.csv");

  const [cyclesText, sleepsText, workoutsText] = await Promise.all([
    cyclesEntry.async("string"),
    sleepsEntry ? sleepsEntry.async("string") : Promise.resolve(""),
    workoutsEntry ? workoutsEntry.async("string") : Promise.resolve(""),
  ]);

  const cycles = await parseCSV(cyclesText);
  const sleeps = sleepsText ? await parseCSV(sleepsText) : { headers: [], rows: [] };
  const workouts = workoutsText ? await parseCSV(workoutsText) : { headers: [], rows: [] };

  const schema = detectWhoopSchema(sleeps.headers, cycles.headers, workouts.headers);
  if (!schema) {
    throw new WhoopParseError(
      "Diese ZIP scheint kein WHOOP-Export zu sein. Bitte lade die Datei direkt aus der WHOOP-App hoch.",
      "unknown_schema",
    );
  }

  const agg = aggregateWhoop({
    sleeps: sleeps.rows,
    cycles: cycles.rows,
    workouts: workouts.rows,
    schema,
    windowDays: 30,
  });
  warnings.push(...agg.parse_warnings);

  if (agg.days_covered < 3) {
    throw new WhoopParseError(
      "Nur wenige Tage WHOOP-Daten gefunden — bitte ohne Wearable fortfahren.",
      "empty_window",
    );
  }

  return {
    source: "whoop",
    schema_version: schema.version,
    window_start: agg.window_start,
    window_end: agg.window_end,
    days_covered: agg.days_covered,
    metrics: agg.metrics,
    parse_warnings: warnings,
    parse_duration_ms: Math.round(performance.now() - t0),
    file_size_bytes: file.size,
  };
}
