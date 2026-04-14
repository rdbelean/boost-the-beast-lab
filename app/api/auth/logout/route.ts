import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  const url = new URL("/", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
