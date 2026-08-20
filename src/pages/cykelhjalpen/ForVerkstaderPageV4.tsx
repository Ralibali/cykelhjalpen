import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Check, MapPin, ShieldCheck, Sparkles, Store, Users, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import CykelOpenRequestsTeaser from '@/components/cykelhjalpen/CykelOpenRequestsTeaser'
import { LEAD_FEE_KR } from '@/lib/pricing'
import { CYKEL_CITIES } from '@/lib/cykelCities'
import { resolveWorkshopLandingMarket, workshopLandingCopy } from '@/lib/workshopLanding'
import { trackClick } from '@/hooks/usePageTracking'
import { useLanguage } from '@/lib/i18n'
import { usePageSeo } from '@/i18n/usePageSeo'
import verkstadHero1200 from '@/assets/cykel-verkstad-hero-1200.webp'
import verkstadHero640 from '@/assets/cykel-verkstad-hero-640.webp'

const ForVerkstaderPageV4 = () => {
  const { lang } = useLanguage()
  const [searchParams] = useSearchParams()
  const pageSeo = usePageSeo('/for-cykelverkstader')
  const text = (sv: string, en: string) => lang === 'en' ? en : sv
  const { selected, registerHref } = resolveWorkshopLandingMarket(searchParams.get('stad'))
  const city = selected?.name
  const copy = workshopLandingCopy(selected, text)
  const trackCta = (placement: string) => trackClick('workshop_partner_cta', 'Founding Partner', { placement, city: city || 'alla' })

  const benefits = [
    [Users, text('Lokala kunder', 'Local customers'), text('Ta emot förfrågningar från personer som redan beskrivit vad som behöver lagas.', 'Receive requests from people who have already described what needs repairing.')],
    [Wrench, text('Välj jobben själv', 'Choose the jobs yourself'), text('Svara bara när jobbet passar er tid, kompetens och kapacitet.', 'Respond only when the job fits your time, skills and capacity.')],
    [ShieldCheck, text('Manuellt granskat', 'Manually reviewed'), text('Verkstäder och kundärenden granskas innan de släpps in i flödet.', 'Bike shops and customer requests are reviewed before entering the flow.')],
  ] as const

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{copy.title}</title>
        <meta name="description" content={copy.description} />
        <link rel="canonical" href={pageSeo.canonical} />
      </Helmet>
      <CykelNavbar />
      <main>
        <section className="bg-hero-gradient">
          <div className="container mx-auto px-4 py-14 md:py-20 max-w-6xl grid lg:grid-cols-[1fr_.9fr] gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 text-accent px-3.5 py-1.5 text-sm font-semibold mb-6"><Sparkles className="h-4 w-4" /> {copy.badge}</span>
              <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-[1.03]">{copy.h1Lead} <span className="text-accent italic">{text('utan månadsavgift.', 'with no monthly fee.')}</span></h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">{text('Cykelhjälpen skickar relevanta kundärenden. Ni väljer själva om och när ni vill lämna prisförslag.', 'Cykelhjälpen sends relevant customer requests. You decide if and when to submit a quote.')}</p>
              <div className="mt-7 rounded-2xl border-2 border-primary/30 bg-background/80 p-5 max-w-2xl">
                <p className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{copy.networkTitle}</p>
                <p className="text-sm text-muted-foreground mt-2">{copy.networkBody}</p>
              </div>
              <Button asChild size="lg" className="mt-8 rounded-full h-14 px-8"><Link to={registerHref} onClick={() => trackCta('hero')}>{copy.heroCta} <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />0 kr/mån</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{text('2 första vinsterna gratis', 'First 2 wins free')}</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{text('Ingen bindningstid', 'No commitment')}</span></div>
            </div>
            <div className="relative"><div className="rounded-[2rem] overflow-hidden sticker bg-card"><img src={verkstadHero1200} srcSet={`${verkstadHero640} 640w, ${verkstadHero1200} 1200w`} alt={text('Cykelmekaniker i verkstad', 'Bike mechanic in a workshop')} width={1200} height={725} className="w-full aspect-[4/3] object-cover" /></div><div className="absolute -bottom-5 left-5 rounded-2xl border bg-background/95 p-5 shadow-brand"><p className="text-xs text-muted-foreground">{text('När kunden väljer er', 'When the customer chooses you')}</p><p className="font-display text-3xl">{LEAD_FEE_KR} kr</p><p className="text-xs text-muted-foreground">{text('exkl. moms · efter gratisvinsterna', 'excl. VAT · after the free wins')}</p></div></div>
          </div>
        </section>

        <section className="border-y bg-background/70"><div className="container mx-auto px-4 py-6 max-w-6xl"><p className="text-center text-sm text-muted-foreground mb-3">{text('Välj marknaden ni arbetar i', 'Choose the market you work in')}</p><div className="flex flex-wrap justify-center gap-2">{CYKEL_CITIES.map((candidate) => { const active = candidate.name === city; return <Link key={candidate.name} to={`/for-cykelverkstader?stad=${candidate.slug}`} onClick={() => trackClick('workshop_market_selected', candidate.name, { city: candidate.name })} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:border-primary/50'}`}>{candidate.name}</Link> })}</div></div></section>

        <section className="py-16 md:py-20"><div className="container mx-auto px-4 max-w-6xl"><div className="text-center max-w-2xl mx-auto mb-10"><h2 className="font-display text-4xl md:text-5xl">{text('Ni tar jobben som passar er', 'Take the jobs that suit you')}</h2></div><div className="grid md:grid-cols-3 gap-5">{benefits.map(([Icon, title, body]) => <div key={title} className="sticker rounded-3xl bg-card p-7"><span className="inline-flex rounded-2xl bg-primary/10 p-3 mb-5"><Icon className="h-6 w-6 text-primary" /></span><h3 className="font-display text-2xl">{title}</h3><p className="mt-2 text-muted-foreground">{body}</p></div>)}</div></div></section>

        <CykelOpenRequestsTeaser trackCta={trackCta} />

        <section className="py-20"><div className="container mx-auto px-4 max-w-4xl"><div className="sticker rounded-[2rem] bg-[hsl(var(--brand-dark))] text-background p-9 md:p-14 text-center"><Store className="h-11 w-11 mx-auto text-[hsl(var(--brand-sun))] mb-5" /><h2 className="font-display text-4xl md:text-5xl">{copy.bottomTitle}</h2><p className="mt-5 text-background/70 text-lg max-w-2xl mx-auto">{text('Registreringen är gratis. Testa riktiga kundärenden och avgör själv om Cykelhjälpen skapar värde för verkstaden.', 'Registration is free. Try real customer requests and decide whether Cykelhjälpen creates value for your shop.')}</p><Button asChild size="lg" className="mt-8 rounded-full h-14 px-10 bg-accent text-accent-foreground"><Link to={registerHref} onClick={() => trackCta('bottom')}>{copy.bottomCta} <ArrowRight className="h-4 w-4 ml-2" /></Link></Button></div></div></section>
      </main>
      <CykelFooter />
    </div>
  )
}

export default ForVerkstaderPageV4
