// Stage-B Writer user-prompt builder.
//
// Injects two JSON blocks: a slim ReportContext view and the full
// AnalysisJSON. Locale-aware header so the model gets a clear "produce
// output in this language" cue at the very top of the user message —
// reinforces the locale-monolithic system prompt.
//
// Phase 5h: ctx-slim. Drop fields that AnalysisJSON already covers:
//   - scoring.drivers (AnalysisJSON.modules.*.key_drivers has equivalent)
//   - scoring.priority_order (AnalysisJSON.top_priority_evidence + meta)
//   - wearable.provenance (heavy; not needed for prose anchoring)
//   - user.email (not relevant to prose)
// JSON.stringify also moves to compact form.

import type { ReportContext } from "@/lib/reports/report-context";
import type { AnalysisJSON } from "@/lib/reports/schemas/report-analysis";
import type { Locale } from "@/lib/reports/schemas/dimensions";

const HEADERS: Record<Locale, { intro: string; tail: string }> = {
  de: {
    intro:
      "Hier sind die Daten für genau einen Assessment-Report. Nutze ausschließlich die enthaltenen Werte.",
    tail: "Erzeuge jetzt den ReportJSON. Antworte nur mit dem JSON-Objekt — keine Markdown-Fences, kein Kommentar.",
  },
  en: {
    intro:
      "Here is the data for exactly one assessment report. Use only the values contained in it.",
    tail: "Produce the ReportJSON now. Respond with only the JSON object — no markdown fences, no commentary.",
  },
  it: {
    intro:
      "Ecco i dati per esattamente un report di assessment. Usa solo i valori contenuti.",
    tail: "Produci ora il ReportJSON. Rispondi solo con l'oggetto JSON — niente markdown fences, niente commenti.",
  },
  tr: {
    intro:
      "İşte tek bir assessment raporu için veriler. Yalnızca burada bulunan değerleri kullan.",
    tail: "ReportJSON'ı şimdi üret. Yalnızca JSON nesnesiyle yanıtla — markdown fence yok, yorum yok.",
  },
};

export function buildWriterUserPrompt(
  ctx: ReportContext,
  analysis: AnalysisJSON,
): string {
  const locale = ctx.meta.locale;
  const header = HEADERS[locale] ?? HEADERS.en;

  const slimCtx = {
    meta: ctx.meta,
    user: {
      age: ctx.user.age,
      gender: ctx.user.gender,
      height_cm: ctx.user.height_cm,
      weight_kg: ctx.user.weight_kg,
    },
    raw: ctx.raw,
    personalization: ctx.personalization,
    scoring: {
      result: ctx.scoring.result,
    },
    wearable: {
      available: ctx.wearable.available,
      sources: ctx.wearable.sources,
      days_covered: ctx.wearable.days_covered,
    },
    data_quality: ctx.data_quality,
    flags: ctx.flags,
  };

  return [
    header.intro,
    "",
    "## ReportContext",
    JSON.stringify(slimCtx),
    "",
    "## AnalysisJSON (Stage-A Anchors)",
    JSON.stringify(analysis),
    "",
    header.tail,
  ].join("\n");
}
