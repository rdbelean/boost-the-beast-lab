import type Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages";

// Exponential backoff with jitter for Anthropic API calls.
//
// Previously this was 1 retry with a fixed 2 s delay. Under real load
// Anthropic's 529 ("overloaded") and 429 ("rate_limit") are bursty —
// retrying after exactly 2 s often slams the same congestion window,
// and 1 retry isn't enough for transient regional outages.
//
// New behaviour:
//   - Up to `retries` attempts (default 3), so 1 initial + 3 = 4 total.
//   - Delay = baseDelayMs * 2^attempt + uniform jitter in [0, jitterMs].
//   - Only retries on 429, 500, 502, 503, 504, 529. Other errors throw
//     immediately so business logic (e.g. context_length_exceeded) can
//     short-circuit.
//   - Failures still surface to the caller as the LAST error — no
//     silent substitution.

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504, 529]);

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  jitterMs?: number;
}

export async function callAnthropicWithRetry(
  client: Anthropic,
  options: MessageCreateParamsNonStreaming,
  retryOpts: RetryOptions = {},
): Promise<Message> {
  const retries = retryOpts.retries ?? 3;
  const baseDelayMs = retryOpts.baseDelayMs ?? 1000;
  const jitterMs = retryOpts.jitterMs ?? 250;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client.messages.create(options);
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const retryable = status !== undefined && RETRYABLE_STATUS.has(status);
      if (!retryable || attempt === retries) {
        throw err;
      }
      const delay =
        baseDelayMs * Math.pow(2, attempt) + Math.random() * jitterMs;
      console.warn(
        `[anthropic-retry] attempt ${attempt + 1}/${retries + 1} failed (status ${status}), retrying in ${Math.round(delay)}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Unreachable — the loop either returns or throws — but TypeScript
  // can't see that with a dynamic retries count.
  throw lastErr;
}
