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

## Uppföljning inför main

Godkänd för main av användaren 8 oktober. Auroras prisruta och statiska startsida visar nu 449 kr/mån samt engångsavgiften 3 500 kr, exkl. moms. Befintlig debitering och FAQ/schema behålls. Kvällsfotot är ersatt av verkliga gryningsfoton: lastbilsdepå på desktop och skåpbilar vid garage på mobil. Cykelhjälpens senaste inloggningsfix på main har bevarats vid sammanslagningen.
