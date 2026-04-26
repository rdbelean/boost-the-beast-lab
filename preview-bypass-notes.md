# Preview-Bypass — Notizen

Branch: `prompt-experiment-v1`. Production (`main`) ist **nicht** angefasst.
Build-Status: grün (`npm run build`).

## Was wurde geändert

| File | Änderung |
|---|---|
| **`lib/utils/is-preview.ts`** | NEU. Helper `isPreviewDeployment()` (server) + `isPreviewDeploymentClient()` (browser). Beide returnen nur `true` wenn `VERCEL_ENV` bzw. `NEXT_PUBLIC_VERCEL_ENV` gleich `"preview"` ist. |
| **`next.config.ts`** | `env`-Block hinzugefügt: `NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV`. Wird beim Build inline gesetzt → Client kann den Wert lesen. |
| **`proxy.ts`** | Direkt am Anfang von `proxy()`: wenn `isPreviewDeployment()` → next-intl-Middleware ohne Paid-Gate. |
| **`app/[locale]/kaufen/page.tsx`** | `handleBuy` springt auf Preview vor dem `/api/create-checkout`-Call ab und navigiert direkt zu `/analyse?product=complete-analysis&paid=true`. |
| **`app/[locale]/analyse/prepare/page.tsx`** | Payment-Gate-`useEffect`: auf Preview sofort `setPaymentChecked(true)`, kein Stripe-Verify-Call. |
| **`lib/supabase/guestIdentity.ts`** | `resolveIdentity()` fällt auf Preview als Letztes auf einen synthetischen Test-User zurück (`preview-test@boostthebeast-lab.test`). Wird einmal in `users` per `upsertUserByEmail` angelegt und danach wiederverwendet. |
| **`components/PreviewBanner.tsx`** | NEU. Server-Component, rendert auf Preview ein gelbes Banner und auf Production `null`. |
| **`app/[locale]/layout.tsx`** | `<PreviewBanner />` direkt am Anfang von `<body>`. |

## Wie verifiziere ich, dass Production unberührt ist?

Vercel setzt `VERCEL_ENV` automatisch und unveränderbar:
- Production-Deploy von `main` auf `boostthebeast-lab.com` → `VERCEL_ENV=production` → `isPreviewDeployment()` ist `false` → **alle** Bypasses fallen durch.
- Branch-Deploy von `prompt-experiment-v1` → `VERCEL_ENV=preview` → Bypasses greifen.
- `npm run dev` lokal → `VERCEL_ENV` ist undefined → keine Bypasses (lokale Tests laufen wie auf Production).

Manuell prüfbar:

```bash
# Jeder Bypass-Pfad ist explizit hinter einem isPreviewDeployment*()-Check:
git grep -n "isPreviewDeployment" -- "app/" "lib/" "components/" "proxy.ts"

# Erwartete Treffer (alle in einem if-Block):
#   lib/utils/is-preview.ts (Definitionen)
#   proxy.ts (1 Aufruf, in Top-Level if)
#   app/[locale]/kaufen/page.tsx (1, in if vor Stripe-Call)
#   app/[locale]/analyse/prepare/page.tsx (1, in useEffect-if)
#   lib/supabase/guestIdentity.ts (1, in finalem if-Block)
#   components/PreviewBanner.tsx (1, frühes return wenn false)
```

Es gibt **keinen** impliziten Skip — jeder Pfad ist hinter einem expliziten `if`. Auf Production fällt jeder dieser `if`s durch, weil `isPreviewDeployment()` dort `false` ist.

## Wie teste ich den Bypass auf Preview?

1. **Vercel Preview-URL öffnen** (Vercel-Dashboard → Project → Deployments → `prompt-experiment-v1` → "Visit"). Erwartetes URL-Schema: `https://boost-the-beast-lab-git-prompt-experiment-v1-rdbeleans-projects.vercel.app`.
2. **Hard-Reload + Incognito** (verhindert dass alte gecachte Production-Pages reinrutschen).
3. **Banner prüfen:** Oben muss das gelbe `🧪 PREVIEW DEPLOYMENT — Bezahlflow umgangen` erscheinen.
4. **CTA klicken** → "Jetzt analysieren" / "Kaufen". URL muss innerhalb der `*.vercel.app`-Domain bleiben:
   - `/<locale>/kaufen` → klick auf "Kaufen-Button" → direkt auf `/<locale>/analyse?product=complete-analysis&paid=true`.
   - **Kein** Sprung zu `https://www.boostthebeast-lab.com/...`.
5. **Fragebogen ausfüllen** und submitten.
6. **Cache-Fix-Tests** durchlaufen (siehe [`cache-fix-report.md`](cache-fix-report.md) Sektion 3) — die Sub-Reports und Pläne sollten jetzt auf Preview generiert werden, in den Vercel-Preview-Logs sollte für `/api/reports/interpret-block`, `/api/plan/generate`, `/api/report/generate` Aktivität sichtbar sein.

## Wie schalte ich den Bypass wieder aus?

Es gibt drei Wege:
1. **Branch löschen / Preview-Deployment löschen.** Production ist sowieso unangetastet.
2. **Beim Merge auf `main`:** Vercel setzt dort `VERCEL_ENV=production`, `isPreviewDeployment()` returnt `false`, jeder Bypass ist tot. Keine separate Code-Aktion nötig.
3. **In `lib/utils/is-preview.ts` die Funktionen auf `false` hardcoden.** Dann ist der Bypass auch auf der Preview tot.

## Was ist ausgeschlossen

- Der eigentliche Stripe-`success_url`-Bug in [`app/api/create-checkout/route.ts:106`](app/api/create-checkout/route.ts#L106) ist **nicht** gefixt. Auf Preview wird `/api/create-checkout` einfach nicht mehr aufgerufen.
- Wenn jemand auf Preview manuell `/api/create-checkout` per Hand aufruft (z.B. via curl), würde der Stripe-Flow weiterhin auf Production zurückfallen. Für UI-Tests irrelevant.
- Die Sample-Report-Demo-Route (`/api/sample-report/*`) ist nicht angefasst — sie verwendet keinen Bezahl-Gate.

## Build & Push

Build grün (`npm run build` zeigt `✓ Compiled successfully` und `✓ Generating static pages 63/63`). Commit + Push auf `prompt-experiment-v1` direkt im Anschluss an diese Notiz.
