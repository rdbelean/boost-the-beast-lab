import { describe, expect, it } from "vitest";
import { getInterpretationBundle } from "@/lib/interpretations";

describe("getInterpretationBundle", () => {
  function inputs(overrides = {}) {
    return {
      sleep_band: "good" as const,
      recovery_band: "moderate" as const,
      activity_band: "moderate" as const,
      metabolic_band: "good" as const,
      stress_band: "moderate" as const,
      vo2max_band: "Good" as const,
      age: 35,
      gender: "female" as const,
      bmi_category: "normal" as const,
      sitting_risk: "normal" as const,
      ...overrides,
    };
  }

  it("returns the same bundle for the same inputs (deterministic)", () => {
    const a = getInterpretationBundle(inputs(), {
      overtraining_risk: false,
      chronic_stress_risk: false,
      hpa_axis_risk: false,
      sleep_consistency_flag: false,
      sitting_critical: false,
      sitting_elevated: false,
      bmi_disclaimer_needed: false,
    });
    const b = getInterpretationBundle(inputs(), {
      overtraining_risk: false,
      chronic_stress_risk: false,
      hpa_axis_risk: false,
      sleep_consistency_flag: false,
      sitting_critical: false,
      sitting_elevated: false,
      bmi_disclaimer_needed: false,
    });
    expect(a).toEqual(b);
  });

  it("priority_order surfaces poor sleep first", () => {
    const b = getInterpretationBundle(
      inputs({ sleep_band: "poor", activity_band: "high", metabolic_band: "excellent" }),
      {
        overtraining_risk: false,
        chronic_stress_risk: false,
        hpa_axis_risk: false,
        sleep_consistency_flag: false,
        sitting_critical: false,
        sitting_elevated: false,
        bmi_disclaimer_needed: false,
      },
    );
    expect(b.priority_order[0]).toBe("sleep");
  });

  it("attaches a sitting flag payload when sitting_critical is active", () => {
    const b = getInterpretationBundle(
      inputs({ sitting_risk: "critical" }),
      {
        overtraining_risk: false,
        chronic_stress_risk: false,
        hpa_axis_risk: false,
        sleep_consistency_flag: false,
        sitting_critical: true,
        sitting_elevated: false,
        bmi_disclaimer_needed: false,
      },
    );
    expect(b.sitting_flag).not.toBeNull();
    expect(b.warnings.some((w) => w.code === "sitting_critical")).toBe(true);
  });

  it("attaches a consistency note only when the flag is set", () => {
    const off = getInterpretationBundle(inputs(), {
      overtraining_risk: false,
      chronic_stress_risk: false,
      hpa_axis_risk: false,
      sleep_consistency_flag: false,
      sitting_critical: false,
      sitting_elevated: false,
      bmi_disclaimer_needed: false,
    });
    const on = getInterpretationBundle(inputs(), {
      overtraining_risk: false,
      chronic_stress_risk: false,
      hpa_axis_risk: false,
      sleep_consistency_flag: true,
      sitting_critical: false,
      sitting_elevated: false,
      bmi_disclaimer_needed: false,
    });
    expect(off.consistency_note).toBeNull();
    expect(on.consistency_note).not.toBeNull();
  });

  it("includes the overtraining warning when the risk flag is set", () => {
    const b = getInterpretationBundle(inputs(), {
      overtraining_risk: true,
      chronic_stress_risk: false,
      hpa_axis_risk: false,
      sleep_consistency_flag: false,
      sitting_critical: false,
      sitting_elevated: false,
      bmi_disclaimer_needed: false,
    });
    expect(b.warnings.some((w) => w.code === "overtraining_risk")).toBe(true);
  });
});
