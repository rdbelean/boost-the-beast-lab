import { describe, expect, it } from "vitest";
import { WRITER_SYSTEM_PROMPT_DE } from "@/lib/report/prompts/v4/writer-system-de";
import { WRITER_SYSTEM_PROMPT_EN } from "@/lib/report/prompts/v4/writer-system-en";
import { WRITER_SYSTEM_PROMPT_IT } from "@/lib/report/prompts/v4/writer-system-it";
import { WRITER_SYSTEM_PROMPT_TR } from "@/lib/report/prompts/v4/writer-system-tr";

// Smoke-Tests for the C5 GOAL-DRIVEN STRUCTURE block in all 4 Stage-B
// writer system prompts. Verify that the citation-only block was replaced
// with structural directives (top_priority alignment, executive_summary
// first-sentence anchor, constraint → recovery-module, verbatim-date rule).

describe("Stage-B writer prompts — GOAL-DRIVEN STRUCTURE block", () => {
  it("DE: contains GOAL-DRIVEN STRUCTURE + top_priority + executive_summary + constraint rules", () => {
    expect(WRITER_SYSTEM_PROMPT_DE).toContain("GOAL-DRIVEN STRUCTURE");
    expect(WRITER_SYSTEM_PROMPT_DE).toContain("executive_summary erster Satz");
    expect(WRITER_SYSTEM_PROMPT_DE).toContain("top_priority MUSS");
    expect(WRITER_SYSTEM_PROMPT_DE).toContain("user_stated_goals.constraints");
    expect(WRITER_SYSTEM_PROMPT_DE).toContain("wörtlich");
    // Old "USER-ZIEL ZITIEREN" header must be gone
    expect(WRITER_SYSTEM_PROMPT_DE).not.toContain("USER-ZIEL ZITIEREN");
  });

  it("EN: contains GOAL-DRIVEN STRUCTURE + top_priority + executive_summary + constraint rules", () => {
    expect(WRITER_SYSTEM_PROMPT_EN).toContain("GOAL-DRIVEN STRUCTURE");
    expect(WRITER_SYSTEM_PROMPT_EN).toContain("executive_summary first sentence");
    expect(WRITER_SYSTEM_PROMPT_EN).toContain("top_priority MUST");
    expect(WRITER_SYSTEM_PROMPT_EN).toContain("user_stated_goals.constraints");
    expect(WRITER_SYSTEM_PROMPT_EN).toContain("verbatim");
    expect(WRITER_SYSTEM_PROMPT_EN).not.toContain("CITE THE USER'S GOAL");
  });

  it("IT: contains GOAL-DRIVEN STRUCTURE + top_priority + executive_summary + constraint rules", () => {
    expect(WRITER_SYSTEM_PROMPT_IT).toContain("GOAL-DRIVEN STRUCTURE");
    expect(WRITER_SYSTEM_PROMPT_IT).toContain("La prima frase di executive_summary");
    expect(WRITER_SYSTEM_PROMPT_IT).toContain("top_priority DEVE");
    expect(WRITER_SYSTEM_PROMPT_IT).toContain("user_stated_goals.constraints");
    expect(WRITER_SYSTEM_PROMPT_IT).toContain("testualmente");
    expect(WRITER_SYSTEM_PROMPT_IT).not.toContain("CITARE L'OBIETTIVO DELL'UTENTE");
  });

  it("TR: contains GOAL-DRIVEN STRUCTURE + top_priority + executive_summary + constraint rules", () => {
    expect(WRITER_SYSTEM_PROMPT_TR).toContain("GOAL-DRIVEN STRUCTURE");
    expect(WRITER_SYSTEM_PROMPT_TR).toContain("executive_summary'nin ilk cümlesi");
    expect(WRITER_SYSTEM_PROMPT_TR).toContain("HİZALI");
    expect(WRITER_SYSTEM_PROMPT_TR).toContain("user_stated_goals.constraints");
    expect(WRITER_SYSTEM_PROMPT_TR).toContain("aynen");
    expect(WRITER_SYSTEM_PROMPT_TR).not.toContain("KULLANICI HEDEFİNİ ALINTILA");
  });
});
