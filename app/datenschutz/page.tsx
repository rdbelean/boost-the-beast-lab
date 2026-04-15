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

        <h1 className={styles.title}>DATENSCHUTZ</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Allgemeiner Hinweis und Pflichtinformationen</h2>

          <h3 className={styles.subSectionTitle}>Benennung der verantwortlichen Stelle</h3>
          <p className={styles.text}>
            Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
          </p>
          <p className={styles.text}>
            Boost the Beast – Personal Training{"\n"}
            Marco Colella{"\n"}
            Marc-Chagall-Straße 104{"\n"}
            40477 Düsseldorf
          </p>
          <p className={styles.text}>
            Die verantwortliche Stelle entscheidet allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten (z.B. Namen, Kontaktdaten o. Ä.).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Widerruf Ihrer Einwilligung zur Datenverarbeitung</h2>
          <p className={styles.text}>
            Nur mit Ihrer ausdrücklichen Einwilligung sind einige Vorgänge der Datenverarbeitung möglich. Ein Widerruf Ihrer bereits erteilten Einwilligung ist jederzeit möglich. Für den Widerruf genügt eine formlose Mitteilung per E-Mail. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recht auf Beschwerde bei der zuständigen Aufsichtsbehörde</h2>
          <p className={styles.text}>
            Als Betroffener steht Ihnen im Falle eines datenschutzrechtlichen Verstoßes ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu. Zuständige Aufsichtsbehörde bezüglich datenschutzrechtlicher Fragen ist der Landesdatenschutzbeauftragte des Bundeslandes, in dem sich der Sitz unseres Unternehmens befindet. Der folgende Link stellt eine Liste der Datenschutzbeauftragten sowie deren Kontaktdaten bereit:{" "}
            <a href="https://www.bfdi.bund.de/DE/Infothek/Anschriften_Links/anschriften_links-node.html" target="_blank" rel="noopener noreferrer">
              https://www.bfdi.bund.de/DE/Infothek/Anschriften_Links/anschriften_links-node.html
            </a>
            .
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recht auf Datenübertragbarkeit</h2>
          <p className={styles.text}>
            Ihnen steht das Recht zu, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an Dritte aushändigen zu lassen. Die Bereitstellung erfolgt in einem maschinenlesbaren Format. Sofern Sie die direkte Übertragung der Daten an einen anderen Verantwortlichen verlangen, erfolgt dies nur, soweit es technisch machbar ist.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recht auf Auskunft, Berichtigung, Sperrung, Löschung</h2>
          <p className={styles.text}>
            Sie haben jederzeit im Rahmen der geltenden gesetzlichen Bestimmungen das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, Herkunft der Daten, deren Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Diesbezüglich und auch zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit über die im Impressum aufgeführten Kontaktmöglichkeiten an uns wenden.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Analyse-Tools und Tools von Drittanbietern</h2>
          <p className={styles.text}>
            Beim Besuch unserer Website kann Ihr Surf-Verhalten statistisch ausgewertet werden. Das geschieht vor allem mit Cookies und mit sogenannten Analyseprogrammen. Die Analyse Ihres Surf-Verhaltens erfolgt in der Regel anonym; das Surf-Verhalten kann nicht zu Ihnen zurückverfolgt werden. Sie können dieser Analyse widersprechen oder sie durch die Nichtbenutzung bestimmter Tools verhindern. Detaillierte Informationen dazu finden Sie in der folgenden Datenschutzerklärung.
          </p>
          <p className={styles.text}>
            Sie können dieser Analyse widersprechen. Über die Widerspruchsmöglichkeiten werden wir Sie in dieser Datenschutzerklärung informieren.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Server-Log-Dateien</h2>
          <p className={styles.text}>
            In Server-Log-Dateien erhebt und speichert der Provider der Website automatisch Informationen, die Ihr Browser automatisch an uns übermittelt. Dies sind:
          </p>
          <ul className={styles.list}>
            <li>Browsertyp und Browserversion</li>
            <li>Verwendetes Betriebssystem</li>
            <li>Referrer URL</li>
            <li>Hostname des zugreifenden Rechners</li>
            <li>Uhrzeit der Serveranfrage</li>
            <li>IP-Adresse</li>
          </ul>
          <p className={styles.text}>
            Es findet keine Zusammenführung dieser Daten mit anderen Datenquellen statt. Grundlage der Datenverarbeitung bildet Art. 6 Abs. 1 lit. b DSGVO, der die Verarbeitung von Daten zur Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen gestattet.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Kontaktformular</h2>
          <p className={styles.text}>
            Per Kontaktformular übermittelte Daten werden einschließlich Ihrer Kontaktdaten gespeichert, um Ihre Anfrage bearbeiten zu können oder um für Anschlussfragen bereitzustehen. Eine Weitergabe dieser Daten findet ohne Ihre Einwilligung nicht statt.
          </p>
          <p className={styles.text}>
            Die Verarbeitung der in das Kontaktformular eingegebenen Daten erfolgt ausschließlich auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Ein Widerruf Ihrer bereits erteilten Einwilligung ist jederzeit möglich. Für den Widerruf genügt eine formlose Mitteilung per E-Mail. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitungsvorgänge bleibt vom Widerruf unberührt.
          </p>
          <p className={styles.text}>
            Über das Kontaktformular übermittelte Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder keine Notwendigkeit der Datenspeicherung mehr besteht. Zwingende gesetzliche Bestimmungen – insbesondere Aufbewahrungsfristen – bleiben unberührt.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>SSL- bzw. TLS-Verschlüsselung</h2>
          <p className={styles.text}>
            Aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte, die Sie an uns als Seitenbetreiber senden, nutzt unsere Website eine SSL- bzw. TLS-Verschlüsselung. Damit sind Daten, die Sie über diese Website übermitteln, für Dritte nicht mitlesbar. Sie erkennen eine verschlüsselte Verbindung an der „https://" Adresszeile Ihres Browsers und am Schloss-Symbol in der Browserzeile.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cookies</h2>

          <h3 className={styles.subSectionTitle}>Verwendung von Scriptbibliotheken (Google Webfonts)</h3>
          <p className={styles.text}>
            Um unsere Inhalte browserübergreifend korrekt und grafisch ansprechend darzustellen, verwenden wir auf dieser Website Scriptbibliotheken und Schriftbibliotheken wie z. B. Google Webfonts (
            <a href="https://www.google.com/webfonts/" target="_blank" rel="noopener noreferrer">https://www.google.com/webfonts/</a>
            ). Google Webfonts werden zur Vermeidung mehrfachen Ladens in den Cache Ihres Browsers übertragen. Falls der Browser die Google Webfonts nicht unterstützt oder den Zugriff unterbindet, werden Inhalte in einer Standardschrift angezeigt.
          </p>
          <p className={styles.text}>
            Der Aufruf von Scriptbibliotheken oder Schriftbibliotheken löst automatisch eine Verbindung zum Betreiber der Bibliothek aus. Dabei ist es theoretisch möglich – aktuell allerdings auch unklar ob und ggf. zu welchen Zwecken – dass Betreiber entsprechender Bibliotheken Daten erheben.
          </p>
          <p className={styles.text}>
            Die Datenschutzrichtlinie des Bibliothekbetreibers Google finden Sie hier:{" "}
            <a href="https://www.google.com/policies/privacy/" target="_blank" rel="noopener noreferrer">https://www.google.com/policies/privacy/</a>
          </p>
          <p className={styles.text}>Quelle: Datenschutzerklärungs-Generator der activeMind AG.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Verwendung von Google Maps</h2>
          <p className={styles.text}>
            Diese Webseite verwendet Google Maps API, um geographische Informationen visuell darzustellen. Bei der Nutzung von Google Maps werden von Google auch Daten über die Nutzung der Kartenfunktionen durch Besucher erhoben, verarbeitet und genutzt. Nähere Informationen über die Datenverarbeitung durch Google können Sie den Google-Datenschutzhinweisen entnehmen. Dort können Sie im Datenschutzcenter auch Ihre persönlichen Datenschutz-Einstellungen verändern.
          </p>
          <p className={styles.text}>
            Ausführliche Anleitungen zur Verwaltung der eigenen Daten im Zusammenhang mit Google-Produkten finden Sie hier.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Verwendung von Google Analytics</h2>
          <p className={styles.text}>
            Diese Website nutzt Funktionen des Webanalysedienstes Google Analytics. Anbieter ist die Google Inc., 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA.
          </p>
          <p className={styles.text}>
            Google Analytics verwendet so genannte „Cookies". Das sind Textdateien, die auf Ihrem Computer gespeichert werden und die eine Analyse der Benutzung der Website durch Sie ermöglichen. Die durch den Cookie erzeugten Informationen über Ihre Benutzung dieser Website werden in der Regel an einen Server von Google in den USA übertragen und dort gespeichert.
          </p>
          <p className={styles.text}>
            Die Speicherung von Google-Analytics-Cookies und die Nutzung dieses Analyse-Tools erfolgen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der Websitebetreiber hat ein berechtigtes Interesse an der Analyse des Nutzerverhaltens, um sowohl sein Webangebot als auch seine Werbung zu optimieren.
          </p>

          <h3 className={styles.subSectionTitle}>IP Anonymisierung</h3>
          <p className={styles.text}>
            Wir haben auf dieser Website die Funktion IP-Anonymisierung aktiviert. Dadurch wird Ihre IP-Adresse von Google innerhalb von Mitgliedstaaten der Europäischen Union oder in anderen Vertragsstaaten des Abkommens über den Europäischen Wirtschaftsraum vor der Übermittlung in die USA gekürzt. Nur in Ausnahmefällen wird die volle IP-Adresse an einen Server von Google in den USA übertragen und dort gekürzt. Im Auftrag des Betreibers dieser Website wird Google diese Informationen benutzen, um Ihre Nutzung der Website auszuwerten, um Reports über die Websiteaktivitäten zusammenzustellen und um weitere mit der Websitenutzung und der Internetnutzung verbundene Dienstleistungen gegenüber dem Websitebetreiber zu erbringen. Die im Rahmen von Google Analytics von Ihrem Browser übermittelte IP-Adresse wird nicht mit anderen Daten von Google zusammengeführt.
          </p>

          <h3 className={styles.subSectionTitle}>Browser Plugin</h3>
          <p className={styles.text}>
            Sie können die Speicherung der Cookies durch eine entsprechende Einstellung Ihrer Browser-Software verhindern; wir weisen Sie jedoch darauf hin, dass Sie in diesem Fall gegebenenfalls nicht sämtliche Funktionen dieser Website vollumfänglich werden nutzen können. Sie können darüber hinaus die Erfassung der durch den Cookie erzeugten und auf Ihre Nutzung der Website bezogenen Daten (inkl. Ihrer IP-Adresse) an Google sowie die Verarbeitung dieser Daten durch Google verhindern, indem Sie das unter dem folgenden Link verfügbare Browser-Plugin herunterladen und installieren:{" "}
            <a href="https://tools.google.com/dlpage/gaoptout?hl=de" target="_blank" rel="noopener noreferrer">https://tools.google.com/dlpage/gaoptout?hl=de</a>
            .
          </p>

          <h3 className={styles.subSectionTitle}>Widerspruch gegen Datenerfassung</h3>
          <p className={styles.text}>
            Sie können die Erfassung Ihrer Daten durch Google Analytics verhindern, indem Sie auf folgenden Link klicken. Es wird ein Opt-Out-Cookie gesetzt, der die Erfassung Ihrer Daten bei zukünftigen Besuchen dieser Website verhindert: Google Analytics deaktivieren.
          </p>
          <p className={styles.text}>
            Mehr Informationen zum Umgang mit Nutzerdaten bei Google Analytics finden Sie in der Datenschutzerklärung von Google:{" "}
            <a href="https://support.google.com/analytics/answer/6004245?hl=de" target="_blank" rel="noopener noreferrer">https://support.google.com/analytics/answer/6004245?hl=de</a>
            .
          </p>

          <h3 className={styles.subSectionTitle}>Auftragsverarbeitung</h3>
          <p className={styles.text}>
            Wir haben mit Google einen Vertrag zur Auftragsverarbeitung abgeschlossen und setzen die strengen Vorgaben der deutschen Datenschutzbehörden bei der Nutzung von Google Analytics vollständig um.
          </p>

          <h3 className={styles.subSectionTitle}>Demografische Merkmale bei Google Analytics</h3>
          <p className={styles.text}>
            Diese Website nutzt die Funktion „demografische Merkmale" von Google Analytics. Dadurch können Berichte erstellt werden, die Aussagen zu Alter, Geschlecht und Interessen der Seitenbesucher enthalten. Diese Daten stammen aus interessenbezogener Werbung von Google sowie aus Besucherdaten von Drittanbietern. Diese Daten können keiner bestimmten Person zugeordnet werden. Sie können diese Funktion jederzeit über die Anzeigeneinstellungen in Ihrem Google-Konto deaktivieren oder die Erfassung Ihrer Daten durch Google Analytics wie im Punkt „Widerspruch gegen Datenerfassung" dargestellt generell untersagen.
          </p>

          <h3 className={styles.subSectionTitle}>Speicherdauer</h3>
          <p className={styles.text}>
            Bei Google gespeicherte Daten auf Nutzer- und Ereignisebene, die mit Cookies, Nutzerkennungen (z. B. User ID) oder Werbe-IDs (z. B. DoubleClick-Cookies, Android-Werbe-ID) verknüpft sind, werden nach 14 Monaten anonymisiert bzw. gelöscht. Details hierzu ersehen Sie unter folgendem Link:{" "}
            <a href="https://support.google.com/analytics/answer/7667196?hl=de" target="_blank" rel="noopener noreferrer">https://support.google.com/analytics/answer/7667196?hl=de</a>
          </p>
          <p className={styles.text}>Quelle: Datenschutzerklärungs-Generator der activeMind AG.</p>
        </section>
      </div>
    </div>
  );
}
