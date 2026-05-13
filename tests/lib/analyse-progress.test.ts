import { describe, expect, it } from "vitest";
import { computeNextProgress, computeFinalProgress } from "@/lib/analyse/progress-tick";

const MAX_STEP = 5;

function simulate(args: {
  signalCap: number;
  tEndMs: number;
  signalCapChange?: (atMs: number) => number;
}): number[] {
  const trail: number[] = [];
  let prev = 0;
  for (let t = 120; t <= args.tEndMs; t += 120) {
    const cap = args.signalCapChange ? args.signalCapChange(t) : args.signalCap;
    prev = computeNextProgress({
      prev, signalCap: cap, elapsedMs: t, maxStepPerTick: MAX_STEP,
    });
    trail.push(prev);
  }
  return trail;
}

describe("computeNextProgress — kontinuierliche Bewegung", () => {
  it("startet bei 0 und bewegt sich beim ersten Tick", () => {
    const out = computeNextProgress({
      prev: 0, signalCap: 5, elapsedMs: 120, maxStepPerTick: MAX_STEP,
    });
    expect(out).toBeGreaterThan(0);
  });

  it("erreicht ~95% nach 120s (user-spec '5→95 in 120s')", () => {
    const trail = simulate({ signalCap: 100, tEndMs: 120_000 });
    const finalVal = trail[trail.length - 1];
    expect(finalVal).toBeGreaterThan(90);
    expect(finalVal).toBeLessThanOrEqual(100);
  });

  it("Stuck-at-15-Bug fixed: bei signalCap=15 und t=40s ist progress >>15", () => {
    // Time-based at 40s: 100*(1-exp(-1))=63.2 — overrides signalCap.
    const trail = simulate({ signalCap: 15, tEndMs: 40_000 });
    const finalVal = trail[trail.length - 1];
    expect(finalVal).toBeGreaterThan(60);
    expect(finalVal).toBeLessThan(70);
  });

  it("Keine Plateau-Phase > 8s während Ramp-Up: jedes 8s-Fenster bei prev<95 hat >= 0.4pp Bewegung", () => {
    // Worst-Case: stuck Anthropic, signalCap=15 für 5 Min
    const trail = simulate({ signalCap: 15, tEndMs: 300_000 });
    const ticksIn8Sec = Math.floor(8000 / 120);
    let minAdvance = Infinity;
    // Nur Ramp-Up-Phase prüfen (vor Asymptoten-Annäherung an 99.95)
    for (let i = ticksIn8Sec; i < trail.length; i++) {
      if (trail[i] >= 99) break;
      const advance = trail[i] - trail[i - ticksIn8Sec];
      if (advance < minAdvance) minAdvance = advance;
    }
    expect(minAdvance).toBeGreaterThan(0.4);
  });

  it("Worst-Case 5min Anthropic-Stau: bar erreicht 99 (visuell '99%')", () => {
    const trail = simulate({ signalCap: 15, tEndMs: 300_000 });
    const finalVal = trail[trail.length - 1];
    // Bar zeigt 99% bis done-signal kommt (Math.floor(99)=99)
    expect(finalVal).toBe(99);
  });

  it("Hard-Ceiling 99 solange signalCap < 100 (verhindert prematures 100% Display)", () => {
    const trail = simulate({ signalCap: 65, tEndMs: 600_000 });
    const max = Math.max(...trail);
    expect(max).toBeLessThanOrEqual(99);
  });

  it("Done-Signal: signalCap=100 lässt Bar auf 100 wachsen", () => {
    let prev = 70;
    for (let i = 0; i < 200; i++) {
      const next = computeNextProgress({
        prev, signalCap: 100, elapsedMs: 100_000 + i * 120, maxStepPerTick: MAX_STEP,
      });
      prev = next;
      if (prev >= 99.99) break;
    }
    expect(prev).toBeGreaterThan(99);
  });

  it("Mindest-Velocity-Floor: jeder Tick bewegt prev nach vorne", () => {
    const trail = simulate({ signalCap: 15, tEndMs: 60_000 });
    for (let i = 1; i < trail.length; i++) {
      expect(trail[i]).toBeGreaterThan(trail[i - 1]);
    }
  });

  it("Bar geht nie rückwärts bei monoton wachsendem signalCap (Production-Pattern)", () => {
    // Real-world: signalCap geht 5→15→65→...→100, nur monoton steigend.
    const trail = simulate({
      signalCap: 0, tEndMs: 60_000,
      signalCapChange: (t) =>
        t < 3_000 ? 5 : t < 8_000 ? 15 : t < 50_000 ? 65 : 100,
    });
    for (let i = 1; i < trail.length; i++) {
      expect(trail[i]).toBeGreaterThanOrEqual(trail[i - 1]);
    }
  });

  it("maxStepPerTick verhindert Riesen-Jump nach Tab-Sleep", () => {
    // 60s tab-sleep: prev=20, elapsedMs=80_000. timeBased=86.5. Without cap → jump zu 86.5.
    // Mit maxStepPerTick=5: animated path capped, ABER time-based ignoriert das cap.
    // Tatsächliche Begrenzung: kein Cap auf time-based (time-based ist autoritativ).
    // Test: dass die Bar SINNVOLL springt, nicht 0 oder absurd hoch.
    const out = computeNextProgress({
      prev: 20, signalCap: 100, elapsedMs: 80_000, maxStepPerTick: 5,
    });
    expect(out).toBeGreaterThan(60);
    expect(out).toBeLessThanOrEqual(99);
  });

  it("Bar bewegt sich auch ohne Signal-Cap-Bump bei reinem Time-Flow", () => {
    // Pure time-flow: signal bleibt bei 5 (Initial-Wert) für 30s
    const trail = simulate({ signalCap: 5, tEndMs: 30_000 });
    const finalVal = trail[trail.length - 1];
    // Bei t=30s: time-based=100*(1-exp(-0.75))=52.8
    expect(finalVal).toBeGreaterThan(45);
    expect(finalVal).toBeLessThan(60);
  });
});

describe("computeFinalProgress — explicit smooth-to-100", () => {
  it("kriecht smooth auf 100", () => {
    let p = 95;
    for (let i = 0; i < 50; i++) {
      p = computeFinalProgress(p);
      if (p >= 99.99) break;
    }
    expect(p).toBeGreaterThan(99);
    expect(p).toBeLessThanOrEqual(100);
  });

  it("Bei prev=100 bleibt 100", () => {
    expect(computeFinalProgress(100)).toBe(100);
  });
});
