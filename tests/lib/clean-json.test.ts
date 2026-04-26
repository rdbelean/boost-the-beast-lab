import { describe, expect, it } from "vitest";
import { cleanJsonText } from "@/lib/reports/pipeline";

describe("cleanJsonText — fence/preamble stripping", () => {
  it("returns plain JSON unchanged", () => {
    expect(cleanJsonText('{"a":1}')).toBe('{"a":1}');
  });

  it("strips ```json … ``` fences", () => {
    expect(cleanJsonText('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips bare ``` fences", () => {
    expect(cleanJsonText('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips a prose preamble before the first {", () => {
    expect(cleanJsonText('Here you go:\n{"a":1}')).toBe('{"a":1}');
  });

  it("strips a prose tail after the last }", () => {
    expect(cleanJsonText('Here:\n{"a":1}\nHope it helps.')).toBe('{"a":1}');
  });

  it("handles empty input", () => {
    expect(cleanJsonText("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanJsonText('   {"a":1}   ')).toBe('{"a":1}');
  });

  // Phase 5e: brace-balance defense — when a response is truncated mid-JSON,
  // returning the original (unbalanced) text lets JSON.parse fail with a
  // clear error. The previous implementation would have sliced from the
  // first '{' to an INNER '}' and produced a deceptively-shaped slice.

  it("returns the original text when braces are unbalanced (truncated mid-array)", () => {
    const truncated = '{"a":1,"b":[1,2,';
    // Should NOT slice into something that looks valid; should be passed
    // through so JSON.parse fails with a recognisable end-of-input error.
    const out = cleanJsonText(truncated);
    expect(out).toBe(truncated);
    expect(() => JSON.parse(out)).toThrow();
  });

  it("returns the original text when truncation leaves an inner '}' as the last brace", () => {
    // This is the actual production failure mode: the model started a
    // multi-block response and got cut off after the first block's
    // closing '}'. Without balance-check, lastIndexOf('}') would slice
    // up to that inner brace and produce '{"blocks":[{...}' — invalid.
    const truncated = '{"blocks":[{"heading":"X","items":["a"]},{"heading":"Y",';
    const out = cleanJsonText(truncated);
    expect(out).toBe(truncated);
    expect(() => JSON.parse(out)).toThrow();
  });

  it("braces inside JSON strings do not confuse the balance check", () => {
    const valid = '{"text":"he said {hello} to the world"}';
    expect(cleanJsonText(valid)).toBe(valid);
    // Sanity: it really is parseable.
    expect(JSON.parse(valid)).toEqual({ text: "he said {hello} to the world" });
  });

  it("escaped quotes do not break the balance check", () => {
    const valid = '{"text":"she said \\"hi\\""}';
    expect(cleanJsonText(valid)).toBe(valid);
    expect(JSON.parse(valid)).toEqual({ text: 'she said "hi"' });
  });
});
