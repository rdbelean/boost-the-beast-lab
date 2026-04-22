"use client";
import { useEffect } from "react";

// Resets scroll to the top on mount and disables browser scroll-restoration.
//
// Hash handling:
// - On a RELOAD (Cmd+R): always scroll to top AND strip the hash from the URL.
//   This fixes the case where clicking <a href="#products"> leaves "#products"
//   in the URL; without stripping, the browser would scroll there on next reload.
// - On initial navigation WITH a hash (e.g. someone follows a /de/#features link
//   from outside): let the browser scroll to the anchor as expected.
export default function ScrollToTop() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const isReload = nav?.type === "reload";

    if (isReload) {
      // Strip any leftover hash so the browser has nothing to scroll to,
      // then reset scroll position.
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      window.scrollTo(0, 0);
      // Second pass after a tick — catches any deferred scroll attempts by
      // child components (Intersection Observers, focus, etc.)
      const t = setTimeout(() => window.scrollTo(0, 0), 80);
      return () => clearTimeout(t);
    }

    // Fresh navigation: only reset if there is no intentional anchor.
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);
  return null;
}
