/**
 * True wenn aktuell ein Vercel-Preview-Deployment läuft.
 * Server-side: liest VERCEL_ENV (von Vercel automatisch gesetzt).
 * Client-side: liest NEXT_PUBLIC_VERCEL_ENV (zur Build-Zeit inlined).
 *
 * WICHTIG: Wir lesen process.env.NEXT_PUBLIC_VERCEL_ENV als KONSTANTE
 * direkt im Modul-Scope (nicht in einer Funktion), damit Next.js die
 * Variable zur Build-Zeit zuverlässig durch ihren String-Wert ersetzt.
 */

// Zur Build-Zeit von Next.js durch String-Literal ersetzt
// (oder undefined wenn Variable nicht gesetzt ist).
const PUBLIC_VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV;

export function isPreviewDeployment(): boolean {
  // Server-Side: liest VERCEL_ENV direkt von Vercel
  return process.env.VERCEL_ENV === "preview";
}

export function isPreviewDeploymentClient(): boolean {
  // Browser: konstante aus Build-Zeit
  if (typeof window !== "undefined") {
    return PUBLIC_VERCEL_ENV === "preview";
  }
  // SSR: server-side check
  return isPreviewDeployment();
}
