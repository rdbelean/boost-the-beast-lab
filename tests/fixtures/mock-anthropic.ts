// Minimal mock of the Anthropic.Messages client used by the pipeline.
//
// The pipeline only calls `client.messages.create(...)`, so we satisfy
// that single method. Returns are configurable per test.

import type { AnthropicClient } from "@/lib/reports/pipeline";
import type { Message } from "@anthropic-ai/sdk/resources/messages";

export interface MockResponse {
  text: string;
  input_tokens?: number;
  output_tokens?: number;
}

export interface MockClientOptions {
  /** Either a single response (returned for every call) or a queue. */
  response: MockResponse | MockResponse[];
  /** Optional: throw this error on .create() instead of returning. */
  throws?: unknown;
}

export interface MockClient extends AnthropicClient {
  calls: Array<{
    model: string;
    max_tokens: number;
    system?: string;
    user?: string;
  }>;
}

export function makeMockAnthropic(options: MockClientOptions): MockClient {
  const queue: MockResponse[] = Array.isArray(options.response)
    ? [...options.response]
    : [];
  const fallback: MockResponse | null = Array.isArray(options.response)
    ? null
    : options.response;

  const calls: MockClient["calls"] = [];

  const create = async (params: {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: string; content: string }>;
  }): Promise<Message> => {
    if (options.throws !== undefined) throw options.throws;
    calls.push({
      model: params.model,
      max_tokens: params.max_tokens,
      system: params.system,
      user: params.messages[0]?.content,
    });
    const next = queue.length > 0 ? queue.shift()! : fallback;
    if (!next) throw new Error("MockAnthropic: response queue exhausted");
    return {
      id: "mock-msg",
      type: "message",
      role: "assistant",
      model: params.model,
      stop_reason: "end_turn",
      stop_sequence: null,
      content: [{ type: "text", text: next.text, citations: null }],
      usage: {
        input_tokens: next.input_tokens ?? 100,
        output_tokens: next.output_tokens ?? 200,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
        cache_creation: null,
      },
    } as unknown as Message;
  };

  return {
    calls,
    messages: { create } as unknown as AnthropicClient["messages"],
  };
}
