// GDPR consent logging for health-data analysis.
//
// Consent is scoped per Stripe Checkout Session (= one report transaction)
// rather than once per user-lifetime: a new purchase triggers a fresh
// consent prompt, but a reload within the same session does not. The
// Stripe Session ID flows from Stripe's success_url through
// /analyse/prepare's URL params and is required for both GET and POST.
//
// GET ?report_session_id=<id>
//   → returns the user's decision for THIS session, or null if not yet
//     recorded. Lifetime-consent rows (report_session_id IS NULL) are
//     explicitly excluded — they never match a concrete session id.
//
// POST { decision, text_locale, report_session_id }
//   → logs a decision row, ties it to the active consent_text_versions
//     row (DSGVO Art. 7 Abs. 1 Nachweispflicht) and to the session id.
//     ip_address is intentionally NOT populated in this iteration.
//
// Auth: requires an authenticated Supabase session.

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CONSENT_TYPE = "health_data_analysis";
const VALID_LOCALES = new Set(["de", "en", "it", "tr"]);
const VALID_DECISIONS = new Set(["granted", "declined"]);

export async function GET(req: NextRequest) {
  const ssr = await getSupabaseServerClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reportSessionId = req.nextUrl.searchParams.get("report_session_id");
  if (!reportSessionId) {
    return NextResponse.json(
      { error: "Missing report_session_id" },
      { status: 400 },
    );
  }

  // Most recent non-revoked decision for THIS report session.
  // Lifetime-consent rows (report_session_id IS NULL) are excluded by the
  // .eq() equality semantics — they never match a concrete session id.
  const { data, error } = await ssr
    .from("consent_log")
    .select("decision, granted_at, text_locale")
    .eq("user_id", user.id)
    .eq("consent_type", CONSENT_TYPE)
    .eq("report_session_id", reportSessionId)
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

  let body: { decision?: string; text_locale?: string; report_session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const decision = body.decision;
  const textLocale = body.text_locale;
  const reportSessionId = body.report_session_id;
  if (!decision || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }
  if (!textLocale || !VALID_LOCALES.has(textLocale)) {
    return NextResponse.json({ error: "Invalid text_locale" }, { status: 400 });
  }
  if (typeof reportSessionId !== "string" || reportSessionId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid report_session_id" }, { status: 400 });
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
      report_session_id: reportSessionId,
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
