import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Globe, ShoppingCart, Search, Megaphone,
  Smartphone, Palette, Mail, BarChart2,
} from 'lucide-react'

const categories = [
  { icon: Globe, label: 'Webbutveckling', desc: 'Hemsidor, sajter, landningssidor', slug: 'webbutveckling' },
  { icon: ShoppingCart, label: 'E-handel', desc: 'Shopify, WooCommerce, Magento', slug: 'ehandel' },
  { icon: Search, label: 'SEO & sökmotoroptimering', desc: 'Organisk synlighet på Google', slug: 'seo' },
  { icon: Megaphone, label: 'Digital marknadsföring', desc: 'Meta Ads, Google Ads, sociala medier', slug: 'digital-marknadsforing' },
  { icon: Smartphone, label: 'Apputveckling', desc: 'iOS, Android, React Native', slug: 'app-utveckling' },
  { icon: Palette, label: 'Design & UX', desc: 'Grafisk profil, UI/UX, varumärke', slug: 'grafisk-design' },
  { icon: Mail, label: 'E-postmarknadsföring', desc: 'Nyhetsbrev, automation, CRM', slug: 'e-postmarknadsforing' },
  { icon: BarChart2, label: 'Analys & data', desc: 'Google Analytics, dashboards, BI', slug: 'analys-data' },
]

const CategoriesSection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-5xl text-foreground">
            Hitta rätt byrå för ditt uppdrag
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Välj kategori – vi matchar dig med rätt byråer automatiskt
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              className={i === 0 || i === categories.length - 1 ? 'md:col-span-2' : ''}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={`/publicera?kategori=${encodeURIComponent(cat.label)}`}
                className="group flex h-full flex-col items-start gap-3 rounded-2xl bg-card hover:bg-surface-alt p-6 transition-colors duration-200 hover:-translate-y-0.5 transition-transform"
              >
                <cat.icon className="h-7 w-7 text-foreground" strokeWidth={1.5} />
                <span className="font-display text-lg text-foreground leading-tight">{cat.label}</span>
                <span className="text-xs text-muted-foreground leading-snug">{cat.desc}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CategoriesSection
