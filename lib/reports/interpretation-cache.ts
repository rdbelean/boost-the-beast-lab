import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function getCachedInterpretation(
  assessmentId: string,
  dimension: string,
  locale: string,
): Promise<unknown | null> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("report_interpretations")
      .select("interpretation")
      .eq("assessment_id", assessmentId)
      .eq("dimension", dimension)
      .eq("locale", locale)
      .maybeSingle();
    if (error || !data) return null;
    return data.interpretation;
  } catch {
    return null;
  }
}

export async function setCachedInterpretation(
  assessmentId: string,
  dimension: string,
  locale: string,
  interpretation: unknown,
): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from("report_interpretations").upsert(
      { assessment_id: assessmentId, dimension, locale, interpretation },
      { onConflict: "assessment_id,dimension,locale" },
    );
  } catch {
    // Non-fatal — report still works without cache
  }
}
