import { lazy, Suspense, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import HeroSection from '@/components/home/HeroSection'
import CategoriesSection from '@/components/home/CategoriesSection'
import HowItWorksSection from '@/components/home/HowItWorksSection'
import { setSEOMeta, setJsonLd, setBreadcrumb } from '@/lib/seoHelpers'

const AgencyTrustSection = lazy(() => import('@/components/home/AgencyTrustSection'))
const TwoSidedSection = lazy(() => import('@/components/home/TwoSidedSection'))
const StatsSection = lazy(() => import('@/components/home/StatsSection'))
const TestimonialsSection = lazy(() => import('@/components/home/TestimonialsSection'))
const FAQSection = lazy(() => import('@/components/home/FAQSection'))
const CTASection = lazy(() => import('@/components/home/CTASection'))
const NewsletterSection = lazy(() => import('@/components/home/NewsletterSection'))

const howItWorksSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Hur man jämför offerter på Updro',
  description: 'Steg-för-steg: Beskriv ditt projekt, få offerter, välj rätt byrå.',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Beskriv ditt projekt',
      text: 'Fyll i ett kort formulär med dina behov, budget och tidsram.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Få offerter',
      text: 'Kvalitetssäkrade byråer skickar offerter inom 24 timmar.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Jämför & välj',
      text: 'Jämför pris, kvalitet och omdömen – välj den byrå som passar bäst.',
    },
  ],
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://updro.se/#organization',
  name: 'Updro',
  url: 'https://updro.se',
  logo: 'https://updro.se/logo-updro.png',
  description:
    'Sveriges marknadsplats för digitala uppdrag. Jämför offerter från kvalitetssäkrade digitala byråer.',
  founder: { '@type': 'Organization', name: 'Aurora Media AB' },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@auroramedia.se',
    contactType: 'customer service',
    availableLanguage: ['Swedish', 'English'],
  },
  areaServed: { '@type': 'Country', name: 'Sweden' },
  sameAs: [],
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://updro.se/#website',
  url: 'https://updro.se',
  name: 'Updro',
  inLanguage: 'sv-SE',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://updro.se/byraer?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

const BelowFold = () => (
  <Suspense fallback={null}>
    <AgencyTrustSection />
    <TwoSidedSection />
    <StatsSection />
    <TestimonialsSection />
    <NewsletterSection />
    <FAQSection />
    <CTASection />
  </Suspense>
)

const Index = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Updro – Jämför offerter från digitala byråer',
      description:
        'Beskriv ditt projekt och få upp till fem offerter från kvalitetssäkrade digitala byråer i Sverige inom 24 timmar. Helt gratis.',
      canonical: 'https://updro.se/',
    })
    setJsonLd('howto-jsonld', howItWorksSchema)
    setJsonLd('organization-jsonld', organizationSchema)
    setJsonLd('website-jsonld', websiteSchema)
    setBreadcrumb([{ name: 'Hem', url: 'https://updro.se/' }])
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <section className="container py-8 md:py-12">
          <div className="max-w-3xl bg-muted/40 border rounded-2xl p-6 md:p-8">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">Vad är Updro?</h2>
            <p className="mt-3 text-foreground/85 leading-relaxed">
              Updro är en svensk marknadsplats där företag publicerar digitala uppdrag och får upp till fem offerter
              från kvalitetssäkrade byråer inom 24 timmar. Tjänsten är gratis för uppdragsgivare och täcker
              webbutveckling, SEO, e-handel, apputveckling och digital marknadsföring i hela Sverige.
            </p>
          </div>
        </section>
        <CategoriesSection />
        <HowItWorksSection />
        <BelowFold />
      </main>
      <Footer />
    </div>
  )
}

export default Index
