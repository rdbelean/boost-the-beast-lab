import Link from "next/link";
import styles from "./legal.module.css";

export const metadata = {
  title: "Impressum · Boost The Beast Lab",
};

export default function ImpressumPage() {
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

        <h1 className={styles.title}>IMPRESSUM</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Angaben gemäß § 5 DDG</h2>
          <p className={styles.text}>
            Marco Colella{"\n"}
            Performance & Personal Trainer{"\n"}
            Friedrichstraße 102{"\n"}
            40217 Düsseldorf{"\n"}
            Deutschland
          </p>
          <p className={styles.text}>
            BOOST THE BEAST® TRAINING{"\n"}
            Friedrichstraße 102{"\n"}
            40217 Düsseldorf
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Kontakt</h2>
          <p className={styles.text}>
            Telefon: 0162 2538172{"\n"}
            E-Mail: <a href="mailto:info@boostthebeast.com">info@boostthebeast.com</a>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Umsatzsteuer-ID</h2>
          <p className={styles.text}>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{"\n"}
            DE301741428
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Redaktionell verantwortlich gemäß § 18 Abs. 2 MStV</h2>
          <p className={styles.text}>
            Marco Colella{"\n"}
            Friedrichstraße 102{"\n"}
            40217 Düsseldorf
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>EU-Streitschlichtung</h2>
          <p className={styles.text}>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
              https://ec.europa.eu/consumers/odr
            </a>
            .{"\n"}
            Unsere E-Mail-Adresse findest du oben im Impressum.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
          <p className={styles.text}>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Haftung für Inhalte</h2>
          <p className={styles.text}>
            Die Inhalte dieser Website werden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Haftung für Links</h2>
          <p className={styles.text}>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Urheberrecht</h2>
          <p className={styles.text}>
            Die durch den Seitenbetreiber erstellten Inhalte und Werke auf dieser Website unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
          </p>
        </section>
      </div>
    </div>
  );
}
