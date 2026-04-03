import { NextRequest, NextResponse } from "next/server";
import { calculateAllScores, type AssessmentData } from "@/lib/scoring";
import { generateReport } from "@/lib/claude";

/* Map form values to AssessmentData ──────────────────────── */

function mapGender(v: string): AssessmentData["gender"] {
  if (v === "weiblich") return "female";
  if (v === "divers") return "diverse";
  return "male";
}

function mapTrainingFrequency(v: string): number {
  const map: Record<string, number> = {
    keiner: 0,
    "1-2x": 1.5,
    "3-4x": 3.5,
    "5-6x": 5.5,
    taeglich: 7,
  };
  return map[v] ?? 0;
}

function mapTrainingType(v: string): AssessmentData["trainingType"] {
  if (v === "kraft") return "kraft";
  if (v === "cardio") return "ausdauer";
  if (v === "keiner") return "kein";
  return "hybrid"; // kampfsport, teamsport, yoga, gemischt
}

function mapSleepQuality(v: string): number {
  const map: Record<string, number> = {
    "sehr-schlecht": 2,
    schlecht: 4,
    mittel: 5,
    gut: 7,
    "sehr-gut": 9,
  };
  return map[v] ?? 5;
}

function mapNightWakeUps(v: string): AssessmentData["nightWakeUps"] {
  if (v === "nie") return "nie";
  if (v === "selten") return "1x";
  if (v === "jede-nacht") return ">3x";
  return "2-3x"; // manchmal, oft
}

function mapStressLevel(v: string): number {
  const map: Record<string, number> = {
    "sehr-gering": 1,
    gering: 3,
    moderat: 5,
    hoch: 7,
    "sehr-hoch": 10,
  };
  return map[v] ?? 5;
}

function mapMealsPerDay(v: string): number {
  const map: Record<string, number> = {
    kein: 2,
    intuitiv: 3,
    grob: 3,
    makros: 4,
    "meal-prep": 5,
  };
  return map[v] ?? 3;
}

/* Route handler ──────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const assessmentData: AssessmentData = {
      gender: mapGender(body.geschlecht),
      age: Number(body.alter),
      height: Number(body.groesse),
      weight: Number(body.gewicht),
      sleepHours: Number(body.schlafdauer),
      sleepQuality: mapSleepQuality(body.schlafqualitaet),
      nightWakeUps: mapNightWakeUps(body.aufwachen),
      dailySteps: Number(body.schrittzahl),
      trainingFrequency: mapTrainingFrequency(body.trainingsfreq),
      trainingType: mapTrainingType(body.trainingsart),
      trainingDuration: 60, // default — not collected in form
      waterIntake: Number(body.wasserkonsum),
      mealsPerDay: mapMealsPerDay(body.mahlzeitenPlan),
      stressLevel: mapStressLevel(body.stresslevel),
      sittingHours: Number(body.sitzzeit),
    };

    const scores = calculateAllScores(assessmentData);
    const report = await generateReport(assessmentData, scores);

    return NextResponse.json({
      success: true,
      scores,
      report,
      product: body.selectedProduct,
      email: body.email,
    });
  } catch (err) {
    console.error("[/api/analyse]", err);
    return NextResponse.json(
      { success: false, error: "Analyse fehlgeschlagen" },
      { status: 500 }
    );
  }
}
