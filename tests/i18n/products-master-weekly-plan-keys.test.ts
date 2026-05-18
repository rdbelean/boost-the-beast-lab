import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import itLocale from "@/messages/it.json";
import tr from "@/messages/tr.json";

type Locale = "de" | "en" | "it" | "tr";

const LOCALES: Record<Locale, unknown> = {
  de,
  en,
  it: itLocale,
  tr,
};

const MARKER: Record<Locale, RegExp> = {
  de: /Master-Wochenplan/,
  en: /master weekly plan/i,
  it: /Master Weekly Plan/,
  tr: /Master Haftalık Plan/,
};

function getFeatureKey(msgs: unknown): string | undefined {
  return (
    msgs as { products?: { features?: { master_weekly_plan?: string } } }
  ).products?.features?.master_weekly_plan;
}

function getCardQuestion(msgs: unknown): string | undefined {
  return (msgs as { products?: { card_question?: string } }).products
    ?.card_question;
}

function getKaufenSubtitle(msgs: unknown): string | undefined {
  return (msgs as { kaufen?: { subtitle?: string } }).kaufen?.subtitle;
}

describe("products.master_weekly_plan i18n parity", () => {
  for (const [name, msgs] of Object.entries(LOCALES) as [Locale, unknown][]) {
    it(`${name}: products.features.master_weekly_plan is present and non-empty`, () => {
      const value = getFeatureKey(msgs);
      expect(typeof value).toBe("string");
      expect((value as string).trim().length).toBeGreaterThan(0);
    });

    it(`${name}: products.card_question contains the master-weekly-plan marker`, () => {
      const value = getCardQuestion(msgs);
      expect(typeof value).toBe("string");
      expect(value).toMatch(MARKER[name]);
    });

    it(`${name}: kaufen.subtitle contains the master-weekly-plan marker`, () => {
      const value = getKaufenSubtitle(msgs);
      expect(typeof value).toBe("string");
      expect(value).toMatch(MARKER[name]);
    });

    it(`${name}: products.card_question equals kaufen.subtitle (drift detector)`, () => {
      // Drift-Detector — currently both keys are intentionally identical
      // because the landing card and the checkout card show the same
      // headline copy. If the checkout subtitle later diverges for
      // conversion-optimization reasons, update this assertion (or split
      // it into per-key marker checks only).
      expect(getCardQuestion(msgs)).toBe(getKaufenSubtitle(msgs));
    });
  }
});
