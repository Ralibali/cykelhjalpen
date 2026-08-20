import { CYKEL_CITIES, getCykelCity, slugify, type CykelCity, type CykelCityName } from './cykelCities'

export interface CykelSeoPage {
  slug: string
  enSlug: string
  city: CykelCityName
  h1: string
  title: string
  description: string
  intro: string
  sections: { h2: string; body: string }[]
  faq: { q: string; a: string }[]
  ogImage?: string
  variant?: 'price-stats'
  /** Thin district/service farms in Lund and Uppsala stay live but are not indexed. City hubs stay indexable. */
  noindex?: boolean
}

/** Cities whose district + service SEO farms are noindex. City hub pages stay indexed. */
export const THIN_SEO_FARM_CITIES: readonly CykelCityName[] = ['Lund', 'Uppsala']

export const isCykelCityHubSlug = (slug: string, city: CykelCityName) =>
  slug === `cykelverkstad-${getCykelCity(city).slug}`

export const isThinSeoFarmPage = (page: Pick<CykelSeoPage, 'slug' | 'city'>) =>
  THIN_SEO_FARM_CITIES.includes(page.city) && !isCykelCityHubSlug(page.slug, page.city)

export const EN_SLUG_STEMS: Record<string, string> = {
  cykelverkstad: 'bike-repair',
  cykelreparation: 'bike-repair-service',
  punktering: 'puncture-repair',
  cykelservice: 'bike-service',
  'elcykel-reparation': 'electric-bike-repair',
  'elsparkcykel-reparation': 'e-scooter-repair',
  'mobil-cykelreparation': 'mobile-bike-repair',
  vaxeljustering: 'gear-adjustment',
  bromsservice: 'brake-service',
  kedjebyte: 'chain-replacement',
  'dackbyte-cykel': 'bike-tyre-change',
  'hjul-och-ekrar': 'wheels-and-spokes',
  cykelmontering: 'bike-assembly',
  'varservice-cykel': 'spring-bike-service',
  'vad-kostar-cykelreparation': 'bike-repair-cost',
}

type Tfn = (sv: string, vars?: Record<string, string | number>) => string

const identity: Tfn = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match)) : text

const interpolate = (text: string, vars?: Record<string, string | number>) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match)) : text

const englishMode = (t: Tfn) => t('en cykelverkstad') !== 'en cykelverkstad'
const copy = (t: Tfn, sv: string, en: string, vars?: Record<string, string | number>) =>
  interpolate(englishMode(t) ? en : sv, vars)

const section = (t: Tfn, svH2: string, enH2: string, svBody: string, enBody: string, vars?: Record<string, string | number>) => ({
  h2: copy(t, svH2, enH2, vars),
  body: copy(t, svBody, enBody, vars),
})

const marketStatus = (c: CykelCity, t: Tfn) => c.name === 'Linköping'
  ? copy(t, 'Linköping är Cykelhjälpens fokusstad just nu.', 'Linköping is Cykelhjälpen’s focus city right now.')
  : copy(t, 'Nätverket av anslutna verkstäder i {city} byggs ut just nu.', 'The network of partnered bike shops in {city} is currently expanding.', { city: c.name })

const availability = (c: CykelCity, t: Tfn) =>
  `${copy(t,
    'Anslutna verkstäder i {city} kan svara med pris och möjlig tid när jobbet passar deras kapacitet. Antalet svar och svarstiden varierar.',
    'Partnered bike shops in {city} can reply with a price and available time when the job fits their capacity. The number of replies and response time vary.',
    { city: c.name },
  )} ${marketStatus(c, t)}`

const localIntro = (c: CykelCity, t: Tfn, whatSv: string, whatEn: string) =>
  `${copy(t, 'Behöver du {what} i {city}?', 'Need {what} in {city}?', { what: englishMode(t) ? whatEn : whatSv, city: c.name })} ${t(c.localIntro)} ${copy(t,
    'Beskriv cykeln och problemet i ett kostnadsfritt ärende. En ansluten verkstad kan svara när jobbet passar dess kapacitet.',
    'Describe your bike and the problem in a free request. A partnered shop can reply when the job fits its capacity.',
  )} ${marketStatus(c, t)}`

const responseFaq = (c: CykelCity, t: Tfn) => ({
  q: copy(t, 'Hur snabbt får jag svar?', 'How fast will I get a reply?'),
  a: copy(t,
    'Det beror på stad, typ av reparation och verkstädernas aktuella kapacitet. Du får besked när en ansluten verkstad svarar.',
    'It depends on the city, repair type and the shops’ current capacity. You are notified when a partnered shop replies.',
  ),
})

const freeFaq = (t: Tfn) => ({
  q: copy(t, 'Vad kostar det att skicka ett ärende?', 'What does it cost to send a request?'),
  a: copy(t, 'Det är kostnadsfritt för dig som cyklist och det finns ingen köpplikt.', 'It is free for you as a cyclist and there is no obligation to buy.'),
})

interface ServiceDef {
  slugStem: string
  whatSv: string
  whatEn: string
  h1: (c: CykelCity, t: Tfn) => string
  title: (c: CykelCity, t: Tfn) => string
  description?: (c: CykelCity, t: Tfn) => string
  sections: (c: CykelCity, t: Tfn) => { h2: string; body: string }[]
  faq?: (c: CykelCity, t: Tfn) => { q: string; a: string }[]
  variant?: 'price-stats'
  ogImage?: string
}

const guidePrice = (t: Tfn, sv: string, en: string) =>
  `${copy(t, sv, en)} ${copy(t,
    'Det är ett generellt riktpris, inte Cykelhjälpen-statistik eller en bindande offert. Delar, cykeltyp och arbetets omfattning påverkar slutpriset.',
    'This is a general guide price, not Cykelhjälpen statistics or a binding quote. Parts, bike type and the scope of work affect the final price.',
  )}`

const SERVICES: ServiceDef[] = [
  {
    slugStem: 'cykelverkstad',
    whatSv: 'en cykelverkstad', whatEn: 'a bike shop',
    h1: (c, t) => copy(t, 'Cykelverkstad i {city}', 'Bike shop in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Cykelverkstad {city} — jämför lokala svar', 'Bike shop {city} — compare local replies', { city: c.name }),
    description: (c, t) => copy(t,
      'Hitta cykelverkstad i {city} genom att beskriva problemet gratis. Anslutna verkstäder kan svara med pris och möjlig tid när de har kapacitet.',
      'Find a bike shop in {city} by describing the problem for free. Partnered shops can reply with a price and available time when they have capacity.',
      { city: c.name },
    ),
    sections: (c, t) => [
      section(t, 'Så fungerar Cykelhjälpen', 'How Cykelhjälpen works',
        'Du beskriver cykeln och felet en gång. Ärendet kan sedan nå anslutna verkstäder i {city}, som själva väljer om de vill svara med pris och möjlig tid.',
        'Describe your bike and the issue once. The request can then reach partnered shops in {city}, which choose whether to reply with a price and available time.', { city: c.name }),
      section(t, 'Tillgänglighet i {city}', 'Availability in {city}', availability(c, t), availability(c, t), { city: c.name }),
      section(t, 'Gratis för cyklisten', 'Free for cyclists',
        'Det kostar inget att skicka ett ärende och du väljer själv om du vill gå vidare med något svar.',
        'Sending a request is free and you decide whether to proceed with any reply.'),
    ],
    faq: (c, t) => [
      { q: copy(t, 'Behöver jag konto?', 'Do I need an account?'), a: copy(t, 'Nej. Du skickar ärendet utan att registrera dig.', 'No. You can send the request without creating an account.') },
      responseFaq(c, t),
    ],
  },
  {
    slugStem: 'cykelreparation',
    whatSv: 'cykelreparation', whatEn: 'bike repair',
    h1: (c, t) => copy(t, 'Cykelreparation i {city}', 'Bike repair in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Cykelreparation {city} — pris och möjlig tid', 'Bike repair {city} — price and availability', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Vanliga reparationer', 'Common repairs',
        'Bromsar, växlar, kedja, vajrar, hjul, ekrar, däck och service är vanliga jobb. Lägg gärna till bilder och modelluppgifter så blir jobbet lättare att bedöma.',
        'Brakes, gears, chains, cables, wheels, spokes, tires and service are common jobs. Add photos and model details to make the job easier to assess.'),
      section(t, 'Riktpris för cykelreparation', 'Guide prices for bike repair',
        guidePrice(t, 'Som grov riktpunkt kan en enklare punktering ligga omkring 200–400 kr och en större service omkring 700–1 200 kr.', 'As a rough guide, a simple flat-tire repair may be around SEK 200–400 and a larger service around SEK 700–1,200.'),
        guidePrice(t, 'Som grov riktpunkt kan en enklare punktering ligga omkring 200–400 kr och en större service omkring 700–1 200 kr.', 'As a rough guide, a simple flat-tire repair may be around SEK 200–400 and a larger service around SEK 700–1,200.')),
    ],
    faq: (c, t) => [
      { q: copy(t, 'Kan jag få cykeln hämtad?', 'Can my bike be picked up?'), a: copy(t, 'Om en ansluten verkstad erbjuder hämtning kan den ange det i sitt svar. Tillgängligheten varierar mellan verkstäder och områden.', 'If a partnered shop offers pickup, it can state that in its reply. Availability varies by shop and area.') },
      responseFaq(c, t),
    ],
  },
  {
    slugStem: 'punktering',
    whatSv: 'hjälp med punktering', whatEn: 'help with a flat tire',
    h1: (c, t) => copy(t, 'Punktering — hjälp i {city}', 'Flat tire — help in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Punktering {city} — jämför hjälp från cykelverkstad', 'Flat tire {city} — compare bike-shop help', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Hur snabbt kan en punktering lagas?', 'How quickly can a flat tire be repaired?',
        'Själva slang- eller däckjobbet kan gå snabbt, men Cykelhjälpen lovar ingen viss svarstid eller verkstadstid. Lediga tider beror på den enskilda verkstadens kapacitet.',
        'The tube or tire work itself can be quick, but Cykelhjälpen does not promise a specific response or repair time. Availability depends on each shop’s capacity.'),
      section(t, 'Riktpris', 'Guide price',
        guidePrice(t, 'Ett vanligt riktintervall för enklare punkteringsjobb är cirka 200–400 kr, beroende på slang, däck och cykeltyp.', 'A common guide range for a simple flat-tire job is about SEK 200–400, depending on tube, tire and bike type.'),
        guidePrice(t, 'Ett vanligt riktintervall för enklare punkteringsjobb är cirka 200–400 kr, beroende på slang, däck och cykeltyp.', 'A common guide range for a simple flat-tire job is about SEK 200–400, depending on tube, tire and bike type.')),
    ],
    faq: (c, t) => [
      { q: copy(t, 'Kan jag laga punkteringen själv?', 'Can I repair the flat tire myself?'), a: copy(t, 'Ja, många punkteringar går att laga själv med rätt verktyg. Är du osäker kan du låta en verkstad bedöma jobbet.', 'Yes, many flat tires can be repaired yourself with the right tools. If unsure, you can let a shop assess the job.') },
      responseFaq(c, t),
    ],
  },
  {
    slugStem: 'cykelservice',
    whatSv: 'cykelservice', whatEn: 'bike service',
    h1: (c, t) => copy(t, 'Cykelservice i {city}', 'Bike service in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Cykelservice {city} — jämför pris och innehåll', 'Bike service {city} — compare price and scope', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Vad kan ingå i en service?', 'What can a service include?',
        'En service kan omfatta kontroll och justering av bromsar, växlar, hjul, styrlager och drivlina. Exakt innehåll skiljer sig mellan verkstäder — jämför vad som faktiskt ingår i svaret.',
        'A service can include checks and adjustments of brakes, gears, wheels, headset and drivetrain. Exact scope varies by shop — compare what is actually included in each reply.'),
      section(t, 'Riktpris', 'Guide price',
        guidePrice(t, 'En mindre genomgång kan som riktpunkt ligga kring 500–700 kr och en mer omfattande service kring 1 200–1 700 kr.', 'As a guide, a smaller service may be around SEK 500–700 and a more extensive service around SEK 1,200–1,700.'),
        guidePrice(t, 'En mindre genomgång kan som riktpunkt ligga kring 500–700 kr och en mer omfattande service kring 1 200–1 700 kr.', 'As a guide, a smaller service may be around SEK 500–700 and a more extensive service around SEK 1,200–1,700.')),
    ],
    faq: (c, t) => [
      { q: copy(t, 'Hur ofta behöver cykeln service?', 'How often does a bike need service?'), a: copy(t, 'Det beror på hur mycket och i vilka förhållanden du cyklar. Daglig pendling, vintercykling och smuts sliter mer än sporadisk sommarcykling.', 'It depends on how much and in what conditions you ride. Daily commuting, winter riding and dirt cause more wear than occasional summer riding.') },
      responseFaq(c, t),
    ],
  },
  {
    slugStem: 'elcykel-reparation',
    whatSv: 'elcykelreparation', whatEn: 'e-bike repair',
    h1: (c, t) => copy(t, 'Elcykelreparation i {city}', 'E-bike repair in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Elcykelreparation {city} — hitta verkstad för din modell', 'E-bike repair {city} — find a shop for your model', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Vanliga elcykelproblem', 'Common e-bike problems',
        'Felkoder, avbruten motorassistans, laddningsproblem och ovanligt kort batteritid är exempel på symptom. Beskriv exakt vad som händer och när felet uppstår.',
        'Error codes, interrupted motor assist, charging problems and unusually short battery life are examples of symptoms. Describe exactly what happens and when the issue occurs.'),
      section(t, 'Ange motor, system och modell', 'Include motor, system and model',
        'Kompetens och diagnosverktyg varierar mellan verkstäder. Ange märke, modell, motorsystem och eventuell felkod så kan verkstaden själv avgöra om den kan ta jobbet.',
        'Skills and diagnostic tools vary between shops. Include brand, model, motor system and any error code so each shop can decide whether it can take the job.'),
    ],
    faq: (c, t) => [
      { q: copy(t, 'Kan alla verkstäder laga min elcykel?', 'Can every shop repair my e-bike?'), a: copy(t, 'Nej. Stöd för olika motorsystem och märken varierar. Därför är modelluppgifterna viktiga i ärendet.', 'No. Support for different motor systems and brands varies. That is why model details matter in the request.') },
      responseFaq(c, t),
    ],
  },
  {
    slugStem: 'elsparkcykel-reparation',
    whatSv: 'elsparkcykelreparation', whatEn: 'e-scooter repair',
    h1: (c, t) => copy(t, 'Elsparkcykelreparation i {city}', 'E-scooter repair in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Elsparkcykelreparation {city} — hitta rätt verkstad', 'E-scooter repair {city} — find a suitable shop', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Vanliga problem', 'Common problems',
        'Punktering, bromsar, laddning, batteri och felkoder är vanliga orsaker till att en elsparkcykel behöver felsökas.',
        'Flat tires, brakes, charging, batteries and error codes are common reasons an e-scooter needs troubleshooting.'),
      section(t, 'Ange märke och modell', 'Include brand and model',
        'Alla cykelverkstäder arbetar inte med elsparkcyklar. Ange märke, modell och symptom så kan anslutna verkstäder själva avgöra om jobbet passar deras kompetens.',
        'Not every bike shop works on e-scooters. Include brand, model and symptoms so partnered shops can decide whether the job fits their skills.'),
      section(t, 'Riktpris för enklare jobb', 'Guide price for simpler jobs',
        guidePrice(t, 'Enklare jobb som punktering kan som grov riktpunkt ligga kring 300–500 kr. Batteri-, elektronik- och motorjobb kan bli betydligt dyrare.', 'As a rough guide, simpler jobs such as a flat tire may be around SEK 300–500. Battery, electronics and motor work can cost significantly more.'),
        guidePrice(t, 'Enklare jobb som punktering kan som grov riktpunkt ligga kring 300–500 kr. Batteri-, elektronik- och motorjobb kan bli betydligt dyrare.', 'As a rough guide, simpler jobs such as a flat tire may be around SEK 300–500. Battery, electronics and motor work can cost significantly more.')),
    ],
    faq: (c, t) => [
      { q: copy(t, 'Kan alla cykelverkstäder laga elsparkcyklar?', 'Can every bike shop repair e-scooters?'), a: copy(t, 'Nej. Verktyg, reservdelar och elkompetens varierar. Verkstaden avgör själv om den kan ta just ditt jobb.', 'No. Tools, parts and electrical expertise vary. Each shop decides whether it can take your specific job.') },
      responseFaq(c, t),
    ],
    ogImage: '/og/elsparkcykel-reparation.jpg',
  },
  {
    slugStem: 'mobil-cykelreparation',
    whatSv: 'mobil cykelreparation', whatEn: 'mobile bike repair',
    h1: (c, t) => copy(t, 'Mobil cykelreparation i {city}', 'Mobile bike repair in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Mobil cykelreparation {city} — fråga om service på plats', 'Mobile bike repair {city} — ask about on-site service', { city: c.name }),
    description: (c, t) => copy(t, 'Behöver du mobil cykelreparation i {city}? Skicka ett gratis ärende och se om någon ansluten verkstad erbjuder hjälp på plats.', 'Need mobile bike repair in {city}? Send a free request and see whether a partnered shop offers on-site help.', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Så frågar du efter mobil service', 'How to ask for mobile service',
        'Beskriv felet, cykeln och platsen i ärendet. Om en ansluten verkstad erbjuder mobil service kan den svara med pris, möjlig tid och eventuellt restidstillägg.',
        'Describe the issue, bike and location in the request. If a partnered shop offers mobile service, it can reply with price, available time and any travel charge.'),
      section(t, 'Tillgängligheten varierar', 'Availability varies',
        'Cykelhjälpen lovar inte att mobil service finns i varje område. Utbudet beror på vilka verkstäder som är aktiva och vilka jobb de valt att ta.',
        'Cykelhjälpen does not promise mobile service in every area. Availability depends on which shops are active and which jobs they choose to take.'),
    ],
    faq: (c, t) => [responseFaq(c, t), freeFaq(t)],
  },
  {
    slugStem: 'vaxeljustering',
    whatSv: 'hjälp med växlarna', whatEn: 'help with bike gears',
    h1: (c, t) => copy(t, 'Växeljustering i {city}', 'Gear adjustment in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Växeljustering {city} — pris och lokal hjälp', 'Gear adjustment {city} — price and local help', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Vad kan orsaka dåliga växlar?', 'What can cause poor shifting?',
        'Feljusterad bakväxel, vajerspänning, böjt växelöra eller slitage på kedja och kassett kan ge hoppande eller tröga växlar.',
        'A misadjusted derailleur, cable tension, a bent hanger or wear on the chain and cassette can cause skipping or slow shifting.'),
      section(t, 'Riktpris', 'Guide price', guidePrice(t, 'En enklare justering kan som riktpunkt ligga omkring 200–400 kr. Delar och större felsökning tillkommer vid behov.', 'A simple adjustment may be around SEK 200–400 as a guide. Parts and more extensive troubleshooting may add to the cost.'), guidePrice(t, 'En enklare justering kan som riktpunkt ligga omkring 200–400 kr. Delar och större felsökning tillkommer vid behov.', 'A simple adjustment may be around SEK 200–400 as a guide. Parts and more extensive troubleshooting may add to the cost.')),
    ],
    faq: (c, t) => [responseFaq(c, t), freeFaq(t)],
  },
  {
    slugStem: 'bromsservice',
    whatSv: 'bromsservice', whatEn: 'brake service',
    h1: (c, t) => copy(t, 'Bromsservice för cykel i {city}', 'Bike brake service in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Bromsservice cykel {city} — belägg, justering och luftning', 'Bike brake service {city} — pads, adjustment and bleeding', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Skivbroms eller fälgbroms', 'Disc or rim brakes', 'Arbetet kan handla om bromsbelägg eller bromsskor, vajerjustering, rengöring eller luftning av hydrauliska bromsar.', 'The work may involve brake pads, rim pads, cable adjustment, cleaning or bleeding hydraulic brakes.'),
      section(t, 'Riktpris', 'Guide price', guidePrice(t, 'En enklare bromsservice kan som riktpunkt ligga omkring 250–500 kr. Hydraulisk luftning och reservdelar kan öka priset.', 'A simple brake service may be around SEK 250–500 as a guide. Hydraulic bleeding and parts can increase the price.'), guidePrice(t, 'En enklare bromsservice kan som riktpunkt ligga omkring 250–500 kr. Hydraulisk luftning och reservdelar kan öka priset.', 'A simple brake service may be around SEK 250–500 as a guide. Hydraulic bleeding and parts can increase the price.')),
    ],
    faq: (c, t) => [
      { q: copy(t, 'När bör bromsarna kontrolleras?', 'When should brakes be checked?'), a: copy(t, 'Sämre bromsverkan, skrapljud, läckage eller en bromsspak som känns onormalt mjuk är skäl att låta bromsarna bedömas innan fortsatt körning.', 'Reduced braking, scraping sounds, leaks or an unusually soft brake lever are reasons to have the brakes assessed before continued riding.') },
      responseFaq(c, t),
    ],
  },
  {
    slugStem: 'kedjebyte',
    whatSv: 'kedjebyte', whatEn: 'chain replacement',
    h1: (c, t) => copy(t, 'Kedjebyte på cykel i {city}', 'Bike chain replacement in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Kedjebyte cykel {city} — pris och slitagekontroll', 'Bike chain replacement {city} — price and wear check', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'När behöver kedjan bytas?', 'When does a chain need replacement?', 'Kedjans slitage beror på körsträcka, väder, rengöring och belastning. Ett kedjeslitagemått ger bättre besked än en fast milgräns.', 'Chain wear depends on distance, weather, cleaning and load. A chain-wear gauge gives better guidance than a fixed mileage limit.'),
      section(t, 'Riktpris', 'Guide price', guidePrice(t, 'Kedjebyte inklusive standardkedja kan som riktpunkt ligga omkring 300–600 kr. Kassett eller drev kan behöva bytas om de också är slitna.', 'Chain replacement including a standard chain may be around SEK 300–600 as a guide. The cassette or sprockets may also need replacement if worn.'), guidePrice(t, 'Kedjebyte inklusive standardkedja kan som riktpunkt ligga omkring 300–600 kr. Kassett eller drev kan behöva bytas om de också är slitna.', 'Chain replacement including a standard chain may be around SEK 300–600 as a guide. The cassette or sprockets may also need replacement if worn.')),
    ],
    faq: (c, t) => [responseFaq(c, t), freeFaq(t)],
  },
  {
    slugStem: 'dackbyte-cykel',
    whatSv: 'däckbyte', whatEn: 'tire replacement',
    h1: (c, t) => copy(t, 'Däckbyte på cykel i {city}', 'Bike tire replacement in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Däckbyte cykel {city} — däck, slang och montering', 'Bike tire replacement {city} — tire, tube and fitting', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Däck eller slang?', 'Tire or tube?', 'Vid punktering kan det räcka att laga eller byta slangen. Däck bör bedömas om de är spruckna, skadade eller tydligt utslitna.', 'For a flat tire, repairing or replacing the tube may be enough. Tires should be assessed if cracked, damaged or clearly worn.'),
      section(t, 'Riktpris', 'Guide price', guidePrice(t, 'Däckbyte per hjul kan som riktpunkt ligga omkring 300–600 kr beroende på däck, hjul och cykeltyp.', 'Tire replacement per wheel may be around SEK 300–600 as a guide, depending on the tire, wheel and bike type.'), guidePrice(t, 'Däckbyte per hjul kan som riktpunkt ligga omkring 300–600 kr beroende på däck, hjul och cykeltyp.', 'Tire replacement per wheel may be around SEK 300–600 as a guide, depending on the tire, wheel and bike type.')),
    ],
    faq: (c, t) => [responseFaq(c, t), freeFaq(t)],
  },
  {
    slugStem: 'hjul-och-ekrar',
    whatSv: 'hjälp med hjul och ekrar', whatEn: 'help with wheels and spokes',
    h1: (c, t) => copy(t, 'Hjul och ekrar — cykelverkstad i {city}', 'Wheels and spokes — bike shop in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Hjulriktning och ekerbyte cykel {city}', 'Wheel truing and spoke replacement {city}', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Skevt hjul eller trasig eker?', 'Bent wheel or broken spoke?', 'Ett skevt hjul kan ibland riktas genom att ekerspänningen justeras. Skadad fälg, flera trasiga ekrar eller navproblem kan kräva mer arbete.', 'A bent wheel can sometimes be trued by adjusting spoke tension. A damaged rim, multiple broken spokes or hub issues may require more work.'),
      section(t, 'Riktpris', 'Guide price', guidePrice(t, 'En enklare hjulriktning kan som riktpunkt ligga omkring 200–400 kr. Ekerbyte och större skador påverkar priset.', 'A simple wheel truing may be around SEK 200–400 as a guide. Spoke replacement and larger damage affect the price.'), guidePrice(t, 'En enklare hjulriktning kan som riktpunkt ligga omkring 200–400 kr. Ekerbyte och större skador påverkar priset.', 'A simple wheel truing may be around SEK 200–400 as a guide. Spoke replacement and larger damage affect the price.')),
    ],
    faq: (c, t) => [responseFaq(c, t), freeFaq(t)],
  },
  {
    slugStem: 'cykelmontering',
    whatSv: 'montering av en ny cykel', whatEn: 'assembly of a new bike',
    h1: (c, t) => copy(t, 'Cykelmontering i {city}', 'Bike assembly in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Cykelmontering {city} — montering och säkerhetskontroll', 'Bike assembly {city} — assembly and safety check', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Vad kan ingå?', 'What can be included?', 'Styre, sadel och pedaler kan behöva monteras, medan bromsar, växlar och hjul bör kontrolleras och justeras efter behov. Be verkstaden specificera vad som ingår.', 'Handlebars, saddle and pedals may need assembly, while brakes, gears and wheels should be checked and adjusted as needed. Ask the shop to specify what is included.'),
      section(t, 'Riktpris', 'Guide price', guidePrice(t, 'Montering av en cykel från kartong kan som riktpunkt ligga omkring 400–700 kr. Elcyklar och mer omfattande montering kan kosta mer.', 'Assembly of a boxed bike may be around SEK 400–700 as a guide. E-bikes and more extensive assembly can cost more.'), guidePrice(t, 'Montering av en cykel från kartong kan som riktpunkt ligga omkring 400–700 kr. Elcyklar och mer omfattande montering kan kosta mer.', 'Assembly of a boxed bike may be around SEK 400–700 as a guide. E-bikes and more extensive assembly can cost more.')),
    ],
    faq: (c, t) => [
      { q: copy(t, 'Hur lång tid tar monteringen?', 'How long does assembly take?'), a: copy(t, 'Tiden beror på cykelmodell, hur mycket som är förmonterat och verkstadens kö. Be om möjlig tid i verkstadens svar.', 'Timing depends on the bike model, how much is pre-assembled and the shop’s workload. Ask for available timing in the shop’s reply.') },
      responseFaq(c, t),
    ],
  },
  {
    slugStem: 'varservice-cykel',
    whatSv: 'vårservice av cykeln', whatEn: 'spring bike service',
    h1: (c, t) => copy(t, 'Vårservice för cykel i {city}', 'Spring bike service in {city}', { city: c.name }),
    title: (c, t) => copy(t, 'Vårservice cykel {city} — kontroll efter vintern', 'Spring bike service {city} — post-winter check', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Vad kan vara värt att kontrollera?', 'What is worth checking?', 'Bromsar, växlar, däck, hjul, drivlina, styrlager och synliga skador är vanliga kontrollpunkter efter vinterförvaring eller vintercykling.', 'Brakes, gears, tires, wheels, drivetrain, headset and visible damage are common checks after winter storage or winter riding.'),
      section(t, 'Riktpris', 'Guide price', guidePrice(t, 'En vårservice kan som riktpunkt ligga omkring 500–800 kr innan eventuella reservdelar.', 'A spring service may be around SEK 500–800 as a guide before any replacement parts.'), guidePrice(t, 'En vårservice kan som riktpunkt ligga omkring 500–800 kr innan eventuella reservdelar.', 'A spring service may be around SEK 500–800 as a guide before any replacement parts.')),
    ],
    faq: (c, t) => [responseFaq(c, t), freeFaq(t)],
  },
  {
    slugStem: 'vad-kostar-cykelreparation',
    whatSv: 'prisuppgifter för cykelreparation', whatEn: 'bike repair price information',
    h1: (c, t) => copy(t, 'Vad kostar cykelreparation i {city}?', 'What does bike repair cost in {city}?', { city: c.name }),
    title: (c, t) => copy(t, 'Vad kostar cykelreparation i {city}? Prisstatistik och riktpriser', 'What does bike repair cost in {city}? Price data and guide prices', { city: c.name }),
    description: (c, t) => copy(t, 'Se prisstatistik när det finns tillräckligt med faktiska offerter i {city}. När underlaget är litet visas tydligt märkta riktpriser i stället.', 'See price statistics when there are enough actual quotes in {city}. When the sample is small, clearly labelled guide prices are shown instead.', { city: c.name }),
    sections: (_c, t) => [
      section(t, 'Så ska prisuppgifterna läsas', 'How to read the price information', 'När minst tre relevanta offerter finns kan sidan visa sammanställd prisstatistik. Om underlaget inte räcker visas generella riktpriser och de märks som riktpris.', 'When at least three relevant quotes exist, the page can show aggregated price statistics. If there is not enough data, general guide prices are shown and labelled as guide prices.'),
      section(t, 'Varför priset varierar', 'Why prices vary', 'Cykeltyp, reservdelar, felsökning och arbetets omfattning påverkar priset. Det pris som gäller för just din cykel framgår först av verkstadens eget svar.', 'Bike type, parts, diagnostics and the scope of work affect the price. The price for your specific bike is only known from the shop’s own reply.'),
    ],
    faq: (c, t) => [
      { q: copy(t, 'Är priserna bindande?', 'Are the prices binding?'), a: copy(t, 'Nej. Statistik och riktpriser är vägledning. För pris på din cykel behöver en verkstad bedöma ditt ärende.', 'No. Statistics and guide prices are for guidance. A shop needs to assess your request for a price on your bike.') },
      responseFaq(c, t),
    ],
    variant: 'price-stats',
  },
]

const defaultDescription = (c: CykelCity, svc: ServiceDef, t: Tfn) => copy(t,
  'Behöver du {what} i {city}? Skicka ett kostnadsfritt ärende. Anslutna verkstäder kan svara med pris och möjlig tid när de har kapacitet.',
  'Need {what} in {city}? Send a free request. Partnered bike shops can reply with a price and available time when they have capacity.',
  { what: englishMode(t) ? svc.whatEn : svc.whatSv, city: c.name },
)

const buildService = (c: CykelCity, svc: ServiceDef, t: Tfn): CykelSeoPage => {
  const slug = `${svc.slugStem}-${c.slug}`
  return {
    slug,
    enSlug: `${EN_SLUG_STEMS[svc.slugStem] ?? svc.slugStem}-${c.slug}`,
    city: c.name,
    h1: svc.h1(c, t),
    title: svc.title(c, t),
    description: svc.description?.(c, t) ?? defaultDescription(c, svc, t),
    intro: localIntro(c, t, svc.whatSv, svc.whatEn),
    sections: svc.sections(c, t),
    faq: svc.faq?.(c, t) ?? [responseFaq(c, t), freeFaq(t)],
    variant: svc.variant,
    ogImage: svc.ogImage,
    noindex: isThinSeoFarmPage({ slug, city: c.name }),
  }
}

const buildDistrict = (c: CykelCity, district: string, t: Tfn): CykelSeoPage => ({
  slug: `cykelverkstad-${slugify(district)}-${c.slug}`,
  enSlug: `bike-shop-${slugify(district)}-${c.slug}`,
  city: c.name,
  noindex: isThinSeoFarmPage({ slug: `cykelverkstad-${slugify(district)}-${c.slug}`, city: c.name }),
  h1: copy(t, 'Cykelverkstad i {district}, {city}', 'Bike shop in {district}, {city}', { district, city: c.name }),
  title: copy(t, 'Cykelverkstad {district} {city} — lokal cykelhjälp', 'Bike shop {district} {city} — local bike repair help', { district, city: c.name }),
  description: copy(t, 'Behöver du cykelverkstad nära {district}, {city}? Beskriv problemet gratis. Anslutna verkstäder kan svara när de har kapacitet.', 'Need a bike shop near {district}, {city}? Describe the problem for free. Partnered bike shops can reply when they have capacity.', { district, city: c.name }),
  intro: `${copy(t, 'Bor eller arbetar du i {district}? Ange område eller postnummer i ärendet så kan en verkstad själv bedöma avstånd, möjlig tid och eventuell hämtning.', 'Live or work in {district}? Add your area or postal code so a shop can assess distance, available time and any pickup option itself.', { district })} ${marketStatus(c, t)}`,
  sections: [
    section(t, 'Cykelhjälp nära {district}', 'Bike repair near {district}', `${t(c.localIntro)} ${copy(t, 'Cykelhjälpen lovar inte täckning i en viss stadsdel; tillgängligheten avgörs av vilka anslutna verkstäder som är aktiva när ärendet skickas.', 'Cykelhjälpen does not promise coverage in a specific neighborhood; availability depends on which partnered shops are active when the request is sent.')}`, `${t(c.localIntro)} ${copy(t, 'Cykelhjälpen lovar inte täckning i en viss stadsdel; tillgängligheten avgörs av vilka anslutna verkstäder som är aktiva när ärendet skickas.', 'Cykelhjälpen does not promise coverage in a specific neighborhood; availability depends on which partnered shops are active when the request is sent.')}`, { district }),
    section(t, 'Vanliga jobb att beskriva i ärendet', 'Common jobs to describe in your request', 'Punktering, bromsar, växlar, kedja, däck, hjul, service och elcykelproblem är exempel på jobb du kan beskriva. Bilder och modelluppgifter gör det lättare för verkstaden att bedöma jobbet.', 'Flat tires, brakes, gears, chains, tires, wheels, service and e-bike issues are examples of jobs you can describe. Photos and model details help the shop assess the work.'),
  ],
  faq: [responseFaq(c, t), freeFaq(t)],
})

export const buildCykelSeoPages = (t: Tfn = identity): CykelSeoPage[] =>
  CYKEL_CITIES.flatMap((city) => [
    ...SERVICES.map((svc) => buildService(city, svc, t)),
    ...city.districts.map((district) => buildDistrict(city, district, t)),
  ])

export const CYKEL_SEO_PAGES: CykelSeoPage[] = buildCykelSeoPages()

export const seoPagePath = (page: Pick<CykelSeoPage, 'slug' | 'enSlug'>, lang: 'sv' | 'en') =>
  `/${lang === 'en' ? page.enSlug : page.slug}`

export const seoPageHref = (page: Pick<CykelSeoPage, 'slug' | 'enSlug'>, lang: 'sv' | 'en') =>
  lang === 'en' ? `/en/${page.enSlug}` : `/${page.slug}`
