import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import CykelHomeHero from '@/components/cykelhjalpen/CykelHomeHero'
import CykelHowItWorks from '@/components/cykelhjalpen/CykelHowItWorks'
import CykelCitiesSection from '@/components/cykelhjalpen/CykelCitiesSection'
import CykelHomeTrust, { CYKEL_HOME_FAQS } from '@/components/cykelhjalpen/CykelHomeTrust'
import { supabase } from '@/integrations/supabase/client'

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
        <meta name="description" content="Beskriv felet på din cykel och få prisförslag från lokala cykelverkstäder i Linköping, Norrköping, Uppsala eller Lund. Gratis och utan konto." />
        <link rel="canonical" href="https://cykelhjalpen.se/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Cykelhjälpen – jämför lokala cykelverkstäder" />
        <meta property="og:description" content="Få lokala prisförslag på cykelreparation. Gratis och utan konto." />
        <meta property="og:url" content="https://cykelhjalpen.se/" />
        <meta property="og:image" content="https://cykelhjalpen.se/og/hem.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <CykelNavbar />
      <main>
        <CykelHomeHero />
        <CykelHowItWorks />
        <CykelCitiesSection />
        <CykelHomeTrust stats={stats} />
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
