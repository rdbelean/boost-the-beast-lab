// Shared token-crediting logic used by the Stripe webhook and verify route.
// Idempotent: a session is only ever credited once, tracked via
// paid_sessions.tokens_credited.

import type { SupabaseClient } from "@supabase/supabase-js";

/** How many analyse tokens each product grants on purchase. */
export const TOKEN_GRANTS: Record<string, number> = {
  "complete-analysis": 2,
  "follow-up": 1,
};

/**
 * Credit analyse tokens to `email` for the given Stripe session.
 * Safe to call multiple times — uses `paid_sessions.tokens_credited` as
 * an idempotency flag so tokens are never double-credited.
 *
 * Returns true if tokens were credited, false if already done or N/A.
 */
export async function creditTokensForSession(
  supabase: SupabaseClient,
  stripeSessionId: string,
  email: string,
  productId: string,
): Promise<boolean> {
  const amount = TOKEN_GRANTS[productId] ?? 0;
  if (amount <= 0) return false;

  // Idempotency check: skip if already credited for this session
  const { data: session } = await supabase
    .from("paid_sessions")
    .select("tokens_credited")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  if (session?.tokens_credited) return false;

  // Upsert token balance (read → increment → write)
  const { data: current } = await supabase
    .from("user_tokens")
    .select("tokens")
    .eq("email", email)
    .maybeSingle();

  await supabase.from("user_tokens").upsert(
    {
      email,
      tokens: (current?.tokens ?? 0) + amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  // Mark session as credited
  await supabase
    .from("paid_sessions")
    .update({ tokens_credited: true })
    .eq("stripe_session_id", stripeSessionId);

  return true;
}
