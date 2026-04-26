import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shouldUseV4Pipeline } from "@/lib/reports/feature-flag";

describe("shouldUseV4Pipeline", () => {
  const ENV_KEYS = ["REPORT_PIPELINE_V4", "VERCEL_ENV"] as const;
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) original[k] = process.env[k];
    for (const k of ENV_KEYS) delete process.env[k];
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  });

  it("returns true when REPORT_PIPELINE_V4=true", () => {
    process.env.REPORT_PIPELINE_V4 = "true";
    expect(shouldUseV4Pipeline()).toBe(true);
  });

  it("returns false when REPORT_PIPELINE_V4=false (rollback)", () => {
    process.env.REPORT_PIPELINE_V4 = "false";
    process.env.VERCEL_ENV = "preview";
    expect(shouldUseV4Pipeline()).toBe(false);
  });

  it("returns true when only VERCEL_ENV=preview", () => {
    process.env.VERCEL_ENV = "preview";
    expect(shouldUseV4Pipeline()).toBe(true);
  });

  it("returns false when VERCEL_ENV=production", () => {
    process.env.VERCEL_ENV = "production";
    expect(shouldUseV4Pipeline()).toBe(false);
  });

  it("returns false when no env vars are set (local dev)", () => {
    expect(shouldUseV4Pipeline()).toBe(false);
  });
});
