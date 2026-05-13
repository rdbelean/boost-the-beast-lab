import { describe, expect, it } from "vitest";
import { computeLinearProgress, computeFinalProgress } from "@/lib/analyse/progress-tick";

describe("computeLinearProgress — gleichmäßige lineare Bewegung (300s = 5min)", () => {
  it("startet bei 0", () => {
    expect(computeLinearProgress(0)).toBe(0);
  });

  it("Negative elapsedMs wird zu 0 geclamped", () => {
    expect(computeLinearProgress(-5000)).toBe(0);
  });

  it("Linear-Phase: 1pp pro ~3 Sekunden", () => {
    // Verwendete Kalibrierung: 300_000ms → 99% → 1pp pro 3030ms ≈ 0.33pp/s
    expect(computeLinearProgress(30_000)).toBeCloseTo(9.9, 1);    // 30s → 9.9%
    expect(computeLinearProgress(60_000)).toBeCloseTo(19.8, 1);   // 1min → 19.8%
    expect(computeLinearProgress(120_000)).toBeCloseTo(39.6, 1);  // 2min → 39.6%
    expect(computeLinearProgress(180_000)).toBeCloseTo(59.4, 1);  // 3min → 59.4%
    expect(computeLinearProgress(240_000)).toBeCloseTo(79.2, 1);  // 4min → 79.2%
  });

  it("Bei exakt 300s (5min) ist der Bar bei 99%", () => {
    expect(computeLinearProgress(300_000)).toBe(99);
  });

  it("Overtime-Phase: asymptotischer Mikro-Crawl 99 → 99.9", () => {
    // 6min: 99 + 0.9*(1-exp(-60/60)) = 99 + 0.569 = 99.569
    expect(computeLinearProgress(360_000)).toBeGreaterThan(99.55);
    expect(computeLinearProgress(360_000)).toBeLessThan(99.6);
    // 10min: 99 + 0.9*(1-exp(-5)) = 99 + 0.894 = 99.894
    expect(computeLinearProgress(600_000)).toBeGreaterThan(99.85);
    expect(computeLinearProgress(600_000)).toBeLessThanOrEqual(99.9);
  });

  it("Monoton wachsend — strikt", () => {
    let prev = -1;
    for (let t = 0; t < 600_000; t += 1000) {
      const cur = computeLinearProgress(t);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it("Niemals genau 100 (nur durch Final-Animation erreichbar)", () => {
    for (let t = 0; t < 3_600_000; t += 60_000) {
      expect(computeLinearProgress(t)).toBeLessThan(100);
    }
  });
});

describe("computeFinalProgress — ease-out cubic auf 100", () => {
  it("Bei t=0 startet bei startVal", () => {
    expect(computeFinalProgress(60, 1000, 1000, 1500)).toBe(60);
  });

  it("Bei t=duration endet exakt bei 100", () => {
    expect(computeFinalProgress(60, 1000, 2500, 1500)).toBe(100);
  });

  it("Bei t>duration bleibt 100 (clamp)", () => {
    expect(computeFinalProgress(60, 1000, 5000, 1500)).toBe(100);
  });

  it("Ease-out cubic: t=0.5 → eased ≈ 0.875 → bar bei startVal + 0.875*(100-startVal)", () => {
    // t=0.5: eased = 1 - (1-0.5)^3 = 1 - 0.125 = 0.875
    // startVal=60, gap=40, advance=35 → 95
    const out = computeFinalProgress(60, 0, 750, 1500);
    expect(out).toBeCloseTo(95, 0);
  });

  it("Bei durationMs<=0 direkt 100", () => {
    expect(computeFinalProgress(50, 0, 0, 0)).toBe(100);
  });

  it("Bei startVal=100 bleibt 100 (gap=0)", () => {
    expect(computeFinalProgress(100, 0, 500, 1500)).toBe(100);
  });
});
