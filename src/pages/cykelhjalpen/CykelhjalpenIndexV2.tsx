import { lazy, Suspense } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import CykelHomeHero from '@/components/cykelhjalpen/CykelHomeHero'
import { CYKEL_HOME_FAQS } from '@/components/cykelhjalpen/CykelHomeTrust'
import { supabase } from '@/integrations/supabase/client'

const CykelHowItWorks = lazy(() => import('@/components/cykelhjalpen/CykelHowItWorks'))
const CykelCitiesSection = lazy(() => import('@/components/cykelhjalpen/CykelCitiesSection'))
const CykelHomeTrust = lazy(() => import('@/components/cykelhjalpen/CykelHomeTrust'))
const SectionFallback = () => <div aria-hidden className="min-h-[240px]" />

const CykelhjalpenIndexV2 = () => {
  const { data: stats } = useQuery({
    queryKey: ['cykel-public-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cykel_public_stats')
      if (error) throw error
      return data as unknown as { workshops: number; requests: number; responses: number }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient">
      <Helmet>
        <title>Cykelhjälpen – jämför lokala cykelverkstäder</title>
        <meta name="description" content="Beskriv felet på din cykel och jämför pris och tid från anslutna cykelverkstäder i Linköping, Norrköping, Uppsala eller Lund. Gratis och utan konto." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href="https://cykelhjalpen.se/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="sv_SE" />
        <meta property="og:site_name" content="Cykelhjälpen" />
        <meta property="og:title" content="Cykelhjälpen – jämför lokala cykelverkstäder" />
        <meta property="og:description" content="Få lokala prisförslag på cykelreparation i fyra svenska cykelstäder. Gratis och utan konto." />
        <meta property="og:url" content="https://cykelhjalpen.se/" />
        <meta property="og:image" content="https://cykelhjalpen.se/og/hem.jpg" />
        <meta property="og:image:alt" content="Cykelhjälpen – lokala cykelverkstäder" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Cykelhjälpen – jämför lokala cykelverkstäder" />
        <meta name="twitter:description" content="Få lokala prisförslag på cykelreparation. Gratis och utan konto." />
        <meta name="twitter:image" content="https://cykelhjalpen.se/og/hem.jpg" />
      </Helmet>

      <CykelNavbar />
      <main>
        <CykelHomeHero />
        <Suspense fallback={<SectionFallback />}>
          <CykelHowItWorks />
          <CykelCitiesSection />
          <CykelHomeTrust stats={stats} />
        </Suspense>
      </main>
      <CykelFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: CYKEL_HOME_FAQS.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }),
        }}
      />
    </div>
  )
}

export default CykelhjalpenIndexV2
