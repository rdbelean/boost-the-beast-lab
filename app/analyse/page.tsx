"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./analyse.module.css";
import BackButton from "@/components/ui/BackButton";
import SliderInput from "@/components/analyse/SliderInput";
import RadioGroup from "@/components/analyse/RadioGroup";
import CustomSelect from "@/components/analyse/CustomSelect";
import { buildPlan, type PlanType, type PlanBlock } from "@/lib/plan/buildPlan";

// ── Plan bundle cached in sessionStorage ─────────────────
interface PlanBundle {
  blocks: PlanBlock[];
  source?: string;
  pdfBase64?: string;
}

async function generatePlanBundle(
  planType: PlanType,
  scores: Record<string, unknown>,
): Promise<PlanBundle | null> {
  // 1. Build static fallback content locally
  const basePlan = buildPlan(planType, scores);

  // 2. Try to get AI-enhanced blocks (non-blocking if it fails)
  let blocks = basePlan.blocks;
  let source = basePlan.source;
  try {
    const aiRes = await fetch("/api/plan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: planType, scores }),
    });
    if (aiRes.ok) {
      const ai = (await aiRes.json()) as { blocks?: PlanBlock[]; source?: string };
      if (ai.blocks?.length) {
        blocks = ai.blocks;
        if (ai.source) source = ai.source;
      }
    }
  } catch (e) {
    console.warn(`[plan ${planType}] AI gen failed, using static blocks`, e);
  }

  // 3. Generate PDF with merged content
  const merged = { ...basePlan, blocks, source };
  try {
    const pdfRes = await fetch("/api/plan/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: merged }),
    });
    if (!pdfRes.ok) {
      console.warn(`[plan ${planType}] PDF gen failed`, pdfRes.status);
      return { blocks, source };
    }
    const buf = await pdfRes.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // Convert to base64 via chunked encoding (handles large payloads)
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const pdfBase64 = btoa(binary);
    return { blocks, source, pdfBase64 };
  } catch (e) {
    console.warn(`[plan ${planType}] PDF fetch error`, e);
    return { blocks, source };
  }
}

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
  stehzeit: string; // Stunden auf den Beinen pro Tag: <2 | 2-4 | 4-6 | >6
  schrittzahl: number;
  sitzzeit: number;
  // Kategorie 3 — Recovery & Regeneration
  schlafdauer: number;
  schlafqualitaet: string;
  aufwachen: string;
  erholtGefuehl: string;
  // Kategorie 3 — zusätzlich
  bildschirmVorSchlaf: string; // Bildschirmzeit vor dem Einschlafen
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

const FRUIT_VEG_MAP: Record<string, "none" | "low" | "moderate" | "good" | "optimal"> = {
  "fast-jede": "optimal",
  "meiste": "good",
  "haelfte": "moderate",
  "selten": "low",
  "kaum": "none",
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

// Standing-hours buckets → representative hours per day. Mapped to walking-MET
// minutes per week in the payload (hours × 60 × 5 days as conservative avg).
const STANDING_HOURS_MAP: Record<string, number> = {
  "<2": 1.0,
  "2-4": 3.0,
  "4-6": 5.0,
  ">6": 7.0,
};

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

  // Standing hours → walking MET minutes / week.
  // Formula (briefing): walking_met_minutes = hours_on_feet × 60 × 5 days
  const standingHoursPerDay = STANDING_HOURS_MAP[f.stehzeit] ?? 3.0;
  const walking_total_minutes_week = standingHoursPerDay * 60 * 5;

  return {
    email: f.email,
    reportType: REPORT_MAP[f.selectedProduct] ?? "complete",
    age: f.alter,
    gender: GENDER_MAP[f.geschlecht] ?? "diverse",
    height_cm: f.groesse,
    weight_kg: f.gewicht,
    fruit_veg: FRUIT_VEG_MAP[f.obstGemuese] ?? "moderate",
    // Activity — IPAQ raw. Walking is now derived from "Stunden auf den Beinen":
    //   walking_total_minutes_week = standing_hours × 60 × 5 days (conservative avg)
    // walking_days + walking_minutes_per_day are retained for legacy compatibility
    // but ignored by the scoring engine when walking_total_minutes_week is present.
    standing_hours_per_day: standingHoursPerDay,
    walking_total_minutes_week,
    walking_days: 5,
    walking_minutes_per_day: Math.round(standingHoursPerDay * 60),
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
  "Abgleich mit der wissenschaftlichen Referenzdatenbank des BTB Lab...",
  "WHO & ACSM-Normwerte werden auf dein Profil angewendet...",
  "Aktivitätsdaten werden mit internationalen Standards verglichen...",
  "Leistungskategorien aus globalen Studiendaten zugeordnet...",
  "Schlaf- & Recovery-Profil wird gegen NSF-Referenzwerte geprüft...",
  "VO2max aus internationalen Fitness-Datenbanken kalkuliert...",
  "Metabolisches Profil mit WHO-Klassifikationen abgeglichen...",
  "Stress & Lifestyle-Muster werden wissenschaftlich ausgewertet...",
  "Ganzheitlicher Performance Index über 6 Module berechnet...",
  "BTB Lab erstellt deinen personalisierten Report...",
  "Wissenschaftliche Befunde werden aufbereitet...",
  "Dein persönlicher Report wird finalisiert...",
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
  const router = useRouter();
  const preselectedProduct = searchParams.get("product") ?? "complete-analysis";
  const sessionId = searchParams.get("session_id");
  const [paymentChecked, setPaymentChecked] = useState(false);
  // "session" = fresh Stripe payment; "token" = returning user spending a pre-existing token
  const [accessMode, setAccessMode] = useState<"session" | "token" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Case 1: fresh payment via session_id
      if (sessionId) {
        try {
          const res = await fetch(`/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`);
          const data = await res.json();
          if (!cancelled && data.paid) {
            setPaymentChecked(true);
            setAccessMode("session");
            return;
          }
        } catch { /* fall through to token check */ }
      }

      // Case 2: returning user with a pre-existing token
      try {
        const tokRes = await fetch("/api/tokens");
        const tokData = await tokRes.json();
        if (!cancelled && (tokData.tokens ?? 0) > 0) {
          setPaymentChecked(true);
          setAccessMode("token");
          return;
        }
      } catch { /* fall through */ }

      if (!cancelled) router.replace("/kaufen?reason=no-tokens");
    })();
    return () => { cancelled = true; };
  }, [sessionId, router]);

  const [form, setForm] = useState<FormData>({
    alter: 28,
    geschlecht: "maennlich",
    groesse: 178,
    gewicht: 78,
    obstGemuese: "haelfte",
    trainingsfreq: "3-4x",
    trainingsart: "kraft",
    moderateDauer: "30-60",
    intensiveDauer: "30-60",
    stehzeit: "4-6",
    schrittzahl: 8000,
    sitzzeit: 6,
    schlafdauer: 7,
    schlafqualitaet: "mittel",
    aufwachen: "selten",
    erholtGefuehl: "meistens",
    bildschirmVorSchlaf: "30-60",
    wasserkonsum: 2,
    stresslevel: "moderat",
    mahlzeitenPlan: "kein",
    selectedProduct: preselectedProduct,
    email: "demo@boostthebeast.com",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [progressCap, setProgressCap] = useState(5);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Smooth progress animation — interpolates toward the current cap so the
  // bar feels alive even while API calls are in flight.
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= progressCap) return prev;
        // Approach cap faster when far away, slower near it
        const delta = Math.max(0.3, (progressCap - prev) * 0.08);
        return Math.min(progressCap, prev + delta);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [loading, progressCap]);
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

  // Block page refresh and back navigation while report is generating
  useEffect(() => {
    if (!loading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      history.pushState(null, "", window.location.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [loading]);

  // Trailing comma required in .tsx to disambiguate generic from JSX
  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

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
    !!form.stehzeit,
    form.schrittzahl > 0,
    form.sitzzeit >= 0,
    form.schlafdauer > 0,
    !!form.schlafqualitaet,
    !!form.aufwachen,
    !!form.erholtGefuehl,
    !!form.bildschirmVorSchlaf,
    form.wasserkonsum > 0,
    !!form.stresslevel,
    !!form.mahlzeitenPlan,
  ].filter(Boolean).length;

  const progressPct = Math.round((answeredCount / totalQuestions) * 100);
  const canSubmit = answeredCount === totalQuestions;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setProgressCap(5);
    setLoadingProgress(0);

    try {
      setErrorMsg(null);

      // Deduct 1 token before starting the analysis.
      // - "token" mode: user is spending a pre-existing token → must succeed.
      // - "session" mode: fresh payment → best-effort (tokens may not be credited
      //   yet if the Stripe webhook is still in flight).
      const tokRes = await fetch("/api/tokens", { method: "POST" });
      if (!tokRes.ok && accessMode === "token") {
        setLoading(false);
        router.replace("/kaufen?reason=no-tokens");
        return;
      }

      const payload = buildAssessmentPayload(form);

      // ── Step 1: /api/assessment — scoring only (fast, ~2-4s) ────────────
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
      // Scoring done — 15% cap
      setProgressCap(15);

      const scores = json?.scores;

      // ── Step 2: FIRE ALL PDF TASKS IN PARALLEL ─────────────────────────
      // 1 main report (Claude + PDF, ~30-45s, weighted 50%)
      // 4 plan PDFs  (Claude + pdf-lib, ~10-20s each, weighted 10% each)
      // Each task bumps progress cap when it resolves.
      const TASK_WEIGHTS = { report: 50, perPlan: 10 }; // total: 50 + 40 = 90 (+15 from scoring = 105, clamped to 100)

      const reportBody: Record<string, unknown> = json?.assessmentId
        ? { assessmentId: json.assessmentId }
        : {
            demoContext: {
              reportType: payload.reportType,
              user: {
                email: payload.email,
                age: payload.age,
                gender: payload.gender,
                height_cm: payload.height_cm,
                weight_kg: payload.weight_kg,
              },
              result: scores,
              sleepDurationHours: payload.sleep_duration_hours,
              sleep_quality_label: payload.sleep_quality,
              wakeup_frequency_label: payload.wakeups,
              morning_recovery_1_10: payload.recovery_1_10,
              stress_level_1_10: payload.stress_level_1_10,
              meals_per_day: payload.meals_per_day,
              water_litres: payload.water_litres,
              fruit_veg_label: payload.fruit_veg,
              standing_hours_per_day: payload.standing_hours_per_day,
              sitting_hours_per_day: payload.sitting_hours,
              training_days: (payload.vigorous_days ?? 0) + (payload.moderate_days ?? 0),
              daily_steps: form.schrittzahl,
            },
          };

      const reportPromise = fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportBody),
      })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.text().catch(() => "");
            console.error("[analyse] report gen failed", r.status, body);
            return null;
          }
          return (await r.json()) as { downloadUrl?: string };
        })
        .then((data) => {
          setProgressCap((c) => Math.min(100, c + TASK_WEIGHTS.report));
          return data?.downloadUrl ?? null;
        })
        .catch((e) => {
          console.warn("[analyse] report gen error", e);
          setProgressCap((c) => Math.min(100, c + TASK_WEIGHTS.report));
          return null;
        });

      const PLAN_TYPES: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
      const planPromises = PLAN_TYPES.map((planType) =>
        generatePlanBundle(planType, scores)
          .then((bundle) => {
            setProgressCap((c) => Math.min(100, c + TASK_WEIGHTS.perPlan));
            return { planType, bundle };
          })
          .catch((e) => {
            console.warn(`[analyse] plan ${planType} failed`, e);
            setProgressCap((c) => Math.min(100, c + TASK_WEIGHTS.perPlan));
            return { planType, bundle: null as PlanBundle | null };
          }),
      );

      // Wait for everything
      const [downloadUrl, ...planResults] = await Promise.all([reportPromise, ...planPromises]);
      if (downloadUrl) setDownloadUrl(downloadUrl);

      const plans: Record<string, PlanBundle> = {};
      for (const r of planResults) {
        if (r.bundle) plans[r.planType] = r.bundle;
      }

      // Finalize progress and route
      setProgressCap(100);
      setLoadingProgress(100);

      setTimeout(() => {
        sessionStorage.setItem(
          "btb_results",
          JSON.stringify({
            scores,
            downloadUrl,
            parentSessionId: sessionId ?? null,
            assessmentId: json?.assessmentId ?? null,
            plans,
          }),
        );
        router.push("/results");
      }, 600);

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
      <BackButton />
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
          ⚠ DEMO MODUS — Analyse-Protokoll aktiv
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
            {answeredCount}/{totalQuestions} PROTOKOLL-FRAGEN
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
              ANALYSE-PROTOKOLL
            </div>
            <h1 className={styles.heroTitle}>
              DEIN ANALYSE-<br />PROTOKOLL.
            </h1>
            <p className={styles.heroSubtitle}>
              Beantworte 20 präzise Fragen zu Körper, Training, Schlaf und Lifestyle —
              kalibriert nach WHO, ACSM & IPAQ Richtlinien. KI berechnet deine Scores.
            </p>
            <div className={styles.heroStats}>
              <span className={styles.heroStatItem}>20 FRAGEN</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>5 SCORES</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>TIEFGEHENDE AUSWERTUNG</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>EVIDENZBASIERTE DATENBANK</span>
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
                      value={form.alter || ""}
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

              {/* Q4b: Obst & Gemüse pro Woche */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>GEMÜSE ODER OBST PRO WOCHE</span>
                <RadioGroup
                  value={form.obstGemuese}
                  onChange={(v) => set("obstGemuese", v as string)}
                  options={[
                    { label: "Bei fast jeder Mahlzeit (18–21 pro Woche)", value: "fast-jede" },
                    { label: "Bei den meisten Mahlzeiten (12–17 pro Woche)", value: "meiste" },
                    { label: "Bei ungefähr der Hälfte (8–11 pro Woche)", value: "haelfte" },
                    { label: "Eher selten (3–7 pro Woche)", value: "selten" },
                    { label: "Kaum bis gar nicht (0–2 pro Woche)", value: "kaum" },
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

              {/* Q6d: Stunden auf den Beinen pro Tag */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>WIE VIELE STUNDEN PRO TAG BIST DU AUF DEN BEINEN?</span>
                <span className={styles.questionSub ?? ""} style={{ display: "block", fontSize: "0.85em", opacity: 0.7, marginBottom: "0.75rem" }}>
                  Stehen, Gehen, Bewegen — alles außer Sitzen zählt
                </span>
                <RadioGroup
                  value={form.stehzeit}
                  onChange={(v) => set("stehzeit", v as string)}
                  options={[
                    { label: "< 2 Stunden", value: "<2" },
                    { label: "2–4 Stunden", value: "2-4" },
                    { label: "4–6 Stunden", value: "4-6" },
                    { label: "> 6 Stunden", value: ">6" },
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

              {/* Q13: Bildschirmzeit vor dem Schlafen */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>BILDSCHIRMZEIT VOR DEM EINSCHLAFEN</span>
                <span style={{ display: "block", fontSize: "0.85em", opacity: 0.7, marginBottom: "0.75rem" }}>
                  Handy, Laptop, TV — wie lange vor dem Schlafen nutzt du noch Bildschirme?
                </span>
                <RadioGroup
                  value={form.bildschirmVorSchlaf}
                  onChange={(v) => set("bildschirmVorSchlaf", v as string)}
                  options={[
                    { label: "Kein Bildschirm", value: "kein" },
                    { label: "< 30 Minuten", value: "<30" },
                    { label: "30–60 Minuten", value: "30-60" },
                    { label: "> 60 Minuten", value: ">60" },
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
              BOOST THE BEAST LAB · WISSENSCHAFTLICHE DATENBANK WIRD ABGEGLICHEN
            </div>
            <div className={styles.loadingTitle}>
              DEIN REPORT<br />WIRD ERSTELLT.
            </div>

            {/* Progress bar */}
            <div
              style={{
                marginTop: 36,
                marginBottom: 24,
                fontFamily: "var(--font-oswald), sans-serif",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    color: "#888",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Fortschritt
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: "#E63222",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.02em",
                  }}
                >
                  {Math.floor(loadingProgress)}<span style={{ fontSize: 16, color: "#666" }}>%</span>
                </div>
              </div>
              <div
                style={{
                  height: 6,
                  width: "100%",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 3,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${loadingProgress}%`,
                    background: "linear-gradient(90deg, #E63222 0%, #ff6b4a 100%)",
                    borderRadius: 3,
                    transition: "width 120ms linear",
                    boxShadow: "0 0 12px rgba(230,50,34,0.5)",
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#666",
                  fontFamily: "Helvetica, Arial, sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                {loadingProgress < 15
                  ? "Scores werden berechnet…"
                  : loadingProgress < 60
                  ? "Personalisierter Report wird erstellt…"
                  : loadingProgress < 95
                  ? "Optimierungspläne werden vorbereitet…"
                  : "Alles bereit — wechsle zum Report…"}
              </div>
            </div>

            {/* Duration hint */}
            <div
              style={{
                marginBottom: 28,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.04)",
                borderLeft: "2px solid rgba(255,255,255,0.12)",
                fontSize: 12,
                color: "#888",
                fontFamily: "Helvetica, Arial, sans-serif",
                letterSpacing: "0.01em",
                lineHeight: 1.6,
              }}
            >
              Dies kann einige Minuten dauern — dein Report wird gerade mit unserer wissenschaftlichen Datenbank abgeglichen.
            </div>

            <div className={styles.loadingSteps} style={{ opacity: 0.7 }}>
              {LOADING_STEPS.map((step, i) => {
                const threshold = ((i + 1) / LOADING_STEPS.length) * 100;
                const isDone = loadingProgress >= threshold;
                return (
                  <div
                    key={i}
                    className={`${styles.loadingStep} ${styles.stepVisible} ${isDone ? styles.stepDone : ""}`}
                  >
                    <span className={styles.loadingStepIcon}>{isDone ? "✓" : i + 1}</span>
                    {step}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Results are shown on /results page after redirect */}
    </>
  );
}
