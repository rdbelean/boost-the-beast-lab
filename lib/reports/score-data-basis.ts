import type { MergedWearableMetrics } from "@/lib/wearable/types";

export type DataBasisType = "positive" | "neutral" | "muted";

export interface ScoreDataBasis {
  label: string;
  type: DataBasisType;
  icon: string;
}

type DimensionKey = "sleep" | "activity" | "vo2max" | "metabolic" | "stress";

export function computeScoreDataBasis(
  dimension: DimensionKey,
  merged: MergedWearableMetrics | null,
  locale = "de",
): ScoreDataBasis {
  const isDE = locale !== "en";

  if (!merged) return questionnaireBasis(dimension, isDE);

  switch (dimension) {
    case "sleep": {
      const hasSleep = !!(merged.sleep?.avg_duration_hours || merged.sleep?.avg_efficiency_pct);
      if (!hasSleep) return questionnaireBasis("sleep", isDE);
      const source = getSource(merged, ["sleep"]);
      const days = getDays(merged);
      return {
        icon: source === "whoop" ? "🔥" : source === "apple_health" ? "❤️" : "📊",
        label: days
          ? isDE ? `${days}T ${sourceName(source, isDE)}` : `${days}d ${sourceName(source, isDE)}`
          : sourceName(source, isDE),
        type: "positive",
      };
    }

    case "activity": {
      const hasActivity = !!(merged.activity?.avg_steps || merged.activity?.avg_strain);
      if (!hasActivity) return questionnaireBasis("activity", isDE);
      const source = getSource(merged, ["activity"]);
      const days = getDays(merged);
      return {
        icon: source === "whoop" ? "🔥" : source === "apple_health" ? "❤️" : source === "gpx" ? "🏃" : "📊",
        label: days
          ? isDE ? `${days}T ${sourceName(source, isDE)}` : `${days}d ${sourceName(source, isDE)}`
          : sourceName(source, isDE),
        type: "positive",
      };
    }

    case "vo2max": {
      const hasMeasured = !!(merged.vo2max?.last_value);
      if (!hasMeasured) {
        return {
          icon: "📋",
          label: isDE ? "Geschätzt aus Angaben" : "Estimated from inputs",
          type: "neutral",
        };
      }
      const source = getSource(merged, ["vo2max"]);
      return {
        icon: "📊",
        label: isDE ? `Messung · ${sourceName(source, isDE)}` : `Measured · ${sourceName(source, isDE)}`,
        type: "positive",
      };
    }

    case "metabolic": {
      const hasBody = !!(merged.body?.bmi || merged.body?.body_fat_pct || merged.body?.skeletal_muscle_kg);
      if (!hasBody) return questionnaireBasis("metabolic", isDE);
      const source = getSource(merged, ["body"]);
      const provType = (merged as { provenance?: { source_type?: string } }).provenance?.source_type;
      const label = provType
        ? isDE ? `${provType.toUpperCase()}-Scan` : `${provType.toUpperCase()} Scan`
        : isDE ? `Körperscan · ${sourceName(source, isDE)}` : `Body Scan · ${sourceName(source, isDE)}`;
      return { icon: "💪", label, type: "positive" };
    }

    case "stress": {
      const hasHRV = !!(merged.recovery?.avg_hrv_ms || merged.recovery?.avg_rhr_bpm || merged.recovery?.avg_score);
      if (!hasHRV) return questionnaireBasis("stress", isDE);
      const source = getSource(merged, ["recovery"]);
      const days = getDays(merged);
      return {
        icon: source === "whoop" ? "🔥" : "❤️",
        label: days
          ? isDE ? `${days}T HRV-Tracking` : `${days}d HRV Tracking`
          : isDE ? "HRV-Tracking" : "HRV Tracking",
        type: "positive",
      };
    }
  }
}

function questionnaireBasis(dimension: DimensionKey, isDE: boolean): ScoreDataBasis {
  const labels: Record<DimensionKey, [string, string]> = {
    sleep: ["📋 Fragebogen", "📋 Questionnaire"],
    activity: ["📋 Fragebogen", "📋 Questionnaire"],
    vo2max: ["📋 Geschätzt aus Angaben", "📋 Estimated from inputs"],
    metabolic: ["📋 Fragebogen", "📋 Questionnaire"],
    stress: ["📋 Fragebogen", "📋 Questionnaire"],
  };
  return { icon: "📋", label: labels[dimension][isDE ? 0 : 1], type: "muted" };
}

function getSource(merged: MergedWearableMetrics, fields: string[]): string {
  if (!merged.field_provenance) {
    if (merged.sources_used && merged.sources_used.length > 0) return merged.sources_used[0].type;
    return "unknown";
  }
  for (const field of fields) {
    const prov = merged.field_provenance[field];
    if (prov?.source) return prov.source;
    // Try sub-fields
    for (const [key, entry] of Object.entries(merged.field_provenance)) {
      if (key.startsWith(field + ".") && entry?.source) return entry.source;
    }
  }
  return "unknown";
}

function getDays(merged: MergedWearableMetrics): number {
  if (merged.sources_used && merged.sources_used.length > 0) {
    for (const su of merged.sources_used) {
      if (su.date_range) {
        const start = new Date(su.date_range[0]);
        const end = new Date(su.date_range[1]);
        const days = Math.round((end.getTime() - start.getTime()) / 86400000);
        if (days > 0) return days;
      }
    }
  }
  return 0;
}

function sourceName(source: string, isDE: boolean): string {
  if (source === "whoop") return "WHOOP";
  if (source === "apple_health") return "Apple Health";
  if (source === "gpx") return isDE ? "GPS-Workout" : "GPS Workout";
  if (source === "ai_document" || source === "ai_image" || source === "ai_text") return isDE ? "Scan" : "Scan";
  return isDE ? "Daten" : "Data";
}
