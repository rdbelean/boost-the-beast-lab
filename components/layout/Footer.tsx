"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "@/app/landing.module.css";

export default function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();
  return (
    <>
      {/* Claim */}
      <div className={styles.footerClaim}>
        <div className={styles.footerClaimText}>
          {t("claim")}
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.svg" width={103} height={64} alt="" aria-hidden="true" style={{ objectFit: "contain", marginBottom: 8 }} />
              <span className={styles.footerBrandName}>BOOST THE BEAST</span>
              <span className={styles.footerBrandSub}>PERFORMANCE LAB</span>
              <p className={styles.footerBrandDesc}>
                {t("brand_desc")}
              </p>
            </div>

            <div className={styles.footerLinks}>
              <div>
                <span className={styles.footerColTitle}>{t("col_legal")}</span>
                <ul className={styles.footerColList}>
                  <li>
                    <Link href="/impressum" className={styles.footerLink}>{t("links.imprint")}</Link>
                  </li>
                  <li>
                    <Link href="/datenschutz" className={styles.footerLink}>{t("links.privacy")}</Link>
                  </li>
                  <li>
                    <Link href="/cookies" className={styles.footerLink}>{t("links.cookies")}</Link>
                  </li>
                </ul>
              </div>
              <div>
                <span className={styles.footerColTitle}>{t("col_contact")}</span>
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
              {t("disclaimer")}
            </p>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              {t("copy", { year })}
            </p>
            <p className={styles.footerCopy}>
              {t("copy_note")}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
