import Link from "next/link";
import styles from "./legal.module.css";

export const metadata = {
  title: "Cookie-Richtlinie · Boost The Beast Lab",
};

export default function CookiesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backRow}>← HOME</Link>

        <Link href="/" className={styles.logo}>
          <img src="/logo-white.svg" width={58} height={36} alt="" aria-hidden="true" style={{ objectFit: "contain" }} />
          <div>
            <span className={styles.logoText}>BOOST THE BEAST</span>
            <span className={styles.logoSub}>PERFORMANCE LAB</span>
          </div>
        </Link>

        <h1 className={styles.title}>COOKIE-RICHTLINIE</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Übersicht</h2>
          <p className={styles.text}>
            Diese Website verwendet ausschließlich technisch notwendige Cookies. Es werden keine
            Tracking-, Analyse- oder Werbe-Cookies eingesetzt. Eine Einwilligung ist nach Art. 6
            Abs. 1 lit. f DSGVO in Verbindung mit § 25 Abs. 2 TTDSG nicht erforderlich, da die
            nachfolgend beschriebenen Cookies zum Betrieb der Website technisch notwendig sind.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Verwendete Cookies</h2>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Anbieter</th>
                <th>Zweck</th>
                <th>Speicherdauer</th>
                <th>Typ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sb-*-auth-token</code></td>
                <td>Supabase (selbst gehostet)</td>
                <td>
                  Speichert die verschlüsselte Login-Session nach erfolgreicher
                  Authentifizierung. Ohne dieses Cookie ist kein eingeloggter
                  Bereich erreichbar.
                </td>
                <td>Session / bis Abmeldung</td>
                <td><span className={styles.badge}>NOTWENDIG</span></td>
              </tr>
              <tr>
                <td><code>__stripe_mid</code><br /><code>__stripe_sid</code></td>
                <td>Stripe Inc.</td>
                <td>
                  Werden von Stripe während des Bezahlvorgangs gesetzt, um
                  Betrugserkennung zu ermöglichen und die Transaktion
                  abzusichern. Stripe ist PCI-DSS-konform.
                </td>
                <td>1 Jahr / 30 Minuten</td>
                <td><span className={styles.badge}>NOTWENDIG</span></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Session Storage (kein Cookie)</h2>
          <p className={styles.text}>
            Während einer aktiven Browser-Sitzung werden Analyseergebnisse und
            Report-Daten im <code>sessionStorage</code> des Browsers zwischengespeichert
            (Schlüssel: <code>btb_results</code>). Diese Daten verlassen nicht den Browser,
            werden nicht an Server übermittelt und werden beim Schließen des Tabs automatisch
            gelöscht. Dies ist kein Cookie im Sinne des TTDSG.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Kein Tracking, keine Analyse</h2>
          <p className={styles.text}>
            Es sind weder Google Analytics, Facebook Pixel, Hotjar, noch andere
            Tracking- oder Analyse-Dienste in diese Website eingebunden. Es werden
            keine personenbezogenen Daten zu Marketing- oder Werbezwecken verarbeitet.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cookies verwalten & löschen</h2>
          <p className={styles.text}>
            Du kannst Cookies jederzeit über die Einstellungen deines Browsers löschen
            oder blockieren. Bitte beachte, dass das Blockieren notwendiger Cookies die
            Funktionalität der Website (Login, Zahlungsabwicklung) einschränken kann.{"\n\n"}
            Anleitungen für gängige Browser:{"\n"}
            • Chrome: Einstellungen → Datenschutz und Sicherheit → Cookies{"\n"}
            • Firefox: Einstellungen → Datenschutz & Sicherheit → Cookies{"\n"}
            • Safari: Einstellungen → Datenschutz → Cookies verwalten
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Kontakt</h2>
          <p className={styles.text}>
            Bei Fragen zur Cookie-Nutzung wende dich an:{"\n"}
            <a href="mailto:info@boostthebeast.com">info@boostthebeast.com</a>{"\n\n"}
            Weitere Informationen zur Datenverarbeitung findest du in unserer{" "}
            <Link href="/datenschutz" style={{ color: "#fff", textDecoration: "underline" }}>
              Datenschutzerklärung
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
