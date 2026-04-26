// Evidence-field resolver.
//
// Stage-A's AnalysisJSON contract: every `evidence_field` string must be
// a dot-path reference to a real value in the ReportContext (e.g.
// "raw.sleep_duration_hours" or "scoring.result.metabolic.bmi"). This
// module resolves a path against a ctx object and answers: does this
// path point to a defined, non-null value?
//
// Used in two places:
//   1. Pipeline post-Stage-A — reject AnalysisJSON whose evidence_field
//      paths are invented or stale.
//   2. Validator post-Stage-B — cross-check that the prose actually
//      cites values whose paths Stage-A claimed it would anchor.

import type { ReportContext } from "./report-context";
import type { AnalysisJSON } from "./schemas/report-analysis";

/** Allowed top-level path roots — any other root is invalid. */
export const VALID_PATH_ROOTS = new Set<string>([
  "user",
  "raw",
  "personalization",
  "scoring",
  "wearable",
  "data_quality",
  "flags",
  "meta",
]);

export interface ResolveResult {
  exists: boolean;
  value: unknown;
  reason?: "invalid_root" | "missing_segment" | "null_value" | "ok";
}

/** Resolve a dot-path against the ctx; supports numeric array indices. */
export function resolvePath(ctx: ReportContext, path: string): ResolveResult {
  if (!path || typeof path !== "string") {
    return { exists: false, value: undefined, reason: "invalid_root" };
  }
  const segments = path.split(".");
  if (segments.length === 0) {
    return { exists: false, value: undefined, reason: "invalid_root" };
  }
  if (!VALID_PATH_ROOTS.has(segments[0])) {
    return { exists: false, value: undefined, reason: "invalid_root" };
  }

  let cur: unknown = ctx as unknown;
  for (const seg of segments) {
    if (cur == null) {
      return { exists: false, value: undefined, reason: "missing_segment" };
    }
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) {
        return { exists: false, value: undefined, reason: "missing_segment" };
      }
      cur = cur[idx];
      continue;
    }
    if (typeof cur !== "object") {
      return { exists: false, value: undefined, reason: "missing_segment" };
    }
    if (!(seg in (cur as Record<string, unknown>))) {
      return { exists: false, value: undefined, reason: "missing_segment" };
    }
    cur = (cur as Record<string, unknown>)[seg];
  }
  if (cur == null) {
    return { exists: false, value: cur, reason: "null_value" };
  }
  return { exists: true, value: cur, reason: "ok" };
}

export interface InvalidPath {
  path: string;
  reason: "invalid_root" | "missing_segment" | "null_value";
  /** Pointer to where in AnalysisJSON the invalid path appears. */
  source: string;
}

/** Walk an AnalysisJSON and collect every evidence_field that does not resolve in ctx. */
export function findInvalidEvidencePaths(
  analysis: AnalysisJSON,
  ctx: ReportContext,
): InvalidPath[] {
  const invalid: InvalidPath[] = [];

  const check = (path: string, source: string) => {
    if (!path) return;
    const r = resolvePath(ctx, path);
    if (r.exists) return;
    const reason: InvalidPath["reason"] =
      r.reason === "invalid_root" || r.reason === "null_value" || r.reason === "missing_segment"
        ? r.reason
        : "missing_segment";
    invalid.push({ path, reason, source });
  };

  // executive_evidence.defining_factors[].evidence_field
  analysis.executive_evidence.defining_factors.forEach((f, i) => {
    check(f.evidence_field, `executive_evidence.defining_factors[${i}].evidence_field`);
  });

  // modules.<dim>.{key_drivers[].field, systemic_links[].evidence_fields[],
  //                limitation_root_cause.evidence_field,
  //                recommendation_anchors[].evidence_field}
  for (const dim of ["sleep", "recovery", "activity", "metabolic", "stress", "vo2max"] as const) {
    const m = analysis.modules[dim];
    m.key_drivers.forEach((d, i) => {
      // key_drivers[].field is a top-level field name — not a path. We
      // treat it as anchored if it appears as a leaf-segment anywhere in
      // ctx.raw or ctx.scoring.result. Skip path validation here; the
      // anchor-coverage validator (Stage-C) checks the value instead.
      void d;
      void i;
    });
    m.systemic_links.forEach((l, i) => {
      l.evidence_fields.forEach((p, j) =>
        check(p, `modules.${dim}.systemic_links[${i}].evidence_fields[${j}]`),
      );
    });
    check(
      m.limitation_root_cause.evidence_field,
      `modules.${dim}.limitation_root_cause.evidence_field`,
    );
    m.recommendation_anchors.forEach((rec, i) => {
      check(
        rec.evidence_field,
        `modules.${dim}.recommendation_anchors[${i}].evidence_field`,
      );
    });
  }

  // systemic_overview_anchors[].evidence_fields[]
  analysis.systemic_overview_anchors.forEach((a, i) => {
    a.evidence_fields.forEach((p, j) =>
      check(p, `systemic_overview_anchors[${i}].evidence_fields[${j}]`),
    );
  });

  // daily_protocol_anchors.<bucket>[].evidence_field
  for (const bucket of ["morning_focus", "work_day_focus", "evening_focus", "nutrition_micro_focus"] as const) {
    analysis.daily_protocol_anchors[bucket].forEach((h, i) => {
      check(h.evidence_field, `daily_protocol_anchors.${bucket}[${i}].evidence_field`);
    });
  }

  return invalid;
}
