# Updro

Sveriges marknadsplats för digitala uppdrag. Beskriv ditt projekt och få upp till fem offerter från kvalitetssäkrade digitala byråer inom 24 timmar.

**Live:** https://updro.se

## Tjänster

Updro matchar köpare och digitala byråer inom:

- Webbutveckling och hemsidor
- SEO och innehållsmarknadsföring
- Google Ads och Meta Ads
- E-handel (Shopify, WooCommerce, Centra)
- Apputveckling
- Digital marknadsföring
- Design och varumärke

## Affärsmodell

- **Köpare:** Helt gratis. Publicerar uppdrag, jämför offerter, väljer byrå.
- **Byråer:** 119 kr per upplåst lead, eller månadskort 1 995 kr/mån för obegränsad åtkomst. 7 dagars gratis premium-trial.

## Tech stack

- **Frontend:** React 18 + TypeScript, Vite 5, Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (Supabase) – Postgres, Auth, Edge Functions, Storage
- **Betalningar:** Stripe (subscriptions + one-time leads)
- **E-post:** Resend via auth-email-hook Edge Function
- **AI:** Lovable AI Gateway (Gemini 2.5 / GPT-5) för artikelgenerering
- **Hosting:** Lovable
- **Paketmanager:** Bun. Använd `bun.lock` som enda låsfil.

## SEO-strategi

Updro använder programmatisk SEO för tjänster, städer, artiklar, verktyg och jämförelsesidor. SEO-routes ägs centralt i `src/lib/seoStatic.ts`.

Viktiga publika sidtyper:

- Startsida
- Tjänste-/pillar-sidor och underliggande tjänstesidor
- Stadssidor
- Stad × tjänst-sidor med kvalitetskontroll
- Artikelhubb och artikelsidor
- Verktygssidor
- Jämförelsesidor

### Integrerad SEO-build

`bun run build` kör en vanlig Vite-build och därefter den integrerade SEO-generatorn i `vite.config.ts`.

Builden gör följande automatiskt:

1. Skapar unik HTML per SEO-route i `dist/<route>/index.html`.
2. Skriver unik `<title>`, description, canonical, robots, OG/Twitter och JSON-LD i HTML-output.
3. Lägger crawlbara interna länkar i HTML-fallbacken.
4. Genererar `sitemap.xml`, `sitemap-index.xml` och sektionssitemaps.
5. Exkluderar privata och svaga/noindex-sidor från sitemap.

Det finns inte längre något krav på `react-snap`, Chromium eller ett manuellt prerender-steg för viktiga SEO-sidor. Den robusta fallbacken är SSG-liknande HTML som skapas i ordinarie produktionsbuild.

### Indexerbara sidor

Indexerbara publika sidor hämtas från `getIndexableSeoRoutes()` i `src/lib/seoStatic.ts`. De får:

- Unik `<title>`
- Unik `<meta name="description">`
- Självrefererande canonical
- `robots: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
- OG/Twitter-metadata
- JSON-LD för Organization, WebSite, WebPage och FAQPage där FAQ finns
- Internlänkar i HTML-output

### Noindex-sidor

Följande sidtyper ska inte indexeras:

- `/admin` och alla admin-undersidor
- `/dashboard` och alla dashboard-undersidor
- `/logga-in`
- `/registrera`
- `/registrera/byra`
- `/aterstall-losenord`
- `/landing` och `/landing/byra`
- Stad × tjänst-sidor som inte klarar kvalitetsregeln i `shouldIndexCityService()`

Svaga programmatic-sidor får `noindex, nofollow` i statisk HTML och skyddas även klient-side via `NoindexGuard` i `src/App.tsx` så att React-mount inte råkar skriva tillbaka `index`.

### Kvalitetsregel för stad × tjänst

Stad × tjänst-sidor indexeras bara när:

- staden har tillräcklig lokal kontext,
- tjänsten har tillräckligt djup beskrivning,
- kombinationen tillhör en prioriterad stad eller en prioriterad tjänst.

Målet är färre starka indexerade sidor i stället för många tunna, generiska sidor.

### Sitemap och robots

`public/robots.txt` pekar på primär sitemap-index:

```txt
Sitemap: https://updro.se/sitemap-index.xml
```

Builden genererar också `sitemap.xml` som flat fallback, men `robots.txt` annonserar bara sitemap-index för att undvika dubbla signaler.

Sektionssitemaps:

- `sitemap-main.xml`
- `sitemap-cities.xml`
- `sitemap-articles.xml`
- `sitemap-tools.xml`
- `sitemap-comparisons.xml`

## Utveckling

```bash
bun install
bun run dev
```

Kräver Node 20+ och Bun. Miljövariabler för Supabase finns i `.env` och hanteras automatiskt av Lovable Cloud.

## Build

```bash
bun run build
```

Detta är samma build som ska användas lokalt och i deploy. Den genererar både app-bundlen och SEO-output.

## Lokal SEO-verifiering

```bash
bun run seo:verify
bun run preview
```

Kontrollera därefter exempelvis:

- `/`
- `/webbutveckling`
- `/stader/stockholm`
- `/byraer/stockholm/seo`
- `/artiklar`
- `/verktyg`
- `/jamfor`
- `/sitemap-index.xml`
- `/sitemap.xml`

Verifiera i sidkällan att title, description, canonical, robots och JSON-LD finns direkt i HTML.

## Test

```bash
bun run test
```

## Kontakt

[info@auroramedia.se](mailto:info@auroramedia.se)

Updro drivs av **Aurora Media AB**.
