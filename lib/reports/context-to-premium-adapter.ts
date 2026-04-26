// Adapter — temporary Phase-2 bridge.
//
// Translates the new ReportContext shape (lib/reports/report-context.ts)
// into the legacy PremiumPromptContext shape that the existing
// lib/report/prompts/full-prompts.ts builders consume.
//
// This module exists ONLY for Phase 2. Phase 3 introduces a new Stage-A
// analysis prompt that consumes ReportContext directly, plus a new
// Stage-B writer prompt that consumes the analysis JSON. Once those
// land, the legacy buildReportPrompts() path goes away and this adapter
// can be deleted along with PremiumPromptContext.

import type { ReportContext } from "./report-context";
import type { PremiumPromptContext } from "@/lib/report/prompts/full-prompts";
import { trainingIntensityLabel } from "@/lib/report/prompts/full-prompts";

/**
 * Build the legacy PremiumPromptContext from a ReportContext.
 *
 * Important mapping notes:
 * - PremiumPromptContext requires localized labels (sleep_quality_label,
 *   wakeup_frequency_label, fruit_veg_label) that the new ReportContext
 *   already carries as `*_localized` fields — straight passthrough.
 * - training_intensity_label is computed by trainingIntensityLabel(result, locale)
 *   to keep the existing per-locale strings ("überwiegend intensiv" / "predominantly
 *   vigorous" / etc.) — same helper, different call site.
 * - data_sources is mapped 1:1 from ReportContext.wearable.sources.
 * - daily_steps falls back to 0 when null (legacy prompt expects a number).
 */
export function contextToPremiumPromptContext(ctx: ReportContext): PremiumPromptContext {
  const whoopSource = ctx.wearable.sources.find((s) => s.kind === "whoop");
  const appleSource = ctx.wearable.sources.find((s) => s.kind === "apple_health");

  return {
    reportType: ctx.meta.report_type,
    locale: ctx.meta.locale,
    age: ctx.user.age,
    gender: ctx.user.gender,
    result: ctx.scoring.result,
    sleep_duration_hours: ctx.raw.sleep_duration_hours,
    sleep_quality_label: ctx.raw.sleep_quality_label_localized,
    wakeup_frequency_label: ctx.raw.wakeup_frequency_label_localized,
    morning_recovery_1_10: ctx.raw.morning_recovery_1_10,
    stress_level_1_10: ctx.raw.stress_level_1_10,
    meals_per_day: ctx.raw.meals_per_day,
    water_litres: ctx.raw.water_litres,
    fruit_veg_label: ctx.raw.fruit_veg_label_localized,
    standing_hours_per_day: ctx.raw.standing_hours_per_day,
    sitting_hours_per_day: ctx.raw.sitting_hours_per_day,
    training_days: ctx.raw.training_days_self_reported ?? 0,
    training_intensity_label: trainingIntensityLabel(ctx.scoring.result, ctx.meta.locale),
    daily_steps: ctx.raw.daily_steps ?? 0,
    screen_time_before_sleep: ctx.raw.screen_time_before_sleep ?? null,
    main_goal: ctx.personalization.main_goal,
    time_budget: ctx.personalization.time_budget,
    experience_level: ctx.personalization.experience_level,
    nutrition_painpoint: ctx.personalization.nutrition_painpoint,
    stress_source: ctx.personalization.stress_source,
    recovery_ritual: ctx.personalization.recovery_ritual,
    data_sources: ctx.wearable.available
      ? {
          form: true,
          whoop: whoopSource?.days != null ? { days: whoopSource.days } : undefined,
          apple_health: appleSource?.days != null ? { days: appleSource.days } : undefined,
        }
      : undefined,
  };
}
