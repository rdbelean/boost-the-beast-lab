// Identity resolution for API routes that must accept both authenticated
// Supabase users AND paid Stripe guests (no Supabase session).
//
// Background: After Stripe checkout, users land on /analyse/prepare with
// btb_paid + btb_stripe_session cookies, but no Supabase auth. Routes that
// previously required auth (e.g. /api/wearable/persist) would 401. This
// helper lets those routes identify the user via the Stripe checkout
// session id, resolving to the users row keyed by the Stripe email.
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseServerClient, getSupabaseServiceClient } from "./server";

export interface ResolvedIdentity {
  userId: string;
  email: string;
  source: "supabase" | "stripe";
}

export async function resolveIdentity(): Promise<ResolvedIdentity | null> {
  const service = getSupabaseServiceClient();

  // 1. Prefer a real Supabase auth session.
  try {
    const userClient = await getSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await userClient.auth.getUser();
    if (authUser?.id && authUser.email) {
      const userId = await upsertUserByEmail(service, authUser.email, authUser.id);
      if (userId) return { userId, email: authUser.email, source: "supabase" };
    }
  } catch {
    // Fall through to Stripe identity.
  }

  // 2. Fallback: paid Stripe guest (identified by checkout session id cookie).
  const jar = await cookies();
  const stripeSessionId = jar.get("btb_stripe_session")?.value;
  if (!stripeSessionId || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(stripeSessionId)) {
    return null;
  }

  const { data: paid } = await service
    .from("paid_sessions")
    .select("email, status")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  if (!paid?.email) return null;
  if (paid.status !== "paid" && paid.status !== "complete") return null;

  const userId = await upsertUserByEmail(service, paid.email, null);
  if (!userId) return null;
  return { userId, email: paid.email, source: "stripe" };
}

async function upsertUserByEmail(
  service: SupabaseClient,
  email: string,
  authUserId: string | null,
): Promise<string | null> {
  if (authUserId) {
    const { data: byAuth } = await service
      .from("users")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (byAuth?.id) return byAuth.id;
  }

  const { data: upserted, error } = await service
    .from("users")
    .upsert(
      authUserId ? { email, auth_user_id: authUserId } : { email },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (error || !upserted?.id) return null;
  return upserted.id;
}
