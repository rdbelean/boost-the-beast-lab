import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Supabase Auth redirects here after a successful magic link click or OAuth
// completion. We exchange the `code` for a session (which sets the cookies
// on the response via @supabase/ssr), then run the email→auth_user_id
// backfill so any prior anonymous purchases + assessments get attached to
// this new auth user. Finally we redirect to ?next or /account.
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", url.origin));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange failed", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // Backfill auth_user_id on email-keyed rows so the just-logged-in user
  // sees their anonymous purchases and reports on /account.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const svc = getSupabaseServiceClient();
      await svc
        .from("users")
        .update({ auth_user_id: user.id })
        .eq("email", user.email)
        .is("auth_user_id", null);
      await svc
        .from("paid_sessions")
        .update({ auth_user_id: user.id })
        .eq("email", user.email)
        .is("auth_user_id", null);
    }
  } catch (err) {
    // Non-fatal: the user is still logged in even if the backfill failed.
    console.warn("[auth/callback] backfill failed", err);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
