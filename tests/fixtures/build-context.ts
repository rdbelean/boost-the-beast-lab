// Test-fixture helper: builds a real ReportContext from a synthetic
// FullAssessmentInputs by running the actual scoring pipeline. This
// keeps fixtures honest — they exercise the same scoring logic the
// production pipeline runs, so a scoring change that breaks a fixture
// surfaces in CI immediately.

import { runFullScoring, type FullAssessmentInputs } from "@/lib/scoring";
import {
  buildReportContextFromInputs,
  type ReportContext,
  type DemoContextInputs,
} from "@/lib/reports/report-context";

export interface BuildContextInput
  extends Omit<DemoContextInputs, "result"> {
  scoringInputs: FullAssessmentInputs;
}

export function buildTestContext(input: BuildContextInput): ReportContext {
  const result = runFullScoring(input.scoringInputs);
  const { scoringInputs, ...rest } = input;
  void scoringInputs;
  return buildReportContextFromInputs({ ...rest, result });
}
