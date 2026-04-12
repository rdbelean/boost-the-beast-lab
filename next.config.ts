import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a pre-built Chromium binary that must NOT be
  // bundled/processed by Turbopack — it needs to stay as a raw Node require
  // so the binary asset is available at runtime on Vercel Lambda.
  serverExternalPackages: ["@sparticuz/chromium"],
};

export default nextConfig;
