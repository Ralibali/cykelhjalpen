# Lanseringsrevision Cykelhjälpen

## 1. Redo att ta emot betalande kunder idag?
**Nej – inte för verkstadsrekrytering.** Kundflödet (bokning/Stripe/orderbekräftelse) ser produktionsklart ut på ytan, men outreach-modulen som just byggts har flera hårda buggar som gör den olämplig att köra skarpt. Se blockerare nedan.

## 2. Betyg: **6 / 10**
Kundresa + Stripe + RLS ser solid ut. Outreach-modulen drar ner betyget kraftigt: den lovar funktioner som inte fungerar (edit av body, retry, one-click unsubscribe) och kan orsaka juridiska/deliverability-problem.

## 3. Blockerare (måste fixas före första skarpa mejl)

### B1. Redigerad brödtext skickas ALDRIG
`prospect-send-outreach/index.ts` bygger alltid `draft = buildEmailDraft(prospect)` och skickar `draft.text` / `draft.html`. Endast `activity.subject` respekteras. Adminens `update_draft` som skriver till `activity.message` är därför en kosmetisk illusion — det som går ut är alltid AI-mallens standardtext. Antingen: skicka `activity.message` (och rendera egen HTML från den), eller ta bort redigeringsmöjligheten i UI.

### B2. Retry efter "failed" är omöjligt
Låsuppdateringen kräver `.eq('status','approved')`. När ett utskick har satts till `failed` går det inte att prova igen utan att manuellt sätta status tillbaka till `approved` i DB. Antingen tillåt `.in('status', ['approved','failed'])` i låset, eller lägg till en "återuppta"-action.

### B3. Daglig sändgräns är race-känslig
`OUTREACH_DAILY_CAP=20` kontrolleras med SELECT COUNT följt av UPDATE. Vid två parallella admin-klick kan båda passera. Behöver antingen `SELECT ... FOR UPDATE` mot en counter-rad, en dedikerad `daily_send_counters`-tabell med unique constraint, eller en advisory lock (`pg_advisory_xact_lock`) runt kontroll+insert.

### B4. notification_events-insert är brutet
Koden skriver `sent_at` men kolumnen heter `last_attempt_at` (schemat har inte `sent_at`). Insertet sväljs av `.catch(() => null)` så sändning fungerar, men spårbarheten är noll. Behöver fältmatch + `last_attempt_at: sentAt, attempts: 1`.

### B5. One-click unsubscribe är INTE RFC 8058-kompatibel
Headern `List-Unsubscribe-Post: List-Unsubscribe=One-Click` sätts, men `prospect-unsubscribe` accepterar bara `application/json`-body `{token}`. RFC 8058 kräver att endpointen tar en `POST` med `Content-Type: application/x-www-form-urlencoded` och body `List-Unsubscribe=One-Click`, utan token i body — tokenen sitter i URL:en. Nuvarande implementering läser bara `?token=` på GET, inte på POST. Gmail/Yahoo one-click kommer misslyckas → risk för spam-klassning.

### B6. Unsubscribe-endpoint är JWT-skyddad
Frontenden skickar `apikey` + `Authorization: Bearer <ANON>`. RFC 8058 skickar INGEN nyckel. `supabase/config.toml` måste ha `verify_jwt = false` för `prospect-unsubscribe`. Verifiera; annars blockerar Supabase-gatewayen mejlklienters POST.

### B7. Prospekt-URL i unsubscribe-mejl vs. edge function URL
`unsubscribeUrl` pekar på `https://cykelhjalpen.se/avregistrera/<token>` (frontend-sida) medan `List-Unsubscribe`-headern måste peka på en URL som svarar direkt på POST utan mänsklig interaktion. Frontend-SPA kan inte servera POST → posthanterare behöver peka på edge function-URL i headern.

## 4. Viktiga icke-blockerande förbättringar
- **Reply-To:** verifiera att `info@cykelhjalpen.se` verkligen tar emot inkommande hos Simply (inte bara Resend-sending). Ingen kod-check möjlig; kräver manuellt sändningstest till egen adress.
- Lägg `Precedence: bulk` och `Auto-Submitted: auto-generated` bara om det verkligen är bulk — här är det 1-till-1, låt bli.
- Dagskvot 20/dygn är hårt kodad — flytta till admin-inställning.
- `notification_events` visas i /admin men får aldrig outreach-rader eftersom insertet är brutet (B4).
- Lägg `bounced`/`complained`-status i outreach_activities + webhook från Resend för suppression-lista.
- Publik cache av `resend-domain-status` (nu queras varje gång admin öppnar sidan).
- Test-täckning: inga tester finns för outreach-funktionerna.
- Turnstile finns på bokning — verifiera att `TURNSTILE_SECRET_KEY` faktiskt valideras server-side (inte bara token skickas).
- CookieConsent-gate för GA4/Ads: verifiera att script inte laddas före consent.

## 5. Verifierat vs. antaget

**Verifierat via kod/DB:**
- Resend-domän `cykelhjalpen.se` = verified, sending enabled (curl-check tidigare tur).
- B1–B4 verifierade genom att läsa `prospect-send-outreach/index.ts`, `_shared/outreach.ts`, `prospect-action/index.ts` och migration `20260712214212`.
- RLS/GRANTs finns på `notification_events`, `outreach_activities`, `workshop_prospects`.
- Unsubscribe-route registrerad på `/avregistrera/:token` i `App.tsx`.
- Suppression-triggern `sync_prospect_suppression` skriver till `contact_suppression`.

**Ej verifierat (antaget):**
- Att Simply-mejlkorgen `info@cykelhjalpen.se` faktiskt tar emot (kräver skarpt test).
- Att Stripe-webhook-signaturer valideras korrekt i `stripe-webhook-bike` (inte läst i denna revision).
- End-to-end kundresa: startsida → bokning → Stripe → orderbekräftelse (inte klickad igenom i preview).
- Att build/typecheck/vitest passerar (inte körda — endast läskontroll enligt uppgift).
- Mobil-layout av kundflödet (inga screenshots tagna).
- Att `verify_jwt = false` är satt för `prospect-unsubscribe` i config.toml.
- Att auth-email-hook faktiskt levererar bekräftelsemejl via Resend (domän verifierad, men flöde ej testat).
- SEO-sidor / juridiska sidor / kontaktflöde granskades inte i djup.

## Rekommendation
Håll skarpa outreach-utskick pausade tills B1, B5, B6, B7 är åtgärdade. B2–B4 kan gå ut samma release. Kundflödet (bokning/betalning) kan sannolikt köras skarpt men bör verifieras end-to-end med ett riktigt testköp innan lansering.

Vill du att jag går vidare och åtgärdar B1–B7 i build mode?
