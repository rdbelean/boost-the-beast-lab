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

        <h1 className={styles.title}>IMPRESSUM</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Anbieterkennzeichnung</h2>
          <p className={styles.text}>
            Marco Colella{"\n"}
            Performance & Personal Trainer{"\n"}
            Friedrichstraße 102{"\n"}
            40217 Düsseldorf
          </p>
          <p className={styles.text}>
            BOOST THE BEAST® TRAINING{"\n"}
            Friedrichstraße 102{"\n"}
            40217 Düsseldorf
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Kontaktdaten</h2>
          <p className={styles.text}>
            Tel: 0162 2538172{"\n"}
            E-Mail: <a href="mailto:info@boostthebeast.com">info@boostthebeast.com</a>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Inhaltlich verantwortlich</h2>
          <p className={styles.text}>Marco Colella</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Umsatzsteuer-ID</h2>
          <p className={styles.text}>DE301741428</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Fotografie</h2>
          <p className={styles.text}>
            Dominique Vasget, dominique-photography.de{"\n"}
            dreamstime.com
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Konzeption & Gestaltung</h2>
          <p className={styles.text}>burkert ideenreich</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Redaktionelle Betreuung</h2>
          <p className={styles.text}>Webdesign Viersen by Weis Digital</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Haftungsbeschränkung</h2>
          <p className={styles.text}>
            Die Inhalte dieser Website werden mit größter Sorgfalt recherchiert und erstellt. Dennoch kann ich keine Haftung für die Richtigkeit, Vollständigkeit und Aktualität der bereit gestellten Informationen übernehmen. Die Informationen sind insbesondere auch allgemeiner Art und stellen keine Rechtsberatung im Einzelfall dar. Eine Entfernung oder Sperrung dieser Inhalte erfolgt umgehend ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung. Eine Haftung ist erst ab dem Zeitpunkt der Kenntniserlangung möglich.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Externe Links</h2>
          <p className={styles.text}>
            Diese Website enthält Verknüpfungen zu Websites Dritter („externe Links“). Diese Websites unterliegen der Haftung der jeweiligen Betreiber. Bei erstmaliger Verknüpfung waren keine Rechtsverstöße ersichtlich. Ich habe keinerlei Einfluss auf die aktuelle und zukünftige Gestaltung und auf die Inhalte der verknüpften Seiten. Das Setzen von externen Links bedeutet nicht, dass ich mir die hinter dem Verweis oder Link liegenden Inhalte zu Eigen mache. Eine ständige Kontrolle dieser externen Links ist für mich ohne konkrete Hinweise auf Rechtsverstöße nicht zumutbar. Bei Kenntnis von Rechtsverstößen werden jedoch derartige externe Links unverzüglich gelöscht.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Urheberschutz</h2>
          <p className={styles.text}>
            Alle auf der Webseite befindlichen Inhalte unterliegen dem Urheberrecht und anderen Gesetzen zum Schutz geistigen Eigentums. Diese dürfen weder zu privaten noch zu kommerziellen Zwecken kopiert, verbreitet, verändert oder Dritten zugänglich gemacht werden.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Copyright</h2>
          <p className={styles.text}>
            Texte, Bilder und andere auf dieser Website veröffentlichte Daten unterliegen – sofern nicht anders gekennzeichnet – dem Copyright von Marco Colella.{"\n"}
            Jede Verbreitung, Übermittlung und Wiedergabe ist ohne schriftliche Genehmigung von Marco Colella untersagt.
          </p>
        </section>
      </div>
    </div>
  );
}
