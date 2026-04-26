# Cache/Reuse-Bug Diagnose-Bericht

Branch: `prompt-experiment-v1`. Stand: identisch zu `main` (Commit `3a454e0`)
plus dem leeren Trigger-Commit `1eef290`.

---

## 1. Plan-Generation-Flow (Schritt für Schritt)

Erfolgsfall: User klickt "Analyse starten" auf `/[locale]/analyse`.

**Schritt 1 — Frontend `handleSubmit()`** (`app/[locale]/analyse/page.tsx:626-863`)
- Sammelt Form-Werte → `payload = buildAssessmentPayload(form)`
- Ergänzt `locale`, optional `wearable_upload_id`
- `fetch("/api/assessment", POST)` — siehe Schritt 2

**Schritt 2 — `/api/assessment`** (`app/api/assessment/route.ts`)
- Zeile 205-241: User per Email **upserten** — selber User-Datensatz wenn die
  Email bereits existiert (`existingUser.id` wiederverwendet).
- Zeile 257-270: **`assessments`** wird per `INSERT` (NICHT upsert) angelegt
  → jede Analyse erzeugt eine **neue UUID** (`assessmentId`).
- Returnt `{ assessmentId, scores }`.

**Schritt 3 — Parallele Tasks** (`app/[locale]/analyse/page.tsx:674-763`)
- Reportgenerierung: `fetch("/api/report/generate", POST, { assessmentId, locale })`
- Plan-Generierung: für jeden der 4 Plan-Typen → `generatePlanBundle(...)` →
  `fetch("/api/plan/generate", POST, { type, scores, locale, ...personalization })`

**Schritt 4 — `generatePlanBundle()`** (`app/[locale]/analyse/page.tsx:33-99`)
```ts
async function generatePlanBundle(planType, scores, locale, personalization) {
  // 1. AI: POST /api/plan/generate
  const aiRes = await fetch("/api/plan/generate", { ... });
  if (!aiRes.ok) return null;
  const ai = await aiRes.json();
  if (!ai.blocks?.length) return null;

  // 2. PDF: POST /api/plan/pdf
  const basePlan = buildPlan(planType, scores, locale);  // ← deterministic
  const merged = { ...basePlan, blocks: ai.blocks, source: ai.source };
  const pdfRes = await fetch("/api/plan/pdf", ...);
  // ...convert to base64...
  return { blocks, source, pdfBase64, locale };
}
```

**Schritt 5 — `/api/plan/generate`** (`app/api/plan/generate/route.ts:122-201`)
- Validiert input → `locale = body.locale ?? "de"`.
- Wenn kein API-Key → 503 (kein Fallback mehr).
- Ruft `buildFullPrompt(locale, args)` aus
  `lib/plan/prompts/full-prompts.ts` — monolithische Prompts pro Locale.
- Anthropic-Call:
  ```ts
  client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  ```
- `JSON.parse(rawText)`. Wenn `blocks.length === 0` → 502.
- Returnt `{ ...meta, locale, blocks: parsed.blocks }`.
- **KEINE DB-Speicherung**. **Keine Cache-Lookups**. Pro Request ein neuer
  Anthropic-Call.

**Schritt 6 — Persistenz** (`app/[locale]/analyse/page.tsx:771-786`)
- Wenn `assessmentId` und `bundle.pdfBase64` vorhanden:
  `fetch("/api/plan/save", POST, { assessmentId, planType, pdfBase64 })`
- Fire-and-forget.

**Schritt 7 — `/api/plan/save`** (`app/api/plan/save/route.ts:11-113`)
- Decodiert base64 → uploadet nach Supabase Storage:
  `Reports/plans/{assessmentId}/{planType}.pdf`, `upsert: true`.
- Schreibt Row in `report_artifacts` (vorher löschen, dann insert für gleiche
  `assessment_id + file_type`).
- **Zeile 80-105:** Löscht `report_artifacts` (file_type LIKE 'plan_%') von
  **anderen** assessments desselben Users → "Plans nur vom letzten Report".
  Storage-Objekte werden **nicht** gelöscht.

**Schritt 8 — sessionStorage final** (`app/[locale]/analyse/page.tsx:841-852`)
```ts
sessionStorage.setItem("btb_results", JSON.stringify({
  scores,
  downloadUrl,
  parentSessionId: sessionId ?? null,
  assessmentId,
  plans,           // ← { activity: {blocks, source, pdfBase64, locale}, ... }
}));
router.push("/results");
```
- Wird gesetzt **NACH** allen Promises, **NICHT** beim Start der Analyse.

**Schritt 9 — `/results` page** (`app/[locale]/results/page.tsx:288-306`)
- Liest `assessmentId` und base64-PDFs aus sessionStorage.
- `fetch("/api/reports/prepare-pdfs", POST, { assessment_id, locale, plan_pdfs })`
- `prepare-pdfs` uploadet base64-PDFs sofern vorhanden, ODER ruft
  `/api/reports/generate-single-pdf` als Background-Worker → siehe Bereich 3.

---

## 2. Cache-Mechanismen

### 2.1 Frontend-Cache

#### sessionStorage `btb_results`
**File:** `app/[locale]/analyse/page.tsx:841-852` (write),
`app/[locale]/plans/[type]/page.tsx:63-87` (read).

- Inhalt: `{ scores, downloadUrl, parentSessionId, assessmentId, plans }`.
- `plans` ist `Record<PlanType, { blocks, source, pdfBase64, locale }>`.

**🚨 Kritisch:** `btb_results` wird beim Start einer neuen Analyse **NICHT
geleert**. Erst am Ende einer erfolgreichen Analyse überschrieben (line 842).
Der einzige `sessionStorage.removeItem`-Call im Repo ist:
- `app/[locale]/analyse/prepare/page.tsx:189` für `btb_wearable` (irrelevant für Pläne).

Folge: Wenn der User eine Analyse abbricht, navigiert oder Tab schließt,
bleibt der alte Cache-Eintrag liegen. Wenn die NEUE Analyse irgendwo
fehlschlägt, sieht der User weiterhin die alten Plans.

#### Plan-Page-Cache-Lookup
**File:** `app/[locale]/plans/[type]/page.tsx:76-87`
```ts
const cached = data.plans?.[type as PlanType];
if (cached?.blocks?.length && cached.locale === locale) {
  // → Cache-Hit: setPlan mit gecachten Blocks, return
  setPlan({ ...buildPlan(...), blocks: cached.blocks, source: cached.source ?? base.source });
  if (cached.pdfBase64) setCachedPdfBase64(cached.pdfBase64);
  return;
}
// Else: fetch /api/plan/generate frisch
```

Wenn `cached.locale === locale` → **kein neuer AI-Call**. Plan-Page zeigt
1:1 was im sessionStorage liegt — egal wie alt.

#### IndexedDB-PDF-Cache
**File:** `lib/pdf/pdfCache.ts` (139 Zeilen).
- Speichert per (assessmentId, type) die rohen PDF-Bytes.
- Wird in `analyse/page.tsx:794-835` befüllt nach erfolgreicher Generierung.
- Verschiedene `assessmentId` ⇒ verschiedene Cache-Keys (kein Reuse-Risiko).
- `cacheKeyFor()` in line 26-28: `${assessmentId}:${type}` — kollidiert nur
  zwischen identischen Assessment+Typ-Paaren.

#### `Cache-Control: private, max-age=86400` auf PDF-Downloads
**File:** `app/api/plan/download/[assessmentId]/[type]/route.ts:40, 63`
```ts
"Cache-Control": "private, max-age=86400"
```
Der Browser cached jedes heruntergeladene Plan-PDF 24h lang. URL-Schema:
`/api/plan/download/{assessmentId}/{type}` — KEIN locale im Pfad. Folge:
zwei Locales beim selben assessmentId+type teilen sich denselben URL +
denselben Browser-Cache (siehe Bereich 6.4).

### 2.2 Backend-Cache

#### Supabase-Tabelle `report_interpretations`
**File:** `lib/reports/interpretation-cache.ts:3-39`

Schlüssel: `(assessment_id, dimension, locale)`. Verwendet von **vier**
Routes:
- `app/api/reports/interpret-block/route.ts:42-44`
- `app/api/reports/cross-insights/route.ts:43-44`
- `app/api/reports/executive-summary/route.ts:44-46`
- `app/api/reports/action-plan/route.ts:46-47`

Lookup-Pattern überall identisch:
```ts
const cached = await getCachedInterpretation(assessment_id, "_executive_summary", locale);
if (cached) return NextResponse.json({ findings: cached });
// ... dann Anthropic-Call
await setCachedInterpretation(...);
```

**Behavior:**
- Identische `(assessment_id, dimension, locale)` → Cache-Hit → **kein
  Anthropic-Call**, gecachter Inhalt zurückgegeben.
- Neue assessment_id (= neue Analyse) → kein Cache-Hit → fresh.
- **Nicht** keyed auf `personalization` oder Score-Werte. Wenn jemals zwei
  Calls mit identischer assessment_id+dimension+locale aber unterschiedlichen
  Inhalts-Inputs ankommen würden → der erste prägt den Cache, alle weiteren
  bekommen den ersten zurück. (In der Praxis: assessment_id ist immutable
  pro Datenbank-Row, also kein Drift möglich solange der DB-Eintrag fix ist.)

**Wichtig:** Dieser Cache betrifft **NUR** die Report-Sub-Routes
(interpret-block / cross-insights / executive-summary / action-plan).
**`/api/plan/generate` (= die 4 individuellen Pläne) hat KEIN Backend-Cache.**

#### Supabase-Tabelle `report_artifacts` als Persistenz
**File:** `app/api/plan/save/route.ts`

Hier werden generierte PDF-Verweise persistiert (file_url). Wird beim
Plan-Download in `/api/plan/download` gelesen. **Lookup-Logik im Plan-
Generate-Pfad gibt es nicht** — `/api/plan/generate` liest `report_artifacts`
nicht. Aber `/api/plan/save` löscht beim Insert "alte" Plan-Artifacts vom
selben User (Zeile 80-105) — Plans des aktuellen Reports überschreiben
quasi die Plan-Records des vorherigen Reports.

#### Supabase Storage `Reports/plans/{assessmentId}/{type}.pdf`
**File:** `app/api/plan/save/route.ts:40-47` (write),
`app/api/plan/download/[assessmentId]/[type]/route.ts:30-43` (read).

`upsert: true` — **derselbe Pfad wird überschrieben** wenn eine zweite
Analyse mit derselben assessmentId aufgerufen wird (was nicht passiert,
solange `assessments` immer per INSERT angelegt wird).

**🚨 ABER:** der Pfad enthält **nur assessmentId + type**, **kein locale**.
Wenn ein User zur derselben assessmentId einmal in DE und einmal in EN ein
PDF generiert (theoretisch über `/api/plan/pdf` direct call, oder bei
einem Sprach-Switch im Re-Render), überschreibt das spätere PDF das frühere
in der Storage.

### 2.3 Route-Handler-Cache (Next.js)

**Befund:**
- `/api/plan/generate/route.ts`: `runtime = "nodejs"`, `maxDuration = 60`. **Kein** `dynamic`-Flag, **kein** `revalidate`, **kein** `fetchCache`.
- `/api/report/generate/route.ts`: `runtime = "nodejs"`, `maxDuration = 300`. Ebenso keine Cache-Settings.
- `/api/plan/save/route.ts`: `dynamic = "force-dynamic"` — explizit nicht-cachbar.
- `/api/plan/pdf/route.ts:27`: liefert `Cache-Control: no-store`.
- Alle 4 Sub-Report-Routes (interpret-block, cross-insights, executive-summary, action-plan): keine Cache-Settings im Route-Handler.

Da es POST-Routes sind, würde Next.js sie standardmäßig sowieso nicht cachen.
**Keine route-level Cache-Probleme zu sehen.**

### 2.4 Vercel-Cache

**Befund:**
- Kein `vercel.json` im Repo.
- Kein `.vercel`-Verzeichnis im Repo (lokal nicht gelinkt).
- Keine Vercel-spezifischen Cache-Header (`x-vercel-cache: HIT/MISS` etc.) werden gesetzt.

Vercels Default-Caching für `runtime: nodejs` POST-Routes ist no-cache. Es
würde mich überraschen, wenn Vercel hier still cached.

---

## 3. Fallback-Mechanismen

### 3.1 In `/api/plan/generate`
Vorher gab es einen Fallback (`buildFallbackBlocks`), der wurde in Commit
`ae0e5f5` entfernt. Aktuell:

`app/api/plan/generate/route.ts:153-158`
```ts
if (!apiKeyOk) {
  console.error("[Plans/BE/generate] ANTHROPIC_API_KEY missing/invalid — refusing to generate");
  return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
}
```

`app/api/plan/generate/route.ts:189-192`
```ts
if (!parsed.blocks?.length) {
  console.error("[Plans/BE/generate] Claude returned empty blocks array");
  return NextResponse.json({ error: "AI returned empty plan" }, { status: 502 });
}
```

→ Plan-Generate hat **KEINEN Fallback-Content mehr**. Bei Fehler: HTTP-Error.
Frontend (`generatePlanBundle`) returnt dann `null` → Bundle wird in
`plans` Dict übersprungen.

### 3.2 In `lib/plan/buildPlan.ts`
`buildPlan(planType, scores, locale)` returnt deterministisch eine
PlanContent-Struktur mit:
- Locale-aware `title`, `subtitle`, `source` (4 META-Maps `de/en/it/tr`).
- Locale-aware Heading-Strings (4 HEADINGS-Maps).
- **Items + rationale: hardcoded deutsche Prosa** (nicht locale-aware).
- Score-bedingte Verzweigung (z.B. line 197-201: 3×/Woche bei score<40,
  4×/Woche bei score<65, 5×/Woche sonst).

**`buildPlan` wird an drei Stellen verwendet:**
1. `app/[locale]/analyse/page.tsx:72` — nur für `title/subtitle/color/source`
   beim Mergen mit AI-Blocks. Blocks aus `buildPlan` werden bei AI-Erfolg
   überschrieben (Zeile 73: `merged = { ...basePlan, blocks: ai.blocks, ... }`).
2. `app/[locale]/plans/[type]/page.tsx:79` und `:114` — wieder nur als
   Metadata-Quelle; AI-Blocks bzw. cached.blocks überschreiben.
3. **`app/api/reports/generate-single-pdf/route.ts:128`** — **direkt als
   Plan-Source**, ohne AI-Layer. Siehe Bereich 6.1 (Smoking Gun #1).

### 3.3 In den 4 Reports/*-Routes
Jede der 4 Routes hat einen `buildStaticXxx()`-Fallback der greift wenn:
- `!hasValidKey(API_KEY)` → static fallback
- Anthropic-Call wirft → static fallback (catch-Block)
- `JSON.parse` schlägt fehl → static fallback

Static Fallbacks sind 4-sprachig hardcoded (DE/EN/IT/TR) und nutzen
score-basierte Templates. Werden im Cache gespeichert (`setCachedInterpretation`)
**genauso wie AI-generierte Antworten**.

**🚨 Folge:** Wenn ein Sub-Report-Call zum ersten Mal einen Static-Fallback
schreibt, prägt sich dieser Fallback in `report_interpretations`. Alle
folgenden Aufrufe **mit derselben assessment_id** bekommen den
Static-Fallback zurück — selbst wenn der Anthropic-Call beim zweiten Mal
funktionieren würde.

### 3.4 Kommunikation an den User
**KEIN sichtbarer Hinweis** dass es ein Static-Fallback ist. Kein UI-Badge,
kein Banner. Der User sieht in beiden Fällen denselben Output-Container.

---

## 4. User-Daten-Übergabe

### 4.1 In `/api/plan/generate`
Body wird so geparst (`route.ts:124-134`):
```ts
const body = await req.json();
const { type, scores } = body as { type: string; scores: ScoreInput };
const personalization: PlanPersonalization = {
  main_goal: body.main_goal ?? null,
  time_budget: body.time_budget ?? null,
  experience_level: body.experience_level ?? null,
  training_days: body.training_days ?? null,
  nutrition_painpoint: body.nutrition_painpoint ?? null,
  stress_source: body.stress_source ?? null,
  recovery_ritual: body.recovery_ritual ?? null,
};
```

→ Felder die nicht im Body sind: **`null`** (nicht "default"-Wert wie
`"feel_better"`). Diese `null` werden dann beim User-Prompt-Build (in
`lib/plan/prompts/full-prompts.ts:340-346`) per nullish-coalescing in
"feel_better (Default)", "moderate (Default)" etc. übersetzt:
```ts
- Hauptziel: ${p.main_goal ?? "feel_better (Default)"}
- Zeitbudget: ${p.time_budget ?? "moderate (Default)"}
- Erfahrungslevel: ${p.experience_level ?? "intermediate (Default)"}
```

**Folge:** Wenn das Frontend keine Personalisierung mitschickt (oder es
durchsickert) → **alle User landen mit denselben "Default"-Werten beim
selben Prompt** → Claude generiert für viele User sehr ähnlichen Inhalt,
weil die Personalisierungs-Inputs alle "Default" sind.

### 4.2 Frontend-Übergabe der personalization
`app/[locale]/analyse/page.tsx:740-748`:
```ts
const planPersonalization: PlanPersonalization = {
  main_goal: payload.main_goal,
  time_budget: payload.time_budget,
  experience_level: payload.experience_level,
  training_days: (payload.vigorous_days ?? 0) + (payload.moderate_days ?? 0),
  nutrition_painpoint: payload.nutrition_painpoint,
  stress_source: payload.stress_source,
  recovery_ritual: payload.recovery_ritual,
};
```

→ Wird in `generatePlanBundle` an `/api/plan/generate` POST geschickt
(line 51: `body: JSON.stringify({ type: planType, scores, locale, ...personalization })`).

`payload.main_goal` etc. kommen aus `buildAssessmentPayload(form)` —
verlangt also dass der User die entsprechenden Form-Felder ausgefüllt hat.
Validierung am Submit-Button: alle 26 Fragen müssen beantwortet sein
(line 593-624 mit `answeredCount === totalQuestions`). Inkludiert
`mainGoal`, `nutritionPainpoint`, `stressSource`, `recoveryRitual`,
`timeBudget`, `experienceLevel`, `trainingsfreq` etc.

→ **In der Praxis sollten die Werte da sein, aber der API-Endpoint hat
keine Validierung, dass sie tatsächlich gefüllt sind.** Wenn jemand einen
direkten POST mit unvollständigem Body macht oder das Frontend gebrochen ist,
bekommt er den Default-User-Prompt.

### 4.3 In `/api/reports/generate-single-pdf` — komplett ohne Personalisierung
Siehe Bereich 6.1 unten — diese Route lädt **nur Scores aus DB** und ruft
`buildPlan(planType, scores)` **ohne Personalisierungs-Argumente** auf.

---

## 5. Multiple Sessions / Re-Analyse

### 5.1 assessmentId
Jede Analyse → neuer DB-Insert → **neue UUID**. Siehe `assessment/route.ts:257-270`.

### 5.2 user_id
**Selbe Email = selber user_id**. `assessment/route.ts:205-241` upsertet
den User by email. Mehrere Analyses → mehrere `assessments`-Rows mit
**demselben** `user_id`.

### 5.3 sessionStorage
**`btb_results` wird beim Start einer neuen Analyse NICHT gelöscht.** Erst
am Ende einer erfolgreichen Analyse überschrieben.

### 5.4 IndexedDB
Cache-Key beinhaltet `assessmentId` → kein Konflikt zwischen Analyses.

### 5.5 report_artifacts
`/api/plan/save:80-105` löscht plan-Artifacts älterer assessments **vom
selben User** beim Insert eines neuen. Storage-Objekte bleiben (bewusst,
für /account-Historie).

### 5.6 report_interpretations
Keyed auf assessment_id → fresh per Analyse, kein Cross-Assessment-Reuse.

---

## 6. Identifizierte Bugs / Risikostellen

### 6.1 SMOKING GUN: `generate-single-pdf` benutzt nur statisches `buildPlan`

**File:** `app/api/reports/generate-single-pdf/route.ts:126-130`
```ts
const planType = PDF_TYPE_TO_PLAN[pdfType as PlanPdfType];
const plan = buildPlan(planType, scores);          // ← static, deterministic
const pdfBytes = await generatePlanPDF({ ...plan, locale });
const base64 = Buffer.from(pdfBytes).toString("base64");
await uploadPlanPdf(assessmentId, pdfType as PlanPdfType, locale, base64);
```

**Wann wird das aufgerufen?**

`app/api/reports/prepare-pdfs/route.ts:62-77`:
```ts
} else {
  // No base64 supplied — delegate to the background worker.
  fetch(`${origin}/api/reports/generate-single-pdf`, ...);
}
```

Also: Wenn `prepare-pdfs` keine base64 für einen Plan bekommt (= AI-Plan-
Generierung im Frontend ist gescheitert oder hat noch nicht zurückgekehrt),
fällt das System auf `buildPlan` zurück.

**Folgen:**
- Inhalt ist deterministisch aus den Scores → identische Scores → identischer
  Plan
- Items sind hardcoded deutsch (HEADINGS sind locale-aware, items nicht)
- Personalisierung (`stress_source`, `nutrition_painpoint`, etc.) wird
  **nicht** an `buildPlan` übergeben (nur `scores`)
- Plan landet in Storage als `plans/{assessmentId}/{type}.pdf`
- User klickt später auf Download → bekommt den static Plan, nicht den AI-Plan

### 6.2 Static-Fallback in 4 Sub-Reports prägt sich in DB-Cache

`report_interpretations` ist 1:1 keyed auf `(assessment_id, dimension, locale)`
und macht keinen Unterschied zwischen AI- und Fallback-Inhalten. Der erste
Call gewinnt. Wenn der erste Call den Static-Fallback schreibt (z.B. wegen
temporärem Anthropic-Outage), bekommt **jeder folgende Call** denselben
Static-Fallback zurück — auch wenn Anthropic später wieder funktioniert.

Es gibt keine TTL, keine Re-Validation. Der Cache-Eintrag persistiert für
immer (oder bis manuell gelöscht).

### 6.3 sessionStorage `btb_results` wird beim neuen Submit nicht gecleart

`app/[locale]/analyse/page.tsx:626-863` (handleSubmit) hat **keinen**
`sessionStorage.removeItem("btb_results")` am Anfang. Die alte Cache-
Struktur bleibt 60+ Sekunden bestehen während die neue Analyse läuft.

Wenn die neue Analyse irgendwo scheitert (Network, Anthropic-503, JSON-
Parse) oder der User die Page schließt, sieht er bei Rückkehr auf
`/results` oder `/plans/[type]` die OLD-Pläne aus dem alten Cache.

### 6.4 Storage-Pfad `plans/{assessmentId}/{type}.pdf` enthält keinen `locale`

**Files:** `app/api/plan/save/route.ts:40`,
`app/api/plan/download/[assessmentId]/[type]/route.ts:27`.

Wenn ein User in derselben Browser-Session auf zwei verschiedene Locales
springt und beide Male auf "PDF download" klickt, könnte theoretisch zweimal
unter denselben Pfad uploaded werden mit unterschiedlichem Inhalt. Mit
`upsert: true` würde der zweite den ersten überschreiben.

In der Praxis nicht kritisch weil der UI-Flow das nicht triggert — aber
Schema-Schwäche.

### 6.5 Default-Personalisierung im Plan-Prompt sieht für Claude wie ein "echter" User-Wert aus

`lib/plan/prompts/full-prompts.ts:340-346`:
```ts
- Hauptziel: ${p.main_goal ?? "feel_better (Default)"}
- Zeitbudget: ${p.time_budget ?? "moderate (Default)"}
- Erfahrungslevel: ${p.experience_level ?? "intermediate (Default)"}
```

Wenn personalization-Felder fehlen, wird Claude trotzdem ein Plan
generieren — basierend auf den hartcodierten "Default"-Werten. Zwei User
mit ähnlichen Scores aber komplett fehlenden Personalisierungs-Inputs
bekommen sehr ähnlichen Output, weil der einzige Variabilität-Hebel die
Score-Daten sind.

### 6.6 `Cache-Control: private, max-age=86400` auf Plan-Download

`/api/plan/download/[assessmentId]/[type]` setzt 24h Browser-Cache. Wenn
ein Plan einmal heruntergeladen wurde und der Storage-Inhalt sich später
ändert (z.B. weil `prepare-pdfs` 30s später den static Fallback drüber-
schreibt), bekommt der Browser den ALTEN Inhalt.

Trifft im normalen UI-Flow eher selten, aber möglich.

---

## 7. Hypothesen-Ranking

### Hypothese A — `generate-single-pdf` schreibt Static-Plan über AI-Plan
**Wahrscheinlichkeit:** 🟢 sehr hoch

**Begründung:** Race-Condition zwischen Frontend (AI-Plan via `/api/plan/save`)
und Backend (`prepare-pdfs` → `generate-single-pdf` → `buildPlan` → upload).
Beide schreiben nach `plans/{assessmentId}/{type}.pdf` mit `upsert: true`.

Wann tritt das auf:
- AI-Plan-Generierung im Frontend ist langsam/scheitert
- `prepare-pdfs` wird trotzdem aufgerufen (sobald `assessmentId` bekannt ist)
- `prepare-pdfs` sieht `plan_pdfs[type]` als `undefined` → Worker-Path
- Worker generiert static plan und uploaded
- User klickt später → bekommt static plan

Symptom: User sieht bei zweiter Analyse "ähnlichen" Plan, weil er für
dieselben Scores immer denselben deterministischen Output kriegt. **Genau
das User-Symptom.**

### Hypothese B — `report_interpretations`-Cache prägt Static-Fallback ein
**Wahrscheinlichkeit:** 🟠 mittel

**Begründung:** Wenn die 4 Sub-Report-Routes (interpret-block, cross-insights,
executive-summary, action-plan) beim ersten Call den Anthropic-Outage haben
und ihren Static-Fallback in `report_interpretations` cachen, bleibt dieser
Eintrag für immer. Bei der nächsten Analyse mit einer neuen `assessment_id`
ist es ein neuer Cache-Key — wäre also unproblematisch.

Aber: Static-Fallback hat sehr generische Templates (siehe action-plan/route.ts:135-285)
mit nur 4-Sprachen-Variation und Score-Verzweigung. **Wenn das im Report
landet, sehen verschiedene User mit ähnlichen Scores ähnliche Inhalte.**

Trifft das User-Symptom für den **Haupt-Report** und seine Sub-Sektionen,
nicht direkt für die 4 Plan-PDFs.

### Hypothese C — sessionStorage-Persistenz zeigt alte Plans
**Wahrscheinlichkeit:** 🟠 mittel

**Begründung:** Wenn der User mehrfach `/analyse` durchläuft ohne den Tab
zu schließen, sieht er auf `/plans/[type]` die alten Plans aus dem
sessionStorage solange die neue Analyse nicht KOMPLETT durchgelaufen ist.
Sichtbar besonders wenn er navigiert während die Generierung läuft.

Sieht aus wie "der Plan ist immer derselbe", ist aber tatsächlich
"der OLD-Plan vom letzten Mal".

### Hypothese D — Default-Personalisierung führt zu Cluster-Identität
**Wahrscheinlichkeit:** 🟡 niedrig-mittel

**Begründung:** Wenn die Frontend-Form ein Personalisierungs-Feld leer
zurücklässt (z.B. wenn ein Field-Validator versagt), bekommen alle
betroffenen User dieselbe "(Default)"-Personalisierung. Aber die Form-
Validierung scheint in der Praxis robust (alle 26 Fragen müssen ausgefüllt
sein).

Eher unwahrscheinlich der Haupttreiber, aber möglich für Dev/Test-Modus
oder direkte API-Calls.

---

### Empfohlene Reihenfolge zur Verifikation

1. **Vercel Runtime-Logs für `[generate-single-pdf]` checken** —
   wenn die für eine User-Session feuern, ist Hypothese A bestätigt.
2. **Supabase `report_artifacts` Tabelle inspizieren** — dort steht das
   `file_url`-Feld pro `assessment_id + plan_type`. Wenn Plan-PDFs einer
   neueren Analyse erkennbar Static-Inhalte enthalten (deutsche Items),
   ist es entweder Hypothese A oder Hypothese C.
3. **Static-Plan-Output mit AI-Plan-Output für identische Scores
   vergleichen** — wenn der "verdächtige" Plan in der DB exakt zu
   `buildPlan(type, scores)` passt, ist Hypothese A bewiesen.

---

# Was nicht eindeutig geklärt werden konnte

- Ob die `Cache-Control: private, max-age=86400`-Header auf Vercels
  Edge-Cache anders wirken als im Browser. Ohne Vercel-CLI-Zugriff nicht
  prüfbar.
- Ob `prepare-pdfs` tatsächlich öfter den `else`-Branch (= static fallback)
  trifft als erwartet. Hängt von Timing zwischen Frontend-AI-Call und
  Results-Page-Mount ab. Würde Live-Logs brauchen.
- Ob der User in seinem konkreten Reuse-Bug-Reportprivat in derselben
  Browser-Session zwei Analyses gemacht hat (→ Hypothese C möglich) oder
  zwei verschiedene Sessions (→ nur Hypothese A oder B möglich).
