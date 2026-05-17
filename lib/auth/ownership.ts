// Assessment ownership check.
//
// All routes that take an assessmentId param (download report, fetch
// results, generate plan, request subsidiary insights) must verify the
// caller actually owns that assessment. Without this check, a UUID
// enumeration attack hands the attacker any user's report.
//
// Two ownership paths are supported in strict-mode:
//
//   1. Authenticated user — Supabase session cookie. We look up the
//      assessment's user_id and compare against the auth.users row
//      linked via `users.auth_user_id`.
//
//   2. Guest checkout — `btb_stripe_session` cookie set by the proxy
//      after a successful Stripe Checkout. The cookie's session ID
//      identifies a `paid_sessions` row; its email is matched against
//      the assessment owner's email.
//
// If NEITHER path validates, the request is denied with 403. The plan's
// "tolerant" / "magic-link" mode is NOT supported here — strict is the
// only option (per Q2 of the Woche-2 plan).

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OwnershipResult =
  | { ok: true; via: "auth_user" | "guest_session" }
  | { ok: false; reason: "no_credentials" | "not_owner" | "assessment_missing" | "session_invalid"; status: number };

/**
 * Strict ownership check: returns ok=true only if the caller is either
 * an authenticated user owning the assessment OR a guest with a paid
 * Stripe session cookie whose email matches the assessment owner.
 *
 * Routes should treat any ok=false result as 403 Forbidden — including
 * the case where the assessment doesn't exist (don't leak existence to
 * unauthenticated probes).
 */
export async function assertAssessmentOwnership(
  req: NextRequest,
  assessmentId: string,
): Promise<OwnershipResult> {
  if (!assessmentId) {
    return { ok: false, reason: "no_credentials", status: 403 };
  }

  const service = getSupabaseServiceClient();

  // Load assessment + its owner email/auth_user_id. Two separate queries
  // because the join shape varies between supabase-js versions
  // (sometimes nested array, sometimes object) — explicit lookups avoid
  // type drift.
  const { data: assessment, error: aErr } = await service
    .from("assessments")
    .select("id, user_id, assessment_type")
    .eq("id", assessmentId)
    .maybeSingle();

  if (aErr) {
    console.error("[ownership] assessment lookup failed", aErr);
    return { ok: false, reason: "session_invalid", status: 403 };
  }
  if (!assessment || !assessment.user_id) {
    return { ok: false, reason: "assessment_missing", status: 403 };
  }

  // PREVIEW-BRANCH DEV-BYPASS — DO NOT REMOVE WITHOUT RARES/DANIEL APPROVAL
  // Drei Schutzschichten gegen Production-Bleed-Through:
  //   1. VERCEL_ENV !== "production" — Production-Domain durchläuft das nie
  //   2. Branch-Pin "prompt-experiment-v1" — andere Preview-Branches durchlaufen das nie
  //   3. assessment_type === "test" — Production-Reports sind "full", werden nie matched
  // Selbst wenn Preview die Production-DB nutzt: Production-User-Reports
  // sind nicht test-markiert und bleiben hinter requireOwnership geschützt.
  if (
    process.env.VERCEL_ENV !== "production" &&
    process.env.VERCEL_GIT_COMMIT_REF === "prompt-experiment-v1" &&
    assessment.assessment_type === "test"
  ) {
    return { ok: true, via: "auth_user" };
  }

  const { data: ownerRow } = await service
    .from("users")
    .select("auth_user_id, email")
    .eq("id", assessment.user_id)
    .maybeSingle();

  // ── Path A: authenticated user ──────────────────────────────────────
  try {
    const ssr = await getSupabaseServerClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    if (user && ownerRow?.auth_user_id === user.id) {
      return { ok: true, via: "auth_user" };
    }
  } catch (err) {
    console.warn("[ownership] SSR auth lookup failed:", err);
  }

  // ── Path B: guest checkout cookie ───────────────────────────────────
  const stripeSessionId = req.cookies.get("btb_stripe_session")?.value;
  if (stripeSessionId && ownerRow?.email) {
    const { data: paid } = await service
      .from("paid_sessions")
      .select("email, refunded_at, suspicious")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle();

    if (
      paid &&
      !paid.refunded_at &&
      !paid.suspicious &&
      paid.email &&
      paid.email.toLowerCase() === ownerRow.email.toLowerCase()
    ) {
      return { ok: true, via: "guest_session" };
    }
  }

  return { ok: false, reason: "not_owner", status: 403 };
}

/** Convenience wrapper — returns a 403 NextResponse on failure or null
 *  on success. Lets route handlers do: `const r = await requireOwnership(req, id); if (r) return r;` */
export async function requireOwnership(
  req: NextRequest,
  assessmentId: string,
): Promise<NextResponse | null> {
  const result = await assertAssessmentOwnership(req, assessmentId);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Forbidden", code: result.reason },
    { status: result.status },
  );
}
