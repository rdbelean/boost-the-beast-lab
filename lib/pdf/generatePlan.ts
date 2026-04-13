// Server-side plan PDF generation via Puppeteer.
// Light-themed, professional A4 layout matching Boost The Beast Lab brand.

import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export interface PlanBlock { heading: string; items: string[] }
export interface PlanPdfInput {
  title: string;
  subtitle: string;
  source: string;
  color: string;
  blocks: PlanBlock[];
}

// ── Puppeteer bootstrap (shared with generateReport) ────────────────────────

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const LOCAL_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

async function resolveChromium(): Promise<{ executablePath: string; args: string[] }> {
  if (IS_SERVERLESS) {
    return { executablePath: await chromium.executablePath(), args: chromium.args };
  }
  const { access } = await import("node:fs/promises");
  for (const p of LOCAL_CHROME_PATHS) {
    try {
      await access(p);
      return { executablePath: p, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] };
    } catch { /* try next */ }
  }
  throw new Error("No Chrome/Chromium found. Install Google Chrome to generate PDFs.");
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── HTML Template ────────────────────────────────────────────────────────────

function buildPlanHtml(plan: PlanPdfInput): string {
  const today = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
  const accentColor = plan.color || "#E63222";

  const blockHtml = plan.blocks.map((block) => `
    <div class="block">
      <div class="block-heading" style="border-left-color:${accentColor}">${esc(block.heading)}</div>
      <ul class="block-list">
        ${block.items.map((item) => `
          <li class="block-item">
            <span class="bullet" style="color:${accentColor}">▸</span>
            <span>${esc(item)}</span>
          </li>
        `).join("")}
      </ul>
    </div>
  `).join("");

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #F4F3F0;
    color: #111111;
    font-family: Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Cover ──────────────────────────────────── */
  .cover {
    width: 210mm;
    min-height: 297mm;
    background: #111111;
    color: #FFFFFF;
    padding: 0;
    page-break-after: always;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .cover-top-bar {
    height: 6px;
    background: ${accentColor};
    width: 100%;
  }
  .cover-inner {
    padding: 24mm 22mm 22mm;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .cover-brand {
    font-size: 11px;
    letter-spacing: 0.35em;
    color: #FFFFFF;
    text-transform: uppercase;
    font-weight: 700;
  }
  .cover-brand-sub {
    font-size: 8px;
    letter-spacing: 0.22em;
    color: ${accentColor};
    text-transform: uppercase;
    margin-top: 4px;
  }
  .cover-plan-type {
    display: inline-block;
    margin-top: 60mm;
    font-size: 9px;
    letter-spacing: 0.3em;
    color: ${accentColor};
    text-transform: uppercase;
    border: 1px solid ${accentColor};
    padding: 5px 12px;
    font-weight: 600;
  }
  .cover-title {
    margin-top: 18px;
    font-size: 56px;
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1.0;
    color: #FFFFFF;
    text-transform: uppercase;
  }
  .cover-subtitle {
    margin-top: 20px;
    font-size: 15px;
    color: #AAAAAA;
    line-height: 1.5;
    max-width: 140mm;
  }
  .cover-footer {
    margin-top: auto;
    padding-top: 18mm;
    border-top: 1px solid #2A2A2A;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 9px;
    letter-spacing: 0.1em;
    color: #555;
    text-transform: uppercase;
  }

  /* ── Content pages ────────────────────────── */
  .content-page {
    width: 210mm;
    min-height: 297mm;
    background: #F4F3F0;
    padding: 18mm 20mm 18mm;
    page-break-after: always;
    position: relative;
  }
  .content-page:last-child { page-break-after: auto; }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 2px solid ${accentColor};
    margin-bottom: 22px;
  }
  .page-header-brand {
    font-size: 9px;
    letter-spacing: 0.3em;
    color: #888;
    text-transform: uppercase;
  }
  .page-header-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: ${accentColor};
    text-transform: uppercase;
  }

  /* ── Blocks ───────────────────────────────── */
  .block {
    margin-bottom: 18px;
    background: #FFFFFF;
    border: 1px solid #E2E0DB;
    border-radius: 2px;
    padding: 14px 16px;
    break-inside: avoid;
  }
  .block-heading {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #333;
    margin-bottom: 10px;
    padding-left: 10px;
    border-left: 3px solid ${accentColor};
  }
  .block-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .block-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 11px;
    line-height: 1.6;
    color: #222;
  }
  .bullet {
    flex-shrink: 0;
    font-size: 10px;
    margin-top: 2px;
    font-weight: 700;
  }

  /* ── Source / disclaimer ──────────────────── */
  .source-box {
    margin-top: 16px;
    padding: 10px 14px;
    background: #ECEAE5;
    border-radius: 2px;
    font-size: 9px;
    color: #666;
    letter-spacing: 0.04em;
    line-height: 1.5;
    break-inside: avoid;
  }
  .source-label {
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 3px;
    font-size: 8px;
  }

  .footer-note {
    position: absolute;
    bottom: 12mm;
    left: 20mm;
    right: 20mm;
    font-size: 8px;
    color: #AAA;
    letter-spacing: 0.06em;
    border-top: 1px solid #E2E0DB;
    padding-top: 6px;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-top-bar"></div>
  <div class="cover-inner">
    <div class="cover-brand">BOOST THE BEAST LAB</div>
    <div class="cover-brand-sub">PERFORMANCE LAB</div>
    <div class="cover-plan-type">INDIVIDUELLER PLAN</div>
    <div class="cover-title">${esc(plan.title)}</div>
    <div class="cover-subtitle">${esc(plan.subtitle)}</div>
    <div class="cover-footer">
      <span>${esc(today)}</span>
      <span>BOOST THE BEAST LAB · PERFORMANCE LAB</span>
    </div>
  </div>
</div>

<!-- CONTENT PAGES — split blocks across pages -->
${buildContentPages(plan, accentColor, today)}

</body>
</html>`;
}

function buildContentPages(plan: PlanPdfInput, accentColor: string, today: string): string {
  // Group blocks: first 3 on page 1, remaining blocks on page 2
  const page1Blocks = plan.blocks.slice(0, 3);
  const page2Blocks = plan.blocks.slice(3);

  function pageHeader() {
    return `
      <div class="page-header">
        <div class="page-header-brand">BOOST THE BEAST LAB</div>
        <div class="page-header-title">${esc(plan.title)}</div>
      </div>
    `;
  }

  function renderBlocks(blocks: PlanBlock[]) {
    return blocks.map((block) => `
      <div class="block">
        <div class="block-heading" style="border-left-color:${accentColor}">${esc(block.heading)}</div>
        <ul class="block-list">
          ${block.items.map((item) => `
            <li class="block-item">
              <span class="bullet" style="color:${accentColor}">▸</span>
              <span>${esc(item)}</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("");
  }

  let pages = `
    <div class="content-page">
      ${pageHeader()}
      ${renderBlocks(page1Blocks)}
      ${page2Blocks.length === 0 ? `
        <div class="source-box">
          <div class="source-label">Wissenschaftliche Basis</div>
          ${esc(plan.source)}
        </div>
      ` : ""}
      <div class="footer-note">
        <span>PERFORMANCE LAB · Kein Ersatz für medizinische Beratung</span>
        <span>${esc(today)}</span>
      </div>
    </div>
  `;

  if (page2Blocks.length > 0) {
    pages += `
      <div class="content-page">
        ${pageHeader()}
        ${renderBlocks(page2Blocks)}
        <div class="source-box">
          <div class="source-label">Wissenschaftliche Basis</div>
          ${esc(plan.source)}
        </div>
        <div class="footer-note">
          <span>PERFORMANCE LAB · Kein Ersatz für medizinische Beratung</span>
          <span>${esc(today)}</span>
        </div>
      </div>
    `;
  }

  return pages;
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function generatePlanPDF(plan: PlanPdfInput): Promise<Uint8Array> {
  const html = buildPlanHtml(plan);
  const { executablePath, args } = await resolveChromium();

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath,
      args,
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return pdf as unknown as Uint8Array;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
