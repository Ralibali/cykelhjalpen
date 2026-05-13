import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { PLANS, TRIAL_LEADS, TRIAL_DAYS } from '@/lib/constants'
import { Check, Gift, ArrowRight } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { setSEOMeta } from '@/lib/seoHelpers'

const PricingPage = () => {
  const [tab, setTab] = useState<'supplier' | 'buyer'>('supplier')

  useEffect(() => {
    setSEOMeta({
      title: 'Priser – Updro | Transparent prissättning för byråer',
      description: 'Se Updros priser för byråer. Pay-per-lead från 119 kr (öppningserbjudande) eller månadskort 1 995 kr/mån för obegränsade leads. Inga dolda avgifter, inga bindningstider.',
      canonical: 'https://updro.se/priser',
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container">
            <span className="inline-block bg-accent/10 text-accent rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              Enklast i Sverige
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold">Transparent prissättning</h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Inga dolda avgifter, inga bindningstider.</p>

            <div className="flex justify-center mt-8">
              <div className="inline-flex bg-muted rounded-xl p-1">
                <button onClick={() => setTab('supplier')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'supplier' ? 'bg-card shadow-sm' : ''}`}>
                  För byråer
                </button>
                <button onClick={() => setTab('buyer')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'buyer' ? 'bg-card shadow-sm' : ''}`}>
                  För beställare
                </button>
              </div>
            </div>
          </div>
        </section>

        {tab === 'supplier' ? (
          <>
            {/* Campaign banner */}
            <section className="container mb-12">
              <div className="bg-mint-gradient rounded-2xl p-6 md:p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="h-5 w-5 text-accent" />
                  <span className="font-display font-bold text-lg">Ny byrå?</span>
                </div>
                <p className="text-muted-foreground mb-4">
                  Starta med {TRIAL_LEADS} gratis leads – inget kreditkort!
                </p>
                <Link to="/registrera/byra">
                  <Button className="bg-accent hover:bg-brand-mint-hover text-accent-foreground rounded-full px-6">
                    Kom igång gratis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </section>

            {/* Plans */}
            <section className="container mb-16">
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {PLANS.map(plan => (
                  <div key={plan.id} className={`bg-card rounded-2xl border p-6 relative flex flex-col ${plan.highlighted ? 'border-primary shadow-lg ring-2 ring-primary/20 scale-105' : ''}`}>
                    {plan.highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold rounded-full px-3 py-1">
                        {plan.badge}
                      </span>
                    )}
                    <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-4xl font-bold">{plan.price.toLocaleString('sv-SE')}</span>
                      <span className="text-muted-foreground ml-1">kr {plan.per}</span>
                    </div>
                    {plan.id === 'monthly' && (
                      <p className="text-sm text-muted-foreground mb-4 -mt-2">
                        Bara ~100 kr/dag för obegränsat antal leads
                      </p>
                    )}
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/registrera/byra" className="mt-auto">
                      <Button className={`w-full rounded-xl ${plan.highlighted ? 'bg-primary hover:bg-primary/90' : ''}`} variant={plan.highlighted ? 'default' : 'outline'}>
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* Comparison */}
            <section className="container mb-16">
              <h2 className="font-display text-2xl font-bold text-center mb-8">Updro vs. Konkurrenterna</h2>
              <div className="max-w-2xl mx-auto bg-card rounded-2xl border overflow-hidden">
                <div className="grid grid-cols-3 text-center">
                  <div className="p-4 border-b" />
                  <div className="p-4 border-b bg-primary text-primary-foreground font-display font-bold">Updro</div>
                  <div className="p-4 border-b bg-muted font-display font-semibold text-muted-foreground">Andra</div>
                </div>
                {[
                  ['Månadskort', '1 995 kr/mån', '4 990+ kr/mån'],
                  ['Lead-pris (styck)', '119 kr (öppningserbjudande)', '490+ kr'],
                  ['Obegränsade leads', 'Ja (månadskort)', 'Nej'],
                  ['Gratis leads', 'Fem st', '0 st'],
                  ['Bindningstid', 'Nej', 'Ofta 3–12 mån'],
                  ['Kvalitetskontroll', 'Ja', 'Nej'],
                ].map(([label, updro, other]) => (
                  <div key={label as string} className="grid grid-cols-3 text-center text-sm border-b last:border-0">
                    <div className="p-3 text-left font-medium">{label}</div>
                    <div className="p-3 bg-primary/5 font-semibold text-primary">{updro}</div>
                    <div className="p-3 text-muted-foreground">{other}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section className="container mb-16 max-w-2xl mx-auto">
              <h2 className="font-display text-2xl font-bold text-center mb-8">Vanliga frågor</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {[
                  ['Vad innebär månadskortet?', 'Med månadskortet (1 995 kr/mån) kan du svara på alla tillgängliga leads utan begränsning. Perfekt om du vill maximera antalet uppdrag. Ingen bindningstid – avsluta när som helst.'],
                  ['Hur fungerar pay-per-lead?', 'Med pay-per-lead betalar du 119 kr per lead du väljer att låsa upp (öppningserbjudande). Du ser uppdragsbeskrivning, kategori och ort innan du bestämmer dig.'],
                  ['Vad är ett lead?', 'Ett lead är ett publicerat uppdrag från en beställare. När du låser upp ett lead ser du fullständig kontaktinfo och kan skicka en offert.'],
                  ['Hur fungerar de gratis leads?', 'När du registrerar dig som byrå får du automatiskt fem gratis leads. Varje gång du låser upp ett uppdrag dras en kredit.'],
                  ['Kan jag avbryta abonnemanget?', 'Ja, du kan avbryta när som helst via din profilsida. Det finns inga bindningstider.'],
                  ['Vilka betalningsmetoder accepteras?', 'Vi accepterar kort (Visa, Mastercard) via Stripe.'],
                ].map(([q, a]) => (
                  <AccordionItem key={q} value={q} className="bg-card rounded-xl border px-4">
                    <AccordionTrigger className="text-sm font-medium">{q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </>
        ) : (
          <section className="container mb-16 text-center">
            <div className="max-w-lg mx-auto bg-card rounded-2xl border p-8">
              <h2 className="font-display text-3xl font-bold mb-2">100% gratis – alltid</h2>
              <p className="text-muted-foreground mb-6">Som beställare betalar du aldrig något.</p>
              <ul className="space-y-3 text-left max-w-xs mx-auto mb-6">
                {['Publicera obegränsat antal uppdrag', 'Ta emot offerter från kvalificerade byråer', 'Chatta direkt med byråer', 'Valfritt betalningsskydd via escrow'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/publicera">
                <Button className="bg-accent hover:bg-brand-mint-hover text-accent-foreground rounded-full px-6">
                  Publicera ditt uppdrag <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default PricingPage
