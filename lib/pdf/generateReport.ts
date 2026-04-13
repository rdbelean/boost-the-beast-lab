// Server-side PDF generation via pdf-lib (pure JavaScript).
// No native dependencies — works reliably on Vercel serverless functions.

import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont, type Color } from "pdf-lib";

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
const MX = 48;       // horizontal margin
const CW = PW - MX * 2; // content width ≈ 499 pt

// ── Colour palette ─────────────────────────────────────────────────────────

const ACCENT     = rgb(0.902, 0.196, 0.133);   // #E63222 — BTB red
const BG_COVER   = rgb(0.051, 0.051, 0.055);   // #0D0D0E — near-black
const BG_PAGE    = rgb(0.176, 0.176, 0.188);   // ~RGB(45,45,48) — warm dark grey
const BG_CARD    = rgb(0.220, 0.220, 0.235);   // slightly lighter card
const BG_INSET   = rgb(0.133, 0.133, 0.145);   // progress track / inset
const BG_STAT    = rgb(0.110, 0.110, 0.122);   // stat box background
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
    if (y < 52) break;
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
  page.drawText("PERFORMANCE LAB  |  Kein Ersatz fuer medizinische Beratung", {
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
  h = 70,
): void {
  const col = scoreColor(score);

  // Card bg + top colour bar
  page.drawRectangle({ x, y: topY - h, width: w, height: h, color: BG_CARD });
  page.drawRectangle({ x, y: topY - 5, width: w, height: 5, color: col });

  // Label (below top bar)
  page.drawText(tx(label).toUpperCase(), {
    x: x + 9, y: topY - 19, size: 6, font: f.bold, color: TXT_MUTED,
  });

  // Score number
  page.drawText(String(score), {
    x: x + 9, y: topY - 44, size: 24, font: f.bold, color: col,
  });

  // Band — bottom-right, clipped to card width
  const bStr = tx(band).toUpperCase();
  const bW = Math.min(f.reg.widthOfTextAtSize(bStr, 6), w - 12);
  page.drawText(bStr, {
    x: x + w - 8 - bW, y: topY - h + 12, size: 6, font: f.reg, color: TXT_MUTED,
  });

  // Progress bar
  const barX = x + 9;
  const barW = w - 18;
  const barY = topY - h + 26;
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
): number {
  if (!text || !tx(text).trim()) return topY;

  const innerW = w - 24;   // text width (left margin 12 + bar 3 + gap 9)
  const bodyPx = textH(text, f.reg, 9.5, innerW, 1.5);
  const boxH = Math.max(50, bodyPx + 40);  // 18 top padding + 22 below label

  // Background + left bar
  page.drawRectangle({ x, y: topY - boxH, width: w, height: boxH, color: BG_CARD });
  page.drawRectangle({ x, y: topY - boxH, width: 3, height: boxH, color: barColor });

  // Label (6pt bold, 16pt from box top)
  page.drawText(tx(label).toUpperCase(), {
    x: x + 12, y: topY - 16, size: 6, font: f.bold, color: barColor,
  });

  // Body text (start 32pt from box top)
  drawW(page, text, x + 12, topY - 32, innerW, f.reg, 9.5, TXT_WHITE, 1.5);

  return topY - boxH - 10;  // 10pt gap after box
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

  for (let i = 0; i < metrics.length; i++) {
    const [key, val] = metrics[i];
    const bx = MX + i * (boxW + gap);

    page.drawRectangle({ x: bx, y: topY - boxH, width: boxW, height: boxH, color: BG_STAT });
    page.drawRectangle({ x: bx, y: topY - 3, width: boxW, height: 3, color: BORDER_C });

    // Label
    page.drawText(tx(key).toUpperCase(), {
      x: bx + 10, y: topY - 15, size: 6, font: f.bold, color: TXT_MUTED,
    });

    // Value — fit on one line, shrink if needed
    const valStr = tx(val);
    const valSize = f.bold.widthOfTextAtSize(valStr, 12) <= boxW - 20 ? 12 : 10;
    page.drawText(valStr, {
      x: bx + 10, y: topY - 36, size: valSize, font: f.bold, color: TXT_WHITE,
    });
  }
}

// ── Page 1: Cover ──────────────────────────────────────────────────────────

function buildCover(
  doc: PDFDocument,
  content: PdfReportContent,
  scores: PdfScores,
  user: PdfUserProfile,
  f: F,
  today: string,
): void {
  const page = doc.addPage([PW, PH]);
  fillBg(page, BG_COVER);
  topBar(page, 6);

  let y = PH - 54;

  // Brand header
  page.drawText("BOOST THE BEAST LAB", { x: MX, y, size: 10, font: f.bold, color: TXT_WHITE });
  y -= 16;
  page.drawText("PERFORMANCE LAB", { x: MX, y, size: 7, font: f.reg, color: ACCENT });

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
    thickness: 0.5, color: rgb(0.165, 0.165, 0.165),
  });
  page.drawText(today, { x: MX, y: fy, size: 7, font: f.reg, color: rgb(0.333, 0.333, 0.333) });
  // Truncate email line so it never overflows the right margin
  const confFull = `VERTRAULICH - NUR FUER ${tx(user.email).toUpperCase()}`;
  const confLines = wrapLines(confFull, f.reg, 6, CW);
  page.drawText(confLines[0] ?? confFull, {
    x: MX, y: fy - 14, size: 6, font: f.reg, color: rgb(0.267, 0.267, 0.267),
  });
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
  const cardH = 70;
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
    x: MX + 14, y: y - 16, size: 7, font: f.bold, color: TXT_MUTED,
  });
  page.drawText(String(scores.overall.score), {
    x: MX + 14, y: y - 50, size: 40, font: f.bold, color: oc,
  });
  page.drawText(`/100  ${tx(scores.overall.band).toUpperCase()}`, {
    x: MX + 80, y: y - 36, size: 10, font: f.reg, color: TXT_MUTED,
  });

  // Right side user meta
  const meta = `BMI ${user.bmi}  |  ${user.age} Jahre  |  ${tx(user.gender)}`;
  const metaW = f.reg.widthOfTextAtSize(meta, 9);
  page.drawText(meta, { x: PW - MX - metaW, y: y - 22, size: 9, font: f.reg, color: TXT_MUTED });
  const bCat = tx(user.bmi_category).toUpperCase();
  const bCatW = f.reg.widthOfTextAtSize(bCat, 7);
  page.drawText(bCat, { x: PW - MX - bCatW, y: y - 34, size: 7, font: f.reg, color: TXT_MUTED });

  y -= ovH + 14;

  // Top priority box
  const prioTH = textH(content.top_priority, f.bold, 10, CW - 26, 1.65);
  const prioH = Math.max(56, prioTH + 42);
  page.drawRectangle({ x: MX, y: y - prioH, width: CW, height: prioH, color: BG_CARD });
  page.drawRectangle({ x: MX, y: y - 5, width: CW, height: 5, color: ACCENT });
  page.drawText("TOP PRIORITAET", {
    x: MX + 12, y: y - 19, size: 7, font: f.bold, color: ACCENT,
  });
  drawW(page, content.top_priority, MX + 12, y - 33, CW - 24, f.bold, 10, TXT_WHITE, 1.65);

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
  const page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, today);

  const col = scoreColor(score);

  // ── Title row ─────────────────────────────────────────────────────────
  // Title (left, 26pt) and score number (right, 42pt) share the same baseline.
  page.drawText(tx(title).toUpperCase(), { x: MX, y, size: 26, font: f.bold, color: TXT_WHITE });
  const sStr = String(score);
  const sW = f.bold.widthOfTextAtSize(sStr, 42);
  page.drawText(sStr, { x: PW - MX - sW - 20, y, size: 42, font: f.bold, color: col });
  page.drawText("/100", { x: PW - MX - 20, y: y + 6, size: 12, font: f.reg, color: TXT_MUTED });

  // Band label — well below the 26pt title (clear the descenders + gap)
  y -= 32;
  page.drawText(tx(band).toUpperCase(), { x: MX, y, size: 7.5, font: f.reg, color: TXT_MUTED });

  // Progress bar
  y -= 14;
  page.drawRectangle({ x: MX, y, width: CW, height: 5, color: BG_INSET });
  page.drawRectangle({ x: MX, y, width: Math.max(2, (score / 100) * CW), height: 5, color: col });
  y -= 26;

  // ── EINORDNUNG ────────────────────────────────────────────────────────
  if (mod.score_context) {
    y = secLabel(page, "EINORDNUNG", f, MX, y);
    y = drawW(page, mod.score_context, MX, y, CW, f.reg, 10, TXT_WHITE, 1.65);
    y -= 14;
  }

  // ── HAUPTBEFUND ───────────────────────────────────────────────────────
  const finding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  if (finding) {
    y = secLabel(page, "HAUPTBEFUND", f, MX, y);
    y = drawW(page, finding, MX, y, CW, f.bold, 10.5, TXT_WHITE, 1.65);
    y -= 14;
  }

  // ── Info boxes ────────────────────────────────────────────────────────
  const systemic = mod.systemic_connection ?? mod.systemic_impact ?? "";
  if (systemic) {
    y = infoBox(page, "SYSTEMISCHE VERBINDUNG", systemic, f, MX, y, CW, BLUE_INFO);
  }
  if (mod.limitation) {
    y = infoBox(page, "LIMITIERUNG", mod.limitation, f, MX, y, CW, ACCENT);
  }
  if (mod.recommendation) {
    y = infoBox(page, "NAECHSTER SCHRITT", mod.recommendation, f, MX, y, CW, SC_GREEN);
  }

  // ── Kennwert / Stat boxes ─────────────────────────────────────────────
  if (metrics.length > 0 && y > 110) {
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
  page.drawText("PERFORMANCE-INSIGHTS  |  KEIN ERSATZ FUER AERZTLICHE BERATUNG", {
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
    "Alle Angaben basieren auf selbstberichteten Daten und modellbasierten Berechnungen nach IPAQ, NSF/AASM, WHO und ACSM Leitlinien. VO2max ist eine algorithmische Schaetzung nach dem Jackson Non-Exercise Prediction Model. Dieses Dokument stellt keine Heilaussagen dar und ist kein Medizinprodukt im Sinne der MDR.",
    MX, y, CW, f.reg, 10.5, TXT_WHITE, 1.75,
  );
  y -= 20;

  y = drawW(
    page,
    "Dieser Report wurde auf Basis wissenschaftlicher Scoring-Modelle erstellt. Er ersetzt keine aerztliche Untersuchung, keine Labordiagnostik und keine individualisierte medizinische Beratung. Wende dich bei gesundheitlichen Beschwerden oder spezifischen Fragen an einen qualifizierten Arzt oder Therapeuten.",
    MX, y, CW, f.reg, 10.5, TXT_WHITE, 1.75,
  );
  y -= 36;

  // Contact line
  page.drawText(`LAB@BOOSTTHEBEAST.COM  |  MODELL v1.0.0  |  ${today}`, {
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
  });

  const doc = await PDFDocument.create();
  const reg  = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const f: F = { reg, bold };

  doc.setTitle("BTB Performance Intelligence Report");
  doc.setAuthor("BOOST THE BEAST LAB");
  doc.setCreationDate(new Date());

  // Page 1 — Cover
  buildCover(doc, content, scores, user, f, today);

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
      ["Geschaetzter VO2max", `${scores.vo2max.estimated} ml/kg/min`],
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
