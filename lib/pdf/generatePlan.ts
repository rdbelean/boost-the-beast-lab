// Server-side plan PDF generation via pdf-lib.
// Pure JavaScript — zero native dependencies, works reliably on Vercel.
// Dark warm-grey theme matching the main Performance Intelligence Report.

import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont, type Color } from "pdf-lib";

export interface PlanBlock { heading: string; items: string[] }
export interface PlanPdfInput {
  title: string;
  subtitle: string;
  source: string;
  color: string;
  blocks: PlanBlock[];
}

// ── Page dimensions ────────────────────────────────────────────────────────

const PW = 595.28;
const PH = 841.89;
const MX = 48;
const CW = PW - MX * 2;

// ── Colour palette (matches generateReport.ts) ────────────────────────────

const BG_COVER  = rgb(0.051, 0.051, 0.055);
const BG_PAGE   = rgb(0.176, 0.176, 0.188);
const BG_CARD   = rgb(0.220, 0.220, 0.235);
const BG_INSET  = rgb(0.133, 0.133, 0.145);
const ACCENT    = rgb(0.902, 0.196, 0.133);
const TXT_WHITE = rgb(0.933, 0.929, 0.922);
const TXT_MUTED = rgb(0.540, 0.533, 0.521);
const BORDER_C  = rgb(0.267, 0.267, 0.290);

function hexToRgb(hex: string): Color {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

// ── Text utilities ─────────────────────────────────────────────────────────

function safe(s: string | undefined | null): string {
  return s ? String(s) : "";
}

function tx(s: string | undefined | null): string {
  return safe(s)
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2192/g, "->")
    .replace(/\u2022/g, "-")
    .replace(/[\u2265\u2264]/g, "")
    .replace(/[^\x00-\xFF]/g, "");
}

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const result: string[] = [];
  const sanitised = tx(text);
  if (!sanitised.trim()) return result;
  for (const para of sanitised.split("\n")) {
    if (!para.trim()) { result.push(""); continue; }
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }
  return result;
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
  lhMul = 1.6,
): number {
  if (!text || !tx(text).trim()) return y;
  const lh = size * lhMul;
  for (const line of wrapLines(text, font, size, maxW)) {
    if (y < 52) break;
    page.drawText(line, { x, y, size, font, color });
    y -= lh;
  }
  return y;
}

function textH(text: string, font: PDFFont, size: number, maxW: number, lhMul = 1.6): number {
  if (!text || !tx(text).trim()) return 0;
  return wrapLines(text, font, size, maxW).length * size * lhMul;
}

// ── Drawing primitives ─────────────────────────────────────────────────────

interface F { reg: PDFFont; bold: PDFFont }

function fillBg(page: PDFPage, color: Color): void {
  page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color });
}

function topBar(page: PDFPage, color: Color, h = 5): void {
  page.drawRectangle({ x: 0, y: PH - h, width: PW, height: h, color });
}

function pageChrome(page: PDFPage, f: F, _planTitle: string, accentColor: Color, today: string): number {
  fillBg(page, BG_PAGE);
  topBar(page, accentColor);

  const headerY = PH - 44;
  page.drawText("BOOST THE BEAST LAB", { x: MX, y: headerY, size: 7, font: f.bold, color: TXT_MUTED });
  const tw = f.reg.widthOfTextAtSize(today, 7);
  page.drawText(today, { x: PW - MX - tw, y: headerY, size: 7, font: f.reg, color: TXT_MUTED });

  const lineY = headerY - 12;
  page.drawLine({
    start: { x: MX, y: lineY },
    end: { x: PW - MX, y: lineY },
    thickness: 1.5, color: accentColor,
  });

  return lineY - 26;
}

function pageFooter(page: PDFPage, f: F, today: string): void {
  const fy = 32;
  page.drawLine({ start: { x: MX, y: fy + 13 }, end: { x: PW - MX, y: fy + 13 }, thickness: 0.5, color: BORDER_C });
  page.drawText("PERFORMANCE LAB  |  Kein Ersatz fuer medizinische Beratung", { x: MX, y: fy, size: 7, font: f.reg, color: TXT_MUTED });
  const tw = f.reg.widthOfTextAtSize(today, 7);
  page.drawText(today, { x: PW - MX - tw, y: fy, size: 7, font: f.reg, color: TXT_MUTED });
}

// ── Cover page ─────────────────────────────────────────────────────────────

function buildPlanCover(doc: PDFDocument, plan: PlanPdfInput, accentColor: Color, f: F, today: string): void {
  const page = doc.addPage([PW, PH]);
  fillBg(page, BG_COVER);
  topBar(page, accentColor, 6);

  let y = PH - 54;
  page.drawText("BOOST THE BEAST LAB", { x: MX, y, size: 10, font: f.bold, color: TXT_WHITE });
  y -= 16;
  page.drawText("PERFORMANCE LAB", { x: MX, y, size: 7, font: f.reg, color: accentColor });

  // Badge
  y -= 56;
  const badgeTxt = "INDIVIDUELLER PLAN";
  const badgeW = f.bold.widthOfTextAtSize(badgeTxt, 7) + 24;
  page.drawRectangle({ x: MX, y: y - 5, width: badgeW, height: 20, color: BG_INSET });
  page.drawRectangle({ x: MX, y: y + 14, width: badgeW, height: 2, color: accentColor });
  page.drawText(badgeTxt, { x: MX + 12, y: y, size: 7, font: f.bold, color: accentColor });

  // Title — needs enough clearance below badge (44pt caps + descenders)
  y -= 52;
  const titleLines = wrapLines(tx(plan.title), f.bold, 44, CW * 0.8);
  for (const line of titleLines) {
    page.drawText(line, { x: MX, y, size: 44, font: f.bold, color: TXT_WHITE });
    y -= 52;
  }

  // Subtitle
  y -= 4;
  y = drawW(page, plan.subtitle, MX, y, CW * 0.70, f.reg, 11, rgb(0.560, 0.553, 0.541));

  // Footer divider + date
  const fy = 50;
  page.drawLine({ start: { x: MX, y: fy + 16 }, end: { x: PW - MX, y: fy + 16 }, thickness: 0.5, color: rgb(0.165, 0.165, 0.165) });
  page.drawText(today, { x: MX, y: fy, size: 7, font: f.reg, color: rgb(0.333, 0.333, 0.333) });
  page.drawText("BOOST THE BEAST LAB · PERFORMANCE LAB", { x: MX, y: fy - 12, size: 6, font: f.reg, color: rgb(0.267, 0.267, 0.267) });
}

// ── Block rendering helper ─────────────────────────────────────────────────
// Draws a single block (heading + items) and returns new y.

function drawBlock(
  page: PDFPage,
  block: PlanBlock,
  f: F,
  accentColor: Color,
  startY: number,
): number {
  const innerW = CW - 26;  // 3px left bar + 12px gap + 11px right pad

  // Estimate total block height
  const headingH = 20;
  const itemsH = block.items.reduce(
    (acc, item) => acc + textH(item, f.reg, 9.5, innerW - 12, 1.55) + 2,
    0,
  );
  const boxH = Math.max(50, headingH + itemsH + 28);

  let y = startY;

  // Card background + left accent bar
  page.drawRectangle({ x: MX, y: y - boxH, width: CW, height: boxH, color: BG_CARD });
  page.drawRectangle({ x: MX, y: y - boxH, width: 3, height: boxH, color: accentColor });

  // Heading
  const headY = y - 16;
  page.drawText(tx(block.heading).toUpperCase(), {
    x: MX + 14, y: headY, size: 7.5, font: f.bold, color: accentColor,
  });

  // Separator line under heading
  page.drawLine({
    start: { x: MX + 14, y: headY - 8 },
    end: { x: MX + CW - 8, y: headY - 8 },
    thickness: 0.5, color: BORDER_C,
  });

  // Items
  let itemY = headY - 20;
  for (const item of block.items) {
    if (itemY < 60) break;
    // Bullet
    page.drawText("-", { x: MX + 14, y: itemY, size: 8, font: f.bold, color: accentColor });
    // Text
    itemY = drawW(page, item, MX + 26, itemY, innerW - 12, f.reg, 9.5, TXT_WHITE, 1.55);
    itemY -= 3;
  }

  return y - boxH - 12;  // 12pt gap between blocks
}

// ── Content pages ──────────────────────────────────────────────────────────

function buildPlanContent(doc: PDFDocument, plan: PlanPdfInput, accentColor: Color, f: F, today: string): void {
  let page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, plan.title, accentColor, today);

  // Page title
  page.drawText(tx(plan.title).toUpperCase(), { x: MX, y, size: 22, font: f.bold, color: TXT_WHITE });
  y -= 28;
  page.drawText(tx(plan.subtitle), { x: MX, y, size: 9, font: f.reg, color: TXT_MUTED });
  y -= 22;

  for (let i = 0; i < plan.blocks.length; i++) {
    const block = plan.blocks[i];
    const innerW = CW - 26;
    const headingH = 20;
    const itemsH = block.items.reduce(
      (acc, item) => acc + textH(item, f.reg, 9.5, innerW - 12, 1.55) + 2,
      0,
    );
    const blockH = Math.max(50, headingH + itemsH + 28) + 12;

    // Not enough space: start a new page
    const footerClearance = 65;
    if (y - blockH < footerClearance) {
      pageFooter(page, f, today);
      page = doc.addPage([PW, PH]);
      y = pageChrome(page, f, plan.title, accentColor, today);
      // Continuation header
      page.drawText(tx(plan.title).toUpperCase(), { x: MX, y, size: 18, font: f.bold, color: TXT_WHITE });
      y -= 26;
    }

    y = drawBlock(page, block, f, accentColor, y);
  }

  // Source box
  if (plan.source && y > 100) {
    y -= 4;
    const srcInnerW = CW - 28;
    const srcH = Math.max(44, textH(plan.source, f.reg, 8.5, srcInnerW, 1.5) + 28);
    page.drawRectangle({ x: MX, y: y - srcH, width: CW, height: srcH, color: BG_INSET });
    page.drawText("WISSENSCHAFTLICHE BASIS", { x: MX + 12, y: y - 14, size: 6, font: f.bold, color: TXT_MUTED });
    drawW(page, plan.source, MX + 12, y - 28, srcInnerW, f.reg, 8.5, TXT_MUTED, 1.5);
  }

  pageFooter(page, f, today);
}

// ── Main export ────────────────────────────────────────────────────────────

export async function generatePlanPDF(plan: PlanPdfInput): Promise<Uint8Array> {
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const accentColor = (() => {
    try { return hexToRgb(plan.color); } catch { return ACCENT; }
  })();

  const doc = await PDFDocument.create();
  const reg  = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const f: F = { reg, bold };

  doc.setTitle(`BTB ${tx(plan.title)}`);
  doc.setAuthor("BOOST THE BEAST LAB");
  doc.setCreationDate(new Date());

  buildPlanCover(doc, plan, accentColor, f, today);
  buildPlanContent(doc, plan, accentColor, f, today);

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}
