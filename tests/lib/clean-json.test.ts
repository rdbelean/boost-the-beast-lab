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
});
