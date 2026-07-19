import { CYKEL_CITIES, slugify, type CykelCity, type CykelCityName } from './cykelCities'

export interface CykelSeoPage {
  slug: string
  city: CykelCityName
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

const spotlights = (c: CykelCity, n = 3) => c.districts.slice(0, n)

const localIntro = (what: string, c: CykelCity) =>
  `Behöver du ${what} i ${c.name}? ${c.localIntro} Cykelhjälpen kopplar dig till lokala, anslutna cykelverkstäder som täcker bland annat ${c.areas}. Skicka ett kostnadsfritt ärende — du får upp till fem prisförslag inom ett dygn.`

const commonFaq = (c: CykelCity) => [
  { q: 'Hur snabbt får jag svar?', a: `Oftast inom ett dygn på vardagar. Många verkstäder i ${c.name} svarar samma dag.` },
  { q: 'Vad kostar det att skicka ärende?', a: 'Det är helt gratis för dig som cyklist. Verkstaden betalar en liten avgift för att lämna offert.' },
]

interface ServiceDef {
  slugStem: string
  what: string
  h1: (c: CykelCity) => string
  title: (c: CykelCity) => string
  description: (c: CykelCity) => string
  sections: (c: CykelCity) => { h2: string; body: string }[]
  faq: (c: CykelCity) => { q: string; a: string }[]
  variant?: 'price-stats'
  ogImage?: string
}

const districtLine = (c: CykelCity) => {
  const [a, b, cc] = spotlights(c, 3)
  return cc
    ? `Verkstäder täcker bland annat ${a}, ${b} och ${cc} — ange område eller postnummer så matchas rätt verkstad.`
    : `Verkstäder täcker bland annat ${a} och ${b}.`
}

const SERVICES: ServiceDef[] = [
  {
    slugStem: 'cykelverkstad',
    what: 'en cykelverkstad',
    h1: (c) => `Cykelverkstad i ${c.name}`,
    title: (c) => `Cykelverkstad ${c.name} — jämför lokala priser`,
    description: (c) => `Hitta en cykelverkstad i ${c.name}. Skicka gratis ärende och få upp till fem offerter på reparation, service eller punktering.`,
    sections: (c) => [
      { h2: 'Hur fungerar Cykelhjälpen?', body: `Du beskriver felet på två minuter. Vi skickar ärendet till anslutna cykelverkstäder i ${c.name} som lämnar pris och tid. Du väljer själv vilken verkstad du vill anlita.` },
      { h2: 'Vad kostar det?', body: 'Det är helt gratis för dig som cyklist. Verkstaden betalar en liten avgift för att lämna offert.' },
      { h2: 'Vilka områden täcker ni?', body: `${c.localIntro} ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Behöver jag konto?', a: 'Nej. Du skickar ärendet utan att registrera dig.' },
      { q: `Hur snabbt får jag svar i ${c.name}?`, a: 'Oftast inom ett dygn, många verkstäder svarar samma dag.' },
    ],
  },
  {
    slugStem: 'cykelreparation',
    what: 'cykelreparation',
    h1: (c) => `Cykelreparation i ${c.name}`,
    title: (c) => `Cykelreparation ${c.name} — boka via lokala verkstäder`,
    description: (c) => `Boka cykelreparation i ${c.name}. Beskriv felet och få offerter från lokala cykelverkstäder. Gratis och utan konto.`,
    sections: (c) => [
      { h2: 'Vanliga reparationer', body: 'Bromsar, växlar, kedja, vajrar, hjul, ekrar, däckbyte och komplett service. Lägg till bilder så får du en mer exakt offert.' },
      { h2: `Pris för cykelreparation i ${c.name}`, body: `En enklare punktering kostar oftast två till fyra hundra kronor. En komplett service ligger mellan sju hundra och tolv hundra kronor beroende på cykel. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Kan jag få cykeln hämtad?', a: `Vissa verkstäder i ${c.name} erbjuder hämtning. Markera det i formuläret så filtrerar vi rätt.` },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'punktering',
    what: 'hjälp med punktering',
    h1: (c) => `Punktering — hjälp i ${c.name}`,
    title: (c) => `Punktering ${c.name} — fixa cykeln samma dag`,
    description: (c) => `Punktering i ${c.name}? Skicka gratis ärende och få offert från en lokal cykelverkstad. Många fixar samma dag.`,
    sections: (c) => [
      { h2: 'Hur lång tid tar det?', body: 'En enkel punktering åtgärdas på en kvart. Räkna med en arbetsdag inklusive väntetid hos verkstaden.' },
      { h2: 'Vad kostar det?', body: `Vanligtvis två till fyra hundra kronor inklusive ny slang. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Kan jag laga själv?', a: 'Ja, men en verkstad gör det snabbare och garanterar arbetet.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'cykelservice',
    what: 'cykelservice',
    h1: (c) => `Cykelservice i ${c.name}`,
    title: (c) => `Cykelservice ${c.name} — pris, tid och lokala verkstäder`,
    description: (c) => `Beställ cykelservice i ${c.name}. Få offert från lokala verkstäder på liten eller komplett service.`,
    sections: (c) => [
      { h2: 'Liten service', body: 'Genomgång, justering av växel och broms, kontroll av hjul. Pris cirka fem hundra till sju hundra kronor.' },
      { h2: 'Komplett service', body: `Allt i liten service plus rengöring av drivlina, byte av vajrar och slitdelar vid behov. Pris cirka tolv hundra till sjutton hundra kronor. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Hur ofta behöver jag service?', a: 'En gång om året om du cyklar dagligen, annars vartannat år.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'elcykel-reparation',
    what: 'elcykel-reparation',
    h1: (c) => `Elcykel-reparation i ${c.name}`,
    title: (c) => `Elcykel reparation ${c.name} — verkstäder med rätt verktyg`,
    description: (c) => `Elcykel som krånglar i ${c.name}? Få offert från verkstäder med rätt verktyg för Bosch, Shimano Steps, Bafang m.fl.`,
    sections: (c) => [
      { h2: 'Vanliga problem', body: 'Display visar fel, motorn drar inte, batteriet håller kortare. Beskriv symptomen så får du rätt offert.' },
      { h2: 'Vilka motorer hanteras?', body: `De flesta verkstäder är vana vid Bosch och Shimano Steps. Vissa servar även Bafang, Yamaha och Brose. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Kan jag byta batteri själv?', a: 'Tekniskt ja, men felaktig hantering kan orsaka brand. Låt en verkstad göra det.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'elsparkcykel-reparation',
    what: 'elsparkcykel-reparation',
    h1: (c) => `Elsparkcykel-reparation i ${c.name}`,
    title: (c) => `Elsparkcykel reparation ${c.name} — verkstäder som lagar din elscooter`,
    description: (c) => `Elsparkcykel som krånglar i ${c.name}? Punktering, bromsar eller batteri — få offert från verkstäder som lagar elsparkcyklar. Gratis och utan konto.`,
    sections: (c) => [
      { h2: 'Vanliga problem', body: 'Punktering på små hjul, bromsar som slirar, batteri som laddar ur fort eller felkoder i displayen. Beskriv symptomen så får du rätt offert.' },
      { h2: 'Vilka märken hanteras?', body: `Många verkstäder hjälper till med vanliga märken som Xiaomi, Ninebot Segway, Voi-modeller och fler. Ange märke och modell i ärendet så matchas du rätt. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Kan alla cykelverkstäder laga elsparkcyklar?', a: 'Nej, det krävs ofta rätt verktyg och elkompetens. Genom Cykelhjälpen når du bara verkstäder som själva valt att ta elsparkcykeljobb.' },
      { q: 'Vad kostar en lagning?', a: 'Enklare jobb som punktering ligger ofta på tre till fem hundra kronor. Batteri- och motorjobb kostar mer beroende på reservdelar.' },
      ...commonFaq(c).slice(0, 1),
    ],
    ogImage: '/og/elsparkcykel-reparation.jpg',
  },
  {
    slugStem: 'mobil-cykelreparation',
    what: 'mobil cykelreparation',
    h1: (c) => `Mobil cykelreparation i ${c.name}`,
    title: (c) => `Mobil cykelreparation ${c.name} — verkstad på plats`,
    description: (c) => `Mobil cykelreparation i ${c.name}. Verkstaden kommer till dig — perfekt för punktering eller enklare service.`,
    sections: (c) => [
      { h2: 'Hur fungerar det?', body: 'Du beskriver felet och adress. Mobila verkstäder lämnar offert med restidstillägg och tid på plats.' },
      { h2: 'Var kan de köra?', body: `Många mobila verkstäder kör inom hela ${c.name} — ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Vad kan göras hemma?', a: 'Punktering, enklare bromsjustering, kedjebyte. Större jobb kräver verkstaden.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'vaxeljustering',
    what: 'hjälp med växeljustering',
    h1: (c) => `Växeljustering i ${c.name}`,
    title: (c) => `Växeljustering ${c.name} — pris och lokala verkstäder`,
    description: (c) => `Växlar som hoppar eller slirar? Få offert på växeljustering från cykelverkstäder i ${c.name}. Gratis och utan konto.`,
    sections: (c) => [
      { h2: 'Vad är felet oftast?', body: 'Felinställd bakväxel, sträckt vajer eller sliten kassett. En verkstad mäter slitage och justerar på 15 till 30 minuter.' },
      { h2: 'Vad kostar det?', body: `En enklare justering ligger på två till fyra hundra kronor. Behöver vajer eller kassett bytas tillkommer det. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Kan jag fortsätta cykla?', a: 'Korta sträckor ja, men slitaget på kedja och kassett ökar om växeln hoppar ofta.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'bromsservice',
    what: 'bromsservice för cykeln',
    h1: (c) => `Bromsservice för cykel i ${c.name}`,
    title: (c) => `Bromsservice cykel ${c.name} — skivbroms och fälgbroms`,
    description: (c) => `Bromsservice för cykel i ${c.name} — byte av belägg, justering och luftning. Få offerter från lokala verkstäder.`,
    sections: (c) => [
      { h2: 'Skivbroms eller fälgbroms', body: 'För skivbroms byts belägg och vid behov luftas systemet. För fälgbroms byts bromsskor och vajer justeras.' },
      { h2: 'Pris', body: `En enklare bromsservice ligger på två och en halv till fem hundra kronor. Luftning av hydraulisk skivbroms är ofta dyrare. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Hur vet jag att det är dags?', a: 'Skrapljud, sämre bromsverkan eller en bromsspak som går nästan till styret är tecken på slitna belägg.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'kedjebyte',
    what: 'kedjebyte på cykeln',
    h1: (c) => `Kedjebyte på cykel i ${c.name}`,
    title: (c) => `Kedjebyte cykel ${c.name} — pris och tid`,
    description: (c) => `Sliten kedja? Få offert på kedjebyte från cykelverkstäder i ${c.name}. Verkstaden mäter slitage först.`,
    sections: (c) => [
      { h2: 'När ska kedjan bytas?', body: 'En kedja byts oftast efter två till fem tusen kilometer beroende på cykling och underhåll. Slitmått används för säker bedömning.' },
      { h2: 'Pris', body: `Kedjebyte inklusive kedja ligger oftast på tre till sex hundra kronor. Är kassetten också sliten byts båda samtidigt. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Varför är det viktigt?', a: 'En sliten kedja sliter snabbt på kassett och drev — vänta för länge och hela drivlinan måste bytas.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'dackbyte-cykel',
    what: 'däckbyte på cykeln',
    h1: (c) => `Däckbyte på cykel i ${c.name}`,
    title: (c) => `Däckbyte cykel ${c.name} — däck och slang`,
    description: (c) => `Däckbyte på cykel i ${c.name} — nya däck eller slang. Få offert från lokala verkstäder via Cykelhjälpen.`,
    sections: (c) => [
      { h2: 'Däck eller slang?', body: 'Slang byts vid punktering. Däck byts när mönstret är slitet, sidoslitage syns eller efter punkteringar i samma område.' },
      { h2: 'Pris', body: `Däckbyte per hjul ligger oftast på tre till sex hundra kronor inklusive nytt däck. Slangbyte separat är billigare. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Vinterdäck?', a: 'Dubbade vinterdäck för cykel finns och bokas ofta tidigt höst. Markera i ärendet om du vill ha det.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'hjul-och-ekrar',
    what: 'hjälp med hjul och ekrar',
    h1: (c) => `Hjul och ekrar — cykelverkstad i ${c.name}`,
    title: (c) => `Hjulriktning och ekerbyte cykel ${c.name}`,
    description: (c) => `Skev hjul, åtta eller trasiga ekrar? Få offert på hjulriktning eller ekerbyte i ${c.name}.`,
    sections: (c) => [
      { h2: 'Vad är en åtta?', body: 'En åtta är ett snedbelastat hjul. En verkstad riktar genom att efterspänna ekrar — fungerar så länge inte för många är trasiga.' },
      { h2: 'Pris', body: `Hjulriktning ligger på två till fyra hundra kronor. Trasiga ekrar tar längre tid och kostar mer per eker. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Måste jag byta hela hjulet?', a: 'Inte alltid. Är navet helt och fälgen inte sliten räcker det ofta med riktning och nya ekrar.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'cykelmontering',
    what: 'cykelmontering av ny cykel',
    h1: (c) => `Cykelmontering i ${c.name}`,
    title: (c) => `Cykelmontering ${c.name} — montera ny cykel från kartong`,
    description: (c) => `Köpt cykel på nätet? Få offert på montering, justering och säkerhetskontroll från en lokal verkstad i ${c.name}.`,
    sections: (c) => [
      { h2: 'Vad ingår?', body: 'Styre, sadel och pedaler monteras, växlar och bromsar justeras och cykeln säkerhetskontrolleras innan leverans.' },
      { h2: 'Pris', body: `Cykelmontering ligger oftast på fyra till sju hundra kronor. Elcyklar kan kosta något mer på grund av motor- och kabeldragning. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'Hur lång tid tar det?', a: 'En verkstad behöver oftast en till två arbetsdagar inklusive väntetid.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'varservice-cykel',
    what: 'vårservice av cykeln',
    h1: (c) => `Vårservice för cykel i ${c.name}`,
    title: (c) => `Vårservice cykel ${c.name} — gör cykeln redo efter vintern`,
    description: (c) => `Vårservice av cykeln i ${c.name}. Genomgång efter vintern — bromsar, växlar, däck och drivlina. Få offerter lokalt.`,
    sections: (c) => [
      { h2: 'Vad ingår i vårservice?', body: 'Genomgång av broms och växel, kontroll av däck och hjul, smörjning av drivlina och säkerhetskontroll av ram och styrlager.' },
      { h2: 'Pris', body: `En vårservice ligger oftast på fem till åtta hundra kronor. Slitdelar som behöver bytas tillkommer. ${districtLine(c)}` },
    ],
    faq: (c) => [
      { q: 'När är bästa tiden?', a: 'Mars till april. Boka tidigt — många vill ha cykeln klar samtidigt.' },
      ...commonFaq(c).slice(0, 1),
    ],
  },
  {
    slugStem: 'vad-kostar-cykelreparation',
    what: 'prisuppgifter för cykelreparation',
    h1: (c) => `Vad kostar cykelreparation i ${c.name}?`,
    title: (c) => `Vad kostar cykelreparation i ${c.name}? Riktiga priser`,
    description: (c) => `Riktiga priser på cykelreparation i ${c.name} — baserat på faktiska offerter från lokala verkstäder via Cykelhjälpen.`,
    sections: (c) => [
      { h2: 'Hur räknas priserna ut?', body: 'Priserna bygger på minst tre lämnade offerter per reparationstyp och avrundas till närmaste femtio kronor. Enskilda offerter går aldrig att härleda.' },
      { h2: 'Varför skiljer priserna?', body: `Cykeltyp, slitdelar och hur snabbt du behöver hjälp påverkar priset. En elcykel kostar oftast mer än en stadscykel eftersom det krävs mer tid och rätt verktyg. ${districtLine(c)}` },
    ],
    faq: () => [
      { q: 'Är det här ett fast pris?', a: 'Nej, det är ett spann från riktiga offerter. För exakt pris för just din cykel — skicka ärende så får du upp till fem offerter.' },
      { q: 'Hur ofta uppdateras priserna?', a: 'Statistiken hämtas live varje gång du laddar sidan, så fort en ny offert lämnas räknas den in.' },
    ],
    variant: 'price-stats',
  },
]

const buildService = (c: CykelCity, svc: ServiceDef): CykelSeoPage => ({
  slug: `${svc.slugStem}-${c.slug}`,
  city: c.name,
  h1: svc.h1(c),
  title: svc.title(c),
  description: svc.description(c),
  intro: localIntro(svc.what, c),
  sections: svc.sections(c),
  faq: svc.faq(c),
  variant: svc.variant,
  ogImage: svc.ogImage,
})

const buildDistrict = (c: CykelCity, district: string): CykelSeoPage => ({
  slug: `cykelverkstad-${slugify(district)}-${c.slug}`,
  city: c.name,
  h1: `Cykelverkstad i ${district}, ${c.name}`,
  title: `Cykelverkstad ${district} ${c.name} — lokala offerter`,
  description: `Behöver du en cykelverkstad i ${district}, ${c.name}? Skicka gratis ärende och få upp till fem prisförslag inom ett dygn.`,
  intro: `Behöver du en cykelverkstad i ${district}, ${c.name}? ${c.localIntro} Skicka ett kostnadsfritt ärende och få upp till fem prisförslag från verkstäder som täcker ${district} och närliggande områden.`,
  sections: [
    { h2: `Lokalt i ${district}`, body: `${district} är en av stadsdelarna i ${c.name} där cykeln används dagligen. Verkstäder i närområdet hjälper till med både vardagscyklar, elcyklar och racer — beskriv problemet så matchas rätt verkstad.` },
    { h2: 'Vad kan en verkstad hjälpa till med?', body: 'Punktering, växeljustering, bromsservice, kedjebyte, helservice och elcykel-reparation är de vanligaste jobben. Lägg gärna en bild i ärendet så blir offerten mer exakt.' },
  ],
  faq: [
    { q: 'Hur snabbt får jag svar?', a: 'Oftast inom ett dygn på vardagar. Många verkstäder svarar samma dag.' },
    { q: 'Vad kostar det att skicka ärende?', a: 'Det är helt gratis. Verkstaden betalar en liten avgift för att lämna offert.' },
  ],
})

export const CYKEL_SEO_PAGES: CykelSeoPage[] = CYKEL_CITIES.flatMap((city) => [
  ...SERVICES.map((svc) => buildService(city, svc)),
  ...city.districts.map((d) => buildDistrict(city, d)),
])
