// Generic AI-driven document extractor.
//
// Accepts any health-data file the user hands us (PDF, image, CSV/TXT/JSON)
// and asks Claude Sonnet 4.6 to extract explicitly stated metrics into the
// same WearableMetrics shape that WHOOP / Apple Health populate. Output is
// a full WearableParseResult the client can POST to /api/wearable/persist,
// mirroring the existing browser-parsed flow — no branching in the UI.
//
// Privacy note: PDFs / images DO leave the browser and reach Anthropic
// (required by the Vision / Document API). The landing page copy is clear
// that only small documents take this path; Apple Health's 1-2 GB export
// never reaches here because the client dispatcher routes ZIPs to the
// browser parser first.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type {
  WearableMetrics,
  WearableParseResult,
  WearableSource,
} from "@/lib/wearable/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB hard cap

const EXTRACTION_SYSTEM_PROMPT = `You are a health-data extractor. Read the uploaded document, image, or text and extract ONLY values that are EXPLICITLY stated. Never invent, estimate, or interpolate. If a value is not present or unclear, omit the field entirely.

Respond with exactly this JSON shape (omit any fields that are not present). Do not include ANY text outside the JSON — no markdown fences, no preamble, start with { and end with }.

{
  "user_profile": {
    "age": integer,
    "gender": "male" | "female",
    "height_cm": number,
    "weight_kg": number
  },
  "body_composition": {
    "bmi": number,
    "body_fat_pct": number,
    "skeletal_muscle_kg": number,
    "visceral_fat_rating": integer,
    "body_water_pct": number,
    "bmr_kcal": integer
  },
  "fitness": {
    "vo2max_estimated": number,
    "resting_hr": integer,
    "max_hr": integer
  },
  "recovery": {
    "avg_hrv_ms": number,
    "avg_rhr_bpm": number
  },
  "activity": {
    "avg_daily_steps": integer,
    "avg_active_kcal": integer,
    "avg_met_minutes_week": integer
  },
  "sleep": {
    "avg_duration_hours": number,
    "avg_sleep_efficiency_pct": number
  },
  "provenance": {
    "source_type": "inbody" | "tanita" | "dexa" | "withings" | "garmin" | "polar" | "screenshot" | "csv_export" | "handwritten" | "other",
    "confidence": number between 0.0 and 1.0,
    "notes": "one-line description of what you saw"
  }
}

Rules:
- Only extract explicitly stated numbers.
- Convert units yourself: pounds → kg (divide by 2.20462), inches → cm (multiply by 2.54), mph → km/h (multiply by 1.60934). Keep only the converted value in the output.
- If the document is not a health document, return exactly: {"provenance":{"source_type":"other","confidence":0.0,"notes":"not a health document"}}
- Provenance.confidence reflects how sure you are this is a legitimate health document AND how many fields you could extract. 0.9+ for a clean InBody print; 0.5-0.8 for a screenshot with partial data; under 0.3 if uncertain.`;

interface ExtractionJson {
  user_profile?: {
    age?: number;
    gender?: "male" | "female";
    height_cm?: number;
    weight_kg?: number;
  };
  body_composition?: {
    bmi?: number;
    body_fat_pct?: number;
    skeletal_muscle_kg?: number;
    visceral_fat_rating?: number;
    body_water_pct?: number;
    bmr_kcal?: number;
  };
  fitness?: {
    vo2max_estimated?: number;
    resting_hr?: number;
    max_hr?: number;
  };
  recovery?: {
    avg_hrv_ms?: number;
    avg_rhr_bpm?: number;
  };
  activity?: {
    avg_daily_steps?: number;
    avg_active_kcal?: number;
    avg_met_minutes_week?: number;
  };
  sleep?: {
    avg_duration_hours?: number;
    avg_sleep_efficiency_pct?: number;
  };
  provenance?: {
    source_type?: string;
    confidence?: number;
    notes?: string;
  };
}

function mapToWearableMetrics(x: ExtractionJson): WearableMetrics {
  const m: WearableMetrics = {};
  if (x.user_profile && Object.keys(x.user_profile).length > 0) {
    m.user_profile = {
      age: x.user_profile.age,
      gender: x.user_profile.gender,
      height_cm: x.user_profile.height_cm,
      weight_kg: x.user_profile.weight_kg,
    };
  }
  if (x.body_composition && Object.keys(x.body_composition).length > 0) {
    m.body = {
      last_weight_kg: x.user_profile?.weight_kg,
      bmi: x.body_composition.bmi,
      body_fat_pct: x.body_composition.body_fat_pct,
      skeletal_muscle_kg: x.body_composition.skeletal_muscle_kg,
      visceral_fat_rating: x.body_composition.visceral_fat_rating,
      body_water_pct: x.body_composition.body_water_pct,
      bmr_kcal: x.body_composition.bmr_kcal,
    };
  } else if (x.user_profile?.weight_kg != null) {
    m.body = { last_weight_kg: x.user_profile.weight_kg };
  }
  if (x.fitness && Object.keys(x.fitness).length > 0) {
    if (x.fitness.vo2max_estimated != null) {
      m.vo2max = { last_value: x.fitness.vo2max_estimated };
    }
    if (x.fitness.resting_hr != null || x.fitness.max_hr != null) {
      m.fitness = {
        resting_hr: x.fitness.resting_hr,
        max_hr: x.fitness.max_hr,
      };
    }
  }
  if (x.recovery && Object.keys(x.recovery).length > 0) {
    m.recovery = {
      avg_hrv_ms: x.recovery.avg_hrv_ms,
      avg_rhr_bpm: x.recovery.avg_rhr_bpm,
    };
  }
  if (x.activity && Object.keys(x.activity).length > 0) {
    m.activity = {
      avg_steps: x.activity.avg_daily_steps,
      avg_active_kcal: x.activity.avg_active_kcal,
      avg_met_minutes_week: x.activity.avg_met_minutes_week,
    };
  }
  if (x.sleep && Object.keys(x.sleep).length > 0) {
    m.sleep = {
      avg_duration_hours: x.sleep.avg_duration_hours,
      avg_efficiency_pct: x.sleep.avg_sleep_efficiency_pct,
    };
  }
  if (x.provenance) {
    const validTypes = new Set([
      "inbody", "tanita", "dexa", "withings", "garmin", "polar",
      "screenshot", "csv_export", "handwritten", "other",
    ]);
    const src = validTypes.has(x.provenance.source_type ?? "")
      ? (x.provenance.source_type as NonNullable<WearableMetrics["provenance"]>["source_type"])
      : "other";
    m.provenance = {
      source_type: src,
      confidence: Math.min(1, Math.max(0, x.provenance.confidence ?? 0)),
      notes: x.provenance.notes ?? "",
    };
  }
  return m;
}

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

function categorize(
  mime: string,
  filename: string,
): "pdf" | "image" | "text" | "rejected" {
  const lower = filename.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    mime === "image/gif" ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  ) {
    return "image";
  }
  if (
    mime === "image/heic" ||
    mime === "image/heif" ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif")
  ) {
    // iPhone Live Photos — we don't ship a HEIC decoder; asks user to re-export.
    return "rejected";
  }
  if (
    mime === "text/csv" ||
    mime === "text/plain" ||
    mime === "application/json" ||
    lower.endsWith(".csv") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".json")
  ) {
    return "text";
  }
  return "rejected";
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "empty_file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "too_large", limit_bytes: MAX_BYTES },
        { status: 413 },
      );
    }

    const category = categorize(file.type, file.name);
    if (category === "rejected") {
      return NextResponse.json(
        {
          error: "unsupported_type",
          hint: file.name.toLowerCase().match(/\.heic$|\.heif$/)
            ? "heic_unsupported"
            : "unsupported_format",
        },
        { status: 415 },
      );
    }

    const anthropic = getAnthropic();
    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString("base64");

    // Assemble the user-message content based on file category.
    const userContent: Anthropic.Messages.ContentBlockParam[] = [];
    let sourceType: WearableSource;
    if (category === "pdf") {
      sourceType = "ai_document";
      userContent.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      });
    } else if (category === "image") {
      sourceType = "ai_image";
      const mediaType = (
        file.type && file.type.startsWith("image/") ? file.type : "image/jpeg"
      ) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64,
        },
      });
    } else {
      sourceType = "ai_text";
      // For text files, send as a plain text block. Cap at 200 KB of text so
      // a misbehaving CSV doesn't blow up token count.
      const decoded = buf.toString("utf-8").slice(0, 200 * 1024);
      userContent.push({ type: "text", text: decoded });
    }
    userContent.push({
      type: "text",
      text:
        "Extract the JSON exactly as specified. Return JSON only — no prose, no markdown.",
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "claude_no_text_response" },
        { status: 502 },
      );
    }

    const cleaned = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: ExtractionJson;
    try {
      parsed = JSON.parse(cleaned) as ExtractionJson;
    } catch (err) {
      console.warn(
        "[parse-document] Claude returned invalid JSON:",
        cleaned.slice(0, 300),
        err,
      );
      return NextResponse.json(
        { error: "claude_invalid_json" },
        { status: 502 },
      );
    }

    // Guard against "not a health document" responses — we still return a
    // WearableParseResult so the client can decide whether to offer a retry,
    // but the low confidence surfaces as a parse warning.
    const metrics = mapToWearableMetrics(parsed);
    const confidence = metrics.provenance?.confidence ?? 0;
    const warnings: WearableParseResult["parse_warnings"] = [];
    if (confidence < 0.3) {
      warnings.push({
        code: "low_confidence",
        message:
          metrics.provenance?.notes ||
          "The uploaded file did not contain recognizable health data.",
      });
    } else if (confidence < 0.6) {
      warnings.push({
        code: "partial_extraction",
        message: `Extracted with confidence ${confidence.toFixed(2)}. Review the prefilled fields carefully.`,
      });
    }

    // window_start / window_end — AI extractions are typically point-in-time
    // snapshots (a scan taken on a specific day). Default to "today" for both
    // so the UI banner can show a sensible date; the scoring engine treats
    // days_covered as the authoritative freshness signal.
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);

    const result: WearableParseResult = {
      source: sourceType,
      schema_version: `ai_v1:${metrics.provenance?.source_type ?? "other"}`,
      window_start: iso,
      window_end: iso,
      days_covered: 1,
      metrics,
      parse_warnings: warnings,
      parse_duration_ms: Date.now() - t0,
      file_size_bytes: file.size,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[parse-document] unexpected error", err);
    const msg = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: "server_error", detail: msg }, { status: 500 });
  }
}
