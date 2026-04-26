"use client";

/**
 * Client-only helper. Returns true wenn die aktuelle Seite auf einer
 * Vercel-Preview-Domain läuft (*.vercel.app). False auf Production
 * (boostthebeast-lab.com) und im SSR.
 */
export function isVercelPreviewClient(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".vercel.app");
}
