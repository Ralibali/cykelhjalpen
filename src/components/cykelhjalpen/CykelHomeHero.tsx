import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import heroImg from '@/assets/cykel-hero.jpg'
import { trackClick } from '@/hooks/usePageTracking'

const CykelHomeHero = () => (
  <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
    <div className="container mx-auto px-4">
      <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link
            to="/cykelverkstad-linkoping"
            onClick={() => trackClick('home_local_page_clicked', 'Cykelverkstad i Linköping')}
            className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium mb-6 hover:bg-card transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" /> Lanseras lokalt i Linköping
          </Link>

          <h1 className="font-display text-5xl md:text-7xl font-medium leading-[.96] tracking-tight">
            Trasig cykel? <span className="italic text-accent">Jämför innan du väljer.</span>
          </h1>

          <p className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Beskriv problemet en gång och få pris, tid och kontaktuppgifter från anslutna cykelverkstäder i Linköping. <strong className="text-foreground">Gratis för dig som cyklist.</strong>
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="cta-playful h-14 px-7 rounded-full shadow-brand">
              <Link
                to="/skicka-arende?stad=Link%C3%B6ping"
                onClick={() => trackClick('home_primary_cta_clicked', 'Få prisförslag gratis', { city: 'Linköping' })}
              >
                Få prisförslag gratis <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-7 rounded-full border-2">
              <a href="#sa-fungerar-det" onClick={() => trackClick('home_how_it_works_clicked', 'Så fungerar det')}>Så fungerar det</a>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> Inget konto</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> Upp till fem svar</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> Ingen köpplikt</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7, delay: .15 }} className="relative">
          <div className="rounded-[2rem] overflow-hidden sticker bg-card">
            <img src={heroImg} alt="Cykel redo för reparation hos lokal verkstad i Linköping" width={1920} height={1080} fetchPriority="high" className="w-full aspect-[4/3] object-cover" />
          </div>
          <div className="absolute -bottom-5 left-4 right-4 sm:left-8 sm:right-auto sm:w-80 rounded-2xl bg-background/95 backdrop-blur border-2 border-foreground p-4 sticker">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Så enkelt är det</p>
            <p className="font-display text-lg">Ett formulär. Flera lokala alternativ. Du väljer själv.</p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
)

export default CykelHomeHero
