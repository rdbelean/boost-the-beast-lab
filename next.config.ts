import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a pre-built Chromium binary that must NOT be
  // bundled/processed by Turbopack — it needs to stay as a raw Node require
  // so the binary asset is available at runtime on Vercel Lambda.
  // (Only /api/plan/pdf still uses Puppeteer; report PDF now uses @react-pdf/renderer.)
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // Ensure the Chromium binary assets (.br, .tar.br) are included in the
  // plan-PDF serverless function output on Vercel.
  outputFileTracingIncludes: {
    "/api/plan/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;
