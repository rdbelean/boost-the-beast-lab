import type { MasterPlan } from "./schema";
import { getForbiddenPhrases, type Locale, type MasterPlanInputs } from "./prompts";

const SCORE_REFERENCE_PATTERN =
  /\b(Activity|Metabolic|Metabolik|Metabolico|Recovery|Stress)\b[\s\S]{0,30}?\b(Score|Punkt|skor)\b[\s\S]{0,30}?\b\d+\s*\/\s*100\b/gi;
const SCORE_NAME_ONLY = /\b(Activity|Metabolic|Recovery|Stress)\s+Score\b/gi;
const REST_TOKENS_RE = /^(rest|pause|riposo|dinlenme)\b/i;

function flattenCells(plan: MasterPlan): string[] {
  const out: string[] = [];
  for (const r of plan.rows) {
    out.push(...r.training, ...r.nutrition, ...r.recovery, ...r.stress_anchor);
  }
  return out;
}

function cellsByCol(plan: MasterPlan, col: "training" | "nutrition" | "recovery" | "stress_anchor"): string[][] {
  return plan.rows.map((r) => r[col]);
}

function isRestCell(items: string[]): boolean {
  return items.length === 1 && REST_TOKENS_RE.test(items[0].trim());
}

interface IntensityCaps {
  maxTrainingDays: number;
  forbidden: string[];
}

function capsForStress(stress: number): IntensityCaps {
  if (stress < 50) return { maxTrainingDays: 3, forbidden: ["hiit", "tempo-lauf", "tempo run", "vo2max-intervalle", "vo2max intervals"] };
  if (stress < 65) return { maxTrainingDays: 4, forbidden: ["hiit", "tempo-lauf", "tempo run"] };
  if (stress < 80) return { maxTrainingDays: 5, forbidden: [] };
  return { maxTrainingDays: 6, forbidden: [] };
}

function sleepCutoff(sleep: number): number | null {
  if (sleep < 60) return 17;
  if (sleep < 75) return 18;
  return null;
}

const LATE_TIME_RE = /(1[7-9]|2[0-3])(:00|\s*uhr|\s*pm)/i;

function lowerJoin(s: string[]): string {
  return s.join(" ").toLowerCase();
}

export interface ValidateOptions {
  locale: Locale;
  inputs: MasterPlanInputs;
}

export function validateMasterPlan(
  plan: MasterPlan,
  opts: ValidateOptions,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { locale, inputs } = opts;

  // 1. Forbidden-phrases (whole plan)
  const allCellsLower = flattenCells(plan).map((s) => s.toLowerCase()).join(" || ");
  const introLower = plan.intro.toLowerCase();
  for (const phrase of getForbiddenPhrases(locale)) {
    if (allCellsLower.includes(phrase) || introLower.includes(phrase)) {
      reasons.push(`forbidden_phrase_${phrase.replace(/\s+/g, "_")}`);
    }
  }

  // 2. Score-references
  const wholeText = plan.intro + " " + flattenCells(plan).join(" ");
  if (SCORE_REFERENCE_PATTERN.test(wholeText) || SCORE_NAME_ONLY.test(wholeText)) {
    reasons.push("score_reference_present");
  }
  SCORE_REFERENCE_PATTERN.lastIndex = 0;
  SCORE_NAME_ONLY.lastIndex = 0;

  // 3. Stress-cap on training days
  const trainingByDay = cellsByCol(plan, "training");
  const trainingDayCount = trainingByDay.filter((c) => !isRestCell(c)).length;
  const caps = capsForStress(inputs.scores.stress);
  if (trainingDayCount > caps.maxTrainingDays) {
    reasons.push(`stress_cap_violation_${trainingDayCount}_max_${caps.maxTrainingDays}`);
  }

  // 4. Forbidden intensities per stress tier
  if (caps.forbidden.length > 0) {
    const trainingTextLower = trainingByDay.flat().map((s) => s.toLowerCase()).join(" || ");
    for (const f of caps.forbidden) {
      if (trainingTextLower.includes(f)) {
        reasons.push(`forbidden_intensity_${f.replace(/\s+/g, "_")}`);
      }
    }
  }

  // 5. Sleep cutoff — late-hour mentions in training
  const cutoff = sleepCutoff(inputs.scores.sleep);
  if (cutoff !== null) {
    trainingByDay.forEach((cells, idx) => {
      const text = cells.join(" ");
      const m = text.match(LATE_TIME_RE);
      if (m) {
        const hour = parseInt(m[1], 10);
        if (hour >= cutoff) {
          const day = plan.rows[idx].day;
          reasons.push(`sleep_cutoff_violation_${day}_${hour}`);
        }
      }
    });
  }

  // 6. Activity >= 85 → no volume-push
  if (inputs.scores.activity >= 85) {
    const volumePushRe = /\b(erhöhe[a-z]*\s+das\s+volumen|increase\s+volume|add\s+\d+\s+(min|km|sets)|progress(ion)?\s+to\s+\d+)/i;
    const trainingText = trainingByDay.flat().join(" ");
    if (volumePushRe.test(trainingText)) {
      reasons.push("volume_push_violation");
    }
  }

  // 7. Goal-mention in intro
  if (inputs.goal_dropdown) {
    const dropdownLower = inputs.goal_dropdown.toLowerCase();
    const tokens = dropdownLower.split(/[_\s]+/).filter((t) => t.length >= 3);
    const found = tokens.some((t) => introLower.includes(t));
    if (!found) {
      reasons.push(`goal_not_mentioned_dropdown_${inputs.goal_dropdown}`);
    }
  }
  if (inputs.goal_freetext && inputs.goal_freetext.trim().length > 0) {
    const freetextTokens = inputs.goal_freetext
      .toLowerCase()
      .split(/[^a-zäöüß0-9]+/)
      .filter((t) => t.length >= 4);
    const distinctFound = new Set(freetextTokens.filter((t) => introLower.includes(t)));
    if (distinctFound.size < 1) {
      reasons.push("goal_not_mentioned_freetext");
    }
  }

  return { ok: reasons.length === 0, reasons };
}
