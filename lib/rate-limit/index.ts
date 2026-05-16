// Rate limiting via Upstash Redis (sliding window per endpoint).
//
// Configuration is keyed off env vars UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN. When either is missing the helper degrades
// to a pass-through (logs once at boot) so local dev / preview without
// Upstash credentials never breaks — but production deployments without
// the env vars get a console.error per request so the gap is visible
// in Sentry and Vercel logs.
//
// Limits are intentionally conservative defaults — tighten after
// real-traffic data lands. Each costly endpoint uses BOTH an hourly
// burst limiter AND a daily ceiling, so a bot can't burn through the
// day's budget in the first hour.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const enabled = Boolean(url && token);

let warned = false;
function warnOnce() {
  if (!warned) {
    warned = true;
    console.warn(
      "[rate-limit] Upstash env vars missing (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). Rate limiting is DISABLED. Set them in Vercel before production traffic.",
    );
  }
}

const redis = enabled
  ? new Redis({ url: url!, token: token! })
  : null;

type LimiterSpec = { limit: number; window: `${number} ${"s" | "m" | "h" | "d"}` };

const SPECS: Record<string, LimiterSpec> = {
  // Costly endpoints — Claude API calls
  reportGenerateHour: { limit: 3, window: "1 h" },
  reportGenerateDay: { limit: 10, window: "1 d" },
  planGenerateHour: { limit: 5, window: "1 h" },
  planGenerateDay: { limit: 15, window: "1 d" },
  masterPlanGenerateHour: { limit: 3, window: "1 h" },
  masterPlanGenerateDay: { limit: 10, window: "1 d" },
  // Form submit
  assessmentHour: { limit: 5, window: "1 h" },
  assessmentDay: { limit: 20, window: "1 d" },
  // Stripe
  checkoutHour: { limit: 10, window: "1 h" },
  // Global per-IP DDoS shield
  globalMinute: { limit: 100, window: "1 m" },
};

function buildLimiter(spec: LimiterSpec, prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(spec.limit, spec.window),
    prefix: `rl:${prefix}`,
    analytics: true,
  });
}

export const rateLimiters = {
  reportGenerateHour: buildLimiter(SPECS.reportGenerateHour, "rg-h"),
  reportGenerateDay: buildLimiter(SPECS.reportGenerateDay, "rg-d"),
  planGenerateHour: buildLimiter(SPECS.planGenerateHour, "pg-h"),
  planGenerateDay: buildLimiter(SPECS.planGenerateDay, "pg-d"),
  masterPlanGenerateHour: buildLimiter(SPECS.masterPlanGenerateHour, "mpg-h"),
  masterPlanGenerateDay: buildLimiter(SPECS.masterPlanGenerateDay, "mpg-d"),
  assessmentHour: buildLimiter(SPECS.assessmentHour, "a-h"),
  assessmentDay: buildLimiter(SPECS.assessmentDay, "a-d"),
  checkoutHour: buildLimiter(SPECS.checkoutHour, "co-h"),
  globalMinute: buildLimiter(SPECS.globalMinute, "g-m"),
};

export type LimiterName = keyof typeof rateLimiters;

/**
 * Extract a stable client key from the request. Prefers the first
 * x-forwarded-for IP (Vercel sets this), then the cf-connecting-ip
 * (if Cloudflare is in front), and finally falls back to "unknown".
 */
export function clientIpKey(req: NextRequest | Request): string {
  const headers = req.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Enforce a single limiter. Returns a NextResponse (429) when blocked
 * or null when the caller may proceed. When Upstash isn't configured
 * (preview/dev without env vars) returns null and warns once.
 */
export async function enforceRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<NextResponse | null> {
  if (!limiter) {
    warnOnce();
    return null;
  }
  try {
    const { success, reset, remaining } = await limiter.limit(key);
    if (success) return null;
    const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: "Too many requests",
        code: "rate_limited",
        retry_after_seconds: retryAfterSec,
        remaining,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      },
    );
  } catch (err) {
    // Upstash transient failure → fail-open with Sentry-visible log.
    // We DON'T block the user because of our infrastructure problem.
    console.error("[rate-limit] limiter call failed (fail-open):", err);
    return null;
  }
}

/**
 * Convenience: run multiple limiters in sequence (e.g. hourly + daily +
 * email-scoped). Returns the FIRST 429 response, or null if all pass.
 */
export async function enforceMany(
  checks: Array<{ limiter: Ratelimit | null; key: string }>,
): Promise<NextResponse | null> {
  for (const { limiter, key } of checks) {
    const blocked = await enforceRateLimit(limiter, key);
    if (blocked) return blocked;
  }
  return null;
}
