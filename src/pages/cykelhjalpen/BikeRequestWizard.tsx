import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Bike, ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, Clock3, Users } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import BikeRequestStepContent from '@/components/cykelhjalpen/BikeRequestStepContent'
import { Helmet } from 'react-helmet-async'
import { trackClick } from '@/hooks/usePageTracking'
import { trackEvent } from '@/lib/analytics'
import { DEFAULT_CYKEL_CITY, isCykelCity, type CykelCityName } from '@/lib/cykelCities'
import {
  BIKE_REQUEST_STEPS,
  bikeRequestSchema,
  makeDefaultBikeRequest,
  type BikeRequestFormState,
} from '@/lib/bikeRequestForm'

const DRAFT_KEY = 'cykelhjalpen_request_draft_v3'

const trackGoogleEvent = (eventName: string, parameters: Record<string, unknown> = {}) => {
  const gtag = (window as any).gtag
  if (typeof gtag === 'function') gtag('event', eventName, parameters)
}

const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
  const context = (error as any)?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json()
      if (typeof payload?.error === 'string') return payload.error
      if (payload?.error && typeof payload.error === 'object') {
        const firstMessage = Object.values(payload.error).flat().find((value) => typeof value === 'string')
        if (typeof firstMessage === 'string') return firstMessage
      }
    } catch {
      // Edge-funktionen returnerade inte JSON.
    }
  }
  return (error as any)?.message || fallback
}

const BikeRequestWizard = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedCity = isCykelCity(searchParams.get('stad')) ? searchParams.get('stad') as CykelCityName : null
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [form, setForm] = useState<BikeRequestFormState>(() => {
    const defaults = makeDefaultBikeRequest(requestedCity || DEFAULT_CYKEL_CITY)
    if (typeof window === 'undefined') return defaults
    try {
      const stored = localStorage.getItem(DRAFT_KEY)
      if (!stored) return defaults
      const draft = JSON.parse(stored)
      const city = requestedCity || (isCykelCity(draft?.city) ? draft.city : DEFAULT_CYKEL_CITY)
      return { ...defaults, ...draft, city, consent: false }
    } catch {
      localStorage.removeItem(DRAFT_KEY)
      return defaults
    }
  })

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

  const imagePreviews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  )

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), [])
  const removeFile = useCallback((target: File) => {
    setFiles((current) => current.filter((file) => file !== target))
  }, [])

  useEffect(() => {
    trackClick('bike_request_started', 'Skicka cykelärende', { city: form.city })
    trackGoogleEvent('begin_checkout', { item_name: 'Cykelärende', city: form.city })
    trackEvent('Repair Request Started', { city: form.city, source: 'wizard' })
  }, [])

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, consent: false }))
  }, [form])

  useEffect(() => () => imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url)), [imagePreviews])

  const update = <K extends keyof BikeRequestFormState>(key: K, value: BikeRequestFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const canContinue = () => {
    if (step === 0) return Boolean(form.bike_type)
    if (step === 1) return Boolean(form.repair_category) && form.description.trim().length >= 10
    if (step === 2) return Boolean(form.city) && Boolean(form.urgency) && (form.can_drop_off || form.wants_pickup)
    return form.customer_name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.customer_email) && form.consent
  }

  const goNext = () => {
    if (!canContinue()) return
    trackClick('bike_request_step_completed', BIKE_REQUEST_STEPS[step], { step: step + 1, city: form.city })
    setStep((current) => Math.min(BIKE_REQUEST_STEPS.length - 1, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024
    const combined = [...files, ...Array.from(event.target.files || [])].slice(0, 4)
    const valid: File[] = []

    for (const file of combined) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: endast JPEG, PNG eller WebP tillåts`)
      } else if (file.size > maxSize) {
        toast.error(`${file.name}: filen är större än fem MB`)
      } else if (!valid.some((existing) => existing.name === file.name && existing.size === file.size)) {
        valid.push(file)
      }
    }

    setFiles(valid)
    event.target.value = ''
  }

  const uploadImages = async (requestId: string) => {
    const results = await Promise.all(files.map(async (file) => {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${requestId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('bike-images').upload(path, file, {
        upsert: false,
        contentType: file.type,
      })
      if (uploadError) return file.name

      const { error: insertError } = await supabase.from('bike_request_images').insert({
        request_id: requestId,
        image_url: path,
      })
      return insertError ? file.name : null
    }))
    return results.filter((result): result is string => Boolean(result))
  }

  const submit = async () => {
    const parsed = bikeRequestSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Kontrollera att alla obligatoriska uppgifter är ifyllda')
      return
    }
    if (!turnstileToken) {
      toast.error('Bekräfta säkerhetskontrollen innan du skickar')
      return
    }

    setSubmitting(true)
    trackClick('bike_request_submit_clicked', 'Skicka gratis', {
      bike_type: parsed.data.bike_type,
      repair_category: parsed.data.repair_category,
      city: parsed.data.city,
      has_images: files.length > 0,
    })

    try {
      const { data: request, error } = await supabase.functions.invoke('submit-bike-request', {
        body: {
          bike_type: parsed.data.bike_type,
          repair_category: parsed.data.repair_category,
          description: parsed.data.description,
          area: parsed.data.area || null,
          postcode: parsed.data.postcode || null,
          urgency: parsed.data.urgency,
          can_drop_off: parsed.data.can_drop_off,
          wants_pickup: parsed.data.wants_pickup,
          customer_name: parsed.data.customer_name,
          customer_email: parsed.data.customer_email,
          customer_phone: parsed.data.customer_phone || null,
          city: parsed.data.city,
          turnstile_token: turnstileToken,
        },
      })

      if (error) throw new Error(await getFunctionErrorMessage(error, 'Kunde inte skicka ärendet'))
      if (!request?.id || !request?.view_token) throw new Error(request?.error || 'Kunde inte skapa ärendet')

      const uploadErrors = files.length > 0 ? await uploadImages(request.id) : []
      localStorage.removeItem(DRAFT_KEY)
      trackClick('bike_request_submitted', 'Skicka ärende', {
        bike_type: parsed.data.bike_type,
        repair_category: parsed.data.repair_category,
        city: parsed.data.city,
        has_images: files.length > 0,
      })
      trackGoogleEvent('generate_lead', { currency: 'SEK', value: 0, lead_type: 'bike_repair_request', city: parsed.data.city })
      trackEvent('Repair Request Submitted', { city: parsed.data.city, bike_type: parsed.data.bike_type })

      toast.success(`Tack! Ärendet i ${parsed.data.city} är mottaget och granskas innan det skickas till verkstäder.`)
      if (uploadErrors.length > 0) toast.error(`${uploadErrors.length} bilder kunde inte laddas upp. Själva ärendet är ändå mottaget.`)
      navigate(`/mitt-arende/${request.view_token}`)
    } catch (error) {
      setTurnstileToken(null)
      setTurnstileResetKey((current) => current + 1)
      trackClick('bike_request_submission_failed', 'Skicka gratis', { step: step + 1, city: form.city })
      toast.error((error as Error)?.message || 'Något gick fel. Försök igen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Få pris på cykelreparation | Cykelhjälpen</title>
        <meta name="description" content="Beskriv ditt cykelproblem och jämför lokala prisförslag i Linköping, Norrköping, Uppsala eller Lund. Gratis och utan konto." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://cykelhjalpen.se/skicka-arende" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="sv_SE" />
        <meta property="og:title" content="Få pris på cykelreparation | Cykelhjälpen" />
        <meta property="og:description" content="Beskriv cykelproblemet och jämför lokala prisförslag. Gratis och utan konto." />
        <meta property="og:url" content="https://cykelhjalpen.se/skicka-arende" />
        <meta property="og:image" content="https://cykelhjalpen.se/og/skicka-arende.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <CykelNavbar />
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="sticker bg-brand-sun p-2"><Bike className="h-5 w-5" /></div>
            <div>
              <h1 className="font-display text-3xl font-bold">Få pris på cykelreparation</h1>
              <p className="text-sm text-muted-foreground">Steg {step + 1} av {BIKE_REQUEST_STEPS.length}: {BIKE_REQUEST_STEPS[step]}</p>
            </div>
          </div>

          <div className="mb-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Gratis och utan konto</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-primary" /> Tar cirka två minuter</span>
          </div>

          <div className="flex gap-2 mb-8" aria-label={`Steg ${step + 1} av ${BIKE_REQUEST_STEPS.length}`}>
            {BIKE_REQUEST_STEPS.map((label, index) => <div key={label} className={`flex-1 h-2 rounded-full ${index <= step ? 'bg-primary' : 'bg-muted'}`} />)}
          </div>

          <div className="sticker bg-card p-6 md:p-8 space-y-6">
            <BikeRequestStepContent
              step={step}
              form={form}
              files={files}
              imagePreviews={imagePreviews}
              turnstileResetKey={turnstileResetKey}
              update={update}
              setStep={setStep}
              onFiles={handleFiles}
              onRemoveFile={removeFile}
              onTurnstileVerify={handleTurnstileVerify}
              onTurnstileExpire={handleTurnstileExpire}
            />
          </div>

          {step === BIKE_REQUEST_STEPS.length - 1 && stats && Number(stats.workshops) > 0 && (
            <div className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <p>
                {stats.workshops} godkända verkstäder · svar brukar komma inom 1–2 dagar · ingen köpplikt
              </p>
            </div>
          )}

          <div className="flex justify-between gap-3 mt-6 sticky bottom-3 rounded-2xl bg-background/95 backdrop-blur p-2 border shadow-sm md:static md:bg-transparent md:border-0 md:shadow-none md:p-0">
            <Button variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || submitting}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
            </Button>
            {step < BIKE_REQUEST_STEPS.length - 1 ? (
              <Button onClick={goNext} disabled={!canContinue()} className="min-w-32">Fortsätt <ArrowRight className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting || !canContinue() || !turnstileToken} className="bg-accent text-accent-foreground hover:bg-accent/90 min-w-40">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                {submitting ? 'Skickar…' : 'Skicka gratis'}
              </Button>
            )}
          </div>
        </motion.div>
      </main>
      <CykelFooter />
    </div>
  )
}

export default BikeRequestWizard
