import { describe, expect, it } from "vitest";
import { computeNextProgress, computeFinalProgress } from "@/lib/analyse/progress-tick";

const EXPECTED = 100_000; // 100 s
const MAX_STEP = 5;

describe("computeNextProgress — Loading-Bar UX", () => {
  it("startet bei 0 und bewegt sich beim ersten Tick", () => {
    const out = computeNextProgress({
      prev: 0, signalCap: 5, elapsedMs: 120, expectedDurationMs: EXPECTED, maxStepPerTick: MAX_STEP,
    });
    expect(out).toBeGreaterThan(0);
    expect(out).toBeLessThanOrEqual(5);
  });

  it("erreicht ~5% nach 0s elapsed via signalCap=5", () => {
    // Tick-Sequenz: prev=0 → 0.4 → 0.77 → ... asymptotisch zu 5
    let p = 0;
    for (let t = 120; t < 5000; t += 120) {
      p = computeNextProgress({ prev: p, signalCap: 5, elapsedMs: t, expectedDurationMs: EXPECTED, maxStepPerTick: MAX_STEP });
    }
    // Nach 5s sollte progress nahe 5 sein (signalCap=5 dominiert vs timer=5+4.5=9.5)
    // Timer = min(95, 5 + 5000/100000 * 90) = min(95, 5+4.5) = 9.5
    // effectiveCap = max(5, 9.5) = 9.5 → progress nähert sich 9.5
    expect(p).toBeGreaterThan(8);
    expect(p).toBeLessThan(10);
  });

  it("Stuck-at-15-Bug: NICHT mehr stuck — Timer treibt Cap über 15", () => {
    // signalCap=15 (nach /api/assessment), wir simulieren 40s elapsed.
    // Timer = 5 + 40/100 * 90 = 41. effectiveCap = max(15, 41) = 41.
    let p = 0;
    for (let t = 120; t <= 40_000; t += 120) {
      p = computeNextProgress({ prev: p, signalCap: 15, elapsedMs: t, expectedDurationMs: EXPECTED, maxStepPerTick: MAX_STEP });
    }
    expect(p).toBeGreaterThan(35);
    expect(p).toBeLessThan(45);
  });

  it("Asymptotik bei Worst-Case (5 Min Anthropic-Stau): nähert sich 95% an", () => {
    // signalCap=15 stuck (assessment durch, report hängt). elapsed=300s (5 min).
    // Timer-Target = min(95, 5 + 300/100*90) = 95. effectiveCap = 95.
    let p = 0;
    for (let t = 120; t <= 300_000; t += 120) {
      p = computeNextProgress({ prev: p, signalCap: 15, elapsedMs: t, expectedDurationMs: EXPECTED, maxStepPerTick: MAX_STEP });
    }
    // Sollte sehr nahe an 95 sein, aber nicht drüber
    expect(p).toBeGreaterThan(94);
    expect(p).toBeLessThanOrEqual(95);
  });

  it("Signal-Bump beschleunigt sichtbar", () => {
    // bei 10s elapsed: progress ~14%. Dann kommt /api/report/generate-Resolve → cap=65.
    // Effective = max(65, 5+10/100*90)=max(65,14)=65. progress soll Richtung 65 beschleunigen.
    const before = computeNextProgress({ prev: 14, signalCap: 15, elapsedMs: 10_000, expectedDurationMs: EXPECTED, maxStepPerTick: MAX_STEP });
    const after = computeNextProgress({ prev: 14, signalCap: 65, elapsedMs: 10_000, expectedDurationMs: EXPECTED, maxStepPerTick: MAX_STEP });
    expect(after).toBeGreaterThan(before);
    // delta toward 65: (65-14)*0.08 = 4.08, capped to MAX_STEP=5 → delta=4.08
    expect(after - 14).toBeGreaterThan(2);
  });

  it("maxStepPerTick verhindert Riesen-Jump nach Tab-Sleep", () => {
    // Tab schlief 60s, prev=20, elapsedMs=80s → Timer-Target=77.
    // Ohne maxStepPerTick wäre delta=(77-20)*0.08=4.56 (ok).
    // Aber wenn effectiveCap viel höher (z.B. signalCap=100 done):
    // delta=(100-20)*0.08=6.4 → maxStepPerTick=5 → 25 statt 26.4. Verhindert riesen-jumps in einem tick.
    const out = computeNextProgress({ prev: 20, signalCap: 100, elapsedMs: 80_000, expectedDurationMs: EXPECTED, maxStepPerTick: 5 });
    expect(out - 20).toBeLessThanOrEqual(5);
  });

  it("Kein Stuck (no-update) bei normalem Lauf", () => {
    // Wenn Timer-Target leicht über prev liegt, soll immer +0.05 minimum kommen
    const out = computeNextProgress({ prev: 4.99, signalCap: 5, elapsedMs: 100, expectedDurationMs: EXPECTED, maxStepPerTick: MAX_STEP });
    expect(out).toBeGreaterThan(4.99);
  });

  it("Bei prev = effectiveCap: kein Update", () => {
    // Worst case: prev exactly 95, signalCap=15, elapsed=500s → Timer=95
    // effectiveCap=95, prev=95 → no movement
    const out = computeNextProgress({ prev: 95, signalCap: 15, elapsedMs: 500_000, expectedDurationMs: EXPECTED, maxStepPerTick: MAX_STEP });
    expect(out).toBe(95);
  });
});

describe("computeFinalProgress — smooth-to-100", () => {
  it("kriecht smooth auf 100", () => {
    let p = 95;
    const steps: number[] = [];
    for (let i = 0; i < 20; i++) {
      p = computeFinalProgress(p);
      steps.push(p);
    }
    expect(p).toBeGreaterThan(99);
    expect(p).toBeLessThanOrEqual(100);
    // No instant-jump: max-Step pro Tick ≤ 5
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i] - steps[i - 1]).toBeLessThanOrEqual(5);
    }
  });

  it("Bei prev=100 bleibt 100", () => {
    expect(computeFinalProgress(100)).toBe(100);
  });
});
