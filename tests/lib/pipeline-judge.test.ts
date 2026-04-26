import { describe, expect, it } from "vitest";
import { runMainReportJudge } from "@/lib/reports/pipeline";
import { JUDGE_SYSTEM_PROMPT, buildJudgeUserPrompt } from "@/lib/report/prompts/v4/judge-prompt";

import { makeMockAnthropic } from "../fixtures/mock-anthropic";
import { buildValidAnalysisFor } from "../fixtures/build-analysis";
import { buildValidReportFor, buildValidJudgeResult } from "../fixtures/build-report";
import { beginnerContext } from "../fixtures/profiles/beginner";
import { metabolicContext } from "../fixtures/profiles/metabolic";

describe("JUDGE_SYSTEM_PROMPT", () => {
  it("declares JSON-only output", () => {
    expect(JUDGE_SYSTEM_PROMPT.toLowerCase()).toContain("json");
    expect(JUDGE_SYSTEM_PROMPT).toContain("JudgeResult");
  });

  it("specifies the repair_required threshold", () => {
    expect(JUDGE_SYSTEM_PROMPT).toContain("70");
  });
});

describe("buildJudgeUserPrompt", () => {
  it("includes ctx, analysis, and report blocks", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    const r = buildValidReportFor(beginnerContext);
    const prompt = buildJudgeUserPrompt(beginnerContext, a, r);
    expect(prompt).toContain("## ReportContext");
    expect(prompt).toContain("## AnalysisJSON");
    expect(prompt).toContain("## ReportJSON (Writer Output)");
  });

  it("uses locale-aware header for metabolic context", () => {
    const a = buildValidAnalysisFor(metabolicContext);
    const r = buildValidReportFor(metabolicContext);
    const prompt = buildJudgeUserPrompt(metabolicContext, a, r);
    expect(prompt).toContain("Bewerte"); // de header
  });
});

describe("runMainReportJudge", () => {
  it("returns ok=true with a valid JudgeResult", async () => {
    const a = buildValidAnalysisFor(beginnerContext);
    const r = buildValidReportFor(beginnerContext);
    const j = buildValidJudgeResult();
    const client = makeMockAnthropic({ response: { text: JSON.stringify(j) } });
    const result = await runMainReportJudge(beginnerContext, a, r, { client });
    if (!result.ok) {
      throw new Error(`judge failed: ${JSON.stringify(result.error)}`);
    }
    expect(result.judge.overall_score).toBe(82);
    expect(result.judge.repair_required).toBe(false);
  });

  it("returns schema_invalid for malformed JudgeResult", async () => {
    const a = buildValidAnalysisFor(beginnerContext);
    const r = buildValidReportFor(beginnerContext);
    const client = makeMockAnthropic({
      response: { text: JSON.stringify({ overall_score: "not-a-number" }) },
    });
    const result = await runMainReportJudge(beginnerContext, a, r, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("schema_invalid");
  });

  it("returns non_json_response when judge emits prose", async () => {
    const a = buildValidAnalysisFor(beginnerContext);
    const r = buildValidReportFor(beginnerContext);
    const client = makeMockAnthropic({ response: { text: "looks good" } });
    const result = await runMainReportJudge(beginnerContext, a, r, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("non_json_response");
  });
});
