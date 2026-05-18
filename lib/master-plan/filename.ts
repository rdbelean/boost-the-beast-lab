// Locale-aware filename for the Master Weekly Plan PDF.
// Shared between the client download anchor (browser) and the email
// attachment header (server) so a user sees the same name in both
// places — no diverging "Masterplan.pdf" vs "MasterPlan.pdf" surprises.

export function masterPlanFilename(locale: string): string {
  if (locale === "en") return "MasterPlan.pdf";
  if (locale === "it") return "Piano-Master.pdf";
  if (locale === "tr") return "Master-Plan.pdf";
  return "Masterplan.pdf"; // de + default
}
