import { motion } from 'framer-motion'
import { Heart, MessageSquare, Wrench } from 'lucide-react'

const steps = [
  { icon: Wrench, title: 'Beskriv cykeln', text: 'Välj stad, cykeltyp och problem. Lägg gärna till bilder.' },
  { icon: MessageSquare, title: 'Ta emot prisförslag', text: 'Godkända verkstäder i den valda staden kan svara med pris och möjlig tid.' },
  { icon: Heart, title: 'Välj helt fritt', text: 'Jämför alternativen och kontakta den verkstad som passar dig bäst.' },
]

const CykelHowItWorks = () => (
  <section id="sa-fungerar-det" className="py-20 bg-background/60 scroll-mt-20">
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">Så fungerar det</p>
        <h2 className="font-display text-4xl md:text-5xl">Från problem till rätt verkstad i tre steg</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="sticker bg-card rounded-3xl p-7 border-2 border-foreground"
          >
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono text-sm text-muted-foreground">0{index + 1}</span>
              <span className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </span>
            </div>
            <h3 className="font-display text-2xl mb-2">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)

export default CykelHowItWorks
