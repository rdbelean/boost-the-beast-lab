import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a pre-built Chromium binary that must NOT be
  // bundled/processed by Turbopack — it needs to stay as a raw Node require
  // so the binary asset is available at runtime on Vercel Lambda.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // Ensure the Chromium binary assets (.br, .tar.br) are included in the
  // serverless function output on Vercel.
  outputFileTracingIncludes: {
    "/api/report/generate": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/api/plan/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;
