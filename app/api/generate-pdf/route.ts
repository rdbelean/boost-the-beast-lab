import { NextRequest, NextResponse } from "next/server";
import type { ScoreResult } from "@/lib/scoring";
import type { AssessmentData } from "@/lib/scoring";

function scoreColor(score: number): string {
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

    const labelColor =
      scores.label === "ELITE" ? "#22C55E" :
      scores.label === "ÜBERDURCHSCHNITTLICH" ? "#F59E0B" :
      scores.label === "DURCHSCHNITTLICH" ? "#F59E0B" : "#E63222";

    // Generate HTML for PDF
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Inter:wght@300;400;600&family=JetBrains+Mono:wght@400;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#0A0A0A;color:#fff;font-family:'Inter',sans-serif;font-size:11px;line-height:1.6;}
  .page{width:794px;min-height:1123px;padding:60px;background:#0A0A0A;position:relative;}
  .page+.page{margin-top:0;border-top:2px solid #E63222;}
  h1,h2,h3,.mono{font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:0.05em;}
  .mono-data{font-family:'JetBrains Mono',monospace;}
  .red{color:#E63222;}
  .muted{color:#666;}
  .secondary{color:#A0A0A0;}
  .card{background:#1E1E1E;border:1px solid #2A2A2A;padding:20px;}
  .score-bar-bg{background:#2A2A2A;height:4px;border-radius:2px;overflow:hidden;}
  .score-bar-fill{height:4px;border-radius:2px;}
  .divider{border:none;border-top:1px solid #2A2A2A;margin:24px 0;}
  .footer-bar{position:absolute;bottom:32px;left:60px;right:60px;display:flex;justify-content:space-between;border-top:1px solid #2A2A2A;padding-top:12px;}
  strong{font-weight:600;}
  p{margin-bottom:8px;}
  ul,ol{padding-left:20px;}
  li{margin-bottom:6px;}
  h2{font-size:14px;margin-bottom:12px;color:#fff;}
  h3{font-size:12px;margin-bottom:6px;}
</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:80px;">
    <div>
      <div style="font-family:'Oswald',sans-serif;font-size:20px;font-weight:700;letter-spacing:0.15em;color:#fff;text-transform:uppercase;">BOOST THE BEAST</div>
      <div style="font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:0.4em;color:#E63222;text-transform:uppercase;">PERFORMANCE LAB</div>
    </div>
    <div style="text-align:right;" class="muted mono-data" style="font-size:10px;">
      <div>REPORT ID: <span style="color:#E63222;">${reportId}</span></div>
      <div>${date}</div>
    </div>
  </div>

  <div style="margin-bottom:60px;">
    <div style="font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:0.35em;color:#E63222;text-transform:uppercase;margin-bottom:16px;">PERFORMANCE INTELLIGENCE REPORT</div>
    <h1 style="font-size:52px;font-weight:700;line-height:1;color:#fff;margin-bottom:8px;">COMPLETE<br/>PERFORMANCE<br/>ANALYSIS</h1>
  </div>

  <div style="display:flex;align-items:center;gap:40px;margin-bottom:60px;">
    <div style="position:relative;width:160px;height:160px;flex-shrink:0;">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="64" fill="none" stroke="#2A2A2A" stroke-width="8"/>
        <circle cx="80" cy="80" r="64" fill="none" stroke="${scoreColor(scores.overall)}" stroke-width="8"
          stroke-dasharray="${(scores.overall / 100) * 402} 402"
          stroke-linecap="round"
          transform="rotate(-90 80 80)"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div class="mono-data" style="font-size:36px;font-weight:600;color:${scoreColor(scores.overall)};">${scores.overall}</div>
        <div style="font-size:9px;letter-spacing:0.2em;color:#666;font-family:'Oswald',sans-serif;">/100</div>
      </div>
    </div>
    <div>
      <div style="font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:0.3em;color:#666;text-transform:uppercase;margin-bottom:6px;">OVERALL PERFORMANCE SCORE</div>
      <div style="font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;color:${labelColor};">${scores.label}</div>
      <div style="margin-top:12px;font-size:10px;color:#A0A0A0;">
        Geschlecht: ${data.gender === "male" ? "Männlich" : data.gender === "female" ? "Weiblich" : "Divers"} &nbsp;·&nbsp;
        Alter: ${data.age} Jahre &nbsp;·&nbsp;
        BMI: ${scores.bmi}
      </div>
    </div>
  </div>

  <hr class="divider"/>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    ${[
      { label: "Metabolic Score", value: scores.metabolic },
      { label: "Recovery Score", value: scores.recovery },
      { label: "Activity Score", value: scores.activity },
      { label: "Stress & Lifestyle", value: scores.stress },
    ].map(s => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:0.15em;color:#A0A0A0;text-transform:uppercase;">${s.label}</div>
        <div class="mono-data" style="font-size:18px;font-weight:600;color:${scoreColor(s.value)};">${s.value}</div>
      </div>
      <div class="score-bar-bg">
        <div class="score-bar-fill" style="width:${s.value}%;background:${scoreColor(s.value)};"></div>
      </div>
    </div>`).join("")}
  </div>

  <div class="footer-bar">
    <span class="muted">BOOST THE BEAST LAB – Performance Intelligence System</span>
    <span class="muted">boostthebeast.com/lab</span>
  </div>
</div>

<!-- PAGE 2: AI REPORT -->
<div class="page">
  <div style="margin-bottom:32px;">
    <div style="font-family:'Oswald',sans-serif;font-size:10px;letter-spacing:0.35em;color:#E63222;text-transform:uppercase;margin-bottom:8px;">AI-GENERIERTE ANALYSE</div>
    <h2 style="font-size:24px;margin-bottom:0;">DETAILLIERTER PERFORMANCE REPORT</h2>
  </div>

  <div style="color:#A0A0A0;line-height:1.8;white-space:pre-wrap;font-size:11px;">
${report
  .replace(/## /g, '<h2 style="font-family:Oswald,sans-serif;font-size:14px;color:#E63222;letter-spacing:0.1em;margin:24px 0 10px;text-transform:uppercase;">')
  .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;">$1</strong>')
  .replace(/\n\n/g, '</p><p>')
  .replace(/^/, '<p>')
  .replace(/$/, '</p>')}
  </div>

  <div class="footer-bar">
    <span class="muted">Report ID: ${reportId} &nbsp;·&nbsp; ${date}</span>
    <span class="muted">Keine medizinische Diagnose</span>
  </div>
</div>

</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Report-Id": reportId,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
