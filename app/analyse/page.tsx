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
  obstGemuese: string; // NEU: keine | wenig | moderat | optimal
  // Kategorie 2 — Aktivität & Training
  trainingsfreq: string;
  trainingsart: string;
  moderateDauer: string; // NEU: <20 | 20-30 | 30-60 | >60
  intensiveDauer: string; // NEU
  gehtage: number; // NEU 0..7
  gehdauer: string; // NEU
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

// ── Mapping helpers: form (German labels) → API payload shape ────────
const DURATION_MIN: Record<string, number> = {
  "<20": 10,
  "20-30": 25,
  "30-60": 45,
  ">60": 90,
};

const TRAININGSFREQ_DAYS: Record<string, number> = {
  keiner: 0,
  "1-2x": 2,
  "3-4x": 4,
  "5-6x": 6,
  taeglich: 7,
};

const GENDER_MAP: Record<string, "male" | "female" | "diverse"> = {
  maennlich: "male",
  weiblich: "female",
  divers: "diverse",
};

const FRUIT_VEG_MAP: Record<string, "none" | "low" | "moderate" | "optimal"> = {
  keine: "none",
  wenig: "low",
  moderat: "moderate",
  optimal: "optimal",
};

const SLEEP_QUALITY_MAP: Record<string, "sehr_gut" | "gut" | "mittel" | "schlecht"> = {
  "sehr-gut": "sehr_gut",
  gut: "gut",
  mittel: "mittel",
  schlecht: "schlecht",
  "sehr-schlecht": "schlecht",
};

const WAKEUP_MAP: Record<string, "nie" | "selten" | "oft" | "immer"> = {
  nie: "nie",
  selten: "selten",
  manchmal: "selten",
  oft: "oft",
  "jede-nacht": "immer",
};

const ERHOLT_TO_SCORE: Record<string, number> = {
  "fast-nie": 2,
  selten: 4,
  manchmal: 5,
  meistens: 7,
  immer: 9,
};

const STRESS_TO_SCORE: Record<string, number> = {
  "sehr-gering": 2,
  gering: 4,
  moderat: 5,
  hoch: 7,
  "sehr-hoch": 9,
};

const MEALS_MAP: Record<string, number> = {
  kein: 3,
  intuitiv: 3,
  grob: 4,
  makros: 4,
  "meal-prep": 5,
};

const REPORT_MAP: Record<string, "metabolic" | "recovery" | "complete"> = {
  metabolic: "metabolic",
  recovery: "recovery",
  "complete-analysis": "complete",
};

// A training session's intensity decides whether it counts as moderate or vigorous.
const VIGOROUS_TRAININGSARTEN = new Set(["kraft", "cardio", "kampfsport", "teamsport"]);
const MODERATE_TRAININGSARTEN = new Set(["yoga"]);

function buildAssessmentPayload(f: FormData) {
  const trainingDays = TRAININGSFREQ_DAYS[f.trainingsfreq] ?? 0;
  const moderateMin = DURATION_MIN[f.moderateDauer] ?? 30;
  const vigorousMin = DURATION_MIN[f.intensiveDauer] ?? 30;

  let moderate_days = 0;
  let vigorous_days = 0;
  if (VIGOROUS_TRAININGSARTEN.has(f.trainingsart)) {
    vigorous_days = trainingDays;
  } else if (MODERATE_TRAININGSARTEN.has(f.trainingsart)) {
    moderate_days = trainingDays;
  } else {
    // gemischt → 50/50 split
    moderate_days = Math.ceil(trainingDays / 2);
    vigorous_days = Math.floor(trainingDays / 2);
  }

  return {
    email: f.email,
    reportType: REPORT_MAP[f.selectedProduct] ?? "complete",
    age: f.alter,
    gender: GENDER_MAP[f.geschlecht] ?? "diverse",
    height_cm: f.groesse,
    weight_kg: f.gewicht,
    fruit_veg: FRUIT_VEG_MAP[f.obstGemuese] ?? "moderate",
    // Activity — IPAQ raw
    walking_days: f.gehtage,
    walking_minutes_per_day: DURATION_MIN[f.gehdauer] ?? 25,
    moderate_days,
    moderate_minutes_per_day: moderate_days > 0 ? moderateMin : 0,
    vigorous_days,
    vigorous_minutes_per_day: vigorous_days > 0 ? vigorousMin : 0,
    // Sleep
    sleep_duration_hours: f.schlafdauer,
    sleep_quality: SLEEP_QUALITY_MAP[f.schlafqualitaet] ?? "mittel",
    wakeups: WAKEUP_MAP[f.aufwachen] ?? "selten",
    recovery_1_10: ERHOLT_TO_SCORE[f.erholtGefuehl] ?? 5,
    // Metabolic / lifestyle
    meals_per_day: MEALS_MAP[f.mahlzeitenPlan] ?? 3,
    water_litres: f.wasserkonsum,
    sitting_hours: f.sitzzeit,
    // Stress
    stress_level_1_10: STRESS_TO_SCORE[f.stresslevel] ?? 5,
  };
}

const LOADING_STEPS = [
  "Körperdaten werden kalibriert...",
  "BMI & Körperkomposition analysiert...",
  "IPAQ Activity Engine berechnet MET-Minuten...",
  "Vigorous / Moderate / Walking Kategorien zugewiesen...",
  "PSQI-basierter Sleep & Recovery Score läuft...",
  "VO2max Schätzung nach Jackson Non-Exercise Modell...",
  "Metabolic Score aus WHO-Referenzdaten berechnet...",
  "Stress & Lifestyle Score wird gewichtet...",
  "Composite Performance Index (5 Module) aggregiert...",
  "KI-Engine generiert personalisierten Report...",
  "Performance Insights werden formatiert...",
  "Report wird finalisiert...",
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
    obstGemuese: "moderat",
    trainingsfreq: "3-4x",
    trainingsart: "kraft",
    moderateDauer: "30-60",
    intensiveDauer: "30-60",
    gehtage: 5,
    gehdauer: "20-30",
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
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allScores, setAllScores] = useState<any>(null);

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
  const totalQuestions = 20;
  const answeredCount = [
    form.alter > 0,
    !!form.geschlecht,
    form.groesse > 0,
    form.gewicht > 0,
    !!form.obstGemuese,
    !!form.trainingsfreq,
    !!form.trainingsart,
    !!form.moderateDauer,
    !!form.intensiveDauer,
    form.gehtage >= 0,
    !!form.gehdauer,
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

    // Stagger loading steps: 1 new step per second over ~12 seconds
    LOADING_STEPS.forEach((_, i) => {
      setTimeout(() => setVisibleSteps((prev) => [...prev, i]), i * 1000);
    });

    try {
      setErrorMsg(null);
      const payload = buildAssessmentPayload(form);
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? `Server-Fehler (${res.status})`);
      }
      if (json?.scores) {
        setAllScores(json.scores);
        if (json.scores.overall_score_0_100 != null) {
          setOverallScore(json.scores.overall_score_0_100);
        }
      }
      if (json?.downloadUrl) {
        setDownloadUrl(json.downloadUrl);
      }

      // Mark all steps as done with checkmarks (stagger over ~3s)
      LOADING_STEPS.forEach((_, i) => {
        setTimeout(() => setDoneSteps((prev) => [...prev, i]), 8000 + i * 250);
      });

      // Transition to success after all checkmarks are done (~12s total)
      setTimeout(() => {
        setLoading(false);
        setSuccess(true);
      }, 12000);

      console.log("[analyse] assessmentId", json?.assessmentId);
    } catch (err) {
      console.error("[analyse] submit failed", err);
      setLoading(false);
      setErrorMsg(
        err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten.",
      );
    }
  };

  let cardIndex = 0;
  const nextCardRef = (el: HTMLDivElement | null) => {
    if (el) cardRefs.current[cardIndex++] = el;
  };

  const isTestMode =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true";

  return (
    <>
      {isTestMode && (
        <div
          style={{
            background: "#F59E0B",
            color: "#111",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            padding: "10px 14px",
            textTransform: "uppercase",
            borderBottom: "1px solid rgba(0,0,0,0.15)",
          }}
        >
          ⚠ TEST MODUS — Kein Stripe aktiv — Reports werden trotzdem generiert
        </div>
      )}

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
              Beantworte 20 präzise Fragen zu Körper, Training, Schlaf und Lifestyle —
              kalibriert nach WHO, ACSM & IPAQ Richtlinien. KI berechnet deine Scores.
            </p>
            <div className={styles.heroStats}>
              <span className={styles.heroStatItem}>20 FRAGEN</span>
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

              {/* Q4b: Obst & Gemüse */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>OBST & GEMÜSE PRO TAG</span>
                <RadioGroup
                  value={form.obstGemuese}
                  onChange={(v) => set("obstGemuese", v as string)}
                  options={[
                    { label: "Keine", value: "keine" },
                    { label: "Wenig (1–2 Portionen)", value: "wenig" },
                    { label: "Moderat (3–4 Portionen)", value: "moderat" },
                    { label: "Optimal (5+ Portionen)", value: "optimal" },
                  ]}
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

              {/* Q6b: Moderate Trainingsdauer */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>MINUTEN PRO MODERATER TRAININGSEINHEIT</span>
                <RadioGroup
                  value={form.moderateDauer}
                  onChange={(v) => set("moderateDauer", v as string)}
                  options={[
                    { label: "< 20 Min", value: "<20" },
                    { label: "20–30 Min", value: "20-30" },
                    { label: "30–60 Min", value: "30-60" },
                    { label: "> 60 Min", value: ">60" },
                  ]}
                />
              </div>

              {/* Q6c: Intensive Trainingsdauer */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>MINUTEN PRO INTENSIVER TRAININGSEINHEIT</span>
                <RadioGroup
                  value={form.intensiveDauer}
                  onChange={(v) => set("intensiveDauer", v as string)}
                  options={[
                    { label: "< 20 Min", value: "<20" },
                    { label: "20–30 Min", value: "20-30" },
                    { label: "30–60 Min", value: "30-60" },
                    { label: "> 60 Min", value: ">60" },
                  ]}
                />
              </div>

              {/* Q6d: Gehtage pro Woche */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>GEHTAGE PRO WOCHE</span>
                <SliderInput
                  label="Tage mit Gehen"
                  value={form.gehtage}
                  min={0} max={7}
                  unit=" Tage"
                  onChange={(v) => set("gehtage", v)}
                />
              </div>

              {/* Q6e: Gehdauer pro Tag */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>MINUTEN GEHEN PRO TAG</span>
                <RadioGroup
                  value={form.gehdauer}
                  onChange={(v) => set("gehdauer", v as string)}
                  options={[
                    { label: "< 20 Min", value: "<20" },
                    { label: "20–30 Min", value: "20-30" },
                    { label: "30–60 Min", value: "30-60" },
                    { label: "> 60 Min", value: ">60" },
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
                Kein Newsletter, kein Abo. Daten werden nach Verarbeitung gelöscht.
              </div>
            </section>

            {/* ── Submit ──────────────────────────────── */}
            {/* TODO: STRIPE INTEGRATION
                - Vor dem API Call: Stripe Checkout Session initiieren
                - Nach erfolgreichem Payment: weiter mit Assessment
                - Report Typ aus Stripe Session Metadata übernehmen
                - Test-Modus-Banner + isTestMode entfernen */}
            <section className={styles.submitSection}>
              {errorMsg && (
                <div
                  style={{
                    background: "rgba(230,50,34,0.12)",
                    border: "1px solid #E63222",
                    color: "#ff6b6b",
                    padding: "14px 18px",
                    marginBottom: 18,
                    fontSize: 13,
                    lineHeight: 1.5,
                    fontFamily: "Helvetica, Arial, sans-serif",
                  }}
                >
                  <strong style={{ color: "#E63222" }}>Fehler:</strong> {errorMsg}
                </div>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className={`${styles.submitBtn} ${canSubmit ? styles.submitBtnEnabled : styles.submitBtnDisabled}`}
              >
                {loading ? "WIRD VERARBEITET..." : "ANALYSE STARTEN →"}
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
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
          {overallScore != null && (
            <div
              style={{
                fontFamily: "Arial Black, Impact, sans-serif",
                fontSize: 88,
                color: "#E63222",
                lineHeight: 1,
                margin: "18px 0 8px",
              }}
            >
              {overallScore}
              <span style={{ fontSize: 20, color: "#8a8a92", marginLeft: 8 }}>/100</span>
            </div>
          )}
          <p className={styles.successText}>
            Dein personalisierter Performance Report wurde erstellt und wird
            in Kürze an <strong>{form.email}</strong> gesendet.
            <br />Bitte prüfe auch deinen Spam-Ordner.
          </p>
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.successHomeBtn}
              style={{ marginBottom: 12 }}
            >
              REPORT HERUNTERLADEN →
            </a>
          )}
          <Link href="/" className={styles.successHomeBtn} style={{ background: "transparent", border: "1px solid #2a2a2f", color: "#6b6b72" }}>
            ZURÜCK ZUR STARTSEITE
          </Link>
        </div>
      )}
    </>
  );
}
