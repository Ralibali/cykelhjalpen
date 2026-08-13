import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clock3, MapPin, Search, ShieldCheck, Sparkles, Store, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CYKEL_CITIES, cityLandingPath } from '@/lib/cykelCities'
import { getCityImage } from '@/lib/cykelCityImages'
import { trackClick } from '@/hooks/usePageTracking'
import { useLanguage, useT } from '@/lib/i18n'
import { buildCykelHomeFaqs } from '@/components/cykelhjalpen/CykelHomeTrust'

type Stats = { workshops: number; requests: number; responses: number }

const useV3Text = () => {
  const { lang } = useLanguage()
  return (sv: string, en: string) => lang === 'en' ? en : sv
}

export const CykelV3SocialProof = ({ stats }: { stats?: Stats }) => {
  const text = useV3Text()
  const items = [
    stats?.requests ? { value: stats.requests.toLocaleString('sv-SE'), label: text('inskickade cykelärenden', 'bike requests submitted') } : null,
    stats?.responses ? { value: stats.responses.toLocaleString('sv-SE'), label: text('lämnade prisförslag', 'quotes submitted') } : null,
    { value: '0 kr', label: text('för dig som cyklist', 'for cyclists') },
    { value: text('Manuellt', 'Manual'), label: text('granskade verkstäder och ärenden', 'reviewed shops and requests') },
  ].filter(Boolean) as { value: string; label: string }[]

  return (
    <section className="border-y border-border/60 bg-background/70">
      <div className="container mx-auto px-4 py-7 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 text-center">
          {items.map((item) => <div key={item.label}><p className="font-display text-2xl md:text-3xl font-bold">{item.value}</p><p className="mt-1 text-xs md:text-sm text-muted-foreground">{item.label}</p></div>)}
        </div>
      </div>
    </section>
  )
}

export const CykelV3QuotePreview = () => {
  const text = useV3Text()
  const quotes = [
    { name: text('Lokal verkstad A', 'Local bike shop A'), price: '349 kr', time: text('Möjlig tid idag', 'Available today'), detail: text('Slang och arbete ingår', 'Tube and labour included'), badge: text('Snabbast', 'Fastest') },
    { name: text('Lokal verkstad B', 'Local bike shop B'), price: '425 kr', time: text('Tid imorgon', 'Available tomorrow'), detail: text('Fast pris efter beskrivningen', 'Fixed price based on the description'), badge: text('Populärt val', 'Popular choice') },
    { name: text('Lokal verkstad C', 'Local bike shop C'), price: '495 kr', time: text('Tid inom två dagar', 'Available within two days'), detail: text('Kan erbjuda hämtning', 'Pickup may be available'), badge: text('Hämtning', 'Pickup') },
  ]

  return (
    <section className="py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl grid lg:grid-cols-[.8fr_1.2fr] gap-10 items-center">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{text('Se skillnaden innan du väljer', 'See the difference before you choose')}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">{text('Tre svar är enklare att jämföra än tre telefonsamtal', 'Three responses are easier to compare than three phone calls')}</h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{text('När verkstäder svarar samlar Cykelhjälpen pris, möjlig tid och viktig information på samma ställe. Du väljer själv om något alternativ känns rätt.', 'When bike shops respond, Cykelhjälpen collects price, available time and key information in one place. You decide whether any option feels right.')}</p>
          <div className="mt-7 space-y-3 text-sm">
            {[text('Samma beskrivning går till relevanta verkstäder', 'The same description goes to relevant bike shops'), text('Jämför pris och möjlig tid sida vid sida', 'Compare price and available time side by side'), text('Ingen köpplikt och inget konto krävs', 'No obligation to buy and no account required')].map((item) => <div key={item} className="flex items-center gap-3"><span className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></span>{item}</div>)}
          </div>
          <Button asChild size="lg" className="mt-8 rounded-full h-14 px-8"><Link to="/skicka-arende?stad=linkoping" onClick={() => trackClick('home_v3_quote_preview_cta', 'Starta ärende')}>{text('Starta kostnadsfritt ärende', 'Start a free request')} <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
        </div>
        <div className="relative">
          <div className="absolute -inset-5 bg-primary/5 blur-3xl rounded-full" aria-hidden />
          <div className="relative rounded-[2rem] border border-border bg-card p-4 md:p-6 shadow-brand">
            <div className="flex items-center justify-between gap-4 mb-5 px-1"><div><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">{text('Exempel på jämförelse', 'Example comparison')}</p><p className="font-display text-xl mt-1">{text('Punktering · Linköping', 'Puncture · Linköping')}</p></div><span className="text-xs rounded-full bg-primary/10 text-primary px-3 py-1.5 font-semibold">{text('Exempeldata', 'Example data')}</span></div>
            <div className="grid md:grid-cols-3 gap-3">
              {quotes.map((quote, index) => <div key={quote.name} className={`rounded-2xl border p-5 ${index === 0 ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}><span className="text-[11px] font-semibold rounded-full bg-secondary px-2.5 py-1">{quote.badge}</span><h3 className="font-display text-lg mt-4">{quote.name}</h3><p className="font-display text-3xl font-bold mt-2">{quote.price}</p><p className="mt-4 flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-primary" /> {quote.time}</p><p className="mt-2 text-sm text-muted-foreground">{quote.detail}</p></div>)}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">{text('Priserna ovan är illustrativa exempel och inte aktuella offerter.', 'The prices above are illustrative examples and not current quotes.')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export const CykelV3WhyCompare = () => {
  const text = useV3Text()
  return (
    <section className="py-20 md:py-24"><div className="container mx-auto px-4 max-w-6xl">
      <div className="text-center max-w-3xl mx-auto mb-12"><p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{text('Varför Cykelhjälpen?', 'Why Cykelhjälpen?')}</p><h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{text('Mindre ringande. Bättre underlag för ditt val.', 'Fewer phone calls. Better information for your decision.')}</h2><p className="mt-4 text-muted-foreground text-lg">{text('Google är bra för att hitta namn. Cykelhjälpen är byggt för nästa steg: att beskriva jobbet en gång och få jämförbara svar.', 'Google is good for finding names. Cykelhjälpen is built for the next step: describe the job once and receive comparable responses.')}</p></div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-[2rem] border border-border bg-card p-7 md:p-9"><div className="flex items-center gap-3 mb-6"><Search className="h-6 w-6 text-muted-foreground" /><h3 className="font-display text-2xl">{text('Söka själv', 'Search on your own')}</h3></div><div className="space-y-4 text-muted-foreground"><p>{text('Sök efter verkstäder och öppna flera webbplatser.', 'Search for bike shops and open several websites.')}</p><p>{text('Kontakta verkstäder en i taget och förklara samma problem igen.', 'Contact bike shops one by one and explain the same problem again.')}</p><p>{text('Försök själv hålla reda på pris, tid och vad som ingår.', 'Keep track of price, timing and what is included yourself.')}</p></div></div>
        <div className="rounded-[2rem] border-2 border-primary bg-primary/5 p-7 md:p-9 shadow-brand"><div className="flex items-center gap-3 mb-6"><Sparkles className="h-6 w-6 text-primary" /><h3 className="font-display text-2xl">{text('Med Cykelhjälpen', 'With Cykelhjälpen')}</h3></div><div className="space-y-4"><p className="flex gap-3"><Wrench className="h-5 w-5 text-primary shrink-0 mt-0.5" />{text('Beskriv cykeln och problemet en gång.', 'Describe your bike and the problem once.')}</p><p className="flex gap-3"><Clock3 className="h-5 w-5 text-primary shrink-0 mt-0.5" />{text('Verkstäder som vill ha jobbet svarar med pris och möjlig tid.', 'Bike shops that want the job respond with price and available time.')}</p><p className="flex gap-3"><ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />{text('Jämför på samma ställe och välj helt fritt.', 'Compare everything in one place and choose freely.')}</p></div></div>
      </div>
    </div></section>
  )
}

export const CykelV3Cities = () => {
  const text = useV3Text()
  return (
    <section id="stader" className="py-20 scroll-mt-20"><div className="container mx-auto px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"><div><p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{text('Städer', 'Cities')}</p><h2 className="font-display text-4xl md:text-5xl">{text('Vi börjar starkast i Linköping – och bygger vidare', 'We are starting strongest in Linköping — and expanding')}</h2></div><p className="text-muted-foreground max-w-md">{text('Linköping är vår fokusstad just nu. I Norrköping, Uppsala och Lund bygger vi samtidigt upp nätverket av verkstäder.', 'Linköping is our focus city right now. At the same time, we are building the bike shop network in Norrköping, Uppsala and Lund.')}</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{CYKEL_CITIES.map((city) => { const image = getCityImage(city.name); const active = city.name === 'Linköping'; return <Link key={city.name} to={cityLandingPath(city.name)} onClick={() => trackClick('home_v3_city_clicked', city.name, { city: city.name, status: active ? 'focus' : 'building' })} className="group sticker bg-card rounded-3xl overflow-hidden hover:-translate-y-1 transition-transform"><div className="aspect-[4/3] overflow-hidden relative"><img src={image.small} alt={image.alt} width={640} height={387} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${active ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'}`}>{active ? text('Fokusstad', 'Focus city') : text('Nätverket byggs ut', 'Network expanding')}</span></div><div className="p-5"><h3 className="font-display text-2xl">{city.name}</h3><p className="text-sm text-muted-foreground mt-1.5">{active ? text('Skicka ett kostnadsfritt ärende och jämför lokala svar.', 'Send a free request and compare local responses.') : text('Lokala guider finns kvar medan vi rekryterar fler verkstäder.', 'Local guides remain available while we recruit more bike shops.')}</p><span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4">{text('Läs om cykelhjälp i ', 'Bike help in ')}{city.name}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></Link> })}</div>
    </div></section>
  )
}

export const CykelV3WorkshopRecruitment = () => {
  const text = useV3Text()
  return (
    <section className="py-20 bg-[hsl(var(--brand-cream))]/40"><div className="container mx-auto px-4 max-w-5xl"><div className="sticker rounded-[2rem] bg-[hsl(var(--brand-dark))] text-background p-8 md:p-12 grid md:grid-cols-[1fr_auto] gap-8 items-center"><div><span className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1.5 text-xs font-semibold mb-5"><Sparkles className="h-3.5 w-3.5 text-[hsl(var(--brand-sun))]" /> Founding Partner</span><h2 className="font-display text-4xl md:text-5xl">{text('Driver du cykelverkstad?', 'Do you run a bike shop?')}</h2><p className="mt-4 text-background/70 text-lg max-w-2xl">{text('Vi söker fler partnerverkstäder, särskilt i Linköping. Registreringen är gratis, ni väljer själva vilka jobb ni vill svara på och de två första vunna kunderna är gratis.', 'We are looking for more partner bike shops, especially in Linköping. Registration is free, you choose which jobs to respond to, and your first two won customers are free.')}</p><div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-background/10 px-3 py-1.5">0 kr/mån</span><span className="rounded-full bg-background/10 px-3 py-1.5">{text('Två första vinsterna gratis', 'First two wins free')}</span><span className="rounded-full bg-background/10 px-3 py-1.5">{text('Ingen bindningstid', 'No commitment')}</span></div></div><Button asChild size="lg" className="rounded-full h-14 px-8 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/for-cykelverkstader" onClick={() => trackClick('home_v3_workshop_cta', 'Founding Partner')}><Store className="h-4 w-4 mr-2" />{text('Bli partnerverkstad', 'Become a partner shop')} <ArrowRight className="h-4 w-4 ml-2" /></Link></Button></div></div></section>
  )
}

export const CykelV3FaqAndFinalCta = () => {
  const t = useT()
  const text = useV3Text()
  const faqs = buildCykelHomeFaqs(t)
  return (
    <><section id="vanliga-fragor" className="py-20 scroll-mt-20"><div className="container mx-auto px-4 max-w-3xl"><div className="text-center mb-10"><h2 className="font-display text-4xl md:text-5xl">{text('Vanliga frågor', 'Frequently asked questions')}</h2></div><div className="space-y-3">{faqs.map(({ q, a }) => <details key={q} className="group rounded-2xl bg-card p-5 sticker"><summary className="flex items-center justify-between cursor-pointer font-display text-lg">{q}<span className="text-accent group-open:rotate-45 transition-transform text-3xl">+</span></summary><p className="mt-3 text-muted-foreground leading-relaxed">{a}</p></details>)}</div></div></section><section className="pb-28"><div className="container mx-auto px-4"><div className="max-w-3xl mx-auto sticker rounded-[2rem] bg-card p-10 md:p-14 text-center"><ShieldCheck className="h-10 w-10 mx-auto text-primary mb-5" /><h2 className="font-display text-4xl md:text-5xl">{text('Redo att få cykeln körbar igen?', 'Ready to get your bike rolling again?')}</h2><p className="mt-4 text-muted-foreground">{text('Formuläret tar omkring två minuter och är helt gratis.', 'The form takes about two minutes and is completely free.')}</p><Button asChild size="lg" className="mt-8 rounded-full h-14 px-8"><Link to="/skicka-arende?stad=linkoping" onClick={() => trackClick('home_v3_final_cta', 'Få prisförslag')}>{text('Få prisförslag gratis', 'Get a free quote')} <ArrowRight className="h-4 w-4 ml-2" /></Link></Button></div></div></section></>
  )
}

export const CykelV3MobileSticky = () => {
  const text = useV3Text()
  const [visible, setVisible] = useState(false)
  useEffect(() => { const onScroll = () => setVisible(window.scrollY > 650); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])
  if (!visible) return null
  return <div className="fixed inset-x-3 bottom-3 z-40 md:hidden"><div className="rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl p-2 flex items-center gap-2"><div className="pl-3 min-w-0 flex-1"><p className="text-xs text-muted-foreground truncate"><MapPin className="h-3 w-3 inline mr-1" />{text('Linköping är fokusstad', 'Linköping is the focus city')}</p><p className="font-semibold text-sm">{text('Få prisförslag gratis', 'Get a free quote')}</p></div><Button asChild className="rounded-xl shrink-0"><Link to="/skicka-arende?stad=linkoping" onClick={() => trackClick('home_v3_mobile_sticky', 'Starta')}>{text('Starta', 'Start')} <ArrowRight className="h-4 w-4 ml-1" /></Link></Button></div></div>
}
