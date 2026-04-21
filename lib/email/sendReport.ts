// Email delivery via Resend.
// Sends the performance report download link to the user.

import { Resend } from "resend";
import type { Locale } from "@/lib/supabase/types";

let client: Resend | null = null;
function getResend(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY");
    client = new Resend(key);
  }
  return client;
}

export interface ScoreSummary {
  overall: number;
  activity: number;
  sleep: number;
  vo2max: number;
  metabolic: number;
  stress: number;
}

interface EmailCopy {
  subject: string;
  title_line_1: string;
  title_line_2: string;
  overall_label: string;
  row_activity: string;
  row_sleep: string;
  row_vo2max: string;
  row_metabolic: string;
  row_stress: string;
  cta: string;
  disclaimer_1: string;
  disclaimer_strong: string;
  disclaimer_2: string;
  unsubscribe: string;
}

const COPY: Record<Locale, EmailCopy> = {
  de: {
    subject: "Dein Performance Report ist bereit — BOOST THE BEAST LAB",
    title_line_1: "DEIN REPORT",
    title_line_2: "IST BEREIT.",
    overall_label: "OVERALL PERFORMANCE INDEX",
    row_activity: "Activity",
    row_sleep: "Sleep",
    row_vo2max: "VO2max",
    row_metabolic: "Metabolic",
    row_stress: "Stress",
    cta: "REPORT HERUNTERLADEN →",
    disclaimer_1: "Dieser Report enthält ausschließlich modellbasierte Performance-Insights auf Basis deiner selbstberichteten Daten. ",
    disclaimer_strong: "Keine medizinische Diagnose.",
    disclaimer_2: " Kein Ersatz für ärztliche Beratung.",
    unsubscribe: "Abmelden",
  },
  en: {
    subject: "Your performance report is ready — BOOST THE BEAST LAB",
    title_line_1: "YOUR REPORT",
    title_line_2: "IS READY.",
    overall_label: "OVERALL PERFORMANCE INDEX",
    row_activity: "Activity",
    row_sleep: "Sleep",
    row_vo2max: "VO2max",
    row_metabolic: "Metabolic",
    row_stress: "Stress",
    cta: "DOWNLOAD REPORT →",
    disclaimer_1: "This report contains model-based performance insights derived from your self-reported data. ",
    disclaimer_strong: "Not a medical diagnosis.",
    disclaimer_2: " Not a substitute for professional medical advice.",
    unsubscribe: "Unsubscribe",
  },
  it: {
    subject: "Il tuo performance report è pronto — BOOST THE BEAST LAB",
    title_line_1: "IL TUO REPORT",
    title_line_2: "È PRONTO.",
    overall_label: "OVERALL PERFORMANCE INDEX",
    row_activity: "Activity",
    row_sleep: "Sleep",
    row_vo2max: "VO2max",
    row_metabolic: "Metabolic",
    row_stress: "Stress",
    cta: "SCARICA IL REPORT →",
    disclaimer_1: "Questo report contiene insight di performance basati su modelli derivati dai tuoi dati auto-riportati. ",
    disclaimer_strong: "Non è una diagnosi medica.",
    disclaimer_2: " Non sostituisce una consulenza medica professionale.",
    unsubscribe: "Annulla iscrizione",
  },
  tr: {
    subject: "Performance raporun hazır — BOOST THE BEAST LAB",
    title_line_1: "RAPORUN",
    title_line_2: "HAZIR.",
    overall_label: "OVERALL PERFORMANCE INDEX",
    row_activity: "Activity",
    row_sleep: "Sleep",
    row_vo2max: "VO2max",
    row_metabolic: "Metabolic",
    row_stress: "Stress",
    cta: "RAPORU İNDİR →",
    disclaimer_1: "Bu rapor, kendin tarafından bildirilen verilerden elde edilen model tabanlı performans içgörüleri içerir. ",
    disclaimer_strong: "Tıbbi teşhis değildir.",
    disclaimer_2: " Profesyonel tıbbi danışmanlığın yerini almaz.",
    unsubscribe: "Abonelikten çık",
  },
};

function buildHtml(downloadUrl: string, scores: ScoreSummary, locale: Locale): string {
  const c = COPY[locale];
  const row = (label: string, value: number) => `
    <tr>
      <td style="padding:10px 14px;color:#8a8a92;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;border-bottom:1px solid #2a2a2f;font-family:Helvetica,Arial,sans-serif">${label}</td>
      <td style="padding:10px 14px;color:#fff;font-size:20px;font-weight:900;border-bottom:1px solid #2a2a2f;text-align:right;font-family:Arial Black,sans-serif">${value}</td>
    </tr>`;

  return `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:0;background:#0D0D0F;font-family:Helvetica,Arial,sans-serif;color:#fff;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#0D0D0F;">
    <tr><td align="center" style="padding:40px 20px">
      <table role="presentation" cellspacing="0" cellpadding="0" width="600" style="max-width:600px;background:#0D0D0F;">
        <tr><td style="padding:0 0 30px 0;">
          <div style="font-size:14px;letter-spacing:0.3em;color:#fff;text-transform:uppercase;font-family:Arial,sans-serif">BOOST THE BEAST LAB</div>
          <div style="font-size:10px;letter-spacing:0.2em;color:#E63222;margin-top:4px;text-transform:uppercase">PERFORMANCE LAB</div>
        </td></tr>

        <tr><td style="padding:0 0 30px 0;">
          <h1 style="font-family:Arial Black,sans-serif;font-size:42px;font-weight:900;letter-spacing:-0.02em;color:#fff;line-height:1.05;margin:0;">
            ${c.title_line_1}<br/>${c.title_line_2}
          </h1>
        </td></tr>

        <tr><td style="padding:24px 0;background:#16161A;border-left:3px solid #E63222;text-align:center;">
          <div style="font-size:10px;color:#8a8a92;letter-spacing:0.25em;text-transform:uppercase">${c.overall_label}</div>
          <div style="font-family:Arial Black,sans-serif;font-size:88px;color:#E63222;line-height:1;margin-top:6px">${scores.overall}</div>
          <div style="font-size:11px;color:#a0a0aa;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px">/100</div>
        </td></tr>

        <tr><td style="padding:30px 0 10px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            ${row(c.row_activity, scores.activity)}
            ${row(c.row_sleep, scores.sleep)}
            ${row(c.row_vo2max, scores.vo2max)}
            ${row(c.row_metabolic, scores.metabolic)}
            ${row(c.row_stress, scores.stress)}
          </table>
        </td></tr>

        <tr><td align="center" style="padding:34px 0;">
          <a href="${downloadUrl}" style="display:inline-block;background:#E63222;color:#fff;padding:18px 36px;font-family:Arial Black,sans-serif;font-size:14px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;border-radius:2px">
            ${c.cta}
          </a>
        </td></tr>

        <tr><td style="padding:30px 0 0 0;border-top:1px solid #2a2a2f;">
          <p style="font-size:11px;color:#6b6b72;line-height:1.7;margin:0">
            ${c.disclaimer_1}<strong style="color:#a0a0aa">${c.disclaimer_strong}</strong>${c.disclaimer_2}
          </p>
          <p style="font-size:10px;color:#6b6b72;margin:16px 0 0 0">
            BOOST THE BEAST LAB · info@boostthebeast.com<br/>
            <a href="${downloadUrl}&unsubscribe=1" style="color:#6b6b72;text-decoration:underline">${c.unsubscribe}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendReportEmail(
  email: string,
  downloadUrl: string,
  scores: ScoreSummary,
  locale: Locale = "de",
): Promise<void> {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "BOOST THE BEAST LAB <info@boostthebeast.com>";

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [email],
    subject: COPY[locale].subject,
    html: buildHtml(downloadUrl, scores, locale),
  });
  if (error) {
    throw new Error(`Resend error: ${error.message ?? String(error)}`);
  }
}
