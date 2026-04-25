import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Bumping this version invalidates every previously cached entry without a
// schema migration. Pre-v2 rows used to mix AI-generated and deterministic
// static fallbacks under the same key; we now refuse to write static fallbacks
// at all, but the old rows live forever in the table. Reading and writing
// under "<dimension>_v2" leaves them in place, untouched and unreachable.
const CACHE_VERSION = "v2";

function versionedKey(dimension: string): string {
  return `${dimension}_${CACHE_VERSION}`;
}

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
      .eq("dimension", versionedKey(dimension))
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
      { assessment_id: assessmentId, dimension: versionedKey(dimension), locale, interpretation },
      { onConflict: "assessment_id,dimension,locale" },
    );
  } catch {
    // Non-fatal — report still works without cache
  }
}
