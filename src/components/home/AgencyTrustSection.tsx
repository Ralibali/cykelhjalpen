import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ShieldCheck, Star, Clock, ArrowRight, MapPin, Plus } from 'lucide-react'

const trustBadges = [
  { icon: ShieldCheck, title: 'Granskade byråer', desc: 'Manuellt granskade innan godkännande' },
  { icon: Star, title: 'Verifierade recensioner', desc: 'Riktiga omdömen från riktiga kunder' },
  { icon: Clock, title: 'Svar inom 24 timmar', desc: 'Snabb återkoppling, garanterat' },
]

const foundingAgencies = [
  { name: 'Aurora Media AB', specialization: 'Digital marknadsföring & Webbutveckling', city: 'Linköping', badge: 'Grundare' },
]

const ease = [0.22, 1, 0.36, 1] as const

const AgencyTrustSection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Kvalitetssäkrade byråer – hela Sverige
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Alla byråer på Updro är granskade och godkända. Vi kontrollerar portfolio, referenskunder och leveranshistorik.
          </p>
        </motion.div>

        {/* Trust badges – horizontal row, no cards */}
        <div className="max-w-5xl mx-auto mb-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-y border-border py-10">
          {trustBadges.map((badge, i) => (
            <motion.div
              key={badge.title}
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1, ease }}
            >
              <badge.icon className="h-6 w-6 text-foreground shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-display text-base text-foreground leading-tight">{badge.title}</p>
                <p className="text-xs text-muted-foreground">{badge.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Founding agencies header */}
        <motion.h3
          className="font-display text-2xl md:text-3xl text-foreground text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          Första byråer ombord
        </motion.h3>

        {/* Agency cards – max 2 cols, centered */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {foundingAgencies.map((agency, i) => (
            <motion.div
              key={agency.name}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1, ease }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="font-display text-foreground text-base">
                      {agency.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-display text-base text-foreground leading-tight">{agency.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {agency.city}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  {agency.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{agency.specialization}</p>
            </motion.div>
          ))}

          {/* Add-card: Apply now */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15, ease }}
          >
            <Link
              to="/registrera/byra"
              className="group flex h-full min-h-[120px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-transparent p-6 text-center transition-colors hover:border-foreground hover:bg-surface-alt"
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-transform group-hover:scale-110">
                <Plus className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="font-display text-base text-foreground">Din byrå här?</p>
              <p className="text-xs text-muted-foreground mt-1">Ansök nu →</p>
            </Link>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Link to="/byraer" className="inline-flex items-center gap-2 text-foreground font-semibold underline underline-offset-4 decoration-1 hover:decoration-2 transition-all">
            Se alla byråer <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

export default AgencyTrustSection
