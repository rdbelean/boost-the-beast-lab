# BOOST THE BEAST LAB

Performance Intelligence Reports auf Basis selbstberichteter Daten.
Stack: Next.js 16 App Router · Supabase (PostgreSQL + Storage) · Anthropic Claude · Puppeteer · Resend.

## Setup

```bash
# 1. Abhängigkeiten
npm install

# 2. Environment
cp .env.local.example .env.local
# Dann die Keys eintragen (siehe Abschnitt "Environment")

# 3. Supabase Schema anwenden
# Öffne das Supabase Dashboard → SQL Editor → Inhalt von supabase/schema.sql ausführen
# ODER (wenn supabase CLI linked ist): npx supabase db push

# 4. Supabase Storage Bucket anlegen
# Dashboard → Storage → "New bucket" → Name: "reports" (Private)

# 5. Dev Server
npm run dev
```

## Environment Variables

| Key | Zweck |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Projekt URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Key (Browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role (nur Server!) |
| `ANTHROPIC_API_KEY` | Claude API Key |
| `RESEND_API_KEY` | Transactional Email (resend.com) |
| `RESEND_FROM_EMAIL` | Verifizierte Absenderadresse |
| `NEXT_PUBLIC_APP_URL` | Basis-URL (z.B. `http://localhost:3000`) |

## Scoring Engine

Pure Funktionen in `lib/scoring/` — keine DB-Abhängigkeit, einzeln testbar.
Details siehe [`lib/scoring/README.md`](lib/scoring/README.md).

| Modul | Quelle / Modell |
|-------|-----------------|
| `activity.ts` | IPAQ Short Form (Nov 2005) — MET 3.3/4.0/8.0 |
| `vo2max.ts`   | Jackson non-exercise prediction · ACSM Fitness-Bands |
| `sleep.ts`    | PSQI-adaptiert · NSF (2015) · AASM (2015) |
| `metabolic.ts`| WHO BMI · DGA 2020–2025 (Fruit/Veg) |
| `stress.ts`   | Invertierte Self-Report-Skala + Recovery-Bonus |
| `index.ts`    | `runFullScoring()` · Composite 28/25/15/20/12 |

## API Routes

| Route | Methode | Zweck |
|-------|---------|-------|
| `POST /api/assessment` | POST | Nimmt Formulardaten entgegen, persistiert User/Assessment/Responses, ruft `runFullScoring()`, speichert derived metrics + scores, triggert Report-Job asynchron. |
| `POST /api/report/generate` | POST | Lädt Scores → Claude (JSON) → PDF (Puppeteer) → Supabase Storage → Signed URL → Email (Resend) → Report-Job abschließen. |

## Datenfluss (High-Level)

```
Form (app/analyse)
   └─▶ POST /api/assessment
         ├─ upsert users
         ├─ insert assessments
         ├─ insert responses
         ├─ runFullScoring()          [pure]
         ├─ insert derived_metrics
         ├─ insert scores
         ├─ insert report_jobs (pending)
         └─ fire-and-forget POST /api/report/generate
               ├─ Claude → JSON Report
               ├─ Puppeteer → PDF Buffer
               ├─ Supabase Storage upload (bucket: reports)
               ├─ createSignedUrl (30d)
               ├─ insert report_artifacts
               ├─ Resend → Email
               └─ update report_jobs (completed)
```

## Deployment Hinweise

- **Puppeteer auf Vercel:** Die `puppeteer`-Dependency enthält einen gebündelten Chromium
  (~300 MB) — zu groß für Vercel Serverless Functions (Limit 250 MB komprimiert).
  Für Vercel umbauen auf `puppeteer-core` + `@sparticuz/chromium`:
  ```ts
  import chromium from "@sparticuz/chromium";
  import puppeteer from "puppeteer-core";
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  ```
- **Resend From-Email:** Die Absender-Domain muss in Resend verifiziert sein, sonst scheitert das Senden.
- **Supabase Storage Bucket `reports`:** Muss einmalig manuell angelegt werden (Dashboard → Storage). Der Service-Role Key darf uploaden.

## TODO — nächste Phase

- Stripe Checkout vor Assessment-Trigger (aktuell ist die API unbezahlt erreichbar)
- Longitudinales Tracking (mehrere Assessments pro User, Trend-Charts)
- E-Mail-Versand-Tracking + Retry-Queue
- Vercel-kompatibles PDF-Rendering (`puppeteer-core` + `@sparticuz/chromium`)
- Unit-Tests für `lib/scoring/` (Vitest/Jest)
- DSGVO: Datenlöschroute, Cookie-Banner
