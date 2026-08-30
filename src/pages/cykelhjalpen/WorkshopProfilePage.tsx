import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, MapPin, Star, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import NotFound from '@/pages/NotFound'
import { getCykelCity, cityQuery } from '@/lib/cykelCities'
import {
  cityDirectoryPath,
  fetchPublicWorkshopProfile,
  type V2PublicProfileResult,
} from '@/lib/v2/directory'
import { trackV2ClientEvent } from '@/lib/v2/events'
import { trackClick } from '@/hooks/usePageTracking'
import { INDEX_ROBOTS_DIRECTIVE } from '@/lib/seoRobots'
import { useT } from '@/lib/i18n'

const SITE_ORIGIN = 'https://cykelhjalpen.se'
const GATED_ROBOTS = 'noindex, follow'

const ratingText = (value: number) => value.toFixed(1).replace('.', ',')

/**
 * V2 S4 — public workshop profile (/verkstad/:slug). Contract §2.4/§3.4.
 * Reads only the scoped directory surface via v2-get-public-workshop; the edge
 * function enforces the feature flag and the opt-in policy, so a missing
 * result always renders 404. noindex until gate G-D1 passes for the city.
 */
const WorkshopProfilePage = () => {
  const t = useT()
  const { slug = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<V2PublicProfileResult | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPublicWorkshopProfile(slug).then((profile) => {
      if (cancelled) return
      setResult(profile)
      setLoading(false)
      if (profile) {
        trackV2ClientEvent('client.profile_viewed', {
          slug,
          city_slug: profile.workshop.city_slug ?? undefined,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CykelNavbar />
        <main className="container mx-auto px-4 py-24 max-w-3xl">
          <div className="h-8 w-56 rounded bg-muted/60 animate-pulse" />
          <div className="mt-6 h-40 rounded-3xl bg-muted/40 animate-pulse" />
        </main>
        <CykelFooter />
      </div>
    )
  }

  if (!result) return <NotFound />

  const { workshop, reviews, indexable } = result
  const canonical = `${SITE_ORIGIN}/verkstad/${workshop.slug}`
  const citySlug = workshop.city_slug ?? getCykelCity(workshop.city).slug
  const directoryUrl = `${SITE_ORIGIN}${cityDirectoryPath(citySlug)}`
  const requestUrl = cityQuery(getCykelCity(workshop.city).name)
  const title = t('{name} – cykelverkstad i {city} | Cykelhjälpen', { name: workshop.company_name, city: workshop.city })
  const description = workshop.bio_short
    ?? t('{name} är en ansluten cykelverkstad i {city}. Begär en kostnadsfri offert via Cykelhjälpen och jämför pris och tid.', { name: workshop.company_name, city: workshop.city })
  const hasRating = workshop.published_review_count > 0 && workshop.avg_rating != null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${canonical}#business`,
        name: workshop.company_name,
        url: canonical,
        ...(workshop.website ? { sameAs: [workshop.website] } : {}),
        ...(workshop.logo_url ? { image: workshop.logo_url, logo: workshop.logo_url } : {}),
        ...(workshop.bio_short ? { description: workshop.bio_short } : {}),
        areaServed: [{ '@type': 'City', name: workshop.city }, ...(workshop.areas_served ?? []).map((area) => ({ '@type': 'Place', name: area }))],
        ...(hasRating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: workshop.avg_rating,
                reviewCount: workshop.published_review_count,
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Cykelhjälpen', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: t('Cykelverkstäder i {city}', { city: workshop.city }), item: directoryUrl },
          { '@type': 'ListItem', position: 3, name: workshop.company_name, item: canonical },
        ],
      },
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={indexable ? INDEX_ROBOTS_DIRECTIVE : GATED_ROBOTS} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="Cykelhjälpen" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        {workshop.logo_url && <meta property="og:image" content={workshop.logo_url} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <CykelNavbar />
      <main>
        <section className="bg-hero-gradient">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
            <nav aria-label="Brödsmulor" className="text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:underline">Cykelhjälpen</Link>{' '}
              <span aria-hidden="true">/</span>{' '}
              <Link to={cityDirectoryPath(citySlug)} className="hover:underline">{t('Cykelverkstäder i {city}', { city: workshop.city })}</Link>{' '}
              <span aria-hidden="true">/</span>{' '}
              <span>{workshop.company_name}</span>
            </nav>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="h-24 w-24 shrink-0 rounded-3xl border bg-card overflow-hidden flex items-center justify-center">
                {workshop.logo_url
                  ? <img src={workshop.logo_url} alt={t('Logotyp för {name}', { name: workshop.company_name })} className="h-full w-full object-contain" />
                  : <Wrench className="h-10 w-10 text-muted-foreground" aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-3xl md:text-4xl font-bold">{workshop.company_name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{workshop.city}</span>
                  <span className="inline-flex items-center gap-1"><BadgeCheck className="h-4 w-4" aria-hidden="true" />{t('Ansluten verkstad')}</span>
                  {workshop.created_year && <span>{t('Ansluten sedan {year}', { year: workshop.created_year })}</span>}
                  {hasRating && (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                      {ratingText(workshop.avg_rating as number)}
                      <span className="text-muted-foreground font-normal">
                        ({t('{count} recensioner', { count: workshop.published_review_count })})
                      </span>
                    </span>
                  )}
                </div>
                {workshop.bio_short && <p className="mt-4 text-base max-w-2xl">{workshop.bio_short}</p>}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link
                      to={requestUrl}
                      onClick={() => trackClick('profile_request_cta_clicked', workshop.company_name, { slug: workshop.slug, city: workshop.city })}
                    >
                      {t('Begär offert via Cykelhjälpen')} <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  {workshop.website && (
                    <Button asChild variant="outline" size="lg">
                      <a href={workshop.website} target="_blank" rel="noopener noreferrer">{t('Verkstadens webbplats')}</a>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
          {(workshop.services?.length || workshop.areas_served?.length) && (
            <div className="grid sm:grid-cols-2 gap-8">
              {workshop.services && workshop.services.length > 0 && (
                <div>
                  <h2 className="font-display text-xl font-bold mb-3">{t('Tjänster')}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {workshop.services.map((service) => (
                      <li key={service} className="px-3 py-1.5 rounded-full border bg-card text-sm">{service}</li>
                    ))}
                  </ul>
                </div>
              )}
              {workshop.areas_served && workshop.areas_served.length > 0 && (
                <div>
                  <h2 className="font-display text-xl font-bold mb-3">{t('Områden verkstaden täcker')}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {workshop.areas_served.map((area) => (
                      <li key={area} className="px-3 py-1.5 rounded-full border bg-muted/40 text-sm">{area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div>
            <h2 className="font-display text-xl font-bold mb-3">{t('Recensioner')}</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('Inga publicerade recensioner ännu. Recensioner på Cykelhjälpen kommer bara från genomförda jobb.')}
              </p>
            ) : (
              <ul className="space-y-4">
                {reviews.map((review, index) => (
                  <li key={index} className="sticker rounded-3xl bg-card p-5">
                    <div className="flex items-center gap-1" aria-label={t('{rating} av 5 stjärnor', { rating: review.rating })}>
                      {Array.from({ length: 5 }, (_, star) => (
                        <Star key={star} className={`h-4 w-4 ${star < review.rating ? 'fill-current' : 'text-muted-foreground/30'}`} aria-hidden="true" />
                      ))}
                    </div>
                    {review.body && <p className="mt-2 text-sm">{review.body}</p>}
                    {review.workshop_response && (
                      <p className="mt-3 border-l-2 pl-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{t('Svar från verkstaden:')}</span> {review.workshop_response}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sticker rounded-3xl bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">{t('Behöver du hjälp med cykeln i {city}?', { city: workshop.city })}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('Beskriv problemet gratis och jämför svar från anslutna verkstäder – utan konto.')}</p>
            </div>
            <Button asChild className="shrink-0">
              <Link to={requestUrl}>{t('Starta förfrågan')} <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <CykelFooter />
    </div>
  )
}

export default WorkshopProfilePage
