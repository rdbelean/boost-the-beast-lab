// Server-side PDF generation via pdf-lib (pure JavaScript).
// No native dependencies — works reliably on Vercel serverless functions.

import { PDFDocument, rgb, degrees, type PDFPage, type PDFFont, type PDFImage, type Color } from "pdf-lib";
import { LOGO_WHITE_PNG_BASE64 } from "./logo";
import { embedLocaleFonts } from "./fonts";
import type { Locale } from "@/lib/supabase/types";

// Single-invocation state for the locale. `generatePDF` sets this at entry
// so internal helpers (pageFooter, buildCover, etc.) can read localized
// labels without threading `locale` through every signature. Fine for
// Vercel serverless (one invocation per request, no concurrent mutation).
let currentLocale: Locale = "de";

// When true, interpretive texts are censored: first N sentences shown,
// the rest replaced with a hint. Action-plan milestones 3-4 are redacted.
// Set by generatePDF — safe for serverless single-invocation semantics.
let isSampleReport = false;

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
  ageUnit: string;
  einordnung: string;
  hauptbefund: string;
  systemischeVerbindung: string;
  limitierung: string;
  naechsterSchritt: string;
  kennwerte: string;
  findingsTitle: string;
  connectionTitle: string;
  actionPlanTitle: string;
  goalLabel: string;
  istLabel: string;
  zielValueLabel: string;
  messbarLabel: string;
  typeWeakness: string;
  typeStrength: string;
  typeConnection: string;
  dailyProtocolTitle: string;
  dailyProtocolSub: string;
  dailyMorning: string;
  dailyWorkday: string;
  dailyEvening: string;
  dailyNutrition: string;
  dailyTotalTime: (min: number) => string;
  qExcellent: string;
  qStrong: string;
  qGood: string;
  qSecured: string;
  disclaimer1: string;
  disclaimer2: string;
  censorHint: string;
  censorMilestonesHint: string;
  goalInContext: string;
}> = {
  de: {
    footerStrip: "PERFORMANCE LAB  |  Kein Ersatz f\u00FCr medizinische Beratung",
    legalTitle: "RECHTLICHER HINWEIS",
    legalAccent: "KEINE MEDIZINISCHE DIAGNOSE",
    legalSub: "PERFORMANCE-INSIGHTS  |  KEIN ERSATZ F\u00DCR \u00C4RZTLICHE BERATUNG",
    overallIndex: "OVERALL PERFORMANCE INDEX",
    gesamtbild: "GESAMTBILD",
    topPriority: "TOP PRIORIT\u00C4T",
    metKey: "MET-Minuten / Woche",
    trainingDaysKey: "Trainingstage / Woche",
    sittingKey: "Sitzzeit / Tag",
    sleepDuration: "Schlafdauer",
    sleepDurationValue: (h) => `${h} h / Nacht`,
    recoveryScore: "Recovery Score",
    vo2Estimated: "Gesch\u00E4tzter VO2max",
    fitnessLevel: "Fitness-Level",
    bmiKey: "BMI",
    bmiCategory: "Kategorie",
    stressBand: "Stressband",
    actionNeed: "Handlungsbedarf",
    actionHigh: "HOCH",
    actionModerate: "MODERAT",
    actionLow: "GERING",
    dateLocale: "de-DE",
    ageUnit: "Jahre",
    einordnung: "EINORDNUNG",
    hauptbefund: "HAUPTBEFUND",
    systemischeVerbindung: "SYSTEMISCHE VERBINDUNG",
    limitierung: "LIMITIERUNG",
    naechsterSchritt: "N\u00C4CHSTER SCHRITT",
    kennwerte: "KENNWERTE",
    findingsTitle: "DEINE 3 WICHTIGSTEN FINDINGS",
    connectionTitle: "ZUSAMMENH\u00C4NGE IN DEINEN DATEN",
    actionPlanTitle: "DEIN 30-TAGE PROTOKOLL",
    goalLabel: "ZIEL",
    istLabel: "IST:",
    zielValueLabel: "ZIEL:",
    messbarLabel: "MESSBAR:",
    typeWeakness: "SCHWACHSTELLE",
    typeStrength: "ST\u00C4RKE",
    typeConnection: "ZUSAMMENHANG",
    dailyProtocolTitle: "DEIN ALLTAGS-PROTOKOLL",
    dailyProtocolSub: "Konkrete Habits f\u00FCr deinen Alltag \u2014 kein Gym, keine Ausreden.",
    dailyMorning: "MORGEN",
    dailyWorkday: "ARBEITSTAG",
    dailyEvening: "ABEND",
    dailyNutrition: "ERN\u00C4HRUNG",
    dailyTotalTime: (min) => `${min} Min / Tag`,
    qExcellent: "EXZELLENTE DATENBASIS",
    qStrong: "STARKE DATENBASIS",
    qGood: "GUTE DATENBASIS",
    qSecured: "DATENBASIS GESICHERT",
    disclaimer1: "Alle Angaben basieren auf selbstberichteten Daten und modellbasierten Berechnungen nach IPAQ, NSF/AASM, WHO und ACSM Leitlinien. VO2max ist eine algorithmische Sch\u00E4tzung nach dem Jackson Non-Exercise Prediction Model. Dieses Dokument stellt keine Heilaussagen dar und ist kein Medizinprodukt im Sinne der MDR.",
    disclaimer2: "Dieser Report wurde auf Basis wissenschaftlicher Scoring-Modelle erstellt. Er ersetzt keine \u00E4rztliche Untersuchung, keine Labordiagnostik und keine individualisierte medizinische Beratung. Wende dich bei gesundheitlichen Beschwerden oder spezifischen Fragen an einen qualifizierten Arzt oder Therapeuten.",
    censorHint: "In der Vollversion verfugbar",
    censorMilestonesHint: "In der Vollversion",
    goalInContext: "DEIN ZIEL IM KONTEXT DEINER WERTE",
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
    ageUnit: "yrs",
    einordnung: "CONTEXT",
    hauptbefund: "KEY FINDING",
    systemischeVerbindung: "SYSTEMIC CONNECTION",
    limitierung: "LIMITATION",
    naechsterSchritt: "NEXT STEP",
    kennwerte: "KEY METRICS",
    findingsTitle: "YOUR 3 KEY FINDINGS",
    connectionTitle: "CONNECTIONS IN YOUR DATA",
    actionPlanTitle: "YOUR 30-DAY PROTOCOL",
    goalLabel: "GOAL",
    istLabel: "NOW:",
    zielValueLabel: "TARGET:",
    messbarLabel: "TRACKED:",
    typeWeakness: "WEAKNESS",
    typeStrength: "STRENGTH",
    typeConnection: "CONNECTION",
    dailyProtocolTitle: "YOUR DAILY PROTOCOL",
    dailyProtocolSub: "Concrete habits for your everyday life \u2014 no gym, no excuses.",
    dailyMorning: "MORNING",
    dailyWorkday: "WORKDAY",
    dailyEvening: "EVENING",
    dailyNutrition: "NUTRITION",
    dailyTotalTime: (min) => `${min} min / day`,
    qExcellent: "EXCELLENT DATA BASIS",
    qStrong: "STRONG DATA BASIS",
    qGood: "GOOD DATA BASIS",
    qSecured: "DATA BASIS SECURED",
    disclaimer1: "All data is based on self-reported information and model-based calculations per IPAQ, NSF/AASM, WHO and ACSM guidelines. VO2max is an algorithmic estimate based on the Jackson Non-Exercise Prediction Model. This document does not constitute medical claims and is not a medical device per MDR.",
    disclaimer2: "This report was generated using scientific scoring models. It does not replace medical examination, laboratory diagnostics, or individualised medical consultation. For health concerns or specific questions, please consult a qualified physician or therapist.",
    censorHint: "Available in full version",
    censorMilestonesHint: "In full version",
    goalInContext: "YOUR GOAL IN CONTEXT OF YOUR NUMBERS",
  },
  it: {
    footerStrip: "PERFORMANCE LAB  |  Non sostituisce la consulenza medica",
    legalTitle: "AVVISO LEGALE",
    legalAccent: "NON \u00C8 UNA DIAGNOSI MEDICA",
    legalSub: "PERFORMANCE INSIGHT  |  NON SOSTITUISCE LA CONSULENZA MEDICA",
    overallIndex: "OVERALL PERFORMANCE INDEX",
    gesamtbild: "QUADRO GENERALE",
    topPriority: "PRIORIT\u00C0 PRINCIPALE",
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
    ageUnit: "anni",
    einordnung: "CONTESTO",
    hauptbefund: "RISULTATO PRINCIPALE",
    systemischeVerbindung: "CONNESSIONE SISTEMICA",
    limitierung: "LIMITAZIONE",
    naechsterSchritt: "PASSO SUCCESSIVO",
    kennwerte: "VALORI CHIAVE",
    findingsTitle: "I TUOI 3 RISULTATI CHIAVE",
    connectionTitle: "CONNESSIONI NEI TUOI DATI",
    actionPlanTitle: "IL TUO PROTOCOLLO 30 GIORNI",
    goalLabel: "OBIETTIVO",
    istLabel: "ATTUALE:",
    zielValueLabel: "OBIETTIVO:",
    messbarLabel: "MONITORATO:",
    typeWeakness: "PUNTO DEBOLE",
    typeStrength: "PUNTO FORTE",
    typeConnection: "CONNESSIONE",
    dailyProtocolTitle: "IL TUO PROTOCOLLO QUOTIDIANO",
    dailyProtocolSub: "Abitudini concrete per la tua vita quotidiana \u2014 niente palestra, niente scuse.",
    dailyMorning: "MATTINA",
    dailyWorkday: "GIORNATA",
    dailyEvening: "SERA",
    dailyNutrition: "ALIMENTAZIONE",
    dailyTotalTime: (min) => `${min} min / giorno`,
    qExcellent: "OTTIMA BASE DATI",
    qStrong: "BUONA BASE DATI",
    qGood: "BASE DATI BUONA",
    qSecured: "BASE DATI GARANTITA",
    disclaimer1: "Tutti i dati si basano su informazioni fornite dall'utente e calcoli modellistici secondo le linee guida IPAQ, NSF/AASM, WHO e ACSM. Il VO2max \u00E8 una stima algoritmica basata sul modello Jackson Non-Exercise Prediction. Questo documento non costituisce dichiarazioni mediche e non \u00E8 un dispositivo medico ai sensi del MDR.",
    disclaimer2: "Questo report \u00E8 stato generato utilizzando modelli di scoring scientifici. Non sostituisce la visita medica, la diagnostica di laboratorio o la consulenza medica individualizzata. Per problemi di salute o domande specifiche, consultare un medico o terapista qualificato.",
    censorHint: "Nella versione completa",
    censorMilestonesHint: "Nella versione completa",
    goalInContext: "IL TUO OBIETTIVO NEL CONTESTO DEI TUOI VALORI",
  },
  tr: {
    footerStrip: "PERFORMANCE LAB  |  Tıbbi tavsiyenin yerini almaz",
    legalTitle: "YASAL UYARI",
    legalAccent: "TIBBİ TEŞHİS DE\u011EİLDİR",
    legalSub: "PERFORMANCE INSIGHT  |  TIBBİ TAVSİYENİN YERİNİ ALMAZ",
    overallIndex: "OVERALL PERFORMANCE INDEX",
    gesamtbild: "GENEL TABLO",
    topPriority: "EN \u00D6NCELİKLİ",
    metKey: "MET-dakika / hafta",
    trainingDaysKey: "Antrenman g\u00FCn\u00FC / hafta",
    sittingKey: "Oturma s\u00FCresi / g\u00FCn",
    sleepDuration: "Uyku s\u00FCresi",
    sleepDurationValue: (h) => `${h} saat / gece`,
    recoveryScore: "Recovery Score",
    vo2Estimated: "Tahmini VO2max",
    fitnessLevel: "Fitness seviyesi",
    bmiKey: "BMI",
    bmiCategory: "Kategori",
    stressBand: "Stres bandı",
    actionNeed: "Eylem gereksinimi",
    actionHigh: "Y\u00DCKSEK",
    actionModerate: "ORTA",
    actionLow: "D\u00DC\u015E\u00DCK",
    dateLocale: "tr-TR",
    ageUnit: "ya\u015F",
    einordnung: "BA\u011ELAM",
    hauptbefund: "ANA BULGU",
    systemischeVerbindung: "SİSTEMİK BA\u011E",
    limitierung: "KISITLAMA",
    naechsterSchritt: "SONRAKI ADIM",
    kennwerte: "ANAHTAR DE\u011EERLER",
    findingsTitle: "EN ONEMLI 3 BULGUN",
    connectionTitle: "VERİLERİNDEKİ BA\u011ELANTILAR",
    actionPlanTitle: "30 G\u00DCNL\u00DCK PROTOKOL\u00DCN",
    goalLabel: "HEDEF",
    istLabel: "\u015EİMDİ:",
    zielValueLabel: "HEDEF:",
    messbarLabel: "\u00D6L\u00C7\u00DCM:",
    typeWeakness: "ZAYIF Y\u00D6N",
    typeStrength: "G\u00DC\u00C7L\u00DC Y\u00D6N",
    typeConnection: "BA\u011ELANTI",
    dailyProtocolTitle: "G\u00DCNL\u00DCK PROTOKOL\u00DCN",
    dailyProtocolSub: "G\u00FCnl\u00FCk hayat\u0131n i\u00E7in somut al\u0131\u015Fkanl\u0131klar \u2014 spor salonu gerekmez, mazeret yok.",
    dailyMorning: "SABAH",
    dailyWorkday: "\u0130\u015E G\u00DCN\u00DC",
    dailyEvening: "AK\u015EAM",
    dailyNutrition: "BESLENME",
    dailyTotalTime: (min) => `G\u00FCnde ${min} dk`,
    qExcellent: "M\u00DCKEMMEL VERİ TABANI",
    qStrong: "G\u00DC\u00C7L\u00DC VERİ TABANI",
    qGood: "İYİ VERİ TABANI",
    qSecured: "VERİ TABANI G\u00DCVENCE ALTINDA",
    disclaimer1: "T\u00FCm veriler, kullan\u0131c\u0131 taraf\u0131ndan bildirilen bilgilere ve IPAQ, NSF/AASM, WHO, ACSM k\u0131lavuzlar\u0131na uygun model tabanl\u0131 hesaplamalara dayanmaktad\u0131r. VO2max, Jackson Non-Exercise Prediction Model'e dayal\u0131 algoritmik bir tahmindir. Bu belge t\u0131bbi beyan i\u00E7ermez ve MDR anlam\u0131nda t\u0131bbi cihaz de\u011Fildir.",
    disclaimer2: "Bu rapor bilimsel skorlama modelleri kullan\u0131larak olu\u015Fturulmu\u015Ftur. T\u0131bbi muayene, laboratuvar tan\u0131 veya bireysel t\u0131bbi dan\u0131\u015Fmanl\u0131\u011F\u0131n yerini almaz. Sa\u011Fl\u0131k sorunlar\u0131 veya spesifik sorular i\u00E7in l\u00FCtfen yetkin bir doktor veya terapiste dan\u0131\u015F.",
    censorHint: "Tam versiyonda mevcut",
    censorMilestonesHint: "Tam versiyonda",
    goalInContext: "DEĞERLERİNİN BAĞLAMINDA HEDEFİN",
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
  /** Optional dedicated goal-context block (C6). Rendered after
   *  executive_summary when user_stated_goals is non-empty. */
  goal_in_context?: string;
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
  /** Tägliches Alltags-Protokoll — 8–14 konkrete Habits, adressiert die
   *  schwächsten Scores ohne Trainings-Content. Pflicht-Output ab v2. */
  daily_life_protocol?: {
    morning?: PdfDailyHabit[];
    work_day?: PdfDailyHabit[];
    evening?: PdfDailyHabit[];
    nutrition_micro?: PdfDailyHabit[];
    total_time_min_per_day?: number;
  };
}

export interface PdfDailyHabit {
  habit: string;
  why_specific_to_user: string;
  time_cost_min?: number;
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

// Sanitise to WinAnsi / Latin-1 for Standard14 Helvetica. For locales that
// use an embedded TTF with wider Unicode coverage (currently only TR →
// Noto Sans), we keep the full Unicode so ğ, ı, ş render correctly. DE/EN/IT
// stay on Helvetica and get the WinAnsi filter applied.
function tx(s: string | undefined | null): string {
  const normalized = safe(s)
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2022/g, "-")
    .replace(/[\u2265\u2264]/g, "");
  if (currentLocale === "tr") return normalized;
  return normalized.replace(/[^\x00-\xFF]/g, "");
}

// Wrap text into lines that each fit within maxW.
// Word-wrap that also tracks which wrapped lines end a paragraph (either
// the very last line, or the last line before a manual \n break). Needed
// for Blocktext/justified rendering: the last line of a paragraph is NEVER
// justified — otherwise a single trailing word gets stretched across the
// full width and looks broken.
interface WrapResult {
  lines: string[];
  isParaEnd: boolean[];
}

function wrapLinesWithFlags(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
): WrapResult {
  const lines: string[] = [];
  const isParaEnd: boolean[] = [];
  const sanitised = tx(text);
  if (!sanitised.trim()) return { lines, isParaEnd };
  const paras = sanitised.split("\n");
  for (let p = 0; p < paras.length; p++) {
    const para = paras[p];
    if (!para.trim()) {
      lines.push("");
      isParaEnd.push(true);
      continue;
    }
    const paraLines: string[] = [];
    let line = "";
    for (const word of para.split(" ").filter((w) => w.length > 0)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        paraLines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) paraLines.push(line);
    for (let i = 0; i < paraLines.length; i++) {
      lines.push(paraLines[i]);
      // Last line of this paragraph block → don't justify.
      isParaEnd.push(i === paraLines.length - 1);
    }
  }
  return { lines, isParaEnd };
}

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  return wrapLinesWithFlags(text, font, size, maxW).lines;
}

// Render a single line as Blocktext (justified): all words' inter-word
// gaps are stretched so the line fills exactly maxW. Skipped for
// single-word lines and lines whose natural width already exceeds maxW.
function drawJustifiedLine(
  page: PDFPage,
  line: string,
  x: number,
  y: number,
  maxW: number,
  font: PDFFont,
  size: number,
  color: Color,
): void {
  const words = line.split(" ").filter((w) => w.length > 0);
  if (words.length <= 1) {
    page.drawText(line, { x, y, size, font, color });
    return;
  }
  let wordsTotal = 0;
  for (const w of words) wordsTotal += font.widthOfTextAtSize(w, size);
  const gapCount = words.length - 1;
  const gapW = (maxW - wordsTotal) / gapCount;
  // Safety net: if the line already overflows (very long unbreakable word),
  // just draw naturally — forcing a negative gap would reverse text.
  if (gapW <= 0) {
    page.drawText(line, { x, y, size, font, color });
    return;
  }
  let cx = x;
  for (let i = 0; i < words.length; i++) {
    page.drawText(words[i], { x: cx, y, size, font, color });
    cx += font.widthOfTextAtSize(words[i], size) + gapW;
  }
}

// Draw wrapped text; returns new y after last line.
// `justify = true` (default) renders body copy as Blocktext — last line of
// each paragraph stays left-aligned. Callers that need strict left-align
// (short captions, measured widths) pass false.
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
  justify = true,
): number {
  if (!text || !tx(text).trim()) return y;
  const lh = size * lhMul;
  const { lines, isParaEnd } = wrapLinesWithFlags(text, font, size, maxW);
  for (let i = 0; i < lines.length; i++) {
    if (y < CB) break;  // respect hard content-bottom floor
    const line = lines[i];
    if (justify && line.trim() && !isParaEnd[i]) {
      drawJustifiedLine(page, line, x, y, maxW, font, size, color);
    } else {
      page.drawText(line, { x, y, size, font, color });
    }
    y -= lh;
  }
  return y;
}

// Height that drawW() would consume (no drawing).
function textH(text: string, font: PDFFont, size: number, maxW: number, lhMul = 1.6): number {
  if (!text || !tx(text).trim()) return 0;
  return wrapLines(text, font, size, maxW).length * size * lhMul;
}

// Split text into first N sentences (visible) + hidden count.
// Used in sample mode to censor interpretive text in the PDF.
function censorText(text: string, visibleSentences = 1): { visible: string; hiddenCount: number } {
  if (!text) return { visible: "", hiddenCount: 0 };
  // Split on sentence boundaries: period/!/? followed by whitespace + capital/digit.
  const parts = text.split(/(?<=[.!?])\s+(?=[A-ZÜÖÄA-Z\d])/);
  if (parts.length <= visibleSentences) return { visible: text, hiddenCount: 0 };
  return {
    visible: parts.slice(0, visibleSentences).join(" "),
    hiddenCount: parts.length - visibleSentences,
  };
}

// Draw text censored: visible portion first, then a muted hint line.
// Returns new y after the hint (or after visible text if nothing was hidden).
function drawCensored(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxW: number,
  font: PDFFont,
  size: number,
  color: Color,
  lhMul: number,
  visibleSentences: number,
  f: F,
): number {
  if (!isSampleReport) return drawW(page, text, x, y, maxW, font, size, color, lhMul);
  const { visible, hiddenCount } = censorText(text, visibleSentences);
  y = drawW(page, visible, x, y, maxW, font, size, color, lhMul);
  if (hiddenCount > 0 && y > CB) {
    const hint = `+${hiddenCount} ${PDF_LABELS[currentLocale].censorHint}`;
    page.drawText(tx(hint), { x, y, size: 7.5, font: f.reg, color: TXT_MUTED });
    y -= 12;
  }
  return y;
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
  const info = `Performance Report - ${user.age} ${PDF_LABELS[currentLocale].ageUnit}, ${tx(user.gender)} | Overall: ${scores.overall.score}/100 (${tx(scores.overall.band)})`;
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
      const L2 = PDF_LABELS[currentLocale];
      const qLabels: Record<string, string> = {
        excellent: L2.qExcellent,
        strong:    L2.qStrong,
        good:      L2.qGood,
        secured:   L2.qSecured,
        minimal:   L2.qGood,
        none:      L2.qSecured,
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

  // C6: Goal-in-context block — only when filled. Rendered as a card
  // with accent left-bar + locale-specific heading, identical visual
  // weight to the top_priority box but earlier in the flow so the
  // user's stated goal anchors the rest of the summary.
  if (content.goal_in_context && content.goal_in_context.trim().length > 0) {
    const gicTH = textH(content.goal_in_context, f.reg, 10, CW - 32, 1.65);
    const gicH = Math.max(56, gicTH + 38);
    page.drawRectangle({ x: MX, y: y - gicH, width: CW, height: gicH, color: BG_CARD });
    page.drawRectangle({ x: MX, y: y - gicH, width: 4, height: gicH, color: ACCENT });
    page.drawText(PDF_LABELS[currentLocale].goalInContext, {
      x: MX + 16, y: y - 16, size: 7, font: f.bold, color: ACCENT,
    });
    drawW(page, content.goal_in_context, MX + 16, y - 32, CW - 32, f.reg, 10, TXT_WHITE, 1.65);
    y -= gicH + 14;
  }

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
  const meta = `BMI ${user.bmi}  |  ${user.age} ${PDF_LABELS[currentLocale].ageUnit}  |  ${tx(user.gender)}`;
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

  const L = PDF_LABELS[currentLocale];
  y = secLabel(page, L.findingsTitle, f, MX, y);
  y -= 8;

  const typeColors: Record<string, Color> = { weakness: ACCENT, strength: SC_GREEN, connection: BLUE_INFO };
  const typeLabels: Record<string, string> = {
    weakness: L.typeWeakness,
    strength: L.typeStrength,
    connection: L.typeConnection,
  };

  for (let i = 0; i < Math.min(3, findings.length); i++) {
    const f2 = findings[i];
    const col = typeColors[f2.type] ?? TXT_MUTED;
    const tLabel = typeLabels[f2.type] ?? "FINDING";
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

    // Headline — kept left-aligned; justified bold headlines look stretched.
    drawW(page, tx(f2.headline), MX + 14, y - 32, CW - 32, f.bold, 11, TXT_WHITE, 1.4, false);

    // Body — censored to 1 sentence in sample mode
    const headlineLines = wrapLines(tx(f2.headline), f.bold, 11, CW - 32);
    const bodyStartY = y - 32 - headlineLines.length * 11 * 1.4 - 6;
    const bodyText = isSampleReport ? censorText(tx(f2.body), 1).visible : tx(f2.body);
    drawW(page, bodyText, MX + 14, Math.max(y - boxH + 14, bodyStartY), CW - 32, f.reg, 9.5, TXT_MUTED, 1.6);

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

  y = secLabel(page, PDF_LABELS[currentLocale].connectionTitle, f, MX, y);
  y -= 8;

  for (const ins of insights.slice(0, 3)) {
    const bodyH = textH(ins.body, f.reg, 10, CW - 32, 1.65);
    const boxH = Math.min(Math.max(72, bodyH + 50), Math.max(0, y - CB));
    if (boxH < 40) break;

    page.drawRectangle({ x: MX, y: y - boxH, width: CW, height: boxH, color: BG_CARD });
    page.drawRectangle({ x: MX, y: y - boxH, width: 4, height: boxH, color: BLUE_INFO });

    page.drawText(tx(ins.headline).toUpperCase(), { x: MX + 14, y: y - 16, size: 9, font: f.bold, color: BLUE_INFO });
    const insBody = isSampleReport ? censorText(tx(ins.body), 1).visible : tx(ins.body);
    drawW(page, insBody, MX + 14, y - 34, CW - 32, f.reg, 10, TXT_WHITE, 1.65);

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

  const L = PDF_LABELS[currentLocale];
  y = secLabel(page, L.actionPlanTitle, f, MX, y);
  y -= 6;

  for (let gi = 0; gi < Math.min(3, goals.length); gi++) {
    const g = goals[gi];
    const milesH = (g.week_milestones?.length ?? 0) * 16 + 8;
    const boxH = Math.min(Math.max(96, milesH + 72), Math.max(0, y - CB));
    if (boxH < 60) break;

    page.drawRectangle({ x: MX, y: y - boxH, width: CW, height: boxH, color: BG_CARD });
    page.drawRectangle({ x: MX, y: y - boxH, width: 4, height: boxH, color: SC_GREEN });

    // Goal number + headline
    page.drawText(`${L.goalLabel} ${gi + 1}`, { x: MX + 14, y: y - 16, size: 6.5, font: f.bold, color: SC_GREEN });
    page.drawText(tx(g.headline).toUpperCase(), { x: MX + 14, y: y - 30, size: 10, font: f.bold, color: TXT_WHITE });

    // NOW / TARGET / SOURCE
    const cvLabel = L.istLabel;
    const tvLabel = L.zielValueLabel;
    const srcLabel = L.messbarLabel;
    page.drawText(`${cvLabel} ${tx(g.current_value)}`, { x: MX + 14, y: y - 46, size: 8, font: f.reg, color: TXT_MUTED });
    page.drawText(`${tvLabel} ${tx(g.target_value)}${g.delta_pct ? `  (${tx(g.delta_pct)})` : ""}`, { x: MX + 120, y: y - 46, size: 8, font: f.reg, color: SC_GREEN });
    page.drawText(`${srcLabel} ${tx(g.metric_source)}`, { x: MX + 14, y: y - 58, size: 7, font: f.reg, color: TXT_MUTED });

    // Week milestones — milestones 3-4 are redacted in sample mode
    if (g.week_milestones && g.week_milestones.length > 0) {
      let my = y - 72;
      const milestones = g.week_milestones.slice(0, 4);
      for (let mi = 0; mi < milestones.length; mi++) {
        if (my < y - boxH + 12) break;
        const ms = milestones[mi];
        if (typeof ms !== "object" || !ms.week || !ms.task) continue;

        if (isSampleReport && mi >= 2) {
          // Grey redaction bar for milestones 3-4
          const barW = CW - 32;
          page.drawRectangle({ x: MX + 14, y: my - 10, width: barW, height: 13, color: BG_INSET });
          const cHint = PDF_LABELS[currentLocale].censorMilestonesHint;
          const cW = f.reg.widthOfTextAtSize(cHint, 5.5);
          page.drawText(cHint, { x: MX + 14 + barW / 2 - cW / 2, y: my - 8, size: 5.5, font: f.bold, color: TXT_MUTED });
        } else {
          const rowText = `${tx(ms.week)}: ${tx(ms.task)}`;
          page.drawText(rowText, { x: MX + 14, y: my, size: 7.5, font: f.reg, color: TXT_MUTED });
          const mVal = ms.milestone ? tx(ms.milestone) : "";
          if (mVal) {
            const mW = f.bold.widthOfTextAtSize(mVal, 7.5);
            page.drawText(mVal, { x: PW - MX - mW - 14, y: my, size: 7.5, font: f.bold, color: SC_GREEN });
          }
        }
        my -= 16;
      }
    }

    y -= boxH + 8;
  }

  pageFooter(page, f, today);
}

// ── Daily-Life-Protocol page ───────────────────────────────────────────────

function buildDailyProtocolPage(
  doc: PDFDocument,
  protocol: NonNullable<PdfReportContent["daily_life_protocol"]>,
  f: F,
  today: string,
): void {
  const sections: Array<{ key: "morning" | "work_day" | "evening" | "nutrition_micro"; title: string; accent: typeof SC_GREEN }> = [
    { key: "morning", title: PDF_LABELS[currentLocale].dailyMorning, accent: SC_GREEN },
    { key: "work_day", title: PDF_LABELS[currentLocale].dailyWorkday, accent: BLUE_INFO },
    { key: "evening", title: PDF_LABELS[currentLocale].dailyEvening, accent: ACCENT },
    { key: "nutrition_micro", title: PDF_LABELS[currentLocale].dailyNutrition, accent: SC_GREEN },
  ];

  const filled = sections
    .map((s) => ({ ...s, habits: (protocol[s.key] ?? []).filter((h) => h.habit && h.why_specific_to_user) }))
    .filter((s) => s.habits.length > 0);
  if (filled.length === 0) return;

  const page = doc.addPage([PW, PH]);
  let y = pageChrome(page, f, today);

  const L = PDF_LABELS[currentLocale];
  y = secLabel(page, L.dailyProtocolTitle, f, MX, y);
  y -= 4;
  y = drawW(page, L.dailyProtocolSub, MX, y, CW, f.reg, 9, TXT_MUTED, 1.45);
  y -= 6;
  if (typeof protocol.total_time_min_per_day === "number" && protocol.total_time_min_per_day > 0) {
    page.drawText(L.dailyTotalTime(protocol.total_time_min_per_day), {
      x: MX, y, size: 9, font: f.bold, color: SC_GREEN,
    });
    y -= 14;
  }

  for (const s of filled) {
    // Approx height of each section = title + sum of habit rows
    const habits = s.habits.slice(0, 4); // cap per section
    let habitsH = 0;
    for (const h of habits) {
      habitsH += textH(tx(h.habit), f.bold, 9.5, CW - 44, 1.45) + 4;
      habitsH += textH(tx(h.why_specific_to_user), f.reg, 8, CW - 44, 1.5) + 10;
    }
    const boxH = Math.min(habitsH + 26, Math.max(0, y - CB));
    if (boxH < 40) break;

    page.drawRectangle({ x: MX, y: y - boxH, width: CW, height: boxH, color: BG_CARD });
    page.drawRectangle({ x: MX, y: y - boxH, width: 4, height: boxH, color: s.accent });

    page.drawText(s.title, { x: MX + 14, y: y - 14, size: 8, font: f.bold, color: s.accent });

    let hy = y - 28;
    for (const h of habits) {
      if (hy < y - boxH + 8) break;
      const habitText = h.time_cost_min != null && h.time_cost_min > 0
        ? `${tx(h.habit)}  ·  ${h.time_cost_min} min`
        : tx(h.habit);
      hy = drawW(page, habitText, MX + 14, hy, CW - 28, f.bold, 9.5, TXT_WHITE, 1.45, false);
      hy -= 2;
      hy = drawW(page, tx(h.why_specific_to_user), MX + 14, hy, CW - 28, f.reg, 8, TXT_MUTED, 1.5);
      hy -= 8;
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

  const PL = PDF_LABELS[currentLocale];

  // ── EINORDNUNG ────────────────────────────────────────────────────────
  if (mod.score_context) {
    y = secLabel(page, PL.einordnung, f, MX, y);
    y -= 10;
    y = drawCensored(page, mod.score_context, MX, y, CW, f.reg, L.bodySize, TXT_WHITE, L.lhBody, 2, f);
    y -= L.sectionGap;
  }

  // ── HAUPTBEFUND ───────────────────────────────────────────────────────
  const finding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  if (finding) {
    y -= 12;
    y = secLabel(page, PL.hauptbefund, f, MX, y);
    y -= 10;
    y = drawCensored(page, finding, MX, y, CW, f.bold, L.findingSize, TXT_WHITE, L.lhBody, 1, f);
    y -= L.sectionGap;
  }

  // ── Info boxes ────────────────────────────────────────────────────────
  const systemic = mod.systemic_connection ?? mod.systemic_impact ?? "";
  if (systemic && tx(systemic).trim()) {
    const systemicText = isSampleReport ? censorText(systemic, 1).visible : systemic;
    y = infoBox(page, PL.systemischeVerbindung, systemicText, f, MX, y, CW, BLUE_INFO,
      L.boxSize, L.lhBox, L.boxOverhead, L.boxGap, L.bodyOffset);
  }
  if (mod.limitation && tx(mod.limitation).trim()) {
    const limitText = isSampleReport ? censorText(mod.limitation, 1).visible : mod.limitation;
    y = infoBox(page, PL.limitierung, limitText, f, MX, y, CW, ACCENT,
      L.boxSize, L.lhBox, L.boxOverhead, L.boxGap, L.bodyOffset);
  }
  if (mod.recommendation && tx(mod.recommendation).trim()) {
    const recText = isSampleReport ? censorText(mod.recommendation, 1).visible : mod.recommendation;
    y = infoBox(page, PL.naechsterSchritt, recText, f, MX, y, CW, SC_GREEN,
      L.boxSize, L.lhBox, L.boxOverhead, L.boxGap, L.bodyOffset);
  }

  // ── Stat boxes ────────────────────────────────────────────────────────
  if (metrics.length > 0) {
    y -= 24;  // generous gap before heading (separates from previous section)
    secLabel(page, PL.kennwerte, f, MX, y);
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

  const DL = PDF_LABELS[currentLocale];
  y = drawW(page, DL.disclaimer1, MX, y, CW, f.reg, 10.5, TXT_WHITE, 1.75);
  y -= 20;
  y = drawW(page, DL.disclaimer2, MX, y, CW, f.reg, 10.5, TXT_WHITE, 1.75);
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
  isSample = false,
): Promise<Uint8Array> {
  currentLocale = locale;
  isSampleReport = isSample;
  const L = PDF_LABELS[locale];
  const today = new Date().toLocaleDateString(L.dateLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Berlin",
  });

  const doc = await PDFDocument.create();
  const { reg, bold } = await embedLocaleFonts(doc, locale);
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

  // Daily-Life-Protocol page (optional, v2+) — placed before Cross-Insights
  // so the reader hits the most concrete, actionable content first.
  if (content.daily_life_protocol) {
    buildDailyProtocolPage(doc, content.daily_life_protocol, f, today);
  }

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

  if (isSample) {
    const watermarkText: Record<string, string> = { de: "BEISPIEL", en: "SAMPLE", it: "ESEMPIO", tr: "ÖRNEK" };
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      const text = watermarkText[locale] ?? "BEISPIEL";
      const size = 96;
      const tw = f.bold.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: width / 2 - tw / 2,
        y: height / 2 - size / 2,
        size,
        font: f.bold,
        color: rgb(1, 1, 1),
        opacity: 0.07,
        rotate: degrees(45),
      });
    }
  }

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}
