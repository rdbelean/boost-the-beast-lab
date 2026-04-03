"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/landing.module.css";

export default function Header() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

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

  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 1L29.5 8.5V23.5L16 31L2.5 23.5V8.5L16 1Z"
              fill="#2D0A06" stroke="#E63222" strokeWidth="1.5"/>
            <path d="M13 22l3-12 3 12h-2.5v4h-1v-4H13z" fill="#E63222"/>
          </svg>
          <div>
            <span className={styles.logoText}>BOOST THE BEAST</span>
            <span className={styles.logoSub}>PERFORMANCE LAB</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className={styles.nav}>
          {[
            { href: "/#how-it-works", label: "WIE ES FUNKTIONIERT", id: "how-it-works" },
            { href: "/#products",     label: "REPORTS",              id: "products" },
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

        {/* CTA */}
        <Link href="/assessment?product=complete-analysis" className={styles.headerCta}>
          ANALYSE STARTEN →
        </Link>
      </div>
    </header>
  );
}
