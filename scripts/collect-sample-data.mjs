// Collects raw pipeline outputs for one locale by calling the SAME endpoints
// the real results page uses, against the demo assessment. Saves everything
// to sample-data/raw/{locale}.json for the converter step.
//
// Prereq: dev server running on BASE_URL + demo assessment set up
// (scripts/setup-sample-assessment.mjs --locale=<locale> already ran).
//
// Run:
//   node scripts/collect-sample-data.mjs --locale=de
//
// On ANY non-ok response: logs which endpoint failed and exits (no retry —
// retries cost extra LLM money).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.SAMPLE_BASE_URL ?? "http://localhost:3000";

const localeArg = process.argv.find((a) => a.startsWith("--locale="));
const LOCALE = (localeArg?.split("=")[1] ?? "de").toLowerCase();

const assessmentId = readFileSync(
  join(__dirname, "..", "sample-data", ".demo-assessment-id"),
  "utf8",
).trim();

const PLAN_TYPES = ["activity", "metabolic", "recovery", "stress"];
const DIMENSIONS = ["sleep", "activity", "vo2max", "metabolic", "stress"];

async function call(label, url, init) {
  process.stdout.write(`  → ${label} ... `);
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    console.log("NETWORK FAIL");
    console.error(`\n❌ ${label} network error:`, err.message);
    process.exit(1);
  }
  const ms = Date.now() - t0;
  if (!res.ok) {
    console.log(`HTTP ${res.status} (${ms}ms)`);
    const bodyText = await res.text().catch(() => "");
    console.error(`\n❌ ${label} failed: HTTP ${res.status}\n${bodyText.slice(0, 800)}`);
    process.exit(1);
  }
  const json = await res.json();
  console.log(`ok (${ms}ms)`);
  return json;
}

function post(body) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const outDir = join(__dirname, "..", "sample-data", "raw");
const outPath = join(outDir, `${LOCALE}.json`);

function save(out) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
}

function skip(label) {
  console.log(`  ⏭ ${label} ... cached (skip)`);
}

async function main() {
  console.log(`\n🤖 Collecting sample data (locale=${LOCALE}, assessment=${assessmentId})`);
  console.log(`   base=${BASE_URL}\n`);

  // Resume: reuse any data already collected in a prior (partial) run so a
  // re-run only re-fetches the calls that are still missing — earlier LLM
  // spend is never repeated. Delete sample-data/raw/<locale>.json to force
  // a full fresh collection.
  let out = { locale: LOCALE, assessmentId, generatedAt: new Date().toISOString() };
  if (existsSync(outPath)) {
    const prior = JSON.parse(readFileSync(outPath, "utf8"));
    if (prior.assessmentId === assessmentId) {
      out = prior;
      console.log(`   ↻ resuming from existing raw/${LOCALE}.json\n`);
    } else {
      console.log(`   ⚠ existing raw/${LOCALE}.json is for a different assessment — starting fresh\n`);
    }
  }

  // 1. Scores (ReportContext scoring result).
  if (!out.results) {
    out.results = await call(
      "GET /api/results",
      `${BASE_URL}/api/results/${assessmentId}`,
      { cache: "no-store" },
    );
    save(out);
  } else skip("GET /api/results");

  // 2. Main report (PdfReportContent — ~3 LLM calls).
  if (!out.report) {
    out.report = await call(
      "POST /api/report/generate",
      `${BASE_URL}/api/report/generate`,
      post({ assessmentId }),
    );
    save(out);
  } else skip("POST /api/report/generate");

  // 3. Four individual plans (1 LLM call each).
  out.plans ??= {};
  for (const type of PLAN_TYPES) {
    if (out.plans[type]) {
      skip(`POST /api/plan/generate (${type})`);
      continue;
    }
    out.plans[type] = await call(
      `POST /api/plan/generate (${type})`,
      `${BASE_URL}/api/plan/generate`,
      post({ assessmentId, type, locale: LOCALE }),
    );
    save(out);
  }

  // 4. Master weekly plan (1 Sonnet call).
  if (!out.masterPlan) {
    out.masterPlan = await call(
      "POST /api/master-plan/generate",
      `${BASE_URL}/api/master-plan/generate`,
      post({ assessmentId, locale: LOCALE }),
    );
    save(out);
  } else skip("POST /api/master-plan/generate");

  // 5. Per-dimension interpretations (1 LLM call each).
  out.interpretations ??= {};
  for (const dimension of DIMENSIONS) {
    if (out.interpretations[dimension]) {
      skip(`POST /api/reports/interpret-block (${dimension})`);
      continue;
    }
    out.interpretations[dimension] = await call(
      `POST /api/reports/interpret-block (${dimension})`,
      `${BASE_URL}/api/reports/interpret-block`,
      post({ assessment_id: assessmentId, dimension, locale: LOCALE }),
    );
    save(out);
  }

  save(out);

  console.log(`\n✅ Collected raw data → sample-data/raw/${LOCALE}.json`);
  console.log(`   report keys: ${Object.keys(out.report ?? {}).join(", ")}`);
  console.log(`   plans: ${Object.keys(out.plans).join(", ")}`);
  console.log(`   masterPlan keys: ${Object.keys(out.masterPlan ?? {}).join(", ")}`);
  console.log(`   interpretations: ${Object.keys(out.interpretations).join(", ")}\n`);
}

main().catch((err) => {
  console.error("\n❌ Collection failed:", err);
  process.exit(1);
});
