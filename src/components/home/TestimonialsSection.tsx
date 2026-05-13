import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'

const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-[#F8FAFF] dark:bg-muted/20">
      <div className="container">
        <motion.div
          className="max-w-2xl mx-auto text-center bg-white dark:bg-card rounded-2xl border border-border p-10 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Nylanserad – bli en av de första
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Updro är precis igång. Vi samlar riktiga omdömen från våra första
            uppdragsgivare och byråer – och visar dem här så snart de finns.
          </p>
          <Link
            to="/publicera"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            Starta förfrågan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

export default TestimonialsSection
