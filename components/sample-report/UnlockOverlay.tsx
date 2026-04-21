"use client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./UnlockOverlay.module.css";

// Sits absolutely on top of a blurred sample-report section. Click routes
// the user through the usual kaufen flow (auth check → /kaufen → Stripe).
// The secondary "download sample PDF" link keeps the low-friction escape
// hatch so we don't lose users who aren't ready to commit.
interface Props {
  /** Heading that describes what lives under the blur (e.g. "30-Tage Prognose"). */
  title: string;
  /** 1-line teaser body so the blur feels layered, not wall-to-wall. */
  description: string;
}

const LOCK_ICON = (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
    <rect x="5" y="10" width="12" height="9" rx="1.5" stroke="#fff" strokeWidth="1.6" />
    <path d="M7.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="#fff" strokeWidth="1.6" />
    <circle cx="11" cy="14.3" r="1.3" fill="#fff" />
  </svg>
);

export default function UnlockOverlay({ title, description }: Props) {
  const t = useTranslations("sample_report.unlock");
  const router = useRouter();

  async function handleUnlock() {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    router.push(data.user ? "/kaufen" : "/login?next=/kaufen");
  }

  return (
    <div className={styles.overlay} role="region" aria-label={title}>
      <div className={styles.inner}>
        <div className={styles.lockBadge}>
          {LOCK_ICON}
          <span>{t("lock_badge")}</span>
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <button type="button" onClick={handleUnlock} className={styles.cta}>
          {t("cta")}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <a href="/api/sample-report/pdf" className={styles.altLink}>
          {t("alt_pdf")}
        </a>
      </div>
    </div>
  );
}
