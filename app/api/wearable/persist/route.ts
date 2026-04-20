import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

// 64 KB covers single-file (~3 KB) and merged multi-source payloads with
// full per-field provenance (~30 KB worst case for 10 files).
const MAX_BODY_BYTES = 64 * 1024;

const ALLOWED_SOURCES = new Set([
  "whoop",
  "apple_health",
  "ai_document",
  "ai_image",
  "ai_text",
  "gpx",
  "merged",
]);

interface PersistBody {
  source: "whoop" | "apple_health" | "ai_document" | "ai_image" | "ai_text" | "gpx" | "merged";
  schema_version: string;
  window_start: string; // ISO date YYYY-MM-DD
  window_end: string;
  days_covered: number;
  metrics: Record<string, unknown>;
  file_size_bytes?: number;
  parse_duration_ms?: number;
  parse_warnings?: Array<{ code: string; message: string }>;
  // Multi-source fields (only present when source === "merged").
  total_files_count?: number;
  source_files?: unknown;
  merge_provenance?: unknown;
}

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function validate(body: unknown): PersistBody | { error: string } {
  if (!body || typeof body !== "object") return { error: "body must be an object" };
  const b = body as Record<string, unknown>;

  if (typeof b.source !== "string" || !ALLOWED_SOURCES.has(b.source))
    return { error: "invalid source" };
  if (typeof b.schema_version !== "string" || b.schema_version.length > 64)
    return { error: "invalid schema_version" };
  if (!isIsoDate(b.window_start) || !isIsoDate(b.window_end))
    return { error: "invalid window dates" };
  if (
    typeof b.days_covered !== "number" ||
    b.days_covered < 0 ||
    b.days_covered > 366
  )
    return { error: "invalid days_covered" };
  if (!b.metrics || typeof b.metrics !== "object")
    return { error: "invalid metrics" };

  // Soft-validate optional telemetry fields.
  if (b.file_size_bytes != null && typeof b.file_size_bytes !== "number")
    return { error: "invalid file_size_bytes" };
  if (b.parse_duration_ms != null && typeof b.parse_duration_ms !== "number")
    return { error: "invalid parse_duration_ms" };
  if (
    b.parse_warnings != null &&
    (!Array.isArray(b.parse_warnings) ||
      b.parse_warnings.some(
        (w) =>
          !w ||
          typeof (w as Record<string, unknown>).code !== "string" ||
          typeof (w as Record<string, unknown>).message !== "string",
      ))
  )
    return { error: "invalid parse_warnings" };

  return b as unknown as PersistBody;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce body size limit before parsing JSON.
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // 2. Auth — require Supabase session.
    const userClient = await getSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await userClient.auth.getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Parse + validate body.
    const raw = await req.json();
    const parsed = validate(raw);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // 4. Look up the users row by auth_user_id. If the user has never completed
    //    an assessment, they won't have a row yet — create one on the fly.
    const service = getSupabaseServiceClient();
    let userId: string | null = null;
    {
      const { data: u } = await service
        .from("users")
        .select("id")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();
      if (u?.id) {
        userId = u.id;
      } else if (authUser.email) {
        // Upsert by email, link auth_user_id.
        const { data: upserted, error: upErr } = await service
          .from("users")
          .upsert(
            { email: authUser.email, auth_user_id: authUser.id },
            { onConflict: "email" },
          )
          .select("id")
          .single();
        if (upErr) throw upErr;
        userId = upserted.id;
      }
    }
    if (!userId) {
      return NextResponse.json({ error: "User row not resolvable" }, { status: 500 });
    }

    // 5. Dedupe: if there's an unlinked upload from the same source in the
    //    last 10 minutes, delete it before inserting (user retried).
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await service
      .from("wearable_uploads")
      .delete()
      .eq("user_id", userId)
      .eq("source", parsed.source)
      .is("assessment_id", null)
      .gt("created_at", tenMinAgo);

    // 6. Insert the row.
    const { data: inserted, error: insertErr } = await service
      .from("wearable_uploads")
      .insert({
        user_id: userId,
        assessment_id: null,
        source: parsed.source,
        schema_version: parsed.schema_version,
        window_start: parsed.window_start,
        window_end: parsed.window_end,
        days_covered: parsed.days_covered,
        metrics: parsed.metrics,
        file_size_bytes: parsed.file_size_bytes ?? null,
        parse_duration_ms: parsed.parse_duration_ms ?? null,
        parse_warnings: parsed.parse_warnings ?? null,
        total_files_count: parsed.total_files_count ?? null,
        source_files: parsed.source_files ?? null,
        merge_provenance: parsed.merge_provenance ?? null,
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ uploadId: inserted.id });
  } catch (err) {
    console.error("[wearable/persist]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to persist wearable upload: ${msg}` },
      { status: 500 },
    );
  }
}
