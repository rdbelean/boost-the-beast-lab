import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL = "https://boostthebeast-lab.com";

// Public-facing routes that make sense in the sitemap. Purchase-gated
// or auth-required routes (analyse, analyse/prepare, account, plans,
// checkout, results) are intentionally omitted — Google should only
// discover routes anyone can land on.
const PUBLIC_ROUTES = [
  "", // landing (/)
  "/kaufen",
  "/login",
  "/impressum",
  "/datenschutz",
  "/cookies",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of PUBLIC_ROUTES) {
    // One entry per locale; alternates.languages lets Google associate
    // all three as translations of the same logical page.
    const languages: Record<string, string> = {};
    for (const loc of routing.locales) {
      languages[loc] = `${SITE_URL}/${loc}${route}`;
    }
    for (const loc of routing.locales) {
      entries.push({
        url: `${SITE_URL}/${loc}${route}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: route === "" ? 1.0 : 0.7,
        alternates: { languages },
      });
    }
  }

  return entries;
}
