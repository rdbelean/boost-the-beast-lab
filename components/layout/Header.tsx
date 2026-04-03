"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(28,28,32,0.94)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-8 h-18 flex items-center justify-between" style={{ height: "68px" }}>
        <Link href="/" className="flex items-center gap-3">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <circle cx="15" cy="15" r="14" fill="var(--accent-red)" opacity="0.12"/>
            <path d="M9 11c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v4c0 3.314-2.686 6-6 6s-6-2.686-6-6v-4z" fill="var(--accent-red)" opacity="0.85"/>
            <path d="M12 14a1 1 0 100 2 1 1 0 000-2zM17 14a1 1 0 100 2 1 1 0 000-2z" fill="white"/>
            <path d="M7 9l2 4M23 9l-2 4" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <span className="font-headline text-white font-bold tracking-widest" style={{ fontSize: "13px" }}>
              BOOST THE BEAST
            </span>
            <span
              className="block text-xs tracking-[0.35em]"
              style={{ color: "var(--accent-red)", fontFamily: "'Oswald', sans-serif", fontSize: "9px" }}
            >
              PERFORMANCE LAB
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {[
            { href: "/#how-it-works", label: "Wie es funktioniert" },
            { href: "/#products", label: "Reports" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs tracking-widest transition-colors duration-200 hover:text-white"
              style={{ color: "var(--text-secondary)", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link href="/assessment?product=complete-analysis" className="btn-primary" style={{ padding: "10px 22px", fontSize: "12px" }}>
          Analyse starten →
        </Link>
      </div>
    </motion.header>
  );
}
