import { lazy, Suspense } from 'react'
import { Helmet } from 'react-helmet-async'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import CykelHomeHeroNeutral from '@/components/cykelhjalpen/CykelHomeHeroNeutral'
import CykelHonestTrust from '@/components/cykelhjalpen/CykelHonestTrust'
import Reveal from '@/components/cykelhjalpen/Reveal'
import { buildCykelHomeFaqs } from '@/components/cykelhjalpen/CykelHomeTrust'
import { CykelV3FaqAndFinalCta, CykelV3QuotePreview, CykelV3WhyCompare } from '@/components/cykelhjalpen/CykelHomeV3Full'
import { CykelV3CitiesNeutral, CykelV3MobileStickyNeutral, CykelV3WorkshopRecruitmentNeutral } from '@/components/cykelhjalpen/CykelV3NeutralSections'
import { trackClick } from '@/hooks/usePageTracking'
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
        areaServed: ['Linköping', 'Norrköping', 'Uppsala', 'Lund'].map((name) => ({ '@type': 'City', name })),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK' },
        description: text('Jämför svar från lokala cykelverkstäder i Linköping, Norrköping, Uppsala och Lund.', 'Compare responses from local bike shops in Linköping, Norrköping, Uppsala and Lund.'),
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
        <meta name="description" content={text('Beskriv felet på din cykel och jämför pris och möjlig tid från lokala cykelverkstäder i Linköping, Norrköping, Uppsala och Lund.', 'Describe the problem with your bike and compare price and available time from local bike shops in Linköping, Norrköping, Uppsala and Lund.')} />
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
        <CykelHomeHeroNeutral />
        <Suspense fallback={<SectionFallback />}>
          <Reveal><CykelHowItWorks /></Reveal>
          <Reveal>
            <CykelHonestTrust
              variant="cyclist"
              ctaHref="/skicka-arende"
              ctaLabel={text('Få prisförslag gratis', 'Get a free quote')}
              onCtaClick={() => trackClick('home_trust_cta', 'Få prisförslag gratis')}
            />
          </Reveal>
          <Reveal><CykelV3QuotePreview /></Reveal>
          <Reveal><CykelV3WhyCompare /></Reveal>
          <Reveal><CykelV3CitiesNeutral /></Reveal>
          <Reveal><CykelV3WorkshopRecruitmentNeutral /></Reveal>
          <Reveal><CykelV3FaqAndFinalCta /></Reveal>
        </Suspense>
      </main>
      <CykelFooter />
      <CykelV3MobileStickyNeutral />
    </div>
  )
}

export default CykelhjalpenIndexV3
