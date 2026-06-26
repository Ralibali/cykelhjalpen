# Marknadsplan för Cykelhjälpens fyra städer

Cykelhjälpen är aktivt uppbyggd för Linköping, Norrköping, Uppsala och Lund. Varje stad ska ha en egen landningssida, egna anslutna verkstäder, egna kampanjer och separat uppföljning.

## Mål per stad

- Minst 5 godkända och aktiva verkstäder.
- Minst 80 procent av publicerade kundärenden får minst ett svar.
- Minst 1,5 skickade offerter per publicerat ärende.
- Första svar inom 6 arbetstimmar i median.
- Kostnad per komplett kundärende lägre än intäkt per ärende.

## Städernas landningssidor

- Linköping: `/cykelverkstad-linkoping`
- Norrköping: `/cykelverkstad-norrkoping`
- Uppsala: `/cykelverkstad-uppsala`
- Lund: `/cykelverkstad-lund`

Alla annonser, QR-koder och partnerlänkar ska länka till rätt stadssida eller direkt till formuläret med förvald stad.

Exempel:

`https://cykelhjalpen.se/skicka-arende?stad=Uppsala&utm_source=partner&utm_medium=qr&utm_campaign=uppsala_launch&utm_content=verkstadsnamn`

## Verkstadsrekrytering

Bygg en separat kontaktlista per stad med cykelverkstäder, sportbutiker med verkstad och mobila reparatörer.

### Första kontakt via mejl

**Ämne:** Fler lokala cykelkunder utan månadsavgift

Hej!

Jag driver Cykelhjälpen, en tjänst där personer i er stad beskriver sitt cykelproblem och anslutna verkstäder själva väljer vilka ärenden de vill lämna prisförslag på.

Det kostar inget att registrera verkstaden och det finns ingen månadsavgift. Ni ser ärendet först och betalar endast när ni väljer att skicka en offert till kunden.

Vi söker nu lokala verkstäder i Linköping, Norrköping, Uppsala och Lund.

Läs mer och registrera er här:
https://cykelhjalpen.se/for-cykelverkstader

Vänliga hälsningar,
Cykelhjälpen
info@cykelhjalpen.se

### Kort telefonöppning

“Hej, jag heter Christoffer och driver Cykelhjälpen. Personer i er stad skickar in konkreta cykelproblem och verkstäderna väljer själva vilka jobb de vill svara på. Det finns ingen månadsavgift. Vem hos er kan jag skicka informationen till?”

## Lokala kundkanaler

- QR-kort hos anslutna verkstäder.
- Studentbostäder och campusnära verksamheter.
- Arbetsgivare med många cykelpendlare.
- Bostadsrättsföreningar och hyresvärdar.
- Lokala Facebookgrupper där reglerna tillåter relevanta företagsposter.
- Cykelföreningar, lopp och motionsgrupper.
- Verkstädernas webbplatser, nyhetsbrev och sociala medier.

## Google Ads

Skapa en separat kampanj eller kampanjgrupp per stad. Blanda inte städerna i samma annonstext eller landningssida.

### Sökord per stad

- `[cykelverkstad STAD]`
- `“cykelreparation STAD”`
- `[laga punktering STAD]`
- `“cykelservice STAD”`
- `“elcykel reparation STAD”`
- `“cykelverkstad nära mig”`

### Negativa sökord

- jobb
- utbildning
- lön
- begagnad
- köpa cykel
- cykelbutik online
- reservdelar
- gör det själv
- youtube

### Annonsförslag

**Rubriker**

- Trasig cykel i STAD?
- Jämför lokala cykelverkstäder
- Få prisförslag kostnadsfritt
- Ingen registrering krävs
- Jämför pris och möjlig tid

**Beskrivning**

Beskriv cykelproblemet på cirka två minuter. Anslutna verkstäder i STAD kan svara med pris och möjlig tid. Gratis och utan köpkrav.

## Mätning per stad

Följ följande händelser med stad i metadata:

- `home_city_clicked`
- `city_request_cta_clicked`
- `bike_request_started`
- `bike_request_step_completed`
- `bike_request_submit_clicked`
- `bike_request_submitted`
- `bike_request_submission_failed`
- `workshop_registration_submit_clicked`
- `workshop_registration_completed`
- `workshop_registration_failed`

Följ dessutom per stad:

- antal godkända verkstäder
- antal inkomna och godkända kundärenden
- andel ärenden som får offert
- genomsnittligt antal offerter per ärende
- tid till första offert
- intäkt per ärende
- kostnad per komplett ärende

## Prioritering

Alla fyra städer ska vara synliga och möjliga att använda. Marknadsbudgeten ska däremot styras till de städer där det finns tillräckligt många aktiva verkstäder för att kunderna ska få svar. En stad med låg offerttäckning ska prioriteras för verkstadsrekrytering före mer kundannonsering.
