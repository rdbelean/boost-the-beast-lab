"use client";
import { motion, animate } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

function AnimatedCounter({ target, duration = 2.5 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const c = animate(0, target, { duration, ease: "easeOut", onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => c.stop();
  }, [target, duration]);
  return <span>{display}</span>;
}

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Red glow — zentriert, prominent */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl pointer-events-none"
        style={{
          width: "800px",
          height: "500px",
          background: "radial-gradient(ellipse, rgba(230,50,34,0.22) 0%, transparent 70%)",
        }}
      />

      {/* Dekorative Zahl rechts */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none hidden xl:block"
        style={{
          fontSize: "260px",
          color: "rgba(255,255,255,0.03)",
          lineHeight: 1,
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
        }}
      >
        <AnimatedCounter target={87} duration={3.5} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-8 text-center pt-28 pb-16">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-3 mb-10 px-5 py-2.5"
          style={{
            border: "1px solid var(--border-light)",
            background: "rgba(230,50,34,0.1)",
            borderRadius: "2px",
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse-red"
            style={{ background: "var(--accent-red)" }}
          />
          <span
            className="font-headline text-xs tracking-[0.35em]"
            style={{ color: "var(--accent-red)" }}
          >
            PERFORMANCE INTELLIGENCE SYSTEM
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="font-headline font-bold leading-none mb-8"
          style={{ fontSize: "clamp(2.2rem, 5vw, 4.5rem)" }}
        >
          <span className="block" style={{ color: "var(--text-primary)" }}>DEIN KÖRPER.</span>
          <span className="block" style={{ color: "var(--text-primary)" }}>DEINE DATEN.</span>
          <span className="block gradient-red-text">DEIN LEVEL.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Performance Diagnostik auf wissenschaftlichem Niveau — ohne Labor, ohne Wartezeit.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-row gap-4 justify-center items-center mb-20"
        >
          <Link href="/assessment?product=complete-analysis" className="btn-primary" style={{ fontSize: "15px", padding: "16px 40px" }}>
            STARTE DEINE ANALYSE
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <a href="#how-it-works" className="btn-secondary" style={{ fontSize: "14px", padding: "15px 32px" }}>
            Wie es funktioniert
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          className="inline-flex divide-x rounded-sm overflow-hidden"
          style={{
            border: "1px solid var(--border-light)",
            background: "var(--surface-card)",
          }}
        >
          {[
            { value: "15", label: "Fragen" },
            { value: "4", label: "Scores" },
            { value: "< 5 Min", label: "Ergebnis" },
            { value: "100%", label: "Automatisiert" },
          ].map(({ value, label }, i) => (
            <div
              key={label}
              className="text-center px-8 py-5"
              style={{ borderRight: i < 3 ? "1px solid var(--border)" : "none" }}
            >
              <div className="font-mono-data text-xl font-bold mb-1" style={{ color: "var(--accent-red)" }}>
                {value}
              </div>
              <div className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)", fontFamily: "'Oswald', sans-serif" }}>
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: "var(--text-muted)" }}
      >
        <div className="text-xs tracking-[0.3em] font-headline">SCROLL</div>
        <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
