// v4 report pipeline orchestrator.
//
// Phase 4 added Stage-A (Analyst). Phase 5 adds Stage-B (Writer) +
// Stage-C (Judge), plus the runMainReportPipeline orchestrator that
// chains A → B → C. Phase 6 will add Stage-D (Repair).
//
// The Anthropic client is dependency-injected so tests can drop a mock
// in. Production callers pass the real client (created in the route
// handler with the API key).

import type Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";
import type { ReportContext } from "./report-context";
import { AnalysisSchema, type AnalysisJSON } from "./schemas/report-analysis";
import { ReportSchema, type ReportJSON } from "./schemas/report-output";
import { JudgeResultSchema, type JudgeResult } from "./schemas/judge-result";
import { findInvalidEvidencePaths, type InvalidPath } from "./evidence-field-resolver";
import { validateReport, type ValidatorResult } from "./validators";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/report/prompts/v4/analysis-system";
import { buildAnalysisUserPrompt } from "@/lib/report/prompts/v4/analysis-user";
import { getWriterSystemPrompt } from "@/lib/report/prompts/v4/writer-system";
import { buildWriterUserPrompt } from "@/lib/report/prompts/v4/writer-user";
import { JUDGE_SYSTEM_PROMPT, buildJudgeUserPrompt } from "@/lib/report/prompts/v4/judge-prompt";

// ─── Public types ───────────────────────────────────────────────────────

export const PIPELINE_VERSION = "v4.0.0-phase5";

/** Anthropic-compatible client — narrowed to what the pipeline actually uses. */
export type AnthropicClient = Pick<Anthropic, "messages">;

export interface StageOptions {
  client: AnthropicClient;
  model?: string;
  maxTokens?: number;
}

export type StageAOptions = StageOptions;
export type StageBOptions = StageOptions;
export type StageCOptions = StageOptions;

export type PipelineErrorCode =
  | "anthropic_call_failed"
  | "empty_response"
  | "non_json_response"
  | "schema_invalid"
  | "evidence_paths_invalid"
  | "validator_failed";

export interface PipelineError {
  code: PipelineErrorCode;
  message: string;
  detail?: unknown;
}

export interface StageUsage {
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  duration_ms: number;
}

export type StageAResult =
  | {
      ok: true;
      analysis: AnalysisJSON;
      usage: StageUsage;
      raw_response: string;
      raw_system_prompt: string;
      raw_user_prompt: string;
    }
  | { ok: false; error: PipelineError; raw_response?: string };

export type StageBResult =
  | {
      ok: true;
      report: ReportJSON;
      usage: StageUsage;
      raw_response: string;
      raw_system_prompt: string;
      raw_user_prompt: string;
    }
  | { ok: false; error: PipelineError; raw_response?: string };

export type StageCResult =
  | {
      ok: true;
      judge: JudgeResult;
      usage: StageUsage;
      raw_response: string;
    }
  | { ok: false; error: PipelineError; raw_response?: string };

/** One persisted record per Anthropic call (Phase 9 will write this to DB). */
export interface GenerationRecord {
  stage: "analyst" | "writer" | "judge" | "repair";
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  duration_ms: number;
  ok: boolean;
  error_code?: PipelineErrorCode;
}

export type MainPipelineResult =
  | {
      ok: true;
      analysis: AnalysisJSON;
      report: ReportJSON;
      validator: ValidatorResult;
      judge: JudgeResult | null;
      generations: GenerationRecord[];
    }
  | {
      ok: false;
      stage: "analyst" | "writer" | "validator" | "judge";
      error: PipelineError;
      analysis?: AnalysisJSON;
      report?: ReportJSON;
      validator?: ValidatorResult;
      generations: GenerationRecord[];
    };

// ─── Defaults ───────────────────────────────────────────────────────────
//
// Phase 5e: model selection by stage character.
//   Analyst → Haiku  : structured JSON extraction (no reasoning depth).
//   Writer  → Sonnet : prose generation (Sonnet's depth = real
//                      individualization vs banding-paraphrase).
//   Judge   → Haiku  : structured JudgeResult JSON.
// Stage-A and Judge moved off Sonnet to cut latency ~3× and cost ~12×.
// Stage-B max_tokens trimmed 8000 → 6000 to force denser prose and
// reduce wallclock proportionally.

const DEFAULT_ANALYST_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_WRITER_MODEL = "claude-sonnet-4-6";
const DEFAULT_JUDGE_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_ANALYST_MAX_TOKENS = 4000;
const DEFAULT_WRITER_MAX_TOKENS = 6000;
const DEFAULT_JUDGE_MAX_TOKENS = 1200;

// ─── Stage-A: Analyst ───────────────────────────────────────────────────

export async function runMainReportAnalysis(
  ctx: ReportContext,
  options: StageAOptions,
): Promise<StageAResult> {
  const systemPrompt = ANALYSIS_SYSTEM_PROMPT;
  const userPrompt = buildAnalysisUserPrompt(ctx);
  const model = options.model ?? DEFAULT_ANALYST_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_ANALYST_MAX_TOKENS;

  const startedAt = Date.now();
  let message: Message;
  try {
    message = await callAnthropicWithRetry(options.client as Anthropic, {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "anthropic_call_failed",
        message: err instanceof Error ? err.message : String(err),
        detail: err,
      },
    };
  }
  const duration_ms = Date.now() - startedAt;
  logStageUsage("analyst", model, message);

  const rawText = extractText(message);
  if (!rawText) {
    return {
      ok: false,
      error: { code: "empty_response", message: "no text content in response" },
    };
  }

  const cleaned = cleanJsonText(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "non_json_response",
        message: err instanceof Error ? err.message : String(err),
        detail: { snippet: cleaned.slice(0, 400) },
      },
      raw_response: rawText,
    };
  }

  const schemaResult = AnalysisSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return {
      ok: false,
      error: {
        code: "schema_invalid",
        message: "AnalysisJSON failed zod validation",
        detail: schemaResult.error.issues.slice(0, 20),
      },
      raw_response: rawText,
    };
  }
  const analysis = schemaResult.data;

  const invalidPaths = findInvalidEvidencePaths(analysis, ctx);
  if (invalidPaths.length > 0) {
    return {
      ok: false,
      error: {
        code: "evidence_paths_invalid",
        message: `${invalidPaths.length} evidence_field path(s) do not resolve in ctx`,
        detail: invalidPaths.slice(0, 10) satisfies InvalidPath[],
      },
      raw_response: rawText,
    };
  }

  return {
    ok: true,
    analysis,
    usage: {
      model,
      prompt_tokens: message.usage?.input_tokens ?? null,
      completion_tokens: message.usage?.output_tokens ?? null,
      duration_ms,
    },
    raw_response: rawText,
    raw_system_prompt: systemPrompt,
    raw_user_prompt: userPrompt,
  };
}

// ─── Stage-B: Writer ────────────────────────────────────────────────────

export async function runMainReportWriter(
  ctx: ReportContext,
  analysis: AnalysisJSON,
  options: StageBOptions,
): Promise<StageBResult> {
  const systemPrompt = getWriterSystemPrompt(ctx.meta.locale);
  const userPrompt = buildWriterUserPrompt(ctx, analysis);
  const model = options.model ?? DEFAULT_WRITER_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_WRITER_MAX_TOKENS;

  const startedAt = Date.now();
  let message: Message;
  try {
    message = await callAnthropicWithRetry(options.client as Anthropic, {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "anthropic_call_failed",
        message: err instanceof Error ? err.message : String(err),
        detail: err,
      },
    };
  }
  const duration_ms = Date.now() - startedAt;
  logStageUsage("writer", model, message);

  const rawText = extractText(message);
  if (!rawText) {
    return {
      ok: false,
      error: { code: "empty_response", message: "no text content in response" },
    };
  }

  const cleaned = cleanJsonText(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "non_json_response",
        message: err instanceof Error ? err.message : String(err),
        detail: { snippet: cleaned.slice(0, 400) },
      },
      raw_response: rawText,
    };
  }

  const schemaResult = ReportSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return {
      ok: false,
      error: {
        code: "schema_invalid",
        message: "ReportJSON failed zod validation",
        detail: schemaResult.error.issues.slice(0, 20),
      },
      raw_response: rawText,
    };
  }

  return {
    ok: true,
    report: schemaResult.data,
    usage: {
      model,
      prompt_tokens: message.usage?.input_tokens ?? null,
      completion_tokens: message.usage?.output_tokens ?? null,
      duration_ms,
    },
    raw_response: rawText,
    raw_system_prompt: systemPrompt,
    raw_user_prompt: userPrompt,
  };
}

// ─── Stage-C: Judge ─────────────────────────────────────────────────────

export async function runMainReportJudge(
  ctx: ReportContext,
  analysis: AnalysisJSON,
  report: ReportJSON,
  options: StageCOptions,
): Promise<StageCResult> {
  const systemPrompt = JUDGE_SYSTEM_PROMPT;
  const userPrompt = buildJudgeUserPrompt(ctx, analysis, report);
  const model = options.model ?? DEFAULT_JUDGE_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_JUDGE_MAX_TOKENS;

  const startedAt = Date.now();
  let message: Message;
  try {
    message = await callAnthropicWithRetry(options.client as Anthropic, {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "anthropic_call_failed",
        message: err instanceof Error ? err.message : String(err),
        detail: err,
      },
    };
  }
  const duration_ms = Date.now() - startedAt;
  logStageUsage("judge", model, message);

  const rawText = extractText(message);
  if (!rawText) {
    return {
      ok: false,
      error: { code: "empty_response", message: "no text content in response" },
    };
  }

  const cleaned = cleanJsonText(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "non_json_response",
        message: err instanceof Error ? err.message : String(err),
        detail: { snippet: cleaned.slice(0, 400) },
      },
      raw_response: rawText,
    };
  }

  const schemaResult = JudgeResultSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return {
      ok: false,
      error: {
        code: "schema_invalid",
        message: "JudgeResult failed zod validation",
        detail: schemaResult.error.issues.slice(0, 20),
      },
      raw_response: rawText,
    };
  }

  return {
    ok: true,
    judge: schemaResult.data,
    usage: {
      model,
      prompt_tokens: message.usage?.input_tokens ?? null,
      completion_tokens: message.usage?.output_tokens ?? null,
      duration_ms,
    },
    raw_response: rawText,
  };
}

// ─── Orchestrator: Stage-A → Stage-B → Stage-C ──────────────────────────

export interface MainPipelineOptions {
  client: AnthropicClient;
  /** When true, skip the AI judge entirely (deterministic only). Default false. */
  skipJudge?: boolean;
  /** Per-stage model + maxTokens override (rare). */
  stageA?: { model?: string; maxTokens?: number };
  stageB?: { model?: string; maxTokens?: number };
  stageC?: { model?: string; maxTokens?: number };
}

export async function runMainReportPipeline(
  ctx: ReportContext,
  options: MainPipelineOptions,
): Promise<MainPipelineResult> {
  const generations: GenerationRecord[] = [];

  // ── Stage-A ──────────────────────────────────────────────────────────
  const stageA = await runMainReportAnalysis(ctx, {
    client: options.client,
    model: options.stageA?.model,
    maxTokens: options.stageA?.maxTokens,
  });
  generations.push(toGenerationRecord("analyst", stageA));
  if (!stageA.ok) {
    return { ok: false, stage: "analyst", error: stageA.error, generations };
  }

  // ── Stage-B ──────────────────────────────────────────────────────────
  const stageB = await runMainReportWriter(ctx, stageA.analysis, {
    client: options.client,
    model: options.stageB?.model,
    maxTokens: options.stageB?.maxTokens,
  });
  generations.push(toGenerationRecord("writer", stageB));
  if (!stageB.ok) {
    return {
      ok: false,
      stage: "writer",
      error: stageB.error,
      analysis: stageA.analysis,
      generations,
    };
  }

  // ── Stage-C deterministic validator ─────────────────────────────────
  const validator = validateReport(stageB.report, ctx);

  // Phase 5: validator failure means pipeline failure (Phase 6 will add
  // Stage-D Repair to fix that).
  if (!validator.ok) {
    return {
      ok: false,
      stage: "validator",
      error: {
        code: "validator_failed",
        message: `${validator.errors.length} validator issue(s)`,
        detail: validator.errors.slice(0, 20),
      },
      analysis: stageA.analysis,
      report: stageB.report,
      validator,
      generations,
    };
  }

  // ── Stage-C AI judge (optional) ─────────────────────────────────────
  let judge: JudgeResult | null = null;
  if (!options.skipJudge) {
    const stageC = await runMainReportJudge(ctx, stageA.analysis, stageB.report, {
      client: options.client,
      model: options.stageC?.model,
      maxTokens: options.stageC?.maxTokens,
    });
    generations.push(toGenerationRecord("judge", stageC));
    // Judge failure does NOT fail the pipeline in Phase 5 — judge is
    // advisory until Phase 6 wires it to repair. We log the error in
    // the generation record and continue.
    if (stageC.ok) judge = stageC.judge;
  }

  return {
    ok: true,
    analysis: stageA.analysis,
    report: stageB.report,
    validator,
    judge,
    generations,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function extractText(message: Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

/** Phase 5e: structured per-call telemetry for Vercel-log diagnostics. */
function logStageUsage(
  stage: "analyst" | "writer" | "judge",
  model: string,
  message: Message,
): void {
  console.log("[v4-pipeline]", JSON.stringify({
    stage,
    model,
    stop_reason: message.stop_reason,
    input_tokens: message.usage?.input_tokens ?? null,
    output_tokens: message.usage?.output_tokens ?? null,
  }));
}

/**
 * Strip optional ```json fences, leading/trailing prose, and unwrap a
 * single JSON object from the model output.
 *
 * Phase 5e: added a brace-balance check before the slice. When a
 * response is truncated mid-JSON, `lastIndexOf("}")` would otherwise
 * find an INNER `}` (e.g. end of a nested array element) and produce a
 * deceptively-shaped but unbalanced slice that JSON.parse rejects with
 * a cryptic "unexpected token" error. The balance check makes us
 * return the original text in that case so downstream JSON.parse fails
 * fast with a clear "Unexpected end of JSON input" message —
 * actionable in Vercel logs.
 */
export function cleanJsonText(input: string): string {
  let s = input.trim();
  s = s.replace(/^```(?:json)?\s*/i, "");
  s = s.replace(/\s*```\s*$/i, "");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const candidate = s.slice(first, last + 1);
    if (isBraceBalanced(candidate)) return candidate.trim();
  }
  return s.trim();
}

/** True when {/[ and }/] open/close in valid order, ignoring chars inside JSON strings. */
function isBraceBalanced(s: string): boolean {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function toGenerationRecord(
  stage: GenerationRecord["stage"],
  result: { ok: true; usage: StageUsage } | { ok: false; error: PipelineError },
): GenerationRecord {
  if (result.ok) {
    return {
      stage,
      model: result.usage.model,
      prompt_tokens: result.usage.prompt_tokens,
      completion_tokens: result.usage.completion_tokens,
      duration_ms: result.usage.duration_ms,
      ok: true,
    };
  }
  return {
    stage,
    model: "n/a",
    prompt_tokens: null,
    completion_tokens: null,
    duration_ms: 0,
    ok: false,
    error_code: result.error.code,
  };
}
