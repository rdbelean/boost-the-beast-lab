// Locale-specific disclaimer text — injected verbatim into the
// Writer's system prompt and copied into the produced ReportJSON.
// Kept identical to the legacy DISCLAIMER constant in
// lib/report/prompts/full-prompts.ts so the PDF footer stays consistent
// regardless of which pipeline version produced the report.

import type { Locale } from "@/lib/reports/schemas/dimensions";

export const DISCLAIMER: Record<Locale, string> = {
  de: "Alle Angaben sind modellbasierte Performance-Insights auf Basis selbstberichteter Daten. Kein Ersatz für medizinische Diagnostik. VO2max ist eine algorithmische Schätzung — keine Labormessung.",
  en: "All statements are model-based performance insights from self-reported data. Not a substitute for medical diagnostics. VO2max is an algorithmic estimate — not a lab measurement.",
  it: "Tutte le indicazioni sono insight di performance basati su modelli da dati auto-riportati. Non sostituiscono la diagnostica medica. Il VO2max è una stima algoritmica — non una misurazione di laboratorio.",
  tr: "Tüm ifadeler, kullanıcı tarafından bildirilen verilere dayalı model tabanlı performans içgörüleridir. Tıbbi teşhisin yerini almaz. VO2max algoritmik bir tahmindir — laboratuvar ölçümü değildir.",
};
