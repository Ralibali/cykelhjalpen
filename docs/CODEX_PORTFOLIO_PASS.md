# Tåla blockerad lagring och återställ V2-typkontroller

6 september 2026. Utvecklingsförslag; inte publicerat.

När localStorage kastade SecurityError försökte felhanteringen använda samma blockerade lagring och kunde krascha sidan. Samtyckesläsningen faller nu tillbaka till avstängd analys, och besökaren kan stänga bannern även om valet inte kan sparas. Vid omladdning kan valet behöva göras igen.

Verifieringen upptäckte även att en omgenerering hade tagit bort V2-regionerna i databastyperna. Markörerna är återställda och projektets befintliga generator har återgenererat 24 tabeller, 4 enumtyper, 1 vy och 10 funktioner från versionshanterade SQL-filer. Det återställer typkontrollen och de tre befintliga paritetstesterna. Ett befintligt prefer-const-fel i previewlagring är också rättat. Detta är TypeScript-definitioner; inga SQL-migrationer eller produktionsdata har ändrats.

Verifiering: samtliga 566 tester i 46 filer, typkontroll, lint (0 fel, befintliga varningar) och produktionsbygge passerar. Regressionstestet för lagringsläsning fallerar mot gammal kod, och ett komponenttest verifierar att Endast nödvändiga stänger bannern med blockerad lagring. Normalt samtyckesval provat i lokal webbläsare.

