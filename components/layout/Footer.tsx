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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.svg" width={48} height={48} alt="" aria-hidden="true" style={{ objectFit: "contain", marginBottom: 8 }} />
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
                  <li>
                    <a href="/impressum" className={styles.footerLink}>Impressum</a>
                  </li>
                  <li>
                    <a href="/datenschutz" className={styles.footerLink}>Datenschutz</a>
                  </li>
                  <li>
                    <a href="/cookies" className={styles.footerLink}>Cookie-Richtlinie</a>
                  </li>
                </ul>
              </div>
              <div>
                <span className={styles.footerColTitle}>KONTAKT</span>
                <ul className={styles.footerColList}>
                  <li>
                    <a href="mailto:info@boostthebeast.com" className={styles.footerLink}>
                      info@boostthebeast.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className={styles.footerDisclaimer}>
            <p className={styles.footerDisclaimerText}>
              Hinweis: Die Inhalte und Ergebnisse von Boost The Beast Lab dienen ausschließlich der allgemeinen Information
              und stellen keine medizinische Beratung, Diagnose oder Therapieempfehlung dar. Sie ersetzen in keinem Fall
              den Besuch bei einem Arzt, Heilpraktiker oder sonstigen medizinischen Fachpersonal. Bei gesundheitlichen
              Beschwerden oder Fragen zu Ihrer Gesundheit konsultieren Sie bitte immer einen Arzt. Die Nutzung der
              bereitgestellten Informationen erfolgt auf eigene Verantwortung.
            </p>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} Boost The Beast Lab. Alle Rechte vorbehalten.
            </p>
            <p className={styles.footerCopy}>
              Kein Medizinprodukt · Keine Heilkunde i.S.d. HeilprG
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
