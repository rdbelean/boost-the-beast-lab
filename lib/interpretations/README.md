# lib/interpretations — Study → Claim Mapping

This library contains the scientific interpretation layer for BOOST THE BEAST LAB
Performance Reports. Every claim in the band texts and warnings is backed by the
studies listed below. The Claude prompt must only use statements that are
present in this library — no ad-hoc numbers, no additional studies.

## Structure

```
lib/interpretations/
├── sleep.ts       — 4 bands (poor/moderate/good/excellent) + consistency note
├── recovery.ts    — 5 bands (critical/low/moderate/good/excellent) + OTS warning
├── activity.ts    — 3 bands (low/moderate/high) + sitting flag payloads
├── metabolic.ts   — 4 bands + BMI category notes (6 categories)
├── stress.ts      — 5 bands + chronic-stress + HPA-axis warnings
├── vo2max.ts      — 6 bands (Very Poor→Superior) + estimation disclaimer
└── index.ts       — getInterpretationBundle(inputs, flags)
```

## Study → Claim Map

### Sleep
- **NSF/AASM Consensus (Watson et al., 2015)** — duration cutoffs 7–9h (18–64),
  7–8h (65+); quality bands.
- **Kaczmarek et al. MDPI (2025)** — chronic sleep loss → Cortisol↑, Testosteron↓,
  GH↓ → muscle recovery limited.
- **Covassin et al. RCT (2022)** — sleep restriction → visceral fat.
- **Sondrup et al. Sleep Medicine Reviews (2022)** — sleep restriction → insulin resistance.
- **PMC Sleep & Athletic Performance (2024)** — GH peak in N3 (slow-wave).
- **Kalkanis et al. Sleep Medicine Reviews (2025)** — irregular sleep bigger effect than assumed.
- **Frontiers Exercise & Sleep Meta-Analysis (2024)** — 4×/wk training best for sleep quality.
- **Frontiers Medicine Umbrella Review (2021)** — 85 meta-analyses; short sleep → overweight, long → mortality.

### Recovery
- **Kaczmarek et al. (2025)** — same hormonal axis evidence.
- **PMC OTS Review (2025)** — functional vs non-functional overreaching continuum.
- **ScienceDirect OTS Molecular (2025)** — up to 14% strength loss under OTS, ↑ injury risk.
- **HRV Narrative Review MDPI (2024)** — HRV as training status marker.
- **PRS Scale IJSPP (2022)** — Perceived Recovery Status 0–10 scale validated.
- **Kellmann ARSS/SRSS (2024)** — imbalance → reduced training tolerance.
- **PMC Recovery Strategies Umbrella Review (2022)** — 22 reviews, 1100 athletes.
- **Scientific Reports HRV-Training (2025)** — psychological + physiological integration.

### Activity
- **WHO Physical Activity Guidelines (2020, updated 2024)** — 150–300 min moderate
  OR 75–150 min vigorous / week. No minimum bout length (2020 update).
- **AHA Circulation Study (2022, 100k+ participants, 30yr)** — 150–300 min/wk ≈
  20–21% mortality reduction; 2–4× that → additional reduction.
- **AMA Longevity Study (2024)** — 150–299 min vigorous/wk ≈ 21–23% all-cause,
  27–33% CVD mortality reduction.
- **IPAQ Meta-Analysis (Cambridge Core)** — 3.3/4.0/8.0 MET standard values.
- **Frontiers Sedentary & CVD Meta-Analysis (2022)** — >6h sitting = 12 chronic
  disease risk.
- **AHA Science Advisory (Circulation)** — sitting = independent CVD factor;
  MetSyndrom odds 1.73 even after MVPA adjustment.
- **WHO Global Stats (2024)** — 1.8B adults inactive, +5pp 2010–2022.

### Metabolic
- **WHO BMI Classification** — category cutoffs.
- **JAMA Network Open Meal Timing Meta-Analysis (2024, 29 RCTs, 2485 participants)**
  — earlier caloric distribution + time-restricted eating → greater weight loss;
  more meals ≠ better.
- **PMC Eating Frequency Meta-Analysis (2023, 16 RCTs)** — no advantage to high
  meal frequency at equal calories.
- **PMC Chrononutrition (2024)** — 8h feeding window; circadian timing improves
  metabolic outcomes.
- **BMC Medicine Hydration & Cognition (2023, 1957 participants)** — hydration
  status → cognitive decline under metabolic syndrome.
- **Network Meta-Analysis T2DM (199,403 participants)** — metabolically unhealthy
  obesity = 10× T2DM risk vs healthy normal weight.
- **NHANES/USDA** — 14% of US adults reach 4.5 cup-equivalents fruit/veg per 2000kcal.

### Stress
- **StatPearls NCBI (2024)** — SAM/HPA/immune interplay; physiological, not just
  psychological.
- **PMC Chronic Stress & Cognition (2024)** — chronic glucocorticoid → GR
  downregulation → HPA dysregulation → prefrontal + hippocampal effects.
- **Frontiers Allostatic Load (2025)** — multi-system dysregulation model.
- **Tandfonline Testosterone & Cortisol (2023)** — sustained stress suppresses HPG.
- **PMC Immunology of Stress JCM (2024)** — acute adaptive, chronic suppressive.
- **Psychoneuroendocrinology Meta-Analysis (2024)** — mindfulness g=0.345,
  relaxation g=0.347 for cortisol reduction in RCTs.
- **Tandfonline Burnout Athletes Meta-Analysis (2023)** — allostatic overload
  = multi-system dysfunction.
- **PMC Stress & Sport Performance PNEI (2024)** — cortisol/DHEA/testosterone/
  oxytocin/melatonin as core biomarkers.
- **Regensburg Burnout Project** — SAM dysfunction → CV risk.

### VO2max
- **Cooper Institute / ACSM Norms** — age- and sex-specific fitness bands.
- **IPAQ/VO2max Non-Exercise Prediction Formula** — the estimation equation used.

## Discipline

- Do not add a claim without an accompanying entry in `study_basis`.
- Do not add a number (percentage, effect size, cutoff) that is not from the
  source material above.
- VO2max must always be framed as **estimated**, never measured.
- BMI must always be framed as a **population-level estimator**, never an
  individual verdict.
- No diagnostic language. Use "Performance-Insight" / "Einordnung".
