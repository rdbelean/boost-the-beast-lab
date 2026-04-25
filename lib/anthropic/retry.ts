import type Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages";

// One retry with a 2-second delay. Used for every server-side Anthropic
// call so that transient 5xx / network blips don't surface as a failure
// to the user. Anything beyond one retry is reported up so the caller
// can return a 502/503 — we never silently substitute static content.
export async function callAnthropicWithRetry(
  client: Anthropic,
  options: MessageCreateParamsNonStreaming,
  retries = 1,
  delayMs = 2000,
): Promise<Message> {
  try {
    return await client.messages.create(options);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return callAnthropicWithRetry(client, options, retries - 1, delayMs);
  }
}
