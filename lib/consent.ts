// Shared cookie-consent constants used by CookieBanner and analytics loaders.
// Value is "granted" | "denied"; absence means the user hasn't decided yet.
export const CONSENT_KEY = "btb_cookie_consent";

// Dispatched on window when the consent value changes, so listeners can react
// (e.g. load analytics) without requiring a full page reload.
export const CONSENT_EVENT = "btb-consent-changed";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "granted";
}
