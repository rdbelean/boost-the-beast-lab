import { NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/supabase/guestIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight identity lookup used by the /analyse form to prefill the
// email field when there's no Supabase session but there IS a paid Stripe
// guest cookie (btb_stripe_session). Returns { email, source } or
// { email: null } — never leaks Stripe/user ids to the client.
export async function GET() {
  const identity = await resolveIdentity();
  if (!identity) {
    return NextResponse.json({ email: null, source: null });
  }
  return NextResponse.json({ email: identity.email, source: identity.source });
}
