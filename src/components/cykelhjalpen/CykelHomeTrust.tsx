import { Link } from 'react-router-dom'
import { ArrowRight, Bike, Building2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LEAD_FEE_KR } from '@/lib/pricing'
import { formatKrFromOre, useV2Pricing } from '@/lib/v2/pricing'
import { useT, type TFunction } from '@/lib/i18n'

// feeKr defaults to the pinned live constant (50 kr) so static/prerender
// exports stay correct; the component passes the canonical v2 pricing value.
export const buildCykelHomeFaqs = (t: TFunction = (s) => s, feeKr: string | number = LEAD_FEE_KR) => [
  { q: t('Vad kostar det att skicka en förfrågan?'), a: t('Det är helt gratis för dig som cyklist. Du förbinder dig inte att välja någon av verkstäderna som svarar.') },
  { q: t('Vilka städer finns Cykelhjälpen i?'), a: t('Cykelhjälpen finns i Linköping, Norrköping, Uppsala och Lund.') },
  { q: t('Hur snabbt får jag svar?'), a: t('Svarstiden beror på stad, säsong, typ av reparation och vilka verkstäder som har kapacitet. Du får ett mejl när ett nytt prisförslag finns.') },
  { q: t('Måste jag lämna in cykeln själv?'), a: t('Inte alltid. En del verkstäder kan erbjuda hämtning. Markera önskemålet i formuläret så ser verkstäderna det.') },
  { q: t('Hur väljs verkstäderna ut?'), a: t('Verkstäder granskas manuellt innan de kan ta emot ärenden och lämna prisförslag.') },
  { q: t('Vad kostar det för verkstaden att lämna offert?'), a: t('Ingenting. Det är helt gratis att svara på ett ärende. Verkstaden betalar {fee} kronor exklusive moms först när du väljer deras offert som vinnare – vinner de inte kostar det inget.', { fee: feeKr }) },
  { q: t('Vad händer när jag väljer en vinnare?'), a: t('Du väljer den offert du gillar bäst. Då får du verkstadens kontaktuppgifter och verkstaden får ditt ärende – först i det läget dras avgiften från verkstaden. Du betalar fortfarande ingenting till Cykelhjälpen.') },
  { q: t('Hur många svar kan jag få?'), a: t('Upp till tre verkstäder kan skicka prisförslag på samma ärende. När tre svar kommit in stängs ärendet för fler svar, så att du får ett tydligt urval att jämföra utan att behöva sålla bland tiotals offerter.') },
  { q: t('Vad händer om ingen verkstad svarar?'), a: t('Då kostar det dig ingenting och du kan skicka in ärendet igen eller justera beskrivningen. Vi hör av oss via mejl om ärendet blir liggande utan svar.') },
]

export const CYKEL_HOME_FAQS = buildCykelHomeFaqs()

interface Props {
  stats?: { workshops: number; requests: number; responses: number }
}

const CykelHomeTrust = ({ stats }: Props) => {
  const t = useT()
  // Canonical pricing (contract §2.1): displayed fee = charged fee.
  const feeKr = formatKrFromOre(useV2Pricing().amountOre)
  const faqs = buildCykelHomeFaqs(t, feeKr)
  return (
    <>
      <section className="py-20 bg-[hsl(var(--brand-cream))]/40">
        <div className="container mx-auto px-4 max-w-6xl grid lg:grid-cols-[1fr_.8fr] gap-8 items-center">
          <div className="rounded-[2rem] bg-[hsl(var(--brand-dark))] text-background p-8 md:p-12 sticker">
            <ShieldCheck className="h-9 w-9 text-[hsl(var(--brand-sun))] mb-5" />
            <h2 className="font-display text-4xl md:text-5xl">{t('Tryggt för cyklisten. Relevant för verkstaden.')}</h2>
            <p className="mt-5 text-background/70 leading-relaxed">{t('Vi granskar kundärenden och verkstäder. Det kostar inget att lämna prisförslag – verkstaden betalar först när kunden väljer deras offert.')}</p>
            {stats && stats.workshops >= 3 && stats.requests >= 10 && (
              <p className="mt-6 text-sm text-background/70">{t('{workshops} godkända verkstäder · {requests} mottagna ärenden · {responses} skickade prisförslag', { workshops: stats.workshops, requests: stats.requests, responses: stats.responses })}</p>
            )}
          </div>

          <div className="sticker bg-card rounded-[2rem] p-8">
            <Building2 className="h-9 w-9 text-accent mb-5" />
            <h2 className="font-display text-3xl">{t('Driver du cykelverkstad?')}</h2>
            <p className="text-muted-foreground mt-3">{t('Registrera gratis, välj din stad och svara bara på ärenden som passar er.')}</p>
            <Button asChild className="mt-6"><Link to="/for-cykelverkstader">{t('Se hur det fungerar')} <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
          </div>
        </div>
      </section>

      <section id="vanliga-fragor" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10"><h2 className="font-display text-4xl md:text-5xl">{t('Vanliga frågor')}</h2></div>
          <div className="space-y-3">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group rounded-2xl bg-card p-5 sticker">
                <summary className="flex items-center justify-between cursor-pointer font-display text-lg">{q}<span className="text-accent group-open:rotate-45 transition-transform text-3xl">+</span></summary>
                <p className="mt-3 text-muted-foreground leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto sticker rounded-[2rem] bg-card p-10 md:p-14 text-center">
            <Bike className="h-10 w-10 mx-auto text-primary mb-5" />
            <h2 className="font-display text-4xl md:text-5xl">{t('Redo att få cykeln körbar igen?')}</h2>
            <p className="mt-4 text-muted-foreground">{t('Formuläret tar omkring två minuter och är helt gratis.')}</p>
            <Button asChild size="lg" className="mt-8 rounded-full h-14 px-8"><Link to="/skicka-arende">{t('Få prisförslag')} <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
          </div>
        </div>
      </section>
    </>
  )
}

export default CykelHomeTrust
