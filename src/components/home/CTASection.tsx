import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CTASection = () => {
  return (
    <section className="py-20 bg-[#F8FAFF] dark:bg-muted/20">
      <motion.div
        className="container text-center max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">
          Redo att hitta rätt byrå?
        </h2>
        <p className="text-muted-foreground mb-8">
          Beskriv ditt projekt och få offerter från kvalitetssäkrade byråer – helt gratis.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/publicera">
            <motion.div whileHover={{ scale: 1.02 }}>
              <Button size="lg" className="bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl px-8 py-6 text-base font-semibold shadow-md">
                Starta din förfrågan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </Link>
          <Link to="/registrera/byra">
            <motion.div whileHover={{ scale: 1.02 }}>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5 rounded-xl px-8 py-6 text-base font-semibold">
                Registrera din byrå
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </section>
  )
}

export default CTASection
