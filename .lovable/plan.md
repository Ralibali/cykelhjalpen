## Översikt

Bygga om Updro till **Cykelhjälpen.se** – en lokal leadplattform för cykelreparation i Linköping. Återanvänder befintlig arkitektur (React, Supabase, Stripe, admin- och dashboardflöden) men inför nytt domänspråk, nya tabeller, nytt formulär och ny SEO.

**Viktigt:** Detta är en stor MVP. Jag föreslår att vi bygger den i **fyra etapper** så att vi kan validera varje steg innan nästa. Att försöka göra allt i en enda runda riskerar buildfel, halvfärdiga flöden och svår felsökning.

---

## Etapp 1 – Grund: databas, branding, startsida, formulär

1. **Databasmigration** (ny separat schema, rör inte updro-tabellerna):
   - `bike_repair_requests`, `bike_request_images`, `workshops`, `workshop_responses`, `lead_charges` enligt spec
   - RLS:
     - Anonyma kan `INSERT` på `bike_repair_requests` och `bike_request_images`
     - Endast admin kan `SELECT` kontaktuppgifter (separat vy `public_bike_requests` utan email/telefon för approved workshops)
     - Workshops ser bara egna `responses` och `charges`
     - Trigger som stänger ärende efter 5 paid responses (`status = closed_for_responses`)
   - Storage bucket `bike-images` (publik läsning, anon insert)

2. **Branding-byte**:
   - Logo, favicon, sidtitel, navbar → "Cykelhjälpen"
   - Färgpalett behålls (Indigo) men accent kan justeras lätt
   - Footer: nytt företagsnamn placeholder, behåll Aurora Media om inget annat anges

3. **Ny startsida** (`/`):
   - Hero: H1 "Få prisförslag från cykelverkstäder i Linköping", CTA "Beskriv ditt cykelproblem"
   - Tre-stegs-sektion
   - "Gratis för dig som cyklar"-block
   - Trust-sektion (antal anslutna verkstäder, snittsvarstid)
   - FAQ
   - Behåller framer-motion-animationerna från befintlig hero

4. **Reparationsformulär** (`/skicka-arende`):
   - Bygger om `ProjectWizard` till `BikeRequestWizard`
   - Steg 1: cykeltyp + reparationskategori
   - Steg 2: beskrivning + bilduppladdning (max 5, till `bike-images` bucket)
   - Steg 3: postnr, område, urgency, hämtning/inlämning
   - Steg 4: kontaktuppgifter + GDPR-consent
   - Ingen inloggning krävs
   - Tackskärm med ärendenr

---

## Etapp 2 – Verkstadsflöde + admin

1. **Auth för verkstäder** (`/registrera/verkstad`, `/logga-in`):
   - Email + lösenord (behåller befintligt auth-email-hook, byter copy)
   - Vid signup: skapa `workshops`-rad med `approved=false`
   - Maila admin om ny ansökan

2. **Verkstadsdashboard** (ersätter supplier-dashboard):
   - `/dashboard/verkstad` – översikt (öppna ärenden, mina svar, intäkter)
   - `/dashboard/verkstad/arenden` – lista relevanta ärenden, kontaktuppgifter maskerade
   - `/dashboard/verkstad/arenden/:id` – detalj + "Skapa svar"-CTA
   - `/dashboard/verkstad/svar` – mina prisförslag
   - `/dashboard/verkstad/fakturering` – Stripe-historik (lead_charges)
   - `/dashboard/verkstad/profil` – företagsinfo, områden, tjänster

3. **Admin** (utöka befintlig admin):
   - `/admin/arenden`, `/admin/verkstader`, `/admin/svar`, `/admin/betalningar`
   - Godkänn/neka verkstad
   - Stäng spam-ärenden
   - Intäktsöversikt (antal paid × 50 kr)
   - Behåller befintlig admin-layout

---

## Etapp 3 – Betalflöde

1. **Edge Function `create-workshop-response-payment`**:
   - Tar `request_id` + draft-data
   - Validerar: workshop approved, < 5 paid responses, inte redan svarat
   - Skapar `workshop_responses` (status=draft) + `lead_charges` (pending)
   - Stripe Checkout Session 50 kr (engångsbetalning)
   - Returnerar `checkout_url`

2. **Edge Function `stripe-webhook-bike`** (separat från updros webhook):
   - På `checkout.session.completed`:
     - `lead_charges.status = paid`
     - `workshop_responses.paid = true, status = sent`
     - Om 5 sent → `bike_repair_requests.status = closed_for_responses`
     - Skicka mail till kund via `send-transactional-email` (Resend)

3. **Kundens vy** (`/arende/:token`):
   - Token-baserad länk (skickas via mail)
   - Visar alla mottagna prisförslag
   - Verkstadens kontaktuppgifter visas här

---

## Etapp 4 – SEO + GDPR + polish

1. **SEO-sidor** via befintlig SEO-generator i `vite.config.ts`:
   - 9 lokala sidor enligt spec (cykelverkstad-linkoping etc.) + `/for-cykelverkstader` (B2B-landningssida)
   - Unik title/desc, lokal text, FAQ, LocalBusiness JSON-LD, intern länkning
   - Uppdatera `seoStatic.ts` och `sitemap.xml`

2. **GDPR**:
   - Consent-checkbox i formuläret
   - Uppdatera `/integritet` och `/villkor` med Cykelhjälpen-specifik text

3. **Mobilkvalitet**:
   - Verifiera formulärsteg på mobil
   - Verifiera dashboard-tabeller (befintlig horizontal scroll-pattern)

4. **Build & lint**:
   - `bun run build`, fix alla TS-fel

---

## Tekniska detaljer

- **Updro-koden behålls**: Inga befintliga tabeller/rutter raderas. Cykelhjälpen körs på samma kodbas men med nya routes och egen domänlogik. Startsidan `/` byts dock ut – om båda produkterna ska samexistera långsiktigt behöver vi diskutera multi-brand-setup separat.
- **Pris i öre**: `lead_charges.amount = 5000` (= 50 kr). Stripe-belopp i öre.
- **Anonym insert**: Använder `anon`-rollen + RLS `WITH CHECK (true)` på `bike_repair_requests`. Token genereras server-side och returneras till kunden.
- **Maskning av kontaktuppgifter**: Skapa SECURITY DEFINER-vy `bike_requests_for_workshops` som exkluderar `customer_email`/`customer_phone` tills workshop har en `paid` response på det ärendet.
- **Edge Functions**: Befintliga Stripe-funktioner (`create-checkout`, webhook) lämnas orörda. Nya funktioner skapas med `-bike`-suffix.

---

## Frågor innan vi börjar

1. **Git-branch/PR**: Lovable arbetar inte med branches/PRs på samma sätt som GitHub. Jag bygger direkt på huvudprojektet och du kan publicera när du är nöjd. Är det OK?
2. **Ska Updro-startsidan finnas kvar någonstans** (t.ex. `/updro`) eller ersätts den helt?
3. **Stripe**: Du har redan Stripe inkopplat för Updro. Jag återanvänder samma Stripe-konto med en ny produkt/pris för 50 kr-leaden. OK?
4. **Bekräftar du Etapp 1 som första leverans?** Jag levererar databas + startsida + formulär först, vi verifierar att det fungerar end-to-end, sedan kör vi Etapp 2.
