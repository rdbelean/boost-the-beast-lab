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
  // Legacy aliases from older prompt versions
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

// ── Page dimensions (A4 in points) ────────────────────────────────────────

const PW = 595.28;
const PH = 841.89;
const MX = 50;        // horizontal margin
const CW = PW - MX * 2; // content width = 495.28 pt

// ── Colour palette (dark theme) ────────────────────────────────────────────
// Background: RGB(45, 45, 48) = warm dark grey as requested.

const ACCENT    = rgb(0.902, 0.196, 0.133);   // #E63222 — BTB red
const BG_COVER  = rgb(0.051, 0.051, 0.055);   // #0D0D0E — near-black cover
const BG_PAGE   = rgb(0.176, 0.176, 0.188);   // ~#2D2D30 — warm dark grey (≈ RGB 45,45,48)
const BG_CARD   = rgb(0.220, 0.220, 0.235);   // #383840 — card background
const BG_INSET  = rgb(0.133, 0.133, 0.145);   // #222224 — progress track / inset
const TXT_WHITE = rgb(0.933, 0.929, 0.922);   // #EEECEA — warm off-white
const TXT_MUTED = rgb(0.560, 0.553, 0.541);   // muted grey
const BORDER    = rgb(0.267, 0.267, 0.290);   // subtle border
const SC_GREEN  = rgb(0.133, 0.773, 0.369);   // #22C55E
const SC_ORANGE = rgb(0.945, 0.620, 0.031);   // #F59E0B
const BLUE_INFO = rgb(0.231, 0.510, 0.965);   // #3B82F6

function scoreColor(score: number): Color {
  if (score < 40) return ACCENT;    // red
  if (score < 65) return SC_ORANGE; // amber
  return SC_GREEN;                   // green
}

// ── Text utilities ─────────────────────────────────────────────────────────

function safe(s: string | undefined | null): string {
  return s ? String(s) : "";
}

// Sanitise text for WinAnsi encoding (standard PDF fonts only support Latin-1).
function tx(s: string | undefined | null): string {
  return safe(s)
    .replace(/[\u2014\u2013]/g, "-")          // em/en dash → hyphen
    .replace(/\u2026/g, "...")                 // ellipsis
    .replace(/[\u201C\u201D]/g, '"')           // smart double quotes
    .replace(/[\u2018\u2019]/g, "'")           // smart apostrophes
    .replace(/\u2192/g, "->")                  // →
    .replace(/\u2190/g, "<-")                  // ←
    .replace(/\u2022/g, "-")                   // bullet •
    .replace(/[\u2265\u2264]/g, "")            // ≥ ≤
    .replace(/[^\x00-\xFF]/g, "");             // strip anything outside Latin-1
}

// Split text into wrapped lines that fit within maxW.
function wrapLines(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
): string[] {
  const result: string[] = [];
  const sanitised = tx(text);
  if (!sanitised.trim()) return result;

  for (const para of sanitised.split("\n")) {
    if (!para.trim()) {
      result.push("");
      continue;
    }
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

// Draw wrapped text; returns new y (decremented) after the last line.
function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxW: number,
  font: PDFFont,
  size: number,
  color: Color,
  lhMul = 1.55,
): number {
  const lh = size * lhMul;
  for (const line of wrapLines(text, font, size, maxW)) {
    if (y < 48) break; // clamp to avoid drawing below page
    page.drawText(line, { x, y, size, font, color });
    y -= lh;
  }
  return y;
}

// Estimate height that drawWrapped() would consume (without drawing).
function textH(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
  lhMul = 1.55,
): number {
  return wrapLines(text, font, size, maxW).length * size * lhMul;
}

// ── Drawing helpers ────────────────────────────────────────────────────────

interface F { reg: PDFFont; bold: PDFFont }

function fillBg(page: PDFPage, color: Color): void {
  page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color });
}

function topAccentBar(page: PDFPage, h = 5): void {
  page.drawRectangle({ x: 0, y: PH - h, width: PW, height: h, color: ACCENT });
}

// Draw the standard content-page chrome (bg, accent bar, brand header).
// Returns the y coordinate where page content should begin.
function contentHeader(page: PDFPage, f: F, today: string): number {
  fillBg(page, BG_PAGE);
  topAccentBar(page);
  const y = PH - 44;
  page.drawText("BOOST THE BEAST LAB", {
    x: MX, y, size: 7, font: f.bold, color: TXT_MUTED,
  });
  const tw = f.reg.widthOfTextAtSize(today, 7);
  page.drawText(today, { x: PW - MX - tw, y, size: 7, font: f.reg, color: TXT_MUTED });
  const lineY = y - 10;
  page.drawLine({
    start: { x: MX, y: lineY },
    end: { x: PW - MX, y: lineY },
    thickness: 1.5, color: ACCENT,
  });
  return lineY - 16;
}

function contentFooter(page: PDFPage, f: F, today: string): void {
  const fy = 30;
  page.drawLine({
    start: { x: MX, y: fy + 12 },
    end: { x: PW - MX, y: fy + 12 },
    thickness: 0.5, color: BORDER,
  });
  page.drawText("PERFORMANCE LAB  |  Kein Ersatz fuer medizinische Beratung", {
    x: MX, y: fy, size: 7, font: f.reg, color: TXT_MUTED,
  });
  const tw = f.reg.widthOfTextAtSize(today, 7);
  page.drawText(today, { x: PW - MX - tw, y: fy, size: 7, font: f.reg, color: TXT_MUTED });
}

function sectionLabel(
  page: PDFPage,
  label: string,
  f: F,
  x: number,
  y: number,
): number {
  page.drawText(tx(label).toUpperCase(), {
    x, y, size: 7.5, font: f.bold, color: ACCENT,
  });
  return y - 14;
}

// Small score card (used in summary grid).
function scoreCard(
  page: PDFPage,
  label: string,
  score: number,
  band: string,
  f: F,
  x: number,
  topY: number,
  w: number,
  h = 65,
): void {
  const col = scoreColor(score);
  page.drawRectangle({ x, y: topY - h, width: w, height: h, color: BG_CARD });
  page.drawRectangle({ x, y: topY - 4, width: w, height: 4, color: col });
  page.drawText(tx(label).toUpperCase(), {
    x: x + 8, y: topY - 17, size: 6, font: f.bold, color: TXT_MUTED,
  });
  page.drawText(String(score), {
    x: x + 8, y: topY - 38, size: 22, font: f.bold, color: col,
  });
  const bStr = tx(band).toUpperCase();
  const bW = f.reg.widthOfTextAtSize(bStr, 6);
  page.drawText(bStr, {
    x: x + w - 8 - bW, y: topY - h + 10, size: 6, font: f.reg, color: TXT_MUTED,
  });
  // Mini progress bar
  const barX = x + 8;
  const barW = w - 16;
  const barY = topY - h + 22;
  page.drawRectangle({ x: barX, y: barY, width: barW, height: 3, color: BG_INSET });
  page.drawRectangle({
    x: barX, y: barY,
    width: Math.max(1, (score / 100) * barW),
    height: 3, color: col,
  });
}

// Labelled info box with a left-edge colour bar.
// Returns the y coordinate after the box + gap.
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
  const bodyH = textH(text, f.reg, 9.5, w - 22, 1.55);
  const boxH = Math.max(46, bodyH + 36);
  page.drawRectangle({ x, y: topY - boxH, width: w, height: boxH, color: BG_CARD });
  page.drawRectangle({ x, y: topY - boxH, width: 3, height: boxH, color: barColor });
  page.drawText(tx(label).toUpperCase(), {
    x: x + 10, y: topY - 14, size: 6, font: f.bold, color: barColor,
  });
  drawWrapped(page, text, x + 10, topY - 27, w - 22, f.reg, 9.5, TXT_WHITE, 1.55);
  return topY - boxH - 8;
}

// ── Page builders ──────────────────────────────────────────────────────────

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
  topAccentBar(page, 6);

  let y = PH - 52;

  // Brand
  page.drawText("BOOST THE BEAST LAB", { x: MX, y, size: 10, font: f.bold, color: TXT_WHITE });
  y -= 15;
  page.drawText("PERFORMANCE LAB", { x: MX, y, size: 7, font: f.reg, color: ACCENT });

  // Hero title (3 lines)
  y -= 60;
  page.drawText("PERFORMANCE", { x: MX, y, size: 44, font: f.bold, color: TXT_WHITE });
  y -= 50;
  page.drawText("INTELLIGENCE", { x: MX, y, size: 44, font: f.bold, color: TXT_WHITE });
  y -= 50;
  page.drawText("REPORT", { x: MX, y, size: 44, font: f.bold, color: TXT_WHITE });

  // User info line
  y -= 30;
  const info = `Performance Report - ${user.age} Jahre, ${tx(user.gender)} | Overall: ${scores.overall.score}/100 (${tx(scores.overall.band)})`;
  y = drawWrapped(page, info, MX, y, CW * 0.68, f.reg, 11, rgb(0.580, 0.573, 0.561));

  // Headline from AI
  if (content.headline) {
    y -= 8;
    y = drawWrapped(page, content.headline, MX, y, CW * 0.68, f.reg, 9, rgb(0.440, 0.433, 0.421));
  }

  // Big watermark score (bottom-right, semi-transparent)
  const sStr = String(scores.overall.score);
  const sW = f.bold.widthOfTextAtSize(sStr, 108);
  page.drawText(sStr, {
    x: PW - MX - sW, y: 72,
    size: 108, font: f.bold, color: ACCENT, opacity: 0.12,
  });

  // Footer line
  const fy = 48;
  page.drawLine({
    start: { x: MX, y: fy + 14 },
    end: { x: PW - MX, y: fy + 14 },
    thickness: 0.5, color: rgb(0.165, 0.165, 0.165),
  });
  page.drawText(today, { x: MX, y: fy, size: 7, font: f.reg, color: rgb(0.333, 0.333, 0.333) });
  page.drawText(`VERTRAULICH - NUR FUER ${tx(user.email).toUpperCase()}`, {
    x: MX, y: fy - 14, size: 6, font: f.reg, color: rgb(0.267, 0.267, 0.267),
  });
}

function buildSummary(
  doc: PDFDocument,
  content: PdfReportContent,
  scores: PdfScores,
  user: PdfUserProfile,
  f: F,
  today: string,
): void {
  const page = doc.addPage([PW, PH]);
  let y = contentHeader(page, f, today);

  y = sectionLabel(page, "GESAMTBILD", f, MX, y);
  y -= 4;

  // Executive summary
  y = drawWrapped(page, content.executive_summary, MX, y, CW, f.reg, 10, TXT_WHITE, 1.6);
  y -= 14;

  // Score grid: 5 cards
  const gap = 8;
  const cardW = (CW - 4 * gap) / 5;
  const cardH = 66;
  const entries: Array<[string, PdfScoreEntry]> = [
    ["ACTIVITY", scores.activity],
    ["SLEEP", scores.sleep],
    ["VO2MAX", scores.vo2max],
    ["METABOLIC", scores.metabolic],
    ["STRESS", scores.stress],
  ];
  for (let i = 0; i < entries.length; i++) {
    const [label, entry] = entries[i];
    scoreCard(page, label, entry.score, entry.band, f, MX + i * (cardW + gap), y, cardW, cardH);
  }
  y -= cardH + 12;

  // Overall index box
  const overallH = 64;
  const oc = scoreColor(scores.overall.score);
  page.drawRectangle({ x: MX, y: y - overallH, width: CW, height: overallH, color: BG_CARD });
  page.drawRectangle({ x: MX, y: y - overallH, width: 4, height: overallH, color: ACCENT });
  page.drawText("OVERALL PERFORMANCE INDEX", {
    x: MX + 14, y: y - 15, size: 7, font: f.bold, color: TXT_MUTED,
  });
  page.drawText(String(scores.overall.score), {
    x: MX + 14, y: y - 47, size: 38, font: f.bold, color: oc,
  });
  page.drawText(`/100  ${tx(scores.overall.band).toUpperCase()}`, {
    x: MX + 76, y: y - 33, size: 10, font: f.reg, color: TXT_MUTED,
  });
  // Right-side user meta
  const meta = `BMI ${user.bmi}  |  ${user.age} Jahre  |  ${tx(user.gender)}`;
  const metaW = f.reg.widthOfTextAtSize(meta, 9);
  page.drawText(meta, { x: PW - MX - metaW, y: y - 22, size: 9, font: f.reg, color: TXT_MUTED });
  const bmiCat = tx(user.bmi_category).toUpperCase();
  const bcW = f.reg.widthOfTextAtSize(bmiCat, 7);
  page.drawText(bmiCat, { x: PW - MX - bcW, y: y - 34, size: 7, font: f.reg, color: TXT_MUTED });
  y -= overallH + 12;

  // Top priority box
  const prioTH = textH(content.top_priority, f.bold, 10, CW - 24, 1.6);
  const prioH = Math.max(52, prioTH + 38);
  page.drawRectangle({ x: MX, y: y - prioH, width: CW, height: prioH, color: BG_CARD });
  page.drawRectangle({ x: MX, y: y - 4, width: CW, height: 4, color: ACCENT });
  page.drawText("TOP PRIORITAET", {
    x: MX + 10, y: y - 17, size: 7, font: f.bold, color: ACCENT,
  });
  drawWrapped(page, content.top_priority, MX + 10, y - 30, CW - 22, f.bold, 10, TXT_WHITE, 1.6);

  contentFooter(page, f, today);
}

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
  let y = contentHeader(page, f, today);

  const col = scoreColor(score);

  // Module title (left) + score number (right)
  page.drawText(tx(title).toUpperCase(), { x: MX, y, size: 26, font: f.bold, color: TXT_WHITE });
  const sStr = String(score);
  const sW = f.bold.widthOfTextAtSize(sStr, 40);
  page.drawText(sStr, { x: PW - MX - sW - 22, y, size: 40, font: f.bold, color: col });
  page.drawText("/100", { x: PW - MX - 22, y: y + 4, size: 12, font: f.reg, color: TXT_MUTED });

  y -= 14;
  page.drawText(tx(band).toUpperCase(), { x: MX, y, size: 7, font: f.reg, color: TXT_MUTED });

  // Score progress bar
  y -= 10;
  page.drawRectangle({ x: MX, y, width: CW, height: 4, color: BG_INSET });
  page.drawRectangle({
    x: MX, y, width: Math.max(2, (score / 100) * CW), height: 4, color: col,
  });
  y -= 20;

  // Score context
  if (mod.score_context) {
    y = sectionLabel(page, "EINORDNUNG", f, MX, y);
    y = drawWrapped(page, mod.score_context, MX, y - 2, CW, f.reg, 10, TXT_WHITE, 1.6);
    y -= 10;
  }

  // Key finding
  const finding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  if (finding) {
    y = sectionLabel(page, "HAUPTBEFUND", f, MX, y);
    y = drawWrapped(page, finding, MX, y - 2, CW, f.bold, 10.5, TXT_WHITE, 1.6);
    y -= 10;
  }

  // Systemic connection (blue box)
  const systemic = mod.systemic_connection ?? mod.systemic_impact ?? "";
  if (systemic) {
    y = infoBox(page, "SYSTEMISCHE VERBINDUNG", systemic, f, MX, y, CW, BLUE_INFO);
  }

  // Limitation (red/accent box)
  if (mod.limitation) {
    y = infoBox(page, "LIMITIERUNG", mod.limitation, f, MX, y, CW, ACCENT);
  }

  // Recommendation (green box)
  if (mod.recommendation) {
    y = infoBox(page, "NAECHSTER SCHRITT", mod.recommendation, f, MX, y, CW, SC_GREEN);
  }

  // Metrics table
  if (metrics.length > 0) {
    y -= 4;
    page.drawLine({
      start: { x: MX, y }, end: { x: PW - MX, y }, thickness: 0.5, color: BORDER,
    });
    y -= 14;
    for (const [key, val] of metrics) {
      if (y < 62) break;
      page.drawText(tx(key), { x: MX, y, size: 9, font: f.reg, color: TXT_MUTED });
      const vW = f.bold.widthOfTextAtSize(tx(val), 9);
      page.drawText(tx(val), { x: PW - MX - vW, y, size: 9, font: f.bold, color: TXT_WHITE });
      y -= 16;
    }
  }

  contentFooter(page, f, today);
}

function buildDisclaimer(
  doc: PDFDocument,
  content: PdfReportContent,
  f: F,
  today: string,
): void {
  const page = doc.addPage([PW, PH]);
  let y = contentHeader(page, f, today);
  y -= 32;

  page.drawText("RECHTLICHER HINWEIS", { x: MX, y, size: 18, font: f.bold, color: TXT_WHITE });
  y -= 28;
  page.drawText("KEINE MEDIZINISCHE DIAGNOSE", { x: MX, y, size: 13, font: f.bold, color: ACCENT });
  y -= 22;
  page.drawText("PERFORMANCE-INSIGHTS  |  KEIN ERSATZ FUER AERZTLICHE BERATUNG", {
    x: MX, y, size: 7, font: f.bold, color: TXT_MUTED,
  });
  y -= 26;

  y = drawWrapped(page, content.disclaimer, MX, y, CW, f.reg, 10, TXT_WHITE, 1.75);
  y -= 18;
  y = drawWrapped(
    page,
    "Alle Angaben basieren auf selbstberichteten Daten und modellbasierten Berechnungen nach IPAQ, NSF/AASM, WHO und ACSM Leitlinien. VO2max ist eine algorithmische Schaetzung (Jackson Non-Exercise Prediction). Dieses Dokument stellt keine Heilaussagen dar und ist kein Medizinprodukt im Sinne der MDR.",
    MX, y, CW, f.reg, 10, TXT_WHITE, 1.75,
  );
  y -= 30;
  page.drawText(`LAB@BOOSTTHEBEAST.COM  |  MODELL v1.0.0  |  ${today}`, {
    x: MX, y, size: 7, font: f.reg, color: TXT_MUTED,
  });

  contentFooter(page, f, today);
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

  // Pages 3–7 — One page per score module
  buildModule(doc, "ACTIVITY", scores.activity.score, scores.activity.band,
    content.modules.activity,
    [
      ["Gesamt MET-Minuten / Woche", String(scores.total_met)],
      ...(scores.sitting_hours != null
        ? [["Sitzzeit / Tag", `${scores.sitting_hours} h`] as [string, string]]
        : []),
      ...(scores.training_days != null
        ? [["Trainingseinheiten / Woche", String(scores.training_days)] as [string, string]]
        : []),
    ],
    f, today,
  );

  buildModule(doc, "SLEEP", scores.sleep.score, scores.sleep.band,
    content.modules.sleep,
    [
      ["Schlafdauer", `${scores.sleep_duration_hours} h / Nacht`],
      ["Recovery Score", `${scores.recovery.score}/100 (${tx(scores.recovery.band)})`],
    ],
    f, today,
  );

  buildModule(doc, "VO2MAX", scores.vo2max.score, scores.vo2max.band,
    content.modules.vo2max,
    [["Geschaetzter VO2max", `${scores.vo2max.estimated} ml/kg/min`]],
    f, today,
  );

  buildModule(doc, "METABOLIC", scores.metabolic.score, scores.metabolic.band,
    content.modules.metabolic,
    [["BMI", `${user.bmi} (${tx(user.bmi_category)})`]],
    f, today,
  );

  buildModule(doc, "STRESS", scores.stress.score, scores.stress.band,
    content.modules.stress,
    [],
    f, today,
  );

  // Page 8 — Disclaimer
  buildDisclaimer(doc, content, f, today);

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}
