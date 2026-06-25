import { Link } from 'react-router-dom'
import { ArrowRight, Bike, Building2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const CYKEL_HOME_FAQS = [
  { q: 'Vad kostar det att skicka en förfrågan?', a: 'Det är helt gratis för dig som cyklist. Du förbinder dig inte att välja någon av verkstäderna som svarar.' },
  { q: 'Vilka städer finns Cykelhjälpen i?', a: 'Cykelhjälpen finns i Linköping, Norrköping, Uppsala och Lund.' },
  { q: 'Hur snabbt får jag svar?', a: 'Många verkstäder svarar samma vardag. Tiden beror på stad, säsong och typ av reparation.' },
  { q: 'Måste jag lämna in cykeln själv?', a: 'Nej. En del verkstäder erbjuder hämtning. Markera önskemålet i formuläret.' },
  { q: 'Hur väljs verkstäderna ut?', a: 'Verkstäder granskas manuellt innan de kan ta emot ärenden och lämna prisförslag.' },
]

interface Props {
  stats?: { workshops: number; requests: number; responses: number }
}

const CykelHomeTrust = ({ stats }: Props) => (
  <>
    <section className="py-20 bg-brand-cream/40">
      <div className="container mx-auto px-4 max-w-6xl grid lg:grid-cols-[1fr_.8fr] gap-8 items-center">
        <div className="rounded-[2rem] bg-brand-dark text-background p-8 md:p-12 sticker">
          <ShieldCheck className="h-9 w-9 text-brand-sun mb-5" />
          <h2 className="font-display text-4xl md:text-5xl">Tryggt för cyklisten. Relevant för verkstaden.</h2>
          <p className="mt-5 text-background/70 leading-relaxed">Vi granskar kundärenden och verkstäder. Verkstäder betalar först när de själva väljer att skicka ett prisförslag.</p>
          {stats && stats.workshops > 0 && (
            <p className="mt-6 text-sm text-background/70">{stats.workshops} godkända verkstäder · {stats.requests} mottagna ärenden</p>
          )}
        </div>

        <div className="sticker bg-card rounded-[2rem] p-8">
          <Building2 className="h-9 w-9 text-accent mb-5" />
          <h2 className="font-display text-3xl">Driver du cykelverkstad?</h2>
          <p className="text-muted-foreground mt-3">Registrera gratis, välj din stad och svara bara på ärenden som passar er.</p>
          <Button asChild className="mt-6"><Link to="/for-cykelverkstader">Se hur det fungerar <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
        </div>
      </div>
    </section>

    <section className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10"><h2 className="font-display text-4xl md:text-5xl">Vanliga frågor</h2></div>
        <div className="space-y-3">
          {CYKEL_HOME_FAQS.map(({ q, a }) => (
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
          <h2 className="font-display text-4xl md:text-5xl">Redo att få cykeln körbar igen?</h2>
          <p className="mt-4 text-muted-foreground">Formuläret tar omkring två minuter och är helt gratis.</p>
          <Button asChild size="lg" className="mt-8 rounded-full h-14 px-8"><Link to="/skicka-arende">Få prisförslag <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
        </div>
      </div>
    </section>
  </>
)

export default CykelHomeTrust
