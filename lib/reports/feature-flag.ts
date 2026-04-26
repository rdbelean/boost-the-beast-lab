// Feature-flag helper for the v4 pipeline rollout.
//
// Resolution order:
//   1. REPORT_PIPELINE_V4=true   → v4 active
//   2. REPORT_PIPELINE_V4=false  → legacy active (rollback escape hatch)
//   3. otherwise: v4 active when VERCEL_ENV === "preview", legacy otherwise
//
// Set REPORT_PIPELINE_V4=true in the Vercel preview environment to opt
// every preview deploy into v4 even before VERCEL_ENV is set; set it
// to "false" on production until the full migration is done.

export function shouldUseV4Pipeline(): boolean {
  const flag = process.env.REPORT_PIPELINE_V4;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.VERCEL_ENV === "preview";
}
