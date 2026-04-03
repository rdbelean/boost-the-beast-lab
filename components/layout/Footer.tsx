export default function Footer() {
  return (
    <footer style={{ background: "var(--bg-section-alt)", borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row justify-between gap-12 pb-12" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="max-w-xs">
            <div className="font-headline text-white text-xl font-bold tracking-widest mb-1">BOOST THE BEAST</div>
            <div className="text-xs tracking-[0.35em] mb-6" style={{ color: "var(--accent-red)", fontFamily: "'Oswald', sans-serif" }}>
              PERFORMANCE LAB
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Performance Insights auf wissenschaftlichem Niveau — kalibriert nach WHO & ACSM.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <div className="font-headline text-xs tracking-widest mb-6" style={{ color: "var(--text-muted)" }}>LEGAL</div>
              <ul className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li><a href="#" className="hover:text-white transition-colors">Impressum</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Datenschutz</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AGB</a></li>
              </ul>
            </div>
            <div>
              <div className="font-headline text-xs tracking-widest mb-6" style={{ color: "var(--text-muted)" }}>KONTAKT</div>
              <ul className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li>
                  <a href="mailto:lab@boostthebeast.com" className="hover:text-white transition-colors">
                    lab@boostthebeast.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Boost The Beast Lab. Alle Rechte vorbehalten.
          </p>
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            Keine medizinische Diagnose. Performance Insights only.
          </p>
        </div>
      </div>
    </footer>
  );
}
