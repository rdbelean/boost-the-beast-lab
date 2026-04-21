import type { MergedWearableMetrics, WearableSource } from "@/lib/wearable/types";

export interface HeroSource {
  type: WearableSource;
  icon: string;
  label: string;
  secondary?: string;
}

export interface HeroSummary {
  total_datapoints: number;
  sources: HeroSource[];
  has_any_data: boolean;
  quality_level: "strong" | "good" | "minimal" | "none";
  period_start?: string;
  period_end?: string;
}

function sourceIcon(t: WearableSource): string {
  if (t === "whoop") return "🔥";
  if (t === "apple_health") return "❤️";
  if (t === "gpx") return "🏃";
  if (t === "ai_document") return "📄";
  if (t === "ai_image") return "📸";
  if (t === "ai_text") return "📝";
  return "📊";
}

function sourceLabel(t: WearableSource, days: number, locale: string): string {
  const isDE = locale !== "en";
  if (t === "whoop") return isDE ? `${days} Tage WHOOP Tracking` : `${days} Days WHOOP Tracking`;
  if (t === "apple_health") return isDE ? `${days} Tage Apple Health` : `${days} Days Apple Health`;
  if (t === "gpx") return isDE ? "GPS-Workouts" : "GPS Workouts";
  if (t === "ai_document") return isDE ? "Dokument-Scan" : "Document Scan";
  if (t === "ai_image") return isDE ? "Bild-Scan" : "Image Scan";
  if (t === "ai_text") return isDE ? "Text-Import" : "Text Import";
  return isDE ? "Daten-Import" : "Data Import";
}

export function buildHeroSummary(
  merged: MergedWearableMetrics | null,
  daysCovered = 0,
  locale = "de",
  periodStart?: string,
  periodEnd?: string,
): HeroSummary {
  if (!merged) {
    return {
      total_datapoints: 0,
      sources: [],
      has_any_data: false,
      quality_level: "none",
      period_start: periodStart,
      period_end: periodEnd,
    };
  }

  // Gather sources from sources_used or infer from available metrics
  const sourceMap = new Map<WearableSource, number>();

  if (merged.sources_used && merged.sources_used.length > 0) {
    for (const su of merged.sources_used) {
      const existing = sourceMap.get(su.type) ?? 0;
      sourceMap.set(su.type, existing + 1);
    }
  } else {
    // Infer from provenance or just mark as unknown if metrics exist
    const prov = merged.field_provenance;
    if (prov) {
      for (const entry of Object.values(prov)) {
        if (entry?.source) {
          const existing = sourceMap.get(entry.source) ?? 0;
          sourceMap.set(entry.source, existing + 1);
        }
      }
    } else if (hasAnyMetric(merged)) {
      // Can't determine source — mark as generic
    }
  }

  // Compute total datapoints
  let total = 0;
  let dominantDays = daysCovered;
  const heroSources: HeroSource[] = [];

  for (const [type] of sourceMap) {
    const days = dominantDays || 7;
    let dp = 0;
    if (type === "whoop") dp = days * 7;
    else if (type === "apple_health") dp = days * 5;
    else if (type === "gpx") dp = countGpxPoints(merged);
    else dp = countBodyFields(merged);
    total += dp;

    heroSources.push({
      type,
      icon: sourceIcon(type),
      label: sourceLabel(type, days, locale),
    });
  }

  // Fallback: no sources identified but metrics exist
  if (heroSources.length === 0 && hasAnyMetric(merged)) {
    const dp = countBodyFields(merged) + countSleepFields(merged) + countActivityFields(merged);
    total = dp * 3;
    heroSources.push({
      type: "ai_document",
      icon: "📊",
      label: locale === "en" ? "Uploaded Measurements" : "Hochgeladene Messungen",
    });
  }

  const hasData = heroSources.length > 0 || total > 0;

  // Quality level
  let quality: HeroSummary["quality_level"] = "none";
  if (total >= 100 || dominantDays >= 14) quality = "strong";
  else if (total >= 30 || dominantDays >= 7) quality = "good";
  else if (total > 0 || hasData) quality = "minimal";

  return {
    total_datapoints: total,
    sources: heroSources,
    has_any_data: hasData,
    quality_level: quality,
    period_start: periodStart,
    period_end: periodEnd,
  };
}

function hasAnyMetric(m: MergedWearableMetrics): boolean {
  return !!(
    m.sleep?.avg_duration_hours ||
    m.recovery?.avg_hrv_ms ||
    m.activity?.avg_steps ||
    m.body?.bmi ||
    m.vo2max?.last_value
  );
}

function countGpxPoints(m: MergedWearableMetrics): number {
  // If GPX workouts were uploaded, activity.avg_active_kcal or steps give hints
  return m.activity?.avg_steps ? 10 : 5;
}

function countBodyFields(m: MergedWearableMetrics): number {
  if (!m.body) return 0;
  return [m.body.bmi, m.body.body_fat_pct, m.body.skeletal_muscle_kg,
    m.body.visceral_fat_rating, m.body.body_water_pct, m.body.bmr_kcal,
    m.body.last_weight_kg].filter(Boolean).length;
}

function countSleepFields(m: MergedWearableMetrics): number {
  if (!m.sleep) return 0;
  return [m.sleep.avg_duration_hours, m.sleep.avg_efficiency_pct,
    m.sleep.avg_wakeups, m.sleep.avg_deep_sleep_min, m.sleep.avg_rem_min].filter(Boolean).length;
}

function countActivityFields(m: MergedWearableMetrics): number {
  if (!m.activity) return 0;
  return [m.activity.avg_steps, m.activity.avg_strain,
    m.activity.avg_active_kcal, m.activity.avg_met_minutes_week].filter(Boolean).length;
}
