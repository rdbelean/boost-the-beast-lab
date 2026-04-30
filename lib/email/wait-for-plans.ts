// Server-side waiter for plan-PDF Storage uploads.
//
// Polls pdf_generation_status for the four plan types until they all
// report "ready" or until a timeout. After the timeout, optionally
// invokes a fallback generator for whatever is still missing — used
// by /api/report/generate's after()-block to guarantee plan PDFs
// land in Storage even when the client tab disconnects mid-flight
// on mobile.

import { getStatus, type PdfType } from "@/lib/pdf/status";
import type { PlanType } from "@/lib/plan/prompts/full-prompts";
import type { Locale } from "@/lib/supabase/types";

type PlanPdfType = "plan_activity" | "plan_metabolic" | "plan_recovery" | "plan_stress";

const PLAN_PDF_TYPES: PlanPdfType[] = [
  "plan_activity",
  "plan_metabolic",
  "plan_recovery",
  "plan_stress",
];

const PDF_TYPE_TO_PLAN_TYPE: Record<PlanPdfType, PlanType> = {
  plan_activity: "activity",
  plan_metabolic: "metabolic",
  plan_recovery: "recovery",
  plan_stress: "stress",
};

export interface WaitForPlansOptions {
  /** Hard deadline before the fallbackGenerator kicks in. Default 90_000 ms. */
  timeoutMs?: number;
  /** Polling cadence while waiting. Default 5_000 ms. */
  pollIntervalMs?: number;
  /**
   * Optional generator that produces + uploads ONE missing plan PDF.
   * Called once per still-missing plan after the timeout elapses.
   * Should be idempotent (re-callable for the same plan with no harm).
   */
  fallbackGenerator?: (planType: PlanType) => Promise<unknown>;
}

export interface WaitForPlansResult {
  /** True iff all 4 plan PDFs are in Storage at the end (after fallback). */
  allReady: boolean;
  /** Plans that the fallback generator was actually invoked for. */
  fallbackTriggered: PlanType[];
  /** Plans still missing in Storage after the fallback (failure cases). */
  stillMissing: PlanPdfType[];
}

/**
 * Wait for the 4 plan PDFs to appear in Storage; if a deadline elapses
 * with some still missing, invoke the optional fallbackGenerator and
 * re-check.
 *
 * Typical timing on Production:
 *   Desktop normal flow → frontend uploads ~30-45s after submit, this
 *   loop returns allReady=true on the second or third poll.
 *   Mobile tab-switch → no frontend uploads land, loop polls for 90s,
 *   then fallback generates the 4 missing plans server-side
 *   (~30-60s extra), final check returns allReady=true.
 */
export async function waitForPlansReady(
  assessmentId: string,
  locale: Locale,
  opts: WaitForPlansOptions = {},
): Promise<WaitForPlansResult> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 5_000;
  const deadline = Date.now() + timeoutMs;

  // Phase 1 — poll for frontend-driven uploads.
  let missing = await checkMissing(assessmentId, locale);
  while (missing.length > 0 && Date.now() < deadline) {
    await sleep(pollIntervalMs);
    missing = await checkMissing(assessmentId, locale);
  }
  if (missing.length === 0) {
    return { allReady: true, fallbackTriggered: [], stillMissing: [] };
  }

  // Phase 2 — timeout reached; invoke fallbackGenerator for what is missing.
  const fallbackTriggered: PlanType[] = [];
  if (opts.fallbackGenerator) {
    await Promise.allSettled(
      missing.map(async (pdfType) => {
        const planType = PDF_TYPE_TO_PLAN_TYPE[pdfType];
        try {
          await opts.fallbackGenerator!(planType);
          fallbackTriggered.push(planType);
        } catch (err) {
          console.error(`[wait-for-plans] fallback failed for ${planType}:`, err);
        }
      }),
    );
  }

  // Phase 3 — final status check after fallback.
  const stillMissing = await checkMissing(assessmentId, locale);
  return {
    allReady: stillMissing.length === 0,
    fallbackTriggered,
    stillMissing,
  };
}

async function checkMissing(
  assessmentId: string,
  locale: Locale,
): Promise<PlanPdfType[]> {
  const results = await Promise.all(
    PLAN_PDF_TYPES.map(async (t) => {
      try {
        const s = await getStatus(assessmentId, t as PdfType, locale);
        return { type: t, ready: s?.status === "ready" && !!s.storage_path };
      } catch (err) {
        console.error(`[wait-for-plans] getStatus failed for ${t}:`, err);
        return { type: t, ready: false };
      }
    }),
  );
  return results.filter((r) => !r.ready).map((r) => r.type);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
