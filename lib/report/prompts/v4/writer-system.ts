// Stage-B Writer system-prompt selector. Each locale carries its own
// monolithic prompt — the Phase-1 language-leak bug is structurally
// impossible when the prompts never share a builder.

import type { Locale } from "@/lib/reports/schemas/dimensions";
import { WRITER_SYSTEM_PROMPT_DE } from "./writer-system-de";
import { WRITER_SYSTEM_PROMPT_EN } from "./writer-system-en";
import { WRITER_SYSTEM_PROMPT_IT } from "./writer-system-it";
import { WRITER_SYSTEM_PROMPT_TR } from "./writer-system-tr";

export function getWriterSystemPrompt(locale: Locale): string {
  switch (locale) {
    case "de":
      return WRITER_SYSTEM_PROMPT_DE;
    case "en":
      return WRITER_SYSTEM_PROMPT_EN;
    case "it":
      return WRITER_SYSTEM_PROMPT_IT;
    case "tr":
      return WRITER_SYSTEM_PROMPT_TR;
  }
}
