// PDF generation via puppeteer-core + @sparticuz/chromium.
// Works on both local dev AND Vercel serverless:
//   - On Vercel: @sparticuz/chromium provides a Lambda-compatible Chromium binary
//   - Locally: falls back to any installed Chrome/Chromium

import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// ── Types ────────────────────────────────────────────────────────────────

export interface PdfModule {
  // Core fields (always present)
  score_context?: string;
  key_finding?: string;
  systemic_connection?: string;
  limitation?: string;
  recommendation?: string;
  // Legacy alias for main_finding → key_finding (tolerated)
  main_finding?: string;
  interpretation?: string;
  systemic_impact?: string;
  // Module-specific enrichments (optional — rendered as contextual boxes)
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
  /** Legacy alias for systemic_connections_overview */
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

// ── Rendering helpers ────────────────────────────────────────────────────

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

function paragraphs(text: string | undefined | null): string {
  if (!text) return "";
  return esc(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function contextBox(label: string, icon: string, color: string, text: string | null | undefined): string {
  if (!text) return "";
  return `
    <div class="ctx-box" style="border-left-color:${color}">
      <div class="ctx-icon" style="background:${color}">${icon}</div>
      <div class="ctx-body">
        <div class="ctx-label">${esc(label)}</div>
        <div class="ctx-text">${esc(text)}</div>
      </div>
    </div>
  `;
}

function scoreCard(label: string, score: number, band: string): string {
  return `
    <div class="score-card">
      <div class="sc-label">${esc(label)}</div>
      <div class="sc-value" style="color:${scoreColor(score)}">${score}</div>
      <div class="sc-bar"><div class="sc-fill" style="width:${Math.max(0, Math.min(100, score))}%;background:${scoreColor(score)}"></div></div>
      <div class="sc-band">${esc(band)}</div>
    </div>
  `;
}

function modulePage(
  title: string,
  score: number,
  band: string,
  mod: PdfModule,
  enrichments: string,
  metricsTable: string,
): string {
  const color = scoreColor(score);
  const keyFinding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  const systemic = mod.systemic_connection ?? mod.systemic_impact ?? "";
  return `
  <section class="page module">
    <div class="module-head">
      <div class="module-title-row">
        <div class="module-title">${esc(title)}</div>
        <div class="module-score" style="color:${color}">${score}<span class="module-score-sub">/100</span></div>
      </div>
      <div class="module-band">${esc(band)}</div>
      <div class="module-bar"><div class="module-bar-fill" style="width:${Math.max(0, Math.min(100, score))}%;background:${color}"></div></div>
    </div>

    ${mod.score_context ? `<div class="section-sub">EINORDNUNG</div><p class="context">${esc(mod.score_context)}</p>` : ""}
    ${keyFinding ? `<div class="section-sub">HAUPTBEFUND</div><p class="finding">${esc(keyFinding)}</p>` : ""}
    ${systemic ? `
      <div class="systemic">
        <div class="systemic-icon">↔</div>
        <div>
          <div class="systemic-label">SYSTEMISCHE VERBINDUNG</div>
          <div class="systemic-text">${esc(systemic)}</div>
        </div>
      </div>
    ` : ""}

    ${enrichments}

    ${mod.limitation ? `
      <div class="row row-warn">
        <span class="icon icon-warn">!</span>
        <div>
          <div class="row-label">LIMITIERUNG</div>
          ${esc(mod.limitation)}
        </div>
      </div>
    ` : ""}

    ${mod.recommendation ? `
      <div class="row row-ok">
        <span class="icon icon-ok">→</span>
        <div>
          <div class="row-label">NÄCHSTER SCHRITT</div>
          ${esc(mod.recommendation)}
        </div>
      </div>
    ` : ""}

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

  const systemicOverview =
    content.systemic_connections_overview ?? content.systemic_connections ?? "";

  // Module-specific enrichment boxes per page
  const sleepExtras = ""; // sleep has no module-specific extras in schema

  const activityExtras = [
    contextBox(
      "WHO & IPAQ KONTEXT",
      "i",
      "#3B82F6",
      content.modules.activity.met_context,
    ),
    contextBox(
      "SITZZEIT-RISIKO",
      "!",
      "#E63222",
      content.modules.activity.sitting_flag,
    ),
  ].join("");

  const metabolicExtras = contextBox(
    "BMI-KONTEXT",
    "i",
    "#8B5CF6",
    content.modules.metabolic.bmi_context,
  );

  const stressExtras = contextBox(
    "HPA-ACHSE",
    "⚠",
    "#E63222",
    content.modules.stress.hpa_context,
  );

  const vo2maxExtras = [
    contextBox(
      "FITNESS-KONTEXT",
      "i",
      "#3B82F6",
      content.modules.vo2max.fitness_context,
    ),
    contextBox(
      "SCHÄTZUNG",
      "i",
      "#6B7280",
      content.modules.vo2max.estimation_note,
    ),
  ].join("");

  const criticalBanner = content.critical_flag
    ? `
    <div class="critical-banner">
      <div class="critical-badge">KRITISCH</div>
      <div class="critical-text">${esc(content.critical_flag)}</div>
    </div>
  `
    : "";

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
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
  .page { width: 210mm; min-height: 297mm; padding: 18mm 20mm; page-break-after: always; position: relative; background: #F4F3F0; }
  .page:last-child { page-break-after: auto; }

  /* ── Cover — keeps dark for premium impact ──── */
  .cover { background: #111111 !important; color: #FFFFFF; padding: 22mm 20mm; }
  .cover .brand { font-family: Arial, Helvetica, sans-serif; font-size: 12px; letter-spacing: 0.35em; color: #fff; text-transform: uppercase; font-weight: 700; }
  .cover .brand-sub { font-size: 9px; color: #E63222; letter-spacing: 0.22em; margin-top: 4px; text-transform: uppercase; }
  .cover .hero { margin-top: 52mm; font-family: "Arial Black", Impact, sans-serif; font-size: 64px; line-height: 1.0; font-weight: 900; letter-spacing: -0.02em; color: #FFFFFF; }
  .cover .hero span { display: block; }
  .cover .headline { margin-top: 26px; font-size: 16px; color: #AAAAAA; font-family: Helvetica, Arial, sans-serif; max-width: 150mm; line-height: 1.5; }
  .cover .meta { position: absolute; bottom: 22mm; left: 20mm; font-size: 9px; color: #555; letter-spacing: 0.12em; }
  .cover .big-score { position: absolute; bottom: 10mm; right: 20mm; font-family: "Arial Black", Impact, sans-serif; font-size: 140px; color: #E63222; opacity: 0.15; line-height: 1; }

  /* ── Page header (content pages) ────────── */
  .page-hdr { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 2px solid #E63222; margin-bottom: 20px; }
  .page-hdr-brand { font-size: 9px; letter-spacing: 0.28em; color: #888; text-transform: uppercase; }
  .page-hdr-date { font-size: 9px; color: #AAA; letter-spacing: 0.08em; }

  /* ── Critical banner ──────────────────── */
  .critical-banner { margin-top: 28mm; padding: 16px 20px; background: #FEE2E2; border: 1px solid #E63222; border-left: 4px solid #E63222; }
  .critical-badge { display: inline-block; background: #E63222; color: #fff; font-size: 9px; letter-spacing: 0.25em; padding: 4px 10px; font-family: Arial, sans-serif; font-weight: 700; }
  .critical-text { margin-top: 10px; font-size: 13px; color: #111; font-family: Helvetica, Arial, sans-serif; line-height: 1.6; }

  /* ── Section labels ───────────────────── */
  .section-label { font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 0.28em; color: #E63222; text-transform: uppercase; margin-bottom: 14px; font-weight: 700; }
  .section-sub { font-family: Arial, sans-serif; font-size: 8px; letter-spacing: 0.22em; color: #888; text-transform: uppercase; margin-top: 20px; margin-bottom: 6px; }

  /* ── Summary page ─────────────────────── */
  .summary p { font-family: Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.8; color: #222; }
  .score-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 20px; }
  .score-card { background: #FFFFFF; border: 1px solid #E2E0DB; border-radius: 4px; padding: 12px 10px; }
  .sc-label { font-size: 8px; color: #888; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; }
  .sc-value { font-size: 30px; font-family: "Arial Black", sans-serif; font-weight: 900; margin: 4px 0 3px; }
  .sc-bar { height: 3px; background: #E2E0DB; border-radius: 2px; overflow: hidden; margin-top: 4px; }
  .sc-fill { height: 100%; }
  .sc-band { margin-top: 6px; font-size: 8px; color: #555; text-transform: uppercase; letter-spacing: 0.12em; }

  .overall { margin-top: 16px; padding: 14px 18px; background: #FFFFFF; border: 1px solid #E2E0DB; border-left: 4px solid #E63222; display: flex; align-items: center; justify-content: space-between; }
  .overall-label { font-size: 9px; color: #888; letter-spacing: 0.25em; text-transform: uppercase; }
  .overall-value { font-size: 46px; font-family: "Arial Black", sans-serif; color: #E63222; line-height: 1; margin-top: 4px; }
  .overall-meta { font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 5px; }
  .overall-right { text-align: right; font-size: 9px; color: #888; letter-spacing: 0.08em; line-height: 1.7; }

  .priority { margin-top: 14px; padding: 12px 14px; border: 1.5px solid #E63222; background: #FFF5F4; }
  .priority-label { font-size: 8px; letter-spacing: 0.28em; color: #E63222; text-transform: uppercase; font-weight: 700; }
  .priority-text { margin-top: 5px; font-weight: 700; color: #111; font-size: 12px; line-height: 1.55; font-family: Helvetica, Arial, sans-serif; }

  /* ── Systemic connections page ─────────── */
  .systemic-page h2 { font-family: "Arial Black", sans-serif; font-size: 26px; letter-spacing: -0.01em; margin-bottom: 20px; color: #111; }
  .systemic-page .lead { font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #222; line-height: 1.8; max-width: 160mm; }
  .prognose-block { margin-top: 36px; padding: 18px 22px; background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #22C55E; }
  .prognose-label { font-size: 9px; letter-spacing: 0.25em; color: #16A34A; text-transform: uppercase; font-weight: 700; }
  .prognose-text { margin-top: 8px; font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.75; color: #222; }

  /* ── Module pages ─────────────────────── */
  .module-head { margin-bottom: 10px; }
  .module-title-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .module-title { font-family: "Arial Black", sans-serif; font-size: 28px; letter-spacing: -0.01em; text-transform: uppercase; color: #111; }
  .module-score { font-family: "Arial Black", sans-serif; font-size: 50px; font-weight: 900; }
  .module-score-sub { font-size: 14px; color: #888; }
  .module-band { font-size: 9px; color: #666; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px; }
  .module-bar { margin-top: 10px; height: 4px; background: #E2E0DB; }
  .module-bar-fill { height: 100%; }

  .context { font-size: 12px; color: #555; line-height: 1.7; font-family: Helvetica, Arial, sans-serif; }
  .finding { font-size: 13px; color: #111; line-height: 1.65; font-family: Helvetica, Arial, sans-serif; font-weight: 500; }

  .systemic { margin-top: 16px; padding: 12px 14px; background: #EFF6FF; border: 1px solid #BFDBFE; border-left: 3px solid #3B82F6; display: flex; gap: 12px; align-items: flex-start; }
  .systemic-icon { font-size: 16px; color: #3B82F6; font-family: Arial, sans-serif; flex-shrink: 0; }
  .systemic-label { font-size: 8px; letter-spacing: 0.22em; color: #3B82F6; text-transform: uppercase; margin-bottom: 4px; font-family: Arial, sans-serif; font-weight: 700; }
  .systemic-text { font-size: 11px; color: #333; line-height: 1.65; font-family: Helvetica, Arial, sans-serif; }

  .ctx-box { margin-top: 10px; padding: 9px 12px; background: #FAFAF8; border: 1px solid #E2E0DB; border-left: 3px solid #6B7280; display: flex; gap: 10px; align-items: flex-start; }
  .ctx-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-weight: 700; font-size: 11px; color: #fff; flex-shrink: 0; font-family: Arial, sans-serif; }
  .ctx-body { flex: 1; }
  .ctx-label { font-size: 8px; letter-spacing: 0.2em; color: #888; text-transform: uppercase; margin-bottom: 3px; font-family: Arial, sans-serif; font-weight: 700; }
  .ctx-text { font-size: 11px; color: #333; line-height: 1.6; font-family: Helvetica, Arial, sans-serif; }

  .row { margin-top: 12px; padding: 10px 14px; background: #FAFAF8; border: 1px solid #E2E0DB; display: flex; gap: 12px; align-items: flex-start; font-size: 12px; line-height: 1.55; color: #222; font-family: Helvetica, Arial, sans-serif; }
  .row-warn { border-left: 3px solid #E63222; background: #FFF8F7; }
  .row-ok { border-left: 3px solid #22C55E; background: #F7FFF9; }
  .icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; font-weight: 700; font-size: 12px; flex-shrink: 0; font-family: Arial, sans-serif; }
  .icon-warn { background: #E63222; color: #fff; }
  .icon-ok { background: #22C55E; color: #000; }
  .row-label { font-size: 8px; letter-spacing: 0.25em; color: #888; text-transform: uppercase; margin-bottom: 4px; font-family: Arial, sans-serif; font-weight: 700; }

  .metrics { margin-top: 16px; border-top: 1px solid #E2E0DB; padding-top: 10px; }
  .metrics table { width: 100%; font-size: 10px; color: #666; font-family: Helvetica, Arial, sans-serif; }
  .metrics td { padding: 3px 0; }
  .metrics td:last-child { text-align: right; color: #111; font-weight: 600; }

  /* ── Disclaimer page ──────────────────── */
  .disclaimer-page { text-align: center; background: #F4F3F0 !important; }
  .disclaimer-page h2 { margin-top: 50mm; font-family: "Arial Black", sans-serif; font-size: 20px; letter-spacing: 0.1em; color: #111; }
  .disclaimer-page .strong { margin-top: 12px; font-weight: 700; color: #E63222; letter-spacing: 0.1em; }
  .disclaimer-page p { margin: 20px auto; max-width: 140mm; font-size: 12px; line-height: 1.7; color: #555; font-family: Helvetica, Arial, sans-serif; }
  .disclaimer-page .contact { margin-top: 30px; font-size: 9px; letter-spacing: 0.2em; color: #888; text-transform: uppercase; }
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
    ${criticalBanner}
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
      <div class="overall-left">
        <div class="overall-label">OVERALL PERFORMANCE INDEX</div>
        <div class="overall-value">${scores.overall.score}</div>
        <div class="overall-meta">${esc(scores.overall.band)}</div>
      </div>
      <div class="overall-right">
        BMI ${user.bmi} · ${esc(user.bmi_category)}<br/>
        ${user.age} Jahre · ${esc(user.gender)}
      </div>
    </div>

    <div class="priority">
      <div class="priority-label">TOP PRIORITÄT</div>
      <div class="priority-text">${esc(content.top_priority)}</div>
    </div>
  </section>

  <!-- SYSTEMIC CONNECTIONS PAGE -->
  ${systemicOverview ? `
  <section class="page systemic-page">
    <div class="section-label">DAS SYSTEM VERSTEHEN</div>
    <h2>SYSTEMISCHE VERBINDUNGEN</h2>
    <div class="lead">${paragraphs(systemicOverview)}</div>
    <div class="prognose-block">
      <div class="prognose-label">30-TAGE PROGNOSE</div>
      <div class="prognose-text">${esc(content.prognose_30_days)}</div>
    </div>
  </section>
  ` : ""}

  <!-- MODULE PAGES — order: Activity → Sleep → VO2max → Metabolic → Stress -->

  ${modulePage(
    "ACTIVITY",
    scores.activity.score,
    scores.activity.band,
    content.modules.activity,
    activityExtras,
    `<table>
      <tr><td>Gesamt MET-Minuten / Woche</td><td>${scores.total_met}</td></tr>
      ${scores.sitting_hours != null ? `<tr><td>Sitzzeit / Tag</td><td>${scores.sitting_hours} h</td></tr>` : ""}
      ${scores.training_days != null ? `<tr><td>Trainingseinheiten / Woche</td><td>${scores.training_days}</td></tr>` : ""}
    </table>`,
  )}

  ${modulePage(
    "SLEEP",
    scores.sleep.score,
    scores.sleep.band,
    content.modules.sleep,
    sleepExtras,
    `<table>
      <tr><td>Schlafdauer</td><td>${scores.sleep_duration_hours} h / Nacht</td></tr>
      ${scores.training_days != null ? `<tr><td>Recovery Score</td><td>${scores.recovery.score}/100 (${esc(scores.recovery.band)})</td></tr>` : ""}
    </table>`,
  )}

  ${modulePage(
    "VO2MAX",
    scores.vo2max.score,
    scores.vo2max.band,
    content.modules.vo2max,
    vo2maxExtras,
    `<table>
      <tr><td>Geschätzter VO2max</td><td>${scores.vo2max.estimated} ml/kg/min</td></tr>
    </table>`,
  )}

  ${modulePage(
    "METABOLIC",
    scores.metabolic.score,
    scores.metabolic.band,
    content.modules.metabolic,
    metabolicExtras,
    `<table>
      <tr><td>BMI</td><td>${user.bmi} (${esc(user.bmi_category)})</td></tr>
    </table>`,
  )}

  ${modulePage(
    "STRESS",
    scores.stress.score,
    scores.stress.band,
    content.modules.stress,
    stressExtras,
    "",
  )}

  <!-- DISCLAIMER -->
  <section class="page disclaimer-page">
    <div class="section-label">RECHTLICHER HINWEIS</div>
    <h2>KEINE MEDIZINISCHE DIAGNOSE</h2>
    <div class="strong">PERFORMANCE-INSIGHTS · KEIN ERSATZ FÜR ÄRZTLICHE BERATUNG</div>
    <p>${esc(content.disclaimer)}</p>
    <p>Alle Angaben basieren auf selbstberichteten Daten und modellbasierten Berechnungen nach IPAQ, NSF/AASM, WHO und ACSM Leitlinien. VO2max ist eine algorithmische Schätzung (Jackson Non-Exercise Prediction). Dieses Dokument stellt keine Heilaussagen dar und ist kein Medizinprodukt im Sinne der MDR.</p>
    <div class="contact">LAB@BOOSTTHEBEAST.COM · MODELL v1.0.0 · ${esc(today)}</div>
  </section>

</body>
</html>`;
}

// ── Puppeteer bootstrap ──────────────────────────────────────────────────

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
      headless: IS_SERVERLESS ? ("shell" as const) : true,
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
