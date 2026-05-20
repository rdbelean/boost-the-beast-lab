// Sets up a single "Max Beispiel" demo assessment in the Production Supabase
// so the real report-generation pipeline (which requires loadReportContext
// → DB) can run against it. Marked assessment_type='test' so it never shows
// up in real user listings.
//
// Run (Node 20.6+ for native --env-file):
//   node --env-file=.env.local scripts/setup-sample-assessment.mjs --locale=de
//
// Idempotent: deletes ALL prior demo (assessment_type='test' for the demo
// user) + the demo user before re-inserting, so re-runs never accumulate
// stale rows. Prints the new assessment id to stdout AND writes it to
// sample-data/.demo-assessment-id for the generation step.
//
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ────────────────────────────────────────────────────────────
const localeArg = process.argv.find((a) => a.startsWith("--locale="));
const LOCALE = (localeArg?.split("=")[1] ?? "de").toLowerCase();
if (!["de", "en", "it", "tr"].includes(LOCALE)) {
  console.error(`❌ Invalid --locale=${LOCALE} (must be de|en|it|tr)`);
  process.exit(1);
}

// ── Demo persona "Max Beispiel" ─────────────────────────────────────────
const DEMO_EMAIL = "max.beispiel@demo.boostthebeast.local";

const DEMO_USER = {
  email: DEMO_EMAIL,
  age: 35,
  gender: "male",        // Gender enum: male|female|diverse
  height_cm: 182,
  weight_kg: 87,         // BMI 26.3
  first_name: "Max",
};

// question_code → raw_value (all TEXT). Values map to the enums verified in
// lib/scoring/* and lib/reports/report-context.ts. Deliberately low activity
// + mediocre sleep/stress to maximise the report's optimisation potential.
const DEMO_RESPONSES = {
  // IPAQ activity — low (office worker, irregular gym)
  walking_days: "5",
  walking_minutes_per_day: "25",
  moderate_days: "2",
  moderate_minutes_per_day: "50",
  vigorous_days: "0",
  vigorous_minutes_per_day: "0",
  // Sleep — mediocre
  sleep_duration_hours: "6.5",
  sleep_quality: "mittel",        // SleepQualityLabel: sehr_gut|gut|mittel|schlecht
  wakeups: "oft",                 // WakeupFrequency: nie|selten|oft|immer
  recovery_1_10: "5",
  // Stress — elevated
  stress_level_1_10: "7",
  // Metabolic
  meals_per_day: "3",
  water_litres: "1.75",
  sitting_hours: "9",
  fruit_veg: "low",               // FruitVegLevel: none|low|moderate|good|optimal
  // Personalization
  main_goal: "body_comp",         // MainGoal: feel_better|body_comp|performance|stress_sleep|longevity
  time_budget: "moderate",        // TimeBudget: minimal|moderate|committed|athlete
  experience_level: "intermediate", // ExperienceLevel: beginner|restart|intermediate|advanced
  // Multi-selects — stored as JSON string arrays (parseMultiValueResponse handles both)
  nutrition_painpoint: JSON.stringify(["cravings_evening", "no_time"]),
  stress_source: JSON.stringify(["job", "family"]),
  recovery_ritual: JSON.stringify(["sport"]),
};

const BODY_TYPE = "male_2"; // assessments.body_type_self_assessment (BMI 26.3, average build)

// Aggregated WHOOP metrics from sample-data/demo-whoop-export.zip (7-day
// Max-Beispiel window). Means computed from the generator's 7-day dataset
// — matches the whoop-demo-zip smoke-test ranges. Schema mirrors
// lib/wearable/whoop/aggregate.ts WearableMetrics output.
const WEARABLE_METRICS = {
  sleep: {
    avg_duration_hours: 6.58,
    avg_efficiency_pct: 87.9,
    avg_sleep_performance_pct: 72.9,
    avg_deep_sleep_min: 50.0,
    avg_rem_min: 52.1,
  },
  recovery: {
    avg_score: 53.6,
    avg_hrv_ms: 39.9,
    avg_rhr_bpm: 66.0,
  },
  activity: {
    avg_strain: 8.21,
    avg_active_kcal: 11.75,
  },
};

// 7-day window ending today (matches generator's backdating).
function whoopWindow() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { window_start: iso(start), window_end: iso(end) };
}

// ── Supabase service client ─────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (run via --env-file=.env.local)");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(`\n🔧 Setup demo assessment (locale=${LOCALE})`);

  // 1. Idempotency: find demo user, delete its test-assessments (cascade →
  //    responses), then delete the user. Clean slate every run.
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();

  if (existingUser) {
    const { data: oldAssessments } = await supabase
      .from("assessments")
      .select("id")
      .eq("user_id", existingUser.id)
      .eq("assessment_type", "test");
    const oldCount = oldAssessments?.length ?? 0;
    // Deleting assessments cascades to responses (ON DELETE CASCADE).
    await supabase
      .from("assessments")
      .delete()
      .eq("user_id", existingUser.id)
      .eq("assessment_type", "test");
    await supabase.from("users").delete().eq("id", existingUser.id);
    console.log(`   🧹 Removed prior demo user + ${oldCount} test-assessment(s)`);
  } else {
    console.log("   🧹 No prior demo user found — clean start");
  }

  // 2. Insert demo user.
  const { data: user, error: uErr } = await supabase
    .from("users")
    .insert(DEMO_USER)
    .select("id")
    .single();
  if (uErr || !user) {
    console.error("❌ User insert failed:", uErr);
    process.exit(1);
  }

  // 3. Insert assessment — assessment_type='test' is the safety marker.
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .insert({
      user_id: user.id,
      assessment_type: "test",     // ← SAFETY MARKER: never a real user report
      status: "completed",
      report_type: "complete",
      locale: LOCALE,
      body_type_self_assessment: BODY_TYPE,
    })
    .select("id")
    .single();
  if (aErr || !assessment) {
    console.error("❌ Assessment insert failed:", aErr);
    process.exit(1);
  }

  // 4. Insert responses.
  const rows = Object.entries(DEMO_RESPONSES).map(([question_code, raw_value]) => ({
    assessment_id: assessment.id,
    question_code,
    raw_value,
  }));
  const { error: rErr } = await supabase.from("responses").insert(rows);
  if (rErr) {
    console.error("❌ Responses insert failed:", rErr);
    process.exit(1);
  }

  // 4b. Insert WHOOP wearable_uploads row so loadReportContext sees
  //     smartwatch data (HRV/recovery/strain) — otherwise the sample
  //     report would render without smartwatch visualisations.
  const win = whoopWindow();
  const { data: wUp, error: wErr } = await supabase
    .from("wearable_uploads")
    .insert({
      user_id: user.id,
      assessment_id: assessment.id,
      source: "whoop",
      schema_version: "whoop_v1",
      window_start: win.window_start,
      window_end: win.window_end,
      days_covered: 7,
      metrics: WEARABLE_METRICS,
      file_size_bytes: 1536,
    })
    .select("id")
    .single();
  if (wErr || !wUp) {
    console.error("❌ wearable_uploads insert failed:", wErr);
    process.exit(1);
  }

  // 4c. Point assessment.data_sources at the WHOOP upload so
  //     loadReportContext's `dataSources?.whoop` branch fires.
  const { error: dsErr } = await supabase
    .from("assessments")
    .update({ data_sources: { form: true, whoop: { days: 7, upload_id: wUp.id } } })
    .eq("id", assessment.id);
  if (dsErr) {
    console.error("❌ data_sources update failed:", dsErr);
    process.exit(1);
  }

  // 5. Verify the marker actually landed.
  const { data: verify } = await supabase
    .from("assessments")
    .select("id, assessment_type, locale, body_type_self_assessment")
    .eq("id", assessment.id)
    .single();

  // 6. Persist id for the generation step.
  const outDir = join(__dirname, "..", "sample-data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, ".demo-assessment-id"), assessment.id);

  console.log(`   ✅ user_id:        ${user.id}`);
  console.log(`   ✅ assessment_id:  ${assessment.id}`);
  console.log(`   ✅ assessment_type: ${verify?.assessment_type}`);
  console.log(`   ✅ locale:         ${verify?.locale}`);
  console.log(`   ✅ body_type:      ${verify?.body_type_self_assessment}`);
  console.log(`   ✅ responses:      ${rows.length} rows`);
  console.log(`   ✅ wearable:       whoop, 7 days, recovery ${WEARABLE_METRICS.recovery.avg_score} / hrv ${WEARABLE_METRICS.recovery.avg_hrv_ms}ms`);
  console.log(`   ✅ data_sources:   { form, whoop } → upload ${wUp.id}`);
  console.log(`   ✅ id written to:  sample-data/.demo-assessment-id\n`);

  if (verify?.assessment_type !== "test") {
    console.error("❌ SAFETY CHECK FAILED: assessment_type is NOT 'test'!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Setup failed:", err);
  process.exit(1);
});
