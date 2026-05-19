// GDPR consent logging for health-data analysis.
//
// GET  → returns the user's most recent (non-revoked) consent decision
//        for consent_type='health_data_analysis', or null if none.
//        Used by /analyse/prepare to decide: show modal (null) vs.
//        skip-modal-show-upload (granted) vs. redirect-to-quiz (declined).
//
// POST → logs a new decision. Body: { decision, text_locale }.
//        Looks up the active consent_text_versions row for the locale and
//        stores its id as text_version_id (DSGVO Nachweispflicht).
//        ip_address is intentionally NOT populated in this iteration.
//
// Auth: requires an authenticated Supabase session.

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CONSENT_TYPE = "health_data_analysis";
const VALID_LOCALES = new Set(["de", "en", "it", "tr"]);
const VALID_DECISIONS = new Set(["granted", "declined"]);

export async function GET() {
  const ssr = await getSupabaseServerClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Most recent non-revoked decision for this consent_type.
  const { data, error } = await ssr
    .from("consent_log")
    .select("decision, granted_at, text_locale")
    .eq("user_id", user.id)
    .eq("consent_type", CONSENT_TYPE)
    .is("revoked_at", null)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[consent/GET] select failed", error);
    return NextResponse.json({ error: "DB read failed" }, { status: 500 });
  }

  return NextResponse.json({ decision: data?.decision ?? null });
}

export async function POST(req: NextRequest) {
  const ssr = await getSupabaseServerClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { decision?: string; text_locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const decision = body.decision;
  const textLocale = body.text_locale;
  if (!decision || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }
  if (!textLocale || !VALID_LOCALES.has(textLocale)) {
    return NextResponse.json({ error: "Invalid text_locale" }, { status: 400 });
  }

  // Service client to look up active text version (table is RLS-protected
  // to SELECT only is_active=true rows, but using service avoids any RLS
  // edge case if the user's session was lost between auth check and query).
  const service = getSupabaseServiceClient();
  const { data: version, error: vErr } = await service
    .from("consent_text_versions")
    .select("id")
    .eq("consent_type", CONSENT_TYPE)
    .eq("locale", textLocale)
    .eq("is_active", true)
    .maybeSingle();

  if (vErr || !version) {
    console.error("[consent/POST] no active version", { textLocale, vErr });
    return NextResponse.json(
      { error: "No active consent text version" },
      { status: 500 },
    );
  }

  const userAgent = req.headers.get("user-agent") ?? null;

  const { data: inserted, error: iErr } = await ssr
    .from("consent_log")
    .insert({
      user_id: user.id,
      consent_type: CONSENT_TYPE,
      decision,
      text_version_id: version.id,
      text_locale: textLocale,
      user_agent: userAgent,
      // ip_address intentionally not set in this iteration.
    })
    .select("id")
    .single();

  if (iErr || !inserted) {
    console.error("[consent/POST] insert failed", iErr);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, log_id: inserted.id });
}
