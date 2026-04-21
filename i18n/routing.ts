import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en", "it", "ko"] as const,
  defaultLocale: "de",
  // "always" → every URL is prefixed (/de/..., /en/...). The bare "/" is
  // then handled by our proxy (proxy.ts) which runs Accept-Language
  // detection and redirects to the detected locale. Keeping every URL
  // prefixed avoids the ambiguity that "as-needed" introduces around
  // the default locale (no /de prefix would be shown, breaking the
  // switcher and hreflang tags).
  localePrefix: "always",
  localeCookie: {
    name: "preferred_locale",
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type Locale = (typeof routing.locales)[number];
