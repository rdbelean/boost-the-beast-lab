export type EvalStatus = "optimal" | "good" | "borderline" | "low" | "high" | "critical";

export interface Evaluation {
  status: EvalStatus;
  reference: string;
  color: string;
}

function evalColor(s: EvalStatus): string {
  if (s === "optimal" || s === "good") return "#22C55E";
  if (s === "borderline") return "#F59E0B";
  return "#E63222";
}

// NSF/AASM: 7–9h for adults 18–64
export function evaluateSleepDuration(hours: number): Evaluation {
  if (hours >= 7 && hours <= 9) return { status: "optimal", reference: "NSF: 7–9h", color: evalColor("optimal") };
  if ((hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)) return { status: "borderline", reference: "NSF: 7–9h", color: evalColor("borderline") };
  return { status: "critical", reference: "NSF: 7–9h", color: evalColor("critical") };
}

// AASM: ≥85% efficiency is normal
export function evaluateSleepEfficiency(pct: number): Evaluation {
  if (pct >= 85) return { status: "optimal", reference: "AASM: ≥85%", color: evalColor("optimal") };
  if (pct >= 75) return { status: "borderline", reference: "AASM: ≥85%", color: evalColor("borderline") };
  return { status: "low", reference: "AASM: ≥85%", color: evalColor("low") };
}

// AASM: deep sleep ~13–23% of total (for 8h = ~60–110 min)
export function evaluateDeepSleep(min: number): Evaluation {
  if (min >= 90) return { status: "optimal", reference: "AASM: 60–110 min", color: evalColor("optimal") };
  if (min >= 60) return { status: "good", reference: "AASM: 60–110 min", color: evalColor("good") };
  if (min >= 45) return { status: "borderline", reference: "AASM: 60–110 min", color: evalColor("borderline") };
  return { status: "low", reference: "AASM: 60–110 min", color: evalColor("low") };
}

// AASM: REM ~20–25% of total (for 8h = ~90–120 min)
export function evaluateREM(min: number): Evaluation {
  if (min >= 90) return { status: "optimal", reference: "AASM: 90–120 min", color: evalColor("optimal") };
  if (min >= 70) return { status: "good", reference: "AASM: 90–120 min", color: evalColor("good") };
  if (min >= 50) return { status: "borderline", reference: "AASM: 90–120 min", color: evalColor("borderline") };
  return { status: "low", reference: "AASM: 90–120 min", color: evalColor("low") };
}

// HRV population norms — higher is better
export function evaluateHRV(ms: number): Evaluation {
  if (ms >= 60) return { status: "optimal", reference: "Norm: ≥60 ms", color: evalColor("optimal") };
  if (ms >= 40) return { status: "good", reference: "Norm: ≥40 ms", color: evalColor("good") };
  if (ms >= 25) return { status: "borderline", reference: "Norm: ≥25 ms", color: evalColor("borderline") };
  return { status: "low", reference: "Norm: <25 ms", color: evalColor("low") };
}

// AHA resting heart rate ranges
export function evaluateRHR(bpm: number): Evaluation {
  if (bpm < 60) return { status: "optimal", reference: "AHA: <60 bpm", color: evalColor("optimal") };
  if (bpm <= 72) return { status: "good", reference: "AHA: 60–72 bpm", color: evalColor("good") };
  if (bpm <= 80) return { status: "borderline", reference: "AHA: 60–80 bpm", color: evalColor("borderline") };
  return { status: "high", reference: "AHA: <80 bpm", color: evalColor("high") };
}

// WHOOP recovery color zones
export function evaluateWHOOPRecovery(score: number): Evaluation {
  if (score >= 67) return { status: "optimal", reference: "WHOOP: ≥67%", color: evalColor("optimal") };
  if (score >= 34) return { status: "good", reference: "WHOOP: 34–66%", color: evalColor("good") };
  return { status: "low", reference: "WHOOP: <34%", color: evalColor("low") };
}

// WHO: ≥10 000 steps/day
export function evaluateSteps(avg: number): Evaluation {
  if (avg >= 10000) return { status: "optimal", reference: "WHO: ≥10.000", color: evalColor("optimal") };
  if (avg >= 7500) return { status: "good", reference: "WHO: ≥7.500", color: evalColor("good") };
  if (avg >= 5000) return { status: "borderline", reference: "WHO: ≥5.000", color: evalColor("borderline") };
  return { status: "low", reference: "WHO: <5.000", color: evalColor("low") };
}

// WHOOP strain zones
export function evaluateStrain(avg: number): Evaluation {
  if (avg >= 14 && avg <= 17) return { status: "optimal", reference: "WHOOP: 14–17", color: evalColor("optimal") };
  if (avg >= 10 && avg < 14)  return { status: "good",    reference: "WHOOP: 10–13", color: evalColor("good") };
  if (avg < 10)               return { status: "low",     reference: "WHOOP: <10",   color: evalColor("low") };
  return { status: "high", reference: "WHOOP: >17", color: evalColor("high") };
}

// WHO BMI classification
export function evaluateBMI(bmi: number): Evaluation {
  if (bmi >= 18.5 && bmi <= 24.9) return { status: "optimal", reference: "WHO: 18.5–24.9", color: evalColor("optimal") };
  if ((bmi >= 17 && bmi < 18.5) || (bmi > 24.9 && bmi <= 27)) return { status: "borderline", reference: "WHO: 18.5–24.9", color: evalColor("borderline") };
  return { status: "critical", reference: "WHO: 18.5–24.9", color: evalColor("critical") };
}

// ACSM body fat ranges
export function evaluateBodyFat(pct: number, gender: "male" | "female"): Evaluation {
  if (gender === "male") {
    if (pct >= 6 && pct <= 17)  return { status: "optimal",   reference: "ACSM: 6–17%",  color: evalColor("optimal") };
    if (pct > 17 && pct <= 24)  return { status: "good",      reference: "ACSM: <24%",    color: evalColor("good") };
    if (pct > 24 && pct <= 30)  return { status: "borderline",reference: "ACSM: <25%",    color: evalColor("borderline") };
    return { status: "high", reference: "ACSM: >30%", color: evalColor("high") };
  }
  if (pct >= 14 && pct <= 24) return { status: "optimal",    reference: "ACSM: 14–24%", color: evalColor("optimal") };
  if (pct > 24 && pct <= 31)  return { status: "good",       reference: "ACSM: <31%",   color: evalColor("good") };
  if (pct > 31 && pct <= 36)  return { status: "borderline", reference: "ACSM: <32%",   color: evalColor("borderline") };
  return { status: "high", reference: "ACSM: >36%", color: evalColor("high") };
}

// ACSM VO2max norms by age + gender
export function evaluateVO2max(value: number, age: number, gender: "male" | "female"): Evaluation {
  const exM = age < 30 ? 56 : age < 40 ? 52 : age < 50 ? 47 : 42;
  const gdM = age < 30 ? 48 : age < 40 ? 43 : age < 50 ? 39 : 35;
  const exF = age < 30 ? 52 : age < 40 ? 49 : age < 50 ? 45 : 40;
  const gdF = age < 30 ? 40 : age < 40 ? 37 : age < 50 ? 34 : 29;
  const ex = gender === "male" ? exM : exF;
  const gd = gender === "male" ? gdM : gdF;
  if (value >= ex)     return { status: "optimal",   reference: `ACSM: ≥${ex}`,          color: evalColor("optimal") };
  if (value >= gd)     return { status: "good",      reference: `ACSM: ${gd}–${ex - 1}`, color: evalColor("good") };
  if (value >= gd - 5) return { status: "borderline",reference: `ACSM: ${gd - 5}–${gd - 1}`, color: evalColor("borderline") };
  return { status: "low", reference: `ACSM: <${gd - 5}`, color: evalColor("low") };
}
