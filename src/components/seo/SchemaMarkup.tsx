import type { SEOPillarPage, SEOSubPage } from '@/lib/seoData'

interface SchemaMarkupProps {
  page: SEOPillarPage | SEOSubPage
  type: 'pillar' | 'sub'
  parentCategory?: string
  parentSlug?: string
}

const SchemaMarkup = ({ page, type, parentCategory, parentSlug }: SchemaMarkupProps) => {
  const isPillar = type === 'pillar'
  const pillar = page as SEOPillarPage
  const sub = page as SEOSubPage

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://updro.se/' },
  ]

  if (isPillar) {
    breadcrumbItems.push({
      '@type': 'ListItem', position: 2, name: pillar.categoryName,
      item: `https://updro.se/${pillar.categorySlug}/`
    })
  } else if (parentSlug && parentCategory) {
    breadcrumbItems.push({
      '@type': 'ListItem', position: 2, name: parentCategory,
      item: `https://updro.se/${parentSlug}/`
    })
    breadcrumbItems.push({
      '@type': 'ListItem', position: 3, name: sub.h1,
      item: `https://updro.se/${parentSlug}/${sub.slug}/`
    })
  }

  const faqItems = ('faq' in page ? page.faq : [])

  const schemas: object[] = [
    // Service
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: isPillar ? pillar.categoryName : sub.h1,
      description: isPillar ? pillar.metaDesc : sub.metaDesc,
      provider: {
        '@type': 'Organization',
        name: 'Updro',
        '@id': 'https://updro.se/#organization',
      },
      areaServed: { '@type': 'Country', name: 'Sweden' },
      serviceType: isPillar ? pillar.categoryName : sub.h1,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'SEK',
        description: 'Gratis offertjämförelse',
      },
    },
    // Breadcrumb
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    },
    // WebPage
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: isPillar ? pillar.metaTitle : sub.title,
      description: isPillar ? pillar.metaDesc : sub.metaDesc,
      isPartOf: { '@id': 'https://updro.se/#website' },
      about: {
        '@type': 'Thing',
        name: isPillar ? pillar.categoryName : sub.h1,
      },
      inLanguage: 'sv-SE',
    },
  ]

  // FAQ schema
  if (faqItems.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }

  return (
    <>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </>
  )
}

export default SchemaMarkup
