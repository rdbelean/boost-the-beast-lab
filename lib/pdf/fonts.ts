// Font loader for pdf-lib.
//
// Standard14 Helvetica uses WinAnsi (CP1252) which covers DE/EN/IT but
// NOT the Turkish characters ğ, ı, ş, İ, Ğ, Ş — those live in Latin
// Extended-A. For TR we lazy-load Noto Sans (Regular + Bold) TTFs and
// register fontkit on the document so pdf-lib can subset Latin-Ext-A
// glyphs. DE/EN/IT stay on zero-I/O Standard14 fonts.
//
// Vercel bundling: see next.config.ts → outputFileTracingIncludes.
// The TTFs are only loaded on TR requests, and pdf-lib's `subset: true`
// strips down to used-only glyphs → final PDF only grows ~30-50 KB.

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
 * For Turkish, embeds Noto Sans TTFs (Latin Extended-A).
 * For every other locale, uses Standard14 Helvetica (zero I/O).
 */
export async function embedLocaleFonts(
  doc: PDFDocument,
  locale: Locale,
): Promise<LocaleFonts> {
  if (locale === "tr") {
    // Dynamic import keeps fontkit out of the critical path for non-TR
    // requests. Saves ~30 ms on every DE/EN/IT cold-start.
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    doc.registerFontkit(fontkit);

    const fontsDir = path.join(process.cwd(), "lib", "pdf", "fonts");
    const [regBytes, boldBytes] = await Promise.all([
      readFile(path.join(fontsDir, "NotoSans-Regular.ttf")),
      readFile(path.join(fontsDir, "NotoSans-Bold.ttf")),
    ]);

    const [reg, bold] = await Promise.all([
      doc.embedFont(regBytes, { subset: true }),
      doc.embedFont(boldBytes, { subset: true }),
    ]);
    return { reg, bold };
  }

  // Helvetica covers German/English/Italian (WinAnsi is built in).
  const [reg, bold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  return { reg, bold };
}
