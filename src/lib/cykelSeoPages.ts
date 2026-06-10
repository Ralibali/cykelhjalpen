export interface CykelSeoPage {
  slug: string
  h1: string
  title: string
  description: string
  intro: string
  sections: { h2: string; body: string }[]
  faq: { q: string; a: string }[]
  ogImage?: string
  /** Markerar sidan som speciell — t.ex. prissida som renderar extra data */
  variant?: 'price-stats'
}

const lokalt = (omr: string, what: string) =>
  `Behöver du ${what} i ${omr}? Cykelhjälpen kopplar dig till lokala, anslutna cykelverkstäder i Linköping. Skicka ett kostnadsfritt ärende — du får upp till fem prisförslag inom ett dygn.`

const stadsdel = (namn: string, beskrivning: string): CykelSeoPage => ({
  slug: `cykelverkstad-${namn.toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o').replace(/\s+/g, '-')}-linkoping`,
  h1: `Cykelverkstad i ${namn}, Linköping`,
  title: `Cykelverkstad ${namn} Linköping — lokala offerter`,
  description: `Behöver du en cykelverkstad i ${namn}, Linköping? Skicka gratis ärende och få upp till fem prisförslag inom ett dygn.`,
  intro: lokalt(`${namn}, Linköping`, 'en cykelverkstad'),
  sections: [
    { h2: `Lokalt i ${namn}`, body: beskrivning },
    { h2: 'Vad kan en verkstad hjälpa till med?', body: 'Punktering, växeljustering, bromsservice, kedjebyte, helservice och elcykel-reparation är de vanligaste jobben. Lägg gärna en bild i ärendet så blir offerten mer exakt.' },
  ],
  faq: [
    { q: 'Hur snabbt får jag svar?', a: 'Oftast inom ett dygn på vardagar. Många verkstäder svarar samma dag.' },
    { q: 'Vad kostar det att skicka ärende?', a: 'Det är helt gratis. Verkstaden betalar en liten avgift för att lämna offert.' },
  ],
})

export const CYKEL_SEO_PAGES: CykelSeoPage[] = [
  {
    slug: 'cykelverkstad-linkoping',
    h1: 'Cykelverkstad i Linköping',
    title: 'Cykelverkstad Linköping — jämför lokala priser',
    description: 'Hitta en cykelverkstad i Linköping. Skicka gratis ärende och få upp till fem offerter på reparation, service eller punktering.',
    intro: lokalt('Linköping', 'en cykelverkstad'),
    sections: [
      { h2: 'Hur fungerar Cykelhjälpen?', body: 'Du beskriver felet på två minuter. Vi skickar ärendet till anslutna cykelverkstäder i Linköping som lämnar pris och tid. Du väljer själv vilken verkstad du vill anlita.' },
      { h2: 'Vad kostar det?', body: 'Det är helt gratis för dig som cyklist. Verkstaden betalar en liten avgift för att lämna offert.' },
      { h2: 'Vilka områden täcker ni?', body: 'Vi har verkstäder från Innerstaden och Vasastaden till Ryd, Vallastaden, Lambohov och Ekholmen.' },
    ],
    faq: [
      { q: 'Behöver jag konto?', a: 'Nej. Du skickar ärendet utan att registrera dig.' },
      { q: 'Hur snabbt får jag svar?', a: 'Oftast inom ett dygn, många verkstäder svarar samma dag.' },
    ],
  },
  {
    slug: 'cykelreparation-linkoping',
    h1: 'Cykelreparation i Linköping',
    title: 'Cykelreparation Linköping — boka via lokala verkstäder',
    description: 'Boka cykelreparation i Linköping. Beskriv felet och få offerter från lokala cykelverkstäder. Gratis och utan konto.',
    intro: lokalt('Linköping', 'cykelreparation'),
    sections: [
      { h2: 'Vanliga reparationer', body: 'Bromsar, växlar, kedja, vajrar, hjul, ekrar, däckbyte och komplett service. Lägg till bilder så får du en mer exakt offert.' },
      { h2: 'Pris för cykelreparation', body: 'En enklare punktering kostar oftast två till fyra hundra kronor. En komplett service ligger mellan sju hundra och tolv hundra kronor beroende på cykel.' },
    ],
    faq: [
      { q: 'Kan jag få cykeln hämtad?', a: 'Vissa verkstäder erbjuder hämtning. Markera det i formuläret så filtrerar vi rätt.' },
    ],
  },
  {
    slug: 'punktering-linkoping',
    h1: 'Punktering — hjälp i Linköping',
    title: 'Punktering Linköping — fixa cykeln samma dag',
    description: 'Punktering i Linköping? Skicka gratis ärende och få offert från en lokal cykelverkstad. Många fixar samma dag.',
    intro: lokalt('Linköping', 'hjälp med punktering'),
    sections: [
      { h2: 'Hur lång tid tar det?', body: 'En enkel punktering åtgärdas på en kvart. Räkna med en arbetsdag inklusive väntetid hos verkstaden.' },
      { h2: 'Vad kostar det?', body: 'Vanligtvis två till fyra hundra kronor inklusive ny slang.' },
    ],
    faq: [
      { q: 'Kan jag laga själv?', a: 'Ja, men en verkstad gör det snabbare och garanterar arbetet.' },
    ],
  },
  {
    slug: 'cykelservice-linkoping',
    h1: 'Cykelservice i Linköping',
    title: 'Cykelservice Linköping — pris, tid och lokala verkstäder',
    description: 'Beställ cykelservice i Linköping. Få offert från lokala verkstäder på liten eller komplett service.',
    intro: lokalt('Linköping', 'cykelservice'),
    sections: [
      { h2: 'Liten service', body: 'Genomgång, justering av växel och broms, kontroll av hjul. Pris cirka fem hundra till sju hundra kronor.' },
      { h2: 'Komplett service', body: 'Allt i liten service plus rengöring av drivlina, byte av vajrar och slitdelar vid behov. Pris cirka tolv hundra till sjutton hundra kronor.' },
    ],
    faq: [
      { q: 'Hur ofta behöver jag service?', a: 'En gång om året om du cyklar dagligen, annars vartannat år.' },
    ],
  },
  {
    slug: 'elcykel-reparation-linkoping',
    h1: 'Elcykel-reparation i Linköping',
    title: 'Elcykel reparation Linköping — verkstäder med rätt verktyg',
    description: 'Elcykel som krånglar i Linköping? Få offert från verkstäder med rätt verktyg för Bosch, Shimano Steps, Bafang m.fl.',
    intro: lokalt('Linköping', 'elcykel-reparation'),
    sections: [
      { h2: 'Vanliga problem', body: 'Display visar fel, motorn drar inte, batteriet håller kortare. Beskriv symptomen så får du rätt offert.' },
      { h2: 'Vilka motorer hanteras?', body: 'De flesta verkstäder är vana vid Bosch och Shimano Steps. Vissa servar även Bafang, Yamaha och Brose.' },
    ],
    faq: [
      { q: 'Kan jag byta batteri själv?', a: 'Tekniskt ja, men felaktig hantering kan orsaka brand. Låt en verkstad göra det.' },
    ],
  },
  {
    slug: 'cykelverkstad-innerstaden-linkoping',
    h1: 'Cykelverkstad i Innerstaden, Linköping',
    title: 'Cykelverkstad Innerstaden Linköping — lokal hjälp',
    description: 'Cykelverkstäder i Innerstaden Linköping. Skicka ärende och få lokala offerter på reparation och service.',
    intro: lokalt('Innerstaden, Linköping', 'en cykelverkstad'),
    sections: [
      { h2: 'Centralt läge', body: 'Många verkstäder ligger nära Stora torget, Domkyrkan och Resecentrum. Lämna in på vägen till jobbet.' },
    ],
    faq: [{ q: 'Drop-in?', a: 'Vissa verkstäder tar drop-in, andra bokar tid. Markera när du behöver hjälp i ärendet.' }],
  },
  {
    slug: 'cykelverkstad-ryd-linkoping',
    h1: 'Cykelverkstad i Ryd, Linköping',
    title: 'Cykelverkstad Ryd Linköping — för studenter och boende',
    description: 'Behöver du cykelverkstad i Ryd, Linköping? Få lokala offerter snabbt — perfekt för studenter på campus Valla.',
    intro: lokalt('Ryd, Linköping', 'en cykelverkstad'),
    sections: [
      { h2: 'Campus-nära', body: 'Ryd ligger granne med campus Valla. Många studenter cyklar dagligen, vilket gör snabb service viktigt.' },
    ],
    faq: [{ q: 'Studentpriser?', a: 'Vissa verkstäder erbjuder rabatt med Mecenat eller Studentkortet — fråga i offerten.' }],
  },
  {
    slug: 'cykelverkstad-vallastaden-linkoping',
    h1: 'Cykelverkstad i Vallastaden, Linköping',
    title: 'Cykelverkstad Vallastaden Linköping — lokala offerter',
    description: 'Cykelverkstäder nära Vallastaden i Linköping. Skicka gratis ärende och få offerter inom ett dygn.',
    intro: lokalt('Vallastaden, Linköping', 'en cykelverkstad'),
    sections: [
      { h2: 'Bostadsområdet med cykel-DNA', body: 'Vallastaden är byggt för cyklar och gångare. Här finns flera verkstäder och även mobila reparatörer.' },
    ],
    faq: [{ q: 'Kan jag få cykeln hämtad?', a: 'Ja, flera verkstäder kör hämtning i Vallastaden. Markera det i ärendet.' }],
  },
  {
    slug: 'mobil-cykelreparation-linkoping',
    h1: 'Mobil cykelreparation i Linköping',
    title: 'Mobil cykelreparation Linköping — verkstad på plats',
    description: 'Mobil cykelreparation i Linköping. Verkstaden kommer till dig — perfekt för punktering eller enklare service.',
    intro: lokalt('Linköping', 'mobil cykelreparation'),
    sections: [
      { h2: 'Hur fungerar det?', body: 'Du beskriver felet och adress. Mobila verkstäder lämnar offert med restidstillägg och tid på plats.' },
    ],
    faq: [{ q: 'Vad kan göras hemma?', a: 'Punktering, enklare bromsjustering, kedjebyte. Större jobb kräver verkstaden.' }],
  },

  // === Stadsdelar (nya) ===
  stadsdel('Lambohov', 'Lambohov ligger i sydvästra Linköping med många familjer och studentbostäder. Korta cykelvägar in mot centrum gör att en pålitlig verkstad nära är värdefullt.'),
  stadsdel('Ekholmen', 'Ekholmen är en lugn stadsdel söder om centrum. Här pendlar många till jobbet med cykel året runt — vintersäkring och bromsservice är vanliga jobb.'),
  stadsdel('Skäggetorp', 'Skäggetorp ligger i nordvästra Linköping. Området har stort cykelflöde till centrum och behov av snabb hjälp med vardagscyklar och elcyklar.'),
  stadsdel('Tannefors', 'Tannefors ligger öster om centrum, nära Stångån. Här finns både pendlare och fritidscyklister som behöver allt från punktering till helservice.'),
  stadsdel('Berga', 'Berga är ett etablerat bostadsområde i södra Linköping. En nära verkstad sparar tid när cykeln strejkar på vägen till skola eller jobb.'),
  stadsdel('Tallboda', 'Tallboda ligger nordost om centrum. Många cyklar längs Tinnerbäcken och behöver hjälp med vajrar, växlar och bromsar efter vintern.'),
  stadsdel('Ljungsbro', 'Ljungsbro ligger nordväst om Linköping med fina cykelleder vid Göta kanal. Hit kommer mobila verkstäder och centrala Linköping-verkstäder gärna.'),
  stadsdel('Sturefors', 'Sturefors ligger sydost om Linköping. Längre pendlingsavstånd gör en välservad cykel viktig — många väljer komplett service en gång per år.'),
  stadsdel('Malmslätt', 'Malmslätt ligger väster om Linköping. Cyklar används för både pendling och fritid — vanligt med både stadscyklar, racer och elcyklar.'),

  // === Problemtyper (nya) ===
  {
    slug: 'vaxeljustering-linkoping',
    h1: 'Växeljustering i Linköping',
    title: 'Växeljustering Linköping — pris och lokala verkstäder',
    description: 'Växlar som hoppar eller slirar? Få offert på växeljustering från cykelverkstäder i Linköping. Gratis och utan konto.',
    intro: lokalt('Linköping', 'hjälp med växeljustering'),
    sections: [
      { h2: 'Vad är felet oftast?', body: 'Felinställd bakväxel, sträckt vajer eller sliten kassett. En verkstad mäter slitage och justerar på 15 till 30 minuter.' },
      { h2: 'Vad kostar det?', body: 'En enklare justering ligger på två till fyra hundra kronor. Behöver vajer eller kassett bytas tillkommer det.' },
    ],
    faq: [{ q: 'Kan jag fortsätta cykla?', a: 'Korta sträckor ja, men slitaget på kedja och kassett ökar om växeln hoppar ofta.' }],
  },
  {
    slug: 'bromsservice-linkoping',
    h1: 'Bromsservice för cykel i Linköping',
    title: 'Bromsservice cykel Linköping — skivbroms och fälgbroms',
    description: 'Bromsservice för cykel i Linköping — byte av belägg, justering och luftning. Få offerter från lokala verkstäder.',
    intro: lokalt('Linköping', 'bromsservice för cykeln'),
    sections: [
      { h2: 'Skivbroms eller fälgbroms', body: 'För skivbroms byts belägg och vid behov luftas systemet. För fälgbroms byts bromsskor och vajer justeras.' },
      { h2: 'Pris', body: 'En enklare bromsservice ligger på två och en halv till fem hundra kronor. Luftning av hydraulisk skivbroms är ofta dyrare.' },
    ],
    faq: [{ q: 'Hur vet jag att det är dags?', a: 'Skrapljud, sämre bromsverkan eller en bromsspak som går nästan till styret är tecken på slitna belägg.' }],
  },
  {
    slug: 'kedjebyte-linkoping',
    h1: 'Kedjebyte på cykel i Linköping',
    title: 'Kedjebyte cykel Linköping — pris och tid',
    description: 'Sliten kedja? Få offert på kedjebyte från cykelverkstäder i Linköping. Verkstaden mäter slitage först.',
    intro: lokalt('Linköping', 'kedjebyte på cykeln'),
    sections: [
      { h2: 'När ska kedjan bytas?', body: 'En kedja byts oftast efter två till fem tusen kilometer beroende på cykling och underhåll. Slitmått används för säker bedömning.' },
      { h2: 'Pris', body: 'Kedjebyte inklusive kedja ligger oftast på tre till sex hundra kronor. Är kassetten också sliten byts båda samtidigt.' },
    ],
    faq: [{ q: 'Varför är det viktigt?', a: 'En sliten kedja sliter snabbt på kassett och drev — vänta för länge och hela drivlinan måste bytas.' }],
  },
  {
    slug: 'dackbyte-cykel-linkoping',
    h1: 'Däckbyte på cykel i Linköping',
    title: 'Däckbyte cykel Linköping — däck och slang',
    description: 'Däckbyte på cykel i Linköping — nya däck eller slang. Få offert från lokala verkstäder via Cykelhjälpen.',
    intro: lokalt('Linköping', 'däckbyte på cykeln'),
    sections: [
      { h2: 'Däck eller slang?', body: 'Slang byts vid punktering. Däck byts när mönstret är slitet, sidoslitage syns eller efter punkteringar i samma område.' },
      { h2: 'Pris', body: 'Däckbyte per hjul ligger oftast på tre till sex hundra kronor inklusive nytt däck. Slangbyte separat är billigare.' },
    ],
    faq: [{ q: 'Vinterdäck?', a: 'Dubbade vinterdäck för cykel finns och bokas ofta tidigt höst. Markera i ärendet om du vill ha det.' }],
  },
  {
    slug: 'hjul-och-ekrar-linkoping',
    h1: 'Hjul och ekrar — cykelverkstad i Linköping',
    title: 'Hjulriktning och ekerbyte cykel Linköping',
    description: 'Skev hjul, åtta eller trasiga ekrar? Få offert på hjulriktning eller ekerbyte i Linköping.',
    intro: lokalt('Linköping', 'hjälp med hjul och ekrar'),
    sections: [
      { h2: 'Vad är en åtta?', body: 'En åtta är ett snedbelastat hjul. En verkstad riktar genom att efterspänna ekrar — fungerar så länge inte för många är trasiga.' },
      { h2: 'Pris', body: 'Hjulriktning ligger på två till fyra hundra kronor. Trasiga ekrar tar längre tid och kostar mer per eker.' },
    ],
    faq: [{ q: 'Måste jag byta hela hjulet?', a: 'Inte alltid. Är navet helt och fälgen inte sliten räcker det ofta med riktning och nya ekrar.' }],
  },
  {
    slug: 'cykelmontering-linkoping',
    h1: 'Cykelmontering i Linköping',
    title: 'Cykelmontering Linköping — montera ny cykel från kartong',
    description: 'Köpt cykel på nätet? Få offert på montering, justering och säkerhetskontroll från en lokal verkstad i Linköping.',
    intro: lokalt('Linköping', 'cykelmontering av ny cykel'),
    sections: [
      { h2: 'Vad ingår?', body: 'Styre, sadel och pedaler monteras, växlar och bromsar justeras och cykeln säkerhetskontrolleras innan leverans.' },
      { h2: 'Pris', body: 'Cykelmontering ligger oftast på fyra till sju hundra kronor. Elcyklar kan kosta något mer på grund av motor- och kabeldragning.' },
    ],
    faq: [{ q: 'Hur lång tid tar det?', a: 'En verkstad behöver oftast en till två arbetsdagar inklusive väntetid.' }],
  },
  {
    slug: 'varservice-cykel-linkoping',
    h1: 'Vårservice för cykel i Linköping',
    title: 'Vårservice cykel Linköping — gör cykeln redo efter vintern',
    description: 'Vårservice av cykeln i Linköping. Genomgång efter vintern — bromsar, växlar, däck och drivlina. Få offerter lokalt.',
    intro: lokalt('Linköping', 'vårservice av cykeln'),
    sections: [
      { h2: 'Vad ingår i vårservice?', body: 'Genomgång av broms och växel, kontroll av däck och hjul, smörjning av drivlina och säkerhetskontroll av ram och styrlager.' },
      { h2: 'Pris', body: 'En vårservice ligger oftast på fem till åtta hundra kronor. Slitdelar som behöver bytas tillkommer.' },
    ],
    faq: [{ q: 'När är bästa tiden?', a: 'Mars till april. Boka tidigt — många vill ha cykeln klar samtidigt.' }],
  },

  // === Prisstatistik från riktig data ===
  {
    slug: 'vad-kostar-cykelreparation-linkoping',
    h1: 'Vad kostar cykelreparation i Linköping?',
    title: 'Vad kostar cykelreparation i Linköping? Riktiga priser',
    description: 'Riktiga priser på cykelreparation i Linköping — baserat på faktiska offerter från lokala verkstäder via Cykelhjälpen.',
    intro: 'Vad kostar det egentligen att laga cykeln i Linköping? Här ser du prisspann från riktiga offerter som lämnats av godkända verkstäder via Cykelhjälpen. Priserna uppdateras löpande.',
    sections: [
      { h2: 'Hur räknas priserna ut?', body: 'Priserna bygger på minst tre lämnade offerter per reparationstyp och avrundas till närmaste femtio kronor. Enskilda offerter går aldrig att härleda.' },
      { h2: 'Varför skiljer priserna?', body: 'Cykeltyp, slitdelar och hur snabbt du behöver hjälp påverkar priset. En elcykel kostar oftast mer än en stadscykel eftersom det krävs mer tid och rätt verktyg.' },
    ],
    faq: [
      { q: 'Är det här ett fast pris?', a: 'Nej, det är ett spann från riktiga offerter. För exakt pris för just din cykel — skicka ärende så får du upp till fem offerter.' },
      { q: 'Hur ofta uppdateras priserna?', a: 'Statistiken hämtas live varje gång du laddar sidan, så fort en ny offert lämnas räknas den in.' },
    ],
    variant: 'price-stats',
  },
]
