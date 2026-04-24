import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildFullPrompt, type PlanType, type ScoreInput, type PlanPersonalization } from "@/lib/plan/prompts/full-prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PlanBlock { heading: string; items: string[] }

function hasValidKey(key: string | undefined): boolean {
  if (!key || key.length < 20) return false;
  if (key.includes("your_") || key.includes("dein-")) return false;
  return true;
}

type PlanMeta = Record<PlanType, { title: string; subtitle: string; source: string }>;

const PLAN_META_DE: PlanMeta = {
  activity: {
    title: "ACTIVITY-PLAN",
    subtitle: "Individueller Plan zur Verbesserung deiner Aktivit\u00E4tswerte",
    source: "Basiert auf: WHO Global Action Plan 2018\u20132030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022, AMA Longevity Study 2024",
  },
  metabolic: {
    title: "METABOLIC-PLAN",
    subtitle: "Individueller Plan zur Optimierung deiner metabolischen Performance",
    source: "Basiert auf: WHO BMI-Klassifikation, EFSA N\u00E4hrwertempfehlungen, ISSN Position Stand, JAMA Network Open Meal Timing 2024, Covassin et al. RCT 2022",
  },
  recovery: {
    title: "RECOVERY-PLAN",
    subtitle: "Individueller Plan zur Verbesserung deiner Regeneration",
    source: "Basiert auf: NSF/AASM Sleep Guidelines, PSQI-Skala, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025, PMC OTS Review 2025",
  },
  stress: {
    title: "STRESS & LIFESTYLE-PLAN",
    subtitle: "Individueller Plan zur Optimierung von Stress und Lifestyle",
    source: "Basiert auf: WHO Mental Health Guidelines, Psychoneuroendocrinology Meta-Analysis 2024, MBSR (Kabat-Zinn), Frontiers Sedentary & CVD 2022",
  },
};

const PLAN_META_EN: PlanMeta = {
  activity: {
    title: "ACTIVITY PLAN",
    subtitle: "Individual plan to improve your activity metrics",
    source: "Based on: WHO Global Action Plan 2018\u20132030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022, AMA Longevity Study 2024",
  },
  metabolic: {
    title: "METABOLIC PLAN",
    subtitle: "Individual plan to optimise your metabolic performance",
    source: "Based on: WHO BMI Classification, EFSA Nutrition Recommendations, ISSN Position Stand, JAMA Network Open Meal Timing 2024, Covassin et al. RCT 2022",
  },
  recovery: {
    title: "RECOVERY PLAN",
    subtitle: "Individual plan to improve your recovery",
    source: "Based on: NSF/AASM Sleep Guidelines, PSQI Scale, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025, PMC OTS Review 2025",
  },
  stress: {
    title: "STRESS & LIFESTYLE PLAN",
    subtitle: "Individual plan to optimise stress and lifestyle",
    source: "Based on: WHO Mental Health Guidelines, Psychoneuroendocrinology Meta-Analysis 2024, MBSR (Kabat-Zinn), Frontiers Sedentary & CVD 2022",
  },
};

const PLAN_META_IT: PlanMeta = {
  activity: {
    title: "PIANO ATTIVIT\u00C0",
    subtitle: "Piano individuale per migliorare i tuoi valori di attivit\u00E0",
    source: "Basato su: WHO Global Action Plan 2018\u20132030, ACSM Exercise Guidelines, IPAQ Short Form, AHA Circulation 2022",
  },
  metabolic: {
    title: "PIANO METABOLICO",
    subtitle: "Piano individuale per ottimizzare la tua performance metabolica",
    source: "Basato su: Classificazione BMI WHO, Raccomandazioni nutrizionali EFSA, ISSN Position Stand, JAMA Network Open 2024",
  },
  recovery: {
    title: "PIANO RECOVERY",
    subtitle: "Piano individuale per migliorare la tua rigenerazione",
    source: "Basato su: NSF/AASM Sleep Guidelines, Scala PSQI, ACSM Recovery Protocols, Kaczmarek et al. MDPI 2025",
  },
  stress: {
    title: "PIANO STRESS & LIFESTYLE",
    subtitle: "Piano individuale per ottimizzare stress e stile di vita",
    source: "Basato su: WHO Mental Health Guidelines, Meta-Analysis Psychoneuroendocrinology 2024, MBSR (Kabat-Zinn)",
  },
};

const PLAN_META_TR: PlanMeta = {
  activity: {
    title: "AKTİVİTE PLANI",
    subtitle: "Aktivite değerlerini geliştirmek için bireysel plan",
    source: "Kaynak: WHO Küresel Eylem Planı 2018–2030, ACSM Egzersiz Yönergeleri, IPAQ Kısa Form",
  },
  metabolic: {
    title: "METABOLİK PLAN",
    subtitle: "Metabolik performansını optimize etmek için bireysel plan",
    source: "Kaynak: WHO BMI Sınıflandırması, EFSA Beslenme Önerileri, ISSN Pozisyon Bildirisi, JAMA Network Open 2024",
  },
  recovery: {
    title: "İYİLEŞME PLANI",
    subtitle: "Yenilenme kapasiteni geliştirmek için bireysel plan",
    source: "Kaynak: NSF/AASM Uyku Yönergeleri, PSQI Ölçeği, ACSM İyileşme Protokolleri, Kaczmarek et al. MDPI 2025",
  },
  stress: {
    title: "STRES & YAŞAMBİÇİMİ PLANI",
    subtitle: "Stres ve yaşam biçimini optimize etmek için bireysel plan",
    source: "Kaynak: WHO Ruh Sağlığı Yönergeleri, Psychoneuroendocrinology Meta-Analizi 2024, MBSR (Kabat-Zinn)",
  },
};

function getPlanMeta(locale: string): PlanMeta {
  if (locale === "en") return PLAN_META_EN;
  if (locale === "it") return PLAN_META_IT;
  if (locale === "tr") return PLAN_META_TR;
  return PLAN_META_DE;
}

// SYSTEM_PROMPT now lives in lib/plan/prompts/system-prompts.ts —
// imported via getSystemPrompt(locale).

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, scores } = body as { type: string; scores: ScoreInput };
    const personalization: PlanPersonalization = {
      main_goal: (body as { main_goal?: PlanPersonalization["main_goal"] }).main_goal ?? null,
      time_budget: (body as { time_budget?: PlanPersonalization["time_budget"] }).time_budget ?? null,
      experience_level: (body as { experience_level?: PlanPersonalization["experience_level"] }).experience_level ?? null,
      training_days: (body as { training_days?: number | null }).training_days ?? null,
      nutrition_painpoint: (body as { nutrition_painpoint?: PlanPersonalization["nutrition_painpoint"] }).nutrition_painpoint ?? null,
      stress_source: (body as { stress_source?: PlanPersonalization["stress_source"] }).stress_source ?? null,
      recovery_ritual: (body as { recovery_ritual?: PlanPersonalization["recovery_ritual"] }).recovery_ritual ?? null,
    };

    const validTypes: PlanType[] = ["activity", "metabolic", "recovery", "stress"];
    if (!validTypes.includes(type as PlanType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }
    if (!scores) {
      return NextResponse.json({ error: "Missing scores" }, { status: 400 });
    }

    const planType = type as PlanType;
    const locale = (body as { locale?: string }).locale ?? "de";
    const meta = getPlanMeta(locale)[planType];
    const apiKeyOk = hasValidKey(process.env.ANTHROPIC_API_KEY);
    console.log("[Plans/BE/generate] received", { bodyLocale: (body as { locale?: string }).locale, effectiveLocale: locale, type, hasApiKey: apiKeyOk });

    // No API key → fail loudly instead of returning German static fallback.
    // Personalisation without AI is impossible; the user should see an error,
    // not a generic template.
    if (!apiKeyOk) {
      console.error("[Plans/BE/generate] ANTHROPIC_API_KEY missing/invalid — refusing to generate");
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Monolithic per-locale prompt. No response-prefix trick — that broke
    // JSON.parse silently and produced the German-fallback symptom we saw.
    const { systemPrompt, userPrompt } = buildFullPrompt(locale, {
      type: planType,
      scores,
      personalization,
    });

    console.log("[Plans/BE/generate] system prompt head:", systemPrompt.slice(0, 400));
    console.log("[Plans/BE/generate] user prompt head:", userPrompt.slice(0, 400));

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = (response.content[0] as { type: string; text: string }).text.trim();
    let parsed: { blocks: PlanBlock[] };
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("[Plans/BE/generate] JSON parse failed — raw Claude output first 2000:", rawText.slice(0, 2000));
      console.error("[Plans/BE/generate] parse error:", parseErr);
      throw parseErr;
    }

    if (!parsed.blocks?.length) {
      console.error("[Plans/BE/generate] Claude returned empty blocks array");
      return NextResponse.json({ error: "AI returned empty plan" }, { status: 502 });
    }

    console.log("[Plans/BE/generate] Claude output", { locale, type: planType, firstHeading: parsed.blocks[0]?.heading, blocksCount: parsed.blocks.length });

    return NextResponse.json({ ...meta, locale, blocks: parsed.blocks });
  } catch (err) {
    console.error("[plan/generate] error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
