"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_EVENT, hasAnalyticsConsent } from "@/lib/consent";

// Microsoft Clarity – heatmaps & session recordings.
// Project ID from clarity.microsoft.com → BoostTheBeast Lab.
const CLARITY_PROJECT_ID = "wz7zme3mkz";

export default function ClarityAnalytics() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const sync = () => setGranted(hasAnalyticsConsent());
    sync();
    // React to the user accepting/declining in the cookie banner.
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  // Only load in production (no dev-click pollution) and only after consent.
  if (process.env.NODE_ENV !== "production") return null;
  if (!granted) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
