// Demo WHOOP-export ZIP generator for the sample-report workflow.
//
// Produces sample-data/demo-whoop-export.zip with 7 days of synthetic
// "Max Beispiel" data (35yo office worker, little cardio — deliberately
// low recovery/HRV/sleep values to maximise the report's optimisation
// potential). The ZIP is accepted by the BTB WHOOP parser
// (lib/wearable/whoop/) and committed to the repo so Adrian can re-upload
// it across the 4 locale quiz runs.
//
// Run:  node scripts/generate-sample-whoop-zip.mjs
//
// Pure Node-ESM. Only dependency is jszip (already in node_modules).
// No TypeScript tooling required.

import JSZip from "jszip";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "sample-data");
const OUT_ZIP = join(OUT_DIR, "demo-whoop-export.zip");

// ── Persona: Max Beispiel, 7 days Mon–Sun, backdated from today ─────────
// Column names MUST match lib/wearable/whoop/schema.ts (whoop_v1) verbatim.
// Asleep duration is in MINUTES (aggregate divides by 60 for hours).
const DAYS = [
  // recovery, hrv, rhr, strain, asleepMin, sleepPerf, deepMin, remMin, sleepEff
  { recovery: 58, hrv: 42, rhr: 65, strain: 8.0,  asleep: 390, sleepPerf: 72, deep: 50, rem: 50, eff: 88 },
  { recovery: 45, hrv: 36, rhr: 68, strain: 11.5, asleep: 350, sleepPerf: 65, deep: 40, rem: 40, eff: 84 },
  { recovery: 50, hrv: 38, rhr: 67, strain: 5.5,  asleep: 375, sleepPerf: 68, deep: 45, rem: 45, eff: 86 },
  { recovery: 62, hrv: 45, rhr: 64, strain: 9.5,  asleep: 420, sleepPerf: 78, deep: 55, rem: 60, eff: 90 },
  { recovery: 40, hrv: 33, rhr: 70, strain: 7.0,  asleep: 330, sleepPerf: 62, deep: 35, rem: 35, eff: 83 },
  { recovery: 55, hrv: 41, rhr: 65, strain: 12.0, asleep: 435, sleepPerf: 80, deep: 60, rem: 65, eff: 91 },
  { recovery: 65, hrv: 44, rhr: 63, strain: 4.0,  asleep: 465, sleepPerf: 85, deep: 65, rem: 70, eff: 93 },
];

// Workouts: only 2 per week (irregular athlete). Index 1 = Tue, index 5 = Sat.
const WORKOUTS = [
  { dayIndex: 1, activity: "Strength Training", strain: 11.5, durationMin: 50, avgHr: 132 },
  { dayIndex: 5, activity: "Tennis",            strain: 12.0, durationMin: 90, avgHr: 138 },
];

// Energy burned roughly proportional to strain (cosmetic — parser ignores it).
function energyFromStrain(strain) {
  return Math.round(1800 + strain * 90);
}

// ── Date helpers ────────────────────────────────────────────────────────
// Most recent day = today; day 0 (Mon) = 6 days ago. ISO without timezone
// suffix so `new Date(v)` in the parser yields a finite local date.
function isoForDayIndex(i) {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - (DAYS.length - 1 - i));
  d.setHours(7, 30, 0, 0); // wake-ish time, irrelevant to the parser
  // "YYYY-MM-DDTHH:MM:SS"
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── CSV builder ─────────────────────────────────────────────────────────
function toCsv(headers, rows) {
  const headerLine = headers.join(",");
  const dataLines = rows.map((r) =>
    headers.map((h) => {
      const v = r[h] ?? "";
      const s = String(v);
      // Quote values containing comma/quote/newline (none expected here,
      // but keep it correct).
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","),
  );
  return [headerLine, ...dataLines].join("\n") + "\n";
}

// ── physiological_cycles.csv (primary, required) ────────────────────────
const CYCLES_HEADERS = [
  "Cycle start time",
  "Recovery score %",
  "Heart rate variability (ms)",
  "Resting heart rate (bpm)",
  "Day Strain",
  "Asleep duration (min)",
  "Sleep performance %",
  "Deep (SWS) duration (min)",
  "REM duration (min)",
  "Sleep efficiency %",
  // Cosmetic extras (ignored by the BTB parser, present for realism):
  "Energy burned (cal)",
  "Skin temp (celsius)",
  "Blood oxygen %",
];

const cyclesRows = DAYS.map((d, i) => ({
  "Cycle start time": isoForDayIndex(i),
  "Recovery score %": d.recovery,
  "Heart rate variability (ms)": d.hrv,
  "Resting heart rate (bpm)": d.rhr,
  "Day Strain": d.strain.toFixed(1),
  "Asleep duration (min)": d.asleep,
  "Sleep performance %": d.sleepPerf,
  "Deep (SWS) duration (min)": d.deep,
  "REM duration (min)": d.rem,
  "Sleep efficiency %": d.eff,
  "Energy burned (cal)": energyFromStrain(d.strain),
  "Skin temp (celsius)": "33.2",
  "Blood oxygen %": "96",
}));

// ── sleeps.csv (optional supplementary) ─────────────────────────────────
const SLEEPS_HEADERS = [
  "Cycle start time",
  "Asleep duration (min)",
  "Sleep efficiency %",
  "Sleep performance %",
];

const sleepsRows = DAYS.map((d, i) => ({
  "Cycle start time": isoForDayIndex(i),
  "Asleep duration (min)": d.asleep,
  "Sleep efficiency %": d.eff,
  "Sleep performance %": d.sleepPerf,
}));

// ── workouts.csv (optional, 2 workouts) ─────────────────────────────────
const WORKOUTS_HEADERS = [
  "Cycle start time",
  "Activity name",
  "Activity Strain",
  "Duration (min)",
  "Average HR (bpm)",
];

const workoutsRows = WORKOUTS.map((w) => ({
  "Cycle start time": isoForDayIndex(w.dayIndex),
  "Activity name": w.activity,
  "Activity Strain": w.strain.toFixed(1),
  "Duration (min)": w.durationMin,
  "Average HR (bpm)": w.avgHr,
}));

// ── Build + zip ─────────────────────────────────────────────────────────
async function main() {
  const cyclesCsv = toCsv(CYCLES_HEADERS, cyclesRows);
  const sleepsCsv = toCsv(SLEEPS_HEADERS, sleepsRows);
  const workoutsCsv = toCsv(WORKOUTS_HEADERS, workoutsRows);

  const zip = new JSZip();
  zip.file("physiological_cycles.csv", cyclesCsv);
  zip.file("sleeps.csv", sleepsCsv);
  zip.file("workouts.csv", workoutsCsv);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_ZIP, buffer);

  console.log("✅ Demo WHOOP export generated");
  console.log(`   physiological_cycles.csv: ${cyclesRows.length} rows`);
  console.log(`   sleeps.csv:               ${sleepsRows.length} rows`);
  console.log(`   workouts.csv:             ${workoutsRows.length} rows`);
  console.log(`   window: ${isoForDayIndex(0).slice(0, 10)} → ${isoForDayIndex(DAYS.length - 1).slice(0, 10)}`);
  console.log(`   output: ${OUT_ZIP} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error("❌ Generation failed:", err);
  process.exit(1);
});
