import { motion } from 'framer-motion'
import { CATEGORY_STYLES, BUDGET_LABELS, MAX_OFFERS_PER_PROJECT } from '@/lib/constants'
import { Link } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SlotsLeftIndicator from '@/components/SlotsLeftIndicator'
import VerificationBadges from '@/components/VerificationBadges'

const mockProjects = [
  { id: '1', title: 'Ny webbplats för advokatbyrå', category: 'Webbutveckling', budget_range: '50k_150k', created_at: new Date(Date.now() - 3600000 * 2).toISOString(), offer_count: 3, max_offers: 5, is_bankid_verified: true, is_phone_verified: true },
  { id: '2', title: 'E-handelslösning med Shopify', category: 'E-handel', budget_range: '10k_50k', created_at: new Date(Date.now() - 3600000 * 5).toISOString(), offer_count: 4, max_offers: 5, is_bankid_verified: false, is_phone_verified: true },
  { id: '3', title: 'Google Ads-kampanj för startup', category: 'Digital marknadsföring', budget_range: 'under_10k', created_at: new Date(Date.now() - 3600000 * 8).toISOString(), offer_count: 1, max_offers: 5, is_bankid_verified: true, is_phone_verified: false },
  { id: '4', title: 'UX-redesign av mobilapp', category: 'Grafisk design/UX', budget_range: '10k_50k', created_at: new Date(Date.now() - 3600000 * 12).toISOString(), offer_count: 5, max_offers: 5, is_bankid_verified: false, is_phone_verified: false },
  { id: '5', title: 'SEO-audit och optimering', category: 'SEO', budget_range: 'under_10k', created_at: new Date(Date.now() - 3600000 * 18).toISOString(), offer_count: 0, max_offers: 5, is_bankid_verified: true, is_phone_verified: true },
  { id: '6', title: 'AI-chatbot för kundservice', category: 'AI-utveckling', budget_range: 'over_150k', created_at: new Date(Date.now() - 3600000 * 24).toISOString(), offer_count: 2, max_offers: 5, is_bankid_verified: false, is_phone_verified: true },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just nu'
  if (hours < 24) return `${hours}h sedan`
  return `${Math.floor(hours / 24)}d sedan`
}

const LatestProjectsSection = () => {
  return (
    <section className="container py-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="inline-block rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-3">
            Nya uppdrag
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Senaste uppdragen
          </h2>
        </div>
        <Link to="/registrera/byra" className="text-primary hover:text-primary/80 font-medium text-sm hidden sm:inline-flex items-center gap-1">
          Registrera din byrå <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockProjects.map((project, i) => {
          const slotsLeft = (project.max_offers || MAX_OFFERS_PER_PROJECT) - (project.offer_count || 0)
          const isClosed = slotsLeft <= 0

          return (
            <motion.div
              key={project.id}
              className={`group rounded-2xl border bg-card p-5 hover:shadow-md hover:border-primary/20 transition-shadow duration-200 flex flex-col ${isClosed ? 'opacity-50' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLES[project.category] || ''}`}>
                  {project.category}
                </span>
                <SlotsLeftIndicator slotsLeft={slotsLeft} />
              </div>

              <h3 className="font-display font-semibold text-foreground text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {project.title}
              </h3>

              <VerificationBadges
                isBankIdVerified={project.is_bankid_verified}
                isPhoneVerified={project.is_phone_verified}
              />

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <span className="font-medium">{BUDGET_LABELS[project.budget_range]}</span>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50 mt-4">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />{timeAgo(project.created_at)}
                </span>
                {!isClosed && (
                  <Link to="/registrera/byra">
                    <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80 text-xs h-7 px-2">
                      Svara <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center mt-8 sm:hidden">
        <Link to="/registrera/byra" className="text-primary hover:text-primary/80 font-medium text-sm inline-flex items-center gap-1">
          Registrera din byrå <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

export default LatestProjectsSection
