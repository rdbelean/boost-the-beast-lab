import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────
// We mock @/lib/supabase/server so writeTrace + readTrace don't hit the
// real DB. Tests stay unit-level.

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceClient: vi.fn(),
}));

import { writeTrace, readTrace, _internal } from "@/lib/server/pipeline-trace";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── isMissingTableError ──────────────────────────────────────────────

describe("isMissingTableError — migration-fallback predicate", () => {
  it("matches PostgreSQL 'relation does not exist' wording", () => {
    expect(
      _internal.isMissingTableError('relation "pipeline_trace" does not exist'),
    ).toBe(true);
  });

  it("matches PostgREST 'could not find' wording", () => {
    expect(
      _internal.isMissingTableError("Could not find the 'pipeline_trace' table"),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(_internal.isMissingTableError("connection refused")).toBe(false);
    expect(_internal.isMissingTableError(null)).toBe(false);
    expect(_internal.isMissingTableError(undefined)).toBe(false);
  });
});

// ─── writeTrace — graceful fallback semantics ─────────────────────────

describe("writeTrace — defensive write", () => {
  function makeSupabaseChain(opts: {
    insertError?: { message: string } | null;
    insertedId?: string;
  }) {
    const single = vi.fn().mockResolvedValue({
      data: opts.insertedId ? { id: opts.insertedId } : null,
      error: opts.insertError ?? null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    return { from };
  }

  it("returns the inserted id on success", async () => {
    const chain = makeSupabaseChain({ insertedId: "trace-123" });
    vi.mocked(getSupabaseServiceClient).mockReturnValue(chain as never);

    const result = await writeTrace({
      assessmentId: "asmt-1",
      stage: "submit_received",
    });
    expect(result).toBe("trace-123");
    expect(chain.from).toHaveBeenCalledWith("pipeline_trace");
  });

  it("returns null and warns when the table is missing (graceful)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const chain = makeSupabaseChain({
      insertError: { message: 'relation "pipeline_trace" does not exist' },
    });
    vi.mocked(getSupabaseServiceClient).mockReturnValue(chain as never);

    const result = await writeTrace({
      assessmentId: "asmt-2",
      stage: "main_report_started",
    });
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns null on other DB errors (defensive)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain = makeSupabaseChain({
      insertError: { message: "permission denied" },
    });
    vi.mocked(getSupabaseServiceClient).mockReturnValue(chain as never);

    const result = await writeTrace({
      assessmentId: "asmt-3",
      stage: "email_sent",
    });
    expect(result).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("never throws even when supabase client itself throws", async () => {
    vi.mocked(getSupabaseServiceClient).mockImplementation(() => {
      throw new Error("env vars missing");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await writeTrace({
      assessmentId: "asmt-4",
      stage: "trigger_dispatched",
    });
    expect(result).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

// ─── readTrace — chronological retrieval ──────────────────────────────

describe("readTrace — diagnostic read", () => {
  function makeSupabaseChain(opts: {
    rows?: Array<Record<string, unknown>>;
    error?: { message: string } | null;
  }) {
    const order = vi.fn().mockResolvedValue({
      data: opts.rows ?? [],
      error: opts.error ?? null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    return { from };
  }

  it("returns the rows in order when DB returns data", async () => {
    const rows = [
      {
        id: "1",
        assessment_id: "a1",
        stage: "submit_received",
        detail: null,
        duration_ms: null,
        created_at: "2026-04-30T10:00:00Z",
      },
      {
        id: "2",
        assessment_id: "a1",
        stage: "email_sent",
        detail: null,
        duration_ms: 200,
        created_at: "2026-04-30T10:02:30Z",
      },
    ];
    const chain = makeSupabaseChain({ rows });
    vi.mocked(getSupabaseServiceClient).mockReturnValue(chain as never);

    const result = await readTrace("a1");
    expect(result).toHaveLength(2);
    expect(result[0].stage).toBe("submit_received");
    expect(result[1].stage).toBe("email_sent");
  });

  it("returns [] when the table is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const chain = makeSupabaseChain({
      error: { message: 'relation "pipeline_trace" does not exist' },
    });
    vi.mocked(getSupabaseServiceClient).mockReturnValue(chain as never);

    const result = await readTrace("a2");
    expect(result).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns [] on other DB errors", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain = makeSupabaseChain({
      error: { message: "timeout" },
    });
    vi.mocked(getSupabaseServiceClient).mockReturnValue(chain as never);

    const result = await readTrace("a3");
    expect(result).toEqual([]);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
