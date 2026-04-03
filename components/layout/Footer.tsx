"use client";
import styles from "@/app/landing.module.css";

export default function Footer() {
  return (
    <>
      {/* Claim */}
      <div className={styles.footerClaim}>
        <div className={styles.footerClaimText}>
          MADE FOR ATHLETES. NOT FOR AVERAGE.
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <span className={styles.footerBrandName}>BOOST THE BEAST</span>
              <span className={styles.footerBrandSub}>PERFORMANCE LAB</span>
              <p className={styles.footerBrandDesc}>
                Performance Insights auf wissenschaftlichem Niveau – kalibriert nach WHO &amp; ACSM.
              </p>
            </div>

            <div className={styles.footerLinks}>
              <div>
                <span className={styles.footerColTitle}>LEGAL</span>
                <ul className={styles.footerColList}>
                  {["Impressum", "Datenschutz", "AGB"].map((item) => (
                    <li key={item}>
                      <a href="#" className={styles.footerLink}>{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className={styles.footerColTitle}>KONTAKT</span>
                <ul className={styles.footerColList}>
                  <li>
                    <a href="mailto:lab@boostthebeast.com" className={styles.footerLink}>
                      lab@boostthebeast.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} Boost The Beast Lab. Alle Rechte vorbehalten.
            </p>
            <p className={styles.footerCopy}>
              Keine medizinische Diagnose. Performance Insights only.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
