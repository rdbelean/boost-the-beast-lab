"use client";
import { useEffect } from "react";

// Disables browser scroll-restoration and resets to the top on mount.
// Skips the reset when the URL contains a hash so anchor-links still work.
export default function ScrollToTop() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);
  return null;
}
