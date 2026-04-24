// Assistant-response-prefix trick: by pre-seeding the assistant turn with
// the opening of the JSON response INCLUDING the block-1 heading in the
// target locale, Claude is hard-anchored into continuing in that language.
// The prefix is prepended back to the model output before JSON.parse.
//
// Heading values match the ones already declared in the languageInstruction
// inside app/api/plan/generate/route.ts, so the directive, the prefix, and
// the eventual Claude response all agree on identical strings.

type Locale = "de" | "en" | "it" | "tr";

function normalize(locale: string | undefined): Locale {
  if (locale === "en" || locale === "it" || locale === "tr") return locale;
  return "de";
}

const BLOCK_1_HEADING: Record<Locale, string> = {
  de: "Deine Ausgangslage",
  en: "Your Starting Point",
  it: "La Tua Situazione Attuale",
  tr: "Mevcut Durumun",
};

export function getResponsePrefix(locale: string | undefined): string {
  const heading = BLOCK_1_HEADING[normalize(locale)];
  return `{\n  "blocks": [\n    {\n      "heading": "${heading}",\n      "items": [\n        "`;
}
