import { Link } from "@/i18n/navigation";
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
            Diese Website verwendet technisch notwendige Cookies sowie – nur mit deiner
            ausdrücklichen Einwilligung – Analyse-Cookies des Dienstes Microsoft Clarity.{"\n\n"}
            Die technisch notwendigen Cookies sind zum Betrieb der Website erforderlich; ihre
            Verwendung ist nach Art. 6 Abs. 1 lit. f DSGVO in Verbindung mit § 25 Abs. 2 TTDSG
            ohne Einwilligung zulässig. Die Analyse-Cookies werden erst gesetzt, nachdem du im
            Cookie-Banner auf „Akzeptieren" geklickt hast (Art. 6 Abs. 1 lit. a DSGVO, § 25
            Abs. 1 TTDSG). Du kannst diese Einwilligung jederzeit mit Wirkung für die Zukunft
            widerrufen – siehe Abschnitt „Microsoft Clarity (Analyse)".
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
              <tr>
                <td><code>_clck</code></td>
                <td>Microsoft Clarity</td>
                <td>
                  Speichert eine anonyme Clarity-Nutzer-ID, damit Aktivitäten bei
                  weiteren Besuchen demselben Nutzer zugeordnet werden können. Wird
                  nur mit Einwilligung gesetzt.
                </td>
                <td>1 Jahr</td>
                <td><span className={`${styles.badge} ${styles.badgeAnalytics}`}>ANALYSE</span></td>
              </tr>
              <tr>
                <td><code>_clsk</code></td>
                <td>Microsoft Clarity</td>
                <td>
                  Verbindet mehrere Seitenaufrufe einer Sitzung zu einer einzelnen
                  Aufzeichnung. Wird nur mit Einwilligung gesetzt.
                </td>
                <td>1 Tag</td>
                <td><span className={`${styles.badge} ${styles.badgeAnalytics}`}>ANALYSE</span></td>
              </tr>
              <tr>
                <td>
                  <code>CLID</code><br /><code>MUID</code><br />
                  <code>ANONCHK</code><br /><code>SM</code>
                </td>
                <td>Microsoft (clarity.ms)</td>
                <td>
                  Von Microsoft gesetzte Cookies zur Wiedererkennung des Browsers
                  und zur Synchronisierung über Microsoft-Dienste hinweg. Werden
                  nur mit Einwilligung gesetzt.
                </td>
                <td>bis zu 13 Monate</td>
                <td><span className={`${styles.badge} ${styles.badgeAnalytics}`}>ANALYSE</span></td>
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
          <h2 className={styles.sectionTitle}>Microsoft Clarity (Analyse)</h2>
          <p className={styles.text}>
            Mit deiner Einwilligung nutzen wir Microsoft Clarity, einen Webanalyse-Dienst
            der Microsoft Corporation (One Microsoft Way, Redmond, WA 98052, USA) bzw.
            Microsoft Ireland Operations Ltd. Clarity hilft uns zu verstehen, wie Besucher
            unsere Website nutzen (z. B. Heatmaps und anonymisierte Sitzungsaufzeichnungen),
            damit wir die Seite verbessern können.{"\n\n"}
            Clarity erfasst dabei Interaktionsdaten wie Mausbewegungen, Klicks und
            Scrollverhalten sowie Geräte- und Browserinformationen. Eingaben in Formularfelder
            werden von Clarity standardmäßig maskiert. Die Datenverarbeitung kann auf Servern
            von Microsoft, auch in den USA, stattfinden. Microsoft ist unter dem EU-U.S. Data
            Privacy Framework zertifiziert; ergänzend bestehen EU-Standardvertragsklauseln.
            Details findest du in der{" "}
            <a
              href="https://privacy.microsoft.com/de-de/privacystatement"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#fff", textDecoration: "underline" }}
            >
              Datenschutzerklärung von Microsoft
            </a>.{"\n\n"}
            Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1
            TTDSG). Du kannst deine Einwilligung jederzeit mit Wirkung für die Zukunft
            widerrufen, indem du die Website-Daten (Cookies und lokalen Speicher) für diese
            Seite in deinem Browser löschst – beim nächsten Besuch erscheint der Cookie-Banner
            erneut und du kannst neu wählen.
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
