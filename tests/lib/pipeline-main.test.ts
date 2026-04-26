// End-to-end tests for runMainReportPipeline (Stage A → B → C orchestrator).
// All tests use mock Anthropic — no live API calls.

import { describe, expect, it } from "vitest";
import { runMainReportPipeline } from "@/lib/reports/pipeline";

import { makeMockAnthropic } from "../fixtures/mock-anthropic";
import { buildValidAnalysisFor } from "../fixtures/build-analysis";
import { buildValidReportFor, buildValidJudgeResult } from "../fixtures/build-report";
import { beginnerContext } from "../fixtures/profiles/beginner";
import { athleteContext } from "../fixtures/profiles/athlete";
import { founderContext } from "../fixtures/profiles/founder";
import { metabolicContext } from "../fixtures/profiles/metabolic";

// ─── Happy path over 4 fixtures ─────────────────────────────────────────

describe("runMainReportPipeline — happy path", () => {
  for (const [name, ctx] of [
    ["beginner", beginnerContext],
    ["athlete", athleteContext],
    ["founder", founderContext],
    ["metabolic", metabolicContext],
  ] as const) {
    it(`A→B→C succeeds end-to-end for ${name}`, async () => {
      const analysis = buildValidAnalysisFor(ctx);
      const report = buildValidReportFor(ctx);
      const judge = buildValidJudgeResult();
      const client = makeMockAnthropic({
        response: [
          { text: JSON.stringify(analysis) },
          { text: JSON.stringify(report) },
          { text: JSON.stringify(judge) },
        ],
      });
      const result = await runMainReportPipeline(ctx, { client });
      if (!result.ok) {
        throw new Error(
          `pipeline failed at ${result.stage}: ${JSON.stringify(result.error)}`,
        );
      }
      expect(result.ok).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.validator.ok).toBe(true);
      expect(result.judge?.overall_score).toBe(82);
      expect(result.generations).toHaveLength(3);
      expect(result.generations.map((g) => g.stage)).toEqual([
        "analyst",
        "writer",
        "judge",
      ]);
    });
  }

  it("skipJudge=true skips Stage-C", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    const report = buildValidReportFor(beginnerContext);
    const client = makeMockAnthropic({
      response: [
        { text: JSON.stringify(analysis) },
        { text: JSON.stringify(report) },
      ],
    });
    const result = await runMainReportPipeline(beginnerContext, {
      client,
      skipJudge: true,
    });
    if (!result.ok) {
      throw new Error(`pipeline failed: ${JSON.stringify(result.error)}`);
    }
    expect(result.judge).toBeNull();
    expect(result.generations).toHaveLength(2);
  });
});

// ─── Failure propagation ────────────────────────────────────────────────

describe("runMainReportPipeline — failure propagation", () => {
  it("stage=analyst when Stage-A fails", async () => {
    const client = makeMockAnthropic({
      response: { text: "not valid json at all" },
    });
    const result = await runMainReportPipeline(beginnerContext, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("analyst");
      expect(result.generations).toHaveLength(1);
      expect(result.generations[0].ok).toBe(false);
    }
  });

  it("stage=writer when Stage-B fails", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    const client = makeMockAnthropic({
      response: [
        { text: JSON.stringify(analysis) },
        { text: "not a report" },
      ],
    });
    const result = await runMainReportPipeline(beginnerContext, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("writer");
      expect(result.analysis).toBeDefined();
      expect(result.generations).toHaveLength(2);
    }
  });

  it("stage=validator when deterministic validator fails", async () => {
    // Build a report with a banlist hit in the headline (strict section).
    const analysis = buildValidAnalysisFor(beginnerContext);
    const report = buildValidReportFor(beginnerContext);
    report.headline = "Es ist wichtig, dass du genug schläfst.";
    const client = makeMockAnthropic({
      response: [
        { text: JSON.stringify(analysis) },
        { text: JSON.stringify(report) },
      ],
    });
    const result = await runMainReportPipeline(beginnerContext, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("validator");
      expect(result.report).toBeDefined();
      expect(result.validator?.ok).toBe(false);
      // Validator failure does not call the judge — generations has 2 entries.
      expect(result.generations).toHaveLength(2);
    }
  });

  it("judge failure does NOT fail the pipeline (judge is advisory in phase 5)", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    const report = buildValidReportFor(beginnerContext);
    const client = makeMockAnthropic({
      response: [
        { text: JSON.stringify(analysis) },
        { text: JSON.stringify(report) },
        { text: "judge cannot judge" }, // bad judge response
      ],
    });
    const result = await runMainReportPipeline(beginnerContext, { client });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.judge).toBeNull();
      const judgeGen = result.generations.find((g) => g.stage === "judge");
      expect(judgeGen?.ok).toBe(false);
    }
  });
});

// ─── Diff test: 4 distinct profiles produce distinct reports ────────────

describe("runMainReportPipeline — fixture diff", () => {
  it("beginner and metabolic profiles produce different reports", async () => {
    const aBeginner = buildValidAnalysisFor(beginnerContext);
    const rBeginner = buildValidReportFor(beginnerContext);
    const aMetabolic = buildValidAnalysisFor(metabolicContext);
    const rMetabolic = buildValidReportFor(metabolicContext);

    const clientB = makeMockAnthropic({
      response: [
        { text: JSON.stringify(aBeginner) },
        { text: JSON.stringify(rBeginner) },
        { text: JSON.stringify(buildValidJudgeResult()) },
      ],
    });
    const clientM = makeMockAnthropic({
      response: [
        { text: JSON.stringify(aMetabolic) },
        { text: JSON.stringify(rMetabolic) },
        { text: JSON.stringify(buildValidJudgeResult()) },
      ],
    });

    const resB = await runMainReportPipeline(beginnerContext, { client: clientB });
    const resM = await runMainReportPipeline(metabolicContext, { client: clientM });
    if (!resB.ok || !resM.ok) throw new Error("pipeline did not succeed");

    expect(resB.report.headline).not.toEqual(resM.report.headline);
    expect(resB.report.executive_summary).not.toEqual(resM.report.executive_summary);
    expect(resB.report.modules.metabolic.bmi_context).not.toEqual(
      resM.report.modules.metabolic.bmi_context,
    );
  });
});
