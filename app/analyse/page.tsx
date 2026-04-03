"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./analyse.module.css";
import SliderInput from "@/components/analyse/SliderInput";
import RadioGroup from "@/components/analyse/RadioGroup";
import CustomSelect from "@/components/analyse/CustomSelect";

/* ── Types ─────────────────────────────────────────────── */
interface FormData {
  // Kategorie 1 — Körperdaten & Metabolismus
  alter: number;
  geschlecht: string;
  groesse: number;
  gewicht: number;
  // Kategorie 2 — Aktivität & Training
  trainingsfreq: string;
  trainingsart: string;
  schrittzahl: number;
  sitzzeit: number;
  // Kategorie 3 — Recovery & Regeneration
  schlafdauer: number;
  schlafqualitaet: string;
  aufwachen: string;
  erholtGefuehl: string;
  // Kategorie 4 — Ernährung, Stress & Lifestyle
  wasserkonsum: number;
  stresslevel: string;
  mahlzeitenPlan: string;
  // Report & Email
  selectedProduct: string;
  email: string;
}

const PRODUCTS = [
  {
    id: "metabolic",
    tag: "EINZELREPORT",
    name: "METABOLIC PERFORMANCE SCORE",
    question: "Wie effizient arbeitet dein Stoffwechsel?",
    price: 29,
    highlight: false,
  },
  {
    id: "recovery",
    tag: "EINZELREPORT",
    name: "RECOVERY & REGENERATION SCORE",
    question: "Wie gut erholt sich dein Körper?",
    price: 29,
    highlight: false,
  },
  {
    id: "complete-analysis",
    tag: "BUNDLE — BESTSELLER",
    name: "COMPLETE PERFORMANCE ANALYSIS",
    question: "Alle Scores. Ein vollständiger Report.",
    price: 79,
    highlight: true,
  },
];

const LOADING_STEPS = [
  "Körperdaten werden analysiert...",
  "Performance-Scores werden berechnet...",
  "KI generiert deinen Report...",
  "PDF wird erstellt...",
];

/* ── Component ─────────────────────────────────────────── */
export default function AnalysePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-base)" }} />}>
      <AnalyseContent />
    </Suspense>
  );
}

function AnalyseContent() {
  const searchParams = useSearchParams();
  const preselectedProduct = searchParams.get("product") ?? "complete-analysis";

  const [form, setForm] = useState<FormData>({
    alter: 28,
    geschlecht: "maennlich",
    groesse: 178,
    gewicht: 78,
    trainingsfreq: "3-4x",
    trainingsart: "kraft",
    schrittzahl: 8000,
    sitzzeit: 6,
    schlafdauer: 7,
    schlafqualitaet: "mittel",
    aufwachen: "selten",
    erholtGefuehl: "meistens",
    wasserkonsum: 2,
    stresslevel: "moderat",
    mahlzeitenPlan: "kein",
    selectedProduct: preselectedProduct,
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);

  // Scroll-reveal for category numbers
  const numRefs = useRef<HTMLSpanElement[]>([]);
  const cardRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    numRefs.current.forEach((el) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add(styles.numVisible);
            obs.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      obs.observe(el);
    });
  }, []);

  useEffect(() => {
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add(styles.cardVisible), i * 60);
            obs.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      obs.observe(el);
    });
  }, []);

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Count answered questions for progress
  const totalQuestions = 15;
  const answeredCount = [
    form.alter > 0,
    !!form.geschlecht,
    form.groesse > 0,
    form.gewicht > 0,
    !!form.trainingsfreq,
    !!form.trainingsart,
    form.schrittzahl > 0,
    form.sitzzeit >= 0,
    form.schlafdauer > 0,
    !!form.schlafqualitaet,
    !!form.aufwachen,
    !!form.erholtGefuehl,
    form.wasserkonsum > 0,
    !!form.stresslevel,
    !!form.mahlzeitenPlan,
  ].filter(Boolean).length;

  const progressPct = Math.round((answeredCount / totalQuestions) * 80) + (form.email ? 20 : 0);
  const canSubmit = form.email.includes("@") && answeredCount === totalQuestions;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setVisibleSteps([]);
    setDoneSteps([]);

    // Stagger loading steps
    LOADING_STEPS.forEach((_, i) => {
      setTimeout(() => setVisibleSteps((prev) => [...prev, i]), i * 1200);
    });

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("API error");

      LOADING_STEPS.forEach((_, i) => {
        setTimeout(() => setDoneSteps((prev) => [...prev, i]), 3800 + i * 200);
      });

      setTimeout(() => {
        setLoading(false);
        setSuccess(true);
      }, 4800);
    } catch {
      setLoading(false);
    }
  };

  let cardIndex = 0;
  const nextCardRef = (el: HTMLDivElement | null) => {
    if (el) cardRefs.current[cardIndex++] = el;
  };

  return (
    <>
      {/* ── Header ─────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6.5V12C4 16.5 7.5 20.7 12 22C16.5 20.7 20 16.5 20 12V6.5L12 2Z"
                stroke="#E63222" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span>
              <span className={styles.logoText}>BOOST THE BEAST</span>
              <span className={styles.logoSub}>PERFORMANCE LAB</span>
            </span>
          </Link>

          <span className={styles.stepIndicator}>
            {answeredCount}/{totalQuestions} FRAGEN
          </span>

          <Link href="/" className={styles.closeBtn} aria-label="Schließen">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </header>

      {/* ── Progress Bar ───────────────────────────────── */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <div className={styles.page}>
        <div className={styles.container}>

          {/* ── Hero Intro ─────────────────────────────── */}
          <section className={styles.heroSection}>
            <div className={styles.heroLabel}>
              <span className={styles.heroDot} />
              PERFORMANCE DIAGNOSTIK
            </div>
            <h1 className={styles.heroTitle}>
              DEINE ANALYSE<br />BEGINNT JETZT.
            </h1>
            <p className={styles.heroSubtitle}>
              Beantworte 15 präzise Fragen zu Körper, Training, Schlaf und Lifestyle —
              kalibriert nach WHO & ACSM Richtlinien. KI berechnet deine Scores.
            </p>
            <div className={styles.heroStats}>
              <span className={styles.heroStatItem}>15 FRAGEN</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>4 KATEGORIEN</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>{"< 5 MIN"}</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>100% KI-GENERIERT</span>
            </div>
          </section>

          {/* ── Form ───────────────────────────────────── */}
          <div className={styles.form}>

            {/* ── KATEGORIE 1: Körperdaten ──────────────── */}
            <div className={styles.category}>
              <div className={styles.categoryHeader}>
                <span
                  className={styles.categoryNum}
                  ref={(el) => { if (el) numRefs.current[0] = el; }}
                >
                  01
                </span>
                <div className={styles.categoryMeta}>
                  <span className={styles.categoryLabel}>KATEGORIE</span>
                  <h2 className={styles.categoryTitle}>KÖRPERDATEN & METABOLISMUS</h2>
                </div>
              </div>

              {/* Q1 + Q2 */}
              <div
                className={styles.questionCard}
                ref={(el) => { if (el) cardRefs.current[cardRefs.current.length] = el; nextCardRef(el); }}
              >
                <span className={styles.questionLabel}>ALTER & GESCHLECHT</span>
                <div className={styles.questionGrid2}>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputLabel}>Alter</span>
                    <input
                      type="number"
                      value={form.alter}
                      min={14} max={80}
                      onChange={(e) => set("alter", Number(e.target.value))}
                      className={styles.numberInput}
                      placeholder="28"
                    />
                    <span className={styles.inputUnit}>JAHRE</span>
                  </div>
                  <div className={styles.inputWrap}>
                    <CustomSelect
                      label="Geschlecht"
                      value={form.geschlecht}
                      onChange={(v) => set("geschlecht", v)}
                      options={[
                        { label: "Männlich", value: "maennlich" },
                        { label: "Weiblich", value: "weiblich" },
                        { label: "Divers", value: "divers" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Q3: Größe */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>KÖRPERGRÖSSE</span>
                <SliderInput
                  label="Größe"
                  value={form.groesse}
                  min={140} max={220}
                  unit=" cm"
                  onChange={(v) => set("groesse", v)}
                />
              </div>

              {/* Q4: Gewicht */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>KÖRPERGEWICHT</span>
                <SliderInput
                  label="Gewicht"
                  value={form.gewicht}
                  min={40} max={160}
                  unit=" kg"
                  onChange={(v) => set("gewicht", v)}
                />
              </div>
            </div>

            {/* ── KATEGORIE 2: Aktivität & Training ──────── */}
            <div className={styles.category}>
              <div className={styles.categoryHeader}>
                <span
                  className={styles.categoryNum}
                  ref={(el) => { if (el) numRefs.current[1] = el; }}
                >
                  02
                </span>
                <div className={styles.categoryMeta}>
                  <span className={styles.categoryLabel}>KATEGORIE</span>
                  <h2 className={styles.categoryTitle}>AKTIVITÄT & TRAINING</h2>
                </div>
              </div>

              {/* Q5: Trainingsfrequenz */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>TRAININGSFREQUENZ PRO WOCHE</span>
                <RadioGroup
                  value={form.trainingsfreq}
                  onChange={(v) => set("trainingsfreq", v as string)}
                  options={[
                    { label: "Kein Sport", value: "keiner" },
                    { label: "1–2×", value: "1-2x" },
                    { label: "3–4×", value: "3-4x" },
                    { label: "5–6×", value: "5-6x" },
                    { label: "Täglich", value: "taeglich" },
                  ]}
                />
              </div>

              {/* Q6: Trainingsart */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>DOMINANTE TRAININGSART</span>
                <RadioGroup
                  value={form.trainingsart}
                  onChange={(v) => set("trainingsart", v as string)}
                  options={[
                    { label: "Krafttraining", value: "kraft" },
                    { label: "Cardio", value: "cardio" },
                    { label: "Kampfsport", value: "kampfsport" },
                    { label: "Teamsport", value: "teamsport" },
                    { label: "Yoga / Mobility", value: "yoga" },
                    { label: "Gemischt", value: "gemischt" },
                  ]}
                />
              </div>

              {/* Q7: Schrittzahl */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>TÄGLICHE SCHRITTZAHL (Durchschnitt)</span>
                <SliderInput
                  label="Schritte pro Tag"
                  value={form.schrittzahl}
                  min={1000} max={20000}
                  step={500}
                  unit=" Schritte"
                  onChange={(v) => set("schrittzahl", v)}
                />
              </div>

              {/* Q8: Sitzzeit */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>TÄGLICHE SITZZEIT</span>
                <SliderInput
                  label="Stunden sitzen pro Tag"
                  value={form.sitzzeit}
                  min={1} max={16}
                  unit=" h"
                  onChange={(v) => set("sitzzeit", v)}
                />
              </div>
            </div>

            {/* ── KATEGORIE 3: Recovery & Regeneration ──── */}
            <div className={styles.category}>
              <div className={styles.categoryHeader}>
                <span
                  className={styles.categoryNum}
                  ref={(el) => { if (el) numRefs.current[2] = el; }}
                >
                  03
                </span>
                <div className={styles.categoryMeta}>
                  <span className={styles.categoryLabel}>KATEGORIE</span>
                  <h2 className={styles.categoryTitle}>RECOVERY & REGENERATION</h2>
                </div>
              </div>

              {/* Q9: Schlafdauer */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>DURCHSCHNITTLICHE SCHLAFDAUER</span>
                <SliderInput
                  label="Stunden Schlaf pro Nacht"
                  value={form.schlafdauer}
                  min={3} max={12}
                  unit=" h"
                  onChange={(v) => set("schlafdauer", v)}
                />
              </div>

              {/* Q10: Schlafqualität */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>SUBJEKTIVE SCHLAFQUALITÄT</span>
                <RadioGroup
                  value={form.schlafqualitaet}
                  onChange={(v) => set("schlafqualitaet", v as string)}
                  options={[
                    { label: "Sehr schlecht", value: "sehr-schlecht" },
                    { label: "Schlecht", value: "schlecht" },
                    { label: "Mittel", value: "mittel" },
                    { label: "Gut", value: "gut" },
                    { label: "Sehr gut", value: "sehr-gut" },
                  ]}
                />
              </div>

              {/* Q11: Aufwachen */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>HÄUFIGES AUFWACHEN IN DER NACHT</span>
                <RadioGroup
                  value={form.aufwachen}
                  onChange={(v) => set("aufwachen", v as string)}
                  options={[
                    { label: "Nie", value: "nie" },
                    { label: "Selten", value: "selten" },
                    { label: "Manchmal", value: "manchmal" },
                    { label: "Oft", value: "oft" },
                    { label: "Jede Nacht", value: "jede-nacht" },
                  ]}
                />
              </div>

              {/* Q12: Erholt-Gefühl */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>FÜHLST DU DICH MORGENS ERHOLT?</span>
                <RadioGroup
                  value={form.erholtGefuehl}
                  onChange={(v) => set("erholtGefuehl", v as string)}
                  options={[
                    { label: "Fast nie", value: "fast-nie" },
                    { label: "Selten", value: "selten" },
                    { label: "Manchmal", value: "manchmal" },
                    { label: "Meistens", value: "meistens" },
                    { label: "Immer", value: "immer" },
                  ]}
                />
              </div>
            </div>

            {/* ── KATEGORIE 4: Ernährung, Stress & Lifestyle */}
            <div className={styles.category}>
              <div className={styles.categoryHeader}>
                <span
                  className={styles.categoryNum}
                  ref={(el) => { if (el) numRefs.current[3] = el; }}
                >
                  04
                </span>
                <div className={styles.categoryMeta}>
                  <span className={styles.categoryLabel}>KATEGORIE</span>
                  <h2 className={styles.categoryTitle}>ERNÄHRUNG, STRESS & LIFESTYLE</h2>
                </div>
              </div>

              {/* Q13: Wasserkonsum */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>TÄGLICHER WASSERKONSUM</span>
                <SliderInput
                  label="Liter Wasser pro Tag"
                  value={form.wasserkonsum}
                  min={0.5} max={5}
                  step={0.5}
                  unit=" L"
                  onChange={(v) => set("wasserkonsum", v)}
                />
              </div>

              {/* Q14: Stresslevel */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>ALLGEMEINES STRESSLEVEL</span>
                <RadioGroup
                  value={form.stresslevel}
                  onChange={(v) => set("stresslevel", v as string)}
                  options={[
                    { label: "Sehr gering", value: "sehr-gering" },
                    { label: "Gering", value: "gering" },
                    { label: "Moderat", value: "moderat" },
                    { label: "Hoch", value: "hoch" },
                    { label: "Sehr hoch", value: "sehr-hoch" },
                  ]}
                />
              </div>

              {/* Q15: Mahlzeitenplan */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>ERNÄHRUNGSSTRUKTUR</span>
                <RadioGroup
                  value={form.mahlzeitenPlan}
                  onChange={(v) => set("mahlzeitenPlan", v as string)}
                  options={[
                    { label: "Kein Plan", value: "kein" },
                    { label: "Intuitiv", value: "intuitiv" },
                    { label: "Grob getrackt", value: "grob" },
                    { label: "Makros getrackt", value: "makros" },
                    { label: "Meal Prep", value: "meal-prep" },
                  ]}
                />
              </div>
            </div>

            {/* ── Report Selector ──────────────────────── */}
            <section className={styles.reportSection}>
              <h2 className={styles.reportTitle}>WÄHLE DEINEN REPORT</h2>
              <p className={styles.reportSubtitle}>
                Wähle den Report, den du nach der Analyse erhalten möchtest.
              </p>
              <div className={styles.reportCards}>
                {PRODUCTS.map((p) => (
                  <div
                    key={p.id}
                    className={`${styles.reportCard} ${p.highlight ? styles.reportCardHighlight : ""} ${form.selectedProduct === p.id ? styles.reportCardActive : ""}`}
                    onClick={() => set("selectedProduct", p.id)}
                  >
                    <div className={styles.reportRadio}>
                      <div className={styles.reportRadioInner} />
                    </div>
                    <div className={styles.reportCardBody}>
                      {p.highlight ? (
                        <span className={`${styles.reportCardTag} ${styles.reportCardTagHighlight}`}>{p.tag}</span>
                      ) : (
                        <span className={styles.reportCardTag}>{p.tag}</span>
                      )}
                      <div className={styles.reportCardName}>{p.name}</div>
                      <div className={styles.reportCardQ}>{p.question}</div>
                    </div>
                    <div className={`${styles.reportCardPrice} ${p.highlight ? styles.reportCardPriceHighlight : ""}`}>
                      €{p.price}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Email ───────────────────────────────── */}
            <section className={styles.emailSection}>
              <div className={styles.emailLabel}>DEINE E-MAIL</div>
              <div className={styles.emailHint}>Dein Report wird an diese Adresse gesendet.</div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={styles.emailInput}
                placeholder="deine@email.de"
              />
              <div className={styles.emailNote}>
                Einmalige Zahlung. Kein Newsletter, kein Abo. Daten werden nach Verarbeitung gelöscht.
              </div>
            </section>

            {/* ── Submit ──────────────────────────────── */}
            <section className={styles.submitSection}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`${styles.submitBtn} ${canSubmit ? styles.submitBtnEnabled : styles.submitBtnDisabled}`}
              >
                ANALYSE STARTEN — €{PRODUCTS.find((p) => p.id === form.selectedProduct)?.price ?? 29}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <p className={styles.submitDisclaimer}>
                Zahlung per Stripe · SSL-verschlüsselt · Sofortiger Download nach Kauf
              </p>
            </section>

          </div>
        </div>
      </div>

      {/* ── Loading Overlay ─────────────────────────────── */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingInner}>
            <div className={styles.loadingLabel}>
              <span className={styles.loadingSpinner} />
              KI ANALYSIERT DEINE DATEN
            </div>
            <div className={styles.loadingTitle}>
              DEIN REPORT<br />WIRD ERSTELLT.
            </div>
            <div className={styles.loadingSteps}>
              {LOADING_STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`${styles.loadingStep} ${visibleSteps.includes(i) ? styles.stepVisible : ""} ${doneSteps.includes(i) ? styles.stepDone : ""}`}
                >
                  <span className={styles.loadingStepIcon}>
                    {doneSteps.includes(i) ? "✓" : (i + 1)}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Success Overlay ─────────────────────────────── */}
      {success && (
        <div className={styles.successOverlay}>
          <div className={styles.successCheck}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 18l7 7 14-14" strokeDasharray="100" strokeDashoffset="100"
                style={{ animation: "checkDraw 0.6s ease forwards 0.2s", strokeDashoffset: 100 }}
              />
            </svg>
          </div>
          <h2 className={styles.successTitle}>ANALYSE ABGESCHLOSSEN</h2>
          <p className={styles.successText}>
            Dein personalisierter Performance Report wurde erstellt und wird
            in Kürze an <strong>{form.email}</strong> gesendet.
          </p>
          <Link href="/" className={styles.successHomeBtn}>
            ZURÜCK ZUR STARTSEITE
          </Link>
        </div>
      )}
    </>
  );
}
