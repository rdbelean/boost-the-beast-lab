import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { type NextRequest, NextResponse } from "next/server";
import { clientIpKey, enforceRateLimit, rateLimiters } from "@/lib/rate-limit";

// Next 16 renames the `middleware.ts` convention to `proxy.ts`.
// next-intl's middleware factory is convention-agnostic — it exports
// a plain (req) => Response handler, so it works here identically.
//
// Detection order (built-in to next-intl):
//   1. URL path already has a locale (/de/..., /en/..., /it/...) — pass through
//   2. Cookie "preferred_locale" if set and supported
//   3. Accept-Language header, matched against routing.locales
//   4. routing.defaultLocale ("de")
//
// Response behavior:
//   • Bare "/" is redirected to "/{detected-locale}/"
//   • Unprefixed legacy paths ("/analyse", "/kaufen") are redirected to
//     the locale-prefixed equivalent, preserving query strings and
//     fragments. This covers magic-links and Stripe success_urls that
//     were created before the migration.
//   • API routes run through a global per-IP rate limiter only;
//     per-route limits live in the route handlers themselves.
//   • Static assets, /_next, /_vercel, and /auth/callback are excluded
//     via matcher.

const intlMiddleware = createMiddleware(routing);
const LOCALES = routing.locales as readonly string[];

function getAnalyseLocale(pathname: string): string | null {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}/analyse` || pathname.startsWith(`/${locale}/analyse/`)) {
      return locale;
    }
  }
  return null;
}

export default async function proxy(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;

  // ── API path: only the global per-IP rate limiter runs here ─────────
  // Per-route limiters (e.g. /api/report/generate burst+daily caps) live
  // in the route handlers because they need email/user context that this
  // edge proxy doesn't have.
  if (pathname.startsWith("/api/")) {
    const ip = clientIpKey(request);
    const blocked = await enforceRateLimit(
      rateLimiters.globalMinute,
      `ip:${ip}`,
    );
    if (blocked) return blocked;
    return NextResponse.next();
  }

  const locale = getAnalyseLocale(pathname);

  if (locale) {
    const paid = request.cookies.get("btb_paid")?.value;
    const productParam = searchParams.get("product");
    const paidParam = searchParams.get("paid");

    // Block unauthenticated access — redirect to kaufen
    if (!paid && !productParam && paidParam !== "true") {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/kaufen`;
      url.search = "";
      return NextResponse.redirect(url);
    }

    // First-time access via payment param — set cookie then serve
    if (!paid && (productParam || paidParam === "true")) {
      const res = intlMiddleware(request) as NextResponse;
      res.cookies.set("btb_paid", "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      // Persist the Stripe checkout session id so guest (non-logged-in) paid
      // users can still be identified across reloads — backend routes look
      // up email via paid_sessions when no Supabase auth session exists.
      const sessionId = searchParams.get("session_id");
      if (sessionId && /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
        res.cookies.set("btb_stripe_session", sessionId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
          sameSite: "lax",
          httpOnly: true,
          secure: true,
        });
      }
      return res;
    }
  }

  return intlMiddleware(request) as NextResponse;
}

export const config = {
  // Skip Next internals, static assets, and the Supabase OAuth callback.
  // API routes are INCLUDED so the global per-IP DDoS-shield limiter runs
  // before route handlers. The proxy short-circuits for /api/* after the
  // limiter check (no i18n logic for API requests).
  matcher: [
    "/((?!auth/callback|_next|_vercel|.*\\..*).*)",
  ],
};
