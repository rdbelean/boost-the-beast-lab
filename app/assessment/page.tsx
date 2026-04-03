"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AssessmentData } from "@/lib/scoring";
import styles from "./assessment.module.css";

/* ─── Question definitions ─────────────────────────────────── */
type QuestionType = "choice" | "slider";

interface Question {
  id: keyof AssessmentData;
  type: QuestionType;
  label: string;
  subtitle?: string;
  choices?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue?: string | number;
}

const questions: Question[] = [
  {
    id: "gender",
    type: "choice",
    label: "Welches Geschlecht hast du?",
    choices: [
      { value: "male",    label: "Männlich" },
      { value: "female",  label: "Weiblich" },
      { value: "diverse", label: "Divers" },
    ],
  },
  {
    id: "age",
    type: "slider",
    label: "Wie alt bist du?",
    min: 16, max: 80, step: 1, unit: "Jahre", defaultValue: 30,
  },
  {
    id: "height",
    type: "slider",
    label: "Wie groß bist du?",
    min: 140, max: 220, step: 1, unit: "cm", defaultValue: 175,
  },
  {
    id: "weight",
    type: "slider",
    label: "Wie viel wiegst du?",
    min: 40, max: 180, step: 1, unit: "kg", defaultValue: 75,
  },
  {
    id: "sleepHours",
    type: "slider",
    label: "Wie viele Stunden schläfst du pro Nacht?",
    subtitle: "Durchschnitt der letzten 2 Wochen",
    min: 3, max: 12, step: 0.5, unit: "h", defaultValue: 7,
  },
  {
    id: "sleepQuality",
    type: "slider",
    label: "Wie gut ist deine Schlafqualität?",
    subtitle: "1 = sehr schlecht, 10 = ausgezeichnet",
    min: 1, max: 10, step: 1, unit: "/10", defaultValue: 6,
  },
  {
    id: "nightWakeUps",
    type: "choice",
    label: "Wie oft wachst du nachts auf?",
    choices: [
      { value: "nie",  label: "Gar nicht" },
      { value: "1x",   label: "1× pro Nacht" },
      { value: "2-3x", label: "2–3× pro Nacht" },
      { value: ">3x",  label: "Mehr als 3×" },
    ],
  },
  {
    id: "dailySteps",
    type: "slider",
    label: "Wie viele Schritte machst du täglich?",
    subtitle: "WHO-Empfehlung: 8.000 – 10.000",
    min: 0, max: 25000, step: 500, unit: "Schritte", defaultValue: 7000,
  },
  {
    id: "trainingFrequency",
    type: "slider",
    label: "Wie oft trainierst du pro Woche?",
    subtitle: "ACSM-Empfehlung: 3–5×",
    min: 0, max: 7, step: 1, unit: "×/Woche", defaultValue: 3,
  },
  {
    id: "trainingType",
    type: "choice",
    label: "Was ist deine primäre Trainingsform?",
    choices: [
      { value: "kraft",    label: "Krafttraining" },
      { value: "ausdauer", label: "Ausdauertraining" },
      { value: "hybrid",   label: "Hybrid (beides)" },
      { value: "kein",     label: "Kein Training" },
    ],
  },
  {
    id: "trainingDuration",
    type: "slider",
    label: "Wie lange dauert eine Trainingseinheit?",
    min: 0, max: 180, step: 5, unit: "min", defaultValue: 60,
  },
  {
    id: "waterIntake",
    type: "slider",
    label: "Wie viel Wasser trinkst du pro Tag?",
    subtitle: "Optimal: 2 – 3,5 Liter",
    min: 0, max: 5, step: 0.25, unit: "Liter", defaultValue: 2,
  },
  {
    id: "mealsPerDay",
    type: "slider",
    label: "Wie viele Mahlzeiten isst du pro Tag?",
    min: 1, max: 6, step: 1, unit: "Mahlzeiten", defaultValue: 3,
  },
  {
    id: "stressLevel",
    type: "slider",
    label: "Wie hoch ist dein Stresslevel im Alltag?",
    subtitle: "1 = kaum Stress, 10 = extrem gestresst",
    min: 1, max: 10, step: 1, unit: "/10", defaultValue: 5,
  },
  {
    id: "sittingHours",
    type: "slider",
    label: "Wie viele Stunden sitzt du täglich?",
    subtitle: "Büro, Auto, Couch usw.",
    min: 0, max: 16, step: 0.5, unit: "h/Tag", defaultValue: 8,
  },
];

const total = questions.length;

/* ─── Slider Component ──────────────────────────────────────── */
function SliderQuestion({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLInputElement>(null);
  const pct = ((value - (q.min ?? 0)) / ((q.max ?? 100) - (q.min ?? 0))) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  return (
    <div>
      <div className={styles.sliderDisplay}>
        <span className={styles.sliderDisplayValue}>{value}</span>
        <span className={styles.sliderDisplayUnit}>{q.unit}</span>
      </div>
      <div className={styles.sliderTrack}>
        <input
          ref={trackRef}
          type="range"
          min={q.min}
          max={q.max}
          step={q.step}
          value={value}
          onChange={handleChange}
          className={styles.sliderInput}
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />
      </div>
      <div className={styles.sliderMinMax}>
        <span>{q.min} {q.unit}</span>
        <span>{q.max} {q.unit}</span>
      </div>
    </div>
  );
}

/* ─── Choice Component ──────────────────────────────────────── */
function ChoiceQuestion({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  return (
    <div className={styles.choices}>
      {q.choices?.map((c) => (
        <button
          key={String(c.value)}
          type="button"
          onClick={() => onChange(c.value)}
          className={`${styles.choiceBtn} ${value === c.value ? styles.choiceBtnActive : ""}`}
        >
          <div className={styles.choiceRadio}>
            <div className={styles.choiceRadioDot} />
          </div>
          {c.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Main Assessment Page ──────────────────────────────────── */
export default function AssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product") ?? "complete-analysis";
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Partial<AssessmentData>>({});
  const [animKey, setAnimKey] = useState(0);

  const q = questions[current];
  const progress = (current / total) * 100;

  const currentValue =
    answers[q.id] !== undefined
      ? answers[q.id]
      : q.defaultValue !== undefined
      ? q.defaultValue
      : q.type === "choice"
      ? ""
      : (q.min ?? 0);

  function setAnswer(value: AssessmentData[keyof AssessmentData]) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function goNext() {
    if (current < total - 1) {
      setCurrent((c) => c + 1);
      setAnimKey((k) => k + 1);
    } else {
      const finalAnswers: AssessmentData = {
        gender: (answers.gender as AssessmentData["gender"]) ?? "male",
        age: (answers.age as number) ?? 30,
        height: (answers.height as number) ?? 175,
        weight: (answers.weight as number) ?? 75,
        sleepHours: (answers.sleepHours as number) ?? 7,
        sleepQuality: (answers.sleepQuality as number) ?? 6,
        nightWakeUps: (answers.nightWakeUps as AssessmentData["nightWakeUps"]) ?? "1x",
        dailySteps: (answers.dailySteps as number) ?? 7000,
        trainingFrequency: (answers.trainingFrequency as number) ?? 3,
        trainingType: (answers.trainingType as AssessmentData["trainingType"]) ?? "hybrid",
        trainingDuration: (answers.trainingDuration as number) ?? 60,
        waterIntake: (answers.waterIntake as number) ?? 2,
        mealsPerDay: (answers.mealsPerDay as number) ?? 3,
        stressLevel: (answers.stressLevel as number) ?? 5,
        sittingHours: (answers.sittingHours as number) ?? 8,
      };
      sessionStorage.setItem("btb_assessment", JSON.stringify(finalAnswers));
      sessionStorage.setItem("btb_product", productId);
      router.push("/results");
    }
  }

  function goBack() {
    if (current > 0) {
      setCurrent((c) => c - 1);
      setAnimKey((k) => k + 1);
    }
  }

  const canProceed = q.type === "choice" ? answers[q.id] !== undefined : true;

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.headerBar}>
          <div className={styles.headerLogo}>BOOST THE BEAST LAB</div>
          <div className={styles.headerCounter}>
            <span className={styles.headerCounterCurrent}>{current + 1}</span>
            <span> / {total}</span>
          </div>
          <Link href="/" className={styles.headerClose} aria-label="Schließen">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.main}>
        <div className={styles.cardWrap}>
          <div key={animKey} className={styles.questionCard}>
            {/* Step label */}
            <div className={styles.stepLabel}>
              <span className={styles.stepDot} />
              FRAGE {current + 1} VON {total}
            </div>

            {/* Question title */}
            <h2 className={styles.questionTitle}>{q.label}</h2>
            {q.subtitle ? (
              <p className={styles.questionSub}>{q.subtitle}</p>
            ) : (
              <div className={styles.noSub} />
            )}

            {/* Input */}
            {q.type === "slider" && (
              <SliderQuestion
                q={q}
                value={currentValue as number}
                onChange={(v) => setAnswer(v as AssessmentData[keyof AssessmentData])}
              />
            )}
            {q.type === "choice" && (
              <ChoiceQuestion
                q={q}
                value={currentValue as string | number}
                onChange={(v) => setAnswer(v as AssessmentData[keyof AssessmentData])}
              />
            )}

            {/* Navigation */}
            <div className={styles.nav}>
              {current > 0 && (
                <button onClick={goBack} className={styles.navBtnSecondary} type="button">
                  ← ZURÜCK
                </button>
              )}
              <button
                onClick={goNext}
                disabled={!canProceed}
                className={styles.navBtnPrimary}
                type="button"
              >
                {current === total - 1 ? (
                  <>
                    ANALYSE STARTEN
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                ) : (
                  "WEITER →"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
