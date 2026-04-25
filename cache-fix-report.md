# Cache-Fix-Report — prompt-experiment-v1

Branch: `prompt-experiment-v1`. Keine Änderung an `main`.
Build-Status: **grün** (`npm run build` ohne TypeScript- oder Lint-Errors).

---

## 1. Was geändert wurde — File-by-File

| # | File | Was passiert |
|---|---|---|
| 1 | `lib/anthropic/retry.ts` | **NEU.** Gemeinsamer Retry-Helper — 1 Retry, 2 s Delay. Wird in 6 Routes benutzt. |
| 2 | `app/api/plan/generate/route.ts` | Anthropic-Call (Z. 171–177) ist jetzt mit `callAnthropicWithRetry` gewrappt. Sonst keine Änderung — war bereits Static-frei. |
| 3 | `app/api/reports/interpret-block/route.ts` | API-Key-Shortcut + Parser-Fallback raus. AI-Failure → 502 statt `{ interpretation: null }`. Cache wird **nur** im Erfolgspfad geschrieben. Retry-Wrapper rein. |
| 4 | `app/api/reports/cross-insights/route.ts` | `buildStaticInsights` (38 Zeilen 4-Locale-Stub) komplett gelöscht. AI-Failure → 502. Retry-Wrapper rein. |
| 5 | `app/api/reports/executive-summary/route.ts` | `buildStaticFindings` (51 Zeilen 4-Locale-Stub) komplett gelöscht. AI-Failure → 502. Retry-Wrapper rein. |
| 6 | `app/api/reports/action-plan/route.ts` | `buildStaticPlan` + 6 Helper-Maps (~195 Zeilen 4-Locale-Stub) gelöscht. `normalizeMilestones` + minimale Helper bleiben (validieren AI-Output, generieren keinen kompletten Static-Plan). Retry-Wrapper rein. |
| 7 | `app/api/report/generate/route.ts` | `buildStubReport` + Helper (`StubInputs`, `pickWeakestModule`, ~93 Zeilen deutscher Static-Report) gelöscht. Real-Pfad **und** Demo-Pfad geben jetzt 503 zurück wenn kein API-Key. Retry-Wrapper an 3 Call-Sites rein. `classifyError` erkennt jetzt `ai_unavailable: …` → 503. |
| 8 | `lib/pdf/background-generator.ts` | `upsert: true` → `upsert: false`. Bei Conflict (Object existiert schon vom Frontend-Upload) wird der Status auf `ready` gesetzt — kein Overwrite mit Static-Plan. |
| 9 | `app/api/reports/generate-single-pdf/route.ts` | Komplett auf 404-Stub geschrumpft (von 143 → 47 Zeilen). Kein `buildPlan` mehr, kein `generatePlanPDF`. Markiert nur Status `failed` und gibt 404 zurück. |
| 10 | `app/api/reports/prepare-pdfs/route.ts` | Worker-Aufruf entfernt. Bei missing base64: einfach überspringen, kein `pending`-Status. Plan-Seite hat eigenen on-demand-Pfad in `handleDownload`. |
| 11 | `app/[locale]/analyse/page.tsx` | `handleSubmit` löscht jetzt am Anfang **alle** `btb_*`-Keys aus `sessionStorage` außer `btb_paid` (damit User innerhalb der Session nicht erneut zahlen muss). |
| 12 | `app/[locale]/results/page.tsx` + `components/results/DataInsightBlock.tsx` | Per-Dimension Error-State + Retry-Button. AbortController mit 30 s Timeout. `onRetry`-Callback inkrementiert `interpretationReloadKey` → useEffect läuft erneut für die eine Dimension. |
| 13 | `messages/{de,en,it,tr}.json` | Zwei neue Keys im `results.*`-Namespace: `section_ai_failed` + `section_retry_btn`. |
| 14 | `lib/reports/interpretation-cache.ts` | `CACHE_VERSION = "v2"`-Suffix bei `dimension`. Alte gemischte AI/Static-Einträge bleiben unangetastet aber unsichtbar. Keine Schema-Änderung in Supabase nötig. |

---

## 2. Architektonische Garantien nach dem Fix

1. **Kein Anthropic-Call ohne Retry.** Jede der 6 Server-Side-AI-Calls wickelt sich
   durch `callAnthropicWithRetry` ab — 1 Retry mit 2 s Delay. Reicht ein Retry nicht,
   wird der Fehler nach oben gegeben und die Route returnt 502/503.
2. **Kein Static-Fallback mehr.** Die ~620 Zeilen `buildStubReport` + ~285 Zeilen
   in `buildStatic*` der Sub-Reports sind weg. Wenn die AI gerade nicht verfügbar ist,
   sieht der User einen Error-State, nie einen generischen deutschen Text.
3. **Kein Cache-Write bei Failure.** `setCachedInterpretation` läuft jetzt nur im
   Erfolgspfad — auf 4 Routes geprüft.
4. **Kein Plan-Overwrite.** `uploadPlanPdf` schreibt mit `upsert: false`.
   `generate-single-pdf` baut nichts mehr — das Worker-Anti-Pattern aus dem
   Diagnose-Report ist eliminiert.
5. **Kein Carryover zwischen Analysen.** `btb_*`-Keys werden zu Beginn jeder
   neuen Analyse gelöscht. `btb_paid` ist explizit ausgenommen.
6. **Versioned Cache-Key.** Alte mit Static befüllte Einträge unter
   `dimension="sleep"` werden nie wieder gelesen — neue Einträge laufen unter
   `dimension="sleep_v2"`.

---

## 3. Test-Anleitung — Schritt-für-Schritt auf der Preview-URL

Nach dem Push auf `prompt-experiment-v1` baut Vercel automatisch eine Preview.
Die URL findest du im Vercel-Dashboard unter Project → Deployments → den neuesten
Preview-Build, oder auf dem GitHub-PR/Branch-View.

### Vorbereitung
1. Öffne die Preview-URL im Browser. Logge dich falls nötig ein (Vercel-Auth bei privaten Projekten).
2. Öffne DevTools (F12 / Cmd+Opt+I) → Tab `Application` → `Storage` → `Session Storage`.
3. Halte daneben den Tab `Network` offen, gefiltert auf `/api/reports/` und `/api/plan/`.

### Test 1 — Bug 1 (Plan-Overwrite gefixt)
1. Eine vollständige Analyse durchführen (Fragebogen → Submit).
2. Auf der `/results`-Seite warten bis alle 5 Sub-Reports geladen sind.
3. Im Network-Tab: kein Aufruf an `/api/reports/generate-single-pdf` mit POST sollte sichtbar sein.
   - Wenn doch: Response muss 404 sein, nicht 200.
4. In den Vercel-Logs (Project → Logs → Filter `prepare-pdfs`):
   nur `upload`-Log-Zeilen sollten erscheinen, keine `worker:`-Zeilen.
5. **Erfolgs-Kriterium:** PDF-Download über die Plan-Seite öffnet ein
   personalisiertes PDF (mit AI-Text, nicht den deterministischen
   "Schlafqualität optimieren"-Stub).

### Test 2 — Bug 2 (sessionStorage-Carryover gefixt)
1. Analyse 1 vollständig durchlaufen → auf `/results` landen.
2. In DevTools → Application → Session Storage: `btb_results` ist gefüllt.
3. Klicke "Neue Analyse" oder navigiere manuell zurück zu `/analyse`.
4. Beantworte den Fragebogen erneut, klicke Submit.
5. **Sofort nach Submit-Klick** zur Session-Storage-Ansicht switchen:
   `btb_results` muss **weg** sein — kommt erst wieder nach Abschluss der neuen Analyse.
6. `btb_paid` (falls vorher gesetzt) muss erhalten bleiben.

### Test 3 — Bug 3 (Static-Fallback Sub-Reports gefixt)
**Voraussetzung:** Vercel Preview hat einen API-Key gesetzt (sonst wirken sowieso 503er).

Variante A — leichter Test ohne API-Key-Manipulation:
1. Analyse durchlaufen.
2. Auf `/results`: Score-Cards laden ihre Daten.
3. Network-Tab: `/api/reports/interpret-block` returnt für jede Dimension 200 mit echten AI-Texten.
   Wenn ein Call 502 returnt, muss bei der entsprechenden Dimension die Error-Box mit
   "Erneut versuchen"-Button erscheinen — **nicht** ein generischer Stub-Text wie
   "Dein Sleep Score von 60/100 …".

Variante B — harter Test mit API-Key-Removal (nur lokal, nicht in Vercel-Preview):
1. In `.env.local` den `ANTHROPIC_API_KEY` durch einen ungültigen Wert ersetzen.
2. `npm run dev`.
3. Analyse durchlaufen → auf `/results`:
   - Score-Cards zeigen Daten.
   - Unter jeder Card: Error-Box mit "Diese Analyse konnte gerade nicht generiert werden …" + Retry-Button.
   - **Kein** generischer Text in den Sektionen.
4. Supabase-Tabelle `report_interpretations` direkt prüfen
   (Supabase-Studio → Table Editor): Für die Assessment-ID gibt es
   **keine** Zeilen unter `dimension="sleep_v2"` (etc.).
5. Echten Key wieder setzen, Server neu starten, Retry-Button klicken →
   echte AI-Antwort lädt.

### Test 4 — Bug 4 (Static-Stub Haupt-Report gefixt)
**Lokaler Test mit invaliden API-Key:**
1. `.env.local`: `ANTHROPIC_API_KEY` invalid.
2. `npm run dev`. Analyse starten → Submit klicken.
3. Network-Tab → `/api/report/generate` Call.
4. Response muss **503** sein mit Body `{ "error": "ai_unavailable", "code": "missing_api_key" }`.
5. **Kein** PDF mit deutschem Stub-Text wird erzeugt.
6. Frontend zeigt einen Error-State (vorhandene `error_ai_unavailable`-UI).

### Test 5 — Retry-Logik
1. Im Browser Network-Tab eine `interpret-block`-Anfrage zu Throttling
   "offline" setzen → simuliert AI-Failure.
2. Re-load der `/results`-Seite.
3. Server-Logs zeigen: 1 Aufruf, dann 2 s warten, dann zweiter Aufruf, dann throw.
4. Frontend zeigt Error-Box.
5. "Erneut versuchen" klicken → der Cycle wiederholt sich (mit erneut 2 s Delay
   zwischen den 2 internen Versuchen).

### Automatisierte Checks (ein Befehl)
```bash
git grep "buildStatic" app/api/reports/   # → leer
git grep "buildStubReport\|StubInputs" app/api/   # → nur die ehemals-Stelle, jetzt leer/Kommentar
git grep "buildPlan(" app/api/   # → leer
grep "upsert: true" lib/pdf/background-generator.ts   # → leer
```

---

## 4. Was NICHT geändert wurde (mit Begründung)

- `lib/plan/buildPlan.ts` bleibt — wird vom Frontend (Plan-Seiten) als
  Skeleton-Template genutzt, **vor** AI-Personalisierung. Nur der **Server-Pfad**
  in `generate-single-pdf` durfte das nicht mehr aufrufen.
- `app/[locale]/plans/[type]/page.tsx` ist unverändert — hatte schon
  Error-State + Retry-Button + 90 s AbortController.
- Pre-existing TS-Hints in `analyse/page.tsx` (`paymentChecked`, `success`,
  `overallScore`, `downloadUrl`, `allScores`, `returnValue`) wurden nicht
  bereinigt — gehören nicht zum Bug-Scope und der Build ist trotzdem grün.
- Kein Schema-Diff in Supabase. Versions-Suffix `_v2` reicht.

---

## 5. Rollback-Plan (falls nötig)

Alle Änderungen sind in einem einzigen Commit auf `prompt-experiment-v1`.
Rollback ist trivial:
```bash
git checkout main
git branch -D prompt-experiment-v1   # nur lokal
git push origin --delete prompt-experiment-v1   # remote
```

`main` bleibt durch den ganzen Workflow unangetastet. Production läuft weiter mit
dem alten (kaputten, aber stabilen) Static-Fallback-Verhalten bis du explizit
mergst.
