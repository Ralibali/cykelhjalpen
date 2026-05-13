import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const buyerBullets = [
  'Gratis att använda',
  'Upp till fem offerter',
  'Jämför priser & portfolio',
  'Ingen registrering krävs',
]

const supplierBullets = [
  'Nå nya kunder',
  'Välj uppdrag som passar er',
  'Gratis basregistrering',
  'Betala bara per avslut',
]

const TwoSidedSection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <motion.h2
          className="font-display text-3xl md:text-5xl text-center mb-14 text-foreground"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Oavsett vilken sida du är på
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Buyer side */}
          <motion.div
            className="rounded-2xl bg-foreground text-background p-8 md:p-10"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="font-display text-3xl mb-6">Hitta byrå</h3>
            <ul className="space-y-3 mb-8">
              {buyerBullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-brand-mint shrink-0" strokeWidth={2} />
                  {b}
                </li>
              ))}
            </ul>
            <Link to="/publicera">
              <motion.div whileHover={{ scale: 1.02 }} className="inline-block">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl px-6 font-semibold">
                  Starta din förfrågan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Supplier side */}
          <motion.div
            className="rounded-2xl border border-border bg-surface-alt p-8 md:p-10"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="font-display text-3xl mb-6 text-foreground">Registrera din byrå</h3>
            <ul className="space-y-3 mb-8">
              {supplierBullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 text-foreground shrink-0" strokeWidth={2} />
                  {b}
                </li>
              ))}
            </ul>
            <Link to="/registrera/byra">
              <Button variant="ghost" className="px-0 text-foreground hover:bg-transparent hover:text-foreground font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                Ansök som byrå
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default TwoSidedSection
