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

const REQUIRED_KEYS = [
  "version_label",
  "heading",
  "body",
  "hint",
  "button_yes",
  "button_no",
  "error_save_failed",
] as const;

// Marker strings unique to each locale's verbatim body text — anchors the
// translation to the DSGVO-spec wording so future edits to the JSON have to
// pass through here (and through a fresh v1.1 consent_text_versions row).
const BODY_MARKER: Record<Locale, RegExp> = {
  de: /ausdrücklich ein/,
  en: /expressly consent/i,
  it: /espressamente/,
  tr: /açıkça onay/,
};

function getConsentModal(msgs: unknown): Record<string, string> | undefined {
  return (msgs as { consent_modal?: Record<string, string> }).consent_modal;
}

describe("consent_modal i18n parity", () => {
  for (const [name, msgs] of Object.entries(LOCALES) as [Locale, unknown][]) {
    it(`${name}: consent_modal block exists and has all required keys non-empty`, () => {
      const block = getConsentModal(msgs);
      expect(block).toBeDefined();
      for (const key of REQUIRED_KEYS) {
        const v = block?.[key];
        expect(typeof v).toBe("string");
        expect((v as string).trim().length).toBeGreaterThan(0);
      }
    });

    it(`${name}: body contains the locale-specific DSGVO-marker phrase`, () => {
      const body = getConsentModal(msgs)?.body;
      expect(body).toMatch(BODY_MARKER[name]);
    });

    it(`${name}: body + hint contain NO em-dash (—) or en-dash (–)`, () => {
      // DSGVO consent text must be Dash-free per spec (consistent with hero copy).
      const block = getConsentModal(msgs);
      const body = block?.body ?? "";
      const hint = block?.hint ?? "";
      expect(body).not.toMatch(/[—–]/);
      expect(hint).not.toMatch(/[—–]/);
    });

    it(`${name}: body contains <privacy_link>...</privacy_link> rich-text tag`, () => {
      const body = getConsentModal(msgs)?.body ?? "";
      expect(body).toMatch(/<privacy_link>[^<]+<\/privacy_link>/);
    });
  }

  it("version_label is identical across all 4 locales (DSGVO Nachweispflicht — same version, same text)", () => {
    // If you change a body string in any locale, you MUST bump version_label
    // in ALL locales AND add a new row to consent_text_versions (with the old
    // row's is_active flipped to false).
    const versions = (Object.entries(LOCALES) as [Locale, unknown][]).map(
      ([, msgs]) => getConsentModal(msgs)?.version_label,
    );
    const unique = new Set(versions);
    expect(unique.size).toBe(1);
    expect([...unique][0]).toBe("v1.0");
  });
});
