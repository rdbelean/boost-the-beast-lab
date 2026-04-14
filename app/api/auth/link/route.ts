import { NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/link — called after a session is established to backfill
// auth_user_id on email-keyed rows. The /auth/callback route already does
// this inline; this endpoint exists for cases where a client needs to
// trigger the link manually (e.g. after an OAuth redirect that bypassed
// the server callback).
export async function POST() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const svc = getSupabaseServiceClient();

  const usersUpdate = await svc
    .from("users")
    .update({ auth_user_id: user.id })
    .eq("email", user.email)
    .is("auth_user_id", null)
    .select("id");

  const sessionsUpdate = await svc
    .from("paid_sessions")
    .update({ auth_user_id: user.id })
    .eq("email", user.email)
    .is("auth_user_id", null)
    .select("id");

  return NextResponse.json({
    linked: {
      users: usersUpdate.data?.length ?? 0,
      paid_sessions: sessionsUpdate.data?.length ?? 0,
    },
  });
}
