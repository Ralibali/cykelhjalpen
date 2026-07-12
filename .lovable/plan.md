# Cykelhjälpen – förbättringsplan

Fokus: säkerställa att koden och backend är i synk, stärka notifieringar, snygga till adminflöden och putsa verkstads‑ och kund‑UX. Inga externa utskick eller Stripe‑anrop görs som del av planen.

## 1. Kritiskt: aktivera väntande backend-ändringar

Två migrationsfiler ligger i repot men är **inte körda** i databasen. Koden anropar redan det som saknas, så delar av flödet är brutet i produktion.

**Saknas i DB (finns i filer):**
- `enforce_bike_response_paid_limit` trigger (fil `20260712152000_...`) – ska hindra att fler än fem verkstäder blir betalda på samma ärende parallellt. Koden fångar redan felet `bike_request_full` i `stripe-webhook-bike` och `create-bike-response-payment`.
- RPC `consume_free_lead_for_response(uuid, uuid)` (fil `20260712160000_...`) – anropas i `create-bike-response-payment/index.ts:89`. Utan den kraschar gratis‑lead‑flödet.
- Unika index: `stripe_events_stripe_event_id_unique`, `lead_charges_one_pending_per_response` (idempotens för Stripe‑webhooks och en pending Checkout per svar).
- Trigger `protect_workshop_sensitive_fields_trigger` (låser `approved`, `free_leads_remaining`, `stripe_customer_id`, `email`, `user_id` och stad efter godkännande).

**Åtgärd:** kör om båda migrationsfilerna som en samlad migration via migrationsverktyget så att triggers, index och RPC blir aktiva. Ingen SQL‑ändring behövs — endast omkörning av befintliga statements idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`).

## 2. Notifieringar (in‑app + befintliga mailmallar)

Fyll luckor i `notifications`-tabellen så både verkstad och kund får realtidsuppdateringar i klockikonen. Ingen ny mail skickas i denna plan – endast rader i `notifications` (som redan har realtidskanal via `NotificationBell`).

- **Verkstad:** ny notis när ett ärende godkänts i deras stad (skapas i `approve-bike-request` bredvid befintlig mailfunktion, men bara `notifications`‑insert).
- **Verkstad:** ny notis när ärendet blir fullt (`closed_for_responses`) så de vet att slotsen är slut.
- **Kund:** notis när första verkstadssvaret kommer in (via `stripe-webhook-bike` efter lyckad betalning eller efter gratis‑lead‑förbrukning). Länk till `/mitt-arende/<token>`.
- **Admin:** notis till alla `profiles.role = 'admin'` när nytt ärende skapas som `pending_approval` (nu missas dessa om admin inte pollar).

## 3. Adminflöden

- **`CykelAdminOverview`:** lägg till badge på "Uppdatera"-knappen som visar antal nya pending sedan senaste refresh (via realtid på `bike_repair_requests`).
- **Ärendekort:** visa telefonnummer/e-post och `city` konsekvent, samt en "Kopiera kontakt"‑knapp.
- **Avvisa‑dialog:** kräv minst 10 tecken i `rejectReason` (skickas till kund och behöver vara meningsfullt).
- **Verkstadslista:** visa `city` och antal levererade offerter per verkstad i sidopanelen (join på `workshop_responses` med `paid=true`).
- **Länk till marketplace health** direkt från overview‑sidan för snabb felsökning.
- **Stripe‑logg (`AdminStripeLog`):** filter för `type = checkout.session.completed` och färgad status så retries syns direkt.

## 4. Verkstads-UX (`WorkshopRequests.tsx`)

- Visa tydlig **"Ärendet är fullt"**-state när `bike_request_full` returneras från edge function, med länk tillbaka till listan.
- Kort med **"Gratis-leads kvar"** överst, samt räknare "X av 5 slots kvar" per ärende innan man öppnar checkout.
- När polling efter `?paid=true` misslyckas efter 15 s, erbjud knapp "Kontrollera igen" i stället för endast varningstoast.
- Disabla "Skicka"-knappen medan formuläret valideras för att undvika dubbla submits.

## 5. Kund-UX (`CustomerResponses.tsx`, `BikeRequestWizard.tsx`)

- Wizard: visa progress‑stapel (steg X av Y) och behåll ifyllda värden i `sessionStorage` så att en oavsiktlig refresh inte tömmer formuläret.
- Efter submit: visa tydlig "vi granskar inom 24 h"-panel med kontakt till `info@cykelhjalpen.se` (i stället för vag success‑text).
- `CustomerResponses`: sortera svar med lägst pris först och markera "Bästa pris" / "Snabbast leverans" som semantiska badges.
- Lägg till `noindex` på token‑sidorna (`/mitt-arende/:token`) om det inte redan är satt.

## 6. Produktkvalitet / mindre

- Byt slumpade `toast.error(error.message)` mot översatta meddelanden i verkstads‑ och kundflöden (svensk copy, "Något gick fel. Försök igen." som fallback).
- Lägg till `<title>` och `<meta description>` per cykelhjälpen‑sida där det saknas (kolla `CykelhjalpenIndex`, `ForVerkstaderPage`, `RegisterWorkshopPage`).
- Sätt `aria-label` på klockan i `NotificationBell` (a11y‑CI klagar annars).

## Tekniska detaljer

- Alla nya `notifications`‑rader använder befintligt schema: `user_id, type, title, message, link, is_read=false`.
- Realtid finns redan i `NotificationBell` via `postgres_changes INSERT`.
- Ingen ändring av Stripe‑nycklar, webhook‑endpoint eller mailtemplates.
- Migration i steg 1 använder endast idempotenta statements – säker att köra om.

## Utanför scope

- Inga faktiska mail eller SMS skickas.
- Ingen ändring av prissättning eller `LEAD_FEE_ORE`.
- Ingen ändring av Stripe‑konfiguration (redan hanterad av användaren).
