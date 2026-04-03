import { NextRequest, NextResponse } from "next/server";
import { calculateAllScores, type AssessmentData } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  try {
    const data: AssessmentData = await req.json();
    const scores = calculateAllScores(data);
    return NextResponse.json(scores);
  } catch {
    return NextResponse.json({ error: "Invalid assessment data" }, { status: 400 });
  }
}
