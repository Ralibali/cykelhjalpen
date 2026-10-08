# Granskning av nya startsidor – 2026-10-08

Arbetet finns på `design/homepage-geist-20261008` i respektive repository. Ingen merge eller produktionspublicering har gjorts.

## Ändrat

Mobilanpassade startsidor med Geist 400/500/600, gemensamma färger och mått, riktiga foton, nya texter, kort, numrerade steg och utfällbara frågor. Svenska och befintliga engelska ingångar fungerar. Bilderna har responsiva AVIF-varianter och typsnitt från Google Fonts serveras lokalt.

Befintliga formulär, kalkylator, demokonto, språkbyte, inloggning och navigering behålls. Cookieinställningar och den extra mobila demoknappen ligger vid sidfoten så att de inte täcker innehållet. Hero skickas också i första HTML-svaret. På Aurora laddas startsidan direkt och inloggade layouter och formulär efter behov.

## Bevarat och kontrollerat

Title, description, canonical, schema.org, övriga befintliga SEO-taggar, route-definitioner, analytics-implementation och backend är oförändrade. Befintliga FAQ-svar finns kvar under en extra utfällbar del för att motsvara det bevarade FAQ-schemat.

Webbläsarkontrollen omfattar 390 och 1440 px, synliga klickytor minst 44 px, rätt typsnitt, fungerande bilder, inga JavaScript-fel och ingen horisontell överströmning. Flödeskontrollen omfattar ärendeingång, felval, stadssidor, verkstadssida, språkbyte, mobilmenyer, demobokning, kalkylator och /en/book. Formulärens POST-svar simulerades; inga ärenden eller mejl skickades.

## Lighthouse

Lokal produktionsbuild, Lighthouse standardprofil för mobil och desktop, kall webbläsarprofil, komprimerade statiska filer. Inga analytics-resurser blockerades för mätningen. Mobil redovisas som median av tre körningar; desktop som en körning. Mobilresultaten varierar med den delade körmiljön. Rapporterna är en kontroll före publicering, inte ett mätvärde från de befintliga livesajterna.

| Sajt | Profil | Performance | Accessibility |
| --- | --- | ---: | ---: |
| cykelhjalpen | mobile | 90 | 100 |
| cykelhjalpen | desktop | 100 | 100 |
| auroratransport | mobile | 94 | 100 |
| auroratransport | desktop | 100 | 100 |

Samtliga mobilkörningar: cykelhjalpen: 86, 90, 93; auroratransport: 94, 80, 94. Alla fick Accessibility 100.

## Kodkontroller

- Cykelhjälpen: typecheck, lint utan fel, 57 testfiler / 624 tester godkända och produktionsbuild godkänd. Testerna kördes med en worker och 15 sekunders tidsgräns för att undvika den delade miljöns timeout vid parallell belastning. Befintliga lintvarningar kvarstår.
- Aurora: hela `npm run validate` godkänd: typecheck, lint utan fel, 64 testfiler / 387 tester, 67 PostgreSQL-kontroller och produktionsbuild. En befintlig lintvarning kvarstår.
- `git diff --check` godkänd i båda projekten.

## Att granska före publicering

Auroras bevarade FAQ/schema anger en engångsavgift på 3 500 kr för setup och onboarding. Den efterfrågade nya prisrutan säger ”Ett pris. 449 kr i månaden.” Uppgifterna motsäger varandra. Den befintliga avgiften, dess schema och betalningslogik har inte ändrats. Detta behöver avgöras innan publicering.

Auroras valda lagerfoto visar parkerade lastbilar i lågt kvällsljus. Det matchar inte exakt briefens kombination av lastbilar, skåpbil och gryning på en åkerigård. Bilden är ett granskningsförslag. Fotokällor och licenser finns i `homepage-design-assets.md`.
