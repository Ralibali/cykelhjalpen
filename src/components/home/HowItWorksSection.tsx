import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Beskriv ditt projekt',
    description: 'Berätta vad du behöver hjälp med – det tar två minuter. Ingen registrering krävs.',
    align: 'left' as const,
  },
  {
    number: '02',
    title: 'Matcha med byråer',
    description: 'Vi matchar din förfrågan med upp till fem kvalitetssäkrade byråer som passar ditt uppdrag och din budget.',
    align: 'right' as const,
  },
  {
    number: '03',
    title: 'Jämför och välj',
    description: 'Byråerna kontaktar dig direkt med offerter. Du jämför, ställer frågor och väljer den som passar bäst.',
    align: 'left' as const,
  },
]

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-surface-alt" id="hur-det-fungerar">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Så enkelt fungerar Updro
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-16 md:space-y-20">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className={`flex items-start gap-6 max-w-md ${
                step.align === 'right' ? 'md:ml-auto md:mr-0' : 'md:ml-0 md:mr-auto'
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="font-display text-6xl font-normal text-muted-foreground/40 leading-none shrink-0">
                {step.number}
              </span>
              <div className="pt-2">
                <h3 className="font-display text-2xl text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
