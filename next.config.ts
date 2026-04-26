import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  env: {
    // Force NEXT_PUBLIC_VERCEL_ENV to be inlined into the client bundle.
    // Vercel auto-sets VERCEL_ENV server-side (preview/production/
    // development); we re-export it as NEXT_PUBLIC so client components
    // can read it. Used by lib/utils/is-preview.ts.
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },

  // @sparticuz/chromium ships a pre-built Chromium binary that must NOT be
  // bundled/processed by Turbopack — it needs to stay as a raw Node require
  // so the binary asset is available at runtime on Vercel Lambda.
  // (Only /api/plan/pdf still uses Puppeteer; report PDF now uses pdf-lib.)
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // Ensure the Chromium binary assets (.br, .tar.br) are included in the
  // plan-PDF serverless function output on Vercel.
  // Also bundles the Noto Sans TTFs for Turkish PDF rendering (Latin Extended-A
  // — ğ, ı, ş, İ, Ğ, Ş) — both the report-generate route and the plan-PDF
  // route need them.
  outputFileTracingIncludes: {
    "/api/plan/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./lib/pdf/fonts/**",
    ],
    "/api/report/generate": [
      "./lib/pdf/fonts/**",
    ],
  },
};

export default withNextIntl(nextConfig);
