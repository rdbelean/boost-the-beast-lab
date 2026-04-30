import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitForPlansReady } from "@/lib/email/wait-for-plans";
import { isMissingColumnError } from "@/lib/email/dispatch-report";

// ─── Mock helpers ───────────────────────────────────────────────────────
//
// We mock @/lib/pdf/status (used by waitForPlansReady) and
// @/lib/supabase/server (used by the lock helpers). Tests stay
// fully unit-level — no real DB, no real Resend, no real Anthropic.

vi.mock("@/lib/pdf/status", () => ({
  getStatus: vi.fn(),
}));

import { getStatus } from "@/lib/pdf/status";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── isMissingColumnError ──────────────────────────────────────────────

describe("isMissingColumnError — migration-fallback predicate", () => {
  it("matches PostgreSQL 'column does not exist' wording", () => {
    expect(isMissingColumnError("column report_jobs.email_sent_at does not exist"))
      .toBe(true);
  });

  it("matches PostgREST 'could not find ... column' wording", () => {
    expect(isMissingColumnError("Could not find the 'email_sent_at' column of 'report_jobs'"))
      .toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isMissingColumnError("connection refused")).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
    expect(isMissingColumnError(undefined)).toBe(false);
  });
});

// ─── waitForPlansReady ──────────────────────────────────────────────────

describe("waitForPlansReady — polling + fallback", () => {
  const PLAN_TYPES = [
    "plan_activity",
    "plan_metabolic",
    "plan_recovery",
    "plan_stress",
  ] as const;

  it("returns allReady=true immediately when all 4 plans are already ready", async () => {
    vi.mocked(getStatus).mockResolvedValue({
      id: "x",
      assessment_id: "a1",
      pdf_type: "plan_activity",
      locale: "de",
      status: "ready",
      storage_path: "a1/de/activity.pdf",
      created_at: "",
      updated_at: "",
    });

    const result = await waitForPlansReady("a1", "de", {
      timeoutMs: 50,
      pollIntervalMs: 5,
    });
    expect(result.allReady).toBe(true);
    expect(result.fallbackTriggered).toEqual([]);
    expect(result.stillMissing).toEqual([]);
  });

  it("after timeout, calls fallbackGenerator for each missing plan", async () => {
    // First poll: nothing ready. After fallback runs: still nothing ready.
    vi.mocked(getStatus).mockResolvedValue({
      id: "x",
      assessment_id: "a2",
      pdf_type: "plan_activity",
      locale: "de",
      status: "pending",
      storage_path: null,
      created_at: "",
      updated_at: "",
    });

    const fallbackGenerator = vi.fn().mockResolvedValue({ status: "skipped" });

    const result = await waitForPlansReady("a2", "de", {
      timeoutMs: 5,  // immediate timeout
      pollIntervalMs: 5,
      fallbackGenerator,
    });
    expect(fallbackGenerator).toHaveBeenCalledTimes(4);
    expect(fallbackGenerator).toHaveBeenCalledWith("activity");
    expect(fallbackGenerator).toHaveBeenCalledWith("metabolic");
    expect(fallbackGenerator).toHaveBeenCalledWith("recovery");
    expect(fallbackGenerator).toHaveBeenCalledWith("stress");
    expect(result.allReady).toBe(false);  // still pending after fallback returned skipped
    expect(result.fallbackTriggered.sort()).toEqual([
      "activity", "metabolic", "recovery", "stress",
    ]);
  });

  it("returns stillMissing=[] when fallback successfully produces all plans", async () => {
    let fallbackHasRun = false;
    vi.mocked(getStatus).mockImplementation(async (assessmentId, pdfType) => ({
      id: "x",
      assessment_id: assessmentId,
      pdf_type: pdfType,
      locale: "de",
      status: fallbackHasRun ? "ready" : "pending",
      storage_path: fallbackHasRun ? `${assessmentId}/de/${pdfType}.pdf` : null,
      created_at: "",
      updated_at: "",
    }));

    const fallbackGenerator = vi.fn().mockImplementation(async () => {
      fallbackHasRun = true;
      return { status: "generated" };
    });

    const result = await waitForPlansReady("a3", "de", {
      timeoutMs: 5,
      pollIntervalMs: 5,
      fallbackGenerator,
    });
    expect(fallbackGenerator).toHaveBeenCalledTimes(4);
    expect(result.allReady).toBe(true);
    expect(result.stillMissing).toEqual([]);
  });

  it("returns stillMissing list when only some plans become ready after fallback", async () => {
    let fallbackHasRun = false;
    vi.mocked(getStatus).mockImplementation(async (assessmentId, pdfType) => {
      // Pre-fallback: all pending. Post-fallback: only activity + metabolic ready.
      const ready =
        fallbackHasRun &&
        (pdfType === "plan_activity" || pdfType === "plan_metabolic");
      return {
        id: "x",
        assessment_id: assessmentId,
        pdf_type: pdfType,
        locale: "de",
        status: ready ? "ready" : "pending",
        storage_path: ready ? `${assessmentId}/de/${pdfType}.pdf` : null,
        created_at: "",
        updated_at: "",
      };
    });

    const fallbackGenerator = vi.fn().mockImplementation(async () => {
      fallbackHasRun = true;
      return { status: "generated" };
    });

    const result = await waitForPlansReady("a4", "de", {
      timeoutMs: 5,
      pollIntervalMs: 5,
      fallbackGenerator,
    });
    expect(result.allReady).toBe(false);
    expect(result.stillMissing.sort()).toEqual(["plan_recovery", "plan_stress"]);
  });

  it("handles getStatus throwing — treats as not-ready", async () => {
    vi.mocked(getStatus).mockRejectedValue(new Error("DB connection refused"));

    const result = await waitForPlansReady("a5", "de", {
      timeoutMs: 5,
      pollIntervalMs: 5,
      // no fallbackGenerator → just returns stillMissing list
    });
    expect(result.allReady).toBe(false);
    expect(result.stillMissing.length).toBe(4);
    expect(result.fallbackTriggered).toEqual([]);
  });

  it("returns the missing list with no fallback triggered when fallbackGenerator is omitted", async () => {
    vi.mocked(getStatus).mockResolvedValue({
      id: "x",
      assessment_id: "a6",
      pdf_type: "plan_activity",
      locale: "de",
      status: "pending",
      storage_path: null,
      created_at: "",
      updated_at: "",
    });

    const result = await waitForPlansReady("a6", "de", {
      timeoutMs: 5,
      pollIntervalMs: 5,
      // fallbackGenerator: undefined
    });
    expect(result.allReady).toBe(false);
    expect(result.fallbackTriggered).toEqual([]);
    expect(result.stillMissing.length).toBe(4);
  });

  it("constants smoke: PLAN_TYPES list contains 4 entries used by the helper", () => {
    expect(PLAN_TYPES.length).toBe(4);
  });
});
