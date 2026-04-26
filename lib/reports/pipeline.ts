// v4 report pipeline orchestrator.
//
// Phase 4: only Stage-A (Analyst) is implemented. Phase 5 will add
// Stage-B (Writer) + Stage-C (Judge); Phase 6 will add Stage-D (Repair).
//
// The Anthropic client is dependency-injected so tests can drop a mock
// in. Production callers pass the real client (created in the route
// handler with the API key).

import type Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { callAnthropicWithRetry } from "@/lib/anthropic/retry";
import type { ReportContext } from "./report-context";
import { AnalysisSchema, type AnalysisJSON } from "./schemas/report-analysis";
import { findInvalidEvidencePaths, type InvalidPath } from "./evidence-field-resolver";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/report/prompts/v4/analysis-system";
import { buildAnalysisUserPrompt } from "@/lib/report/prompts/v4/analysis-user";

// ─── Public types ───────────────────────────────────────────────────────

export const PIPELINE_VERSION = "v4.0.0-phase4";

/** Anthropic-compatible client — narrowed to what the pipeline actually uses. */
export type AnthropicClient = Pick<Anthropic, "messages">;

export interface StageAOptions {
  client: AnthropicClient;
  model?: string;
  maxTokens?: number;
}

export type PipelineErrorCode =
  | "anthropic_call_failed"
  | "empty_response"
  | "non_json_response"
  | "schema_invalid"
  | "evidence_paths_invalid";

export interface PipelineError {
  code: PipelineErrorCode;
  message: string;
  detail?: unknown;
}

export type StageAResult =
  | {
      ok: true;
      analysis: AnalysisJSON;
      usage: {
        model: string;
        prompt_tokens: number | null;
        completion_tokens: number | null;
        duration_ms: number;
      };
      raw_response: string;
      raw_system_prompt: string;
      raw_user_prompt: string;
    }
  | { ok: false; error: PipelineError; raw_response?: string };

// ─── Public entry: Stage-A ─────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4000;

export async function runMainReportAnalysis(
  ctx: ReportContext,
  options: StageAOptions,
): Promise<StageAResult> {
  const systemPrompt = ANALYSIS_SYSTEM_PROMPT;
  const userPrompt = buildAnalysisUserPrompt(ctx);
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

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

// ─── Helpers ────────────────────────────────────────────────────────────

function extractText(message: Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

/** Strip optional ```json fences, leading/trailing prose. */
export function cleanJsonText(input: string): string {
  let s = input.trim();
  // Strip leading ```json or ``` fence.
  s = s.replace(/^```(?:json)?\s*/i, "");
  // Strip trailing ``` fence.
  s = s.replace(/\s*```\s*$/i, "");
  // If the model added a prose preamble before the object, jump to the
  // first '{' and the matching last '}'.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first > 0 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s.trim();
}
