"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "@/app/landing.module.css";

// Marco's personal letter — replaces classical value-stacking. The German
// text is exact (must not be "improved"); EN/IT/TR are idiomatic so the
// tone stays personal. Layout: avatar left + letter body right on desktop,
// stacked on mobile.
export default function MarcoExplanation() {
  const t = useTranslations("marco_explanation");
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add(styles.visible); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
  }, []);

  function scrollToProducts() {
    const target = document.getElementById("products");
    if (target) {
      const top = window.scrollY + target.getBoundingClientRect().top;
      window.scrollTo({ top, behavior: "auto" });
    }
  }

  return (
    <section className={styles.marcoExplanationSection}>
      <div className={styles.container}>
        <div ref={sectionRef} className={`${styles.marcoExplanationCard} ${styles.reveal}`}>
          <aside className={styles.marcoExplanationAvatarBlock}>
            <div className={styles.marcoExplanationAvatar}>
              <Image
                src="/marco-portrait.jpg"
                alt="Marco Colella"
                width={120}
                height={120}
                sizes="120px"
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </div>
          </aside>

          <div className={styles.marcoExplanationBody}>
            <p className={styles.marcoExplanationEyebrow}>{t("eyebrow")}</p>
            <p className={styles.marcoExplanationSub}>{t("sub")}</p>

            <div className={styles.marcoExplanationLetter}>
              <p className={styles.marcoExplanationOpener}>{t("body.p1")}</p>
              <p>{t("body.p2")}</p>
              <p>{t("body.p3")}</p>
              <p>{t("body.p4")}</p>
              <p>{t("body.p5")}</p>
              <p className={styles.marcoExplanationClose}>
                <span>{t("body.close_a")}</span>
                <span>{t("body.close_b")}</span>
              </p>
            </div>

            <p className={styles.marcoExplanationSignature}>{t("signature")}</p>

            <div className={styles.marcoExplanationAnchor}>
              <span>{t("anchor.pt")}</span>
              <span>{t("anchor.sw")}</span>
            </div>

            <div className={styles.marcoExplanationCtaRow}>
              <button className={styles.btnPrimary} onClick={scrollToProducts}>
                {t("cta")}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
