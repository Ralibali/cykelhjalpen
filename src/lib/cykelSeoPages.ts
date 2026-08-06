import { CYKEL_CITIES, slugify, type CykelCity, type CykelCityName } from './cykelCities'

export interface CykelSeoPage {
  slug: string
  /** English slug — the page lives on /en/<enSlug>. */
  enSlug: string
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

/** Swedish slug stem -> English slug stem. Every SERVICES entry must be listed here. */
export const EN_SLUG_STEMS: Record<string, string> = {
  // 'bike-repair-<city>' is the English city hub — it must stay on the already
  // indexed URL, so it maps from the Swedish city hub stem 'cykelverkstad'.
  'cykelverkstad': 'bike-repair',
  'cykelreparation': 'bike-repair-service',

  'punktering': 'puncture-repair',
  'cykelservice': 'bike-service',
  'elcykel-reparation': 'electric-bike-repair',
  'elsparkcykel-reparation': 'e-scooter-repair',
  'mobil-cykelreparation': 'mobile-bike-repair',
  'vaxeljustering': 'gear-adjustment',
  'bromsservice': 'brake-service',
  'kedjebyte': 'chain-replacement',
  'dackbyte-cykel': 'bike-tyre-change',
  'hjul-och-ekrar': 'wheels-and-spokes',
  'cykelmontering': 'bike-assembly',
  'varservice-cykel': 'spring-bike-service',
  'vad-kostar-cykelreparation': 'bike-repair-cost',
}


type Tfn = (sv: string, vars?: Record<string, string | number>) => string
const identity: Tfn = (s) => s

const spotlights = (c: CykelCity, n = 3) => c.districts.slice(0, n)

const localIntro = (t: Tfn, what: string, c: CykelCity) =>
  t('Behöver du {what} i {city}? {localIntro} Cykelhjälpen kopplar dig till lokala, anslutna cykelverkstäder som täcker bland annat {areas}. Skicka ett kostnadsfritt ärende — du får upp till tre prisförslag inom ett dygn.', {
    what: t(what),
    city: c.name,
    localIntro: t(c.localIntro),
    areas: c.areas,
  })

const commonFaq = (t: Tfn, c: CykelCity) => [
  { q: t('Hur snabbt får jag svar?'), a: t('Oftast inom ett dygn på vardagar. Många verkstäder i {city} svarar samma dag.', { city: c.name }) },
  { q: t('Vad kostar det att skicka ärende?'), a: t('Det är helt gratis för dig som cyklist. Verkstaden betalar en liten avgift för att lämna offert.') },
]

interface ServiceDef {
  slugStem: string
  what: string
  h1: (c: CykelCity, t: Tfn) => string
  title: (c: CykelCity, t: Tfn) => string
  description: (c: CykelCity, t: Tfn) => string
  sections: (c: CykelCity, t: Tfn) => { h2: string; body: string }[]
  faq: (c: CykelCity, t: Tfn) => { q: string; a: string }[]
  variant?: 'price-stats'
  ogImage?: string
}

const districtLine = (t: Tfn, c: CykelCity) => {
  const [a, b, cc] = spotlights(c, 3)
  return cc
    ? t('Verkstäder täcker bland annat {a}, {b} och {c} — ange område eller postnummer så matchas rätt verkstad.', { a, b, c: cc })
    : t('Verkstäder täcker bland annat {a} och {b}.', { a, b })
}

const SERVICES: ServiceDef[] = [
  {
    slugStem: 'cykelverkstad',
    what: 'en cykelverkstad',
    h1: (c, t) => t('Cykelverkstad i {city}', { city: c.name }),
    title: (c, t) => t('Cykelverkstad {city} — jämför lokala priser', { city: c.name }),
    description: (c, t) => t('Hitta en cykelverkstad i {city}. Skicka gratis ärende och få upp till tre offerter på reparation, service eller punktering.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Hur fungerar Cykelhjälpen?'), body: t('Du beskriver felet på två minuter. Vi skickar ärendet till anslutna cykelverkstäder i {city} som lämnar pris och tid. Du väljer själv vilken verkstad du vill anlita.', { city: c.name }) },
      { h2: t('Vad kostar det?'), body: t('Det är helt gratis för dig som cyklist. Verkstaden betalar en liten avgift för att lämna offert.') },
      { h2: t('Vilka områden täcker ni?'), body: `${t(c.localIntro)} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Behöver jag konto?'), a: t('Nej. Du skickar ärendet utan att registrera dig.') },
      { q: t('Hur snabbt får jag svar i {city}?', { city: c.name }), a: t('Oftast inom ett dygn, många verkstäder svarar samma dag.') },
    ],
  },
  {
    slugStem: 'cykelreparation',
    what: 'cykelreparation',
    h1: (c, t) => t('Cykelreparation i {city}', { city: c.name }),
    title: (c, t) => t('Cykelreparation {city} — boka via lokala verkstäder', { city: c.name }),
    description: (c, t) => t('Boka cykelreparation i {city}. Beskriv felet och få offerter från lokala cykelverkstäder. Gratis och utan konto.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Vanliga reparationer'), body: t('Bromsar, växlar, kedja, vajrar, hjul, ekrar, däckbyte och komplett service. Lägg till bilder så får du en mer exakt offert.') },
      { h2: t('Pris för cykelreparation i {city}', { city: c.name }), body: `${t('En enklare punktering kostar oftast två till fyra hundra kronor. En komplett service ligger mellan sju hundra och tolv hundra kronor beroende på cykel.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Kan jag få cykeln hämtad?'), a: t('Vissa verkstäder i {city} erbjuder hämtning. Markera det i formuläret så filtrerar vi rätt.', { city: c.name }) },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'punktering',
    what: 'hjälp med punktering',
    h1: (c, t) => t('Punktering — hjälp i {city}', { city: c.name }),
    title: (c, t) => t('Punktering {city} — fixa cykeln samma dag', { city: c.name }),
    description: (c, t) => t('Punktering i {city}? Skicka gratis ärende och få offert från en lokal cykelverkstad. Många fixar samma dag.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Hur lång tid tar det?'), body: t('En enkel punktering åtgärdas på en kvart. Räkna med en arbetsdag inklusive väntetid hos verkstaden.') },
      { h2: t('Vad kostar det?'), body: `${t('Vanligtvis två till fyra hundra kronor inklusive ny slang.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Kan jag laga själv?'), a: t('Ja, men en verkstad gör det snabbare och garanterar arbetet.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'cykelservice',
    what: 'cykelservice',
    h1: (c, t) => t('Cykelservice i {city}', { city: c.name }),
    title: (c, t) => t('Cykelservice {city} — pris, tid och lokala verkstäder', { city: c.name }),
    description: (c, t) => t('Beställ cykelservice i {city}. Få offert från lokala verkstäder på liten eller komplett service.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Liten service'), body: t('Genomgång, justering av växel och broms, kontroll av hjul. Pris cirka fem hundra till sju hundra kronor.') },
      { h2: t('Komplett service'), body: `${t('Allt i liten service plus rengöring av drivlina, byte av vajrar och slitdelar vid behov. Pris cirka tolv hundra till sjutton hundra kronor.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Hur ofta behöver jag service?'), a: t('En gång om året om du cyklar dagligen, annars vartannat år.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'elcykel-reparation',
    what: 'elcykel-reparation',
    h1: (c, t) => t('Elcykel-reparation i {city}', { city: c.name }),
    title: (c, t) => t('Elcykel reparation {city} — verkstäder med rätt verktyg', { city: c.name }),
    description: (c, t) => t('Elcykel som krånglar i {city}? Få offert från verkstäder med rätt verktyg för Bosch, Shimano Steps, Bafang m.fl.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Vanliga problem'), body: t('Display visar fel, motorn drar inte, batteriet håller kortare. Beskriv symptomen så får du rätt offert.') },
      { h2: t('Vilka motorer hanteras?'), body: `${t('De flesta verkstäder är vana vid Bosch och Shimano Steps. Vissa servar även Bafang, Yamaha och Brose.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Kan jag byta batteri själv?'), a: t('Tekniskt ja, men felaktig hantering kan orsaka brand. Låt en verkstad göra det.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'elsparkcykel-reparation',
    what: 'elsparkcykel-reparation',
    h1: (c, t) => t('Elsparkcykel-reparation i {city}', { city: c.name }),
    title: (c, t) => t('Elsparkcykel reparation {city} — verkstäder som lagar din elscooter', { city: c.name }),
    description: (c, t) => t('Elsparkcykel som krånglar i {city}? Punktering, bromsar eller batteri — få offert från verkstäder som lagar elsparkcyklar. Gratis och utan konto.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Vanliga problem'), body: t('Punktering på små hjul, bromsar som slirar, batteri som laddar ur fort eller felkoder i displayen. Beskriv symptomen så får du rätt offert.') },
      { h2: t('Vilka märken hanteras?'), body: `${t('Många verkstäder hjälper till med vanliga märken som Xiaomi, Ninebot Segway, Voi-modeller och fler. Ange märke och modell i ärendet så matchas du rätt.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Kan alla cykelverkstäder laga elsparkcyklar?'), a: t('Nej, det krävs ofta rätt verktyg och elkompetens. Genom Cykelhjälpen når du bara verkstäder som själva valt att ta elsparkcykeljobb.') },
      { q: t('Vad kostar en lagning?'), a: t('Enklare jobb som punktering ligger ofta på tre till fem hundra kronor. Batteri- och motorjobb kostar mer beroende på reservdelar.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
    ogImage: '/og/elsparkcykel-reparation.jpg',
  },
  {
    slugStem: 'mobil-cykelreparation',
    what: 'mobil cykelreparation',
    h1: (c, t) => t('Mobil cykelreparation i {city}', { city: c.name }),
    title: (c, t) => t('Mobil cykelreparation {city} — verkstad på plats', { city: c.name }),
    description: (c, t) => t('Mobil cykelreparation i {city}. Verkstaden kommer till dig — perfekt för punktering eller enklare service.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Hur fungerar det?'), body: t('Du beskriver felet och adress. Mobila verkstäder lämnar offert med restidstillägg och tid på plats.') },
      { h2: t('Var kan de köra?'), body: `${t('Många mobila verkstäder kör inom hela {city} —', { city: c.name })} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Vad kan göras hemma?'), a: t('Punktering, enklare bromsjustering, kedjebyte. Större jobb kräver verkstaden.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'vaxeljustering',
    what: 'hjälp med växeljustering',
    h1: (c, t) => t('Växeljustering i {city}', { city: c.name }),
    title: (c, t) => t('Växeljustering {city} — pris och lokala verkstäder', { city: c.name }),
    description: (c, t) => t('Växlar som hoppar eller slirar? Få offert på växeljustering från cykelverkstäder i {city}. Gratis och utan konto.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Vad är felet oftast?'), body: t('Felinställd bakväxel, sträckt vajer eller sliten kassett. En verkstad mäter slitage och justerar på 15 till 30 minuter.') },
      { h2: t('Vad kostar det?'), body: `${t('En enklare justering ligger på två till fyra hundra kronor. Behöver vajer eller kassett bytas tillkommer det.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Kan jag fortsätta cykla?'), a: t('Korta sträckor ja, men slitaget på kedja och kassett ökar om växeln hoppar ofta.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'bromsservice',
    what: 'bromsservice för cykeln',
    h1: (c, t) => t('Bromsservice för cykel i {city}', { city: c.name }),
    title: (c, t) => t('Bromsservice cykel {city} — skivbroms och fälgbroms', { city: c.name }),
    description: (c, t) => t('Bromsservice för cykel i {city} — byte av belägg, justering och luftning. Få offerter från lokala verkstäder.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Skivbroms eller fälgbroms'), body: t('För skivbroms byts belägg och vid behov luftas systemet. För fälgbroms byts bromsskor och vajer justeras.') },
      { h2: t('Pris'), body: `${t('En enklare bromsservice ligger på två och en halv till fem hundra kronor. Luftning av hydraulisk skivbroms är ofta dyrare.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Hur vet jag att det är dags?'), a: t('Skrapljud, sämre bromsverkan eller en bromsspak som går nästan till styret är tecken på slitna belägg.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'kedjebyte',
    what: 'kedjebyte på cykeln',
    h1: (c, t) => t('Kedjebyte på cykel i {city}', { city: c.name }),
    title: (c, t) => t('Kedjebyte cykel {city} — pris och tid', { city: c.name }),
    description: (c, t) => t('Sliten kedja? Få offert på kedjebyte från cykelverkstäder i {city}. Verkstaden mäter slitage först.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('När ska kedjan bytas?'), body: t('En kedja byts oftast efter två till fem tusen kilometer beroende på cykling och underhåll. Slitmått används för säker bedömning.') },
      { h2: t('Pris'), body: `${t('Kedjebyte inklusive kedja ligger oftast på tre till sex hundra kronor. Är kassetten också sliten byts båda samtidigt.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Varför är det viktigt?'), a: t('En sliten kedja sliter snabbt på kassett och drev — vänta för länge och hela drivlinan måste bytas.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'dackbyte-cykel',
    what: 'däckbyte på cykeln',
    h1: (c, t) => t('Däckbyte på cykel i {city}', { city: c.name }),
    title: (c, t) => t('Däckbyte cykel {city} — däck och slang', { city: c.name }),
    description: (c, t) => t('Däckbyte på cykel i {city} — nya däck eller slang. Få offert från lokala verkstäder via Cykelhjälpen.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Däck eller slang?'), body: t('Slang byts vid punktering. Däck byts när mönstret är slitet, sidoslitage syns eller efter punkteringar i samma område.') },
      { h2: t('Pris'), body: `${t('Däckbyte per hjul ligger oftast på tre till sex hundra kronor inklusive nytt däck. Slangbyte separat är billigare.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Vinterdäck?'), a: t('Dubbade vinterdäck för cykel finns och bokas ofta tidigt höst. Markera i ärendet om du vill ha det.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'hjul-och-ekrar',
    what: 'hjälp med hjul och ekrar',
    h1: (c, t) => t('Hjul och ekrar — cykelverkstad i {city}', { city: c.name }),
    title: (c, t) => t('Hjulriktning och ekerbyte cykel {city}', { city: c.name }),
    description: (c, t) => t('Skev hjul, åtta eller trasiga ekrar? Få offert på hjulriktning eller ekerbyte i {city}.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Vad är en åtta?'), body: t('En åtta är ett snedbelastat hjul. En verkstad riktar genom att efterspänna ekrar — fungerar så länge inte för många är trasiga.') },
      { h2: t('Pris'), body: `${t('Hjulriktning ligger på två till fyra hundra kronor. Trasiga ekrar tar längre tid och kostar mer per eker.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Måste jag byta hela hjulet?'), a: t('Inte alltid. Är navet helt och fälgen inte sliten räcker det ofta med riktning och nya ekrar.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'cykelmontering',
    what: 'cykelmontering av ny cykel',
    h1: (c, t) => t('Cykelmontering i {city}', { city: c.name }),
    title: (c, t) => t('Cykelmontering {city} — montera ny cykel från kartong', { city: c.name }),
    description: (c, t) => t('Köpt cykel på nätet? Få offert på montering, justering och säkerhetskontroll från en lokal verkstad i {city}.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Vad ingår?'), body: t('Styre, sadel och pedaler monteras, växlar och bromsar justeras och cykeln säkerhetskontrolleras innan leverans.') },
      { h2: t('Pris'), body: `${t('Cykelmontering ligger oftast på fyra till sju hundra kronor. Elcyklar kan kosta något mer på grund av motor- och kabeldragning.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('Hur lång tid tar det?'), a: t('En verkstad behöver oftast en till två arbetsdagar inklusive väntetid.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'varservice-cykel',
    what: 'vårservice av cykeln',
    h1: (c, t) => t('Vårservice för cykel i {city}', { city: c.name }),
    title: (c, t) => t('Vårservice cykel {city} — gör cykeln redo efter vintern', { city: c.name }),
    description: (c, t) => t('Vårservice av cykeln i {city}. Genomgång efter vintern — bromsar, växlar, däck och drivlina. Få offerter lokalt.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Vad ingår i vårservice?'), body: t('Genomgång av broms och växel, kontroll av däck och hjul, smörjning av drivlina och säkerhetskontroll av ram och styrlager.') },
      { h2: t('Pris'), body: `${t('En vårservice ligger oftast på fem till åtta hundra kronor. Slitdelar som behöver bytas tillkommer.')} ${districtLine(t, c)}` },
    ],
    faq: (c, t) => [
      { q: t('När är bästa tiden?'), a: t('Mars till april. Boka tidigt — många vill ha cykeln klar samtidigt.') },
      ...commonFaq(t, c).slice(0, 1),
    ],
  },
  {
    slugStem: 'vad-kostar-cykelreparation',
    what: 'prisuppgifter för cykelreparation',
    h1: (c, t) => t('Vad kostar cykelreparation i {city}?', { city: c.name }),
    title: (c, t) => t('Vad kostar cykelreparation i {city}? Riktiga priser', { city: c.name }),
    description: (c, t) => t('Riktiga priser på cykelreparation i {city} — baserat på faktiska offerter från lokala verkstäder via Cykelhjälpen.', { city: c.name }),
    sections: (c, t) => [
      { h2: t('Hur räknas priserna ut?'), body: t('Priserna bygger på minst tre lämnade offerter per reparationstyp och avrundas till närmaste femtio kronor. Enskilda offerter går aldrig att härleda.') },
      { h2: t('Varför skiljer priserna?'), body: `${t('Cykeltyp, slitdelar och hur snabbt du behöver hjälp påverkar priset. En elcykel kostar oftast mer än en stadscykel eftersom det krävs mer tid och rätt verktyg.')} ${districtLine(t, c)}` },
    ],
    faq: (_c, t) => [
      { q: t('Är det här ett fast pris?'), a: t('Nej, det är ett spann från riktiga offerter. För exakt pris för just din cykel — skicka ärende så får du upp till tre offerter.') },
      { q: t('Hur ofta uppdateras priserna?'), a: t('Statistiken hämtas live varje gång du laddar sidan, så fort en ny offert lämnas räknas den in.') },
    ],
    variant: 'price-stats',
  },
]

const buildService = (c: CykelCity, svc: ServiceDef, t: Tfn): CykelSeoPage => ({
  slug: `${svc.slugStem}-${c.slug}`,
  enSlug: `${EN_SLUG_STEMS[svc.slugStem] ?? svc.slugStem}-${c.slug}`,
  city: c.name,

  h1: svc.h1(c, t),
  title: svc.title(c, t),
  description: svc.description(c, t),
  intro: localIntro(t, svc.what, c),
  sections: svc.sections(c, t),
  faq: svc.faq(c, t),
  variant: svc.variant,
  ogImage: svc.ogImage,
})

const buildDistrict = (c: CykelCity, district: string, t: Tfn): CykelSeoPage => ({
  slug: `cykelverkstad-${slugify(district)}-${c.slug}`,
  enSlug: `bike-shop-${slugify(district)}-${c.slug}`,
  city: c.name,

  h1: t('Cykelverkstad i {district}, {city}', { district, city: c.name }),
  title: t('Cykelverkstad {district} {city} — lokala offerter', { district, city: c.name }),
  description: t('Behöver du en cykelverkstad i {district}, {city}? Skicka gratis ärende och få upp till tre prisförslag inom ett dygn.', { district, city: c.name }),
  intro: t('Behöver du en cykelverkstad i {district}, {city}? {localIntro} Skicka ett kostnadsfritt ärende och få upp till tre prisförslag från verkstäder som täcker {district} och närliggande områden.', { district, city: c.name, localIntro: t(c.localIntro) }),
  sections: [
    { h2: t('Lokalt i {district}', { district }), body: t('{district} är en av stadsdelarna i {city} där cykeln används dagligen. Verkstäder i närområdet hjälper till med både vardagscyklar, elcyklar och racer — beskriv problemet så matchas rätt verkstad.', { district, city: c.name }) },
    { h2: t('Vad kan en verkstad hjälpa till med?'), body: t('Punktering, växeljustering, bromsservice, kedjebyte, helservice och elcykel-reparation är de vanligaste jobben. Lägg gärna en bild i ärendet så blir offerten mer exakt.') },
  ],
  faq: [
    { q: t('Hur snabbt får jag svar?'), a: t('Oftast inom ett dygn på vardagar. Många verkstäder svarar samma dag.') },
    { q: t('Vad kostar det att skicka ärende?'), a: t('Det är helt gratis. Verkstaden betalar en liten avgift för att lämna offert.') },
  ],
})

export const buildCykelSeoPages = (t: Tfn = identity): CykelSeoPage[] =>
  CYKEL_CITIES.flatMap((city) => [
    ...SERVICES.map((svc) => buildService(city, svc, t)),
    ...city.districts.map((d) => buildDistrict(city, d, t)),
  ])

export const CYKEL_SEO_PAGES: CykelSeoPage[] = buildCykelSeoPages()

/** In-router path for a SEO page in the given language (English pages use the /en basename). */
export const seoPagePath = (page: Pick<CykelSeoPage, 'slug' | 'enSlug'>, lang: 'sv' | 'en') =>
  `/${lang === 'en' ? page.enSlug : page.slug}`

/** Full site path (including the /en prefix) for a SEO page. */
export const seoPageHref = (page: Pick<CykelSeoPage, 'slug' | 'enSlug'>, lang: 'sv' | 'en') =>
  lang === 'en' ? `/en/${page.enSlug}` : `/${page.slug}`

