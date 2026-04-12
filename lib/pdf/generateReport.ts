// PDF generation via puppeteer-core + @sparticuz/chromium.
// Works on both local dev AND Vercel serverless:
//   - On Vercel: @sparticuz/chromium provides a Lambda-compatible Chromium binary
//   - Locally: falls back to any installed Chrome/Chromium

import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export interface PdfModule {
  interpretation?: string;
  score_context?: string;
  main_finding?: string;
  limitation?: string;
  recommendation?: string;
}

export interface PdfReportContent {
  headline: string;
  executive_summary: string;
  modules: {
    activity: PdfModule;
    sleep: PdfModule;
    metabolic: PdfModule;
    stress: PdfModule;
    vo2max: PdfModule;
  };
  top_priority: string;
  prognose_30_days: string;
  disclaimer: string;
}

export interface PdfScores {
  activity: { score: number; band: string };
  sleep: { score: number; band: string };
  vo2max: { score: number; band: string; estimated: number };
  metabolic: { score: number; band: string };
  stress: { score: number; band: string };
  overall: { score: number; band: string };
  total_met: number;
  sleep_duration_hours: number;
}

export interface PdfUserProfile {
  email: string;
  age: number;
  gender: string;
  bmi: number;
  bmi_category: string;
}

function scoreColor(score: number): string {
  if (score < 40) return "#E63222";
  if (score < 65) return "#F59E0B";
  if (score < 85) return "#EAB308";
  return "#22C55E";
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function moduleSection(
  title: string,
  score: number,
  band: string,
  mod: PdfModule,
  metricsTable: string,
): string {
  const color = scoreColor(score);
  return `
  <section class="page module">
    <div class="module-head">
      <div class="module-title-row">
        <div class="module-title">${esc(title)}</div>
        <div class="module-score" style="color:${color}">${score}<span class="module-score-sub">/100</span></div>
      </div>
      <div class="module-band">${esc(band)}</div>
      <div class="module-bar"><div class="module-bar-fill" style="width:${score}%;background:${color}"></div></div>
    </div>
    <p class="context">${esc(mod.score_context ?? mod.interpretation ?? "")}</p>
    <p class="finding">${esc(mod.main_finding ?? "")}</p>
    <div class="row row-warn">
      <span class="icon icon-warn">!</span>
      <div><div class="row-label">LIMITIERUNG</div>${esc(mod.limitation ?? "")}</div>
    </div>
    <div class="row row-ok">
      <span class="icon icon-ok">→</span>
      <div><div class="row-label">NÄCHSTER SCHRITT</div>${esc(mod.recommendation ?? "")}</div>
    </div>
    ${metricsTable ? `<div class="metrics">${metricsTable}</div>` : ""}
  </section>
  `;
}

function buildHtml(
  content: PdfReportContent,
  scores: PdfScores,
  user: PdfUserProfile,
): string {
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scoreCard = (label: string, score: number, band: string) => `
    <div class="score-card">
      <div class="sc-label">${esc(label)}</div>
      <div class="sc-value" style="color:${scoreColor(score)}">${score}</div>
      <div class="sc-bar"><div class="sc-fill" style="width:${score}%;background:${scoreColor(score)}"></div></div>
      <div class="sc-band">${esc(band)}</div>
    </div>
  `;

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0D0D0F; color: #FFFFFF; font-family: Georgia, "Times New Roman", serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; padding: 22mm 20mm; page-break-after: always; position: relative; }
  .page:last-child { page-break-after: auto; }

  /* Cover */
  .cover .brand { font-family: Arial, Helvetica, sans-serif; font-size: 14px; letter-spacing: 0.3em; color: #fff; text-transform: uppercase; }
  .cover .brand-sub { font-size: 10px; color: #E63222; letter-spacing: 0.2em; margin-top: 4px; text-transform: uppercase; }
  .cover .hero { margin-top: 70mm; font-family: Arial Black, Impact, sans-serif; font-size: 72px; line-height: 1.02; font-weight: 900; letter-spacing: -0.02em; }
  .cover .hero span { display: block; }
  .cover .headline { margin-top: 28px; font-size: 18px; color: #A0A0AA; font-family: Helvetica, Arial, sans-serif; max-width: 140mm; line-height: 1.45; }
  .cover .meta { position: absolute; bottom: 22mm; left: 20mm; font-size: 10px; color: #6b6b72; letter-spacing: 0.1em; }
  .cover .big-score { position: absolute; bottom: 18mm; right: 20mm; font-family: Arial Black, Impact, sans-serif; font-size: 120px; color: #E63222; opacity: 0.18; line-height: 1; }

  /* Summary */
  .section-label { font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.25em; color: #E63222; text-transform: uppercase; margin-bottom: 14px; }
  .summary p { font-family: Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.8; color: #D4D4D8; }
  .score-grid { display: flex; gap: 10px; margin-top: 28px; }
  .score-card { flex: 1; background: #16161A; border: 1px solid #2a2a2f; border-radius: 6px; padding: 14px 10px; }
  .sc-label { font-size: 9px; color: #8a8a92; letter-spacing: 0.2em; text-transform: uppercase; }
  .sc-value { font-size: 36px; font-family: Arial Black, sans-serif; font-weight: 900; margin: 6px 0 4px; }
  .sc-bar { height: 4px; background: #2a2a2f; border-radius: 2px; overflow: hidden; }
  .sc-fill { height: 100%; }
  .sc-band { margin-top: 6px; font-size: 9px; color: #c5c5cc; text-transform: uppercase; letter-spacing: 0.1em; }
  .overall { margin-top: 30px; padding: 20px; background: #16161A; border-left: 3px solid #E63222; }
  .overall-label { font-size: 10px; color: #8a8a92; letter-spacing: 0.25em; text-transform: uppercase; }
  .overall-value { font-size: 60px; font-family: Arial Black, sans-serif; color: #E63222; line-height: 1; margin-top: 6px; }
  .priority { margin-top: 24px; padding: 14px 16px; border: 1.5px solid #E63222; }
  .priority-label { font-size: 9px; letter-spacing: 0.25em; color: #E63222; text-transform: uppercase; }
  .priority-text { margin-top: 6px; font-weight: 700; color: #fff; font-size: 14px; line-height: 1.5; }

  /* Module pages */
  .module-head { margin-bottom: 24px; }
  .module-title-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .module-title { font-family: Arial Black, sans-serif; font-size: 32px; letter-spacing: -0.01em; text-transform: uppercase; }
  .module-score { font-family: Arial Black, sans-serif; font-size: 56px; font-weight: 900; }
  .module-score-sub { font-size: 16px; color: #6b6b72; }
  .module-band { font-size: 10px; color: #8a8a92; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px; }
  .module-bar { margin-top: 14px; height: 4px; background: #2a2a2f; }
  .module-bar-fill { height: 100%; }
  .context { margin-top: 22px; font-size: 12px; color: #8a8a92; line-height: 1.7; font-family: Helvetica, Arial, sans-serif; }
  .finding { margin-top: 14px; font-size: 15px; color: #fff; line-height: 1.6; font-family: Helvetica, Arial, sans-serif; }
  .row { margin-top: 18px; padding: 12px 14px; background: #16161A; display: flex; gap: 12px; align-items: flex-start; font-size: 12px; line-height: 1.55; color: #d4d4d8; font-family: Helvetica, Arial, sans-serif; }
  .icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; font-weight: 700; font-size: 12px; flex-shrink: 0; }
  .icon-warn { background: #E63222; color: #fff; }
  .icon-ok { background: #22C55E; color: #000; }
  .row-label { font-size: 8px; letter-spacing: 0.25em; color: #6b6b72; text-transform: uppercase; margin-bottom: 4px; }
  .metrics { margin-top: 22px; border-top: 1px solid #2a2a2f; padding-top: 12px; }
  .metrics table { width: 100%; font-size: 10px; color: #8a8a92; font-family: Helvetica, Arial, sans-serif; }
  .metrics td { padding: 4px 0; }
  .metrics td:last-child { text-align: right; color: #fff; }

  /* Disclaimer page */
  .disclaimer-page { text-align: center; }
  .disclaimer-page h2 { margin-top: 50mm; font-family: Arial Black, sans-serif; font-size: 20px; letter-spacing: 0.1em; }
  .disclaimer-page .strong { margin-top: 12px; font-weight: 700; color: #E63222; letter-spacing: 0.1em; }
  .disclaimer-page p { margin: 20px auto; max-width: 140mm; font-size: 12px; line-height: 1.7; color: #a0a0aa; font-family: Helvetica, Arial, sans-serif; }
  .disclaimer-page .contact { margin-top: 30px; font-size: 10px; letter-spacing: 0.2em; color: #6b6b72; text-transform: uppercase; }
</style>
</head>
<body>

  <!-- COVER -->
  <section class="page cover">
    <div class="brand">BOOST THE BEAST LAB</div>
    <div class="brand-sub">PERFORMANCE LAB</div>
    <div class="hero">
      <span>PERFORMANCE</span>
      <span>INTELLIGENCE</span>
      <span>REPORT</span>
    </div>
    <div class="headline">${esc(content.headline)}</div>
    <div class="meta">${esc(today)} · VERTRAULICH — NUR FÜR ${esc(user.email.toUpperCase())}</div>
    <div class="big-score">${scores.overall.score}</div>
  </section>

  <!-- SUMMARY -->
  <section class="page summary">
    <div class="section-label">GESAMTBILD</div>
    <p>${esc(content.executive_summary)}</p>
    <div class="score-grid">
      ${scoreCard("ACTIVITY", scores.activity.score, scores.activity.band)}
      ${scoreCard("SLEEP", scores.sleep.score, scores.sleep.band)}
      ${scoreCard("VO2MAX", scores.vo2max.score, scores.vo2max.band)}
      ${scoreCard("METABOLIC", scores.metabolic.score, scores.metabolic.band)}
      ${scoreCard("STRESS", scores.stress.score, scores.stress.band)}
    </div>
    <div class="overall">
      <div class="overall-label">OVERALL PERFORMANCE INDEX</div>
      <div class="overall-value">${scores.overall.score}</div>
      <div class="sc-band">${esc(scores.overall.band)}</div>
    </div>
    <div class="priority">
      <div class="priority-label">TOP PRIORITÄT</div>
      <div class="priority-text">${esc(content.top_priority)}</div>
    </div>
  </section>

  ${moduleSection(
    "ACTIVITY",
    scores.activity.score,
    scores.activity.band,
    content.modules.activity,
    `<table>
      <tr><td>Gesamt MET-Minuten / Woche</td><td>${scores.total_met}</td></tr>
    </table>`,
  )}

  ${moduleSection(
    "SLEEP",
    scores.sleep.score,
    scores.sleep.band,
    content.modules.sleep,
    `<table>
      <tr><td>Schlafdauer</td><td>${scores.sleep_duration_hours} h</td></tr>
    </table>`,
  )}

  ${moduleSection(
    "VO2MAX",
    scores.vo2max.score,
    scores.vo2max.band,
    content.modules.vo2max,
    `<table>
      <tr><td>Geschätzter VO2max</td><td>${scores.vo2max.estimated} ml/kg/min</td></tr>
    </table>`,
  )}

  ${moduleSection(
    "METABOLIC",
    scores.metabolic.score,
    scores.metabolic.band,
    content.modules.metabolic,
    `<table>
      <tr><td>BMI</td><td>${user.bmi} (${esc(user.bmi_category)})</td></tr>
    </table>`,
  )}

  ${moduleSection(
    "STRESS",
    scores.stress.score,
    scores.stress.band,
    content.modules.stress,
    "",
  )}

  <!-- DISCLAIMER -->
  <section class="page disclaimer-page">
    <div class="section-label">RECHTLICHER HINWEIS</div>
    <h2>KEINE MEDIZINISCHE DIAGNOSE</h2>
    <div class="strong">PERFORMANCE-INSIGHTS · KEIN ERSATZ FÜR ÄRZTLICHE BERATUNG</div>
    <p>${esc(content.disclaimer)}</p>
    <p>Alle Angaben basieren auf selbstberichteten Daten und modellbasierten Berechnungen nach IPAQ, PSQI, WHO und ACSM Leitlinien. Dieses Dokument stellt keine Heilaussagen dar und ist kein Medizinprodukt im Sinne der MDR.</p>
    <div class="contact">LAB@BOOSTTHEBEAST.COM · MODELL v1.0.0 · ${esc(today)}</div>
  </section>

</body>
</html>`;
}

// On Vercel / AWS Lambda → @sparticuz/chromium (Linux binary).
// Locally (macOS / Windows) → system-installed Chrome.
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const LOCAL_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Windows
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

async function resolveChromium(): Promise<{
  executablePath: string;
  args: string[];
}> {
  if (IS_SERVERLESS) {
    return {
      executablePath: await chromium.executablePath(),
      args: chromium.args,
    };
  }
  // Local: find system Chrome
  const { access } = await import("node:fs/promises");
  for (const p of LOCAL_CHROME_PATHS) {
    try {
      await access(p);
      return {
        executablePath: p,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--font-render-hinting=none",
        ],
      };
    } catch {
      // try next
    }
  }
  throw new Error(
    "No Chrome/Chromium found locally. Install Google Chrome to generate PDFs.",
  );
}

export async function generatePDF(
  content: PdfReportContent,
  scores: PdfScores,
  user: PdfUserProfile,
): Promise<Uint8Array> {
  const html = buildHtml(content, scores, user);
  const { executablePath, args } = await resolveChromium();

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return buffer;
  } finally {
    if (browser) await browser.close();
  }
}
