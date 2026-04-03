"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import type { AssessmentData } from "@/lib/scoring";

/* ─── Question definitions ─────────────────────────────────── */
type QuestionType = "choice" | "slider" | "number";

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
  return (
    <div className="space-y-8">
      <div
        className="text-center py-6 px-8"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
      >
        <span
          className="font-mono-data text-6xl font-bold"
          style={{ color: "var(--accent-red)" }}
        >
          {value}
        </span>
        <span className="text-2xl ml-2" style={{ color: "var(--text-secondary)" }}>
          {q.unit}
        </span>
      </div>
      <div className="px-2">
        <input
          type="range"
          min={q.min}
          max={q.max}
          step={q.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full"
          style={{
            background: `linear-gradient(to right, var(--accent-red) 0%, var(--accent-red) ${
              (((value as number) - (q.min ?? 0)) / ((q.max ?? 100) - (q.min ?? 0))) * 100
            }%, var(--border) ${
              (((value as number) - (q.min ?? 0)) / ((q.max ?? 100) - (q.min ?? 0))) * 100
            }%, var(--border) 100%)`,
          }}
        />
        <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{q.min} {q.unit}</span>
          <span>{q.max} {q.unit}</span>
        </div>
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
    <div className="grid grid-cols-1 gap-3">
      {q.choices?.map((c) => (
        <button
          key={String(c.value)}
          onClick={() => onChange(c.value)}
          className={`question-option text-left text-base transition-all ${value === c.value ? "selected" : ""}`}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                borderColor: value === c.value ? "var(--accent-red)" : "var(--border)",
                background: value === c.value ? "var(--accent-red)" : "transparent",
              }}
            >
              {value === c.value && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <span style={{ color: value === c.value ? "var(--text-primary)" : "var(--text-secondary)" }}>
              {c.label}
            </span>
          </div>
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
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Partial<AssessmentData>>({});

  const q = questions[current];
  const progress = ((current) / total) * 100;

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
      setDirection(1);
      setCurrent((c) => c + 1);
    } else {
      // Done — store and go to results
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
      router.push(`/checkout/${productId}`);
    }
  }

  function goBack() {
    if (current > 0) {
      setDirection(-1);
      setCurrent((c) => c - 1);
    }
  }

  const canProceed =
    q.type === "choice" ? answers[q.id] !== undefined : true;

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit:  (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="progress-bar">
          <motion.div
            className="progress-bar-fill"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div
          className="flex items-center justify-between px-8 h-14"
          style={{ background: "rgba(28,28,32,0.96)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="font-headline text-xs tracking-widest" style={{ color: "var(--text-muted)" }}>
            BOOST THE BEAST LAB
          </div>
          <div className="font-mono-data text-xs" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--accent-red)" }}>{current + 1}</span>
            <span style={{ color: "var(--text-muted)" }}> / {total}</span>
          </div>
          <div className="font-mono-data text-xs" style={{ color: "var(--text-muted)" }}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 pt-24 pb-16">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Step label */}
              <div
                className="font-headline text-xs tracking-[0.35em] mb-4"
                style={{ color: "var(--accent-red)" }}
              >
                FRAGE {current + 1} VON {total}
              </div>

              {/* Question */}
              <h2 className="font-headline text-3xl md:text-4xl font-bold mb-2 leading-tight" style={{ color: "var(--text-primary)" }}>
                {q.label}
              </h2>
              {q.subtitle && (
                <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
                  {q.subtitle}
                </p>
              )}
              {!q.subtitle && <div className="mb-8" />}

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

              {/* Navigation — mittig unter der Frage */}
              <div className="flex items-center justify-center gap-4 mt-10 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                {current > 0 && (
                  <button onClick={goBack} className="btn-secondary py-3 px-6 text-sm">
                    ← Zurück
                  </button>
                )}
                <button
                  onClick={goNext}
                  disabled={!canProceed}
                  className="btn-primary py-4 px-12 text-sm justify-center"
                  style={{ opacity: canProceed ? 1 : 0.4, cursor: canProceed ? "pointer" : "not-allowed" }}
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

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
