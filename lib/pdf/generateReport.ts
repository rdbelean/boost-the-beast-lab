// Server-side PDF generation via @react-pdf/renderer.
// Pure JavaScript — no Chromium / Puppeteer required.
// Works reliably on Vercel serverless functions.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

// ── Types ─────────────────────────────────────────────────────────────────

export interface PdfModule {
  score_context?: string;
  key_finding?: string;
  systemic_connection?: string;
  limitation?: string;
  recommendation?: string;
  // Legacy aliases
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

// ── Colour helpers ────────────────────────────────────────────────────────

const ACCENT = "#E63222";
const BG_COVER = "#111111";
const BG_PAGE = "#F0EEEA";
const TEXT_PRIMARY = "#111111";
const TEXT_SECONDARY = "#444444";
const TEXT_MUTED = "#777777";
const BORDER_LIGHT = "#DEDAD5";
const CARD_BG = "#FFFFFF";

function scoreColor(score: number): string {
  if (score < 40) return "#E63222";
  if (score < 65) return "#F59E0B";
  if (score < 85) return "#EAB308";
  return "#22C55E";
}

function safe(s: string | undefined | null): string {
  if (!s) return "";
  return String(s);
}

// ── Styles ────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Pages
  coverPage: {
    backgroundColor: BG_COVER,
    width: "100%",
    height: "100%",
    padding: 0,
    flexDirection: "column",
  },
  contentPage: {
    backgroundColor: BG_PAGE,
    padding: "18mm 20mm",
    flexDirection: "column",
  },
  disclaimerPage: {
    backgroundColor: BG_PAGE,
    padding: "18mm 20mm",
    flexDirection: "column",
    alignItems: "center",
  },

  // Cover elements
  coverAccentBar: {
    height: 6,
    backgroundColor: ACCENT,
    width: "100%",
  },
  coverInner: {
    padding: "20mm 20mm 18mm",
    flex: 1,
    flexDirection: "column",
  },
  coverBrand: {
    fontSize: 10,
    letterSpacing: 3,
    color: "#FFFFFF",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  coverBrandSub: {
    fontSize: 7,
    letterSpacing: 2,
    color: ACCENT,
    textTransform: "uppercase",
    marginTop: 4,
  },
  coverHeroWrapper: {
    marginTop: 52,
  },
  coverHero: {
    fontSize: 52,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    letterSpacing: -1,
    lineHeight: 1.05,
    textTransform: "uppercase",
  },
  coverSubtitle: {
    marginTop: 18,
    fontSize: 12,
    color: "#AAAAAA",
    lineHeight: 1.6,
    maxWidth: 340,
  },
  coverFooterRow: {
    marginTop: "auto",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverFooterText: {
    fontSize: 7,
    color: "#555555",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  coverScoreWatermark: {
    fontSize: 110,
    color: ACCENT,
    fontFamily: "Helvetica-Bold",
    opacity: 0.15,
    lineHeight: 1,
  },

  // Page header (content pages)
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    marginBottom: 18,
  },
  pageHeaderBrand: {
    fontSize: 7,
    letterSpacing: 2,
    color: TEXT_MUTED,
    textTransform: "uppercase",
  },
  pageHeaderDate: {
    fontSize: 7,
    color: "#AAAAAA",
  },

  // Section labels
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 2.5,
    color: ACCENT,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  sectionSub: {
    fontSize: 7,
    letterSpacing: 2,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 5,
  },

  // Summary
  summaryText: {
    fontSize: 11,
    lineHeight: 1.8,
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },
  scoreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 4,
  },
  scoreCard: {
    width: "18.5%",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    borderRadius: 3,
    padding: "10 8",
  },
  scLabel: {
    fontSize: 6,
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  scValue: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
    marginBottom: 2,
  },
  scBarTrack: {
    height: 3,
    backgroundColor: BORDER_LIGHT,
    borderRadius: 2,
    marginTop: 3,
  },
  scBarFill: {
    height: 3,
    borderRadius: 2,
  },
  scBand: {
    marginTop: 5,
    fontSize: 6,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  overallBox: {
    marginTop: 14,
    padding: "12 16",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overallLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  overallValue: {
    fontSize: 42,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    lineHeight: 1,
    marginTop: 3,
  },
  overallMeta: {
    fontSize: 7,
    color: TEXT_SECONDARY,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  overallRight: {
    fontSize: 8,
    color: TEXT_MUTED,
    textAlign: "right",
    lineHeight: 1.7,
  },

  priorityBox: {
    marginTop: 12,
    padding: "10 14",
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: "#FFF5F4",
  },
  priorityLabel: {
    fontSize: 7,
    letterSpacing: 2.5,
    color: ACCENT,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  priorityText: {
    marginTop: 5,
    fontSize: 10,
    color: TEXT_PRIMARY,
    lineHeight: 1.6,
    fontFamily: "Helvetica-Bold",
  },

  // Module page
  moduleHead: {
    marginBottom: 10,
  },
  moduleTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  moduleTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  moduleScoreNum: {
    fontSize: 46,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1,
  },
  moduleScoreSub: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  moduleBand: {
    fontSize: 7,
    color: TEXT_MUTED,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 3,
  },
  moduleBarTrack: {
    marginTop: 8,
    height: 4,
    backgroundColor: BORDER_LIGHT,
  },
  moduleBarFill: {
    height: 4,
  },

  // Text blocks
  contextText: {
    fontSize: 10.5,
    color: "#555555",
    lineHeight: 1.75,
  },
  findingText: {
    fontSize: 11,
    color: TEXT_PRIMARY,
    lineHeight: 1.7,
    fontFamily: "Helvetica-Bold",
  },

  // Info boxes
  systemicBox: {
    marginTop: 12,
    padding: "10 12",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
    flexDirection: "row",
    gap: 10,
  },
  systemicIcon: {
    fontSize: 13,
    color: "#3B82F6",
    fontFamily: "Helvetica-Bold",
  },
  systemicLabel: {
    fontSize: 6.5,
    letterSpacing: 2,
    color: "#3B82F6",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  systemicText: {
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.65,
  },

  warnRow: {
    marginTop: 10,
    padding: "9 12",
    backgroundColor: "#FFF8F7",
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    flexDirection: "row",
    gap: 10,
  },
  okRow: {
    marginTop: 10,
    padding: "9 12",
    backgroundColor: "#F7FFF9",
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: "#22C55E",
    flexDirection: "row",
    gap: 10,
  },
  rowIconWarn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconOk: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconText: {
    fontSize: 9,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
  },
  rowLabel: {
    fontSize: 6.5,
    letterSpacing: 2,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  rowText: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    lineHeight: 1.6,
  },

  // Metrics table
  metricsSection: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_LIGHT,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  metricsKey: {
    fontSize: 9,
    color: TEXT_MUTED,
  },
  metricsVal: {
    fontSize: 9,
    color: TEXT_PRIMARY,
    fontFamily: "Helvetica-Bold",
  },

  // Disclaimer
  disclaimerTitle: {
    marginTop: 40,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: TEXT_PRIMARY,
    textAlign: "center",
  },
  disclaimerStrong: {
    marginTop: 10,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 1,
    textAlign: "center",
    textTransform: "uppercase",
  },
  disclaimerBody: {
    marginTop: 18,
    maxWidth: 360,
    fontSize: 10,
    lineHeight: 1.75,
    color: "#555555",
    textAlign: "center",
  },
  disclaimerContact: {
    marginTop: 28,
    fontSize: 7,
    letterSpacing: 1.5,
    color: "#999999",
    textTransform: "uppercase",
    textAlign: "center",
  },

  // Footer
  footerNote: {
    position: "absolute",
    bottom: 14,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER_LIGHT,
    paddingTop: 5,
  },
  footerText: {
    fontSize: 7,
    color: "#AAAAAA",
    letterSpacing: 0.5,
  },

  // Critical banner
  criticalBanner: {
    marginTop: 28,
    padding: "14 18",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: ACCENT,
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
  },
  criticalBadge: {
    fontSize: 7,
    letterSpacing: 2.5,
    fontFamily: "Helvetica-Bold",
    backgroundColor: ACCENT,
    color: "#FFFFFF",
    padding: "3 8",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  criticalText: {
    fontSize: 11,
    color: TEXT_PRIMARY,
    lineHeight: 1.6,
  },
});

// ── Reusable sub-components ───────────────────────────────────────────────

function PageHeader({ today }: { today: string }) {
  return (
    React.createElement(View, { style: S.pageHeader },
      React.createElement(Text, { style: S.pageHeaderBrand }, "BOOST THE BEAST LAB"),
      React.createElement(Text, { style: S.pageHeaderDate }, today),
    )
  );
}

function ScoreCard({ label, score, band }: { label: string; score: number; band: string }) {
  const color = scoreColor(score);
  const pct = Math.max(0, Math.min(100, score));
  return (
    React.createElement(View, { style: S.scoreCard },
      React.createElement(Text, { style: S.scLabel }, label),
      React.createElement(Text, { style: [S.scValue, { color }] }, String(score)),
      React.createElement(View, { style: S.scBarTrack },
        React.createElement(View, { style: [S.scBarFill, { width: `${pct}%`, backgroundColor: color }] }),
      ),
      React.createElement(Text, { style: S.scBand }, safe(band)),
    )
  );
}

function SectionRow({
  variant,
  label,
  text,
}: {
  variant: "warn" | "ok";
  label: string;
  text: string;
}) {
  const rowStyle = variant === "warn" ? S.warnRow : S.okRow;
  const iconStyle = variant === "warn" ? S.rowIconWarn : S.rowIconOk;
  const icon = variant === "warn" ? "!" : "→";
  return (
    React.createElement(View, { style: rowStyle },
      React.createElement(View, { style: iconStyle },
        React.createElement(Text, { style: S.rowIconText }, icon),
      ),
      React.createElement(View, { style: { flex: 1 } },
        React.createElement(Text, { style: S.rowLabel }, label),
        React.createElement(Text, { style: S.rowText }, safe(text)),
      ),
    )
  );
}

function ModulePage({
  title,
  score,
  band,
  mod,
  metrics,
  today,
}: {
  title: string;
  score: number;
  band: string;
  mod: PdfModule;
  metrics: Array<[string, string]>;
  today: string;
}) {
  const color = scoreColor(score);
  const keyFinding = mod.key_finding ?? mod.main_finding ?? mod.interpretation ?? "";
  const systemic = mod.systemic_connection ?? mod.systemic_impact ?? "";
  const pct = Math.max(0, Math.min(100, score));

  return (
    React.createElement(Page, { size: "A4", style: S.contentPage },
      React.createElement(PageHeader, { today }),

      // Module head
      React.createElement(View, { style: S.moduleHead },
        React.createElement(View, { style: S.moduleTitleRow },
          React.createElement(Text, { style: S.moduleTitle }, title),
          React.createElement(View, { style: { flexDirection: "row", alignItems: "baseline" } },
            React.createElement(Text, { style: [S.moduleScoreNum, { color }] }, String(score)),
            React.createElement(Text, { style: S.moduleScoreSub }, "/100"),
          ),
        ),
        React.createElement(Text, { style: S.moduleBand }, safe(band)),
        React.createElement(View, { style: S.moduleBarTrack },
          React.createElement(View, { style: [S.moduleBarFill, { width: `${pct}%`, backgroundColor: color }] }),
        ),
      ),

      // Score context
      mod.score_context ? React.createElement(React.Fragment, null,
        React.createElement(Text, { style: S.sectionSub }, "EINORDNUNG"),
        React.createElement(Text, { style: S.contextText }, safe(mod.score_context)),
      ) : null,

      // Key finding
      keyFinding ? React.createElement(React.Fragment, null,
        React.createElement(Text, { style: S.sectionSub }, "HAUPTBEFUND"),
        React.createElement(Text, { style: S.findingText }, keyFinding),
      ) : null,

      // Systemic connection
      systemic ? React.createElement(View, { style: S.systemicBox },
        React.createElement(View, { style: { flex: 1 } },
          React.createElement(Text, { style: S.systemicLabel }, "SYSTEMISCHE VERBINDUNG"),
          React.createElement(Text, { style: S.systemicText }, systemic),
        ),
      ) : null,

      // Limitation
      mod.limitation ? React.createElement(SectionRow, { variant: "warn", label: "LIMITIERUNG", text: mod.limitation }) : null,

      // Recommendation
      mod.recommendation ? React.createElement(SectionRow, { variant: "ok", label: "NÄCHSTER SCHRITT", text: mod.recommendation }) : null,

      // Metrics
      metrics.length > 0 ? React.createElement(View, { style: S.metricsSection },
        ...metrics.map(([key, val]) =>
          React.createElement(View, { key, style: S.metricsRow },
            React.createElement(Text, { style: S.metricsKey }, key),
            React.createElement(Text, { style: S.metricsVal }, val),
          )
        ),
      ) : null,

      // Footer
      React.createElement(View, { style: S.footerNote },
        React.createElement(Text, { style: S.footerText }, "PERFORMANCE LAB · Kein Ersatz für medizinische Beratung"),
        React.createElement(Text, { style: S.footerText }, today),
      ),
    )
  );
}

// ── Main document ─────────────────────────────────────────────────────────

function BTBReport({
  content,
  scores,
  user,
  today,
}: {
  content: PdfReportContent;
  scores: PdfScores;
  user: PdfUserProfile;
  today: string;
}) {
  const systemicOverview =
    content.systemic_connections_overview ?? content.systemic_connections ?? "";

  return React.createElement(Document, { title: "BTB Performance Intelligence Report" },

    // ── Page 1: Cover ───────────────────────────────────────────────────
    React.createElement(Page, { size: "A4", style: S.coverPage },
      React.createElement(View, { style: S.coverAccentBar }),
      React.createElement(View, { style: S.coverInner },
        React.createElement(Text, { style: S.coverBrand }, "BOOST THE BEAST LAB"),
        React.createElement(Text, { style: S.coverBrandSub }, "PERFORMANCE LAB"),

        React.createElement(View, { style: S.coverHeroWrapper },
          React.createElement(Text, { style: S.coverHero }, "PERFORMANCE"),
          React.createElement(Text, { style: S.coverHero }, "INTELLIGENCE"),
          React.createElement(Text, { style: S.coverHero }, "REPORT"),
        ),

        React.createElement(Text, { style: S.coverSubtitle },
          `Performance Report — ${user.age} Jahre, ${safe(user.gender)} | Overall Performance Index: ${scores.overall.score}/100 (${safe(scores.overall.band)})`
        ),

        safe(content.headline) ? React.createElement(Text, {
          style: [S.coverSubtitle, { marginTop: 12, color: "#888888", fontSize: 10 }]
        }, safe(content.headline)) : null,

        // Critical flag on cover
        content.critical_flag ? React.createElement(View, { style: S.criticalBanner },
          React.createElement(Text, { style: S.criticalBadge }, "KRITISCH"),
          React.createElement(Text, { style: S.criticalText }, safe(content.critical_flag)),
        ) : null,

        React.createElement(View, { style: S.coverFooterRow },
          React.createElement(View, null,
            React.createElement(Text, { style: S.coverFooterText }, today),
            React.createElement(Text, { style: [S.coverFooterText, { marginTop: 3 }] },
              `VERTRAULICH — NUR FÜR ${safe(user.email).toUpperCase()}`
            ),
          ),
          React.createElement(Text, { style: S.coverScoreWatermark }, String(scores.overall.score)),
        ),
      ),
    ),

    // ── Page 2: Summary ─────────────────────────────────────────────────
    React.createElement(Page, { size: "A4", style: S.contentPage },
      React.createElement(PageHeader, { today }),
      React.createElement(Text, { style: S.sectionLabel }, "GESAMTBILD"),

      // Executive summary
      React.createElement(Text, { style: S.summaryText }, safe(content.executive_summary)),

      // Score grid — 5 cards
      React.createElement(View, { style: S.scoreGrid },
        React.createElement(ScoreCard, { label: "ACTIVITY", score: scores.activity.score, band: scores.activity.band }),
        React.createElement(ScoreCard, { label: "SLEEP", score: scores.sleep.score, band: scores.sleep.band }),
        React.createElement(ScoreCard, { label: "VO2MAX", score: scores.vo2max.score, band: scores.vo2max.band }),
        React.createElement(ScoreCard, { label: "METABOLIC", score: scores.metabolic.score, band: scores.metabolic.band }),
        React.createElement(ScoreCard, { label: "STRESS", score: scores.stress.score, band: scores.stress.band }),
      ),

      // Overall index
      React.createElement(View, { style: S.overallBox },
        React.createElement(View, null,
          React.createElement(Text, { style: S.overallLabel }, "OVERALL PERFORMANCE INDEX"),
          React.createElement(Text, { style: S.overallValue }, String(scores.overall.score)),
          React.createElement(Text, { style: S.overallMeta }, safe(scores.overall.band)),
        ),
        React.createElement(Text, { style: S.overallRight },
          `BMI ${user.bmi} · ${safe(user.bmi_category)}\n${user.age} Jahre · ${safe(user.gender)}`
        ),
      ),

      // Top priority
      React.createElement(View, { style: S.priorityBox },
        React.createElement(Text, { style: S.priorityLabel }, "TOP PRIORITÄT"),
        React.createElement(Text, { style: S.priorityText }, safe(content.top_priority)),
      ),

      React.createElement(View, { style: S.footerNote },
        React.createElement(Text, { style: S.footerText }, "PERFORMANCE LAB · Kein Ersatz für medizinische Beratung"),
        React.createElement(Text, { style: S.footerText }, today),
      ),
    ),

    // ── Pages 3–7: Module pages (Activity, Sleep, VO2max, Metabolic, Stress) ──

    React.createElement(ModulePage, {
      title: "ACTIVITY",
      score: scores.activity.score,
      band: scores.activity.band,
      mod: content.modules.activity,
      metrics: [
        ["Gesamt MET-Minuten / Woche", String(scores.total_met)],
        ...(scores.sitting_hours != null ? [["Sitzzeit / Tag", `${scores.sitting_hours} h`] as [string, string]] : []),
        ...(scores.training_days != null ? [["Trainingseinheiten / Woche", String(scores.training_days)] as [string, string]] : []),
      ],
      today,
    }),

    React.createElement(ModulePage, {
      title: "SLEEP",
      score: scores.sleep.score,
      band: scores.sleep.band,
      mod: content.modules.sleep,
      metrics: [
        ["Schlafdauer", `${scores.sleep_duration_hours} h / Nacht`],
        ["Recovery Score", `${scores.recovery.score}/100 (${safe(scores.recovery.band)})`],
      ],
      today,
    }),

    React.createElement(ModulePage, {
      title: "VO2MAX",
      score: scores.vo2max.score,
      band: scores.vo2max.band,
      mod: content.modules.vo2max,
      metrics: [
        ["Geschätzter VO2max", `${scores.vo2max.estimated} ml/kg/min`],
      ],
      today,
    }),

    React.createElement(ModulePage, {
      title: "METABOLIC",
      score: scores.metabolic.score,
      band: scores.metabolic.band,
      mod: content.modules.metabolic,
      metrics: [
        ["BMI", `${user.bmi} (${safe(user.bmi_category)})`],
      ],
      today,
    }),

    React.createElement(ModulePage, {
      title: "STRESS",
      score: scores.stress.score,
      band: scores.stress.band,
      mod: content.modules.stress,
      metrics: [],
      today,
    }),

    // Optional systemic connections page
    systemicOverview ? React.createElement(Page, { size: "A4", style: S.contentPage },
      React.createElement(PageHeader, { today }),
      React.createElement(Text, { style: S.sectionLabel }, "DAS SYSTEM VERSTEHEN"),
      React.createElement(Text, { style: [S.moduleTitle, { fontSize: 22, marginBottom: 16 }] }, "SYSTEMISCHE VERBINDUNGEN"),
      React.createElement(Text, { style: S.summaryText }, systemicOverview),

      React.createElement(View, {
        style: {
          marginTop: 28,
          padding: "16 20",
          backgroundColor: "#F0FDF4",
          borderWidth: 1,
          borderColor: "#BBF7D0",
          borderLeftWidth: 4,
          borderLeftColor: "#22C55E",
        }
      },
        React.createElement(Text, {
          style: {
            fontSize: 7,
            letterSpacing: 2.5,
            color: "#16A34A",
            textTransform: "uppercase",
            fontFamily: "Helvetica-Bold",
            marginBottom: 7,
          }
        }, "30-TAGE PROGNOSE"),
        React.createElement(Text, { style: { fontSize: 10.5, color: TEXT_SECONDARY, lineHeight: 1.75 } },
          safe(content.prognose_30_days)
        ),
      ),

      React.createElement(View, { style: S.footerNote },
        React.createElement(Text, { style: S.footerText }, "PERFORMANCE LAB · Kein Ersatz für medizinische Beratung"),
        React.createElement(Text, { style: S.footerText }, today),
      ),
    ) : null,

    // ── Page 8: Disclaimer ───────────────────────────────────────────────
    React.createElement(Page, { size: "A4", style: S.disclaimerPage },
      React.createElement(Text, { style: S.sectionLabel }, "RECHTLICHER HINWEIS"),
      React.createElement(Text, { style: S.disclaimerTitle }, "KEINE MEDIZINISCHE DIAGNOSE"),
      React.createElement(Text, { style: S.disclaimerStrong },
        "PERFORMANCE-INSIGHTS · KEIN ERSATZ FÜR ÄRZTLICHE BERATUNG"
      ),
      React.createElement(Text, { style: S.disclaimerBody }, safe(content.disclaimer)),
      React.createElement(Text, { style: S.disclaimerBody },
        "Alle Angaben basieren auf selbstberichteten Daten und modellbasierten Berechnungen nach IPAQ, NSF/AASM, WHO und ACSM Leitlinien. VO2max ist eine algorithmische Schätzung (Jackson Non-Exercise Prediction). Dieses Dokument stellt keine Heilaussagen dar und ist kein Medizinprodukt im Sinne der MDR."
      ),
      React.createElement(Text, { style: S.disclaimerContact },
        `LAB@BOOSTTHEBEAST.COM · MODELL v1.0.0 · ${today}`
      ),
    ),

  ); // end Document
}

// ── Export ────────────────────────────────────────────────────────────────

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

  const doc = React.createElement(BTBReport, { content, scores, user, today }) as React.ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(doc);
  return new Uint8Array(buffer);
}
