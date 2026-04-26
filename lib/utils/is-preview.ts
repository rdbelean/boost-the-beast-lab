/**
 * Preview-Deployment-Erkennung — robust gegen Bundler-Quirks.
 *
 * Server-Side: liest VERCEL_ENV (von Vercel automatisch gesetzt).
 * Client-Side: prüft window.location.hostname direkt — keine Env-Var-
 * Abhängigkeit. Wenn Hostname auf .vercel.app endet UND nicht die
 * Production-Domain ist → Preview.
 *
 * Production-Domains (boostthebeast-lab.com / www.boostthebeast-lab.com)
 * können auch via Vercel laufen, kommen aber nicht auf .vercel.app daher.
 */

export function isPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

export function isPreviewDeploymentClient(): boolean {
  // SSR: server-side check
  if (typeof window === "undefined") {
    return isPreviewDeployment();
  }
  // Browser: Hostname-Check, kein Env-Var-Lookup
  const host = window.location.hostname;
  return host.endsWith(".vercel.app");
}
