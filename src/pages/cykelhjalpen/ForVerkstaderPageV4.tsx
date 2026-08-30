import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Check, MapPin, ShieldCheck, Sparkles, Store, Users, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import CykelHonestTrust from '@/components/cykelhjalpen/CykelHonestTrust'
import CykelOpenRequestsTeaser from '@/components/cykelhjalpen/CykelOpenRequestsTeaser'
import { formatKrFromOre, useV2Pricing } from '@/lib/v2/pricing'
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
  // Canonical pricing (contract §2.1): displayed fee = charged fee.
  const feeKr = formatKrFromOre(useV2Pricing().amountOre)
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
        <section className="relative overflow-hidden bg-hero-gradient">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 right-[-12%] h-72 w-72 rounded-full bg-[hsl(var(--brand-sun))]/20 blur-3xl"
          />
          <div className="container mx-auto px-4 py-10 md:py-20 max-w-6xl grid lg:grid-cols-[1fr_.9fr] gap-8 md:gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 text-accent px-3.5 py-1.5 text-sm font-semibold mb-5 md:mb-6">
                <Sparkles className="h-4 w-4" /> {copy.badge}
              </span>
              <h1 className="font-display text-[2.35rem] leading-[1.06] md:text-6xl tracking-tight">
                {copy.h1Lead}{' '}
                <span className="text-accent italic">{text('utan månadsavgift.', 'with no monthly fee.')}</span>
              </h1>
              <p className="mt-5 md:mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
                {text(
                  'Cykelhjälpen skickar relevanta kundärenden. Ni väljer själva om och när ni vill lämna prisförslag.',
                  'Cykelhjälpen sends relevant customer requests. You decide if and when to submit a quote.',
                )}
              </p>
              <div className="mt-6 rounded-[1.4rem] border-2 border-[hsl(var(--ink))] bg-background/80 p-5 max-w-2xl shadow-[3px_3px_0_hsl(var(--ink))]">
                <p className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {copy.networkTitle}
                </p>
                <p className="text-sm text-muted-foreground mt-2">{copy.networkBody}</p>
              </div>
              <Button asChild size="lg" className="mt-7 md:mt-8 rounded-full h-14 px-8 cta-playful">
                <Link to={registerHref} onClick={() => trackCta('hero')}>
                  {copy.heroCta} <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl">
                <div className="rounded-2xl border bg-card px-4 py-3">
                  <p className="font-display text-xl leading-none">0 kr/mån</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text('Ingen månadsavgift', 'No monthly fee')}</p>
                </div>
                <div className="rounded-2xl border bg-card px-4 py-3">
                  <p className="font-display text-xl leading-none">{text('2 första', 'First 2')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text('vinsterna gratis', 'wins are free')}</p>
                </div>
                <div className="rounded-2xl border bg-card px-4 py-3">
                  <p className="font-display text-xl leading-none">{feeKr} kr</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text('exkl. moms vid vinst därefter', 'excl. VAT on later wins')}</p>
                </div>
              </div>
            </div>

            <div className="relative pb-2 md:pb-8">
              <div className="rounded-[2rem] overflow-hidden sticker bg-card">
                <img
                  src={verkstadHero1200}
                  srcSet={`${verkstadHero640} 640w, ${verkstadHero1200} 1200w`}
                  alt={text('Cykelmekaniker i verkstad', 'Bike mechanic in a workshop')}
                  width={1200}
                  height={725}
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
              <div className="mt-4 md:mt-0 md:absolute md:-bottom-2 md:left-5 rounded-2xl border-2 border-[hsl(var(--ink))] bg-background p-5 shadow-[4px_4px_0_hsl(var(--ink))] max-w-sm">
                <p className="text-xs text-muted-foreground">{text('När kunden väljer er', 'When the customer chooses you')}</p>
                <p className="font-display text-3xl">{feeKr} kr</p>
                <p className="text-xs text-muted-foreground">{text('exkl. moms · efter gratisvinsterna', 'excl. VAT · after the free wins')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-background/70">
          <div className="container mx-auto px-4 py-6 max-w-6xl">
            <p className="text-center text-sm text-muted-foreground mb-3">{text('Välj marknaden ni arbetar i', 'Choose the market you work in')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {CYKEL_CITIES.map((candidate) => {
                const active = candidate.name === city
                return (
                  <Link
                    key={candidate.name}
                    to={`/for-cykelverkstader?stad=${candidate.slug}`}
                    onClick={() => trackClick('workshop_market_selected', candidate.name, { city: candidate.name })}
                    className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:border-primary/50'}`}
                  >
                    {candidate.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <CykelHonestTrust
          variant="workshop"
          ctaHref={registerHref}
          ctaLabel={copy.bottomCta}
          onCtaClick={() => trackCta('trust')}
        />

        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
              <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{text('I praktiken', 'In practice')}</p>
              <h2 className="font-display text-4xl md:text-5xl">{text('Ni tar jobben som passar er', 'Take the jobs that suit you')}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {benefits.map(([Icon, title, body]) => (
                <div key={title} className="sticker rounded-3xl bg-card p-6 md:p-7">
                  <span className="inline-flex rounded-2xl bg-primary/10 p-3 mb-5">
                    <Icon className="h-6 w-6 text-primary" />
                  </span>
                  <h3 className="font-display text-2xl">{title}</h3>
                  <p className="mt-2 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CykelOpenRequestsTeaser trackCta={trackCta} />

        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="sticker rounded-[2rem] bg-[hsl(var(--brand-dark))] text-background p-8 md:p-14 text-center">
              <Store className="h-11 w-11 mx-auto text-[hsl(var(--brand-sun))] mb-5" />
              <h2 className="font-display text-4xl md:text-5xl">{copy.bottomTitle}</h2>
              <p className="mt-5 text-background/70 text-lg max-w-2xl mx-auto">
                {text(
                  'Registreringen är gratis. Testa riktiga kundärenden och avgör själv om Cykelhjälpen skapar värde för verkstaden.',
                  'Registration is free. Try real customer requests and decide whether Cykelhjälpen creates value for your shop.',
                )}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1.5">
                  <Check className="h-3.5 w-3.5" />0 kr/mån
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1.5">
                  <Check className="h-3.5 w-3.5" />{text('2 första vinsterna gratis', 'First 2 wins free')}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1.5">
                  <Check className="h-3.5 w-3.5" />{text('Kunden väljer inne i Cykelhjälpen', 'The customer chooses inside Cykelhjälpen')}
                </span>
              </div>
              <Button asChild size="lg" className="mt-8 rounded-full h-14 px-10 bg-accent text-accent-foreground">
                <Link to={registerHref} onClick={() => trackCta('bottom')}>
                  {copy.bottomCta} <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <CykelFooter />
    </div>
  )
}

export default ForVerkstaderPageV4
