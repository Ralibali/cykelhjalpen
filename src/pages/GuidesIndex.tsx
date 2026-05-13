import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, ArrowRight, Clock } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase } from '@/integrations/supabase/client'
import { setSEOMeta } from '@/lib/seoHelpers'
import { Skeleton } from '@/components/ui/skeleton'

const GuidesIndex = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Prisguider & tips – Vad kostar digitala tjänster? | Updro',
      description: 'Kompletta prisguider för webbutveckling, SEO, Google Ads, appar och mer. Lär dig vad digitala tjänster kostar i Sverige 2025.',
      canonical: 'https://updro.se/guider',
    })
  }, [])

  const { data: guides, isLoading } = useQuery({
    queryKey: ['guides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guides')
        .select('slug, title, description, category, reading_time_minutes, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-16 md:py-20">
          <div className="container max-w-4xl">
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold mb-4">
                <BookOpen className="h-3.5 w-3.5" />
                Guider & prisinfo
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold">
                Prisguider & tips
              </h1>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                Vad kostar en hemsida, SEO eller en app? Våra guider hjälper dig fatta rätt beslut innan du anlitar en byrå.
              </p>
            </motion.div>

            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {guides?.map((guide, i) => (
                  <motion.div
                    key={guide.slug}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <Link
                      to={`/guider/${guide.slug}`}
                      className="group block rounded-2xl border bg-card p-6 md:p-8 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {guide.category && (
                            <span className="text-xs font-semibold text-primary/70 mb-1 block">
                              {guide.category}
                            </span>
                          )}
                          <h2 className="font-display text-lg md:text-xl font-bold group-hover:text-primary transition-colors">
                            {guide.title}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {guide.description}
                          </p>
                          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {guide.reading_time_minutes} min läsning
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default GuidesIndex
