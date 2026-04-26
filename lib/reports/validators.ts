// Deterministic Stage-C validators.
//
// Pure functions, no AI calls — these run synchronously after Stage-B
// produces a ReportJSON and gate whether the AI Judge needs to look at
// the output at all. Six checks, all returning structured issues:
//
//   1. validateSchema           — zod parse (ReportSchema)
//   2. validateAnchoring        — every required section cites ≥N
//                                 concrete user values from ctx
//   3. validateBanlist          — locale-specific Wellness floskel hits
//   4. validateTimeBudget       — daily_life_protocol summed time fits
//                                 personalization.time_budget cap
//   5. validateReportTypeConformance — metabolic / recovery / complete
//                                 report-type prioritises the right
//                                 modules in the headline + top-priority
//   6. validateDailyProtocolNoTraining — no structured-training jargon
//                                 (HIIT, Z2, sets) inside daily_life_protocol

import { ReportSchema, type ReportJSON } from "./schemas/report-output";
import type { ReportContext } from "./report-context";
import { scanBanlist, STRICT_SECTIONS, TOLERANT_HIT_LIMIT } from "./banlist";
import type { TimeBudget } from "./report-context";

// ─── Public types ───────────────────────────────────────────────────────

export type ValidatorIssueKind =
  | "schema_invalid"
  | "missing_anchor"
  | "banlist_hit"
  | "time_budget_violated"
  | "wrong_report_type"
  | "training_in_daily_protocol";

export interface ValidatorIssue {
  kind: ValidatorIssueKind;
  section: string;
  detail: string;
  /** Free-form metadata for downstream AI repair prompts. */
  meta?: Record<string, unknown>;
}

export interface ValidatorScores {
  schema_ok: boolean;
  anchor_coverage_pct: number;
  banlist_hits: number;
  time_budget_ok: boolean;
  report_type_ok: boolean;
  daily_protocol_clean: boolean;
}

export interface ValidatorResult {
  ok: boolean;
  errors: ValidatorIssue[];
  scores: ValidatorScores;
  /** Set of section paths the repair pass should target. */
  repair_target_sections: string[];
  /** Parsed report (only when schema_ok). */
  parsed: ReportJSON | null;
}

// ─── Time-budget caps (minutes/day) ─────────────────────────────────────

export const TIME_BUDGET_CAP: Record<TimeBudget, number> = {
  minimal: 20,
  moderate: 35,
  committed: 50,
  athlete: 80,
};

// ─── Required anchor count per section ──────────────────────────────────

export const REQUIRED_ANCHORS: Record<string, number> = {
  executive_summary: 3,
  "modules.sleep": 2,
  "modules.recovery": 2,
  "modules.activity": 2,
  "modules.metabolic": 2,
  "modules.stress": 2,
  "modules.vo2max": 2,
  top_priority: 2,
  systemic_connections_overview: 2,
  prognose_30_days: 1,
};

// ─── Training jargon banned in daily_life_protocol ──────────────────────

const TRAINING_JARGON = [
  /\bHIIT\b/i,
  /\bZone[- ]?2\b/i,
  /\bZ2\b/i,
  /\bTabata\b/i,
  /\bAMRAP\b/i,
  /\bEMOM\b/i,
  /\b\d+RM\b/i,
  /\b\d+\s?[x×]\s?\d+\b/i, // e.g. 5x5, 3×10
  /\bRPE\s?\d/i,
  /\bIntervall(e|training)\b/i,
  /\bsprint[- ]intervall/i,
  /\bsets?\s+of\s+\d+/i,
  /\bdrop\s?sets?\b/i,
  /\bsuper\s?sets?\b/i,
];

// ─── Public entry ───────────────────────────────────────────────────────

export function validateReport(
  report: unknown,
  ctx: ReportContext,
): ValidatorResult {
  const errors: ValidatorIssue[] = [];
  const repairSections = new Set<string>();

  // 1. Schema parse
  const parseResult = ReportSchema.safeParse(report);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        kind: "schema_invalid",
        section: issue.path.join(".") || "root",
        detail: issue.message,
      });
    }
    return {
      ok: false,
      errors,
      repair_target_sections: ["__schema__"],
      scores: {
        schema_ok: false,
        anchor_coverage_pct: 0,
        banlist_hits: 0,
        time_budget_ok: false,
        report_type_ok: false,
        daily_protocol_clean: false,
      },
      parsed: null,
    };
  }
  const r = parseResult.data;

  // Build the candidate-anchor set from ctx once.
  const anchorCandidates = buildAnchorCandidates(ctx);

  // 2. Anchor coverage
  const anchorScores: Record<string, { required: number; matched: number }> = {};
  for (const [section, text] of iterSectionTexts(r)) {
    const required = REQUIRED_ANCHORS[section];
    if (required == null) continue;
    const matched = countAnchors(text, anchorCandidates);
    anchorScores[section] = { required, matched };
    if (matched < required) {
      errors.push({
        kind: "missing_anchor",
        section,
        detail: `expected ≥${required} concrete values from ctx, found ${matched}`,
        meta: { required, matched },
      });
      repairSections.add(section);
    }
  }
  const totalRequired = Object.values(anchorScores).reduce(
    (s, x) => s + x.required,
    0,
  );
  const totalMatched = Object.values(anchorScores).reduce(
    (s, x) => s + Math.min(x.matched, x.required),
    0,
  );
  const anchor_coverage_pct =
    totalRequired === 0 ? 100 : Math.round((100 * totalMatched) / totalRequired);

  // 3. Banlist
  let banlistHits = 0;
  const perSectionHits = new Map<string, number>();
  for (const [section, text] of iterSectionTexts(r)) {
    const hits = scanBanlist(section, text, ctx.meta.locale);
    if (hits.length === 0) continue;
    banlistHits += hits.length;
    perSectionHits.set(section, (perSectionHits.get(section) ?? 0) + hits.length);
    const isStrict = STRICT_SECTIONS.has(section) || section.startsWith("daily_life_protocol");
    const hitsHere = perSectionHits.get(section) ?? 0;
    const tolerable = !isStrict && hitsHere <= TOLERANT_HIT_LIMIT;
    for (const hit of hits) {
      errors.push({
        kind: "banlist_hit",
        section,
        detail: hit.phrase,
        meta: { pattern: hit.pattern, strict: isStrict, tolerable },
      });
    }
    if (!tolerable) repairSections.add(section);
  }

  // 4. Time budget
  const totalMin = sumDailyProtocolTime(r);
  const cap = TIME_BUDGET_CAP[ctx.personalization.time_budget ?? "moderate"];
  const time_budget_ok = totalMin <= cap;
  if (!time_budget_ok) {
    errors.push({
      kind: "time_budget_violated",
      section: "daily_life_protocol",
      detail: `total ${totalMin} min > cap ${cap} min for time_budget=${ctx.personalization.time_budget ?? "moderate"}`,
      meta: { totalMin, cap, time_budget: ctx.personalization.time_budget ?? "moderate" },
    });
    repairSections.add("daily_life_protocol");
  }

  // 5. Report-type conformance
  const report_type_ok = checkReportTypeConformance(r, ctx, errors, repairSections);

  // 6. Daily-protocol no training
  const dailyTrainingHits = scanDailyProtocolForTraining(r);
  const daily_protocol_clean = dailyTrainingHits.length === 0;
  if (!daily_protocol_clean) {
    for (const hit of dailyTrainingHits) {
      errors.push({
        kind: "training_in_daily_protocol",
        section: hit.section,
        detail: hit.match,
      });
      repairSections.add(hit.section);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    repair_target_sections: Array.from(repairSections),
    scores: {
      schema_ok: true,
      anchor_coverage_pct,
      banlist_hits: banlistHits,
      time_budget_ok,
      report_type_ok,
      daily_protocol_clean,
    },
    parsed: r,
  };
}

// ─── Anchor candidates ──────────────────────────────────────────────────

interface AnchorCandidates {
  numbers: number[];      // float-tolerant (±0.1)
  tokens: Set<string>;    // case-insensitive whole-word tokens
}

export function buildAnchorCandidates(ctx: ReportContext): AnchorCandidates {
  const numbers: number[] = [];
  const tokens = new Set<string>();

  const pushNum = (v: number | null | undefined) => {
    if (v == null || !Number.isFinite(v)) return;
    numbers.push(v);
  };
  const pushTok = (v: string | null | undefined) => {
    if (!v) return;
    const norm = String(v).toLowerCase().trim();
    if (norm.length >= 2) tokens.add(norm);
  };

  // ctx.user
  pushNum(ctx.user.age);
  pushNum(ctx.user.height_cm);
  pushNum(ctx.user.weight_kg);

  // ctx.raw — every numeric field is anchor-eligible.
  pushNum(ctx.raw.daily_steps ?? null);
  pushNum(ctx.raw.sitting_hours_per_day);
  pushNum(ctx.raw.standing_hours_per_day);
  pushNum(ctx.raw.training_days_self_reported ?? null);
  pushNum(ctx.raw.moderate_days);
  pushNum(ctx.raw.moderate_minutes_per_day);
  pushNum(ctx.raw.vigorous_days);
  pushNum(ctx.raw.vigorous_minutes_per_day);
  pushNum(ctx.raw.walking_days);
  pushNum(ctx.raw.walking_minutes_per_day);
  pushNum(ctx.raw.walking_total_minutes_week ?? null);
  pushNum(ctx.raw.sleep_duration_hours);
  pushNum(ctx.raw.morning_recovery_1_10);
  pushNum(ctx.raw.stress_level_1_10);
  pushNum(ctx.raw.meals_per_day);
  pushNum(ctx.raw.water_litres);

  pushTok(ctx.raw.sleep_quality_label_localized);
  pushTok(ctx.raw.wakeup_frequency_label_localized);
  pushTok(ctx.raw.fruit_veg_label_localized);
  pushTok(ctx.raw.training_intensity_self_reported ?? null);

  // ctx.scoring.result.* — every score and band.
  const r = ctx.scoring.result;
  pushNum(r.sleep.sleep_score_0_100);
  pushNum(r.recovery.recovery_score_0_100);
  pushNum(r.activity.activity_score_0_100);
  pushNum(r.metabolic.metabolic_score_0_100);
  pushNum(r.stress.stress_score_0_100);
  pushNum(r.vo2max.fitness_score_0_100);
  pushNum(r.overall_score_0_100);
  pushNum(r.activity.total_met_minutes_week);
  pushNum(r.metabolic.bmi);
  pushNum(r.vo2max.vo2max_estimated);
  pushNum(r.recovery.sleep_multiplier);
  pushNum(r.recovery.stress_multiplier);
  pushNum(r.stress.sleep_buffer);
  pushNum(r.stress.recovery_buffer);

  pushTok(r.sleep.sleep_band);
  pushTok(r.recovery.recovery_band);
  pushTok(r.activity.activity_band);
  pushTok(r.activity.activity_category);
  pushTok(r.metabolic.metabolic_band);
  pushTok(r.metabolic.bmi_category);
  pushTok(r.stress.stress_band);
  pushTok(r.vo2max.fitness_level_band);
  pushTok(r.overall_band);

  // ctx.wearable
  if (ctx.wearable.available) {
    pushNum(ctx.wearable.days_covered);
    for (const s of ctx.wearable.sources) pushTok(s.kind);
  }

  return { numbers, tokens };
}

// ─── Anchor matching ────────────────────────────────────────────────────

const NUMBER_RE = /-?\d+(?:[.,]\d+)?/g;
const TOKEN_RE = /[\p{L}][\p{L}_-]+/gu;

export function countAnchors(
  text: string,
  candidates: AnchorCandidates,
): number {
  if (!text) return 0;
  const matched = new Set<string>();

  // Numeric matches with ±0.1 tolerance for floats, exact for integers.
  const nums = text.match(NUMBER_RE) ?? [];
  for (const n of nums) {
    const parsed = parseFloat(n.replace(",", "."));
    if (!Number.isFinite(parsed)) continue;
    const key = `n:${parsed}`;
    if (matched.has(key)) continue;
    for (const cand of candidates.numbers) {
      if (numberMatches(parsed, cand)) {
        matched.add(key);
        break;
      }
    }
  }

  // Token matches — whole word / phrase, lowercase.
  const lower = text.toLowerCase();
  for (const tok of candidates.tokens) {
    if (matched.has(`t:${tok}`)) continue;
    if (containsTokenPhrase(lower, tok)) matched.add(`t:${tok}`);
  }

  return matched.size;
}

function numberMatches(a: number, b: number): boolean {
  if (a === b) return true;
  // For integers, demand exact equality.
  if (Number.isInteger(a) && Number.isInteger(b)) return false;
  return Math.abs(a - b) <= 0.1;
}

function containsTokenPhrase(haystackLower: string, needleLower: string): boolean {
  if (needleLower.length < 2) return false;
  if (needleLower.includes(" ")) {
    return haystackLower.includes(needleLower);
  }
  // Word-boundary check using unicode-aware regex.
  const escaped = needleLower.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, "iu");
  return re.test(haystackLower);
}

// ─── Section iteration ──────────────────────────────────────────────────

function* iterSectionTexts(r: ReportJSON): Generator<[string, string]> {
  if (r.headline) yield ["headline", r.headline];
  if (r.executive_summary) yield ["executive_summary", r.executive_summary];
  if (r.top_priority) yield ["top_priority", r.top_priority];
  if (r.systemic_connections_overview) {
    yield ["systemic_connections_overview", r.systemic_connections_overview];
  } else if (r.systemic_connections) {
    yield ["systemic_connections_overview", r.systemic_connections];
  }
  if (r.prognose_30_days) yield ["prognose_30_days", r.prognose_30_days];

  const m = r.modules;
  for (const dim of ["sleep", "recovery", "activity", "metabolic", "stress", "vo2max"] as const) {
    const mod = m[dim];
    const text = [
      mod.score_context,
      mod.key_finding,
      mod.systemic_connection,
      mod.limitation,
      mod.recommendation,
      mod.main_finding,
      mod.interpretation,
      mod.systemic_impact,
      mod.overtraining_signal,
      mod.met_context,
      mod.sitting_flag,
      mod.bmi_context,
      mod.hpa_context,
      mod.estimation_note,
      mod.fitness_context,
    ]
      .filter(Boolean)
      .join(" ");
    if (text) yield [`modules.${dim}`, text];
  }

  // Daily protocol — flatten into a single section text for banlist scan,
  // but separate buckets for training-jargon scanner downstream.
  if (r.daily_life_protocol) {
    const dlp = r.daily_life_protocol;
    const buckets = ["morning", "work_day", "evening", "nutrition_micro"] as const;
    for (const b of buckets) {
      const arr = dlp[b];
      if (!arr || arr.length === 0) continue;
      const text = arr
        .map((h) => `${h.habit} ${h.why_specific_to_user}`)
        .join(" ");
      yield [`daily_life_protocol.${b}`, text];
    }
  }
}

// ─── Time-budget summing ────────────────────────────────────────────────

export function sumDailyProtocolTime(r: ReportJSON): number {
  const dlp = r.daily_life_protocol;
  if (!dlp) return 0;
  let total = 0;
  for (const b of ["morning", "work_day", "evening", "nutrition_micro"] as const) {
    const arr = dlp[b];
    if (!arr) continue;
    for (const h of arr) total += h.time_cost_min ?? 0;
  }
  return total;
}

// ─── Report-type conformance ────────────────────────────────────────────

function checkReportTypeConformance(
  r: ReportJSON,
  ctx: ReportContext,
  errors: ValidatorIssue[],
  repairSections: Set<string>,
): boolean {
  const reportType = ctx.meta.report_type;
  if (reportType === "complete") return true;

  // For metabolic / recovery reports the named module must surface in
  // top_priority OR in the headline / executive_summary text. We accept
  // either signal — Stage-A is responsible for actually weighting modules,
  // Stage-B reflects that weighting in prose.
  const targetModule = reportType === "metabolic" ? "metabolic" : "recovery";
  const corpus = `${r.headline} ${r.executive_summary} ${r.top_priority}`.toLowerCase();
  const mentioned =
    corpus.includes(targetModule) ||
    corpus.includes(targetModule === "metabolic" ? "stoffwechsel" : "regeneration") ||
    corpus.includes(targetModule === "metabolic" ? "metabolismo" : "recupero") ||
    corpus.includes(targetModule === "metabolic" ? "metabolizma" : "toparlanma");

  if (!mentioned) {
    errors.push({
      kind: "wrong_report_type",
      section: "executive_summary",
      detail: `report_type=${reportType} but ${targetModule} module not foregrounded in headline/exec/top_priority`,
      meta: { report_type: reportType, target_module: targetModule },
    });
    repairSections.add("headline");
    repairSections.add("executive_summary");
    repairSections.add("top_priority");
    return false;
  }
  return true;
}

// ─── Training jargon scanner ────────────────────────────────────────────

interface TrainingJargonHit {
  section: string;
  match: string;
}

function scanDailyProtocolForTraining(r: ReportJSON): TrainingJargonHit[] {
  const hits: TrainingJargonHit[] = [];
  const dlp = r.daily_life_protocol;
  if (!dlp) return hits;
  for (const bucket of ["morning", "work_day", "evening", "nutrition_micro"] as const) {
    const arr = dlp[bucket];
    if (!arr) continue;
    for (const h of arr) {
      const text = `${h.habit} ${h.why_specific_to_user}`;
      for (const re of TRAINING_JARGON) {
        const m = text.match(re);
        if (m) hits.push({ section: `daily_life_protocol.${bucket}`, match: m[0] });
      }
    }
  }
  return hits;
}
