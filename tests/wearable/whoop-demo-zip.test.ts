import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import Papa from "papaparse";
import { detectWhoopSchema } from "@/lib/wearable/whoop/schema";
import { aggregateWhoop } from "@/lib/wearable/whoop/aggregate";

// Smoke-test for the committed demo WHOOP export. Verifies the generated
// ZIP (scripts/generate-sample-whoop-zip.mjs) is accepted by the parser's
// schema detection + aggregation. Goes through the internal functions
// rather than parseWhoopZip(File) because that path is browser-only
// (File API). If this fails, re-run the generator script.

type CSVRow = Record<string, string | undefined>;

function parseCsv(content: string): { headers: string[]; rows: CSVRow[] } {
  const result = Papa.parse<CSVRow>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  return { headers: result.meta.fields ?? [], rows: result.data };
}

describe("demo WHOOP export — parser acceptance", () => {
  let cycles: { headers: string[]; rows: CSVRow[] };
  let sleeps: { headers: string[]; rows: CSVRow[] };
  let workouts: { headers: string[]; rows: CSVRow[] };

  beforeAll(async () => {
    const zipPath = join(process.cwd(), "sample-data", "demo-whoop-export.zip");
    const buffer = readFileSync(zipPath);
    const zip = await JSZip.loadAsync(buffer);

    const cyclesText = await zip.file("physiological_cycles.csv")!.async("string");
    const sleepsText = await zip.file("sleeps.csv")!.async("string");
    const workoutsText = await zip.file("workouts.csv")!.async("string");

    cycles = parseCsv(cyclesText);
    sleeps = parseCsv(sleepsText);
    workouts = parseCsv(workoutsText);
  });

  it("contains all 3 expected CSVs with rows", () => {
    expect(cycles.rows.length).toBe(7);
    expect(sleeps.rows.length).toBe(7);
    expect(workouts.rows.length).toBe(2);
  });

  it("is detected as whoop_v1 schema", () => {
    const schema = detectWhoopSchema(sleeps.headers, cycles.headers, workouts.headers);
    expect(schema).not.toBeNull();
    expect(schema?.version).toBe("whoop_v1");
  });

  it("aggregates to 7 days covered with all metrics populated", () => {
    const schema = detectWhoopSchema(sleeps.headers, cycles.headers, workouts.headers)!;
    const agg = aggregateWhoop({
      cycles: cycles.rows,
      sleeps: sleeps.rows,
      workouts: workouts.rows,
      schema,
      windowDays: 30,
    });

    expect(agg.days_covered).toBe(7);

    // Sub-objects are optional in the type but always populated by
    // aggregateWhoop for a valid window — assert presence then read.
    const recovery = agg.metrics.recovery;
    const sleep = agg.metrics.sleep;
    const activity = agg.metrics.activity;
    expect(recovery).toBeDefined();
    expect(sleep).toBeDefined();
    expect(activity).toBeDefined();

    // Recovery metrics in the deliberately-low persona range.
    expect(recovery!.avg_score!).toBeGreaterThanOrEqual(40);
    expect(recovery!.avg_score!).toBeLessThanOrEqual(65);
    expect(recovery!.avg_hrv_ms!).toBeGreaterThanOrEqual(33);
    expect(recovery!.avg_hrv_ms!).toBeLessThanOrEqual(45);
    expect(recovery!.avg_rhr_bpm!).toBeGreaterThanOrEqual(63);
    expect(recovery!.avg_rhr_bpm!).toBeLessThanOrEqual(70);

    // Sleep metrics (asleep minutes → hours).
    expect(sleep!.avg_duration_hours!).toBeGreaterThanOrEqual(5.5);
    expect(sleep!.avg_duration_hours!).toBeLessThanOrEqual(7.75);
    expect(sleep!.avg_deep_sleep_min!).toBeGreaterThan(0);
    expect(sleep!.avg_rem_min!).toBeGreaterThan(0);
    expect(sleep!.avg_sleep_performance_pct!).toBeGreaterThan(0);

    // Activity metric (day strain).
    expect(activity!.avg_strain!).toBeGreaterThan(0);

    // No schema/parse failures.
    const fatalCodes = agg.parse_warnings.filter(
      (w) => w.code === "date_fallback" || w.code === "short_window",
    );
    expect(fatalCodes).toHaveLength(0);
  });
});
