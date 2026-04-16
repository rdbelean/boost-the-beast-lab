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
const MX = 52;
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
    if (y < 80) break;  // respect footer zone
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

  // Brand header — icon + text side by side
  page.drawSvgPath("M16 1L29.5 8.5V23.5L16 31L2.5 23.5V8.5L16 1Z", {
    x: MX, y: y + 2, scale: 0.72, color: accentColor,
  });
  page.drawSvgPath("M13 22l3-12 3 12h-2.5v4h-1v-4H13z", {
    x: MX, y: y + 2, scale: 0.72, color: rgb(1, 1, 1),
  });
  page.drawText("BOOST THE BEAST LAB", { x: MX + 26, y, size: 10, font: f.bold, color: TXT_WHITE });
  y -= 16;
  page.drawText("PERFORMANCE LAB", { x: MX + 26, y, size: 7, font: f.reg, color: accentColor });

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
  const innerW = CW - 32;
  // headingH = 44: heading drawn at startY-22, separator at startY-31,
  //   items start at startY-44 → 44pt consumed before first item.
  const headingH = 44;
  // +4 per item matches the drawBlock `itemY -= 4` inter-item gap.
  const itemsH = block.items.reduce(
    (acc, item) => acc + textH(item, f.reg, 9.5, innerW - 14, 1.55) + 4,
    0,
  );
  // Rationale overhead: 12pt gap + separator + 12pt gap + label + 12pt gap = 36pt.
  const rationaleH = block.rationale
    ? 36 + textH(block.rationale, f.reg, 8.5, innerW - 8, 1.5)
    : 0;
  // 20pt bottom pad + 20pt inter-block gap (stripped in drawBlock via - 20).
  return Math.max(70, headingH + itemsH + rationaleH + 20) + 20;
}

function drawBlock(
  page: PDFPage,
  block: PlanBlock,
  f: F,
  accentColor: Color,
  startY: number,
): number {
  const innerW = CW - 32;  // 16pt left (3pt bar + 13pt gap) + 16pt right
  const bh = blockHeight(block, f) - 20;  // strip inter-block gap to get card height

  // Card background + left accent bar
  page.drawRectangle({ x: MX, y: startY - bh, width: CW, height: bh, color: BG_CARD });
  page.drawRectangle({ x: MX, y: startY - bh, width: 3, height: bh, color: accentColor });

  // Heading — 22pt from card top gives generous breathing room
  const headY = startY - 22;
  page.drawText(tx(block.heading).toUpperCase(), {
    x: MX + 16, y: headY, size: 7.5, font: f.bold, color: accentColor,
  });
  page.drawLine({
    start: { x: MX + 16, y: headY - 9 },
    end: { x: MX + CW - 16, y: headY - 9 },
    thickness: 0.5, color: BORDER_C,
  });

  // Items — start 22pt below separator baseline
  let itemY = headY - 22;  // = startY - 44
  for (const item of block.items) {
    if (itemY < 80) break;  // respect footer zone
    page.drawText("-", { x: MX + 16, y: itemY, size: 8, font: f.bold, color: accentColor });
    itemY = drawW(page, item, MX + 28, itemY, innerW - 14, f.reg, 9.5, TXT_WHITE, 1.55);
    itemY -= 4;
  }

  // Rationale section — 12pt gap before separator matches the 36pt overhead in blockHeight
  if (block.rationale && itemY > 90) {
    itemY -= 12;  // generous gap above separator
    page.drawLine({
      start: { x: MX + 16, y: itemY },
      end: { x: MX + CW - 16, y: itemY },
      thickness: 0.5, color: BORDER_C,
    });
    itemY -= 12;
    page.drawText("WISSENSCHAFTLICHE EINORDNUNG", {
      x: MX + 16, y: itemY, size: 6, font: f.bold, color: TXT_MUTED,
    });
    itemY -= 12;
    drawW(page, block.rationale, MX + 16, itemY, innerW - 8, f.reg, 8.5, TXT_MUTED, 1.5);
  }

  return startY - bh - 20;  // = startY - blockHeight(block, f)
}

// ── Key takeaways card ─────────────────────────────────────────────────────
// Renders a compact "4 wichtigste Maßnahmen" summary card to fill remaining space.

function drawKeyTakeaways(
  page: PDFPage,
  plan: PlanPdfInput,
  f: F,
  accentColor: Color,
  startY: number,
): number {
  const actions = plan.blocks.map((b) => b.items[0]).filter(Boolean);
  if (actions.length === 0) return startY;

  const innerW = CW - 32;  // 16pt left + 16pt right
  const itemsH = actions.reduce(
    (acc, item) => acc + textH(item, f.bold, 9, innerW - 16, 1.5) + 8,
    0,
  );
  const boxH = Math.max(90, itemsH + 56);

  // Card background + top accent bar
  page.drawRectangle({ x: MX, y: startY - boxH, width: CW, height: boxH, color: BG_INSET });
  page.drawRectangle({ x: MX, y: startY - 5, width: CW, height: 5, color: accentColor });

  // Heading
  page.drawText("DEINE WICHTIGSTEN MASSNAHMEN", {
    x: MX + 16, y: startY - 20, size: 7, font: f.bold, color: accentColor,
  });
  page.drawLine({
    start: { x: MX + 16, y: startY - 29 },
    end: { x: MX + CW - 16, y: startY - 29 },
    thickness: 0.5, color: BORDER_C,
  });

  let itemY = startY - 44;
  for (let i = 0; i < actions.length; i++) {
    const num = String(i + 1);
    page.drawText(num, { x: MX + 16, y: itemY, size: 8, font: f.bold, color: accentColor });
    itemY = drawW(page, actions[i], MX + 30, itemY, innerW - 16, f.bold, 9, TXT_WHITE, 1.5);
    itemY -= 8;
  }

  return startY - boxH - 10;
}

// ── Content pages ──────────────────────────────────────────────────────────

function buildPlanContent(doc: PDFDocument, plan: PlanPdfInput, accentColor: Color, f: F, today: string): void {
  let page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, accentColor, today);

  // Page title + subtitle — wrapped so long strings never overflow right margin
  y = drawW(page, tx(plan.title).toUpperCase(), MX, y, CW, f.bold, 20, TXT_WHITE, 1.3);
  y -= 8;
  y = drawW(page, tx(plan.subtitle), MX, y, CW, f.reg, 8.5, TXT_MUTED);
  y -= 16;

  for (const block of plan.blocks) {
    const bh = blockHeight(block, f);

    if (y - bh < 80) {  // 80pt = SAFE_Y; footer line is at 45pt
      pageFooter(page, f, today);
      page = doc.addPage([PW, PH]);
      y = pageChrome(page, f, accentColor, today);
      // Compact muted continuation header with a visual rule — gives clear top separation
      page.drawText(tx(plan.title).toUpperCase(), {
        x: MX, y, size: 11, font: f.bold, color: TXT_MUTED,
      });
      y -= 14;
      page.drawLine({
        start: { x: MX, y }, end: { x: PW - MX, y }, thickness: 0.5, color: BORDER_C,
      });
      y -= 20;
    }

    y = drawBlock(page, block, f, accentColor, y);
  }

  // ── Key takeaways card ────────────────────────────────────────────────────
  // Pre-compute height so we never draw a box that bleeds into the footer.
  const srcInnerW = CW - 32;
  const srcH = plan.source ? Math.max(44, textH(plan.source, f.reg, 8.5, srcInnerW, 1.5) + 28) : 0;

  {
    const ktActions = plan.blocks.map((b) => b.items[0]).filter(Boolean);
    if (ktActions.length > 0) {
      const ktInnerW = CW - 32;
      const ktItemsH = ktActions.reduce(
        (acc, item) => acc + textH(item, f.bold, 9, ktInnerW - 16, 1.5) + 8,
        0,
      );
      const ktBoxH = Math.max(90, ktItemsH + 56);
      // Draw only if key takeaways + gap + source box (if present) all fit above footer zone
      const totalNeeded = 8 + ktBoxH + 10 + (plan.source ? srcH + 4 : 0);
      if (y - totalNeeded > 80) {
        y -= 8;
        y = drawKeyTakeaways(page, plan, f, accentColor, y);
      }
    }
  }

  // ── Source box ────────────────────────────────────────────────────────────
  // Only draw if the entire box fits above the footer zone.
  if (plan.source && y - 4 - srcH > 80) {
    y -= 4;
    page.drawRectangle({ x: MX, y: y - srcH, width: CW, height: srcH, color: BG_INSET });
    page.drawText("WISSENSCHAFTLICHE BASIS", { x: MX + 16, y: y - 14, size: 6, font: f.bold, color: TXT_MUTED });
    drawW(page, plan.source, MX + 16, y - 28, srcInnerW, f.reg, 8.5, TXT_MUTED, 1.5);
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
