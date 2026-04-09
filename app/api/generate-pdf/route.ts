import { NextRequest, NextResponse } from "next/server";
import type { ScoreResult, AssessmentData } from "@/lib/scoring";
import { jsPDF } from "jspdf";

// ── Brand colors (from globals.css) ───────────────────────────
const BRAND_DARK:   [number,number,number] = [13,  13,  15];   // #0D0D0F
const BRAND_ALT:    [number,number,number] = [22,  22,  24];   // #161618
const BRAND_ACCENT: [number,number,number] = [230, 50,  34];   // #E63222
const BRAND_ACCENT2:[number,number,number] = [255, 107, 90];   // #FF6B5A
const WHITE:        [number,number,number] = [255, 255, 255];
const OFF_WHITE:    [number,number,number] = [248, 248, 250];
const BORDER:       [number,number,number] = [225, 225, 232];
const INK:          [number,number,number] = [18,  18,  22];
const SECONDARY:    [number,number,number] = [80,  80,  92];
const MUTED:        [number,number,number] = [140, 140, 152];
const SUCCESS:      [number,number,number] = [22,  163, 74];
const AMBER:        [number,number,number] = [202, 138, 4];

function scoreRgb(s: number): [number,number,number] {
  if (s >= 70) return SUCCESS;
  if (s >= 40) return AMBER;
  return BRAND_ACCENT;
}
function scoreTier(s: number): "high"|"mid"|"low" {
  return s >= 70 ? "high" : s >= 40 ? "mid" : "low";
}
function scoreBadge(s: number): string {
  if (s >= 80) return "ELITE";
  if (s >= 70) return "GUT";
  if (s >= 40) return "MITTEL";
  return "NIEDRIG";
}

// ── Per-category text content ──────────────────────────────────
const INTERPRETATIONS: Record<string, Record<"high"|"mid"|"low", string>> = {
  metabolic: {
    high: "Dein Stoffwechsel arbeitet auf hohem Niveau. BMI und VO2max liegen im optimalen Bereich. Ernährungs- und Aktivitätsgewohnheiten sind vorbildlich — halte dieses Niveau konsequent aufrecht.",
    mid:  "Dein Stoffwechsel ist solide aufgestellt, zeigt aber Verbesserungspotenzial. Gezielte Anpassungen bei Hydration, Mahlzeitenfrequenz und Körperzusammensetzung können deinen Score signifikant steigern.",
    low:  "Dein Stoffwechsel arbeitet unter seinem Potenzial. BMI-Optimierung, regelmäßigere Mahlzeiten und ausreichende Flüssigkeitszufuhr sind die wichtigsten Stellschrauben für sofortige Verbesserung.",
  },
  recovery: {
    high: "Deine Regenerationskapazität ist ausgezeichnet. Schlafdauer und -qualität liegen im optimalen Bereich und bilden das Fundament für maximale Performance in allen anderen Bereichen.",
    mid:  "Deine Erholung ist ausreichend, aber nicht optimal. Kleine Anpassungen bei Schlafhygiene und Schlafumgebung können deine Regeneration und damit alle anderen Scores deutlich verbessern.",
    low:  "Deine Regeneration ist stark eingeschränkt. Unzureichender Schlaf ist der Nr. 1 Performance-Killer und reduziert Stoffwechsel, Aktivitätskapazität und Stressresilienz gleichzeitig.",
  },
  activity: {
    high: "Dein Aktivitätslevel übertrifft die WHO-Empfehlungen deutlich. Die Kombination aus gezieltem Training und hoher Alltagsaktivität (NEAT) ist die Basis deines starken Gesamtscores.",
    mid:  "Du bewegst dich regelmäßig, schöpfst dein Aktivitätspotenzial aber nicht vollständig aus. Mehr Alltagsbewegung und konsistenteres Training würden deinen Score und deine Gesamtperformance deutlich heben.",
    low:  "Dein Aktivitätslevel liegt unterhalb der WHO-Mindestempfehlung von 150 Min. moderater Aktivität pro Woche. Hier liegt das größte und unmittelbarste Verbesserungspotenzial.",
  },
  stress: {
    high: "Dein Stressmanagement und dein Lifestyle sind auf sehr gutem Niveau. Deine aktuelle Work-Life-Balance unterstützt nachhaltige Performance ohne die typischen Burnout-Risiken.",
    mid:  "Dein Stresslevel ist erhöht aber noch handhabbar. Mit gezielten Stressmanagement-Techniken und mehr Bewegung kannst du deine Resilienz und Stresstoleranz deutlich steigern.",
    low:  "Chronischer Stress belastet deinen gesamten Körper. Cortisol und Entzündungsmarker sind wahrscheinlich erhöht, was alle anderen Performance-Bereiche negativ beeinflusst.",
  },
};

const ACTIONS: Record<string, string[]> = {
  metabolic: [
    "2,5–3 L Wasser täglich — Dehydration senkt Stoffwechsel um bis zu 3%",
    "Protein erhöhen auf 1,6–2,2 g/kg KG für höheren thermischen Effekt",
    "3–5 Mahlzeiten/Tag — stabilisiert Blutzucker und Metabolismus",
    "Sitzpausen alle 45 Min. (2–3 Min. Bewegung steigert NEAT signifikant)",
  ],
  recovery: [
    "7–9 h Schlaf pro Nacht — jede Stunde unter 7h reduziert Recovery um ~15%",
    "Schlafzimmer auf 16–18°C kühlen (optimale Tiefschlaf-Temperatur)",
    "Bildschirmzeit 60 Min. vor dem Schlafen reduzieren (Melatonin -50%)",
    "Feste Schlafenszeit auch am Wochenende für stabilen zirkadianen Rhythmus",
  ],
  activity: [
    "WHO-Ziel: min. 150 Min. moderate Aktivität pro Woche — schrittweise steigern",
    "8.000–10.000 Schritte/Tag (je +1.000 Schritte senken Mortalität um 6%)",
    "Kraft + Ausdauer kombinieren (Hybrid-Training = höchste Score-Verbesserung)",
    "10–15 Min. Einheiten über den Tag verteilen wenn längere Sessions nicht möglich",
  ],
  stress: [
    "Box Breathing 5–10 Min. täglich (4-4-4-4) — Cortisol nachweislich -25%",
    "Sitzzeit unter 8 h/Tag halten — erhöht Cortisol und Inflammationsmarker",
    "20 Min. Gehen täglich senkt Stresshormone signifikant und sofort",
    "Schlafoptimierung hat den stärksten Einzeleffekt auf Stress-Resilienz",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { scores, report, data }: {
      scores: ScoreResult; report: string; data: AssessmentData;
    } = await req.json();

    const reportId = `BTB-${Date.now().toString(36).toUpperCase()}`;
    const date = new Date().toLocaleDateString("de-DE", {
      day: "2-digit", month: "long", year: "numeric",
    });
    const gender = data.gender === "male" ? "Männlich"
      : data.gender === "female" ? "Weiblich" : "Divers";

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, H = 297, M = 16, CW = W - M * 2;
    let pageNum = 0;

    // ── Layout helpers ─────────────────────────────────────────
    function newPage(isFirst = false) {
      if (!isFirst) doc.addPage();
      pageNum++;

      // Background
      doc.setFillColor(...OFF_WHITE);
      doc.rect(0, 0, W, H, "F");

      // ── Dark header band ──────────────────────────────────────
      doc.setFillColor(...BRAND_DARK);
      doc.rect(0, 0, W, 17, "F");

      // Red accent stripe on left
      doc.setFillColor(...BRAND_ACCENT);
      doc.rect(0, 0, 3.5, 17, "F");

      // Brand name
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...WHITE);
      doc.text("BOOST THE BEAST LAB", M, 7);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 160, 170);
      doc.text("PERFORMANCE INTELLIGENCE REPORT", M, 12);

      // Right: meta
      doc.setFontSize(6.5);
      doc.setTextColor(160, 160, 170);
      doc.text(`${reportId}  ·  ${date}  ·  Seite ${pageNum}`, W - M, 10, { align: "right" });

      // Gradient-style separator (two-tone line)
      doc.setFillColor(...BRAND_ACCENT);
      doc.rect(0, 17, W * 0.6, 1.2, "F");
      doc.setFillColor(...BRAND_ACCENT2);
      doc.rect(W * 0.6, 17, W * 0.4, 1.2, "F");

      // ── Dark footer band ──────────────────────────────────────
      doc.setFillColor(...BRAND_ALT);
      doc.rect(0, H - 11, W, 11, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 110);
      doc.text("Boost The Beast Lab — Performance Intelligence System", M, H - 5);
      doc.text("boostthebeast.com", W - M, H - 5, { align: "right" });
    }

    function sectionHead(y: number, label: string): number {
      doc.setFillColor(235, 235, 240);
      doc.rect(M, y, CW, 7, "F");
      doc.setFillColor(...BRAND_ACCENT);
      doc.rect(M, y, 3, 7, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_ACCENT);
      doc.text(label, M + 5.5, y + 4.8);
      return y + 10;
    }

    function bar(x: number, y: number, w: number, h: number,
                 pct: number, color: [number,number,number]) {
      doc.setFillColor(...BORDER);
      doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
      if (pct > 0.01) {
        doc.setFillColor(...color);
        doc.roundedRect(x, y, Math.max(w * pct, h), h, h / 2, h / 2, "F");
      }
    }

    function badge(x: number, y: number, label: string,
                   fg: [number,number,number], bg: [number,number,number]) {
      const tw = doc.getTextWidth(label) + 5;
      doc.setFillColor(...bg);
      doc.roundedRect(x, y - 3.8, tw, 5.2, 1, 1, "F");
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...fg);
      doc.text(label, x + 2.5, y, { baseline: "bottom" } as never);
      return tw;
    }

    // ════════════════════════════════════════════════════════════
    // PAGE 1 — PERFORMANCE DASHBOARD
    // ════════════════════════════════════════════════════════════
    newPage(true);
    let y = 21;

    // ── Hero: Overall Score ────────────────────────────────────
    const oc = scoreRgb(scores.overall);
    doc.setFillColor(...WHITE);
    doc.roundedRect(M, y, CW, 36, 2, 2, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.roundedRect(M, y, CW, 36, 2, 2, "S");

    // Left red bar on card
    doc.setFillColor(...BRAND_ACCENT);
    doc.roundedRect(M, y, 3.5, 36, 1, 1, "F");

    // Score label
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("OVERALL PERFORMANCE SCORE", M + 7, y + 6);

    // Big score
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...oc);
    doc.text(`${scores.overall}`, M + 7, y + 22);
    const numW = doc.getTextWidth(`${scores.overall}`);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("/100", M + 7 + numW + 1, y + 22);

    bar(M + 7, y + 25, 44, 2.8, scores.overall / 100, oc);

    // Vertical divider
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(M + 57, y + 4, M + 57, y + 32);

    // Label + profile
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...oc);
    doc.text(scores.label, M + 62, y + 14);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SECONDARY);
    doc.text(`${gender}  ·  ${data.age} Jahre  ·  BMI: ${scores.bmi}`, M + 62, y + 22);
    doc.text(`VO2max ~${scores.vo2maxEstimate} ml/kg/min  ·  NEAT ~${scores.neatEstimate} kcal/Tag`, M + 62, y + 28);

    y += 40;

    // ── Subscores 2×2 ─────────────────────────────────────────
    y = sectionHead(y, "SUBSCORES IM DETAIL");

    const scoreData = [
      { key: "metabolic",  label: "METABOLIC PERFORMANCE",   desc: `BMI ${scores.bmi} · VO2max ~${scores.vo2maxEstimate} ml/kg/min` },
      { key: "recovery",   label: "RECOVERY & REGENERATION", desc: "Schlaf · Qualität · Unterbrechungen" },
      { key: "activity",   label: "ACTIVITY PERFORMANCE",    desc: `NEAT ~${scores.neatEstimate} kcal/Tag · ACSM-Richtlinien` },
      { key: "stress",     label: "STRESS & LIFESTYLE",      desc: "Stresslevel · Sedentärverhalten · Schlaf" },
    ];
    const cW2 = (CW - 3) / 2;
    const cH = 30;

    scoreData.forEach((s, i) => {
      const sv = scores[s.key as keyof ScoreResult] as number;
      const col = i % 2, row = Math.floor(i / 2);
      const cx = M + col * (cW2 + 3);
      const cy = y + row * (cH + 3);
      const c = scoreRgb(sv);

      doc.setFillColor(...WHITE);
      doc.roundedRect(cx, cy, cW2, cH, 1.5, 1.5, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.roundedRect(cx, cy, cW2, cH, 1.5, 1.5, "S");
      // Top score-color strip
      doc.setFillColor(...c);
      doc.roundedRect(cx, cy, cW2, 2.2, 1, 1, "F");

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text(s.label, cx + 4, cy + 7.5);

      badge(cx + cW2 - doc.getTextWidth(scoreBadge(sv)) - 9, cy + 7.5,
            scoreBadge(sv), WHITE, c);

      doc.setFontSize(19);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...c);
      doc.text(`${sv}`, cx + 4, cy + 19);
      const sw = doc.getTextWidth(`${sv}`);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text("/100", cx + 4 + sw + 1, cy + 19);

      bar(cx + 4, cy + 22.5, cW2 - 8, 2.5, sv / 100, c);

      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(s.desc, cx + 4, cy + 27.5);
    });

    y += 2 * (cH + 3) + 5;

    // ── Derived Metrics ────────────────────────────────────────
    y = sectionHead(y, "DERIVED METRICS");

    const dmH = 20;
    const dmItems = [
      { label: "VO2MAX SCHÄTZUNG",        value: `${scores.vo2maxEstimate}`, unit: "ml/kg/min", note: "Maximale Sauerstoffaufnahme (Jackson et al. 1990)" },
      { label: "NEAT — ALLTAGSAKTIVITÄT", value: `${scores.neatEstimate}`,   unit: "kcal/Tag",  note: "Non-Exercise Activity Thermogenesis" },
    ];
    dmItems.forEach((d, i) => {
      const cx = M + i * (cW2 + 3);
      doc.setFillColor(...WHITE);
      doc.roundedRect(cx, y, cW2, dmH, 1.5, 1.5, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.roundedRect(cx, y, cW2, dmH, 1.5, 1.5, "S");

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SECONDARY);
      doc.text(d.label, cx + 4, y + 6);

      doc.setFontSize(17);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text(d.value, cx + 4, y + 15);
      const vw = doc.getTextWidth(d.value);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(d.unit, cx + 4 + vw + 1.5, y + 15);

      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(d.note, cx + 4, y + 18.5);
    });

    y += dmH + 5;

    // ── Benchmark ─────────────────────────────────────────────
    y = sectionHead(y, "BENCHMARK — DEIN SCORE VS. BEVÖLKERUNGSDURCHSCHNITT");

    const bmData = [
      { key: "metabolic", label: "METABOLIC", avg: 55, color: BRAND_ACCENT },
      { key: "recovery",  label: "RECOVERY",  avg: 50, color: [59,130,246] as [number,number,number] },
      { key: "activity",  label: "ACTIVITY",  avg: 45, color: AMBER },
      { key: "stress",    label: "STRESS",    color: [139,92,246] as [number,number,number], avg: 48 },
    ];
    const bmBarW = CW - 34;

    bmData.forEach((bm, i) => {
      const val = scores[bm.key as keyof ScoreResult] as number;
      const by = y + i * 11;

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SECONDARY);
      doc.text(bm.label, M, by + 5);

      bar(M + 30, by, bmBarW, 5, val / 100, bm.color);

      // Average marker
      const avgX = M + 30 + bmBarW * (bm.avg / 100);
      doc.setDrawColor(...SECONDARY);
      doc.setLineWidth(0.5);
      doc.line(avgX, by - 0.5, avgX, by + 5.5);

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...bm.color);
      doc.text(`${val}`, M + 30 + bmBarW + 2, by + 4);

      doc.setFontSize(5.5);
      doc.setTextColor(...MUTED);
      doc.text(`Ø${bm.avg}`, avgX, by - 1.5, { align: "center" });
    });

    y += 4 * 11 + 2;
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("Farbiger Balken = Dein Score   |   Senkrechte Linie = Bevölkerungsdurchschnitt", M, y);

    // ════════════════════════════════════════════════════════════
    // PAGE 2 — ANALYSIS + RECOMMENDATIONS + AI REPORT
    // ════════════════════════════════════════════════════════════
    newPage();
    y = 21;

    // ── Score Interpretations ──────────────────────────────────
    y = sectionHead(y, "LEISTUNGSANALYSE IM DETAIL");

    scoreData.forEach((s, i) => {
      const sv = scores[s.key as keyof ScoreResult] as number;
      const c = scoreRgb(sv);
      const text = INTERPRETATIONS[s.key][scoreTier(sv)];

      // Category heading row
      doc.setFillColor(c[0], c[1], c[2], 0.08 as never);
      // light tint background
      const bgR = Math.round(WHITE[0] * 0.94 + c[0] * 0.06);
      const bgG = Math.round(WHITE[1] * 0.94 + c[1] * 0.06);
      const bgB = Math.round(WHITE[2] * 0.94 + c[2] * 0.06);
      doc.setFillColor(bgR, bgG, bgB);
      doc.rect(M, y, CW, 5.5, "F");
      doc.setFillColor(...c);
      doc.rect(M, y, 2.5, 5.5, "F");

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...c);
      doc.text(s.label, M + 5, y + 4);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...c);
      doc.text(`${sv}/100`, W - M, y + 4, { align: "right" });

      y += 7;

      // Interpretation text
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SECONDARY);
      const lines: string[] = doc.splitTextToSize(text, CW - 2);
      lines.forEach((l: string) => {
        doc.text(l, M + 2, y);
        y += 4.2;
      });

      if (i < scoreData.length - 1) y += 2;
    });

    y += 4;

    // ── Priority Actions (top 2 weakest scores) ────────────────
    y = sectionHead(y, "DEINE PRIORITÄTEN — KONKRETE MAßNAHMEN");

    const sortedKeys = ["metabolic", "recovery", "activity", "stress"]
      .sort((a, b) => (scores[a as keyof ScoreResult] as number) - (scores[b as keyof ScoreResult] as number))
      .slice(0, 2);

    sortedKeys.forEach((key, idx) => {
      const sv = scores[key as keyof ScoreResult] as number;
      const c = scoreRgb(sv);
      const label = scoreData.find(s => s.key === key)?.label ?? key.toUpperCase();

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...c);
      doc.text(`${idx + 1}. ${label}  (${sv}/100)`, M + 2, y);
      y += 5;

      ACTIONS[key].forEach((action) => {
        if (y > H - 18) {
          newPage();
          y = 21;
        }
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...SECONDARY);
        // Bullet
        doc.setFillColor(...c);
        doc.circle(M + 3.5, y - 1.3, 0.9, "F");
        const wrapped: string[] = doc.splitTextToSize(action, CW - 10);
        wrapped.forEach((wl: string, wi: number) => {
          doc.text(wl, M + 6, y + wi * 4);
        });
        y += wrapped.length * 4 + 1;
      });

      if (idx < sortedKeys.length - 1) y += 3;
    });

    y += 5;

    // ── AI Report ─────────────────────────────────────────────
    if (report && report.trim()) {
      if (y > H - 60) {
        newPage();
        y = 21;
      }
      y = sectionHead(y, "KI-GENERIERTER PERFORMANCE BERICHT");

      const cleaned = report.replace(/\*\*(.+?)\*\*/g, "$1");

      for (const raw of cleaned.split("\n")) {
        const line = raw.trimEnd();

        if (y > H - 18) {
          newPage();
          y = 21;
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...SECONDARY);
        }

        if (!line.trim()) { y += 2; continue; }

        if (line.trim().startsWith("## ")) {
          y += 2;
          if (y > H - 30) { newPage(); y = 21; }
          const heading = line.trim().replace(/^##\s*/, "");
          doc.setFillColor(235, 235, 240);
          doc.rect(M, y - 3, CW, 6.5, "F");
          doc.setFillColor(...BRAND_ACCENT);
          doc.rect(M, y - 3, 2.5, 6.5, "F");
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...INK);
          doc.text(heading, M + 5, y + 1.5);
          y += 9;
          doc.setFontSize(7.8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...SECONDARY);
          continue;
        }

        const wrapped: string[] = doc.splitTextToSize(line.trim(), CW - 4);
        for (const wl of wrapped) {
          if (y > H - 18) { newPage(); y = 21; doc.setFontSize(7.8); doc.setFont("helvetica", "normal"); doc.setTextColor(...SECONDARY); }
          doc.text(wl, M + 2, y);
          y += 4.5;
        }
      }
    }

    // Disclaimer
    y += 4;
    if (y > H - 26) { newPage(); y = 21; }
    doc.setFontSize(5.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const disc = "Hinweis: Dieser Report dient ausschließlich der allgemeinen Information und ersetzt keinen Arztbesuch, keine medizinische Diagnose oder Therapieempfehlung. Bei gesundheitlichen Beschwerden konsultieren Sie bitte immer einen Arzt. Kein Medizinprodukt i.S.d. MDR.";
    doc.text(doc.splitTextToSize(disc, CW), M, y);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BTB-Report-${reportId}.pdf"`,
      },
    });

  } catch (err) {
    console.error("PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
