import { Link } from 'react-router-dom'
import { ArrowRight, Building2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { honestTrustCopy, type HonestTrustVariant } from '@/lib/honestTrust'
import { useLanguage } from '@/lib/i18n'

type Props = {
  variant: HonestTrustVariant
  ctaHref?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

const CykelHonestTrust = ({ variant, ctaHref, ctaLabel, onCtaClick }: Props) => {
  const { lang } = useLanguage()
  const text = (sv: string, en: string) => (lang === 'en' ? en : sv)
  const copy = honestTrustCopy(variant, text)

  return (
    <section id="trygghet" className="relative scroll-mt-20 py-16 md:py-24 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[hsl(var(--brand-cream))]/55"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-[hsl(var(--brand-sun))]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-[-8%] h-56 w-56 rounded-full bg-[hsl(var(--brand-teal))]/15 blur-3xl"
      />

      <div className="container relative mx-auto px-4 max-w-6xl">
        <div className="max-w-2xl mb-8 md:mb-10">
          <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{copy.eyebrow}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">{copy.title}</h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{copy.intro}</p>
        </div>

        <div className="mb-8 md:mb-10">
          <p className="text-xs uppercase tracking-[.18em] text-muted-foreground font-semibold mb-3">{copy.pathLabel}</p>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {copy.path.map((step, index) => (
              <li
                key={`${step.value}-${step.label}`}
                className="relative rounded-[1.4rem] border-2 border-[hsl(var(--ink))] bg-card px-5 py-4 shadow-[3px_3px_0_hsl(var(--ink))]"
              >
                <span className="absolute top-3 right-4 font-display text-sm text-muted-foreground">{index + 1}</span>
                <p className="font-display text-2xl md:text-3xl pr-6">{step.value}</p>
                <p className="mt-1 text-sm text-muted-foreground leading-snug">{step.label}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {copy.facts.map((fact) => (
            <article key={fact.id} className="sticker rounded-3xl bg-card p-5 md:p-6">
              <p className="font-display text-3xl md:text-4xl tracking-tight">{fact.value}</p>
              <h3 className="mt-3 font-display text-xl leading-snug">{fact.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{fact.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 md:mt-10 sticker rounded-[1.8rem] bg-[hsl(var(--brand-dark))] text-background p-6 md:p-8 grid gap-6 md:grid-cols-[1fr_1fr_auto] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-background/60 font-semibold inline-flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-[hsl(var(--brand-sun))]" />
              {copy.companyTitle}
            </p>
            <p className="mt-2 font-display text-2xl md:text-3xl">{copy.companyBody}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-background/60 font-semibold inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[hsl(var(--brand-sun))]" />
              {copy.citiesTitle}
            </p>
            <p className="mt-2 text-background/80 leading-relaxed">{copy.citiesBody}</p>
          </div>
          {ctaHref ? (
            <Button asChild size="lg" className="rounded-full h-12 px-6 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to={ctaHref} onClick={onCtaClick}>
                {ctaLabel} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default CykelHonestTrust
