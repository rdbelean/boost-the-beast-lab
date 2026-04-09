import { NextRequest, NextResponse } from "next/server";
import type { ScoreResult, AssessmentData } from "@/lib/scoring";
import { jsPDF } from "jspdf";

// ── Color helpers ──────────────────────────────────────────────
function scoreRgb(score: number): [number, number, number] {
  if (score >= 70) return [22, 163, 74];   // green
  if (score >= 40) return [202, 138, 4];   // amber
  return [196, 30, 22];                     // red
}
function scoreLabel(score: number): string {
  if (score >= 80) return "ELITE";
  if (score >= 70) return "GUT";
  if (score >= 40) return "MITTEL";
  return "NIEDRIG";
}

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

    // ── Palette (light/white theme) ────────────────────────────
    const WHITE:   [number,number,number] = [255, 255, 255];
    const BG:      [number,number,number] = [248, 248, 250];
    const SURFACE: [number,number,number] = [238, 238, 242];
    const BORDER:  [number,number,number] = [210, 210, 218];
    const ACCENT:  [number,number,number] = [220, 40,  28];
    const INK:     [number,number,number] = [18,  18,  22];
    const MUTED:   [number,number,number] = [110, 110, 120];
    const SUB:     [number,number,number] = [70,  70,  80];

    // ── Primitives ─────────────────────────────────────────────
    let curPage = 1;

    function fillPage(bg: [number,number,number] = WHITE) {
      doc.setFillColor(...bg);
      doc.rect(0, 0, W, H, "F");
    }

    function rule(y: number, c: [number,number,number] = BORDER, lw = 0.25) {
      doc.setDrawColor(...c);
      doc.setLineWidth(lw);
      doc.line(M, y, W - M, y);
    }

    function pageHeader() {
      // White top strip
      doc.setFillColor(...WHITE);
      doc.rect(0, 0, W, 14, "F");
      // Left accent bar
      doc.setFillColor(...ACCENT);
      doc.rect(0, 0, 3, 14, "F");
      // Brand
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text("BOOST THE BEAST LAB", M, 9);
      // Right meta
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(`${reportId}  ·  ${date}  ·  Seite ${curPage}`, W - M, 9, { align: "right" });
      // Bottom border
      doc.setFillColor(...ACCENT);
      doc.rect(0, 13, W, 0.8, "F");
    }

    function sectionTitle(y: number, label: string): number {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...ACCENT);
      doc.text(label, M, y);
      rule(y + 2, ACCENT, 0.4);
      return y + 6;
    }

    function scoreBar(x: number, y: number, w: number, h: number,
                      pct: number, color: [number,number,number]) {
      doc.setFillColor(...SURFACE);
      doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
      if (pct > 0.01) {
        doc.setFillColor(...color);
        doc.roundedRect(x, y, Math.max(w * pct, h), h, h / 2, h / 2, "F");
      }
    }

    function pageFooter(disclaimer = false) {
      rule(H - 13, BORDER);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      if (disclaimer) {
        const text = "Hinweis: Dieser Report dient ausschließlich der allgemeinen Information und ersetzt keinen Arztbesuch oder medizinische Diagnose. Kein Medizinprodukt i.S.d. MDR.";
        doc.text(doc.splitTextToSize(text, CW), M, H - 10);
      } else {
        doc.text("Boost The Beast Lab — Performance Intelligence System", M, H - 9);
        doc.text("boostthebeast.com", W - M, H - 9, { align: "right" });
      }
    }

    // ══════════════════════════════════════════════════════════
    // PAGE 1: DASHBOARD
    // ══════════════════════════════════════════════════════════
    fillPage(BG);
    pageHeader();

    let y = 19;

    // ── Report type label ─────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("PERFORMANCE INTELLIGENCE REPORT", M, y);
    y += 5;

    // ── Hero card ─────────────────────────────────────────────
    const heroH = 38;
    doc.setFillColor(...WHITE);
    doc.roundedRect(M, y, CW, heroH, 2, 2, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.roundedRect(M, y, CW, heroH, 2, 2, "S");
    // Red left accent on card
    doc.setFillColor(...ACCENT);
    doc.roundedRect(M, y, 3, heroH, 1, 1, "F");

    // Score number
    const oc = scoreRgb(scores.overall);
    doc.setFontSize(34);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...oc);
    doc.text(`${scores.overall}`, M + 6, y + 26);
    const numW = doc.getTextWidth(`${scores.overall}`);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("/100", M + 6 + numW + 1, y + 26);

    // Score bar
    scoreBar(M + 6, y + 29, 42, 2.5, scores.overall / 100, oc);

    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("OVERALL PERFORMANCE SCORE", M + 6, y + 6);

    // Vertical divider
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(M + 54, y + 5, M + 54, y + heroH - 5);

    // Label
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...oc);
    doc.text(scores.label, M + 58, y + 16);

    // Profile info
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SUB);
    doc.text(`${gender}  ·  ${data.age} Jahre  ·  BMI: ${scores.bmi}`, M + 58, y + 24);
    doc.text(`VO2max: ~${scores.vo2maxEstimate} ml/kg/min  ·  NEAT: ~${scores.neatEstimate} kcal/Tag`, M + 58, y + 30);

    y += heroH + 6;

    // ── Subscores (2×2) ───────────────────────────────────────
    y = sectionTitle(y, "SUBSCORES");

    const scoreData = [
      { label: "METABOLIC PERFORMANCE",   value: scores.metabolic,  desc: `BMI ${scores.bmi} · VO2max ~${scores.vo2maxEstimate} ml/kg/min · Stoffwechsel, Hydration, Mahlzeiten` },
      { label: "RECOVERY & REGENERATION", value: scores.recovery,   desc: "Schlafdauer, -qualität und nächtliche Unterbrechungen" },
      { label: "ACTIVITY PERFORMANCE",    value: scores.activity,   desc: `NEAT ~${scores.neatEstimate} kcal/Tag · Gesamtaktivität nach ACSM` },
      { label: "STRESS & LIFESTYLE",      value: scores.stress,     desc: "Stresslevel, sedentäres Verhalten, Schlafqualität" },
    ];

    const cW2 = (CW - 3) / 2;
    const cH = 32;

    scoreData.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = M + col * (cW2 + 3);
      const cy = y + row * (cH + 3);
      const c = scoreRgb(s.value);
      const lbl = scoreLabel(s.value);

      doc.setFillColor(...WHITE);
      doc.roundedRect(cx, cy, cW2, cH, 1.5, 1.5, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, cy, cW2, cH, 1.5, 1.5, "S");

      // Top colored strip
      doc.setFillColor(...c);
      doc.roundedRect(cx, cy, cW2, 2, 1, 1, "F");

      // Category label
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SUB);
      doc.text(s.label, cx + 4, cy + 7);

      // Score badge (right)
      const badgeW = doc.getTextWidth(lbl) + 6;
      doc.setFillColor(c[0], c[1], c[2]);
      doc.roundedRect(cx + cW2 - badgeW - 2, cy + 3.5, badgeW, 5, 1, 1, "F");
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...WHITE);
      doc.text(lbl, cx + cW2 - badgeW / 2 - 2, cy + 7, { align: "center" });

      // Score number
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...c);
      doc.text(`${s.value}`, cx + 4, cy + 19);
      const sw = doc.getTextWidth(`${s.value}`);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text("/100", cx + 4 + sw + 1, cy + 19);

      // Progress bar
      scoreBar(cx + 4, cy + 22, cW2 - 8, 2.5, s.value / 100, c);

      // Description
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      const descLines = doc.splitTextToSize(s.desc, cW2 - 8);
      doc.text(descLines[0] ?? "", cx + 4, cy + 27);
      if (descLines[1]) doc.text(descLines[1], cx + 4, cy + 30);
    });

    y += 2 * (cH + 3) + 6;

    // ── Derived metrics (2 cards, 1 row) ──────────────────────
    y = sectionTitle(y, "DERIVED METRICS");

    const dm = [
      { label: "VO2MAX SCHÄTZUNG",      value: `${scores.vo2maxEstimate}`, unit: "ml/kg/min", note: "Geschätzte max. Sauerstoffaufnahme (Jackson et al.)" },
      { label: "NEAT — ALLTAGSAKTIVITÄT", value: `${scores.neatEstimate}`,  unit: "kcal/Tag",  note: "Kalorienverbrauch durch Alltagsbewegung" },
    ];
    const dmH = 22;
    dm.forEach((d, i) => {
      const cx = M + i * (cW2 + 3);
      doc.setFillColor(...WHITE);
      doc.roundedRect(cx, y, cW2, dmH, 1.5, 1.5, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, y, cW2, dmH, 1.5, 1.5, "S");

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SUB);
      doc.text(d.label, cx + 4, y + 6);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text(d.value, cx + 4, y + 16);
      const vw = doc.getTextWidth(d.value);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(d.unit, cx + 4 + vw + 1, y + 16);

      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(d.note, cx + 4, y + 20);
    });

    y += dmH + 6;

    // ── Benchmark comparison ───────────────────────────────────
    y = sectionTitle(y, "BENCHMARK — DEIN SCORE VS. BEVÖLKERUNGSDURCHSCHNITT");

    const benchmarks: Record<string, number> = {
      metabolic: 55, recovery: 50, activity: 45, stress: 48,
    };
    const bmColors: [number,number,number][] = [
      [220,40,28], [59,130,246], [245,158,11], [139,92,246],
    ];
    const bmKeys = ["metabolic", "recovery", "activity", "stress"];
    const bmLabels = ["METABOLIC", "RECOVERY", "ACTIVITY", "STRESS"];
    const bmRowH = 9;

    bmKeys.forEach((key, i) => {
      const val = scores[key as keyof ScoreResult] as number;
      const avg = benchmarks[key];
      const bY = y + i * (bmRowH + 2);
      const c = bmColors[i];

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SUB);
      doc.text(bmLabels[i], M, bY + 6);

      const barX = M + 30;
      const barW = CW - 44;

      // Your score bar
      scoreBar(barX, bY, barW, 4, val / 100, c);

      // Average line
      const avgX = barX + barW * (avg / 100);
      doc.setDrawColor(...MUTED);
      doc.setLineWidth(0.4);
      doc.line(avgX, bY - 1, avgX, bY + 5);

      // Value labels
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...c);
      doc.text(`${val}`, barX + barW + 2, bY + 4);

      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(`⌀${avg}`, avgX - 2, bY - 2, { align: "center" });
    });

    y += bmKeys.length * (bmRowH + 2) + 3;

    // Legend
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("━ Dein Score   |   ┃ Bevölkerungsdurchschnitt", M, y);

    pageFooter();

    // ══════════════════════════════════════════════════════════
    // PAGE 2+: AI PERFORMANCE REPORT
    // ══════════════════════════════════════════════════════════
    doc.addPage();
    curPage = 2;
    fillPage(BG);
    pageHeader();

    y = 20;
    y = sectionTitle(y, "AI-GENERIERTER PERFORMANCE REPORT");

    if (report && report.trim()) {
      // Strip markdown bold markers
      const cleaned = report.replace(/\*\*(.+?)\*\*/g, "$1");
      const lines = cleaned.split("\n");

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SUB);

      for (const raw of lines) {
        const line = raw.trimEnd();

        if (!line.trim()) {
          y += 2.5;
          continue;
        }

        // New page if needed
        if (y > H - 22) {
          pageFooter();
          doc.addPage();
          curPage++;
          fillPage(BG);
          pageHeader();
          y = 20;
        }

        if (line.trim().startsWith("## ")) {
          y += 3;
          const heading = line.trim().replace(/^##\s*/, "");

          // Heading background
          doc.setFillColor(...SURFACE);
          doc.rect(M, y - 3.5, CW, 7, "F");
          doc.setFillColor(...ACCENT);
          doc.rect(M, y - 3.5, 2.5, 7, "F");

          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...INK);
          doc.text(heading, M + 5, y + 1.5);
          y += 8;

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...SUB);
          continue;
        }

        const wrapped: string[] = doc.splitTextToSize(line.trim(), CW - 4);
        for (const wl of wrapped) {
          if (y > H - 22) {
            pageFooter();
            doc.addPage();
            curPage++;
            fillPage(BG);
            pageHeader();
            y = 20;
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...SUB);
          }
          doc.text(wl, M + 2, y);
          y += 4.8;
        }
      }
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text("Kein KI-Report verfügbar — starte eine neue Analyse.", M + 2, y);
    }

    pageFooter(true);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BTB-Performance-Report-${reportId}.pdf"`,
      },
    });

  } catch (err) {
    console.error("PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
