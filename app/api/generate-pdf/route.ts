import { NextRequest, NextResponse } from "next/server";
import type { ScoreResult, AssessmentData } from "@/lib/scoring";
import { jsPDF } from "jspdf";

function scoreRgb(score: number): [number, number, number] {
  if (score >= 70) return [34, 197, 94];
  if (score >= 40) return [245, 158, 11];
  return [230, 50, 34];
}

function scoreLabelText(score: number): string {
  if (score >= 80) return "ELITE";
  if (score >= 70) return "GUT";
  if (score >= 40) return "MITTEL";
  return "NIEDRIG";
}

export async function POST(req: NextRequest) {
  try {
    const { scores, report, data }: { scores: ScoreResult; report: string; data: AssessmentData } =
      await req.json();

    const reportId = `BTB-${Date.now().toString(36).toUpperCase()}`;
    const date = new Date().toLocaleDateString("de-DE", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const H = 297;
    const M = 16;
    const CW = W - M * 2;

    // ── Palette ────────────────────────────────────────────────
    const BG:        [number,number,number] = [10,  10,  12];
    const SURFACE:   [number,number,number] = [22,  22,  26];
    const SURFACE2:  [number,number,number] = [30,  30,  36];
    const BORDER:    [number,number,number] = [46,  46,  56];
    const ACCENT:    [number,number,number] = [230, 50,  34];
    const WHITE:     [number,number,number] = [240, 240, 244];
    const MUTED:     [number,number,number] = [90,  90,  100];
    const SECONDARY: [number,number,number] = [150, 150, 162];

    // ── Helpers ────────────────────────────────────────────────
    function fillPage() {
      doc.setFillColor(...BG);
      doc.rect(0, 0, W, H, "F");
    }

    function hRule(y: number, color: [number,number,number] = BORDER, lw = 0.3) {
      doc.setDrawColor(...color);
      doc.setLineWidth(lw);
      doc.line(M, y, W - M, y);
    }

    function card(x: number, y: number, w: number, h: number, fill = SURFACE) {
      doc.setFillColor(...fill);
      doc.roundedRect(x, y, w, h, 2, 2, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, w, h, 2, 2, "S");
    }

    function bar(x: number, y: number, w: number, h: number, pct: number, color: [number,number,number]) {
      doc.setFillColor(...BORDER);
      doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
      if (pct > 0) {
        doc.setFillColor(...color);
        doc.roundedRect(x, y, Math.max(w * pct, h), h, h / 2, h / 2, "F");
      }
    }

    function scoreTag(x: number, y: number, score: number) {
      const c = scoreRgb(score);
      const label = scoreLabelText(score);
      const tw = doc.getTextWidth(label) + 6;
      doc.setFillColor(c[0], c[1], c[2], 0.15 as unknown as number);
      // semi-transparent fill using opacity trick
      doc.setFillColor(Math.min(255, BG[0] + Math.round((c[0]-BG[0])*0.2)), Math.min(255, BG[1] + Math.round((c[1]-BG[1])*0.2)), Math.min(255, BG[2] + Math.round((c[2]-BG[2])*0.2)));
      doc.roundedRect(x, y - 4, tw, 6, 1, 1, "F");
      doc.setDrawColor(...c);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y - 4, tw, 6, 1, 1, "S");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...c);
      doc.text(label, x + 3, y, { baseline: "bottom" } as never);
    }

    // ═══════════════════════════════════════════════════════════
    // PAGE 1: COVER / DASHBOARD
    // ═══════════════════════════════════════════════════════════
    fillPage();

    // ── Top accent strip ───────────────────────────────────────
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, 4, H, "F");

    // ── Header ────────────────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("BOOST THE BEAST", M + 4, 18);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ACCENT);
    doc.text("PERFORMANCE LAB", M + 4, 23);

    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`REPORT ID: ${reportId}`, W - M, 18, { align: "right" });
    doc.text(date, W - M, 23, { align: "right" });

    hRule(27, ACCENT, 0.4);

    // ── Hero title ────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setTextColor(...ACCENT);
    doc.text("PERFORMANCE INTELLIGENCE REPORT", M + 4, 35);

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("COMPLETE PERFORMANCE", M + 4, 45);
    doc.text("ANALYSIS", M + 4, 54);

    // ── Overall score hero card ───────────────────────────────
    const heroY = 60;
    const heroH = 44;
    card(M, heroY, CW, heroH, SURFACE2);

    // Big score number
    const oc = scoreRgb(scores.overall);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...oc);
    doc.text(`${scores.overall}`, M + 8, heroY + 30);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("/100", M + 8 + doc.getTextWidth(`${scores.overall}`) + 1, heroY + 30);

    // Vertical divider
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(M + 52, heroY + 6, M + 52, heroY + heroH - 6);

    // Label
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...oc);
    doc.text(scores.label, M + 58, heroY + 18);

    // Profile info
    const gender = data.gender === "male" ? "Männlich" : data.gender === "female" ? "Weiblich" : "Divers";
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SECONDARY);
    doc.text(`${gender}  ·  ${data.age} Jahre  ·  BMI: ${scores.bmi}`, M + 58, heroY + 26);
    doc.text(`VO2max: ~${scores.vo2maxEstimate} ml/kg/min  ·  NEAT: ~${scores.neatEstimate} kcal/Tag`, M + 58, heroY + 32);

    // Overall bar
    const obX = M + 58;
    const obW = CW - 58 - 8;
    bar(obX, heroY + 36, obW, 3, scores.overall / 100, oc);

    // ── Sub-score label ───────────────────────────────────────
    const slY = heroY + heroH + 8;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("SUBSCORES", M + 4, slY);
    hRule(slY + 2, BORDER);

    // ── Score cards (2×2) ─────────────────────────────────────
    const scoreData = [
      { label: "METABOLIC PERFORMANCE",  value: scores.metabolic  },
      { label: "RECOVERY & REGENERATION", value: scores.recovery  },
      { label: "ACTIVITY PERFORMANCE",   value: scores.activity   },
      { label: "STRESS & LIFESTYLE",     value: scores.stress     },
    ];

    const cY = slY + 5;
    const cH = 26;
    const cGap = 3;
    const cW2 = (CW - cGap) / 2;

    scoreData.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = M + col * (cW2 + cGap);
      const cy = cY + row * (cH + cGap);
      const c = scoreRgb(s.value);

      card(cx, cy, cW2, cH);

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(s.label, cx + 5, cy + 7);

      scoreTag(cx + cW2 - 32, cy + 7, s.value);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...c);
      doc.text(`${s.value}`, cx + 5, cy + 20);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text("/100", cx + 5 + doc.getTextWidth(`${s.value}`) + 1, cy + 20);

      bar(cx + 5, cy + 22, cW2 - 10, 2.5, s.value / 100, c);
    });

    // ── Derived metrics ───────────────────────────────────────
    const dmY = cY + 2 * (cH + cGap) + 7;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("DERIVED METRICS", M + 4, dmY);
    hRule(dmY + 2, BORDER);

    const dmCardY = dmY + 5;
    const dmCardH = 22;

    // VO2max
    card(M, dmCardY, cW2, dmCardH);
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text("VO2MAX SCHÄTZUNG", M + 5, dmCardY + 7);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(`${scores.vo2maxEstimate}`, M + 5, dmCardY + 18);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("ml/kg/min", M + 5 + doc.getTextWidth(`${scores.vo2maxEstimate}`) + 2, dmCardY + 18);

    // NEAT
    card(M + cW2 + cGap, dmCardY, cW2, dmCardH);
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text("NEAT — ALLTAGSAKTIVITÄT", M + cW2 + cGap + 5, dmCardY + 7);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(`${scores.neatEstimate}`, M + cW2 + cGap + 5, dmCardY + 18);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("kcal/Tag", M + cW2 + cGap + 5 + doc.getTextWidth(`${scores.neatEstimate}`) + 2, dmCardY + 18);

    // ── Page 1 footer ──────────────────────────────────────────
    hRule(H - 14, BORDER);
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text("BOOST THE BEAST LAB — Performance Intelligence System", M + 4, H - 9);
    doc.text("boostthebeast.com", W - M, H - 9, { align: "right" });

    // ═══════════════════════════════════════════════════════════
    // PAGE 2+: AI REPORT
    // ═══════════════════════════════════════════════════════════
    doc.addPage();
    fillPage();

    // Accent strip
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, 4, H, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ACCENT);
    doc.text("AI-GENERIERTE ANALYSE", M + 4, 18);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("DETAILLIERTER PERFORMANCE REPORT", M + 4, 27);

    hRule(31, ACCENT, 0.4);

    if (report && report.trim()) {
      let yPos = 40;

      function ensurePage(needed = 8) {
        if (yPos + needed > H - 18) {
          // Footer on current page
          hRule(H - 14, BORDER);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...MUTED);
          doc.text(`Report ID: ${reportId}`, M + 4, H - 9);
          doc.text(date, W - M, H - 9, { align: "right" });

          doc.addPage();
          fillPage();
          doc.setFillColor(...ACCENT);
          doc.rect(0, 0, 4, H, "F");
          yPos = 20;
        }
      }

      // Strip markdown bold markers, clean up
      const cleanReport = report
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/^#+\s*/gm, (m) => m); // keep headings as-is for section detection

      const lines = cleanReport.split("\n");

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (!line.trim()) {
          yPos += 3;
          continue;
        }

        // Section heading (## ...)
        if (line.trim().startsWith("## ")) {
          ensurePage(16);
          yPos += 4;
          const heading = line.trim().replace(/^##\s*/, "");

          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...ACCENT);
          doc.text(heading, M + 4, yPos);
          yPos += 2;
          hRule(yPos, BORDER);
          yPos += 5;

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...SECONDARY);
          continue;
        }

        // Regular paragraph text — wrap it
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...SECONDARY);

        const wrapped: string[] = doc.splitTextToSize(line.trim(), CW - 8);
        for (const wl of wrapped) {
          ensurePage(6);
          doc.text(wl, M + 4, yPos);
          yPos += 5;
        }
      }
    } else {
      // No AI report available
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text("Kein AI-Report verfügbar. Bitte starte eine neue Analyse.", M + 4, 44);
    }

    // ── Last page footer ───────────────────────────────────────
    hRule(H - 18, BORDER);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`Report ID: ${reportId}  ·  ${date}`, M + 4, H - 13);
    doc.setFontSize(6);
    const disclaimer = "Hinweis: Dieser Report dient ausschließlich der allgemeinen Information und ersetzt keinen Arztbesuch, keine medizinische Diagnose oder Therapieempfehlung. Kein Medizinprodukt i.S.d. MDR.";
    doc.text(doc.splitTextToSize(disclaimer, CW - 4), M + 4, H - 9);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BTB-Performance-Report-${reportId}.pdf"`,
        "X-Report-Id": reportId,
      },
    });

  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
