// Anthropic cost tracking — derives the dollar cost of each
// Sonnet/Haiku call from token usage and accumulates it per
// assessment + per user.
//
// Pricing source: https://docs.anthropic.com/en/docs/about-claude/models
// As of 2026-01 (last cutoff). Update PRICING when Anthropic changes
// rates — values are USD per 1k tokens, stored as cents (USD ¢) to
// keep DB columns integer-typed.
//
// The DB columns are INTEGER cents, so we Math.ceil the float result
// from the pricing math. A single cent rounding error over thousands
// of calls is acceptable; the goal is cost-cap enforcement, not
// accounting accuracy.

import type { SupabaseClient } from "@supabase/supabase-js";

// USD ¢ per token. Sonnet 4.6: $3/M input, $15/M output → 0.0003 / 0.0015 ¢
// Haiku 4.5: $0.80/M input, $4/M output → 0.00008 / 0.0004 ¢
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 0.0003, output: 0.0015 },
  "claude-haiku-4-5-20251001": { input: 0.00008, output: 0.0004 },
  "claude-haiku-4-5": { input: 0.00008, output: 0.0004 },
  "claude-opus-4-7": { input: 0.0015, output: 0.0075 }, // future-proofing
};

/** USD cents (float, will be ceiled when persisted). Returns 0 for unknown models. */
export function computeCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model];
  if (!p) {
    console.warn(`[anthropic-cost] unknown model "${model}", cost not tracked`);
    return 0;
  }
  return Math.ceil(inputTokens * p.input + outputTokens * p.output);
}

/** Per-user spending cap in cents. Pre-check refuses Anthropic calls
 *  once a user has burned through this much. 5000 ¢ = $50 USD. */
export const USER_COST_CAP_CENTS = 5000;

/** Higher cap when an actual user identity is missing (assessment-only
 *  guest flow). Used in `checkAssessmentCostCap`. */
export const ASSESSMENT_COST_CAP_CENTS = 1500; // $15 per assessment

export interface TrackCostOpts {
  assessmentId?: string | null;
  userId?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Atomically increment cost + token counters on `assessments` and (when
 * userId provided) `users`. Uses Postgres RPCs declared in
 * supabase/add_anthropic_cost_tracking.sql so concurrent Claude calls
 * for the same assessment don't lose updates.
 *
 * Fail-soft: any DB error is logged and swallowed. Cost tracking must
 * not break the user's report generation.
 */
export async function trackAnthropicCost(
  supabase: SupabaseClient,
  opts: TrackCostOpts,
): Promise<{ cents: number }> {
  const cents = computeCostCents(opts.model, opts.inputTokens, opts.outputTokens);
  if (cents <= 0) return { cents: 0 };
  try {
    if (opts.assessmentId) {
      const { error } = await supabase.rpc("increment_assessment_cost", {
        aid: opts.assessmentId,
        cents,
        in_tok: opts.inputTokens,
        out_tok: opts.outputTokens,
      });
      if (error) console.warn("[anthropic-cost] increment_assessment_cost failed:", error.message);
    }
    if (opts.userId) {
      const { error } = await supabase.rpc("increment_user_cost", {
        uid: opts.userId,
        cents,
      });
      if (error) console.warn("[anthropic-cost] increment_user_cost failed:", error.message);
    }
  } catch (err) {
    console.warn("[anthropic-cost] tracking exception:", err);
  }
  return { cents };
}

/** Check whether the user has already hit the spending cap. Returns
 *  `null` if OK, or a reason string when the cap is breached.
 *  Fail-soft: DB errors return null (don't block report generation). */
export async function checkUserCostCap(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ blocked: true; spent: number; cap: number } | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("total_anthropic_cost_cents")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    const spent = data.total_anthropic_cost_cents ?? 0;
    if (spent >= USER_COST_CAP_CENTS) {
      return { blocked: true, spent, cap: USER_COST_CAP_CENTS };
    }
    return null;
  } catch {
    return null;
  }
}

/** Same for an assessment-scoped cap. Useful when guest checkout
 *  triggers many Anthropic calls for one assessmentId. */
export async function checkAssessmentCostCap(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<{ blocked: true; spent: number; cap: number } | null> {
  try {
    const { data, error } = await supabase
      .from("assessments")
      .select("anthropic_cost_cents")
      .eq("id", assessmentId)
      .single();
    if (error || !data) return null;
    const spent = data.anthropic_cost_cents ?? 0;
    if (spent >= ASSESSMENT_COST_CAP_CENTS) {
      return { blocked: true, spent, cap: ASSESSMENT_COST_CAP_CENTS };
    }
    return null;
  } catch {
    return null;
  }
}
