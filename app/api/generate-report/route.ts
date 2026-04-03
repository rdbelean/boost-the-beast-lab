import { NextRequest, NextResponse } from "next/server";
import { calculateAllScores, type AssessmentData } from "@/lib/scoring";
import { generateReport } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const data: AssessmentData = await req.json();
    const scores = calculateAllScores(data);
    const report = await generateReport(data, scores);
    return NextResponse.json({ scores, report });
  } catch (err) {
    console.error("Report generation error:", err);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
