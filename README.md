# Cykelhjälpen

Marknadsplats för cykelreparationer i Linköping, Norrköping, Uppsala och Lund. Beskriv ditt cykelproblem och få upp till tre prisförslag från lokala cykelverkstäder inom 24 timmar.

**Live:** https://cykelhjalpen.se

## Så funkar det

- **Kunder:** Helt gratis. Beskriv felet på cykeln i ett kort formulär och få upp till tre prisförslag från lokala verkstäder inom ett dygn. Inget konto krävs.
- **Verkstäder:** Gratis att registrera, gratis att lämna offert. Du betalar 50 kr exkl. moms först när kunden väljer din offert — inget att förlora på att svara. Max tre verkstäder kan svara per ärende. Konton kräver admin-godkännande innan första offerten kan skickas.

## Tech stack

- **Frontend:** React 18 + TypeScript, Vite 5, Tailwind CSS, shadcn/ui
- **Backend:** Supabase – Postgres, Auth, Edge Functions (Deno), Storage, pg_cron
- **Betalningar:** Stripe Checkout (one-time lead-avgifter)
- **E-post:** Resend via auth-email-hook Edge Function
- **Hosting:** Vercel (se [docs/vercel.md](docs/vercel.md))
- **Pakethanterare:** Bun 1.2

## Kom igång

```bash
bun install
bun run dev          # http://localhost:8080
```

Appen pekar mot produktionens Supabase-projekt som standard (de publika nycklarna finns som fallback i `vite.config.ts`). Sätt `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` och `VITE_SUPABASE_PROJECT_ID` i `.env.local` för att använda ett annat projekt.

## Skript

| Kommando | Vad det gör |
| --- | --- |
| `bun run dev` | Utvecklingsserver |
| `bun run build` | Produktionsbygge: redaktionell kontroll, Vite-bygge, förrenderade SEO-sidor och sitemaps i `dist/` |
| `bun run preview` | Servera `dist/` lokalt |
| `bun run typecheck` | TypeScript (`tsc -b`) |
| `bun run lint` | ESLint |
| `bun run test` | Vitest (frontend och delad logik) |
| `bun run types:v2:check` | Kontrollerar att `src/integrations/supabase/types.ts` matchar V2-migrationerna |
| `bun run editorial:check` | Validerar bloggartiklarna i `src/content/editorial/articles.json` |
| `deno test --allow-env --allow-read --allow-net supabase/functions` | Tester för Edge Functions |

CI (`.github/workflows/ci.yml`) kör typkontroll, lint, Vitest, Deno-testerna och bygget på varje PR.

## Projektstruktur

```
src/
  pages/cykelhjalpen/      Kund- och verkstadsflöden (wizard, offerter, verkstadspanel)
  pages/admin/             Adminpanelen
  components/cykelhjalpen/ Cykelhjälpens UI-komponenter
  lib/                     Domänlogik, SEO-data, analys (testas med Vitest)
  lib/v2/                  V2-marknadsplatsen (flaggstyrd, se docs/v2/)
  locales/en/              Engelska översättningar, nycklade på svensk källtext
  content/editorial/       Bloggartiklar (se content/editorial/README.md)
supabase/
  functions/               Edge Functions, delad kod i _shared/
  migrations/              Databasschema, RLS-policyer och cron-jobb
scripts/                   Byggskript för redaktionellt innehåll och typgenerering
```

Kodbasen innehåller även den äldre Updro-sajten (byråmarknadsplats). Vilken sajt som renderas styrs av värdnamnet (`src/lib/hostConfig.ts`) och vid bygge av `SITE_HOST`, som alltid ska vara `cykelhjalpen` (eller osatt) för den här sajten.

### Översättningar

Svenska är källspråk. `t('Svensk text')` slår upp den engelska översättningen i `src/locales/en/*` på `/en/...`-sidor. Den engelska katalogen laddas bara när besökaren är på en engelsk sida.

### SEO

Alla publika sidor förrenderas vid bygge (`seoBuildPlugin` i `vite.config.ts`) med titel, beskrivning, canonical, hreflang och strukturerad data, och sitemaps skrivs till `dist/`. Vilka sökvägar som ska vara `noindex` avgörs i `src/lib/seoRobots.ts` och `src/lib/seoStatic*.ts`. Klienten får bara den färdiga listan via den virtuella modulen `virtual:seo-route-manifest` (`seoRouteManifestPlugin.ts`), så SEO-datan hamnar inte i webbläsarens bundle.

## Edge Functions: hemligheter

`SUPABASE_URL`, `SUPABASE_ANON_KEY` och `SUPABASE_SERVICE_ROLE_KEY` sätts automatiskt av Supabase. Övriga sätts med `supabase secrets set NAMN=värde`:

| Hemlighet | Används av |
| --- | --- |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_BIKE`, `STRIPE_WEBHOOK_SECRET_LEAD_CREDITS` | Betalningar och webhooks |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | Utgående och inkommande e-post |
| `LOVABLE_API_KEY` | AI-funktioner (artiklar, beskrivningar) och transaktionsmejl |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Bot-skydd på formulären |
| `ELKS_API_USERNAME`, `ELKS_API_PASSWORD`, `GATEWAYAPI_TOKEN` | SMS |
| `FIRECRAWL_API_KEY` | Prospektering |
| `CRON_SECRET` | Skyddar schemalagda funktioner, se nedan |

### Skydd för cron-funktioner

Schemalagda funktioner (`close-stale-bike-requests`, `bike-choice-reminders`, `offer-reminder-cron`, `process-article-queue` och V2-jobben) körs med `verify_jwt = false`. De kräver headern `x-cron-secret` eller service role-nyckeln (`supabase/functions/_shared/cron-auth.ts`). Så slår du på skyddet:

```sql
-- I Supabase SQL editor
select vault.create_secret('<lång slumpad sträng>', 'edge_cron_secret');
```

```bash
supabase secrets set CRON_SECRET='<samma sträng>'
```

pg_cron-jobben hämtar hemligheten via `public.edge_cron_headers()`. Så länge `CRON_SECRET` inte är satt släpps anrop igenom som tidigare, med en varning i funktionsloggen. Jobb som schemalagts manuellt i Supabase-dashboarden (t.ex. `v2-outcome-invites`) måste också skicka headern innan `CRON_SECRET` sätts.

AI-verktygen `generate-article` och `suggest-article-topics` kräver en inloggad admin eller service role-nyckeln (`_shared/admin-auth.ts`).

## Dokumentation

- [docs/vercel.md](docs/vercel.md) – hosting och deploy
- [docs/v2/CONTRACTS.md](docs/v2/CONTRACTS.md) – V2-marknadsplatsens kontrakt och feature flags
- [docs/analytics-ga4.md](docs/analytics-ga4.md) – analys och samtycke
- [docs/verification/workshop-registration.md](docs/verification/workshop-registration.md) – verifiering av verkstadsregistrering
- [content/editorial/README.md](content/editorial/README.md) – redaktionens arbetsflöde
