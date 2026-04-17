"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "@/app/landing.module.css";

// Compact inline SVG flags. Kept intentionally small and rectangular so they
// sit on the same visual weight as the Oswald locale code next to them.
const FLAGS: Record<(typeof routing.locales)[number], React.ReactNode> = {
  de: (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden>
      <rect width="20" height="4.67" y="0" fill="#000" />
      <rect width="20" height="4.67" y="4.67" fill="#DD0000" />
      <rect width="20" height="4.67" y="9.33" fill="#FFCE00" />
    </svg>
  ),
  en: (
    <svg width="20" height="14" viewBox="0 0 60 42" preserveAspectRatio="none" aria-hidden>
      <rect width="60" height="42" fill="#012169" />
      <path d="M0,0 L60,42 M60,0 L0,42" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 L60,42 M60,0 L0,42" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V42 M0,21 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30,0 V42 M0,21 H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  ),
  it: (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden>
      <rect x="0" width="6.67" height="14" fill="#009246" />
      <rect x="6.67" width="6.67" height="14" fill="#fff" />
      <rect x="13.33" width="6.67" height="14" fill="#CE2B37" />
    </svg>
  ),
};

const LABELS: Record<(typeof routing.locales)[number], string> = {
  de: "Deutsch",
  en: "English",
  it: "Italiano",
};

export default function LanguageSwitcher() {
  const locale = useLocale() as (typeof routing.locales)[number];
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click — same pattern as the account dropdown.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function switchTo(next: (typeof routing.locales)[number]) {
    setOpen(false);
    if (next === locale) return;
    // router.replace with the same pathname + new locale. next-intl handles
    // the URL rewrite AND sets the preferred_locale cookie (configured in
    // i18n/routing.ts#localeCookie) so the choice survives future visits.
    // Wrapped in startTransition so the UI keeps responsive during the nav.
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className={styles.langSwitcher} ref={containerRef}>
      <button
        className={styles.langSwitcherBtn}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Sprache wechseln"
      >
        {FLAGS[locale]}
        <span className={styles.langSwitcherCode}>{locale.toUpperCase()}</span>
        <span className={`${styles.langSwitcherChevron}${open ? ` ${styles.langSwitcherChevronOpen}` : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.langSwitcherMenu} role="listbox">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              className={`${styles.langSwitcherItem}${loc === locale ? ` ${styles.langSwitcherItemActive}` : ""}`}
              onClick={() => switchTo(loc)}
              role="option"
              aria-selected={loc === locale}
            >
              {FLAGS[loc]}
              <span className={styles.langSwitcherItemCode}>{loc.toUpperCase()}</span>
              <span className={styles.langSwitcherItemLabel}>{LABELS[loc]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
