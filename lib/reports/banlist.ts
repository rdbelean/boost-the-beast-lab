// Locale-specific banned-phrase regex list.
//
// These patterns target the canonical "wellness floskel" patterns that
// signal the report has fallen back to template prose rather than
// citing user-specific evidence. The deterministic Stage-C validator
// scans every section for these — Headline / Executive Summary / Daily
// Protocol hits trigger an automatic repair pass, module sections get
// one-strike tolerance for false positives (e.g. study-title quotes).

import type { Locale } from "./schemas/dimensions";

export const BANLIST: Record<Locale, RegExp[]> = {
  de: [
    /es\s+ist\s+wichtig,?\s+dass/i,
    /du\s+solltest\s+versuchen/i,
    /es\s+kann\s+hilfreich\s+sein/i,
    /achte\s+darauf,?\s+dass/i,
    /vergiss\s+nicht/i,
    /denk\s+daran/i,
    /ein\s+gesunder\s+lebensstil/i,
    /balance\s+ist\s+der\s+schl(ü|ue)ssel/i,
    /h(ö|oe)r[e]?\s+auf\s+deinen\s+k(ö|oe)rper/i,
    /alles\s+in\s+ma(ß|ss)en/i,
    /genug\s+schlaf\s+und\s+bewegung/i,
    /eine\s+ausgewogene\s+ern(ä|ae)hrung/i,
  ],
  en: [
    /it\s+is\s+important\s+that/i,
    /you\s+should\s+try\s+to/i,
    /it\s+may\s+be\s+helpful/i,
    /make\s+sure\s+to/i,
    /don'?t\s+forget/i,
    /listen\s+to\s+your\s+body/i,
    /everything\s+in\s+moderation/i,
    /a\s+healthy\s+lifestyle/i,
    /find\s+the\s+right\s+balance/i,
    /a\s+balanced\s+diet/i,
    /enough\s+sleep\s+and\s+exercise/i,
  ],
  it: [
    /è\s+importante\s+che/i,
    /dovresti\s+cercare\s+di/i,
    /potrebbe\s+essere\s+utile/i,
    /ricordati\s+di/i,
    /uno\s+stile\s+di\s+vita\s+sano/i,
    /ascolta\s+il\s+tuo\s+corpo/i,
    /una\s+dieta\s+equilibrata/i,
    /tutto\s+con\s+moderazione/i,
  ],
  tr: [
    /unutma\s+ki/i,
    /dikkat\s+etmelisin/i,
    /yapmaya\s+çalışmalısın/i,
    /yardımcı\s+olabilir/i,
    /vücudunu\s+dinle/i,
    /sağlıklı\s+bir\s+yaşam\s+tarzı/i,
    /dengeli\s+bir\s+beslenme/i,
  ],
};

/** Sections that have zero tolerance for banlist hits. */
export const STRICT_SECTIONS = new Set<string>([
  "headline",
  "executive_summary",
  "top_priority",
  "prognose_30_days",
  "daily_life_protocol",
]);

/** Sections that tolerate a single banlist hit (likely false positive). */
export const TOLERANT_HIT_LIMIT = 1;

export interface BanlistHit {
  section: string;
  phrase: string;
  pattern: string;
}

export function scanBanlist(
  section: string,
  text: string,
  locale: Locale,
): BanlistHit[] {
  const hits: BanlistHit[] = [];
  const patterns = BANLIST[locale] ?? BANLIST.en;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      hits.push({ section, phrase: match[0], pattern: pattern.source });
    }
  }
  return hits;
}
