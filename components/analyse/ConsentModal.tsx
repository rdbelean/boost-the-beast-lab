"use client";

// GDPR consent modal shown on /analyse/prepare before any health-data
// upload UI is rendered. Non-dismissable (no X, no backdrop click, no
// ESC) because DSGVO requires an active decision — silent dismissal
// would not be a valid consent.
//
// Both buttons are styled identically: no dark pattern, no primary/
// secondary visual hierarchy. The user must consciously choose.
//
// Locale auto-switches via next-intl. On click we record the locale
// that was visible at the moment of the click (useLocale()).

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./ConsentModal.module.css";

interface Props {
  /** Stripe Checkout Session ID — required so the consent log row can be
   *  tied to the specific report transaction (DSGVO Art. 9 Abs. 2 lit. a:
   *  consent is scoped per processing purpose, not user-lifetime). */
  reportSessionId: string;
  onGranted: () => void;
  onDeclined: () => void;
}

type Decision = "granted" | "declined";

export default function ConsentModal({ reportSessionId, onGranted, onDeclined }: Props) {
  const t = useTranslations("consent_modal");
  const locale = useLocale();
  const [loading, setLoading] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: Decision) {
    setLoading(decision);
    setError(null);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          text_locale: locale,
          report_session_id: reportSessionId,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (decision === "granted") onGranted();
      else onDeclined();
    } catch (err) {
      console.error("[ConsentModal] save failed", err);
      setError(t("error_save_failed"));
      setLoading(null);
    }
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="consent-modal-heading">
      <div className={styles.modal}>
        <h2 id="consent-modal-heading" className={styles.heading}>
          {t("heading")}
        </h2>
        <p className={styles.body}>
          {t.rich("body", {
            privacy_link: (chunks) => (
              <Link href="/datenschutz" className={styles.link} target="_blank" rel="noopener noreferrer">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <p className={styles.hint}>{t("hint")}</p>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            onClick={() => submit("granted")}
            disabled={loading !== null}
          >
            {loading === "granted" ? "…" : t("button_yes")}
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => submit("declined")}
            disabled={loading !== null}
          >
            {loading === "declined" ? "…" : t("button_no")}
          </button>
        </div>
      </div>
    </div>
  );
}
