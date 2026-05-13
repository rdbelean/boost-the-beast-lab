// Pure-function progress für den Loading-Overlay-Bar.
//
// Design-Iteration 3 (Radical Simplification):
//
// Vorherige Versionen kombinierten Signal-Caps + Timer-Catch-up + asymptotische
// Annäherung. Resultat: ungleichmäßige Geschwindigkeit. User-Feedback:
// "Bar soll uniform laufen, jede Prozentzahl darf 3-8s brauchen, aber gleich."
//
// Neu: PURE LINEARE FUNKTION. Keine Signal-Caps. Reine Zeit-zu-Wert-Mapping.
//
// Kalibrierung: EXPECTED_DURATION_MS = 5 Minuten = realer Average der
// Report-Generation (4-4.5 Min + Buffer). 1 Prozentpunkt pro ~3 Sekunden.
//
// Bei tatsächlichem "done" (alle Promises resolved) triggert die Page eine
// separate ease-out-Animation via requestAnimationFrame, die in <1.5s auf
// 100% übergeht — siehe computeFinalProgress.

/** Realistische Report-Generierung dauert 4-4.5 Min. 5 Min mit Buffer. */
const EXPECTED_DURATION_MS = 300_000;

/**
 * Lineare Zeit-zu-Progress-Funktion.
 *
 * Phase 1 (0 → 300s): linear 0% → 99% bei ~0.33 pp/s
 * Phase 2 (>300s, Anthropic-Stau): asymptotischer Mikro-Crawl 99% → 99.9%
 *
 * Pure function: gleiche elapsedMs → gleicher Output, keine Seiteneffekte.
 */
export function computeLinearProgress(elapsedMs: number): number {
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed <= EXPECTED_DURATION_MS) {
    return (elapsed / EXPECTED_DURATION_MS) * 99;
  }
  // Overtime: asymptotisch 99 → 99.9 über 5+ weitere Minuten
  const overtimeSec = (elapsed - EXPECTED_DURATION_MS) / 1000;
  return 99 + 0.9 * (1 - Math.exp(-overtimeSec / 60));
}

/**
 * Ease-out-cubic Interpolation für den Final-Übergang auf 100%.
 *
 * Wird bei Backend-done aufgerufen, mit:
 *  - startVal: aktueller Bar-Wert bei done-Trigger
 *  - startMs: Date.now() bei done-Trigger
 *  - nowMs:   Date.now() im aktuellen Frame
 *  - durationMs: animation Duration (typisch 300-1500ms je nach Gap)
 *
 * Bei nowMs >= startMs+durationMs liefert die Funktion exakt 100.
 */
export function computeFinalProgress(
  startVal: number,
  startMs: number,
  nowMs: number,
  durationMs: number,
): number {
  if (durationMs <= 0) return 100;
  const t = Math.min((nowMs - startMs) / durationMs, 1);
  const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
  return startVal + (100 - startVal) * eased;
}
