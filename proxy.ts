import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

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
export default createMiddleware(routing);

export const config = {
  // Skip Next internals, static assets, API routes, and the Supabase
  // OAuth callback. Everything else runs through the proxy so locale
  // detection and legacy-URL rewrites kick in.
  matcher: [
    "/((?!api|auth/callback|_next|_vercel|.*\\..*).*)",
  ],
};
