import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import { ArrowRight, Flame, MapPin } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { CYKEL_CITIES } from '@/lib/cykelCities'
import { trackClick } from '@/hooks/usePageTracking'

type TeaserRow = {
  repair_category: string
  bike_type: string
  city: string
  area: string | null
  urgency: string | null
  created_at: string
}

const ALL = 'Alla'
const URGENT_VALUES = new Set(['urgent', 'asap', 'akut', 'snarast', 'idag'])

const isUrgent = (urgency: string | null) =>
  urgency ? URGENT_VALUES.has(urgency.toLowerCase()) : false

type Props = {
  trackCta: (placement: string) => void
}

const CykelOpenRequestsTeaser = ({ trackCta }: Props) => {
  const [cityFilter, setCityFilter] = useState<string>(ALL)

  const { data, isError } = useQuery({
    queryKey: ['cykel-open-requests-teaser'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cykel_open_requests_teaser')
      if (error) throw error
      return (data || []) as TeaserRow[]
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const rows = data || []

  const filtered = useMemo(
    () => (cityFilter === ALL ? rows : rows.filter((r) => r.city === cityFilter)),
    [rows, cityFilter],
  )

  if (isError || rows.length === 0) return null

  const handleFilter = (city: string) => {
    setCityFilter(city)
    trackClick('teaser_city_filter_clicked', city)
  }

  return (
    <section className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Öppna ärenden just nu</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Ett urval av manuellt granskade cykelärenden som verkstäder kan svara på just nu.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[ALL, ...CYKEL_CITIES.map((c) => c.name)].map((city) => {
          const active = cityFilter === city
          return (
            <button
              key={city}
              onClick={() => handleFilter(city)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted border-border'
              }`}
            >
              {city}
            </button>
          )
        })}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((row, idx) => {
          const when = formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: sv })
          const relativeLabel =
            Date.now() - new Date(row.created_at).getTime() < 24 * 60 * 60 * 1000 ? 'idag' : when
          return (
            <div key={`${row.created_at}-${idx}`} className="sticker rounded-2xl bg-card p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold text-base leading-snug">{row.repair_category}</h3>
                {isUrgent(row.urgency) && (
                  <span className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                    <Flame className="h-3 w-3" /> Bråttom
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{row.bike_type}</p>
              <p className="text-sm inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {row.city}
                {row.area ? ` · ${row.area}` : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-auto pt-2">{relativeLabel}</p>
            </div>
          )
        })}

        <Link
          to="/registrera/verkstad"
          onClick={() => trackCta('open_requests_teaser')}
          className="sticker rounded-2xl bg-primary text-primary-foreground p-5 flex flex-col justify-between gap-3 hover:opacity-95 transition"
        >
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80 mb-2">För verkstäder</p>
            <p className="font-display font-bold text-lg leading-snug">
              Registrera verkstaden gratis för att se detaljer och svara
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold">
            Kom igång <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </section>
  )
}

export default CykelOpenRequestsTeaser
