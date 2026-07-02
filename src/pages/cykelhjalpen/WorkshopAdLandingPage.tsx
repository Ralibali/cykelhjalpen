import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CYKEL_CITIES } from '@/lib/cykelCities'
import Turnstile from '@/components/cykelhjalpen/Turnstile'
import { CheckCircle2, ShieldCheck, Clock, Star } from 'lucide-react'

type Workshop = {
  id: string
  company_name: string
  slug: string
  city: string
  address: string | null
  phone: string | null
  website: string | null
  services: string[] | null
  areas_served: string[] | null
}

const CATEGORIES = [
  'Punktering',
  'Service & genomgång',
  'Växlar & bromsar',
  'Kedja & drev',
  'Hjul & ekrar',
  'Elcykel',
  'Övrigt',
]

const WorkshopAdLandingPage = () => {
  const { citySlug, workshopSlug } = useParams<{ citySlug: string; workshopSlug: string }>()
  const city = useMemo(() => CYKEL_CITIES.find((c) => c.slug === citySlug), [citySlug])

  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ url: string } | null>(null)

  useEffect(() => {
    if (!workshopSlug) return
    setLoading(true)
    supabase.rpc('get_workshop_public_by_slug', { _slug: workshopSlug }).then(({ data, error }) => {
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true)
      } else {
        const row = Array.isArray(data) ? data[0] : data
        setWorkshop(row as Workshop)
      }
      setLoading(false)
    })
  }, [workshopSlug])

  if (!city) return <Navigate to="/" replace />
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Laddar…</div>
  if (notFound || !workshop) return <Navigate to={`/cykelverkstad-${city.slug}`} replace />
  if (workshop.city !== city.name) {
    return <Navigate to={`/annons/${CYKEL_CITIES.find((c) => c.name === workshop.city)?.slug || city.slug}/${workshop.slug}`} replace />
  }

  const submit = async () => {
    if (!turnstileToken) { toast.error('Bekräfta säkerhetskontrollen först.'); return }
    if (name.trim().length < 2) { toast.error('Ange ditt namn.'); return }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error('Ange en giltig e-postadress.'); return }
    if (phone.trim().length < 6) { toast.error('Ange ett telefonnummer.'); return }
    if (description.trim().length < 10) { toast.error('Beskriv kort vad som behöver göras (minst 10 tecken).'); return }

    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('submit-ad-lead', {
        body: {
          workshop_slug: workshop.slug,
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim(),
          description: description.trim(),
          repair_category: category,
          bike_type: 'Cykel',
          turnstile_token: turnstileToken,
        },
      })
      if (error) throw error
      if ((data as any)?.error) throw new Error((data as any).error)
      toast.success('Tack! Vi kopplar dig med verkstaden.')
      setDone({ url: (data as any).request_url })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Något gick fel.')
      setTurnstileToken(null)
      setTurnstileResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const pageTitle = `${workshop.company_name} – Boka cykelreparation i ${workshop.city}`
  const pageDesc = `Skicka din förfrågan direkt till ${workshop.company_name} i ${workshop.city}. Snabbt svar, tydlig offert, ingen bindning.`
  const canonical = `https://cykelhjalpen.se/annons/${city.slug}/${workshop.slug}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonical} />
      </Helmet>

      {/* Minimal top bar */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">Cykelhjälpen</Link>
          {workshop.phone && (
            <a href={`tel:${workshop.phone}`} className="text-sm font-medium text-primary hover:underline">
              Ring {workshop.company_name}: {workshop.phone}
            </a>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 grid md:grid-cols-2 gap-8 md:gap-12">
        {/* Left: pitch */}
        <section>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 text-accent-foreground px-3 py-1 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Godkänd verkstad i {workshop.city}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
            Boka cykelreparation hos {workshop.company_name} i {workshop.city}
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            Fyll i formuläret så tar {workshop.company_name} kontakt med dig direkt. Ingen väntetid, inget krångel – bara en tydlig offert.
          </p>

          <ul className="space-y-3 mb-8">
            {[
              'Svar från verkstaden inom 24 timmar',
              'Fast pris innan jobbet börjar',
              'Ingen bindning – tacka ja bara om det passar',
            ].map((it) => (
              <li key={it} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{it}</span>
              </li>
            ))}
          </ul>

          {workshop.services && workshop.services.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-semibold mb-2">Verkstaden hjälper med:</div>
              <div className="flex flex-wrap gap-2">
                {workshop.services.slice(0, 8).map((s) => (
                  <span key={s} className="text-xs bg-muted rounded-full px-3 py-1">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="rounded-lg border p-3">
              <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="font-semibold">&lt; 24h</div>
              <div className="text-xs text-muted-foreground">Svarstid</div>
            </div>
            <div className="rounded-lg border p-3">
              <Star className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="font-semibold">Lokal</div>
              <div className="text-xs text-muted-foreground">{workshop.city}</div>
            </div>
            <div className="rounded-lg border p-3">
              <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="font-semibold">Godkänd</div>
              <div className="text-xs text-muted-foreground">Av Cykelhjälpen</div>
            </div>
          </div>
        </section>

        {/* Right: form */}
        <section id="form">
          <div className="rounded-2xl border bg-card shadow-lg p-6 md:p-8">
            {done ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Tack! Vi har tagit emot din förfrågan.</h2>
                <p className="text-muted-foreground">
                  {workshop.company_name} kontaktar dig så snart förfrågan granskats.
                </p>
                <Button asChild className="w-full"><Link to={done.url}>Följ ditt ärende</Link></Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-1">Beskriv ditt cykelproblem</h2>
                <p className="text-sm text-muted-foreground mb-5">Går på under en minut. Verkstaden hör av sig direkt.</p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Namn</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="För- och efternamn" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" />
                    </div>
                    <div>
                      <Label htmlFor="email">E-post</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="du@exempel.se" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category">Vad behöver göras?</Label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border rounded-md h-10 px-3 bg-background"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="desc">Beskriv kort</Label>
                    <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="T.ex. Bakhjulet är punkterat och kedjan hoppar av på högsta växeln." />
                  </div>
                  <Turnstile
                    onVerify={setTurnstileToken}
                    onExpire={() => setTurnstileToken(null)}
                    resetKey={turnstileResetKey}
                  />
                  <Button
                    onClick={submit}
                    disabled={submitting || !turnstileToken}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11 text-base font-semibold"
                  >
                    {submitting ? 'Skickar…' : `Skicka till ${workshop.company_name}`}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Genom att skicka godkänner du våra <Link to="/villkor" className="underline">villkor</Link> och{' '}
                    <Link to="/integritetspolicy" className="underline">integritetspolicy</Link>.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-muted-foreground flex flex-wrap gap-4 justify-between">
          <span>© {new Date().getFullYear()} Cykelhjälpen</span>
          <span>
            <Link to="/integritetspolicy" className="hover:underline">Integritetspolicy</Link>
            {' · '}
            <Link to="/villkor" className="hover:underline">Villkor</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default WorkshopAdLandingPage
