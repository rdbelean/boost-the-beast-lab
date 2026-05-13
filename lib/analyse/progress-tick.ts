// Pure-function progress tick für den Loading-Overlay-Bar.
//
// Design-Iteration 2 (Plateau-Fix):
//
// Vorige Version hatte Plateaus an Signal-Cap-Grenzen (z.B. bei
// signalCap=15 stand die Bar bei 15 fest bis Timer-Target sie überholte).
//
// Neu: drei Mechanismen kombiniert.
//  1. Exponential-Curve als Time-Based-Target (TAU=40s, asymptotisch zu 100)
//     → wächst monoton, plateauiert mathematisch nie
//  2. Signal-Cap als Beschleuniger (animated-Path) — wenn Backend resolved,
//     beschleunigt die Bar zur cap
//  3. Mindest-Velocity-Floor (0.05pp/s = 0.006pp/Tick) — garantiert sichtbare
//     Vorwärts-Bewegung selbst wenn beide Pathways still stehen würden
//
// Hard-Ceiling: 99% vom Timer alleine; 100% nur wenn Backend done-signal (signalCap=100).

export interface ProgressTickInput {
  /** Aktueller progress-Wert (0-100) */
  prev: number;
  /** Highest progressCap aus Backend-Resolves (5 / 15 / 65 / +10 per plan / 100) */
  signalCap: number;
  /** ms seit dem ersten Tick (Date.now() - startTime) */
  elapsedMs: number;
  /** Catch-up rate cap — bei visibilitychange-Resume max so viel pro Tick */
  maxStepPerTick: number;
}

/** Zeitkonstante: bei TAU erreicht die exp-Curve 63%, bei 3×TAU 95%. */
const TAU_MS = 40_000;

/** Mindest-Vorwärts-Bewegung pro Tick (entspricht ~0.07pp/Sekunde bei 120ms-Tick).
 *  Garantiert >0.5pp Bewegung pro 8s-Window — schlägt User-Spec "kein Plateau >8s". */
const MIN_STEP_PER_TICK = 0.008;

/**
 * Berechnet den nächsten progress-Wert.
 * Pure function: gleiche Inputs → gleiche Outputs, kein Side-Effect.
 *
 * Garantien:
 * - Bar bewegt sich pro Tick um mindestens MIN_STEP_PER_TICK (0.006pp = 0.05pp/s)
 * - Bar überschreitet 99% nicht solange signalCap < 100
 * - Bei signalCap=100 erlaubt sich die Bar smooth-Übergang auf 100
 * - maxStepPerTick verhindert Riesen-Jumps nach Tab-Sleep
 */
export function computeNextProgress(input: ProgressTickInput): number {
  const { prev, signalCap, elapsedMs, maxStepPerTick } = input;

  // 1. Exponential-Time-Based-Target (asymptotisch zu 100, monoton wachsend)
  //    TAU=40s → bei t=120s ist die Curve bei 95%.
  const elapsedClamped = Math.max(0, elapsedMs);
  const timeBased = 100 * (1 - Math.exp(-elapsedClamped / TAU_MS));

  // 2. Signal-driven animated path (schnelle Reaktion auf Backend-Resolves)
  let animated = prev;
  if (prev < signalCap) {
    const rawDelta = Math.max(0.05, (signalCap - prev) * 0.08);
    const delta = Math.min(rawDelta, maxStepPerTick);
    animated = Math.min(signalCap, prev + delta);
  }

  // 3. Take the max of both pathways (Bar geht nie rückwärts)
  const naturalNext = Math.max(animated, timeBased);

  // 4. Mindest-Velocity-Floor: garantiert >0.5pp Bewegung pro 8s, auch bei
  //    Anthropic-Stau. Hard-Ceiling 99 bis Backend done-signal kommt —
  //    Math.floor(99)=99 im Display, der User sieht "99%" bis tatsächlich
  //    fertig (kein prematures "100%").
  const flooredNext = Math.max(naturalNext, prev + MIN_STEP_PER_TICK);
  const ceiling = signalCap >= 100 ? 100 : 99;
  return Math.min(ceiling, flooredNext);
}

/**
 * Smooth-Übergang auf 100 nach Done-Signal — wird von computeNextProgress
 * automatisch ausgelöst wenn signalCap=100 gesetzt wird.
 * Eigene Funktion bleibt für explizite "done"-Calls aus dem Page-Code.
 */
export function computeFinalProgress(prev: number, maxStepPerTick = 5): number {
  if (prev >= 100) return 100;
  const delta = Math.max(MIN_STEP_PER_TICK, (100 - prev) * 0.15);
  return Math.min(100, prev + Math.min(delta, maxStepPerTick));
}
