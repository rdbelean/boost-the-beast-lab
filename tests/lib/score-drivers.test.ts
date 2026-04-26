import { describe, expect, it } from "vitest";
import { computeScoreDrivers } from "@/lib/reports/score-drivers";
import { beginnerContext } from "../fixtures/profiles/beginner";
import { athleteContext } from "../fixtures/profiles/athlete";
import { founderContext } from "../fixtures/profiles/founder";

describe("computeScoreDrivers", () => {
  it("returns one entry per dimension with at least one driver", () => {
    const d = computeScoreDrivers(beginnerContext.scoring.result, beginnerContext.raw);
    for (const dim of ["sleep", "recovery", "activity", "metabolic", "stress", "vo2max"] as const) {
      expect(d[dim].drivers.length).toBeGreaterThan(0);
      expect(d[dim].score).toBeGreaterThanOrEqual(0);
      expect(d[dim].score).toBeLessThanOrEqual(100);
    }
  });

  it("flags low-hint sleep drivers when duration < 6.5 h", () => {
    const d = computeScoreDrivers(beginnerContext.scoring.result, beginnerContext.raw);
    const duration = d.sleep.drivers.find((dr) => dr.field === "sleep_duration_hours");
    expect(duration?.hint).toBe("low");
  });

  it("flags low-hint sitting driver at 9 h/day", () => {
    const d = computeScoreDrivers(beginnerContext.scoring.result, beginnerContext.raw);
    const sitting = d.activity.drivers.find((dr) => dr.field === "sitting_hours_per_day");
    expect(sitting?.hint).toBe("low");
  });

  it("flags overtraining_risk driver for the athlete fixture", () => {
    const d = computeScoreDrivers(athleteContext.scoring.result, athleteContext.raw);
    const ov = d.recovery.drivers.find((dr) => dr.field === "overtraining_risk");
    expect(ov).toBeDefined();
    expect(ov?.hint).toBe("low");
  });

  it("preserves daily_steps when present (founder=11000)", () => {
    const d = computeScoreDrivers(founderContext.scoring.result, founderContext.raw);
    const steps = d.activity.drivers.find((dr) => dr.field === "daily_steps");
    expect(steps?.value).toBe(11000);
    expect(steps?.hint).toBe("high");
  });

  it("each driver entry caps at 4 drivers", () => {
    const d = computeScoreDrivers(beginnerContext.scoring.result, beginnerContext.raw);
    for (const dim of ["sleep", "recovery", "activity", "metabolic", "stress", "vo2max"] as const) {
      expect(d[dim].drivers.length).toBeLessThanOrEqual(4);
    }
  });
});
