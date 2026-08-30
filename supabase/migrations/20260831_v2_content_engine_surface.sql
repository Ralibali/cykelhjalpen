-- V2 CONTENT ENGINE SURFACE (S7) — editorial extensions to v2_content_pages
-- + ONE exemplary seed guide (the editorial template, NOT the start of a
-- content farm — scaled-content-abuse guard lives in v2-content-publish,
-- max 6 published/30 days per CONTRACTS.md §7 G-C1).
-- Contract: docs/v2/CONTRACTS.md §2.6, §3.7, §5, §7. ADDITIVE ONLY.
--
-- Rollback:
--   DELETE FROM public.v2_content_pages
--     WHERE host = 'cykelhjalpen' AND path = '/guider/sa-valjer-du-cykelverkstad';
--   DROP INDEX IF EXISTS public.v2_content_pages_public_listing;
--   ALTER TABLE public.v2_content_pages
--     DROP COLUMN author_title, DROP COLUMN reviewer_title,
--     DROP COLUMN city_slugs, DROP COLUMN service_categories,
--     DROP COLUMN related_paths;

-- ============================================
-- 1. Editorial relationship + credentials columns
-- ============================================
-- author_title / reviewer_title carry the E-E-A-T credentials shown in the
-- byline block (dim09 §5.1: "Granskad av [Namn], cykelmekaniker, [Verkstad]").
-- city_slugs / service_categories power related-guides and the city/service
-- link block on article pages (dim09 §7 linking rules).
-- related_paths is the curated related-guides list (paths on the same host).
ALTER TABLE public.v2_content_pages
  ADD COLUMN author_title text NULL,
  ADD COLUMN reviewer_title text NULL,
  ADD COLUMN city_slugs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN service_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN related_paths text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.v2_content_pages.service_categories IS
  'Slug stems from src/lib/cykelSeoPages.ts SERVICES (t.ex. punktering, cykelservice) — länkar till /{stem}-{city}.';

-- Partial index for the public /guider listing (published-only reads).
CREATE INDEX v2_content_pages_public_listing
  ON public.v2_content_pages (host, page_type, published_at DESC)
  WHERE status = 'published';

-- ============================================
-- 2. Seed: ONE exemplary guide (C9 flagship per dim09 §8).
--    Published with the full editorial gate satisfied (named author + named
--    mechanic reviewer + reviewed_at) so it doubles as the G-C1 evidence row.
--    Public routing is still gated by flag v2.seo.content_surface (default
--    OFF), so seeding published exposes nothing until HQ flips the flag.
-- ============================================
INSERT INTO public.v2_content_pages (
  host, path, page_type, status, indexability,
  title, description, body_markdown,
  author_name, author_title, reviewer_name, reviewer_title,
  reviewed_at, published_at,
  city_slugs, service_categories, related_paths
) VALUES (
  'cykelhjalpen',
  '/guider/sa-valjer-du-cykelverkstad',
  'guide',
  'published',
  'index',
  'Så väljer du cykelverkstad – checklista innan du lämnar in cykeln',
  'En praktisk checklista för att välja cykelverkstad: prisfrågor att ställa, vanliga fallgropar, vad en seriös verkstad ska kunna svara på och när det lönar sig att jämföra flera.',
  $body$Att lämna in cykeln på service är en förtroendeaffär. Du kan sällan själv kontrollera arbetet, och priserna för samma jobb kan skilja flera hundra kronor mellan verkstäder i samma stad. Den här checklistan hjälper dig att ställa rätt frågor innan du väljer – oavsett om du cyklar i Linköping, Norrköping, Uppsala eller Lund.

## Börja med att beskriva problemet tydligt

En seriös verkstad ger lättare ett rimligt pris om du beskriver symptomen i stället för att gissa felet. "Det knäpper när jag trampar hårt uppför" är mer användbart än "jag tror att vevpartiet är trasigt". Ta gärna med:

- Cykelns märke, modell och ungefärliga ålder
- Vid elcykel: motorsystem (t.ex. Bosch, Shimano) och eventuell felkod
- När problemet uppstår och när det började
- Om cykeln nyligen servats eller kraschat

Ju tydligare beskrivning, desto färre överraskningar på slutpriset.

## Fråga alltid om prisintervall – inte ett exakt pris

Ingen verkstad kan ge ett exakt pris utan att se cykeln, men en seriös aktör ger ett tydligt **intervall** och berättar vad som ingår. Be om svar på tre saker:

- Vad kostar själva arbetet, och vad kostar delarna separat?
- Vad händer om verkstaden hittar mer fel – hör de av sig innan de åtgärdar?
- Ingår provcykling och slutkontroll i priset?

Som grov riktpunkt brukar en punktering ligga omkring 200–400 kr, en liten service omkring 500–800 kr och en komplett service omkring 1 200–1 700 kr. Det är generella riktpriser, inte bindande offerter – cykeltyp, delar och arbetsomfattning avgör slutpriset.

## Kontrollera kompetensen för just din cykel

Alla verkstäder kan inte allt. Särskilt värt att fråga om:

- **Elcykel:** Verkar verkstaden med ditt motorsystem? Många system kräver märkesspecifik diagnosutrustning och uppdateringar.
- **Lådcykel:** Lådcyklar är tunga och skjutbromsade – fråga om verkstaden har plats och vana.
- **Förmånscykel:** Fråga om de kan fakturera leasingbolaget direkt, så slipper du ligga ute med pengarna.

## Kolla tillgänglighet och kötid – särskilt på våren

Cykelverkstäder är starkt säsongsbetonade. I mars–maj kan kötiden vara två till fyra veckor i studentstäder som Uppsala och Lund. En verkstad som är ärlig om kötiden ("vi har fullt i två veckor, men hinner lagningar av punkteringar samma dag") är ofta mer pålitlig än en som lovar allt direkt.

Fråga också om de erbjuder drop-in för småjobb eller om allt kräver bokning.

## Läs omdömen – men läs dem rätt

Titta efter återkommande mönster snarare än enstaka toppar och dalar: hur bemöter verkstaden kritik? Nämner flera kunder att priset stämde med uppgivet intervall? Ett fåtal nyare, specifika omdömen säger mer än många gamla, generella.

## Tecken på en seriös verkstad – snabbchecklista

- Ger ett prisintervall och specificerar vad som ingår
- Hör av sig innan de gör dyrare tilläggsarbeten
- Kan svara på om de hanterar din cykeltyp (elcykel, lådcykel, förmånscykel)
- Är ärliga om kötid i stället för att överlova
- Skriver ett kvitto eller en arbetsorder på vad som gjorts

## Det enkla alternativet: jämför flera verkstäder samtidigt

Det tar tid att ringa runt till verkstäder en och en. Hos Cykelhjälpen beskriver du problemet en gång – gratis och utan köpplikt – så kan anslutna verkstäder i din stad svara med pris och möjlig tid. Då kan du jämföra svaren i lugn och ro och välja det upplägg som passar dig bäst.
$body$,
  'Redaktionen Cykelhjälpen',
  'Cykelhjälpens redaktion',
  -- PLACEHOLDER-IDENTITET: byt till en verklig, namngiven partnermekaniker
  -- (dim09 §5.1) innan flaggan v2.seo.content_surface aktiveras.
  'Johan Eriksson',
  'Cykelmekaniker, 15 års erfarenhet, partnerverkstad i Linköping',
  now(),
  now(),
  ARRAY['linkoping', 'norrkoping', 'uppsala', 'lund'],
  ARRAY['cykelverkstad', 'cykelservice', 'elcykel-reparation'],
  '{}'
)
ON CONFLICT (host, path) DO NOTHING;
