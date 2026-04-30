import { describe, expect, it } from "vitest";
import {
  hasSpaceForMetricsBlock,
  estimateActionPlanBoxHeight,
} from "@/lib/pdf/generateReport";

// ─── Bug B — KEY METRICS keep-together ───────────────────────────────────

describe("hasSpaceForMetricsBlock — Bug B keep-together logic", () => {
  // Block budget breakdown: PRE_GAP 24 + HEADING 15 + POST_HEADING 13
  // + STATBOX 52 = 104pt. Footer floor CB = 80. So the cutoff y at which
  // there is JUST enough room is y = 80 + 104 = 184.
  it("returns true when y is high enough for heading + boxes", () => {
    expect(hasSpaceForMetricsBlock(700)).toBe(true);
  });

  it("returns false when y is too close to footer floor", () => {
    expect(hasSpaceForMetricsBlock(170)).toBe(false);
  });

  it("returns true at exact-edge case (y = CB + required = 184)", () => {
    // When y - 104 === 80 (CB), the block fits exactly. Conservative
    // implementation accepts the equal case as "fits".
    expect(hasSpaceForMetricsBlock(184)).toBe(true);
  });

  it("returns false one pixel below the edge (y = 183)", () => {
    expect(hasSpaceForMetricsBlock(183)).toBe(false);
  });
});

// ─── Bug C — 30-day protocol box height accommodates 3 lines per milestone ─

describe("estimateActionPlanBoxHeight — Bug C-3 box-height calculation", () => {
  // Floor (no milestones) is 120pt. Per-milestone budget is 44pt.
  // Header overhead is 82pt. Plus 8pt padding inside milesH formula.
  it("returns the floor (120) when there are no milestones", () => {
    expect(estimateActionPlanBoxHeight(0)).toBe(120);
  });

  it("scales linearly with milestone count above the floor (44pt per milestone)", () => {
    // Above the 120pt floor, each additional milestone adds exactly 44pt.
    // Test the linear region by comparing 2 vs 4 milestones (both well
    // above the floor). The 0-vs-2 step is partially absorbed by the floor.
    const h2 = estimateActionPlanBoxHeight(2);
    const h4 = estimateActionPlanBoxHeight(4);
    expect(h4 - h2).toBe(88);  // 2 extra milestones × 44pt
  });

  it("4-milestone box is large enough that 3 such goals will not all fit on one A4 page", () => {
    // A4 inner content height (PH=841.89, top header ~82pt, footer floor 80)
    // ≈ 680pt available. Three 4-milestone goals × estimated boxH must
    // exceed this — the pagination logic in buildActionPlanPage relies
    // on this geometric truth to start a new page.
    const tripleH = 3 * estimateActionPlanBoxHeight(4) + 16;  // +16 for gaps
    expect(tripleH).toBeGreaterThan(680);
  });
});
