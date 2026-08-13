import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clock3, MapPin, Search, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackClick } from '@/hooks/usePageTracking'
import { useT } from '@/lib/i18n'

type Stats = { workshops: number; requests: number; responses: number }

export const CykelHomeSocialProof = ({ stats }: { stats?: Stats }) => {
  const t = useT()
  const items = [
    stats?.requests ? { value: stats.requests.toLocaleString('sv-SE'), label: t('inskickade cykelärenden') } : null,
    stats?.responses ? { value: stats.responses.toLocaleString('sv-SE'), label: t('lämnade prisförslag') } : null,
    { value: '0 kr', label: t('för dig som cyklist') },
    { value: t('Manuellt'), label: t('granskade verkstäder och ärenden') },
  ].filter(Boolean) as { value: string; label: string }[]

  return (
    <section className="border-y border-border/60 bg-background/70">
      <div className="container mx-auto px-4 py-7 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 text-center">
          {items.map((item) => (
            <div key={item.label}>
              <p className="font-display text-2xl md:text-3xl font-bold text-foreground">{item.value}</p>
              <p className="mt-1 text-xs md:text-sm text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const CykelQuoteComparisonPreview = () => {
  const t = useT()
  const quotes = [
    { name: t('Lokal verkstad A'), price: '349 kr', time: t('Möjlig tid idag'), detail: t('Slang och arbete ingår'), badge: t('Snabbast') },
    { name: t('Lokal verkstad B'), price: '425 kr', time: t('Tid imorgon'), detail: t('Fast pris efter beskrivningen'), badge: t('Populärt val') },
    { name: t('Lokal verkstad C'), price: '495 kr', time: t('Tid inom två dagar'), detail: t('Kan erbjuda hämtning'), badge: t('Hämtning') },
  ]

  return (
    <section className="py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl grid lg:grid-cols-[.8fr_1.2fr] gap-10 items-center">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{t('Se skillnaden innan du väljer')}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">{t('Tre svar blir mycket enklare att jämföra än tre telefonsamtal')}</h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{t('När verkstäder svarar samlar Cykelhjälpen pris, möjlig tid och viktig information på samma ställe. Du väljer själv om något alternativ känns rätt.')}</p>
          <div className="mt-7 space-y-3 text-sm">
            {[t('Samma beskrivning går till relevanta verkstäder'), t('Jämför pris och möjlig tid sida vid sida'), t('Ingen köpplikt och inget konto krävs')].map((text) => (
              <div key={text} className="flex items-center gap-3"><span className="rounded-full bg-primary/10 p-1"><Check className="h-4 w-4 text-primary" /></span>{text}</div>
            ))}
          </div>
          <Button asChild size="lg" className="mt-8 rounded-full h-14 px-8">
            <Link to="/skicka-arende" onClick={() => trackClick('home_v3_quote_preview_cta', 'Starta kostnadsfritt ärende')}>
              {t('Starta kostnadsfritt ärende')} <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 bg-primary/5 blur-3xl rounded-full" aria-hidden />
          <div className="relative rounded-[2rem] border border-border bg-card p-4 md:p-6 shadow-brand">
            <div className="flex items-center justify-between gap-4 mb-5 px-1">
              <div><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">{t('Exempel på jämförelse')}</p><p className="font-display text-xl mt-1">{t('Punktering · Linköping')}</p></div>
              <span className="text-xs rounded-full bg-primary/10 text-primary px-3 py-1.5 font-semibold">{t('Exempeldata')}</span>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {quotes.map((quote, index) => (
                <div key={quote.name} className={`rounded-2xl border p-5 ${index === 0 ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                  <span className="text-[11px] font-semibold rounded-full bg-secondary px-2.5 py-1">{quote.badge}</span>
                  <h3 className="font-display text-lg mt-4">{quote.name}</h3><p className="font-display text-3xl font-bold mt-2">{quote.price}</p>
                  <p className="mt-4 flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-primary" /> {quote.time}</p><p className="mt-2 text-sm text-muted-foreground">{quote.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">{t('Priserna ovan är illustrativa exempel och inte aktuella offerter.')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export const CykelWhyCompare = () => {
  const t = useT()
  return (
    <section className="py-20 md:py-24"><div className="container mx-auto px-4 max-w-6xl">
      <div className="text-center max-w-3xl mx-auto mb-12"><p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{t('Varför Cykelhjälpen?')}</p><h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{t('Mindre ringande. Bättre underlag för ditt val.')}</h2><p className="mt-4 text-muted-foreground text-lg">{t('Google är bra för att hitta namn. Cykelhjälpen är byggt för nästa steg: att beskriva jobbet en gång och få jämförbara svar.')}</p></div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-[2rem] border border-border bg-card p-7 md:p-9"><div className="flex items-center gap-3 mb-6"><Search className="h-6 w-6 text-muted-foreground" /><h3 className="font-display text-2xl">{t('Söka själv')}</h3></div><div className="space-y-4 text-muted-foreground"><p>{t('Sök efter verkstäder och öppna flera webbplatser.')}</p><p>{t('Kontakta verkstäder en i taget och förklara samma problem igen.')}</p><p>{t('Försök själv hålla reda på pris, tid och vad som ingår.')}</p></div></div>
        <div className="rounded-[2rem] border-2 border-primary bg-primary/5 p-7 md:p-9 shadow-brand"><div className="flex items-center gap-3 mb-6"><Sparkles className="h-6 w-6 text-primary" /><h3 className="font-display text-2xl">{t('Med Cykelhjälpen')}</h3></div><div className="space-y-4"><p className="flex gap-3"><Wrench className="h-5 w-5 text-primary shrink-0 mt-0.5" />{t('Beskriv cykeln och problemet en gång.')}</p><p className="flex gap-3"><Clock3 className="h-5 w-5 text-primary shrink-0 mt-0.5" />{t('Verkstäder som vill ha jobbet svarar med pris och möjlig tid.')}</p><p className="flex gap-3"><ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />{t('Jämför på samma ställe och välj helt fritt.')}</p></div></div>
      </div>
    </div></section>
  )
}

export const CykelMobileStickyCta = () => {
  const t = useT()
  const [visible, setVisible] = useState(false)
  useEffect(() => { const onScroll = () => setVisible(window.scrollY > 650); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll) }, [])
  if (!visible) return null
  return <div className="fixed inset-x-3 bottom-3 z-40 md:hidden"><div className="rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl p-2 flex items-center gap-2"><div className="pl-3 min-w-0 flex-1"><p className="text-xs text-muted-foreground truncate"><MapPin className="h-3 w-3 inline mr-1" />{t('Linköping är vår fokusstad just nu')}</p><p className="font-semibold text-sm">{t('Få prisförslag gratis')}</p></div><Button asChild className="rounded-xl shrink-0"><Link to="/skicka-arende?stad=linkoping" onClick={() => trackClick('home_mobile_sticky_cta', 'Få prisförslag')}>{t('Starta')} <ArrowRight className="h-4 w-4 ml-1" /></Link></Button></div></div>
}
