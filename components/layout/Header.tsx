"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/landing.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [hasReport, setHasReport] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to Supabase auth state so the dropdown reflects login status.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Fetch token count whenever auth state changes
  useEffect(() => {
    if (!userEmail) {
      setTokenCount(null);
      return;
    }
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((d) => setTokenCount(d.tokens ?? 0))
      .catch(() => setTokenCount(null));
  }, [userEmail]);

  useEffect(() => {
    const ids = ["how-it-works", "products"];
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("btb_results");
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.downloadUrl) {
          setHasReport(true);
          setReportUrl(data.downloadUrl);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [dropdownOpen]);

  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" width={32} height={32} alt="" aria-hidden="true" style={{ objectFit: "contain" }} />
          <div>
            <span className={styles.logoText}>BOOST THE BEAST</span>
            <span className={styles.logoSub}>PERFORMANCE LAB</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className={styles.nav}>
          {[
            { href: "/#how-it-works", label: "WIE ES FUNKTIONIERT", id: "how-it-works" },
            { href: "/#products",     label: "PAKETE",              id: "products" },
          ].map(({ href, label, id }) => (
            <Link
              key={id}
              href={href}
              className={`${styles.navLink} ${activeSection === id ? styles.navLinkActive : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className={styles.headerActions}>
          {userEmail && hasReport && reportUrl && (
            <a href={reportUrl} target="_blank" rel="noopener noreferrer" className={styles.headerCtaSecondary}>
              AKTUELLSTER REPORT ↓
            </a>
          )}
          {/* Account dropdown */}
          <div className={styles.accountDropdown} ref={dropdownRef}>
            <button
              className={styles.accountDropdownBtn}
              onClick={() => setDropdownOpen((o) => !o)}
              aria-expanded={dropdownOpen}
            >
              {userEmail ? userEmail.split("@")[0].toUpperCase() : "MEIN ACCOUNT"}
              {userEmail && tokenCount !== null && tokenCount > 0 && (
                <span className={styles.tokenBadge}>{tokenCount}</span>
              )}
              <span className={`${styles.accountDropdownChevron}${dropdownOpen ? ` ${styles.accountDropdownChevronOpen}` : ""}`}>
                ▾
              </span>
            </button>
            {dropdownOpen && (
              <div className={styles.accountDropdownMenu}>
                <button
                  className={styles.accountDropdownItem}
                  onClick={() => { setDropdownOpen(false); router.push("/kaufen"); }}
                >
                  Neue Analyse starten →
                </button>
                {userEmail ? (
                  <>
                    <Link
                      href="/account"
                      className={styles.accountDropdownItem}
                      onClick={() => setDropdownOpen(false)}
                    >
                      Meine Reports einsehen
                    </Link>
                    <button
                      className={styles.accountDropdownItem}
                      onClick={async () => {
                        setDropdownOpen(false);
                        const supabase = getSupabaseBrowserClient();
                        await supabase.auth.signOut();
                        router.push("/");
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className={styles.accountDropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    Login / Account erstellen
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
