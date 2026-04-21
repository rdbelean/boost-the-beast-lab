// SVG-free chart primitives drawn with pdf-lib rectangles and lines.
// All charts are aggregate-based (no daily time series required).

import { type PDFPage, type PDFFont, rgb, type Color } from "pdf-lib";

const ACCENT   = rgb(0.902, 0.196, 0.133);  // #E63222
const SC_GREEN = rgb(0.133, 0.773, 0.369);  // #22C55E
const SC_ORANGE= rgb(0.945, 0.620, 0.031);  // #F59E0B
const BG_INSET = rgb(0.133, 0.133, 0.145);
const TXT_WHITE= rgb(0.933, 0.929, 0.922);
const TXT_MUTED= rgb(0.540, 0.533, 0.521);
const BG_CARD  = rgb(0.220, 0.220, 0.235);

function barColor(pct: number): Color {
  if (pct >= 0.7) return SC_GREEN;
  if (pct >= 0.4) return SC_ORANGE;
  return ACCENT;
}

function tx(s: string): string {
  return s
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2265\u2264\u00D7\u00B2\u00B3]/g, "")
    .replace(/[^\x00-\xFF]/g, "");
}

export interface GaugeMetric {
  label: string;
  value: number;
  min: number;
  max: number;
  target?: number;           // reference/optimal value line
  unit?: string;
  format?: (v: number) => string;
}

/**
 * Draw a horizontal gauge bar chart.
 * Returns the new y after drawing.
 */
export function drawGaugeChart(
  page: PDFPage,
  metrics: GaugeMetric[],
  f: F,
  x: number,
  y: number,
  width: number,
): number {
  if (metrics.length === 0) return y;

  const barH = 10;
  const rowH = 28;
  const labelW = 110;
  const valW = 50;
  const trackX = x + labelW;
  const trackW = width - labelW - valW - 8;

  for (const m of metrics) {
    const range = m.max - m.min;
    const pct = range > 0 ? Math.max(0, Math.min(1, (m.value - m.min) / range)) : 0;
    const col = barColor(pct);
    const valStr = m.format ? m.format(m.value) : `${m.value}${m.unit ? " " + m.unit : ""}`;
    const barY = y - rowH / 2 + barH / 2;

    // Label
    page.drawText(tx(m.label), { x, y: barY + 1, size: 7.5, font: f.reg, color: TXT_MUTED });

    // Track background
    page.drawRectangle({ x: trackX, y: barY - barH, width: trackW, height: barH, color: BG_INSET });

    // Filled bar
    const fillW = Math.max(2, pct * trackW);
    page.drawRectangle({ x: trackX, y: barY - barH, width: fillW, height: barH, color: col });

    // Target line
    if (m.target != null && range > 0) {
      const tPct = Math.max(0, Math.min(1, (m.target - m.min) / range));
      const tX = trackX + tPct * trackW;
      page.drawLine({ start: { x: tX, y: barY + 2 }, end: { x: tX, y: barY - barH - 2 }, thickness: 1.5, color: TXT_WHITE });
    }

    // Value
    page.drawText(tx(valStr), { x: trackX + trackW + 8, y: barY + 1, size: 7.5, font: f.bold, color: col });

    y -= rowH;
  }

  return y;
}

export interface F { reg: PDFFont; bold: PDFFont }

/**
 * Draw a percentile indicator (for VO2max).
 * Returns new y after drawing.
 */
export function drawPercentileBar(
  page: PDFPage,
  label: string,
  percentile: number,      // 0-100
  value: string,
  f: F,
  x: number,
  y: number,
  width: number,
): number {
  const barH = 14;
  const pct = Math.max(0, Math.min(1, percentile / 100));
  const col = barColor(pct);

  // Section label
  page.drawText(tx(label), { x, y, size: 7.5, font: f.bold, color: TXT_MUTED });
  y -= 16;

  // Gradient track (5 segments: red → orange → yellow → light-green → green)
  const segW = width / 5;
  const segColors: Color[] = [
    rgb(0.8, 0.1, 0.1),
    ACCENT,
    SC_ORANGE,
    rgb(0.4, 0.8, 0.2),
    SC_GREEN,
  ];
  for (let i = 0; i < 5; i++) {
    page.drawRectangle({ x: x + i * segW, y: y - barH, width: segW - 1, height: barH, color: segColors[i] });
  }

  // Position marker
  const markerX = x + pct * width;
  page.drawRectangle({ x: markerX - 2, y: y - barH - 4, width: 4, height: barH + 8, color: TXT_WHITE });

  // Labels: low end, high end
  page.drawText("LOW", { x, y: y - barH - 14, size: 6.5, font: f.reg, color: TXT_MUTED });
  const hiW = f.reg.widthOfTextAtSize("ELITE", 6.5);
  page.drawText("ELITE", { x: x + width - hiW, y: y - barH - 14, size: 6.5, font: f.reg, color: TXT_MUTED });

  // Value label
  const valW = f.bold.widthOfTextAtSize(tx(value), 9);
  const valX = Math.max(x, Math.min(x + width - valW, markerX - valW / 2));
  page.drawText(tx(value), { x: valX, y: y + 6, size: 9, font: f.bold, color: col });

  return y - barH - 22;
}

/**
 * Draw a compact summary box for a module page.
 * Returns new y after drawing.
 */
export function drawChartBox(
  page: PDFPage,
  title: string,
  metrics: GaugeMetric[],
  f: F,
  x: number,
  y: number,
  width: number,
  minY: number,
): number {
  if (metrics.length === 0) return y;

  const innerH = metrics.length * 28 + 32;
  const boxH = Math.min(innerH, Math.max(0, y - minY));
  if (boxH < 40) return y;

  // Box background
  page.drawRectangle({ x, y: y - boxH, width, height: boxH, color: BG_CARD });
  page.drawRectangle({ x, y: y - 3, width, height: 3, color: rgb(0.133, 0.773, 0.369) });

  // Title
  page.drawText(tx(title).toUpperCase(), { x: x + 14, y: y - 16, size: 6.5, font: f.bold, color: SC_GREEN });

  const innerY = y - 26;
  drawGaugeChart(page, metrics, f, x + 14, innerY, width - 28);

  return y - boxH - 8;
}
