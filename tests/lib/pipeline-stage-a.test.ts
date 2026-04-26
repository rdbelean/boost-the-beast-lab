import { describe, expect, it } from "vitest";
import { runMainReportAnalysis, cleanJsonText } from "@/lib/reports/pipeline";
import { resolvePath, findInvalidEvidencePaths } from "@/lib/reports/evidence-field-resolver";
import { buildAnalysisUserPrompt } from "@/lib/report/prompts/v4/analysis-user";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/report/prompts/v4/analysis-system";

import { makeMockAnthropic } from "../fixtures/mock-anthropic";
import { buildValidAnalysisFor } from "../fixtures/build-analysis";
import { beginnerContext } from "../fixtures/profiles/beginner";
import { athleteContext } from "../fixtures/profiles/athlete";
import { founderContext } from "../fixtures/profiles/founder";
import { metabolicContext } from "../fixtures/profiles/metabolic";

// ─── Path resolver ──────────────────────────────────────────────────────

describe("resolvePath", () => {
  it("resolves a top-level path", () => {
    expect(resolvePath(beginnerContext, "user.age").exists).toBe(true);
    expect(resolvePath(beginnerContext, "user.age").value).toBe(34);
  });

  it("resolves a nested scoring path", () => {
    const r = resolvePath(beginnerContext, "scoring.result.sleep.sleep_score_0_100");
    expect(r.exists).toBe(true);
    expect(typeof r.value).toBe("number");
  });

  it("rejects an invalid root", () => {
    const r = resolvePath(beginnerContext, "foo.bar");
    expect(r.exists).toBe(false);
    expect(r.reason).toBe("invalid_root");
  });

  it("rejects a non-existent leaf", () => {
    const r = resolvePath(beginnerContext, "raw.nonexistent_field");
    expect(r.exists).toBe(false);
    expect(r.reason).toBe("missing_segment");
  });

  it("flags null leaves as null_value rather than missing", () => {
    // beginner has training_intensity_self_reported = null in raw
    const r = resolvePath(beginnerContext, "raw.training_intensity_self_reported");
    expect(r.exists).toBe(false);
    expect(r.reason).toBe("null_value");
  });
});

// ─── findInvalidEvidencePaths ───────────────────────────────────────────

describe("findInvalidEvidencePaths", () => {
  it("returns no invalid paths for a hand-built valid AnalysisJSON", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    const invalid = findInvalidEvidencePaths(a, beginnerContext);
    expect(invalid).toEqual([]);
  });

  it("flags an invented path", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    a.executive_evidence.defining_factors[0].evidence_field = "raw.totally_invented_field";
    const invalid = findInvalidEvidencePaths(a, beginnerContext);
    expect(invalid.length).toBeGreaterThan(0);
    expect(invalid[0].path).toBe("raw.totally_invented_field");
  });

  it("flags an invalid root segment", () => {
    const a = buildValidAnalysisFor(beginnerContext);
    a.modules.sleep.recommendation_anchors[0].evidence_field = "foobar.x";
    const invalid = findInvalidEvidencePaths(a, beginnerContext);
    expect(invalid.some((p) => p.reason === "invalid_root")).toBe(true);
  });
});

// ─── cleanJsonText ──────────────────────────────────────────────────────

describe("cleanJsonText", () => {
  it("strips markdown JSON fences", () => {
    expect(cleanJsonText('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips bare ``` fences", () => {
    expect(cleanJsonText('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("trims prose preamble before the first {", () => {
    const input = 'Sure! Here is the JSON:\n\n{"a":1}\nthanks';
    expect(cleanJsonText(input)).toBe('{"a":1}');
  });

  it("returns empty input as empty", () => {
    expect(cleanJsonText("")).toBe("");
  });
});

// ─── buildAnalysisUserPrompt ────────────────────────────────────────────

describe("buildAnalysisUserPrompt", () => {
  it("includes raw user values that Stage-A needs to anchor on", () => {
    const prompt = buildAnalysisUserPrompt(beginnerContext);
    expect(prompt).toContain("4200");                     // daily_steps
    expect(prompt).toContain("5.8");                      // sleep_duration_hours
    expect(prompt).toContain("\"morning_recovery_1_10\""); // raw key
  });

  it("includes meta.report_type", () => {
    const prompt = buildAnalysisUserPrompt(metabolicContext);
    expect(prompt).toContain("\"report_type\": \"metabolic\"");
  });

  it("instructs the model to respond with JSON only", () => {
    const prompt = buildAnalysisUserPrompt(beginnerContext);
    expect(prompt.toLowerCase()).toContain("respond with only the json");
  });
});

// ─── runMainReportAnalysis (end-to-end with mock-Anthropic) ─────────────

describe("runMainReportAnalysis — happy path over 4 fixtures", () => {
  for (const [name, ctx] of [
    ["beginner", beginnerContext],
    ["athlete", athleteContext],
    ["founder", founderContext],
    ["metabolic", metabolicContext],
  ] as const) {
    it(`returns ok=true for ${name} when mock returns a valid AnalysisJSON`, async () => {
      const analysis = buildValidAnalysisFor(ctx);
      const client = makeMockAnthropic({
        response: { text: JSON.stringify(analysis) },
      });
      const result = await runMainReportAnalysis(ctx, { client });
      if (!result.ok) {
        // surface helpful diagnostics on failure
        throw new Error(`pipeline failed: ${JSON.stringify(result.error)}`);
      }
      expect(result.ok).toBe(true);
      expect(result.analysis.meta.report_type).toBe(ctx.meta.report_type);
      expect(result.usage.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.usage.prompt_tokens).toBeGreaterThan(0);
    });
  }
});

describe("runMainReportAnalysis — error paths", () => {
  it("returns non_json_response when the model emits prose", async () => {
    const client = makeMockAnthropic({
      response: { text: "Sorry, I cannot help with that." },
    });
    const result = await runMainReportAnalysis(beginnerContext, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("non_json_response");
    }
  });

  it("returns schema_invalid when JSON parses but breaks the schema", async () => {
    const client = makeMockAnthropic({
      response: { text: JSON.stringify({ meta: { report_type: "complete" } }) },
    });
    const result = await runMainReportAnalysis(beginnerContext, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("schema_invalid");
    }
  });

  it("returns evidence_paths_invalid when AnalysisJSON references a fake path", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    analysis.executive_evidence.defining_factors[0].evidence_field = "raw.invented_field";
    const client = makeMockAnthropic({
      response: { text: JSON.stringify(analysis) },
    });
    const result = await runMainReportAnalysis(beginnerContext, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("evidence_paths_invalid");
    }
  });

  it("returns anthropic_call_failed when the client throws", async () => {
    const client = makeMockAnthropic({
      response: { text: "irrelevant" },
      throws: new Error("network down"),
    });
    const result = await runMainReportAnalysis(beginnerContext, { client });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("anthropic_call_failed");
    }
  });

  it("strips markdown fences before parsing", async () => {
    const analysis = buildValidAnalysisFor(beginnerContext);
    const client = makeMockAnthropic({
      response: { text: "```json\n" + JSON.stringify(analysis) + "\n```" },
    });
    const result = await runMainReportAnalysis(beginnerContext, { client });
    expect(result.ok).toBe(true);
  });
});

// ─── system-prompt sanity ───────────────────────────────────────────────

describe("ANALYSIS_SYSTEM_PROMPT", () => {
  it("declares JSON-only output", () => {
    const lower = ANALYSIS_SYSTEM_PROMPT.toLowerCase();
    expect(lower).toContain("json");
    expect(lower).toContain("you do not write prose");
  });

  it("declares the evidence-field path contract", () => {
    expect(ANALYSIS_SYSTEM_PROMPT).toContain("evidence_field");
    expect(ANALYSIS_SYSTEM_PROMPT.toLowerCase()).toContain("dot-path");
  });

  it("constrains overtraining_risk to non-training recommendations", () => {
    expect(ANALYSIS_SYSTEM_PROMPT.toLowerCase()).toContain("overtraining_risk");
  });
});
