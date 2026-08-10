import { motion } from 'framer-motion'
import { Heart, MessageSquare, Wrench } from 'lucide-react'
import { useT } from '@/lib/i18n'

const CykelHowItWorks = () => {
  const t = useT()
  const steps = [
    { icon: Wrench, title: t('Beskriv cykeln'), text: t('Välj stad, cykeltyp och problem. Lägg gärna till bilder.') },
    { icon: MessageSquare, title: t('Ta emot prisförslag'), text: t('Godkända verkstäder i den valda staden kan svara med pris och möjlig tid.') },
    { icon: Heart, title: t('Välj helt fritt'), text: t('Jämför alternativen och kontakta den verkstad som passar dig bäst.') },
  ]

  return (
  <section id="sa-fungerar-det" className="py-20 md:py-24 scroll-mt-20">
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{t('Så fungerar det')}</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">{t('Från problem till rätt verkstad i tre steg')}</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-secondary/60 p-8"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-6 -right-3 font-display text-[7rem] leading-none font-extrabold text-foreground/5 transition-colors group-hover:text-accent/15"
            >
              {index + 1}
            </span>
            <div className="relative z-10">
              <span className="inline-flex items-center justify-center rounded-2xl bg-primary p-3 mb-6">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </span>
              <h3 className="font-display text-xl font-bold mb-3">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>

  )
}

export default CykelHowItWorks
