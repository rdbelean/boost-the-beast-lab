// Server-side check (proxy.ts, Route Handler, Server Components).
// Vercel sets VERCEL_ENV automatically — "production" on the live deploy,
// "preview" on every branch deploy, "development" on `vercel dev`. On
// `npm run dev` locally, VERCEL_ENV is undefined → returns false.
export function isPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

// Client-side check. NEXT_PUBLIC_VERCEL_ENV is inlined at build time via
// the `env` block in next.config.ts. On the Vercel preview build the
// value is "preview"; on production builds it is "production"; locally
// it is undefined → returns false. Falls back to the server check on SSR.
export function isPreviewDeploymentClient(): boolean {
  if (typeof window === "undefined") return isPreviewDeployment();
  return process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
}
