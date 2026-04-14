// Server-side plan PDF generation via pdf-lib.
// Pure JavaScript — zero native dependencies, works reliably on Vercel.
// Dark warm-grey theme matching the main Performance Intelligence Report.

import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont, type Color } from "pdf-lib";

export interface PlanBlock {
  heading: string;
  items: string[];
  rationale?: string;  // Scientific justification shown below items in PDF
}

export interface PlanPdfInput {
  title: string;
  subtitle: string;
  source: string;
  color: string;
  score?: number;      // Used for urgency label on cover
  blocks: PlanBlock[];
}

// ── Page dimensions ────────────────────────────────────────────────────────

const PW = 595.28;
const PH = 841.89;
const MX = 48;
const CW = PW - MX * 2;

// ── Colour palette (matches generateReport.ts) ────────────────────────────

const BG_PAGE   = rgb(0.176, 0.176, 0.188);   // warm dark grey — ALL pages
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

// Urgency label derived from score (matches web urgencyLabel() helper)
function urgencyInfo(score: number): { text: string; color: Color } {
  if (score <= 30) return { text: "KRITISCH",             color: rgb(0.863, 0.149, 0.149) };
  if (score <= 50) return { text: "HANDLUNGSBEDARF",      color: rgb(0.706, 0.325, 0.035) };
  if (score <= 70) return { text: "OPTIMIERUNGSPOTENZIAL",color: rgb(0.631, 0.631, 0.667) };
  if (score <= 85) return { text: "FEINTUNING",           color: rgb(0.302, 0.486, 0.059) };
  return                 { text: "TOP-LEVEL",             color: rgb(0.082, 0.502, 0.239) };
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

function pageChrome(page: PDFPage, f: F, accentColor: Color, today: string): number {
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

  // Warm grey background — same as content pages (no more near-black cover)
  fillBg(page, BG_PAGE);
  topBar(page, accentColor, 6);

  let y = PH - 54;

  // Brand header
  page.drawText("BOOST THE BEAST LAB", { x: MX, y, size: 10, font: f.bold, color: TXT_WHITE });
  y -= 16;
  page.drawText("PERFORMANCE LAB", { x: MX, y, size: 7, font: f.reg, color: accentColor });

  // "INDIVIDUELLER PLAN" badge
  y -= 56;
  const badgeTxt = "INDIVIDUELLER PLAN";
  const badgeW = f.bold.widthOfTextAtSize(badgeTxt, 7) + 24;
  page.drawRectangle({ x: MX, y: y - 5, width: badgeW, height: 20, color: BG_INSET });
  page.drawRectangle({ x: MX, y: y + 14, width: badgeW, height: 2, color: accentColor });
  page.drawText(badgeTxt, { x: MX + 12, y: y, size: 7, font: f.bold, color: accentColor });

  // Title — 44pt, enough clearance below badge
  y -= 52;
  for (const line of wrapLines(tx(plan.title), f.bold, 44, CW * 0.8)) {
    page.drawText(line, { x: MX, y, size: 44, font: f.bold, color: TXT_WHITE });
    y -= 52;
  }

  // Score + urgency label (if score provided)
  if (plan.score != null) {
    y -= 8;
    const { text: urgTxt, color: urgColor } = urgencyInfo(plan.score);
    const scoreStr = `${plan.score}/100`;
    page.drawText(scoreStr, { x: MX, y, size: 18, font: f.bold, color: accentColor });
    const scoreW = f.bold.widthOfTextAtSize(scoreStr, 18);

    // Urgency pill
    const pillTxt = urgTxt;
    const pillW = f.bold.widthOfTextAtSize(pillTxt, 7) + 18;
    const pillX = MX + scoreW + 12;
    page.drawRectangle({ x: pillX, y: y - 4, width: pillW, height: 18, color: BG_INSET });
    page.drawRectangle({ x: pillX, y: y + 13, width: pillW, height: 2, color: urgColor });
    page.drawText(pillTxt, { x: pillX + 9, y: y + 2, size: 6.5, font: f.bold, color: urgColor });
    y -= 26;
  }

  // Subtitle
  y -= 4;
  y = drawW(page, plan.subtitle, MX, y, CW * 0.72, f.reg, 10.5, TXT_MUTED);

  // Footer divider + metadata
  const fy = 50;
  page.drawLine({ start: { x: MX, y: fy + 16 }, end: { x: PW - MX, y: fy + 16 }, thickness: 0.5, color: BORDER_C });
  page.drawText(today, { x: MX, y: fy, size: 7, font: f.reg, color: TXT_MUTED });
  page.drawText("BOOST THE BEAST LAB · PERFORMANCE LAB", { x: MX, y: fy - 12, size: 6, font: f.reg, color: TXT_MUTED });
}

// ── Block rendering ────────────────────────────────────────────────────────
// Returns new y after the block + gap.

function blockHeight(block: PlanBlock, f: F): number {
  const innerW = CW - 26;
  const headingH = 28;  // heading + separator
  const itemsH = block.items.reduce(
    (acc, item) => acc + textH(item, f.reg, 9.5, innerW - 12, 1.55) + 2,
    0,
  );
  let rationaleH = 0;
  if (block.rationale) {
    rationaleH = 14 + textH(block.rationale, f.reg, 8.5, innerW - 8, 1.5);  // separator + text
  }
  return Math.max(50, headingH + itemsH + rationaleH + 24) + 12;
}

function drawBlock(
  page: PDFPage,
  block: PlanBlock,
  f: F,
  accentColor: Color,
  startY: number,
): number {
  const innerW = CW - 26;
  const bh = blockHeight(block, f) - 12;  // without gap

  // Card background + left accent bar
  page.drawRectangle({ x: MX, y: startY - bh, width: CW, height: bh, color: BG_CARD });
  page.drawRectangle({ x: MX, y: startY - bh, width: 3, height: bh, color: accentColor });

  // Heading
  const headY = startY - 16;
  page.drawText(tx(block.heading).toUpperCase(), {
    x: MX + 14, y: headY, size: 7.5, font: f.bold, color: accentColor,
  });
  page.drawLine({
    start: { x: MX + 14, y: headY - 8 },
    end: { x: MX + CW - 8, y: headY - 8 },
    thickness: 0.5, color: BORDER_C,
  });

  // Items
  let itemY = headY - 20;
  for (const item of block.items) {
    if (itemY < 60) break;
    page.drawText("-", { x: MX + 14, y: itemY, size: 8, font: f.bold, color: accentColor });
    itemY = drawW(page, item, MX + 26, itemY, innerW - 12, f.reg, 9.5, TXT_WHITE, 1.55);
    itemY -= 3;
  }

  // Rationale section
  if (block.rationale && itemY > 72) {
    itemY -= 8;
    page.drawLine({
      start: { x: MX + 14, y: itemY },
      end: { x: MX + CW - 8, y: itemY },
      thickness: 0.5, color: BORDER_C,
    });
    itemY -= 12;
    page.drawText("WISSENSCHAFTLICHE EINORDNUNG", {
      x: MX + 14, y: itemY, size: 6, font: f.bold, color: TXT_MUTED,
    });
    itemY -= 12;
    drawW(page, block.rationale, MX + 14, itemY, innerW - 8, f.reg, 8.5, TXT_MUTED, 1.5);
  }

  return startY - bh - 12;
}

// ── Content pages ──────────────────────────────────────────────────────────

function buildPlanContent(doc: PDFDocument, plan: PlanPdfInput, accentColor: Color, f: F, today: string): void {
  let page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, accentColor, today);

  // Page title + subtitle
  page.drawText(tx(plan.title).toUpperCase(), { x: MX, y, size: 20, font: f.bold, color: TXT_WHITE });
  y -= 26;
  page.drawText(tx(plan.subtitle), { x: MX, y, size: 8.5, font: f.reg, color: TXT_MUTED });
  y -= 20;

  for (const block of plan.blocks) {
    const bh = blockHeight(block, f);
    const footerClearance = 65;

    if (y - bh < footerClearance) {
      pageFooter(page, f, today);
      page = doc.addPage([PW, PH]);
      y = pageChrome(page, f, accentColor, today);
      page.drawText(tx(plan.title).toUpperCase(), { x: MX, y, size: 16, font: f.bold, color: TXT_WHITE });
      y -= 24;
    }

    y = drawBlock(page, block, f, accentColor, y);
  }

  // Source box at the bottom
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
