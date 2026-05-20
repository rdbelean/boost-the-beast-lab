# Scripts

## generate-sample-whoop-zip.mjs

Generates a valid WHOOP-export ZIP with synthetic demo data for the
sample-report workflow.

**Run:**
```bash
node scripts/generate-sample-whoop-zip.mjs
```

**Output:** `sample-data/demo-whoop-export.zip` (committed to the repo,
~1 KB) containing `physiological_cycles.csv`, `sleeps.csv`, `workouts.csv`
in the `whoop_v1` schema (see `lib/wearable/whoop/schema.ts`).

**Persona "Max Beispiel":** 35yo male, office job, little cardio. 7 days
of deliberately low recovery/HRV/sleep values (Recovery 40–65 %, HRV
33–45 ms, sleep often < 6:30) to maximise the report's optimisation
potential. Dates are backdated from the run date; re-run to refresh.

The generated ZIP is verified against the parser by
`tests/wearable/whoop-demo-zip.test.ts` (schema detection + aggregation).
Upload it in the quiz to produce demo reports.
