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
  preheader: string;
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
  plan_attached_label: string;
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
    preheader: "{name}, dein Overall Performance Index, alle Subscores und 4 individuelle Pläne — als PDFs im Anhang.",
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
    plan_attached_label: "Anhang",
    plan_pending_note: "wird noch erstellt",
    plan_pending_link_label: "Status prüfen →",
    attachments_note: "Alle PDFs sind als Anhang in dieser Mail — du kannst sie jederzeit öffnen, auch offline.",
    disclaimer_1: "Dieser Report enthält ausschließlich modellbasierte Performance-Insights auf Basis deiner selbstberichteten Daten. ",
    disclaimer_strong: "Keine medizinische Diagnose.",
    disclaimer_2: " Kein Ersatz für ärztliche Beratung.",
    unsubscribe: "Abmelden",
  },
  en: {
    subject: "{name}, your performance report is ready — BOOST THE BEAST LAB",
    preheader: "{name}, your Overall Performance Index, every subscore, and 4 individual plans — attached as PDFs.",
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
    plan_attached_label: "Attached",
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
    preheader: "{name}, il tuo Overall Performance Index, ogni subscore e 4 piani individuali — allegati come PDF.",
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
    plan_attached_label: "Allegato",
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
    preheader: "{name}, Overall Performance Index'in, tüm subscore'ların ve 4 bireysel plan — PDF olarak ekte.",
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
    plan_attached_label: "Ek",
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

// Strips diacritics + non-alphanumeric chars so a string is safe to use
// inside a PDF attachment filename across email clients + filesystems.
// Keeps the friendly look (e.g. "Daniel" → "Daniel"), drops accents
// ("Müller" → "Muller"), and refuses anything that survives stripping
// fewer than 1 char (returns null so caller can omit the prefix).
export function safeFilenameStem(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : null;
}

// Brand colors — kept here so the rest of the module reads easier.
const BG_OUTER = "#0D0D0F";
const BG_CARD = "#16161A";
const BG_PLAN_ROW = "#1B1B20";
const BORDER_SUBTLE = "#2A2A2F";
const RED = "#E63222";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#8A8A92";
const TEXT_DIM = "#6B6B72";

const PLAN_TYPES_ORDER: PlanType[] = ["activity", "metabolic", "recovery", "stress"];

function renderPlanCard(
  attachment: PlanAttachment,
  copy: EmailCopy,
): string {
  const label = copy.plan_label[attachment.type];
  const ready = !!attachment.buffer;
  const dotColor = ready ? RED : "#3A3A40";
  const status = ready
    ? `<span style="color:${TEXT_DIM};font-size:11px;letter-spacing:0.06em;font-family:Helvetica,Arial,sans-serif;">PDF · ${copy.plan_attached_label}</span>`
    : attachment.fallbackUrl
      ? `<span style="color:${TEXT_MUTED};font-size:11px;font-family:Helvetica,Arial,sans-serif;">${copy.plan_pending_note}</span> &nbsp;<a href="${attachment.fallbackUrl}" style="color:${RED};font-size:11px;text-decoration:none;font-family:Helvetica,Arial,sans-serif;">${copy.plan_pending_link_label}</a>`
      : `<span style="color:${TEXT_MUTED};font-size:11px;font-family:Helvetica,Arial,sans-serif;">${copy.plan_pending_note}</span>`;

  return `
    <tr>
      <td bgcolor="${BG_PLAN_ROW}" style="background-color:${BG_PLAN_ROW};padding:14px 18px;border-bottom:1px solid ${BORDER_SUBTLE};font-family:Helvetica,Arial,sans-serif;color:${TEXT_PRIMARY};">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BG_PLAN_ROW};">
          <tr>
            <td bgcolor="${BG_PLAN_ROW}" width="20" style="background-color:${BG_PLAN_ROW};padding-right:12px;vertical-align:middle;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="${dotColor}" width="10" height="10" style="background-color:${dotColor};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td>
            <td bgcolor="${BG_PLAN_ROW}" style="background-color:${BG_PLAN_ROW};color:${TEXT_PRIMARY};font-size:15px;font-weight:600;font-family:Helvetica,Arial,sans-serif;vertical-align:middle;">${label}</td>
            <td bgcolor="${BG_PLAN_ROW}" align="right" style="background-color:${BG_PLAN_ROW};vertical-align:middle;text-align:right;">${status}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function buildHtml(
  input: ReportEmailInput,
  copy: EmailCopy,
  resolvedName: string,
): string {
  const { scores, planAttachments, locale } = input;

  // Make sure plan cards always render in the same order so the email
  // looks the same regardless of how the caller constructed the array.
  const orderedPlans = PLAN_TYPES_ORDER.map(
    (type) =>
      planAttachments.find((p) => p.type === type) ?? {
        type,
        buffer: null,
        fallbackUrl: null,
      },
  );

  const row = (label: string, value: number) => `
    <tr>
      <td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:14px 0;color:${TEXT_MUTED};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;border-bottom:1px solid ${BORDER_SUBTLE};font-family:Helvetica,Arial,sans-serif;">${label}</td>
      <td bgcolor="${BG_OUTER}" align="right" style="background-color:${BG_OUTER};padding:14px 0;color:${TEXT_PRIMARY};font-size:24px;font-weight:900;border-bottom:1px solid ${BORDER_SUBTLE};text-align:right;font-family:'Arial Black',Arial,sans-serif;">${value}</td>
    </tr>`;

  const greeting = copy.greeting.replace("{name}", resolvedName);
  const planCards = orderedPlans.map((p) => renderPlanCard(p, copy)).join("");

  // Hidden preheader: shows up in the inbox preview before the email
  // is opened.  Padded with zero-width spaces so Gmail doesn't follow
  // it with stray subject-line continuation text.
  const preheader = copy.preheader.replace("{name}", resolvedName);

  return `<!doctype html>
<html lang="${locale}" style="background-color:${BG_OUTER};">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${copy.subject.replace("{name}", resolvedName)}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0 !important; padding:0 !important; background:${BG_OUTER} !important; }
  /* Force dark across clients that do palette-swapping */
  [data-ogsc] body, [data-ogsb] body { background:${BG_OUTER} !important; }
  .btb-bg-outer { background-color:${BG_OUTER} !important; }
  .btb-bg-card { background-color:${BG_CARD} !important; }
  .btb-bg-row { background-color:${BG_PLAN_ROW} !important; }
  .btb-text { color:${TEXT_PRIMARY} !important; }
  .btb-muted { color:${TEXT_MUTED} !important; }
  .btb-dim { color:${TEXT_DIM} !important; }
  .btb-red { color:${RED} !important; }
</style>
</head>
<body bgcolor="${BG_OUTER}" style="margin:0;padding:0;background-color:${BG_OUTER};font-family:Helvetica,Arial,sans-serif;color:${TEXT_PRIMARY};">
  <div style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:${BG_OUTER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" class="btb-bg-outer" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};">
    <tr>
      <td bgcolor="${BG_OUTER}" align="center" style="background-color:${BG_OUTER};padding:36px 16px;">
        <table role="presentation" class="btb-bg-outer" cellspacing="0" cellpadding="0" border="0" width="600" bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};max-width:600px;width:100%;">
          <!-- Brand bar -->
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:0 0 28px 0;font-family:Helvetica,Arial,sans-serif;">
            <div style="font-size:13px;letter-spacing:0.32em;color:${TEXT_PRIMARY};text-transform:uppercase;font-weight:700;">BOOST THE BEAST LAB</div>
            <div style="font-size:10px;letter-spacing:0.22em;color:${RED};margin-top:6px;text-transform:uppercase;font-weight:700;">PERFORMANCE LAB</div>
          </td></tr>

          <!-- Greeting + Hero headline -->
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:0 0 12px 0;color:${TEXT_PRIMARY};font-size:16px;font-family:Helvetica,Arial,sans-serif;">
            ${greeting}
          </td></tr>
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:0 0 28px 0;">
            <h1 style="margin:0;font-family:'Arial Black',Arial,sans-serif;font-size:40px;font-weight:900;letter-spacing:-0.02em;color:${TEXT_PRIMARY};line-height:1.05;">${copy.title_line_1}<br/>${copy.title_line_2}</h1>
          </td></tr>

          <!-- Overall hero card -->
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:0 0 32px 0;">
            <table role="presentation" class="btb-bg-card" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${BG_CARD}" style="background-color:${BG_CARD};border-left:3px solid ${RED};">
              <tr><td bgcolor="${BG_CARD}" align="center" style="background-color:${BG_CARD};padding:30px 24px;font-family:Helvetica,Arial,sans-serif;">
                <div style="font-size:10px;color:${TEXT_MUTED};letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">${copy.overall_label}</div>
                <div style="font-family:'Arial Black',Arial,sans-serif;font-size:84px;color:${RED};line-height:1;margin-top:10px;font-weight:900;">${scores.overall}</div>
                <div style="font-size:11px;color:${TEXT_MUTED};letter-spacing:0.12em;text-transform:uppercase;margin-top:6px;">/100</div>
              </td></tr>
            </table>
          </td></tr>

          <!-- Subscores -->
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:0 0 36px 0;">
            <table role="presentation" class="btb-bg-outer" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};">
              ${row(copy.row_activity, scores.activity)}
              ${row(copy.row_sleep, scores.sleep)}
              ${row(copy.row_vo2max, scores.vo2max)}
              ${row(copy.row_metabolic, scores.metabolic)}
              ${row(copy.row_stress, scores.stress)}
            </table>
          </td></tr>

          <!-- Plans heading -->
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:0 0 12px 0;font-family:Helvetica,Arial,sans-serif;">
            <div style="font-size:11px;color:${TEXT_MUTED};letter-spacing:0.22em;text-transform:uppercase;font-weight:700;">${copy.plans_section_title}</div>
          </td></tr>

          <!-- Plan cards -->
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:0 0 14px 0;">
            <table role="presentation" class="btb-bg-row" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="${BG_PLAN_ROW}" style="background-color:${BG_PLAN_ROW};border-radius:4px;overflow:hidden;">
              ${planCards}
            </table>
          </td></tr>

          <!-- Attachments note -->
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:4px 0 32px 0;color:${TEXT_MUTED};font-size:12px;line-height:1.6;font-family:Helvetica,Arial,sans-serif;">
            ${copy.attachments_note}
          </td></tr>

          <!-- Footer -->
          <tr><td bgcolor="${BG_OUTER}" style="background-color:${BG_OUTER};padding:24px 0 0 0;border-top:1px solid ${BORDER_SUBTLE};font-family:Helvetica,Arial,sans-serif;">
            <p style="margin:0;font-size:11px;color:${TEXT_DIM};line-height:1.7;">${copy.disclaimer_1}<strong style="color:${TEXT_MUTED};font-weight:700;">${copy.disclaimer_strong}</strong>${copy.disclaimer_2}</p>
            <p style="margin:14px 0 0 0;font-size:10px;color:${TEXT_DIM};letter-spacing:0.04em;">BOOST THE BEAST LAB · info@boostthebeast.com</p>
          </td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Plan filenames: ASCII-only labels keep attachment headers safe across
// every email client + filesystem. The on-screen card label can stay
// localised (e.g. "Piano Activity") because that comes from COPY.
const PLAN_FILENAME_LABEL: Record<PlanType, string> = {
  activity: "Activity-Plan",
  metabolic: "Metabolic-Plan",
  recovery: "Recovery-Plan",
  stress: "Stress-Plan",
};

// Builds the main report filename. If we have a clean firstName we
// prefix it ("Daniel-Performance-Report.pdf") so the user instantly
// recognises which file is theirs. Otherwise we fall back to the
// neutral form. Never embeds the assessmentId — UUIDs in filenames
// looked like noise to the user.
export function buildMainReportFilename(firstName: string | null): string {
  const stem = safeFilenameStem(firstName);
  return stem ? `${stem}-Performance-Report.pdf` : "Performance-Report.pdf";
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
      filename: buildMainReportFilename(input.firstName),
      content: input.mainReportBuffer,
    },
    ...input.planAttachments
      .filter((p): p is PlanAttachment & { buffer: Buffer } => p.buffer !== null)
      .map((p) => ({
        filename: `${PLAN_FILENAME_LABEL[p.type]}.pdf`,
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
