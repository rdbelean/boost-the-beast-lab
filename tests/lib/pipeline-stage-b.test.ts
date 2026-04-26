import { describe, expect, it } from "vitest";
import { runMainReportWriter } from "@/lib/reports/pipeline";
import { buildWriterUserPrompt } from "@/lib/report/prompts/v4/writer-user";
import { getWriterSystemPrompt } from "@/lib/report/prompts/v4/writer-system";
import { DISCLAIMER } from "@/lib/report/prompts/v4/disclaimer";

import { makeMockAnthropic } from "../fixtures/mock-anthropic";
import { buildValidAnalysisFor } from "../fixtures/build-analysis";
import { buildValidReportFor } from "../fixtures/build-report";
import { beginnerContext } from "../fixtures/profiles/beginner";
import { athleteContext } from "../fixtures/profiles/athlete";
import { founderContext } from "../fixtures/profiles/founder";
import { metabolicContext } from "../fixtures/profiles/metabolic";

// ─── System prompts ─────────────────────────────────────────────────────

describe("getWriterSystemPrompt", () => {
  it("returns a German prompt for de", () => {
    const p = getWriterSystemPrompt("de");
    expect(p).toContain("Performance-Intelligence-Report-Autor");
    expect(p).toContain('"du"-Form');
  });

  it("returns an English prompt for en", () => {
    const p = getWriterSystemPrompt("en");
    expect(p).toContain("Performance-Intelligence-Report author");
    expect(p.toLowerCase()).toContain("second person");
  });

  it("returns an Italian prompt for it", () => {
    const p = getWriterSystemPrompt("it");
    expect(p).toContain("italiano");
  });

  it("returns a Turkish prompt for tr", () => {
    const p = getWriterSystemPrompt("tr");
    expect(p).toContain("Türkçe");
  });

  it("each locale's prompt embeds the matching disclaimer text", () => {
    expect(getWriterSystemPrompt("de")).toContain(DISCLAIMER.de);
    expect(getWriterSystemPrompt("en")).toContain(DISCLAIMER.en);
    expect(getWriterSystemPrompt("it")).toContain(DISCLAIMER.it);
    expect(getWriterSystemPrompt("tr")).toContain(DISCLAIMER.tr);
  });

  it("each locale's prompt forbids structured training in daily protocol", () => {
    for (const loc of ["de", "en", "it", "tr"] as const) {
      expect(getWriterSystemPrompt(loc).toUpperCase()).toContain("HIIT");
    }
  });
});

// ─── User prompt ────────────────────────────────────────────────────────

describe("buildWriterUserPrompt", () => {
  it("includes the AnalysisJSON block", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    const prompt = buildWriterUserPrompt(beginnerContext, a);
    expect(prompt).toContain("## AnalysisJSON");
    expect(prompt).toContain("## ReportContext");
  });

  it("uses German header for de locale", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    const prompt = buildWriterUserPrompt(beginnerContext, a);
    expect(prompt).toContain("Erzeuge jetzt den ReportJSON");
  });

  it("includes raw user values from ctx", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    const prompt = buildWriterUserPrompt(beginnerContext, a);
    expect(prompt).toContain("4200"); // daily_steps
    expect(prompt).toContain("5.8");  // sleep_duration_hours
  });
});

// ─── runMainReportWriter — happy path over 4 fixtures ───────────────────

describe("runMainReportWriter — happy path", () => {
  for (const [name, ctx] of [
    ["beginner", beginnerContext],
    ["athlete", athleteContext],
    ["founder", founderContext],
    ["metabolic", metabolicContext],
  ] as const) {
    it(`returns ok=true and a valid ReportJSON for ${name}`, async () => {
      const analysis = buildValidAnalysisFor(ctx);
      const report = buildValidReportFor(ctx);
      const client = makeMockAnthropic({ response: { text: JSON.stringify(report) } });
      const result = await runMainReportWriter(ctx, analysis, { client });
      if (!result.ok) {
        throw new Error(`writer failed: ${JSON.stringify(result.error)}`);
      }
      expect(result.ok).toBe(true);
      expect(result.report.disclaimer).toBe(DISCLAIMER[ctx.meta.locale]);
      expect(result.report._meta.stage).toBe("writer");
      expect(typeof result.report.headline).toBe("string");
    });
  }
});

describe("runMainReportWriter — error paths", () => {
  it("returns non_json_response when the model emits prose", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    const client = makeMockAnthropic({ response: { text: "Sure, here you go." } });
    const result = await runMainReportWriter(beginnerContext, analysis, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("non_json_response");
  });

  it("returns schema_invalid when JSON parses but breaks the schema", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    const client = makeMockAnthropic({
      response: { text: JSON.stringify({ headline: "x" }) },
    });
    const result = await runMainReportWriter(beginnerContext, analysis, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("schema_invalid");
  });

  it("returns anthropic_call_failed when the client throws", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    const client = makeMockAnthropic({
      response: { text: "x" },
      throws: new Error("rate limited"),
    });
    const result = await runMainReportWriter(beginnerContext, analysis, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("anthropic_call_failed");
  });

  it("strips markdown fences before parsing", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    const report = buildValidReportFor(beginnerContext);
    const client = makeMockAnthropic({
      response: { text: "```json\n" + JSON.stringify(report) + "\n```" },
    });
    const result = await runMainReportWriter(beginnerContext, analysis, { client });
    expect(result.ok).toBe(true);
  });
});
