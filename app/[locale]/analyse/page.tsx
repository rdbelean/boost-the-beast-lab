"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import styles from "./analyse.module.css";
import SliderInput from "@/components/analyse/SliderInput";
import RadioGroup from "@/components/analyse/RadioGroup";
import CustomSelect from "@/components/analyse/CustomSelect";
import { buildPlan, type PlanType, type PlanBlock } from "@/lib/plan/buildPlan";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// ── Plan bundle cached in sessionStorage ─────────────────
interface PlanBundle {
  blocks: PlanBlock[];
  source?: string;
  pdfBase64?: string;
}

async function generatePlanBundle(
  planType: PlanType,
  scores: Record<string, unknown>,
  locale = "de",
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
      body: JSON.stringify({ type: planType, scores, locale }),
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
      body: JSON.stringify({ plan: merged, locale }),
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

// LOADING_STEPS are now sourced from the messages JSON via t.raw() so each
// locale can express the scientific-database copy naturally.

/* ── Component ─────────────────────────────────────────── */
export default function AnalysePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-base)" }} />}>
      <AnalyseContent />
    </Suspense>
  );
}

function AnalyseContent() {
  const t = useTranslations("analyse");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedProduct = searchParams.get("product") ?? "complete-analysis";
  const sessionId = searchParams.get("session_id");
  const [paymentChecked, setPaymentChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionId) {
        if (!cancelled) router.replace("/kaufen");
        return;
      }
      try {
        const res = await fetch(`/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (!cancelled && data.paid) {
          setPaymentChecked(true);
          return;
        }
      } catch { /* fall through */ }
      if (!cancelled) router.replace("/kaufen");
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
    email: "",
  });

  // Pre-populate email from the authenticated user session.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setForm((prev) => ({ ...prev, email: data.user!.email! }));
      }
    });
  }, []);

  // ── Wearable prefill (from /analyse/prepare) ──────────────────────────
  interface WearableSession {
    uploadId: string;
    source: import("@/lib/wearable/types").WearableSource;
    days_covered: number;
    metrics: import("@/lib/wearable/types").WearableMetrics;
  }
  const [wearable, setWearable] = useState<WearableSession | null>(null);
  const [prefilledFields, setPrefilledFields] = useState<
    import("@/lib/wearable/formPrefill").PrefilledField[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = sessionStorage.getItem("btb_wearable");
        if (!raw) return;
        const parsed = JSON.parse(raw) as WearableSession;
        if (!parsed?.metrics) return;
        const { computeFormPrefill } = await import("@/lib/wearable/formPrefill");
        const { values, prefilledFields: fields } = computeFormPrefill(parsed.metrics);
        if (cancelled) return;
        setWearable(parsed);
        setPrefilledFields(fields);
        setForm((prev) => ({ ...prev, ...values }));
      } catch {
        /* ignore — prefill is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Block page refresh and back navigation for the entire questionnaire session.
  // The user has paid to reach this page — they must complete the form.
  // Protection lifts automatically when the page unmounts (redirect to /results).
  useEffect(() => {
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
  }, []);

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

      const payload = buildAssessmentPayload(form);
      const payloadWithWearable = wearable
        ? { ...payload, wearable_upload_id: wearable.uploadId }
        : payload;

      // ── Step 1: /api/assessment — scoring only (fast, ~2-4s) ────────────
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadWithWearable),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? t("submit.error_server", { status: res.status }));
      }
      if (json?.scores) {
        setAllScores(json.scores);
        if (json.scores.overall_score_0_100 != null) {
          setOverallScore(json.scores.overall_score_0_100);
        }
      }
      // Scoring done — 15% cap
      setProgressCap(15);

      // Backfill auth_user_id on the users row that was just created/upserted
      // by /api/assessment so the account page can find this report immediately.
      if (json?.assessmentId) {
        fetch("/api/auth/link", { method: "POST" }).catch(() => {/* non-fatal */});
      }

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
        generatePlanBundle(planType, scores, locale)
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

      // Persist plan PDFs to DB so they appear in report history (fire-and-forget).
      if (json?.assessmentId) {
        for (const r of planResults) {
          if (r.bundle?.pdfBase64) {
            fetch("/api/plan/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assessmentId: json.assessmentId,
                planType: r.planType,
                pdfBase64: r.bundle.pdfBase64,
              }),
            }).catch(() => {/* non-fatal */});
          }
        }
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
        err instanceof Error ? err.message : t("submit.error_unknown"),
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
          {t("demo_banner")}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.svg" width={71} height={44} alt="" aria-hidden="true" style={{ objectFit: "contain" }} />
            <span>
              <span className={styles.logoText}>BOOST THE BEAST</span>
              <span className={styles.logoSub}>PERFORMANCE LAB</span>
            </span>
          </div>

          <span className={styles.stepIndicator}>
            {t("step_counter", { answered: answeredCount, total: totalQuestions })}
          </span>

          <div style={{ width: 36 }} />
        </div>
      </header>

      {/* ── Progress Bar ───────────────────────────────── */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <div className={styles.page}>
        <div className={styles.container}>

          {/* ── Wearable Status Banner ────────────────── */}
          {wearable && (
            <div
              style={{
                padding: "14px 18px",
                margin: "28px 0 0",
                borderLeft: "3px solid rgb(74, 222, 128)",
                background: "rgba(74, 222, 128, 0.06)",
                borderRadius: 2,
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: 13,
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgb(74, 222, 128)",
                  color: "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
              <div>
                <strong style={{ color: "#fff", fontWeight: 600 }}>
                  {t("wearable_banner.imported_label", {
                    source:
                      wearable.source === "whoop"
                        ? "WHOOP"
                        : wearable.source === "apple_health"
                          ? "Apple Health"
                          : wearable.metrics.provenance?.source_type
                            ? wearable.metrics.provenance.source_type.toUpperCase()
                            : "AI",
                  })}
                </strong>
                {t("wearable_banner.text", { days: wearable.days_covered })}
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: "rgb(134, 239, 172)",
                    fontSize: 12,
                    letterSpacing: "0.04em",
                  }}
                >
                  {prefilledFields
                    .map((f) => {
                      try {
                        return t(`wearable_banner.fields.${f}` as "wearable_banner.fields.gewicht");
                      } catch {
                        return f;
                      }
                    })
                    .join(" · ")}
                </span>
              </div>
            </div>
          )}

          {/* ── Hero Intro ─────────────────────────────── */}
          <section className={styles.heroSection}>
            <div className={styles.heroLabel}>
              <span className={styles.heroDot} />
              {t("hero.label")}
            </div>
            <h1 className={styles.heroTitle}>
              {t("hero.title_1")}<br />{t("hero.title_2")}
            </h1>
            <p className={styles.heroSubtitle}>
              {t("hero.subtitle")}
            </p>
            <div className={styles.heroStats}>
              <span className={styles.heroStatItem}>{t("hero.stat_questions")}</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>{t("hero.stat_scores")}</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>{t("hero.stat_deep")}</span>
              <span className={styles.heroStatDot} />
              <span className={styles.heroStatItem}>{t("hero.stat_db")}</span>
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
                  <span className={styles.categoryLabel}>{t("category_label")}</span>
                  <h2 className={styles.categoryTitle}>{t("categories.1")}</h2>
                </div>
              </div>

              {/* Q1 + Q2 */}
              <div
                className={styles.questionCard}
                ref={(el) => { if (el) cardRefs.current[cardRefs.current.length] = el; nextCardRef(el); }}
              >
                <span className={styles.questionLabel}>{t("q.age_sex.label")}</span>
                <div className={styles.questionGrid2}>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputLabel}>{t("q.age.input_label")}</span>
                    <input
                      type="number"
                      value={form.alter || ""}
                      min={14} max={80}
                      onChange={(e) => set("alter", Number(e.target.value))}
                      className={styles.numberInput}
                      placeholder={t("q.age.placeholder")}
                    />
                    <span className={styles.inputUnit}>{t("q.age.unit")}</span>
                  </div>
                  <div className={styles.inputWrap}>
                    <CustomSelect
                      label={t("q.sex.label")}
                      value={form.geschlecht}
                      onChange={(v) => set("geschlecht", v)}
                      options={[
                        { label: t("q.sex.maennlich"), value: "maennlich" },
                        { label: t("q.sex.weiblich"), value: "weiblich" },
                        { label: t("q.sex.divers"), value: "divers" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Q3: Größe */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.height.label")}</span>
                <SliderInput
                  label={t("q.height.input")}
                  value={form.groesse}
                  min={140} max={220}
                  unit=" cm"
                  onChange={(v) => set("groesse", v)}
                />
              </div>

              {/* Q4: Gewicht */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.weight.label")}</span>
                <SliderInput
                  label={t("q.weight.input")}
                  value={form.gewicht}
                  min={40} max={160}
                  unit=" kg"
                  onChange={(v) => set("gewicht", v)}
                />
              </div>

              {/* Q4b: Obst & Gemüse pro Woche */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.fruit_veg.label")}</span>
                <RadioGroup
                  value={form.obstGemuese}
                  onChange={(v) => set("obstGemuese", v as string)}
                  options={[
                    { label: t("q.fruit_veg.fast_jede"), value: "fast-jede" },
                    { label: t("q.fruit_veg.meiste"), value: "meiste" },
                    { label: t("q.fruit_veg.haelfte"), value: "haelfte" },
                    { label: t("q.fruit_veg.selten"), value: "selten" },
                    { label: t("q.fruit_veg.kaum"), value: "kaum" },
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
                  <span className={styles.categoryLabel}>{t("category_label")}</span>
                  <h2 className={styles.categoryTitle}>{t("categories.2")}</h2>
                </div>
              </div>

              {/* Q5: Trainingsfrequenz */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.training_freq.label")}</span>
                <RadioGroup
                  value={form.trainingsfreq}
                  onChange={(v) => set("trainingsfreq", v as string)}
                  options={[
                    { label: t("q.training_freq.keiner"), value: "keiner" },
                    { label: t("q.training_freq.1_2x"), value: "1-2x" },
                    { label: t("q.training_freq.3_4x"), value: "3-4x" },
                    { label: t("q.training_freq.5_6x"), value: "5-6x" },
                    { label: t("q.training_freq.taeglich"), value: "taeglich" },
                  ]}
                />
              </div>

              {/* Q6: Trainingsart */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.training_type.label")}</span>
                <RadioGroup
                  value={form.trainingsart}
                  onChange={(v) => set("trainingsart", v as string)}
                  options={[
                    { label: t("q.training_type.kraft"), value: "kraft" },
                    { label: t("q.training_type.cardio"), value: "cardio" },
                    { label: t("q.training_type.kampfsport"), value: "kampfsport" },
                    { label: t("q.training_type.teamsport"), value: "teamsport" },
                    { label: t("q.training_type.yoga"), value: "yoga" },
                    { label: t("q.training_type.gemischt"), value: "gemischt" },
                  ]}
                />
              </div>

              {/* Q6b: Moderate Trainingsdauer */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.moderate_duration.label")}</span>
                <RadioGroup
                  value={form.moderateDauer}
                  onChange={(v) => set("moderateDauer", v as string)}
                  options={[
                    { label: t("q.duration_options.lt20"), value: "<20" },
                    { label: t("q.duration_options.20_30"), value: "20-30" },
                    { label: t("q.duration_options.30_60"), value: "30-60" },
                    { label: t("q.duration_options.gt60"), value: ">60" },
                  ]}
                />
              </div>

              {/* Q6c: Intensive Trainingsdauer */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.intense_duration.label")}</span>
                <RadioGroup
                  value={form.intensiveDauer}
                  onChange={(v) => set("intensiveDauer", v as string)}
                  options={[
                    { label: t("q.duration_options.lt20"), value: "<20" },
                    { label: t("q.duration_options.20_30"), value: "20-30" },
                    { label: t("q.duration_options.30_60"), value: "30-60" },
                    { label: t("q.duration_options.gt60"), value: ">60" },
                  ]}
                />
              </div>

              {/* Q6d: Stunden auf den Beinen pro Tag */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.standing_hours.label")}</span>
                <span className={styles.questionSub ?? ""} style={{ display: "block", fontSize: "0.85em", opacity: 0.7, marginBottom: "0.75rem" }}>
                  {t("q.standing_hours.sub")}
                </span>
                <RadioGroup
                  value={form.stehzeit}
                  onChange={(v) => set("stehzeit", v as string)}
                  options={[
                    { label: t("q.standing_hours.lt2"), value: "<2" },
                    { label: t("q.standing_hours.2_4"), value: "2-4" },
                    { label: t("q.standing_hours.4_6"), value: "4-6" },
                    { label: t("q.standing_hours.gt6"), value: ">6" },
                  ]}
                />
              </div>

              {/* Q7: Schrittzahl */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.steps_q.label")}</span>
                <SliderInput
                  label={t("q.steps_q.input")}
                  value={form.schrittzahl}
                  min={1000} max={20000}
                  step={500}
                  unit={t("q.steps_q.unit")}
                  onChange={(v) => set("schrittzahl", v)}
                />
              </div>

              {/* Q8: Sitzzeit */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.sitting.label")}</span>
                <SliderInput
                  label={t("q.sitting.input")}
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
                  <span className={styles.categoryLabel}>{t("category_label")}</span>
                  <h2 className={styles.categoryTitle}>{t("categories.3")}</h2>
                </div>
              </div>

              {/* Q9: Schlafdauer */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.sleep_duration.label")}</span>
                <SliderInput
                  label={t("q.sleep_duration.input")}
                  value={form.schlafdauer}
                  min={3} max={12}
                  unit=" h"
                  onChange={(v) => set("schlafdauer", v)}
                />
              </div>

              {/* Q10: Schlafqualität */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.sleep_quality.label")}</span>
                <RadioGroup
                  value={form.schlafqualitaet}
                  onChange={(v) => set("schlafqualitaet", v as string)}
                  options={[
                    { label: t("q.sleep_quality.sehr_schlecht"), value: "sehr-schlecht" },
                    { label: t("q.sleep_quality.schlecht"), value: "schlecht" },
                    { label: t("q.sleep_quality.mittel"), value: "mittel" },
                    { label: t("q.sleep_quality.gut"), value: "gut" },
                    { label: t("q.sleep_quality.sehr_gut"), value: "sehr-gut" },
                  ]}
                />
              </div>

              {/* Q11: Aufwachen */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.wakeup.label")}</span>
                <RadioGroup
                  value={form.aufwachen}
                  onChange={(v) => set("aufwachen", v as string)}
                  options={[
                    { label: t("q.wakeup.nie"), value: "nie" },
                    { label: t("q.wakeup.selten"), value: "selten" },
                    { label: t("q.wakeup.manchmal"), value: "manchmal" },
                    { label: t("q.wakeup.oft"), value: "oft" },
                    { label: t("q.wakeup.jede_nacht"), value: "jede-nacht" },
                  ]}
                />
              </div>

              {/* Q12: Erholt-Gefühl */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.rested.label")}</span>
                <RadioGroup
                  value={form.erholtGefuehl}
                  onChange={(v) => set("erholtGefuehl", v as string)}
                  options={[
                    { label: t("q.rested.fast_nie"), value: "fast-nie" },
                    { label: t("q.rested.selten"), value: "selten" },
                    { label: t("q.rested.manchmal"), value: "manchmal" },
                    { label: t("q.rested.meistens"), value: "meistens" },
                    { label: t("q.rested.immer"), value: "immer" },
                  ]}
                />
              </div>

              {/* Q13: Bildschirmzeit vor dem Schlafen */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.screen_time.label")}</span>
                <span style={{ display: "block", fontSize: "0.85em", opacity: 0.7, marginBottom: "0.75rem" }}>
                  {t("q.screen_time.sub")}
                </span>
                <RadioGroup
                  value={form.bildschirmVorSchlaf}
                  onChange={(v) => set("bildschirmVorSchlaf", v as string)}
                  options={[
                    { label: t("q.screen_time.kein"), value: "kein" },
                    { label: t("q.screen_time.lt30"), value: "<30" },
                    { label: t("q.screen_time.30_60"), value: "30-60" },
                    { label: t("q.screen_time.gt60"), value: ">60" },
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
                  <span className={styles.categoryLabel}>{t("category_label")}</span>
                  <h2 className={styles.categoryTitle}>{t("categories.4")}</h2>
                </div>
              </div>

              {/* Q13: Wasserkonsum */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.water.label")}</span>
                <SliderInput
                  label={t("q.water.input")}
                  value={form.wasserkonsum}
                  min={0.5} max={5}
                  step={0.5}
                  unit=" L"
                  onChange={(v) => set("wasserkonsum", v)}
                />
              </div>

              {/* Q14: Stresslevel */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.stress.label")}</span>
                <RadioGroup
                  value={form.stresslevel}
                  onChange={(v) => set("stresslevel", v as string)}
                  options={[
                    { label: t("q.stress.sehr_gering"), value: "sehr-gering" },
                    { label: t("q.stress.gering"), value: "gering" },
                    { label: t("q.stress.moderat"), value: "moderat" },
                    { label: t("q.stress.hoch"), value: "hoch" },
                    { label: t("q.stress.sehr_hoch"), value: "sehr-hoch" },
                  ]}
                />
              </div>

              {/* Q15: Mahlzeitenplan */}
              <div className={styles.questionCard} ref={nextCardRef}>
                <span className={styles.questionLabel}>{t("q.meals.label")}</span>
                <RadioGroup
                  value={form.mahlzeitenPlan}
                  onChange={(v) => set("mahlzeitenPlan", v as string)}
                  options={[
                    { label: t("q.meals.kein"), value: "kein" },
                    { label: t("q.meals.intuitiv"), value: "intuitiv" },
                    { label: t("q.meals.grob"), value: "grob" },
                    { label: t("q.meals.makros"), value: "makros" },
                    { label: t("q.meals.meal_prep"), value: "meal-prep" },
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
                  <strong style={{ color: "#E63222" }}>{t("submit.error_label")}</strong> {errorMsg}
                </div>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className={`${styles.submitBtn} ${canSubmit ? styles.submitBtnEnabled : styles.submitBtnDisabled}`}
              >
                {loading ? t("submit.loading") : t("submit.btn")}
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
              {t("loading_overlay.label")}
            </div>
            <div className={styles.loadingTitle}>
              {t("loading_overlay.title_1")}<br />{t("loading_overlay.title_2")}
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
                  {t("loading_overlay.progress_label")}
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
                  ? t("loading_overlay.step_scoring")
                  : loadingProgress < 60
                  ? t("loading_overlay.step_report")
                  : loadingProgress < 95
                  ? t("loading_overlay.step_plans")
                  : t("loading_overlay.step_done")}
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
              {t("loading_overlay.duration_hint")}
            </div>

            {/* Active step indicator — shows one step at a time */}
            {(() => {
              const loadingSteps = t.raw("loading_overlay.steps") as string[];
              const activeIndex = Math.min(
                Math.floor((loadingProgress / 100) * loadingSteps.length),
                loadingSteps.length - 1,
              );
              return (
                <div className={styles.activeStepWrap}>
                  <div className={styles.activeStepCounter}>
                    {t("loading_overlay.active_step_counter", {
                      current: activeIndex + 1,
                      total: loadingSteps.length,
                    })}
                  </div>
                  <div className={styles.activeStepDots}>
                    {loadingSteps.map((_, i) => (
                      <span
                        key={i}
                        className={`${styles.activeStepDot} ${
                          i < activeIndex ? styles.dotDone : i === activeIndex ? styles.dotActive : ""
                        }`}
                      />
                    ))}
                  </div>
                  <div key={activeIndex} className={styles.activeStepText}>
                    {loadingSteps[activeIndex]}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Results are shown on /results page after redirect */}
    </>
  );
}
