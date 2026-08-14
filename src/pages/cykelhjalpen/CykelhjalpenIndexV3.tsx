import { lazy, Suspense } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import CykelHomeHero from '@/components/cykelhjalpen/CykelHomeHero'
import Reveal from '@/components/cykelhjalpen/Reveal'
import { buildCykelHomeFaqs } from '@/components/cykelhjalpen/CykelHomeTrust'
import { CykelV3Cities, CykelV3FaqAndFinalCta, CykelV3MobileSticky, CykelV3QuotePreview, CykelV3SocialProof, CykelV3WhyCompare, CykelV3WorkshopRecruitment } from '@/components/cykelhjalpen/CykelHomeV3Full'
import { supabase } from '@/integrations/supabase/client'
import { usePageSeo } from '@/i18n/usePageSeo'
import { useLanguage, useT } from '@/lib/i18n'

const CykelHowItWorks = lazy(() => import('@/components/cykelhjalpen/CykelHowItWorks'))
const SectionFallback = () => <div aria-hidden className="min-h-[240px]" />

const CykelhjalpenIndexV3 = () => {
  const t = useT()
  const { lang } = useLanguage()
  const pageSeo = usePageSeo('/')
  const faqs = buildCykelHomeFaqs(t)
  const text = (sv: string, en: string) => lang === 'en' ? en : sv
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://cykelhjalpen.se/#website',
        url: 'https://cykelhjalpen.se/',
        name: 'Cykelhjälpen',
        inLanguage: lang === 'en' ? 'en' : 'sv-SE',
      },
      {
        '@type': 'Service',
        '@id': 'https://cykelhjalpen.se/#service',
        name: text('Jämförelsetjänst för cykelreparationer', 'Bike repair comparison service'),
        serviceType: text('Jämförelse av lokala cykelverkstäder', 'Comparison of local bike shops'),
        areaServed: { '@type': 'City', name: 'Linköping' },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK' },
        description: text('Aktiv fokusmarknad i Linköping. Partnernätverket byggs samtidigt ut i Norrköping, Uppsala och Lund.', 'Active focus market in Linköping. The partner network is also expanding in Norrköping, Uppsala and Lund.'),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }

  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient">
      <Helmet>
        <title>{text('Cykelhjälpen – jämför lokala cykelverkstäder', 'Cykelhjälpen – compare local bike shops')}</title>
        <meta name="description" content={text('Beskriv felet på din cykel och jämför pris och möjlig tid från lokala cykelverkstäder. Linköping är vår fokusstad och nätverket byggs ut i Norrköping, Uppsala och Lund.', 'Describe the problem with your bike and compare price and available time from local bike shops. Linköping is our focus city while the network expands in Norrköping, Uppsala and Lund.')} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={pageSeo.canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Cykelhjälpen" />
        <meta property="og:title" content={text('Cykelhjälpen – jämför innan du väljer verkstad', 'Cykelhjälpen – compare before choosing a bike shop')} />
        <meta property="og:description" content={text('Ett formulär, lokala svar och friheten att välja själv.', 'One form, local responses and the freedom to choose.')} />
        <meta property="og:url" content={pageSeo.canonical} />
        <meta property="og:image" content="https://cykelhjalpen.se/og/hem.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <CykelNavbar />
      <main>
        <CykelHomeHero />
        <CykelV3SocialProof stats={stats} />
        <Suspense fallback={<SectionFallback />}>
          <Reveal><CykelHowItWorks /></Reveal>
          <Reveal><CykelV3QuotePreview /></Reveal>
          <Reveal><CykelV3WhyCompare /></Reveal>
          <Reveal><CykelV3Cities /></Reveal>
          <Reveal><CykelV3WorkshopRecruitment /></Reveal>
          <Reveal><CykelV3FaqAndFinalCta /></Reveal>
        </Suspense>
      </main>
      <CykelFooter />
      <CykelV3MobileSticky />
    </div>
  )
}

export default CykelhjalpenIndexV3
