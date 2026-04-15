import Link from "next/link";
import styles from "./legal.module.css";

export const metadata = {
  title: "Datenschutz · Boost The Beast Lab",
};

export default function DatenschutzPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backRow}>← HOME</Link>

        <Link href="/" className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M16 1L29.5 8.5V23.5L16 31L2.5 23.5V8.5L16 1Z"
              fill="#2D0A06" stroke="#E63222" strokeWidth="1.5" />
            <path d="M13 22l3-12 3 12h-2.5v4h-1v-4H13z" fill="#E63222" />
          </svg>
          <div>
            <span className={styles.logoText}>BOOST THE BEAST</span>
            <span className={styles.logoSub}>PERFORMANCE LAB</span>
          </div>
        </Link>

        <h1 className={styles.title}>DATENSCHUTZERKLÄRUNG</h1>

        <p className={styles.text}>
          Diese Datenschutzerklärung informiert dich darüber, wie wir personenbezogene Daten bei der Nutzung von boostthebeast-lab.com verarbeiten. Rechtsgrundlage ist die Datenschutz-Grundverordnung (DSGVO) sowie das Bundesdatenschutzgesetz (BDSG) und das TDDDG.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Verantwortlicher</h2>
          <p className={styles.text}>
            Verantwortlich für die Datenverarbeitung auf dieser Website ist:
          </p>
          <p className={styles.text}>
            Marco Colella{"\n"}
            BOOST THE BEAST® TRAINING{"\n"}
            Friedrichstraße 102{"\n"}
            40217 Düsseldorf{"\n"}
            Deutschland
          </p>
          <p className={styles.text}>
            Telefon: 0162 2538172{"\n"}
            E-Mail: <a href="mailto:info@boostthebeast.com">info@boostthebeast.com</a>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Zuständige Aufsichtsbehörde</h2>
          <p className={styles.text}>
            Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen{"\n"}
            Kavalleriestraße 2–4{"\n"}
            40213 Düsseldorf{"\n"}
            Telefon: 0211 38424-0{"\n"}
            E-Mail: poststelle@ldi.nrw.de{"\n"}
            Web:{" "}
            <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer">
              https://www.ldi.nrw.de
            </a>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Deine Rechte als betroffene Person</h2>
          <p className={styles.text}>
            Du hast jederzeit das Recht auf:
          </p>
          <ul className={styles.list}>
            <li>Auskunft über die zu deiner Person gespeicherten Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen die Verarbeitung, insbesondere gegen Direktwerbung (Art. 21 DSGVO)</li>
            <li>Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
            <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p className={styles.text}>
            Zur Ausübung deiner Rechte genügt eine formlose E-Mail an{" "}
            <a href="mailto:info@boostthebeast.com">info@boostthebeast.com</a>. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Zugriffsdaten und Server-Logs</h2>
          <p className={styles.text}>
            Beim Aufruf unserer Website übermittelt dein Browser automatisch technische Informationen an unseren Hosting-Anbieter. Dabei werden folgende Daten kurzfristig in Server-Logs verarbeitet:
          </p>
          <ul className={styles.list}>
            <li>IP-Adresse des anfragenden Geräts</li>
            <li>Datum und Uhrzeit der Anfrage</li>
            <li>Name und URL der abgerufenen Datei</li>
            <li>Übertragene Datenmenge und HTTP-Status</li>
            <li>Browser-Typ und Betriebssystem</li>
            <li>Referrer-URL</li>
          </ul>
          <p className={styles.text}>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt im stabilen, sicheren Betrieb der Website und der Abwehr von Missbrauch. Die Daten werden nach spätestens 7 Tagen gelöscht, soweit nicht ein konkreter Sicherheitsvorfall eine längere Aufbewahrung erfordert.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Cookies und vergleichbare Technologien</h2>
          <p className={styles.text}>
            Wir setzen ausschließlich <strong>technisch notwendige Cookies</strong> ein, die für den Betrieb der Website und deine eingeloggte Sitzung erforderlich sind. Dazu gehören insbesondere die Supabase-Authentifizierungs-Cookies (z.&nbsp;B. <code>sb-&lt;projekt&gt;-auth-token</code>, <code>sb-&lt;projekt&gt;-refresh-token</code>), mit denen dein Login über Seitenaufrufe hinweg erhalten bleibt.
          </p>
          <p className={styles.text}>
            Für diese technisch notwendigen Cookies ist nach § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung erforderlich. Tracking-, Marketing- oder Analyse-Cookies setzen wir nicht ein. Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (Vertragsdurchführung).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Registrierung und Login (Supabase)</h2>
          <p className={styles.text}>
            Für die Nutzung deines Accounts kannst du dich per E-Mail und Einmal-Code (OTP) anmelden. Hierbei verarbeiten wir deine E-Mail-Adresse sowie die zugehörigen Authentifizierungs-Token.
          </p>
          <p className={styles.text}>
            Auftragsverarbeiter für Authentifizierung, Datenbank und Dateispeicher ist Supabase, Inc. (970 Toa Payoh North #07-04, Singapur 318992), die Daten innerhalb der von uns konfigurierten Region in eigenen bzw. angemieteten Rechenzentren verarbeitet. Mit Supabase besteht ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Soweit personenbezogene Daten in ein Drittland außerhalb der EU übermittelt werden, erfolgt dies auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
          </p>
          <p className={styles.text}>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung und -erfüllung). Die Account-Daten werden bis zum Widerruf bzw. bis zur Löschung deines Accounts gespeichert.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Fitness- und Assessment-Daten</h2>
          <p className={styles.text}>
            Im Rahmen des Performance-Assessments erhebst du folgende Angaben freiwillig selbst und übermittelst sie an uns:
          </p>
          <ul className={styles.list}>
            <li>Alter, Geschlecht, Größe, Körpergewicht</li>
            <li>Angaben zu körperlicher Aktivität (Häufigkeit, Intensität, Dauer)</li>
            <li>Angaben zu Schlaf, Regeneration und subjektivem Wohlbefinden</li>
            <li>Angaben zu Ernährung, Sitzzeiten und Flüssigkeitszufuhr</li>
            <li>Angaben zu Stressempfinden und allgemeinem Befinden</li>
          </ul>
          <p className={styles.text}>
            Diese Daten werden ausschließlich zur Berechnung deiner individuellen Performance-Scores und zur Erstellung deines persönlichen Reports verwendet. Sie dienen <strong>nicht</strong> der medizinischen Diagnose und ersetzen keinen Arztbesuch.
          </p>
          <p className={styles.text}>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Soweit einzelne dieser Angaben als Gesundheitsdaten im Sinne des Art. 9 Abs. 1 DSGVO einzuordnen sind, erfolgt die Verarbeitung zusätzlich auf Grundlage deiner ausdrücklichen Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO, die du jederzeit mit Wirkung für die Zukunft widerrufen kannst.
          </p>
          <p className={styles.text}>
            Deine Assessment-Daten werden gespeichert, solange du sie für deinen Report benötigst, längstens jedoch bis zum Widerruf oder zur Löschung deines Accounts.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. KI-gestützte Report-Erstellung (Anthropic)</h2>
          <p className={styles.text}>
            Für die Generierung deines individuellen Performance-Reports übermitteln wir deine Assessment-Daten (pseudonymisiert, ohne Klarnamen) an die Claude-API von Anthropic, PBC, 548 Market St, PMB 90375, San Francisco, CA 94104, USA.
          </p>
          <p className={styles.text}>
            Anthropic verarbeitet die Daten ausschließlich zur Generierung des Antwort-Textes und nutzt sie vertraglich nicht zum Training eigener Modelle. Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO; Anthropic ist nach dem EU-US Data Privacy Framework zertifiziert.
          </p>
          <p className={styles.text}>
            <strong>Kein Art. 22 DSGVO:</strong> Der generierte Report ist ein informatives Hilfsmittel. Er entfaltet dir gegenüber keine rechtliche Wirkung und stellt keine automatisierte Einzelentscheidung im Sinne des Art. 22 DSGVO dar.
          </p>
          <p className={styles.text}>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie – für den Drittlandtransfer – Art. 49 Abs. 1 lit. a DSGVO (deine ausdrückliche Einwilligung) in Verbindung mit Art. 46 DSGVO (Standardvertragsklauseln).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Zahlungsabwicklung (Stripe)</h2>
          <p className={styles.text}>
            Für die Abwicklung von Zahlungen nutzen wir Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland. Beim Checkout wirst du auf eine von Stripe gehostete Zahlungsseite weitergeleitet. Deine Zahlungsdaten (z.&nbsp;B. Kreditkartennummer) gibst du ausschließlich bei Stripe ein; wir erhalten diese Daten zu keinem Zeitpunkt.
          </p>
          <p className={styles.text}>
            Von Stripe erhalten wir nach Abschluss einer Transaktion lediglich folgende Informationen, die wir zur Buchhaltung und zur Zuordnung deines Kaufs speichern: Stripe-Session-ID, Stripe-Customer-ID, Zahlungsmittel-ID, Betrag, Währung sowie die von dir angegebene E-Mail-Adresse.
          </p>
          <p className={styles.text}>
            Weitere Informationen zum Datenschutz bei Stripe findest du unter{" "}
            <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">
              https://stripe.com/de/privacy
            </a>
            .
          </p>
          <p className={styles.text}>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Zahlungs- und Rechnungsdaten werden zur Erfüllung handels- und steuerrechtlicher Aufbewahrungspflichten (§ 257 HGB, § 147 AO) bis zu 10 Jahre gespeichert.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Versand deines Reports per E-Mail (Resend)</h2>
          <p className={styles.text}>
            Für den Versand deines Performance-Reports und für transaktionale System-E-Mails (z.&nbsp;B. Login-Codes) nutzen wir den E-Mail-Dienst Resend, Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA. Dabei werden deine E-Mail-Adresse und der Inhalt der jeweiligen Nachricht an Resend übermittelt.
          </p>
          <p className={styles.text}>
            Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>11. Hosting (Vercel)</h2>
          <p className={styles.text}>
            Unsere Website wird bei Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA gehostet. Vercel verarbeitet die unter Punkt 4 genannten Zugriffsdaten in unserem Auftrag. Die Auslieferung erfolgt soweit möglich über europäische Edge-Knoten.
          </p>
          <p className={styles.text}>
            Mit Vercel besteht ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Für die Übermittlung in die USA gelten die EU-Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO. Weitere Informationen:{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
              https://vercel.com/legal/privacy-policy
            </a>
            .
          </p>
          <p className={styles.text}>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem performanten und sicheren Webauftritt).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>12. Schriftarten</h2>
          <p className={styles.text}>
            Die auf dieser Website verwendeten Schriftarten (Oswald, Inter, JetBrains Mono) werden lokal über unseren eigenen Server ausgeliefert (Self-Hosting via <code>next/font</code>). Es erfolgt <strong>keine</strong> Verbindung zu Google- oder anderen Drittanbieter-Servern für die Schrift-Auslieferung; insbesondere werden keine IP-Adressen an Google übermittelt.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>13. Speicherdauer – Übersicht</h2>
          <ul className={styles.list}>
            <li>Server-Log-Dateien: max. 7 Tage</li>
            <li>Account-Daten (E-Mail, Authentifizierung): bis zum Widerruf / Löschung des Accounts</li>
            <li>Assessment- und Score-Daten: bis zum Widerruf / Löschung des Accounts</li>
            <li>Zahlungs- und Rechnungsdaten: 10 Jahre (§ 257 HGB, § 147 AO)</li>
            <li>Auth-Session-Cookies: bis zum Logout oder Ablauf der Sitzung</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>14. SSL-/TLS-Verschlüsselung</h2>
          <p className={styles.text}>
            Zum Schutz der Übertragung vertraulicher Inhalte nutzen wir eine SSL-/TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennst du an der Zeichenfolge „https://" in der Adresszeile deines Browsers und am Schloss-Symbol.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>15. Aktualität dieser Datenschutzerklärung</h2>
          <p className={styles.text}>
            Diese Datenschutzerklärung kann angepasst werden, wenn sich Rechtslage, Technik oder unsere Datenverarbeitungen ändern. Die jeweils aktuelle Fassung ist auf dieser Seite abrufbar.
          </p>
          <p className={styles.text}>
            Stand: April 2026
          </p>
        </section>
      </div>
    </div>
  );
}
