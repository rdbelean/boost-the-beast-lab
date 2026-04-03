"use client";
export default function Footer() {
  return (
    <>
      {/* Claim area above footer */}
      <div style={{ background: "var(--bg-base)", overflow: "hidden" }}>
        <div
          style={{
            height: "2px",
            background: "var(--accent-red)",
            boxShadow: "0 0 12px rgba(230,50,34,0.4)",
          }}
        />
        <div
          className="font-headline"
          style={{
            fontWeight: 700,
            textAlign: "center",
            userSelect: "none",
            pointerEvents: "none",
            fontSize: "clamp(40px, 8vw, 100px)",
            color: "#fff",
            opacity: 0.04,
            lineHeight: 1.2,
            padding: "40px 20px",
            textTransform: "uppercase",
          }}
        >
          MADE FOR ATHLETES. NOT FOR AVERAGE.
        </div>
      </div>

      <footer style={{ background: "var(--bg-section-alt)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "64px 32px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              gap: "48px",
              paddingBottom: "48px",
              borderBottom: "1px solid var(--border)",
              marginBottom: "32px",
            }}
          >
            <div style={{ maxWidth: "280px" }}>
              <div className="font-headline" style={{ color: "#fff", fontSize: "20px", fontWeight: 700, letterSpacing: "0.15em", marginBottom: "4px" }}>
                BOOST THE BEAST
              </div>
              <div
                className="font-headline"
                style={{ fontSize: "9px", letterSpacing: "0.35em", color: "var(--accent-red)", marginBottom: "24px" }}
              >
                PERFORMANCE LAB
              </div>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                Performance Insights auf wissenschaftlichem Niveau – kalibriert nach WHO & ACSM.
              </p>
            </div>

            <div style={{ display: "flex", gap: "64px" }}>
              <div>
                <div className="font-headline" style={{ fontSize: "12px", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "24px" }}>
                  LEGAL
                </div>
                <ul style={{ listStyle: "none" }}>
                  {["Impressum", "Datenschutz", "AGB"].map((item) => (
                    <li key={item} style={{ marginBottom: "12px" }}>
                      <a href="#" style={{ fontSize: "14px", color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                      >{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-headline" style={{ fontSize: "12px", letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "24px" }}>
                  KONTAKT
                </div>
                <ul style={{ listStyle: "none" }}>
                  <li>
                    <a href="mailto:lab@boostthebeast.com"
                      style={{ fontSize: "14px", color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                    >
                      lab@boostthebeast.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              © {new Date().getFullYear()} Boost The Beast Lab. Alle Rechte vorbehalten.
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Keine medizinische Diagnose. Performance Insights only.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
