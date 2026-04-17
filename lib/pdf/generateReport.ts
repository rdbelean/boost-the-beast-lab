// Server-side PDF generation via pdf-lib (pure JavaScript).
// No native dependencies — works reliably on Vercel serverless functions.

import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont, type PDFImage, type Color } from "pdf-lib";
import { LOGO_WHITE_PNG_BASE64 } from "./logo";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PdfModule {
  score_context?: string;
  key_finding?: string;
  systemic_connection?: string;
  limitation?: string;
  recommendation?: string;
  main_finding?: string;
  interpretation?: string;
  systemic_impact?: string;
  overtraining_signal?: string | null;
  met_context?: string;
  sitting_flag?: string | null;
  bmi_context?: string;
  hpa_context?: string | null;
  estimation_note?: string;
  fitness_context?: string;
}

export interface PdfReportContent {
  headline: string;
  executive_summary: string;
  critical_flag?: string | null;
  modules: {
    sleep: PdfModule;
    recovery: PdfModule;
    activity: PdfModule;
    metabolic: PdfModule;
    stress: PdfModule;
    vo2max: PdfModule;
  };
  top_priority: string;
  systemic_connections_overview?: string;
  systemic_connections?: string;
  prognose_30_days: string;
  disclaimer: string;
}

export interface PdfScoreEntry {
  score: number;
  band: string;
}

export interface PdfScores {
  sleep: PdfScoreEntry;
  recovery: PdfScoreEntry;
  activity: PdfScoreEntry;
  metabolic: PdfScoreEntry;
  stress: PdfScoreEntry;
  vo2max: PdfScoreEntry & { estimated: number };
  overall: PdfScoreEntry;
  total_met: number;
  sleep_duration_hours: number;
  sitting_hours?: number;
  training_days?: number;
}

export interface PdfUserProfile {
  email: string;
  age: number;
  gender: string;
  bmi: number;
  bmi_category: string;
}

// ── Page dimensions ────────────────────────────────────────────────────────

const PW = 595.28;   // A4 width  (points)
const PH = 841.89;   // A4 height (points)
const MX = 52;       // horizontal margin
const CW = PW - MX * 2; // content width ≈ 491 pt
// Hard content-bottom floor — nothing may be drawn below this y.
// Footer line sits at y=45, text at y=32; CB=80 gives a 35pt clear gap.
const CB = 80;

// ── Colour palette ─────────────────────────────────────────────────────────

const ACCENT     = rgb(0.902, 0.196, 0.133);   // #E63222 — BTB red
const BG_PAGE    = rgb(0.176, 0.176, 0.188);   // ~RGB(45,45,48) — warm dark grey
const BG_CARD    = rgb(0.220, 0.220, 0.235);   // slightly lighter card
const BG_INSET   = rgb(0.133, 0.133, 0.145);   // progress track / inset
const BG_STAT    = rgb(0.200, 0.200, 0.215);   // stat box — warm grey (matches page theme)
const TXT_WHITE  = rgb(0.933, 0.929, 0.922);   // #EEECEA warm off-white
const TXT_MUTED  = rgb(0.540, 0.533, 0.521);   // muted label text
const BORDER_C   = rgb(0.267, 0.267, 0.290);   // subtle border
const SC_GREEN   = rgb(0.133, 0.773, 0.369);   // #22C55E
const SC_ORANGE  = rgb(0.945, 0.620, 0.031);   // #F59E0B
const BLUE_INFO  = rgb(0.231, 0.510, 0.965);   // #3B82F6

function scoreColor(score: number): Color {
  if (score < 40) return ACCENT;
  if (score < 65) return SC_ORANGE;
  return SC_GREEN;
}

// ── Text utilities ─────────────────────────────────────────────────────────

function safe(s: string | undefined | null): string {
  return s ? String(s) : "";
}

// Sanitise to WinAnsi / Latin-1 (required for standard PDF fonts).
function tx(s: string | undefined | null): string {
  return safe(s)
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2022/g, "-")
    .replace(/[\u2265\u2264]/g, "")
    .replace(/[^\x00-\xFF]/g, "");
}

// Wrap text into lines that each fit within maxW.
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

// Draw wrapped text; returns new y after last line.
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
    if (y < CB) break;  // respect hard content-bottom floor
    page.drawText(line, { x, y, size, font, color });
    y -= lh;
  }
  return y;
}

// Height that drawW() would consume (no drawing).
function textH(text: string, font: PDFFont, size: number, maxW: number, lhMul = 1.6): number {
  if (!text || !tx(text).trim()) return 0;
  return wrapLines(text, font, size, maxW).length * size * lhMul;
}

// ── Drawing primitives ─────────────────────────────────────────────────────

interface F { reg: PDFFont; bold: PDFFont }

function fillBg(page: PDFPage, color: Color): void {
  page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color });
}

function topBar(page: PDFPage, h = 5): void {
  page.drawRectangle({ x: 0, y: PH - h, width: PW, height: h, color: ACCENT });
}

// ── Standard content-page chrome ───────────────────────────────────────────
// Returns the y coordinate where the first piece of content should start.
// Gap is generous (30 pt below accent line) so 26pt-tall titles don't
// visually bleed into the header separator line.
function pageChrome(page: PDFPage, f: F, today: string): number {
  fillBg(page, BG_PAGE);
  topBar(page);

  const headerY = PH - 44;   // baseline for brand text
  page.drawText("BOOST THE BEAST LAB", {
    x: MX, y: headerY, size: 7, font: f.bold, color: TXT_MUTED,
  });
  const tw = f.reg.widthOfTextAtSize(today, 7);
  page.drawText(today, { x: PW - MX - tw, y: headerY, size: 7, font: f.reg, color: TXT_MUTED });

  const lineY = headerY - 12;  // separator line (≈ PH − 56)
  page.drawLine({
    start: { x: MX, y: lineY },
    end: { x: PW - MX, y: lineY },
    thickness: 1.5, color: ACCENT,
  });

  return lineY - 26;  // first content baseline (≈ PH − 82)
  // At PH-82, a 26pt title top sits at PH-82+19 = PH-63 < PH-56 → no overlap.
}

function pageFooter(page: PDFPage, f: F, today: string): void {
  const fy = 32;
  page.drawLine({
    start: { x: MX, y: fy + 13 },
    end: { x: PW - MX, y: fy + 13 },
    thickness: 0.5, color: BORDER_C,
  });
  page.drawText("PERFORMANCE LAB  |  Kein Ersatz für medizinische Beratung", {
    x: MX, y: fy, size: 7, font: f.reg, color: TXT_MUTED,
  });
  const tw = f.reg.widthOfTextAtSize(today, 7);
  page.drawText(today, { x: PW - MX - tw, y: fy, size: 7, font: f.reg, color: TXT_MUTED });
}

// Section label with accent colour; returns y after label + gap.
function secLabel(page: PDFPage, label: string, f: F, x: number, y: number): number {
  page.drawText(tx(label).toUpperCase(), { x, y, size: 7.5, font: f.bold, color: ACCENT });
  return y - 15;
}

// ── Score card (summary grid) ──────────────────────────────────────────────

function scoreCard(
  page: PDFPage,
  label: string,
  score: number,
  band: string,
  f: F,
  x: number,
  topY: number,
  w: number,
  h = 80,  // taller card for clean non-overlapping layout
): void {
  const col = scoreColor(score);

  // Card bg + top colour bar (4pt)
  page.drawRectangle({ x, y: topY - h, width: w, height: h, color: BG_CARD });
  page.drawRectangle({ x, y: topY - 4, width: w, height: 4, color: col });

  // Label (6pt, below colour bar)
  page.drawText(tx(label).toUpperCase(), {
    x: x + 12, y: topY - 18, size: 6, font: f.bold, color: TXT_MUTED,
  });

  // Score number (24pt) — cap top at topY-18-17=topY-35, no overlap with label
  page.drawText(String(score), {
    x: x + 12, y: topY - 42, size: 24, font: f.bold, color: col,
  });

  // Band — placed between score and progress bar
  const bStr = tx(band).toUpperCase();
  const bW = Math.min(f.reg.widthOfTextAtSize(bStr, 6), w - 24);
  page.drawText(bStr, {
    x: x + w - 12 - bW, y: topY - h + 28, size: 6, font: f.reg, color: TXT_MUTED,
  });

  // Progress bar near the bottom of the card (12pt from bottom)
  const barX = x + 12;
  const barW = w - 24;
  const barY = topY - h + 12;
  page.drawRectangle({ x: barX, y: barY, width: barW, height: 3, color: BG_INSET });
  page.drawRectangle({
    x: barX, y: barY,
    width: Math.max(1, (score / 100) * barW),
    height: 3, color: col,
  });
}

// ── Info box (systemic / limitation / recommendation) ─────────────────────
// Left colour bar + label + wrapped body text.
// Returns y after box + gap.

function infoBox(
  page: PDFPage,
  label: string,
  text: string,
  f: F,
  x: number,
  topY: number,
  w: number,
  barColor: Color,
  fontSize = 9.5,
  lhMul = 1.5,
  overhead = 44,
  gap = 10,
  bodyOffset = 32,
): number {
  if (!text || !tx(text).trim()) return topY;

  // Hard floor: box bottom must not go below CB.
  const maxH = topY - CB;
  if (maxH < 30) return topY;   // not enough room — skip this box entirely

  const innerW = w - 32;   // text width: 16pt left (3pt bar + 13pt gap) + 16pt right
  const bodyPx = textH(text, f.reg, fontSize, innerW, lhMul);
  // Clamp so the rectangle never extends past CB.
  const boxH = Math.min(Math.max(50, bodyPx + overhead), maxH);

  // Background + left bar
  page.drawRectangle({ x, y: topY - boxH, width: w, height: boxH, color: BG_CARD });
  page.drawRectangle({ x, y: topY - boxH, width: 3, height: boxH, color: barColor });

  // Label (6pt bold, 16pt from box top)
  page.drawText(tx(label).toUpperCase(), {
    x: x + 16, y: topY - 16, size: 6, font: f.bold, color: barColor,
  });

  // Body text — drawW stops at CB automatically
  drawW(page, text, x + 16, topY - bodyOffset, innerW, f.reg, fontSize, TXT_WHITE, lhMul);

  return topY - boxH - gap;
}

// ── Stat boxes (metrics section at bottom of module pages) ────────────────

function statBoxes(
  page: PDFPage,
  metrics: Array<[string, string]>,
  f: F,
  topY: number,
): void {
  if (metrics.length === 0) return;

  const gap = 10;
  const boxW = (CW - (metrics.length - 1) * gap) / metrics.length;
  const boxH = 52;

  // Hard floor: skip stat boxes entirely if they would overlap the footer zone.
  if (topY - boxH < CB) return;

  for (let i = 0; i < metrics.length; i++) {
    const [key, val] = metrics[i];
    const bx = MX + i * (boxW + gap);

    page.drawRectangle({ x: bx, y: topY - boxH, width: boxW, height: boxH, color: BG_STAT });
    page.drawRectangle({ x: bx, y: topY - 3, width: boxW, height: 3, color: BORDER_C });

    // Label
    page.drawText(tx(key).toUpperCase(), {
      x: bx + 12, y: topY - 15, size: 6, font: f.bold, color: TXT_MUTED,
    });

    // Value — fit on one line, shrink if needed (leave 24pt padding total)
    const valStr = tx(val);
    const valSize = f.bold.widthOfTextAtSize(valStr, 12) <= boxW - 24 ? 12 : 10;
    page.drawText(valStr, {
      x: bx + 12, y: topY - 36, size: valSize, font: f.bold, color: TXT_WHITE,
    });
  }
}

// ── Adaptive module layout ─────────────────────────────────────────────────
// Available height per module page after the fixed title / score / band / bar
// header block (≈72pt) and the SAFE_Y footer guard (80pt):
//   pageChrome returns y ≈ 760pt; 760 - 72 - 80 = 608pt.
// Three tiers reduce font sizes / gaps until content fits in that budget.

interface ModuleLayout {
  bodySize: number;     // EINORDNUNG / HAUPTBEFUND font size
  findingSize: number;  // HAUPTBEFUND font size (slightly larger in NORMAL)
  boxSize: number;      // info-box body font size
  lhBody: number;       // line-height multiplier for free text
  lhBox: number;        // line-height multiplier for info boxes
  sectionGap: number;   // pt gap after each free-text section
  boxOverhead: number;  // overhead constant in infoBox boxH formula
  boxGap: number;       // gap after each info box
  bodyOffset: number;   // pt below boxTop where body text begins
}

// bodyOffset: distance from box top (topY) to body-text baseline.
// Label is drawn at topY-16 (6pt). For a visible ~9pt gap between label
// descenders and body ascenders, bodyOffset must be ≥ 34 regardless of tier.
// boxOverhead = bodyOffset + bottom_padding — keeps bottom padding constant
// when bodyOffset changes (bottom_pad = overhead - bodyOffset).
// bodyOffset: distance from box top (topY) to body-text baseline.
// Label is drawn at topY-16 (6pt). bodyOffset=46 gives 30pt label-baseline-to-
// body-baseline distance, yielding ~20pt visible white space between label
// descenders and body ascenders — consistently across all tiers.
// boxOverhead = bodyOffset + bottom_padding (bottom_pad kept unchanged per tier).
const LAYOUT_NORMAL: ModuleLayout = {
  bodySize: 10, findingSize: 10.5, boxSize: 9.5,
  lhBody: 1.65, lhBox: 1.5,
  sectionGap: 14, boxOverhead: 58, boxGap: 10, bodyOffset: 46,  // bottom_pad=12
};
const LAYOUT_COMPACT: ModuleLayout = {
  bodySize: 9, findingSize: 9.5, boxSize: 9,
  lhBody: 1.5, lhBox: 1.4,
  sectionGap: 10, boxOverhead: 56, boxGap: 8, bodyOffset: 46,   // bottom_pad=10
};
const LAYOUT_TIGHT: ModuleLayout = {
  bodySize: 9, findingSize: 9, boxSize: 9,
  lhBody: 1.45, lhBox: 1.35,
  sectionGap: 6, boxOverhead: 54, boxGap: 5, bodyOffset: 46,    // bottom_pad=8
};
// 4th-tier backstop for extremely long AI-generated text.
// CB-clamping in infoBox/statBoxes is the final safety net below this.
const LAYOUT_MICRO: ModuleLayout = {
  bodySize: 8.5, findingSize: 8.5, boxSize: 8.5,
  lhBody: 1.35, lhBox: 1.3,
  sectionGap: 4, boxOverhead: 50, boxGap: 4, bodyOffset: 46,    // bottom_pad=4
};

/** Estimate total content height below the fixed header block. */
function moduleContentH(
  mod: PdfModule,
  metrics: Array<[string, string]>,
  f: F,
  L: ModuleLayout,
): number {
  const innerW = CW - 32;
  let h = 0;

  if (mod.score_context) {
    // 15 (secLabel) + 14 (label-to-text gap) + textH + sectionGap
    h += 15 + 14 + textH(mod.score_context, f.reg, L.bodySize, CW, L.lhBody) + L.sectionGap;
  }

  const finding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  if (finding) {
    h += 15 + 14 + textH(finding, f.bold, L.findingSize, CW, L.lhBody) + L.sectionGap;
  }

  const systemic = mod.systemic_connection ?? mod.systemic_impact ?? "";
  if (systemic && tx(systemic).trim()) {
    h += Math.max(50, textH(systemic, f.reg, L.boxSize, innerW, L.lhBox) + L.boxOverhead) + L.boxGap;
  }
  if (mod.limitation && tx(mod.limitation).trim()) {
    h += Math.max(50, textH(mod.limitation, f.reg, L.boxSize, innerW, L.lhBox) + L.boxOverhead) + L.boxGap;
  }
  if (mod.recommendation && tx(mod.recommendation).trim()) {
    h += Math.max(50, textH(mod.recommendation, f.reg, L.boxSize, innerW, L.lhBox) + L.boxOverhead) + L.boxGap;
  }

  if (metrics.length > 0) {
    h += 8 + 18 + 52;  // pre-gap + secLabel + stat box height
  }

  return h;
}

// ── Page 1: Cover ──────────────────────────────────────────────────────────

function buildCover(
  doc: PDFDocument,
  content: PdfReportContent,
  scores: PdfScores,
  user: PdfUserProfile,
  f: F,
  today: string,
  logo: PDFImage,
): void {
  const page = doc.addPage([PW, PH]);
  fillBg(page, BG_PAGE);
  topBar(page, 6);

  let y = PH - 54;

  // Brand header — logo + text side by side
  const logoH = 26;
  const logoW = logoH * (logo.width / logo.height);
  page.drawImage(logo, { x: MX, y: y - 16, width: logoW, height: logoH });
  const textX = MX + logoW + 8;
  page.drawText("BOOST THE BEAST LAB", { x: textX, y, size: 10, font: f.bold, color: TXT_WHITE });
  y -= 16;
  page.drawText("PERFORMANCE LAB", { x: textX, y, size: 7, font: f.reg, color: ACCENT });

  // Hero title
  y -= 64;
  page.drawText("PERFORMANCE", { x: MX, y, size: 44, font: f.bold, color: TXT_WHITE });
  y -= 52;
  page.drawText("INTELLIGENCE", { x: MX, y, size: 44, font: f.bold, color: TXT_WHITE });
  y -= 52;
  page.drawText("REPORT", { x: MX, y, size: 44, font: f.bold, color: TXT_WHITE });

  // User info subtitle
  y -= 34;
  const info = `Performance Report - ${user.age} Jahre, ${tx(user.gender)} | Overall: ${scores.overall.score}/100 (${tx(scores.overall.band)})`;
  y = drawW(page, info, MX, y, CW * 0.70, f.reg, 11, rgb(0.560, 0.553, 0.541));

  // Headline
  if (content.headline) {
    y -= 10;
    y = drawW(page, content.headline, MX, y, CW * 0.70, f.reg, 9, rgb(0.420, 0.413, 0.401));
  }

  // Large watermark score
  const sStr = String(scores.overall.score);
  const sW = f.bold.widthOfTextAtSize(sStr, 110);
  page.drawText(sStr, {
    x: PW - MX - sW, y: 76,
    size: 110, font: f.bold, color: ACCENT, opacity: 0.12,
  });

  // Footer divider + metadata
  const fy = 50;
  page.drawLine({
    start: { x: MX, y: fy + 16 },
    end: { x: PW - MX, y: fy + 16 },
    thickness: 0.5, color: BORDER_C,
  });
  page.drawText(today, { x: MX, y: fy, size: 7, font: f.reg, color: TXT_MUTED });
}

// ── Page 2: Summary ────────────────────────────────────────────────────────

function buildSummary(
  doc: PDFDocument,
  content: PdfReportContent,
  scores: PdfScores,
  user: PdfUserProfile,
  f: F,
  today: string,
): void {
  const page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, today);

  // Section heading
  y = secLabel(page, "GESAMTBILD", f, MX, y);

  // Executive summary text
  y = drawW(page, content.executive_summary, MX, y, CW, f.reg, 10, TXT_WHITE, 1.65);
  y -= 18;

  // Score grid — 5 cards
  const gap = 8;
  const cardW = (CW - 4 * gap) / 5;
  const cardH = 80;
  const entries: Array<[string, PdfScoreEntry]> = [
    ["ACTIVITY",  scores.activity],
    ["SLEEP",     scores.sleep],
    ["VO2MAX",    scores.vo2max],
    ["METABOLIC", scores.metabolic],
    ["STRESS",    scores.stress],
  ];
  for (let i = 0; i < entries.length; i++) {
    scoreCard(page, entries[i][0], entries[i][1].score, entries[i][1].band, f,
      MX + i * (cardW + gap), y, cardW, cardH);
  }
  y -= cardH + 14;

  // Overall index box
  const ovH = 68;
  const oc = scoreColor(scores.overall.score);
  page.drawRectangle({ x: MX, y: y - ovH, width: CW, height: ovH, color: BG_CARD });
  page.drawRectangle({ x: MX, y: y - ovH, width: 4, height: ovH, color: ACCENT });

  page.drawText("OVERALL PERFORMANCE INDEX", {
    x: MX + 16, y: y - 16, size: 7, font: f.bold, color: TXT_MUTED,
  });
  page.drawText(String(scores.overall.score), {
    x: MX + 16, y: y - 50, size: 40, font: f.bold, color: oc,
  });
  page.drawText(`/100  ${tx(scores.overall.band).toUpperCase()}`, {
    x: MX + 84, y: y - 36, size: 10, font: f.reg, color: TXT_MUTED,
  });

  // Right side user meta — 16pt inside box right edge to avoid clinging to border
  const meta = `BMI ${user.bmi}  |  ${user.age} Jahre  |  ${tx(user.gender)}`;
  const metaW = f.reg.widthOfTextAtSize(meta, 9);
  page.drawText(meta, { x: PW - MX - metaW - 16, y: y - 22, size: 9, font: f.reg, color: TXT_MUTED });
  const bCat = tx(user.bmi_category).toUpperCase();
  const bCatW = f.reg.widthOfTextAtSize(bCat, 7);
  page.drawText(bCat, { x: PW - MX - bCatW - 16, y: y - 34, size: 7, font: f.reg, color: TXT_MUTED });

  y -= ovH + 14;

  // Top priority box — clamp to CB so it never overlaps the footer
  const prioTH = textH(content.top_priority, f.bold, 10, CW - 26, 1.65);
  const prioH = Math.min(Math.max(56, prioTH + 42), Math.max(0, y - CB));
  if (prioH >= 30) {
    page.drawRectangle({ x: MX, y: y - prioH, width: CW, height: prioH, color: BG_CARD });
    page.drawRectangle({ x: MX, y: y - 5, width: CW, height: 5, color: ACCENT });
    page.drawText("TOP PRIORITÄT", {
      x: MX + 16, y: y - 19, size: 7, font: f.bold, color: ACCENT,
    });
    drawW(page, content.top_priority, MX + 16, y - 33, CW - 32, f.bold, 10, TXT_WHITE, 1.65);
  }

  pageFooter(page, f, today);
}

// ── Pages 3–7: Score module ────────────────────────────────────────────────

function buildModule(
  doc: PDFDocument,
  title: string,
  score: number,
  band: string,
  mod: PdfModule,
  metrics: Array<[string, string]>,
  f: F,
  today: string,
): void {
  // Available height below the fixed header block (≈72pt) down to CB (80pt).
  // pageChrome → y ≈ 759.89; fixed header consumes 72pt → content starts ≈ 687.89.
  // 687.89 - 80 = 607.89pt → AVAIL set conservatively at 590 to absorb float drift
  // and leave headroom for the CB-clamp backstop in infoBox/statBoxes.
  const AVAIL = 590;
  const L =
    moduleContentH(mod, metrics, f, LAYOUT_NORMAL)  <= AVAIL ? LAYOUT_NORMAL  :
    moduleContentH(mod, metrics, f, LAYOUT_COMPACT) <= AVAIL ? LAYOUT_COMPACT :
    moduleContentH(mod, metrics, f, LAYOUT_TIGHT)   <= AVAIL ? LAYOUT_TIGHT   :
    LAYOUT_MICRO;

  const page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, today);
  const col = scoreColor(score);

  // ── Title row ─────────────────────────────────────────────────────────
  page.drawText(tx(title).toUpperCase(), { x: MX, y, size: 26, font: f.bold, color: TXT_WHITE });
  const sStr = String(score);
  const sW = f.bold.widthOfTextAtSize(sStr, 42);
  const slashW = f.reg.widthOfTextAtSize("/100", 12);
  const scoreY = y - 12;
  page.drawText(sStr, { x: PW - MX - sW - slashW - 4, y: scoreY, size: 42, font: f.bold, color: col });
  page.drawText("/100", { x: PW - MX - slashW, y: scoreY + 6, size: 12, font: f.reg, color: TXT_MUTED });

  y -= 32;
  page.drawText(tx(band).toUpperCase(), { x: MX, y, size: 7.5, font: f.reg, color: TXT_MUTED });

  y -= 14;
  page.drawRectangle({ x: MX, y, width: CW, height: 5, color: BG_INSET });
  page.drawRectangle({ x: MX, y, width: Math.max(2, (score / 100) * CW), height: 5, color: col });
  y -= 26;

  // ── EINORDNUNG ────────────────────────────────────────────────────────
  if (mod.score_context) {
    y = secLabel(page, "EINORDNUNG", f, MX, y);
    y -= 14;  // gap between heading and body text (~20pt visual clearance)
    y = drawW(page, mod.score_context, MX, y, CW, f.reg, L.bodySize, TXT_WHITE, L.lhBody);
    y -= L.sectionGap;
  }

  // ── HAUPTBEFUND ───────────────────────────────────────────────────────
  const finding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  if (finding) {
    y = secLabel(page, "HAUPTBEFUND", f, MX, y);
    y -= 14;  // gap between heading and body text
    y = drawW(page, finding, MX, y, CW, f.bold, L.findingSize, TXT_WHITE, L.lhBody);
    y -= L.sectionGap;
  }

  // ── Info boxes ────────────────────────────────────────────────────────
  const systemic = mod.systemic_connection ?? mod.systemic_impact ?? "";
  if (systemic && tx(systemic).trim()) {
    y = infoBox(page, "SYSTEMISCHE VERBINDUNG", systemic, f, MX, y, CW, BLUE_INFO,
      L.boxSize, L.lhBox, L.boxOverhead, L.boxGap, L.bodyOffset);
  }
  if (mod.limitation && tx(mod.limitation).trim()) {
    y = infoBox(page, "LIMITIERUNG", mod.limitation, f, MX, y, CW, ACCENT,
      L.boxSize, L.lhBox, L.boxOverhead, L.boxGap, L.bodyOffset);
  }
  if (mod.recommendation && tx(mod.recommendation).trim()) {
    y = infoBox(page, "NÄCHSTER SCHRITT", mod.recommendation, f, MX, y, CW, SC_GREEN,
      L.boxSize, L.lhBox, L.boxOverhead, L.boxGap, L.bodyOffset);
  }

  // ── Stat boxes ────────────────────────────────────────────────────────
  if (metrics.length > 0) {
    y -= 8;
    secLabel(page, "KENNWERTE", f, MX, y);
    y -= 18;
    statBoxes(page, metrics, f, y);
  }

  pageFooter(page, f, today);
}

// ── Page 8: Disclaimer ─────────────────────────────────────────────────────

function buildDisclaimer(
  doc: PDFDocument,
  content: PdfReportContent,
  f: F,
  today: string,
): void {
  const page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, today);
  y -= 28;

  page.drawText("RECHTLICHER HINWEIS", { x: MX, y, size: 20, font: f.bold, color: TXT_WHITE });
  y -= 30;
  page.drawText("KEINE MEDIZINISCHE DIAGNOSE", { x: MX, y, size: 14, font: f.bold, color: ACCENT });
  y -= 24;
  page.drawText("PERFORMANCE-INSIGHTS  |  KEIN ERSATZ FÜR ÄRZTLICHE BERATUNG", {
    x: MX, y, size: 7.5, font: f.bold, color: TXT_MUTED,
  });
  y -= 30;

  // Horizontal rule
  page.drawLine({ start: { x: MX, y }, end: { x: PW - MX, y }, thickness: 0.5, color: BORDER_C });
  y -= 24;

  y = drawW(page, content.disclaimer, MX, y, CW, f.reg, 10.5, TXT_WHITE, 1.75);
  y -= 20;

  y = drawW(
    page,
    "Alle Angaben basieren auf selbstberichteten Daten und modellbasierten Berechnungen nach IPAQ, NSF/AASM, WHO und ACSM Leitlinien. VO2max ist eine algorithmische Schätzung nach dem Jackson Non-Exercise Prediction Model. Dieses Dokument stellt keine Heilaussagen dar und ist kein Medizinprodukt im Sinne der MDR.",
    MX, y, CW, f.reg, 10.5, TXT_WHITE, 1.75,
  );
  y -= 20;

  y = drawW(
    page,
    "Dieser Report wurde auf Basis wissenschaftlicher Scoring-Modelle erstellt. Er ersetzt keine ärztliche Untersuchung, keine Labordiagnostik und keine individualisierte medizinische Beratung. Wende dich bei gesundheitlichen Beschwerden oder spezifischen Fragen an einen qualifizierten Arzt oder Therapeuten.",
    MX, y, CW, f.reg, 10.5, TXT_WHITE, 1.75,
  );
  y -= 36;

  // Contact line
  page.drawText(`INFO@BOOSTTHEBEAST.COM  |  MODELL v1.0.0  |  ${today}`, {
    x: MX, y, size: 7.5, font: f.reg, color: TXT_MUTED,
  });

  pageFooter(page, f, today);
}

// ── Main export ────────────────────────────────────────────────────────────

export async function generatePDF(
  content: PdfReportContent,
  scores: PdfScores,
  user: PdfUserProfile,
): Promise<Uint8Array> {
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Berlin",
  });

  const doc = await PDFDocument.create();
  const reg  = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const f: F = { reg, bold };

  const logoBytes = Buffer.from(LOGO_WHITE_PNG_BASE64, "base64");
  const logo = await doc.embedPng(logoBytes);

  doc.setTitle("BTB Performance Intelligence Report");
  doc.setAuthor("BOOST THE BEAST LAB");
  doc.setCreationDate(new Date());

  // Page 1 — Cover
  buildCover(doc, content, scores, user, f, today, logo);

  // Page 2 — Summary / Gesamtbild
  buildSummary(doc, content, scores, user, f, today);

  // Pages 3–7 — Module pages
  buildModule(doc, "ACTIVITY", scores.activity.score, scores.activity.band,
    content.modules.activity,
    [
      ["MET-Minuten / Woche", String(scores.total_met)],
      ...(scores.training_days != null
        ? [["Trainingstage / Woche", String(scores.training_days)] as [string, string]]
        : []),
      ...(scores.sitting_hours != null
        ? [["Sitzzeit / Tag", `${scores.sitting_hours} h`] as [string, string]]
        : []),
    ],
    f, today,
  );

  buildModule(doc, "SLEEP", scores.sleep.score, scores.sleep.band,
    content.modules.sleep,
    [
      ["Schlafdauer", `${scores.sleep_duration_hours} h / Nacht`],
      ["Recovery Score", `${scores.recovery.score} / 100`],
    ],
    f, today,
  );

  buildModule(doc, "VO2MAX", scores.vo2max.score, scores.vo2max.band,
    content.modules.vo2max,
    [
      ["Geschätzter VO2max", `${scores.vo2max.estimated} ml/kg/min`],
      ["Fitness-Level", tx(scores.vo2max.band).toUpperCase()],
    ],
    f, today,
  );

  buildModule(doc, "METABOLIC", scores.metabolic.score, scores.metabolic.band,
    content.modules.metabolic,
    [
      ["BMI", `${user.bmi} kg/m2`],
      ["Kategorie", tx(user.bmi_category)],
    ],
    f, today,
  );

  buildModule(doc, "STRESS", scores.stress.score, scores.stress.band,
    content.modules.stress,
    [
      ["Stressband", tx(scores.stress.band).toUpperCase()],
      ["Handlungsbedarf", scores.stress.score < 40 ? "HOCH" : scores.stress.score < 65 ? "MODERAT" : "GERING"],
      ["Recovery Score", `${scores.recovery.score} / 100`],
    ],
    f, today,
  );

  // Page 8 — Disclaimer
  buildDisclaimer(doc, content, f, today);

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}
