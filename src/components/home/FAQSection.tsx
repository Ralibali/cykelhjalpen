import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    q: 'Kostar det något att använda Updro?',
    a: 'Helt gratis för dig som söker byrå. Byråer betalar endast vid genomfört avslut.',
  },
  {
    q: 'Hur snabbt får jag svar?',
    a: 'Byråerna förbinder sig att återkomma inom 24 timmar.',
  },
  {
    q: 'Hur väljs byråerna ut?',
    a: 'Vi granskar portfolio, referenskunder och leveranshistorik manuellt innan en byrå godkänns.',
  },
  {
    q: 'Måste jag registrera mig?',
    a: 'Nej, du kan lämna en förfrågan utan att skapa ett konto.',
  },
  {
    q: 'Vad händer med mina uppgifter?',
    a: 'Din förfrågan delas endast med de byråer du väljer att bli matchad med. Vi säljer aldrig dina uppgifter vidare.',
  },
]

const FAQSection = () => {
  return (
    <section className="py-20">
      <div className="container max-w-3xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Vanliga frågor
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-b border-border last:border-0"
              >
                <AccordionTrigger className="text-left font-display text-lg md:text-xl text-foreground hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>

      {/* FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </section>
  )
}

export default FAQSection
