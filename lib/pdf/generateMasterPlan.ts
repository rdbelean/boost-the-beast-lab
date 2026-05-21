// Master-plan PDF generator. Hard 2-page limit: cover + intro/table on page 2.
// Overflow detection returns a marker so the caller's retry loop can re-prompt.

import { PDFDocument, rgb, degrees, type PDFPage, type PDFFont, type Color } from "pdf-lib";
import { embedLocaleFonts } from "./fonts";
import { LOGO_WHITE_PNG_BASE64 } from "./logo";
import type { MasterPlan } from "@/lib/master-plan/schema";

export interface MasterPlanPdfInput {
  plan: MasterPlan;
  locale?: string;
  /** Adds diagonal "BEISPIEL"/"SAMPLE" watermark on every page. Used by
   *  the sample-report download API; production users never get this. */
  isSample?: boolean;
  /** 0-indexed weekday rows to soft-censor (Mon=0 … Sun=6). Sample-teaser
   *  only; production omits this → empty → no censoring. */
  censorDays?: number[];
}

export interface MasterPlanPdfResult {
  bytes: Uint8Array;
  overflowed: boolean;
}

const PW = 595.28;
const PH = 841.89;
const MX = 42;
const CW = PW - MX * 2;

const BG_PAGE = rgb(0.176, 0.176, 0.188);
const BG_CARD = rgb(0.22, 0.22, 0.235);
const BG_INSET = rgb(0.133, 0.133, 0.145);
const TXT_WHITE = rgb(0.933, 0.929, 0.922);
const TXT_MUTED = rgb(0.54, 0.533, 0.521);
const BORDER_C = rgb(0.267, 0.267, 0.29);
// Fill color for soft-censor word blocks (sample teaser). Mid-gray so it
// reads as "text is here" against the dark row backgrounds.
const CENSOR_BLOCK = rgb(0.42, 0.42, 0.45);

const ACCENT_HEX = "#E63222";
function hexToRgb(hex: string): Color {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

const HEADERS: Record<string, { day: string; training: string; nutrition: string; recovery: string; stress: string; intro: string; cover_subtitle: string; cover_score_label: string }> = {
  de: {
    day: "TAG",
    training: "TRAINING",
    nutrition: "ERNÄHRUNG",
    recovery: "RECOVERY",
    stress: "STRESS-ANKER",
    intro: "DEINE STRATEGIE FÜR DIESE WOCHE",
    cover_subtitle: "Personalisiert für dich, zugeschnitten auf deine Ziele",
    cover_score_label: "OVERALL SCORE",
  },
  en: {
    day: "DAY",
    training: "TRAINING",
    nutrition: "NUTRITION",
    recovery: "RECOVERY",
    stress: "STRESS ANCHOR",
    intro: "YOUR STRATEGY FOR THIS WEEK",
    cover_subtitle: "Personalised for you, tailored to your goals",
    cover_score_label: "OVERALL SCORE",
  },
  it: {
    day: "GIORNO",
    training: "ALLENAMENTO",
    nutrition: "NUTRIZIONE",
    recovery: "RECUPERO",
    stress: "ANCORA ANTI-STRESS",
    intro: "LA TUA STRATEGIA PER QUESTA SETTIMANA",
    cover_subtitle: "Personalizzato per te, su misura per i tuoi obiettivi",
    cover_score_label: "OVERALL SCORE",
  },
  tr: {
    day: "GÜN",
    training: "ANTRENMAN",
    nutrition: "BESLENME",
    recovery: "İYİLEŞME",
    stress: "STRES ÇAPASI",
    intro: "BU HAFTAKİ STRATEJİN",
    cover_subtitle: "Sana özel, hedeflerine göre uyarlandı",
    cover_score_label: "OVERALL SCORE",
  },
};

const DAY_LABELS: Record<string, Record<string, string>> = {
  de: { mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa", sun: "So" },
  en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  it: { mon: "Lun", tue: "Mar", wed: "Mer", thu: "Gio", fri: "Ven", sat: "Sab", sun: "Dom" },
  tr: { mon: "Pzt", tue: "Sal", wed: "Çar", thu: "Per", fri: "Cum", sat: "Cmt", sun: "Paz" },
};

// Canonical weekday order for 0-indexed censorDays mapping (Mon=0 … Sun=6).
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function tx(s: string | undefined | null): string {
  const normalized = String(s ?? "")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↑/g, "^")
    .replace(/↓/g, "v")
    .replace(/ /g, " ");
  return normalized;
}

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const t = tx(text);
  if (!t) return [];
  const lines: string[] = [];
  for (const para of t.split("\n")) {
    const words = para.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      const widCandidate = font.widthOfTextAtSize(candidate, size);
      if (widCandidate <= maxW) {
        cur = candidate;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

function textH(text: string, font: PDFFont, size: number, maxW: number, lhMul = 1.4): number {
  return wrapLines(text, font, size, maxW).length * size * lhMul;
}

function drawW(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxW: number,
  font: PDFFont,
  size: number,
  color: Color,
  lhMul = 1.4,
): number {
  const lines = wrapLines(text, font, size, maxW);
  let curY = y;
  for (const ln of lines) {
    page.drawText(ln, { x, y: curY, size, font, color });
    curY -= size * lhMul;
  }
  return curY;
}

// Soft-censor renderer (sample teaser only). Same signature + wrapping as
// drawW so row heights from measureTable stay valid, but each word is drawn
// as a filled block rectangle (word width preserved) instead of legible
// text. Bullets stay visible, word gaps stay visible → "redacted" look.
// Note: a literal U+2593 (▓) block char is NOT used because de/en/it render
// with Helvetica/WinAnsi, which cannot encode it.
function drawMasked(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxW: number,
  font: PDFFont,
  size: number,
  color: Color,
  lhMul = 1.4,
): number {
  const lines = wrapLines(text, font, size, maxW);
  const spaceW = font.widthOfTextAtSize(" ", size);
  let curY = y;
  for (const ln of lines) {
    let tokX = x;
    for (const tok of ln.split(" ")) {
      if (!tok) {
        tokX += spaceW;
        continue;
      }
      const w = font.widthOfTextAtSize(tok, size);
      if (tok === "•") {
        // Keep bullets readable so the list structure shows through.
        page.drawText(tok, { x: tokX, y: curY, size, font, color });
      } else {
        page.drawRectangle({ x: tokX, y: curY - size * 0.12, width: w, height: size * 0.72, color: CENSOR_BLOCK });
      }
      tokX += w + spaceW;
    }
    curY -= size * lhMul;
  }
  return curY;
}

interface Fonts {
  reg: PDFFont;
  bold: PDFFont;
}

function urgencyInfo(score: number): { text: string; color: Color } {
  if (score <= 30) return { text: "KRITISCH", color: rgb(0.863, 0.149, 0.149) };
  if (score <= 50) return { text: "HANDLUNGSBEDARF", color: rgb(0.706, 0.325, 0.035) };
  if (score <= 70) return { text: "OPTIMIERUNG", color: rgb(0.631, 0.631, 0.667) };
  if (score <= 85) return { text: "FEINTUNING", color: rgb(0.302, 0.486, 0.059) };
  return { text: "TOP-LEVEL", color: rgb(0.082, 0.502, 0.239) };
}

async function drawCover(
  doc: PDFDocument,
  page: PDFPage,
  plan: MasterPlan,
  f: Fonts,
  accent: Color,
  _locale: string,
): Promise<void> {
  page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: BG_PAGE });

  // Logo
  try {
    const logoBytes = Buffer.from(LOGO_WHITE_PNG_BASE64, "base64");
    const logo = await doc.embedPng(logoBytes);
    const logoH = 30;
    const logoW = (logo.width / logo.height) * logoH;
    page.drawImage(logo, { x: MX, y: PH - 80, width: logoW, height: logoH });
  } catch {
    /* swallow logo failures */
  }

  // Brand bar
  page.drawText("MASTER WEEKLY PLAN · BOOST THE BEAST LAB", {
    x: MX,
    y: PH - 105,
    size: 8,
    font: f.bold,
    color: TXT_MUTED,
  });

  // Title
  let y = PH - 200;
  page.drawText(tx(plan.title), { x: MX, y, size: 36, font: f.bold, color: TXT_WHITE });
  y -= 50;

  // Accent rule
  page.drawRectangle({ x: MX, y: y + 10, width: 60, height: 3, color: accent });

  // Score + urgency pill
  if (plan.score != null) {
    y -= 32;
    const scoreStr = `${plan.score}/100`;
    page.drawText(scoreStr, { x: MX, y, size: 18, font: f.bold, color: accent });
    const scoreW = f.bold.widthOfTextAtSize(scoreStr, 18);

    const u = urgencyInfo(plan.score);
    const pillTxt = u.text;
    const pillW = f.bold.widthOfTextAtSize(pillTxt, 7) + 18;
    const pillX = MX + scoreW + 12;
    page.drawRectangle({ x: pillX, y: y - 4, width: pillW, height: 18, color: BG_INSET });
    page.drawRectangle({ x: pillX, y: y + 13, width: pillW, height: 2, color: u.color });
    page.drawText(pillTxt, { x: pillX + 9, y: y + 2, size: 6.5, font: f.bold, color: u.color });
    y -= 26;
  }

  y -= 4;
  drawW(page, tx(plan.subtitle), MX, y, CW * 0.72, f.reg, 10.5, TXT_MUTED, 1.4);

  // Footer
  const fy = 50;
  page.drawLine({ start: { x: MX, y: fy + 16 }, end: { x: PW - MX, y: fy + 16 }, thickness: 0.5, color: BORDER_C });
  page.drawText(new Date().toLocaleDateString("de-DE"), { x: MX, y: fy, size: 7, font: f.reg, color: TXT_MUTED });
  page.drawText("BOOST THE BEAST LAB · PERFORMANCE LAB", { x: MX, y: fy - 12, size: 6, font: f.reg, color: TXT_MUTED });
}

interface TableMetrics {
  rowHeights: number[];
  tableHeight: number;
}

function measureTable(
  plan: MasterPlan,
  f: Fonts,
  colW: { day: number; training: number; nutrition: number; recovery: number; stress: number },
): TableMetrics {
  const padX = 5;
  const padY = 4;
  const headerH = 22;
  const minRowH = 56;
  const bodySize = 7.5;
  const lhMul = 1.35;

  const rowHeights = plan.rows.map((row) => {
    const trainingH = row.training.reduce(
      (acc, item) => acc + textH(`• ${item}`, f.reg, bodySize, colW.training - padX * 2, lhMul),
      0,
    );
    const nutritionH = row.nutrition.reduce(
      (acc, item) => acc + textH(`• ${item}`, f.reg, bodySize, colW.nutrition - padX * 2, lhMul),
      0,
    );
    const recoveryH = row.recovery.reduce(
      (acc, item) => acc + textH(`• ${item}`, f.reg, bodySize, colW.recovery - padX * 2, lhMul),
      0,
    );
    const stressH = row.stress_anchor.reduce(
      (acc, item) => acc + textH(`• ${item}`, f.reg, bodySize, colW.stress - padX * 2, lhMul),
      0,
    );
    const contentH = Math.max(trainingH, nutritionH, recoveryH, stressH);
    return Math.max(minRowH, contentH + padY * 2);
  });

  const tableHeight = headerH + rowHeights.reduce((a, b) => a + b, 0);
  return { rowHeights, tableHeight };
}

function drawContentPage(
  page: PDFPage,
  plan: MasterPlan,
  f: Fonts,
  accent: Color,
  locale: string,
  censorDays: number[],
): boolean {
  page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: BG_PAGE });

  const H = HEADERS[locale] ?? HEADERS.de;
  const dayLabels = DAY_LABELS[locale] ?? DAY_LABELS.de;

  // Brand header
  page.drawText("MASTER WEEKLY PLAN · BOOST THE BEAST LAB", {
    x: MX,
    y: PH - 50,
    size: 7,
    font: f.bold,
    color: TXT_MUTED,
  });

  let y = PH - 80;

  // Intro section
  page.drawText(tx(H.intro), { x: MX, y, size: 10, font: f.bold, color: accent });
  page.drawLine({ start: { x: MX, y: y - 5 }, end: { x: PW - MX, y: y - 5 }, thickness: 0.5, color: BORDER_C });
  y -= 16;

  y = drawW(page, tx(plan.intro), MX, y, CW, f.reg, 8.5, TXT_WHITE, 1.5);
  y -= 16;

  // Table
  const colW = {
    day: CW * 0.08,
    training: CW * 0.27,
    nutrition: CW * 0.23,
    recovery: CW * 0.22,
    stress: CW * 0.2,
  };

  const tableTop = y;
  const metrics = measureTable(plan, f, colW);
  const bottomMargin = 36; // footer reserve
  const availableForTable = tableTop - bottomMargin;

  if (metrics.tableHeight > availableForTable) {
    return true; // overflow signal
  }

  // Header row
  const headerH = 22;
  page.drawRectangle({ x: MX, y: y - headerH, width: CW, height: headerH, color: BG_INSET });
  let cx = MX;
  const padX = 5;
  const drawHeaderCell = (label: string, w: number) => {
    page.drawText(tx(label), { x: cx + padX, y: y - 14, size: 7, font: f.bold, color: accent });
    cx += w;
  };
  drawHeaderCell(H.day, colW.day);
  drawHeaderCell(H.training, colW.training);
  drawHeaderCell(H.nutrition, colW.nutrition);
  drawHeaderCell(H.recovery, colW.recovery);
  drawHeaderCell(H.stress, colW.stress);
  y -= headerH;

  // Body rows
  const bodySize = 7.5;
  const lhMul = 1.35;
  const padY = 4;
  for (let ri = 0; ri < plan.rows.length; ri++) {
    const row = plan.rows[ri];
    const rowH = metrics.rowHeights[ri];
    const rowBg = ri % 2 === 0 ? BG_CARD : BG_PAGE;

    page.drawRectangle({ x: MX, y: y - rowH, width: CW, height: rowH, color: rowBg });

    cx = MX;
    const cellTopY = y - padY - bodySize;
    const dayText = dayLabels[row.day] ?? row.day.toUpperCase();

    // Soft-censor (sample teaser): day label stays visible; content cells
    // are rendered as per-word block masks instead of legible text.
    // censorDays is empty for production → drawCell === drawW → no-op.
    const censored = censorDays.includes(DAY_ORDER.indexOf(row.day as typeof DAY_ORDER[number]));
    const drawCell = censored ? drawMasked : drawW;

    // Day cell
    page.drawText(tx(dayText), { x: cx + padX, y: cellTopY, size: 8, font: f.bold, color: accent });
    cx += colW.day;

    // Training cell
    let cellY = cellTopY;
    for (const item of row.training) {
      cellY = drawCell(page, `• ${tx(item)}`, cx + padX, cellY, colW.training - padX * 2, f.reg, bodySize, TXT_WHITE, lhMul);
    }
    cx += colW.training;

    // Nutrition cell
    cellY = cellTopY;
    for (const item of row.nutrition) {
      cellY = drawCell(page, `• ${tx(item)}`, cx + padX, cellY, colW.nutrition - padX * 2, f.reg, bodySize, TXT_WHITE, lhMul);
    }
    cx += colW.nutrition;

    // Recovery cell
    cellY = cellTopY;
    for (const item of row.recovery) {
      cellY = drawCell(page, `• ${tx(item)}`, cx + padX, cellY, colW.recovery - padX * 2, f.reg, bodySize, TXT_WHITE, lhMul);
    }
    cx += colW.recovery;

    // Stress cell
    cellY = cellTopY;
    for (const item of row.stress_anchor) {
      cellY = drawCell(page, `• ${tx(item)}`, cx + padX, cellY, colW.stress - padX * 2, f.reg, bodySize, TXT_WHITE, lhMul);
    }

    // Column separators
    let sepX = MX + colW.day;
    for (const w of [colW.training, colW.nutrition, colW.recovery]) {
      page.drawLine({ start: { x: sepX, y: y - rowH }, end: { x: sepX, y }, thickness: 0.3, color: BORDER_C });
      sepX += w;
    }

    y -= rowH;
  }

  // Footer
  const fy = 24;
  page.drawText("BOOST THE BEAST LAB · MASTER WEEKLY PLAN", { x: MX, y: fy, size: 6, font: f.reg, color: TXT_MUTED });

  return false;
}

const SAMPLE_WATERMARK: Record<string, string> = {
  de: "BEISPIEL",
  en: "SAMPLE",
  it: "ESEMPIO",
  tr: "ÖRNEK",
};

export async function generateMasterPlanPDF(input: MasterPlanPdfInput): Promise<MasterPlanPdfResult> {
  const locale = input.locale ?? "de";
  const accent = hexToRgb(input.plan.color || ACCENT_HEX);

  const doc = await PDFDocument.create();
  const f = await embedLocaleFonts(doc, locale as "de" | "en" | "it" | "tr");

  // Page 1: Cover
  const coverPage = doc.addPage([PW, PH]);
  await drawCover(doc, coverPage, input.plan, f, accent, locale);

  // Page 2: Intro + table (HARD: no page 3 ever)
  const contentPage = doc.addPage([PW, PH]);
  const overflowed = drawContentPage(contentPage, input.plan, f, accent, locale, input.censorDays ?? []);

  // Sample watermark — diagonal "BEISPIEL" on every page, very low
  // opacity so it doesn't interfere with the actual content. Mirrors the
  // pattern from generatePlan.ts and generateReport.ts.
  if (input.isSample) {
    const text = SAMPLE_WATERMARK[locale] ?? "BEISPIEL";
    const size = 96;
    const tw = f.bold.widthOfTextAtSize(text, size);
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 2 - tw / 2,
        y: height / 2 - size / 2,
        size,
        font: f.bold,
        color: rgb(1, 1, 1),
        opacity: 0.07,
        rotate: degrees(45),
      });
    }
  }

  const bytes = await doc.save();
  return { bytes, overflowed };
}
