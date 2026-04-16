import { NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/tokens — return the analyse_token count for the logged-in user.
// Returns { tokens: 0 } (not an error) when the user is not authenticated or
// Supabase is not configured — so callers don't need to handle 401/503.
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ tokens: 0 });
    }

    const svc = getSupabaseServiceClient();
    const { data } = await svc
      .from("user_tokens")
      .select("tokens")
      .eq("email", user.email)
      .maybeSingle();

    return NextResponse.json({ tokens: data?.tokens ?? 0 });
  } catch {
    // Supabase not configured (offline/demo mode) — treat as 0 tokens
    return NextResponse.json({ tokens: 0 });
  }
}

// POST /api/tokens — deduct 1 token from the logged-in user.
// Returns 403 if the user has no tokens, 401 if not authenticated.
export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const svc = getSupabaseServiceClient();

    const { data: current } = await svc
      .from("user_tokens")
      .select("tokens")
      .eq("email", user.email)
      .maybeSingle();

    const currentTokens = current?.tokens ?? 0;

    if (currentTokens <= 0) {
      return NextResponse.json({ error: "Keine Analyse-Tokens verfügbar", tokens: 0 }, { status: 403 });
    }

    const newTokens = currentTokens - 1;

    await svc.from("user_tokens").upsert(
      { email: user.email, tokens: newTokens, updated_at: new Date().toISOString() },
      { onConflict: "email" },
    );

    return NextResponse.json({ tokens: newTokens });
  } catch (err) {
    console.error("[tokens/deduct]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
