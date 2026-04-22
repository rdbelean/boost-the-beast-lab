import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { type NextRequest, NextResponse } from "next/server";

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
//   • API routes, static assets, and /auth/callback are excluded via matcher.

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

export default function proxy(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;
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
      return res;
    }
  }

  return intlMiddleware(request) as NextResponse;
}

export const config = {
  // Skip Next internals, static assets, API routes, and the Supabase
  // OAuth callback. Everything else runs through the proxy so locale
  // detection and legacy-URL rewrites kick in.
  matcher: [
    "/((?!api|auth/callback|_next|_vercel|.*\\..*).*)",
  ],
};
