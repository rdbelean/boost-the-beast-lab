// Pure-function progress tick für den Loading-Overlay-Bar.
// Idee: ein time-based Timer kriecht kontinuierlich von 5 → 95 über
// EXPECTED_DURATION_MS. Die existierenden Signal-Bumps (5→15→65→+10/plan→100)
// bleiben als Beschleuniger erhalten — `effectiveCap = max(signalCap,
// timerTarget)`. Animation läuft asymptotisch zu effectiveCap, niemals
// Hard-Stop bei einem Wert < 95.
//
// Worst-Case (Anthropic-Stau): Timer hält bei 95, Bar nähert sich
// asymptotisch — niemals = 95, immer minimale Bewegung sichtbar.
// Beim done-Signal: signalCap=100, effectiveCap=100, smooth auf 100.

export interface ProgressTickInput {
  /** Aktueller progress-Wert (0-100) */
  prev: number;
  /** Highest progressCap aus Backend-Resolves (5 / 15 / 65 / +10 per plan / 100) */
  signalCap: number;
  /** ms seit dem ersten Tick (Date.now() - startTime) */
  elapsedMs: number;
  /** Configured expected duration in ms (typisch 100_000 = 100 s) */
  expectedDurationMs: number;
  /** Catch-up rate cap — bei visibilitychange-Resume soll max so viel pro Tick gemacht werden */
  maxStepPerTick: number;
}

/**
 * Berechnet den nächsten progress-Wert.
 * Reine Funktion: gleiche Inputs → gleiche Outputs, kein Side-Effect.
 */
export function computeNextProgress(input: ProgressTickInput): number {
  const { prev, signalCap, elapsedMs, expectedDurationMs, maxStepPerTick } = input;

  // 1. Timer-basiertes Target: kriecht linear von 5 → 95 über expectedDurationMs.
  //    Bei elapsed > expectedDuration wird auf 95 gecappt.
  const timerTarget = Math.min(
    95,
    5 + (Math.max(0, elapsedMs) / expectedDurationMs) * 90,
  );

  // 2. Effective cap = höchster Wert aus Signal-Cap und Timer-Target.
  //    Signal-Cap=100 (done) gewinnt immer. Signal-Cap=15 + Timer=20 → 20.
  const effectiveCap = Math.max(signalCap, timerTarget);

  // 3. Animation: asymptotisch annähern an effectiveCap.
  //    Wenn prev bereits >= effectiveCap: kein Update (Bar steht).
  //    Wenn prev < effectiveCap: delta = max(baseline, (cap-prev) * 0.08).
  //    Baseline = 0.05 (sehr langsam, aber NIE komplett still) wenn nah an cap.
  if (prev >= effectiveCap) return prev;

  const rawDelta = Math.max(0.05, (effectiveCap - prev) * 0.08);

  // 4. Catch-up-Cap: nach Tab-Sleep darf der erste Tick nicht riesig springen.
  //    maxStepPerTick begrenzt den Sprung (typisch 5 Prozentpunkte).
  const delta = Math.min(rawDelta, maxStepPerTick);

  return Math.min(effectiveCap, prev + delta);
}

/**
 * Berechnet den smooth-Übergang auf 100 nach dem Done-Signal.
 * Setzt signalCap implizit auf 100; ignoriert den Timer.
 */
export function computeFinalProgress(prev: number, maxStepPerTick = 5): number {
  if (prev >= 100) return 100;
  const delta = Math.max(0.05, (100 - prev) * 0.12);
  return Math.min(100, prev + Math.min(delta, maxStepPerTick));
}
