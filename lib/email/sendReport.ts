// Email delivery via Resend.
//
// Sends the personalized performance report email with the main report PDF
// and all 4 plan PDFs (activity, metabolic, recovery, stress) attached.
// Plans that haven't finished generating fall back to a long-lived link
// rendered as a card in the body so the email is never blocked by partial
// PDF availability.

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

// Test seam — vitest swaps in a fake client. Production code never calls this.
export function __setResendClient(fake: Resend | null): void {
  client = fake;
}

export interface ScoreSummary {
  overall: number;
  activity: number;
  sleep: number;
  vo2max: number;
  metabolic: number;
  stress: number;
}

export type PlanType = "activity" | "metabolic" | "recovery" | "stress";

export interface PlanAttachment {
  type: PlanType;
  /** PDF bytes when the plan is ready in Storage. Null = render fallback link. */
  buffer: Buffer | null;
  /** 7-day signed URL — used as fallback when buffer is null. */
  fallbackUrl: string | null;
}

export interface ReportEmailInput {
  email: string;
  /** Captured during /analyse. Null = fall back to email username. */
  firstName: string | null;
  scores: ScoreSummary;
  locale: Locale;
  assessmentId: string;
  /** Required — without the main report we never send. */
  mainReportBuffer: Buffer;
  planAttachments: PlanAttachment[];
}

interface EmailCopy {
  subject: string;
  greeting: string;
  title_line_1: string;
  title_line_2: string;
  overall_label: string;
  row_activity: string;
  row_sleep: string;
  row_vo2max: string;
  row_metabolic: string;
  row_stress: string;
  cta: string;
  plans_section_title: string;
  plan_label: Record<PlanType, string>;
  plan_pending_note: string;
  plan_pending_link_label: string;
  attachments_note: string;
  disclaimer_1: string;
  disclaimer_strong: string;
  disclaimer_2: string;
  unsubscribe: string;
}

const COPY: Record<Locale, EmailCopy> = {
  de: {
    subject: "{name}, dein Performance Report ist bereit — BOOST THE BEAST LAB",
    greeting: "Hallo {name},",
    title_line_1: "DEIN REPORT",
    title_line_2: "IST BEREIT.",
    overall_label: "OVERALL PERFORMANCE INDEX",
    row_activity: "Activity",
    row_sleep: "Sleep",
    row_vo2max: "VO2max",
    row_metabolic: "Metabolic",
    row_stress: "Stress",
    cta: "REPORT ÖFFNEN →",
    plans_section_title: "DEINE INDIVIDUELLEN PLÄNE",
    plan_label: {
      activity: "Activity Plan",
      metabolic: "Metabolic Plan",
      recovery: "Recovery Plan",
      stress: "Stress Plan",
    },
    plan_pending_note: "wird noch erstellt",
    plan_pending_link_label: "Status prüfen →",
    attachments_note: "Alle PDFs sind als Anhang in dieser Mail — du kannst sie jederzeit öffnen, auch ohne Internet.",
    disclaimer_1: "Dieser Report enthält ausschließlich modellbasierte Performance-Insights auf Basis deiner selbstberichteten Daten. ",
    disclaimer_strong: "Keine medizinische Diagnose.",
    disclaimer_2: " Kein Ersatz für ärztliche Beratung.",
    unsubscribe: "Abmelden",
  },
  en: {
    subject: "{name}, your performance report is ready — BOOST THE BEAST LAB",
    greeting: "Hi {name},",
    title_line_1: "YOUR REPORT",
    title_line_2: "IS READY.",
    overall_label: "OVERALL PERFORMANCE INDEX",
    row_activity: "Activity",
    row_sleep: "Sleep",
    row_vo2max: "VO2max",
    row_metabolic: "Metabolic",
    row_stress: "Stress",
    cta: "OPEN REPORT →",
    plans_section_title: "YOUR INDIVIDUAL PLANS",
    plan_label: {
      activity: "Activity Plan",
      metabolic: "Metabolic Plan",
      recovery: "Recovery Plan",
      stress: "Stress Plan",
    },
    plan_pending_note: "still being prepared",
    plan_pending_link_label: "Check status →",
    attachments_note: "All PDFs are attached to this email — open them anytime, even offline.",
    disclaimer_1: "This report contains model-based performance insights derived from your self-reported data. ",
    disclaimer_strong: "Not a medical diagnosis.",
    disclaimer_2: " Not a substitute for professional medical advice.",
    unsubscribe: "Unsubscribe",
  },
  it: {
    subject: "{name}, il tuo performance report è pronto — BOOST THE BEAST LAB",
    greeting: "Ciao {name},",
    title_line_1: "IL TUO REPORT",
    title_line_2: "È PRONTO.",
    overall_label: "OVERALL PERFORMANCE INDEX",
    row_activity: "Activity",
    row_sleep: "Sleep",
    row_vo2max: "VO2max",
    row_metabolic: "Metabolic",
    row_stress: "Stress",
    cta: "APRI IL REPORT →",
    plans_section_title: "I TUOI PIANI INDIVIDUALI",
    plan_label: {
      activity: "Piano Activity",
      metabolic: "Piano Metabolic",
      recovery: "Piano Recovery",
      stress: "Piano Stress",
    },
    plan_pending_note: "ancora in preparazione",
    plan_pending_link_label: "Controlla stato →",
    attachments_note: "Tutti i PDF sono allegati a questa email — aprili in qualsiasi momento, anche offline.",
    disclaimer_1: "Questo report contiene insight di performance basati su modelli derivati dai tuoi dati auto-riportati. ",
    disclaimer_strong: "Non è una diagnosi medica.",
    disclaimer_2: " Non sostituisce una consulenza medica professionale.",
    unsubscribe: "Annulla iscrizione",
  },
  tr: {
    subject: "{name}, performance raporun hazır — BOOST THE BEAST LAB",
    greeting: "Merhaba {name},",
    title_line_1: "RAPORUN",
    title_line_2: "HAZIR.",
    overall_label: "OVERALL PERFORMANCE INDEX",
    row_activity: "Activity",
    row_sleep: "Sleep",
    row_vo2max: "VO2max",
    row_metabolic: "Metabolic",
    row_stress: "Stress",
    cta: "RAPORU AÇ →",
    plans_section_title: "BİREYSEL PLANLARIN",
    plan_label: {
      activity: "Activity Planı",
      metabolic: "Metabolic Planı",
      recovery: "Recovery Planı",
      stress: "Stress Planı",
    },
    plan_pending_note: "hâlâ hazırlanıyor",
    plan_pending_link_label: "Durumu kontrol et →",
    attachments_note: "Tüm PDF'ler bu e-postaya eklenmiştir — istediğin zaman, çevrimdışı bile açabilirsin.",
    disclaimer_1: "Bu rapor, kendin tarafından bildirilen verilerden elde edilen model tabanlı performans içgörüleri içerir. ",
    disclaimer_strong: "Tıbbi teşhis değildir.",
    disclaimer_2: " Profesyonel tıbbi danışmanlığın yerini almaz.",
    unsubscribe: "Abonelikten çık",
  },
};

// Pure helper — exported for unit tests. Falls back to the local-part of the
// email when no first_name is on file (old user rows pre-Phase-1).
export function displayName(firstName: string | null, email: string): string {
  const trimmed = (firstName ?? "").trim();
  if (trimmed.length > 0) return trimmed;
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function renderPlanCard(
  attachment: PlanAttachment,
  copy: EmailCopy,
): string {
  const label = copy.plan_label[attachment.type];
  if (attachment.buffer) {
    return `
      <tr><td style="padding:8px 14px;border-bottom:1px solid #2a2a2f;font-family:Helvetica,Arial,sans-serif;color:#fff;font-size:14px;">
        <span style="display:inline-block;width:16px;height:16px;background:#E63222;border-radius:2px;vertical-align:-3px;margin-right:10px;"></span>
        ${label}
        <span style="color:#6b6b72;font-size:11px;margin-left:6px;">PDF · Anhang</span>
      </td></tr>`;
  }
  if (attachment.fallbackUrl) {
    return `
      <tr><td style="padding:8px 14px;border-bottom:1px solid #2a2a2f;font-family:Helvetica,Arial,sans-serif;color:#fff;font-size:14px;">
        <span style="display:inline-block;width:16px;height:16px;background:#444;border-radius:2px;vertical-align:-3px;margin-right:10px;"></span>
        ${label}
        <span style="color:#a0a0aa;font-size:11px;margin-left:6px;">${copy.plan_pending_note} · </span>
        <a href="${attachment.fallbackUrl}" style="color:#E63222;font-size:11px;text-decoration:none">${copy.plan_pending_link_label}</a>
      </td></tr>`;
  }
  return `
    <tr><td style="padding:8px 14px;border-bottom:1px solid #2a2a2f;font-family:Helvetica,Arial,sans-serif;color:#a0a0aa;font-size:14px;">
      <span style="display:inline-block;width:16px;height:16px;background:#222;border-radius:2px;vertical-align:-3px;margin-right:10px;"></span>
      ${label}
      <span style="color:#6b6b72;font-size:11px;margin-left:6px;">${copy.plan_pending_note}</span>
    </td></tr>`;
}

function buildHtml(
  input: ReportEmailInput,
  copy: EmailCopy,
  resolvedName: string,
): string {
  const { scores, planAttachments, locale } = input;
  const row = (label: string, value: number) => `
    <tr>
      <td style="padding:10px 14px;color:#8a8a92;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;border-bottom:1px solid #2a2a2f;font-family:Helvetica,Arial,sans-serif">${label}</td>
      <td style="padding:10px 14px;color:#fff;font-size:20px;font-weight:900;border-bottom:1px solid #2a2a2f;text-align:right;font-family:Arial Black,sans-serif">${value}</td>
    </tr>`;

  const greeting = copy.greeting.replace("{name}", resolvedName);
  const planCards = planAttachments.map((p) => renderPlanCard(p, copy)).join("");

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

        <tr><td style="padding:0 0 18px 0;color:#fff;font-size:16px;font-family:Helvetica,Arial,sans-serif;">
          ${greeting}
        </td></tr>

        <tr><td style="padding:0 0 30px 0;">
          <h1 style="font-family:Arial Black,sans-serif;font-size:42px;font-weight:900;letter-spacing:-0.02em;color:#fff;line-height:1.05;margin:0;">
            ${copy.title_line_1}<br/>${copy.title_line_2}
          </h1>
        </td></tr>

        <tr><td style="padding:24px 0;background:#16161A;border-left:3px solid #E63222;text-align:center;">
          <div style="font-size:10px;color:#8a8a92;letter-spacing:0.25em;text-transform:uppercase">${copy.overall_label}</div>
          <div style="font-family:Arial Black,sans-serif;font-size:88px;color:#E63222;line-height:1;margin-top:6px">${scores.overall}</div>
          <div style="font-size:11px;color:#a0a0aa;letter-spacing:0.1em;text-transform:uppercase;margin-top:4px">/100</div>
        </td></tr>

        <tr><td style="padding:30px 0 10px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
            ${row(copy.row_activity, scores.activity)}
            ${row(copy.row_sleep, scores.sleep)}
            ${row(copy.row_vo2max, scores.vo2max)}
            ${row(copy.row_metabolic, scores.metabolic)}
            ${row(copy.row_stress, scores.stress)}
          </table>
        </td></tr>

        <tr><td style="padding:30px 0 12px 0;">
          <div style="font-size:11px;color:#8a8a92;letter-spacing:0.2em;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">${copy.plans_section_title}</div>
        </td></tr>

        <tr><td style="padding:0 0 10px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#16161A;">
            ${planCards}
          </table>
        </td></tr>

        <tr><td style="padding:8px 0 30px 0;color:#8a8a92;font-size:12px;line-height:1.6;font-family:Helvetica,Arial,sans-serif;">
          ${copy.attachments_note}
        </td></tr>

        <tr><td style="padding:30px 0 0 0;border-top:1px solid #2a2a2f;">
          <p style="font-size:11px;color:#6b6b72;line-height:1.7;margin:0">
            ${copy.disclaimer_1}<strong style="color:#a0a0aa">${copy.disclaimer_strong}</strong>${copy.disclaimer_2}
          </p>
          <p style="font-size:10px;color:#6b6b72;margin:16px 0 0 0">
            BOOST THE BEAST LAB · info@boostthebeast.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendReportEmail(input: ReportEmailInput): Promise<void> {
  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "BOOST THE BEAST LAB <info@boostthebeast.com>";

  const copy = COPY[input.locale];
  const resolvedName = displayName(input.firstName, input.email);
  const subject = copy.subject.replace("{name}", resolvedName);
  const html = buildHtml(input, copy, resolvedName);

  const attachments: { filename: string; content: Buffer }[] = [
    {
      filename: `btb-report-${input.assessmentId}.pdf`,
      content: input.mainReportBuffer,
    },
    ...input.planAttachments
      .filter((p): p is PlanAttachment & { buffer: Buffer } => p.buffer !== null)
      .map((p) => ({
        filename: `plan-${p.type}-${input.assessmentId}.pdf`,
        content: p.buffer,
      })),
  ];

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [input.email],
    subject,
    html,
    attachments,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message ?? String(error)}`);
  }
}
