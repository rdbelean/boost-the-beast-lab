# BTB Scoring Engine

Pure-function scoring modules. No DB, no network. Each module is
independently unit-testable and produces a deterministic 0–100 score plus
a categorical band.

## Modules

### `activity.ts` — `calculateActivityScore`
**Source:** IPAQ Short Form scoring protocol (Nov 2005).
**MET multipliers:** Walking 3.3 · Moderate 4.0 · Vigorous 8.0
**Cleaning rules:**
- Bouts <10 min → 0 (not counted)
- Individual bout >180 min → capped to 180
- Weekly total per activity type capped at 960 × 7 min
**Categories (IPAQ spec):**
- **HIGH** = Vigorous ≥3 days AND total ≥1500 MET-min/wk
  OR 7 days any combo AND total ≥3000 MET-min/wk
- **MODERATE** = Vigorous ≥3 days × ≥20 min/day
  OR Moderate/Walk ≥5 days × ≥30 min/day
  OR total ≥600 MET-min/wk
- **LOW** = otherwise
**Score curve (piecewise linear anchors):**
0 MET → 0 · 600 → 40 · 3000 → 75 · 8000+ → 100

### `vo2max.ts` — `estimateVO2max`
**Model:** Jackson/IPAQ non-exercise prediction (BMI variant).
`VO2max = 56.363 + 1.921·PA − 0.381·age − 0.754·BMI + 10.987·sex`
where `PA ∈ {LOW=0, MODERATE=1, HIGH=2}` and `sex ∈ {male=1, female=0}`.
**Fitness bands:** Cooper Institute / ACSM normative cut-points per age+sex.
**Score mapping:** Very Poor=10 · Poor=30 · Fair=50 · Good=70 · Excellent=88 · Superior=100

### `sleep.ts` — `calculateSleepScore`
**Source:** PSQI-inspired (Buysse et al. 1989), age-aware duration cut-points
per NSF (2015) and AASM (Watson 2015).
**Components & weights:** Duration 30 · Quality 35 · Wake-ups 20 · Recovery 15
**Duration:**
- 18–64: <6h=20 · 6–7h=55 · 7–9h=100 · >9h=70
- 65+:   <6h=20 · 6–7h=65 · 7–8h=100 · >8h=75
**Bands:** poor (<40) · moderate (40–64) · good (65–84) · excellent (≥85)

### `metabolic.ts` — `calculateMetabolicScore`
**BMI:** WHO classification.
**Component weights:** BMI 35 · Meals 15 · Water 20 · Sitting 15 · Fruit/Veg 15
**Fruit & Veg levels** (DGA 2020–2025 guidance): none · low · moderate · optimal

### `stress.ts` — `calculateStressScore`
`base = (10 − stress) × 10`, plus `bonus = (sleep_recovery/100) × 15`.
**Bands:** high_stress (<30) · elevated (30–54) · moderate (55–74) · low_stress (≥75)

## Overall Performance Index

`runFullScoring()` weights:
**Activity 28 · Sleep 25 · VO2max 15 · Metabolic 20 · Stress 12**
**Overall bands:** critical (<35) · low (35–49) · moderate (50–64) · good (65–79) · excellent (80–89) · elite (≥90)

## Disclaimer

These are **performance insights** derived from self-reported data — not
medical diagnoses or treatment recommendations.
