export interface CykelSeoPage {
  slug: string
  h1: string
  title: string
  description: string
  intro: string
  sections: { h2: string; body: string }[]
  faq: { q: string; a: string }[]
}

const lokalt = (omr: string, what: string) =>
  `Behöver du ${what} i ${omr}? Cykelhjälpen kopplar dig till lokala, anslutna cykelverkstäder i Linköping. Skicka ett kostnadsfritt ärende — du får upp till fem prisförslag inom ett dygn.`

export const CYKEL_SEO_PAGES: CykelSeoPage[] = [
  {
    slug: 'cykelverkstad-linkoping',
    h1: 'Cykelverkstad i Linköping',
    title: 'Cykelverkstad Linköping — jämför priser från lokala verkstäder',
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
]
