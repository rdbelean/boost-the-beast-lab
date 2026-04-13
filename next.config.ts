import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a pre-built Chromium binary that must NOT be
  // bundled/processed by Turbopack — it needs to stay as a raw Node require
  // so the binary asset is available at runtime on Vercel Lambda.
  // (Only /api/plan/pdf still uses Puppeteer; report PDF now uses @react-pdf/renderer.)
  // @sparticuz/chromium and puppeteer-core: plan PDF only (binary assets)
  // @react-pdf/* packages use dynamic require() patterns that break when
  // bundled by webpack — must be loaded as native Node.js modules at runtime.
  serverExternalPackages: [
    "@sparticuz/chromium",
    "puppeteer-core",
    "@react-pdf/renderer",
    "@react-pdf/font",
    "@react-pdf/layout",
    "@react-pdf/pdfkit",
    "@react-pdf/render",
    "@react-pdf/fns",
    "@react-pdf/reconciler",
  ],

  // Ensure the Chromium binary assets (.br, .tar.br) are included in the
  // plan-PDF serverless function output on Vercel.
  outputFileTracingIncludes: {
    "/api/plan/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;
