// Font loader for pdf-lib that swaps in Noto Sans KR when the target
// locale is Korean (the bundled StandardFonts.Helvetica has no CJK
// glyphs — Korean text would render as empty tofu boxes).
//
// Non-KR locales keep using the zero-cost standard fonts so there's no
// bundle-size hit for German/English/Italian reports.

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";
import type { Locale } from "@/lib/supabase/types";

export interface LocaleFonts {
  reg: PDFFont;
  bold: PDFFont;
}

/**
 * Embed the pair of fonts (regular + bold) that match the given locale.
 * For Korean, lazy-loads Noto Sans KR TTFs from disk and registers
 * fontkit on the document so pdf-lib can parse non-WinAnsi glyphs.
 * For every other locale, uses the built-in Helvetica pair (fastest path,
 * zero I/O).
 */
export async function embedLocaleFonts(
  doc: PDFDocument,
  locale: Locale,
): Promise<LocaleFonts> {
  if (locale === "ko") {
    // Dynamic import keeps fontkit out of the critical path for non-KR
    // requests. On Vercel cold-start this saves ~30 ms and avoids the
    // extra bundle weight for flows that never call it.
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    doc.registerFontkit(fontkit);

    const fontsDir = path.join(process.cwd(), "lib", "pdf", "fonts");
    const [regBytes, boldBytes] = await Promise.all([
      readFile(path.join(fontsDir, "NotoSansKR-Regular.ttf")),
      readFile(path.join(fontsDir, "NotoSansKR-Bold.ttf")),
    ]);

    const [reg, bold] = await Promise.all([
      doc.embedFont(regBytes, { subset: true }),
      doc.embedFont(boldBytes, { subset: true }),
    ]);
    return { reg, bold };
  }

  // Helvetica covers German/English/Italian (Latin-extended is built in).
  const [reg, bold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  return { reg, bold };
}
