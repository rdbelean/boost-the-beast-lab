// Server-side PDF generation via pdf-lib (pure JavaScript).
// No native dependencies — works reliably on Vercel serverless functions.

import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont, type PDFImage, type Color } from "pdf-lib";
import { LOGO_WHITE_PNG_BASE64 } from "./logo";
import type { Locale } from "@/lib/supabase/types";

// Single-invocation state for the locale. `generatePDF` sets this at entry
// so internal helpers (pageFooter, buildCover, etc.) can read localized
// labels without threading `locale` through every signature. Fine for
// Vercel serverless (one invocation per request, no concurrent mutation).
let currentLocale: Locale = "de";

// Localized labels used by the PDF generator. Claude-generated narrative
// is already in the target language when the caller provides `locale`;
// this table handles only the STRUCTURAL PDF chrome (section headers,
// metric key names, legal page, footer strip).
const PDF_LABELS: Record<Locale, {
  footerStrip: string;
  legalTitle: string;
  legalAccent: string;
  legalSub: string;
  overallIndex: string;
  gesamtbild: string;
  topPriority: string;
  metKey: string;
  trainingDaysKey: string;
  sittingKey: string;
  sleepDuration: string;
  sleepDurationValue: (h: number) => string;
  recoveryScore: string;
  vo2Estimated: string;
  fitnessLevel: string;
  bmiKey: string;
  bmiCategory: string;
  stressBand: string;
  actionNeed: string;
  actionHigh: string;
  actionModerate: string;
  actionLow: string;
  dateLocale: string;
}> = {
  de: {
    footerStrip: "PERFORMANCE LAB  |  Kein Ersatz für medizinische Beratung",
    legalTitle: "RECHTLICHER HINWEIS",
    legalAccent: "KEINE MEDIZINISCHE DIAGNOSE",
    legalSub: "PERFORMANCE-INSIGHTS  |  KEIN ERSATZ FÜR ÄRZTLICHE BERATUNG",
    overallIndex: "OVERALL PERFORMANCE INDEX",
    gesamtbild: "GESAMTBILD",
    topPriority: "TOP PRIORITÄT",
    metKey: "MET-Minuten / Woche",
    trainingDaysKey: "Trainingstage / Woche",
    sittingKey: "Sitzzeit / Tag",
    sleepDuration: "Schlafdauer",
    sleepDurationValue: (h) => `${h} h / Nacht`,
    recoveryScore: "Recovery Score",
    vo2Estimated: "Geschätzter VO2max",
    fitnessLevel: "Fitness-Level",
    bmiKey: "BMI",
    bmiCategory: "Kategorie",
    stressBand: "Stressband",
    actionNeed: "Handlungsbedarf",
    actionHigh: "HOCH",
    actionModerate: "MODERAT",
    actionLow: "GERING",
    dateLocale: "de-DE",
  },
  en: {
    footerStrip: "PERFORMANCE LAB  |  Not a substitute for medical advice",
    legalTitle: "LEGAL NOTICE",
    legalAccent: "NOT A MEDICAL DIAGNOSIS",
    legalSub: "PERFORMANCE INSIGHTS  |  NOT A SUBSTITUTE FOR MEDICAL ADVICE",
    overallIndex: "OVERALL PERFORMANCE INDEX",
    gesamtbild: "BIG PICTURE",
    topPriority: "TOP PRIORITY",
    metKey: "MET minutes / week",
    trainingDaysKey: "Training days / week",
    sittingKey: "Sitting time / day",
    sleepDuration: "Sleep duration",
    sleepDurationValue: (h) => `${h} h / night`,
    recoveryScore: "Recovery Score",
    vo2Estimated: "Estimated VO2max",
    fitnessLevel: "Fitness level",
    bmiKey: "BMI",
    bmiCategory: "Category",
    stressBand: "Stress band",
    actionNeed: "Action needed",
    actionHigh: "HIGH",
    actionModerate: "MODERATE",
    actionLow: "LOW",
    dateLocale: "en-GB",
  },
  it: {
    footerStrip: "PERFORMANCE LAB  |  Non sostituisce la consulenza medica",
    legalTitle: "AVVISO LEGALE",
    legalAccent: "NON È UNA DIAGNOSI MEDICA",
    legalSub: "PERFORMANCE INSIGHT  |  NON SOSTITUISCE LA CONSULENZA MEDICA",
    overallIndex: "OVERALL PERFORMANCE INDEX",
    gesamtbild: "QUADRO GENERALE",
    topPriority: "PRIORITÀ PRINCIPALE",
    metKey: "MET-minuti / settimana",
    trainingDaysKey: "Giorni di allenamento / settimana",
    sittingKey: "Tempo seduto / giorno",
    sleepDuration: "Durata del sonno",
    sleepDurationValue: (h) => `${h} h / notte`,
    recoveryScore: "Recovery Score",
    vo2Estimated: "VO2max stimato",
    fitnessLevel: "Livello di fitness",
    bmiKey: "BMI",
    bmiCategory: "Categoria",
    stressBand: "Band dello stress",
    actionNeed: "Azione richiesta",
    actionHigh: "ALTA",
    actionModerate: "MODERATA",
    actionLow: "BASSA",
    dateLocale: "it-IT",
  },
};

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

export interface PdfFinding {
  type: "weakness" | "strength" | "connection";
  headline: string;
  body: string;
  related_dimension?: string;
}

export interface PdfCrossInsight {
  dimension_a: string;
  dimension_b: string;
  headline: string;
  body: string;
}

export interface PdfGoal {
  headline: string;
  current_value: string;
  target_value: string;
  delta_pct?: string;
  metric_source: string;
  week_milestones: Array<{ week: string; task: string; milestone: string }>;
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
  // Premium personalization (optional — omitted = no premium sections)
  executive_findings?: PdfFinding[];
  cross_insights?: PdfCrossInsight[];
  action_plan?: PdfGoal[];
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
  page.drawText(PDF_LABELS[currentLocale].footerStrip, {
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
    // 15 (secLabel) + 10 (tight after-heading gap) + textH + sectionGap
    h += 15 + 10 + textH(mod.score_context, f.reg, L.bodySize, CW, L.lhBody) + L.sectionGap;
  }

  const finding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  if (finding) {
    // 12 (pre-heading boost) + 15 (secLabel) + 10 (tight after-heading gap) + textH + sectionGap
    h += 12 + 15 + 10 + textH(finding, f.bold, L.findingSize, CW, L.lhBody) + L.sectionGap;
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
    h += 24 + 13 + 52;  // pre-gap (24) + after-heading gap (13) + stat box height
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
  heroData?: PdfHeroData,
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

  // ── Data stamp section (heroData) ─────────────────────────────────────
  if (heroData && heroData.sources.length > 0) {
    y -= 28;
    const sectionY = y;
    // Box background
    const boxH = Math.min(heroData.sources.length * 18 + 52, sectionY - 120);
    if (boxH > 40) {
      page.drawRectangle({ x: MX, y: sectionY - boxH, width: CW * 0.65, height: boxH, color: BG_CARD });
      page.drawRectangle({ x: MX, y: sectionY - 3, width: CW * 0.65, height: 3, color: ACCENT });
      page.drawText("PERS\u00D6NLICHE DATENBASIS", {
        x: MX + 14, y: sectionY - 16, size: 6.5, font: f.bold, color: TXT_MUTED,
      });
      let sy = sectionY - 32;
      for (const src of heroData.sources.slice(0, 4)) {
        if (sy < sectionY - boxH + 12) break;
        page.drawText(tx(src.label), { x: MX + 14, y: sy, size: 8, font: f.reg, color: TXT_WHITE });
        sy -= 16;
      }
      if (heroData.period_start && heroData.period_end) {
        const per = tx(`${heroData.period_start} - ${heroData.period_end}`);
        page.drawText(per, { x: MX + 14, y: Math.max(sectionY - boxH + 14, sy), size: 7, font: f.reg, color: TXT_MUTED });
      }
      // Quality badge
      const qLabels: Record<string, string> = {
        excellent: "EXZELLENTE DATENBASIS",
        strong:    "STARKE DATENBASIS",
        good:      "GUTE DATENBASIS",
        secured:   "DATENBASIS GESICHERT",
        minimal:   "GUTE DATENBASIS",
        none:      "DATENBASIS GESICHERT",
      };
      const qColors: Record<string, Color> = {
        excellent: SC_GREEN, strong: SC_GREEN, good: SC_GREEN,
        secured: SC_GREEN, minimal: SC_GREEN, none: SC_GREEN,
      };
      const qLabel = qLabels[heroData.quality_level] ?? "DATENBASIS";
      const qColor = qColors[heroData.quality_level] ?? TXT_MUTED;
      const qW = f.bold.widthOfTextAtSize(qLabel, 7) + 18;
      const qX = MX + CW * 0.65 - qW - 8;
      const qY = sectionY - 16;
      page.drawRectangle({ x: qX, y: qY - 12, width: qW, height: 18, color: BG_INSET });
      page.drawText(qLabel, { x: qX + 9, y: qY - 6, size: 7, font: f.bold, color: qColor });
    }
  }

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
  y = secLabel(page, PDF_LABELS[currentLocale].gesamtbild, f, MX, y);

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

  page.drawText(PDF_LABELS[currentLocale].overallIndex, {
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
    page.drawText(PDF_LABELS[currentLocale].topPriority, {
      x: MX + 16, y: y - 19, size: 7, font: f.bold, color: ACCENT,
    });
    drawW(page, content.top_priority, MX + 16, y - 33, CW - 32, f.bold, 10, TXT_WHITE, 1.65);
  }

  pageFooter(page, f, today);
}

// ── Executive Findings page ────────────────────────────────────────────────

function buildExecutiveFindings(
  doc: PDFDocument,
  findings: PdfFinding[],
  f: F,
  today: string,
): void {
  if (!findings || findings.length === 0) return;
  const page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, today);

  const isDE = currentLocale !== "en";
  const title = isDE ? "DEINE 3 WICHTIGSTEN FINDINGS" : "YOUR 3 KEY FINDINGS";
  y = secLabel(page, title, f, MX, y);
  y -= 8;

  const typeColors: Record<string, Color> = { weakness: ACCENT, strength: SC_GREEN, connection: BLUE_INFO };
  const typeLabels: Record<string, [string, string]> = {
    weakness: ["SCHWACHSTELLE", "WEAKNESS"],
    strength: ["ST\u00C4RKE", "STRENGTH"],
    connection: ["ZUSAMMENHANG", "CONNECTION"],
  };

  for (let i = 0; i < Math.min(3, findings.length); i++) {
    const f2 = findings[i];
    const col = typeColors[f2.type] ?? TXT_MUTED;
    const tLabel = (typeLabels[f2.type] ?? ["FINDING", "FINDING"])[isDE ? 0 : 1];
    const bodyH = textH(f2.body, f.reg, 9.5, CW - 32, 1.6);
    const headH = textH(f2.headline, f.bold, 11, CW - 32, 1.4);
    const boxH = Math.min(Math.max(64, headH + bodyH + 46), Math.max(0, y - CB));
    if (boxH < 40) break;

    // Box
    page.drawRectangle({ x: MX, y: y - boxH, width: CW, height: boxH, color: BG_CARD });
    page.drawRectangle({ x: MX, y: y - boxH, width: 4, height: boxH, color: col });

    // Type badge
    page.drawText(`${i + 1}`, { x: MX + 14, y: y - 16, size: 9, font: f.bold, color: col });
    page.drawText(tx(tLabel), { x: MX + 28, y: y - 16, size: 6.5, font: f.bold, color: col });

    // Headline
    drawW(page, tx(f2.headline), MX + 14, y - 32, CW - 32, f.bold, 11, TXT_WHITE, 1.4);

    // Body
    const headlineLines = wrapLines(tx(f2.headline), f.bold, 11, CW - 32);
    const bodyStartY = y - 32 - headlineLines.length * 11 * 1.4 - 6;
    drawW(page, tx(f2.body), MX + 14, Math.max(y - boxH + 14, bodyStartY), CW - 32, f.reg, 9.5, TXT_MUTED, 1.6);

    y -= boxH + 10;
  }

  pageFooter(page, f, today);
}

// ── Cross-Insights page ────────────────────────────────────────────────────

function buildCrossInsightsPage(
  doc: PDFDocument,
  insights: PdfCrossInsight[],
  f: F,
  today: string,
): void {
  if (!insights || insights.length === 0) return;
  const page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, today);

  const isDE = currentLocale !== "en";
  y = secLabel(page, isDE ? "ZUSAMMENH\u00C4NGE IN DEINEN DATEN" : "CONNECTIONS IN YOUR DATA", f, MX, y);
  y -= 8;

  for (const ins of insights.slice(0, 3)) {
    const bodyH = textH(ins.body, f.reg, 10, CW - 32, 1.65);
    const boxH = Math.min(Math.max(72, bodyH + 50), Math.max(0, y - CB));
    if (boxH < 40) break;

    page.drawRectangle({ x: MX, y: y - boxH, width: CW, height: boxH, color: BG_CARD });
    page.drawRectangle({ x: MX, y: y - boxH, width: 4, height: boxH, color: BLUE_INFO });

    page.drawText(tx(ins.headline).toUpperCase(), { x: MX + 14, y: y - 16, size: 9, font: f.bold, color: BLUE_INFO });
    drawW(page, tx(ins.body), MX + 14, y - 34, CW - 32, f.reg, 10, TXT_WHITE, 1.65);

    y -= boxH + 10;
  }

  pageFooter(page, f, today);
}

// ── Action Plan page ───────────────────────────────────────────────────────

function buildActionPlanPage(
  doc: PDFDocument,
  goals: PdfGoal[],
  f: F,
  today: string,
): void {
  if (!goals || goals.length === 0) return;
  const page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, today);

  const isDE = currentLocale !== "en";
  y = secLabel(page, isDE ? "DEIN 30-TAGE PROTOKOLL" : "YOUR 30-DAY PROTOCOL", f, MX, y);
  y -= 6;

  for (let gi = 0; gi < Math.min(3, goals.length); gi++) {
    const g = goals[gi];
    const milesH = (g.week_milestones?.length ?? 0) * 16 + 8;
    const boxH = Math.min(Math.max(96, milesH + 72), Math.max(0, y - CB));
    if (boxH < 60) break;

    page.drawRectangle({ x: MX, y: y - boxH, width: CW, height: boxH, color: BG_CARD });
    page.drawRectangle({ x: MX, y: y - boxH, width: 4, height: boxH, color: SC_GREEN });

    // Goal number + headline
    page.drawText(`${isDE ? "ZIEL" : "GOAL"} ${gi + 1}`, { x: MX + 14, y: y - 16, size: 6.5, font: f.bold, color: SC_GREEN });
    page.drawText(tx(g.headline).toUpperCase(), { x: MX + 14, y: y - 30, size: 10, font: f.bold, color: TXT_WHITE });

    // IST / ZIEL / SOURCE
    const cvLabel = isDE ? "IST:" : "NOW:";
    const tvLabel = isDE ? "ZIEL:" : "TARGET:";
    const srcLabel = isDE ? "MESSBAR:" : "TRACKED:";
    page.drawText(`${cvLabel} ${tx(g.current_value)}`, { x: MX + 14, y: y - 46, size: 8, font: f.reg, color: TXT_MUTED });
    page.drawText(`${tvLabel} ${tx(g.target_value)}${g.delta_pct ? `  (${tx(g.delta_pct)})` : ""}`, { x: MX + 120, y: y - 46, size: 8, font: f.reg, color: SC_GREEN });
    page.drawText(`${srcLabel} ${tx(g.metric_source)}`, { x: MX + 14, y: y - 58, size: 7, font: f.reg, color: TXT_MUTED });

    // Week milestones — skip rows where task/week are empty (defensive)
    if (g.week_milestones && g.week_milestones.length > 0) {
      let my = y - 72;
      for (const ms of g.week_milestones.slice(0, 4)) {
        if (my < y - boxH + 12) break;
        // Skip if milestone is a raw string (malformed) or fields are empty
        if (typeof ms !== "object" || !ms.week || !ms.task) continue;
        const rowText = `${tx(ms.week)}: ${tx(ms.task)}`;
        page.drawText(rowText, { x: MX + 14, y: my, size: 7.5, font: f.reg, color: TXT_MUTED });
        const mVal = ms.milestone ? tx(ms.milestone) : "";
        if (mVal) {
          const mW = f.bold.widthOfTextAtSize(mVal, 7.5);
          page.drawText(mVal, { x: PW - MX - mW - 14, y: my, size: 7.5, font: f.bold, color: SC_GREEN });
        }
        my -= 16;
      }
    }

    y -= boxH + 8;
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
    y -= 10;  // tight gap: heading belongs to content below, not above
    y = drawW(page, mod.score_context, MX, y, CW, f.reg, L.bodySize, TXT_WHITE, L.lhBody);
    y -= L.sectionGap;
  }

  // ── HAUPTBEFUND ───────────────────────────────────────────────────────
  const finding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  if (finding) {
    y -= 12;  // extra pre-heading gap: visually separates from previous section
    y = secLabel(page, "HAUPTBEFUND", f, MX, y);
    y -= 10;  // tight gap: heading belongs to content below
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
    y -= 24;  // generous gap before heading (separates from previous section)
    secLabel(page, "KENNWERTE", f, MX, y);
    y -= 13;  // tight gap after heading (heading belongs to content below)
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

  page.drawText(PDF_LABELS[currentLocale].legalTitle, { x: MX, y, size: 20, font: f.bold, color: TXT_WHITE });
  y -= 30;
  page.drawText(PDF_LABELS[currentLocale].legalAccent, { x: MX, y, size: 14, font: f.bold, color: ACCENT });
  y -= 24;
  page.drawText(PDF_LABELS[currentLocale].legalSub, {
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

export interface PdfWearableRows {
  activity?: Array<[string, string]>;
  sleep?: Array<[string, string]>;
  vo2max?: Array<[string, string]>;
  metabolic?: Array<[string, string]>;
  stress?: Array<[string, string]>;
}

export interface PdfHeroData {
  sources: Array<{ label: string }>;
  quality_level: "excellent" | "strong" | "good" | "secured" | "minimal" | "none";
  period_start?: string;
  period_end?: string;
  total_datapoints: number;
}

export async function generatePDF(
  content: PdfReportContent,
  scores: PdfScores,
  user: PdfUserProfile,
  locale: Locale = "de",
  wearableRows?: PdfWearableRows,
  heroData?: PdfHeroData,
): Promise<Uint8Array> {
  currentLocale = locale;
  const L = PDF_LABELS[locale];
  const today = new Date().toLocaleDateString(L.dateLocale, {
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

  // Page 1 — Cover (enhanced with hero data)
  buildCover(doc, content, scores, user, f, today, logo, heroData);

  // Page 2 — Summary / Gesamtbild
  buildSummary(doc, content, scores, user, f, today);

  // Page 3 — Executive Findings (KI-generiert, optional)
  if (content.executive_findings && content.executive_findings.length > 0) {
    buildExecutiveFindings(doc, content.executive_findings, f, today);
  }

  // Pages 3–7 — Module pages
  const wr = wearableRows ?? {};

  buildModule(doc, "ACTIVITY", scores.activity.score, scores.activity.band,
    content.modules.activity,
    [
      [L.metKey, String(scores.total_met)],
      ...(scores.training_days != null
        ? [[L.trainingDaysKey, String(scores.training_days)] as [string, string]]
        : []),
      ...(scores.sitting_hours != null
        ? [[L.sittingKey, `${scores.sitting_hours} h`] as [string, string]]
        : []),
      ...(wr.activity ?? []),
    ],
    f, today,
  );

  buildModule(doc, "SLEEP", scores.sleep.score, scores.sleep.band,
    content.modules.sleep,
    [
      [L.sleepDuration, L.sleepDurationValue(scores.sleep_duration_hours)],
      [L.recoveryScore, `${scores.recovery.score} / 100`],
      ...(wr.sleep ?? []),
    ],
    f, today,
  );

  buildModule(doc, "VO2MAX", scores.vo2max.score, scores.vo2max.band,
    content.modules.vo2max,
    [
      [L.vo2Estimated, `${scores.vo2max.estimated} ml/kg/min`],
      [L.fitnessLevel, tx(scores.vo2max.band).toUpperCase()],
      ...(wr.vo2max ?? []),
    ],
    f, today,
  );

  buildModule(doc, "METABOLIC", scores.metabolic.score, scores.metabolic.band,
    content.modules.metabolic,
    [
      [L.bmiKey, `${user.bmi} kg/m2`],
      [L.bmiCategory, tx(user.bmi_category)],
      ...(wr.metabolic ?? []),
    ],
    f, today,
  );

  buildModule(doc, "STRESS", scores.stress.score, scores.stress.band,
    content.modules.stress,
    [
      [L.stressBand, tx(scores.stress.band).toUpperCase()],
      [L.actionNeed, scores.stress.score < 40 ? L.actionHigh : scores.stress.score < 65 ? L.actionModerate : L.actionLow],
      [L.recoveryScore, `${scores.recovery.score} / 100`],
      ...(wr.stress ?? []),
    ],
    f, today,
  );

  // Cross-Insights page (optional)
  if (content.cross_insights && content.cross_insights.length > 0) {
    buildCrossInsightsPage(doc, content.cross_insights, f, today);
  }

  // Action Plan page (optional)
  if (content.action_plan && content.action_plan.length > 0) {
    buildActionPlanPage(doc, content.action_plan, f, today);
  }

  // Disclaimer page
  buildDisclaimer(doc, content, f, today);

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}
