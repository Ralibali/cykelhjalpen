import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin, Star, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import NotFound from '@/pages/NotFound'
import { CYKEL_CITIES, cityQuery } from '@/lib/cykelCities'
import {
  cityDirectoryPath,
  fetchPublicDirectory,
  useDirectoryGate,
  workshopProfilePath,
  type V2DirectoryResult,
} from '@/lib/v2/directory'
import type { V2PublicWorkshop } from '@/lib/v2/contracts'
import { trackV2ClientEvent } from '@/lib/v2/events'
import { trackClick } from '@/hooks/usePageTracking'
import { INDEX_ROBOTS_DIRECTIVE } from '@/lib/seoRobots'
import { useT } from '@/lib/i18n'

const SITE_ORIGIN = 'https://cykelhjalpen.se'
const GATED_ROBOTS = 'noindex, follow'

const ratingText = (value: number) => value.toFixed(1).replace('.', ',')

const WorkshopCard = ({ workshop }: { workshop: V2PublicWorkshop }) => {
  const t = useT()
  const hasRating = workshop.published_review_count > 0 && workshop.avg_rating != null
  return (
    <li>
      <Link
        to={workshopProfilePath(workshop.slug)}
        onClick={() => trackClick('directory_card_clicked', workshop.company_name, { slug: workshop.slug, city: workshop.city })}
        className="sticker rounded-3xl bg-card p-5 flex gap-4 items-start hover:border-foreground transition group"
      >
        <div className="h-16 w-16 shrink-0 rounded-2xl border bg-muted/40 overflow-hidden flex items-center justify-center">
          {workshop.logo_url
            ? <img src={workshop.logo_url} alt={t('Logotyp för {name}', { name: workshop.company_name })} className="h-full w-full object-contain" loading="lazy" />
            : <Wrench className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold truncate group-hover:underline">{workshop.company_name}</h3>
            {hasRating && (
              <span className="inline-flex items-center gap-1 text-sm font-medium shrink-0">
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                {ratingText(workshop.avg_rating as number)}
                <span className="text-muted-foreground font-normal">({workshop.published_review_count})</span>
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />{workshop.city}
          </p>
          {workshop.bio_short && <p className="text-sm mt-2 line-clamp-2">{workshop.bio_short}</p>}
          {workshop.services && workshop.services.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {workshop.services.slice(0, 4).map((service) => (
                <li key={service} className="px-2 py-0.5 rounded-full border text-xs">{service}</li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </li>
  )
}

/**
 * V2 S4 — public directory (/verkstader + /verkstader/:citySlug).
 * Contract §2.4/§7.4: reads only the scoped view via v2_get_public_directory;
 * noindex until gate G-D1 passes (min opted-in workshops + admin
 * directory_indexable + city ACTIVE/LIMITED). Flag off => 404.
 */
const WorkshopDirectoryPage = () => {
  const t = useT()
  const { citySlug } = useParams()
  const knownCity = citySlug ? CYKEL_CITIES.find((entry) => entry.slug === citySlug) ?? null : null
  const gate = useDirectoryGate(knownCity?.slug ?? null)

  const [service, setService] = useState<string | null>(null)
  const [area, setArea] = useState<string | null>(null)
  const [result, setResult] = useState<V2DirectoryResult | null>(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!gate.flagOn) return
    let cancelled = false
    setFetching(true)
    fetchPublicDirectory({ citySlug: knownCity?.slug ?? null, service, area }).then((next) => {
      if (cancelled) return
      setResult(next)
      setFetching(false)
      trackV2ClientEvent('client.directory_viewed', {
        city_slug: knownCity?.slug ?? undefined,
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.flagOn, knownCity?.slug, service, area])

  const allServices = useMemo(() => {
    const set = new Set<string>()
    for (const row of result?.rows ?? []) for (const item of row.services ?? []) set.add(item)
    return [...set].sort((a, b) => a.localeCompare(b, 'sv'))
  }, [result?.rows])

  const allAreas = useMemo(() => {
    const set = new Set<string>()
    for (const row of result?.rows ?? []) for (const item of row.areas_served ?? []) set.add(item)
    return [...set].sort((a, b) => a.localeCompare(b, 'sv'))
  }, [result?.rows])

  if (citySlug && !knownCity) return <NotFound />
  if (!gate.loading && !gate.flagOn) return <NotFound />

  const cityName = knownCity?.name ?? null
  const canonical = `${SITE_ORIGIN}${cityName ? cityDirectoryPath(knownCity.slug) : '/verkstader'}`
  const title = cityName
    ? t('Cykelverkstäder i {city} – anslutna till Cykelhjälpen', { city: cityName })
    : t('Cykelverkstäder anslutna till Cykelhjälpen')
  const description = cityName
    ? t('Se cykelverkstäder i {city} som är anslutna till Cykelhjälpen. Begär en kostnadsfri offert och jämför pris och tid utan konto.', { city: cityName })
    : t('Se cykelverkstäder som är anslutna till Cykelhjälpen. Begär en kostnadsfri offert och jämför pris och tid utan konto.')
  const indexable = result?.indexable === true
  const rows = result?.rows ?? []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: 'sv-SE',
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Cykelhjälpen', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: t('Cykelverkstäder'), item: `${SITE_ORIGIN}/verkstader` },
          ...(cityName ? [{ '@type': 'ListItem', position: 3, name: cityName, item: canonical }] : []),
        ],
      },
      ...(indexable && rows.length > 0
        ? [{
            '@type': 'ItemList',
            itemListElement: rows.map((row, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `${SITE_ORIGIN}${workshopProfilePath(row.slug)}`,
              name: row.company_name,
            })),
          }]
        : []),
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={indexable ? INDEX_ROBOTS_DIRECTIVE : GATED_ROBOTS} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Cykelhjälpen" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <CykelNavbar />
      <main>
        <section className="bg-hero-gradient">
          <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
            <nav aria-label="Brödsmulor" className="text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:underline">Cykelhjälpen</Link>{' '}
              <span aria-hidden="true">/</span>{' '}
              {cityName
                ? <><Link to="/verkstader" className="hover:underline">{t('Cykelverkstäder')}</Link> <span aria-hidden="true">/</span> <span>{cityName}</span></>
                : <span>{t('Cykelverkstäder')}</span>}
            </nav>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                {cityName ? t('Cykelverkstäder i {city}', { city: cityName }) : t('Cykelverkstäder')}
              </h1>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                {t('Verkstäderna här är anslutna till Cykelhjälpen och svarar på förfrågningar från cyklister. Det är gratis att skicka ett ärende och du behöver inget konto.')}
              </p>
              <div className="mt-6">
                <Button asChild size="lg">
                  <Link to={cityName ? cityQuery(cityName) : '/skicka-arende'}>
                    {t('Begär offert via Cykelhjälpen')} <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 max-w-4xl">
          {(allServices.length > 0 || allAreas.length > 0) && (
            <div className="mb-8 space-y-4">
              {allServices.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium mb-2">{t('Filtrera på tjänst')}</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setService(null)}
                      aria-pressed={service === null}
                      className={`px-3 py-1.5 rounded-full border-2 text-sm transition ${service === null ? 'bg-primary text-primary-foreground border-foreground' : 'border-border hover:border-foreground'}`}
                    >
                      {t('Alla tjänster')}
                    </button>
                    {allServices.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setService(service === item ? null : item)}
                        aria-pressed={service === item}
                        className={`px-3 py-1.5 rounded-full border-2 text-sm transition ${service === item ? 'bg-primary text-primary-foreground border-foreground' : 'border-border hover:border-foreground'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {allAreas.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium mb-2">{t('Filtrera på område')}</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setArea(null)}
                      aria-pressed={area === null}
                      className={`px-3 py-1.5 rounded-full border-2 text-sm transition ${area === null ? 'bg-primary text-primary-foreground border-foreground' : 'border-border hover:border-foreground'}`}
                    >
                      {t('Alla områden')}
                    </button>
                    {allAreas.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setArea(area === item ? null : item)}
                        aria-pressed={area === item}
                        className={`px-3 py-1.5 rounded-full border-2 text-sm transition ${area === item ? 'bg-primary text-primary-foreground border-foreground' : 'border-border hover:border-foreground'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {gate.loading || fetching ? (
            <div className="space-y-4">
              {[0, 1, 2].map((item) => <div key={item} className="h-28 rounded-3xl bg-muted/40 animate-pulse" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="sticker rounded-3xl bg-card p-8 text-center">
              <p className="font-medium">{t('Inga anslutna verkstäder visas här ännu.')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('Skicka ditt ärende ändå – vi förmedlar det till verkstäder i nätverket så fort någon kan ta jobbet.')}
              </p>
              <Button asChild className="mt-4">
                <Link to={cityName ? cityQuery(cityName) : '/skicka-arende'}>{t('Skicka cykelärende gratis')}</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {rows.map((workshop) => <WorkshopCard key={workshop.workshop_id} workshop={workshop} />)}
            </ul>
          )}

          {!cityName && (
            <div className="mt-10">
              <h2 className="font-display text-lg font-bold mb-3">{t('Välj stad')}</h2>
              <ul className="flex flex-wrap gap-2">
                {CYKEL_CITIES.map((entry) => (
                  <li key={entry.slug}>
                    <Link to={cityDirectoryPath(entry.slug)} className="px-3 py-1.5 rounded-full border bg-card text-sm hover:border-foreground transition inline-block">
                      {t('Cykelverkstäder i {city}', { city: entry.name })}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
      <CykelFooter />
    </div>
  )
}

export default WorkshopDirectoryPage
