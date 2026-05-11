import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import itLocale from "@/messages/it.json";
import tr from "@/messages/tr.json";

describe("analyse.q.nutrition_painpoint.undereating translations", () => {
  const locales: Record<string, unknown> = {
    de,
    en,
    it: itLocale,
    tr,
  };

  for (const [name, msgs] of Object.entries(locales)) {
    it(`${name}: undereating label is present and non-empty`, () => {
      const value = (
        msgs as { analyse?: { q?: { nutrition_painpoint?: { undereating?: unknown } } } }
      ).analyse?.q?.nutrition_painpoint?.undereating;
      expect(typeof value).toBe("string");
      expect((value as string).trim().length).toBeGreaterThan(10);
    });
  }
});
