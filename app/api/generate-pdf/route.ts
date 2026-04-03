import { NextRequest, NextResponse } from "next/server";
import type { ScoreResult, AssessmentData } from "@/lib/scoring";
import { jsPDF } from "jspdf";

function scoreColor(score: number): [number, number, number] {
  if (score >= 70) return [34, 197, 94];   // green
  if (score >= 40) return [245, 158, 11];  // amber
  return [230, 50, 34];                     // red
}

function scoreHex(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#E63222";
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
    const w = 210;
    const margin = 20;
    const contentW = w - margin * 2;

    // Colors
    const bgColor: [number, number, number] = [10, 10, 12];
    const surfaceColor: [number, number, number] = [30, 30, 34];
    const borderColor: [number, number, number] = [46, 46, 54];
    const accentColor: [number, number, number] = [230, 50, 34];
    const white: [number, number, number] = [242, 242, 244];
    const muted: [number, number, number] = [96, 96, 104];
    const secondary: [number, number, number] = [160, 160, 170];

    // ─── PAGE 1: COVER ──────────────────────────────
    doc.setFillColor(...bgColor);
    doc.rect(0, 0, w, 297, "F");

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text("BOOST THE BEAST", margin, 25);

    doc.setFontSize(8);
    doc.setTextColor(...accentColor);
    doc.text("PERFORMANCE LAB", margin, 30);

    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`REPORT ID: ${reportId}`, w - margin, 25, { align: "right" });
    doc.text(date, w - margin, 30, { align: "right" });

    // Accent line
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.line(margin, 36, w - margin, 36);

    // Title
    doc.setFontSize(9);
    doc.setTextColor(...accentColor);
    doc.text("PERFORMANCE INTELLIGENCE REPORT", margin, 48);

    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text("COMPLETE", margin, 62);
    doc.text("PERFORMANCE", margin, 73);
    doc.text("ANALYSIS", margin, 84);

    // Overall Score Ring (simplified as box)
    const ringX = margin;
    const ringY = 95;

    doc.setFillColor(...surfaceColor);
    doc.roundedRect(ringX, ringY, contentW, 40, 2, 2, "F");
    doc.setDrawColor(...borderColor);
    doc.roundedRect(ringX, ringY, contentW, 40, 2, 2, "S");

    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text("OVERALL PERFORMANCE SCORE", ringX + 8, ringY + 10);

    const overallColor = scoreColor(scores.overall);
    doc.setFontSize(40);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...overallColor);
    doc.text(`${scores.overall}`, ringX + 8, ringY + 32);

    doc.setFontSize(14);
    doc.setTextColor(...muted);
    doc.text("/100", ringX + 38, ringY + 32);

    // Label badge
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...overallColor);
    doc.text(scores.label, ringX + 80, ringY + 28);

    // Profile info
    doc.setFontSize(8);
    doc.setTextColor(...secondary);
    const gender = data.gender === "male" ? "Männlich" : data.gender === "female" ? "Weiblich" : "Divers";
    doc.text(`${gender}  ·  ${data.age} Jahre  ·  BMI: ${scores.bmi}  ·  VO2max: ~${scores.vo2maxEstimate} ml/kg/min  ·  NEAT: ~${scores.neatEstimate} kcal/Tag`, ringX + 80, ringY + 34);

    // Score cards
    const scoreData = [
      { label: "METABOLIC PERFORMANCE", value: scores.metabolic },
      { label: "RECOVERY & REGENERATION", value: scores.recovery },
      { label: "ACTIVITY PERFORMANCE", value: scores.activity },
      { label: "STRESS & LIFESTYLE", value: scores.stress },
    ];

    let cardY = 145;
    const cardH = 22;
    const cardGap = 3;
    const halfW = (contentW - cardGap) / 2;

    scoreData.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (halfW + cardGap);
      const y = cardY + row * (cardH + cardGap);
      const color = scoreColor(s.value);

      doc.setFillColor(...surfaceColor);
      doc.roundedRect(x, y, halfW, cardH, 1, 1, "F");
      doc.setDrawColor(...borderColor);
      doc.roundedRect(x, y, halfW, cardH, 1, 1, "S");

      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(s.label, x + 4, y + 7);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...color);
      doc.text(`${s.value}`, x + 4, y + 18);

      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text("/100", x + 20, y + 18);

      // Progress bar
      const barX = x + 40;
      const barY2 = y + 14;
      const barW = halfW - 48;
      doc.setFillColor(...borderColor);
      doc.roundedRect(barX, barY2, barW, 3, 1, 1, "F");
      doc.setFillColor(...color);
      doc.roundedRect(barX, barY2, barW * (s.value / 100), 3, 1, 1, "F");
    });

    // Derived Metrics section
    let metricsY = cardY + 2 * (cardH + cardGap) + 10;
    doc.setDrawColor(...borderColor);
    doc.line(margin, metricsY, w - margin, metricsY);
    metricsY += 8;

    doc.setFontSize(8);
    doc.setTextColor(...accentColor);
    doc.text("DERIVED METRICS", margin, metricsY);
    metricsY += 8;

    // VO2max card
    doc.setFillColor(...surfaceColor);
    doc.roundedRect(margin, metricsY, halfW, 20, 1, 1, "F");
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, metricsY, halfW, 20, 1, 1, "S");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("VO2MAX SCHÄTZUNG", margin + 4, metricsY + 7);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text(`${scores.vo2maxEstimate}`, margin + 4, metricsY + 16);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text("ml/kg/min", margin + 28, metricsY + 16);

    // NEAT card
    doc.setFillColor(...surfaceColor);
    doc.roundedRect(margin + halfW + cardGap, metricsY, halfW, 20, 1, 1, "F");
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin + halfW + cardGap, metricsY, halfW, 20, 1, 1, "S");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("NEAT (ALLTAGSAKTIVITÄT)", margin + halfW + cardGap + 4, metricsY + 7);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text(`${scores.neatEstimate}`, margin + halfW + cardGap + 4, metricsY + 16);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text("kcal/Tag", margin + halfW + cardGap + 28, metricsY + 16);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("BOOST THE BEAST LAB – Performance Intelligence System", margin, 285);
    doc.text("boostthebeast.com", w - margin, 285, { align: "right" });

    // ─── PAGE 2: AI REPORT ──────────────────────────
    doc.addPage();
    doc.setFillColor(...bgColor);
    doc.rect(0, 0, w, 297, "F");

    doc.setFontSize(9);
    doc.setTextColor(...accentColor);
    doc.text("AI-GENERIERTE ANALYSE", margin, 20);

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text("DETAILLIERTER PERFORMANCE REPORT", margin, 30);

    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.line(margin, 34, w - margin, 34);

    // Render report text
    if (report) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...secondary);

      const lines = report.split("\n");
      let yPos = 44;

      for (const line of lines) {
        if (yPos > 275) {
          doc.addPage();
          doc.setFillColor(...bgColor);
          doc.rect(0, 0, w, 297, "F");
          yPos = 20;
        }

        const trimmed = line.trim();
        if (!trimmed) {
          yPos += 4;
          continue;
        }

        if (trimmed.startsWith("## ")) {
          yPos += 6;
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...accentColor);
          doc.text(trimmed.replace("## ", ""), margin, yPos);
          yPos += 3;
          doc.setDrawColor(...borderColor);
          doc.line(margin, yPos, w - margin, yPos);
          yPos += 6;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...secondary);
        } else {
          const clean = trimmed.replace(/\*\*/g, "");
          const wrapped = doc.splitTextToSize(clean, contentW);
          for (const wLine of wrapped) {
            if (yPos > 275) {
              doc.addPage();
              doc.setFillColor(...bgColor);
              doc.rect(0, 0, w, 297, "F");
              yPos = 20;
            }
            doc.text(wLine, margin, yPos);
            yPos += 5;
          }
        }
      }
    }

    // Footer on last page
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(`Report ID: ${reportId}  ·  ${date}`, margin, 285);
    doc.text("Keine medizinische Diagnose. Performance Insights only.", w - margin, 285, { align: "right" });

    // Generate PDF buffer
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
