import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Bike, Camera, ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, Clock3 } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Helmet } from 'react-helmet-async'
import Turnstile from '@/components/cykelhjalpen/Turnstile'
import { trackClick } from '@/hooks/usePageTracking'

const BIKE_TYPES = ['Vanlig cykel', 'Elcykel', 'Mountainbike', 'Racercykel', 'Lådcykel', 'Barncykel', 'Annat']
const REPAIR_CATEGORIES = [
  'Punktering / däckbyte',
  'Bromsar',
  'Växlar / kedja',
  'Service / genomgång',
  'Elcykel-problem',
  'Hjul / ekrar',
  'Lyse / elektronik',
  'Annat',
]
const URGENCY = [
  { value: 'asap', label: 'Så snart som möjligt' },
  { value: 'this_week', label: 'Den här veckan' },
  { value: 'flexible', label: 'Flexibel' },
]

const schema = z.object({
  bike_type: z.string().min(1, 'Välj vilken typ av cykel du har'),
  repair_category: z.string().min(1, 'Välj vad du behöver hjälp med'),
  description: z.string().trim().min(10, 'Beskriv felet med minst tio tecken').max(2000),
  area: z.string().trim().max(80).optional(),
  postcode: z.string().trim().max(10).optional(),
  urgency: z.string().min(1),
  can_drop_off: z.boolean(),
  wants_pickup: z.boolean(),
  customer_name: z.string().trim().min(2, 'Ange ditt namn').max(80),
  customer_email: z.string().trim().email('Ange en giltig e-postadress').max(160),
  customer_phone: z.string().trim().max(40).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Du måste godkänna integritetspolicyn' }) }),
})

type FormState = z.input<typeof schema>

const DEFAULT_FORM: FormState = {
  bike_type: '',
  repair_category: '',
  description: '',
  area: '',
  postcode: '',
  urgency: 'flexible',
  can_drop_off: true,
  wants_pickup: false,
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  consent: false,
}

const DRAFT_KEY = 'cykelhjalpen_request_draft_v2'
const steps = ['Cykel', 'Problem', 'Plats', 'Kontakt & skicka']

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
      // The edge function did not return JSON.
    }
  }
  return (error as any)?.message || fallback
}

const BikeRequestWizard = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [form, setForm] = useState<FormState>(() => {
    if (typeof window === 'undefined') return DEFAULT_FORM
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY)
      if (!draft) return DEFAULT_FORM
      return { ...DEFAULT_FORM, ...JSON.parse(draft), consent: false }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY)
      return DEFAULT_FORM
    }
  })

  const imagePreviews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  )

  useEffect(() => {
    trackClick('bike_request_started', 'Skicka cykelärende')
    trackGoogleEvent('begin_checkout', { item_name: 'Cykelärende' })
  }, [])

  useEffect(() => {
    const draft = { ...form, consent: false }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [form])

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [imagePreviews])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const canContinue = () => {
    if (step === 0) return Boolean(form.bike_type)
    if (step === 1) return Boolean(form.repair_category) && form.description.trim().length >= 10
    if (step === 2) return Boolean(form.urgency) && (form.can_drop_off || form.wants_pickup)
    if (step === 3) {
      return form.customer_name.trim().length >= 2
        && /\S+@\S+\.\S+/.test(form.customer_email)
        && form.consent === true
    }
    return false
  }

  const goNext = () => {
    if (!canContinue()) return
    trackClick('bike_request_step_completed', steps[step], { step: step + 1 })
    setStep((current) => Math.min(steps.length - 1, current + 1))
  }

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024
    const selected = Array.from(event.target.files || []).slice(0, 4)
    const valid: File[] = []

    for (const file of selected) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: endast JPEG, PNG eller WebP tillåts`)
        continue
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: filen är större än fem MB`)
        continue
      }
      valid.push(file)
    }

    setFiles(valid)
    event.target.value = ''
  }

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null)
  }, [])

  const resetTurnstile = () => {
    setTurnstileToken(null)
    setTurnstileResetKey((current) => current + 1)
  }

  const uploadImages = async (requestId: string) => {
    const results = await Promise.all(files.map(async (file) => {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${requestId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('bike-images')
        .upload(path, file, { upsert: false, contentType: file.type })

      if (uploadError) return file.name

      const { error: insertError } = await supabase
        .from('bike_request_images')
        .insert({ request_id: requestId, image_url: path })

      return insertError ? file.name : null
    }))

    return results.filter((result): result is string => Boolean(result))
  }

  const submit = async () => {
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Kontrollera att alla obligatoriska uppgifter är ifyllda')
      return
    }
    if (!turnstileToken) {
      toast.error('Bekräfta säkerhetskontrollen innan du skickar')
      return
    }

    setSubmitting(true)
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
          city: 'Linköping',
          turnstile_token: turnstileToken,
        },
      })

      if (error) throw new Error(await getFunctionErrorMessage(error, 'Kunde inte skicka ärendet'))
      if (!request?.id || !request?.view_token) {
        throw new Error(typeof request?.error === 'string' ? request.error : 'Kunde inte skapa ärendet')
      }

      const uploadErrors = files.length > 0 ? await uploadImages(request.id) : []

      sessionStorage.removeItem(DRAFT_KEY)
      trackClick('bike_request_submitted', 'Skicka ärende', {
        bike_type: parsed.data.bike_type,
        repair_category: parsed.data.repair_category,
        has_images: files.length > 0,
      })
      trackGoogleEvent('generate_lead', {
        currency: 'SEK',
        value: 0,
        lead_type: 'bike_repair_request',
      })

      toast.success('Tack! Ditt ärende är skickat till anslutna verkstäder.')
      if (uploadErrors.length > 0) {
        toast.error(`${uploadErrors.length} av ${files.length} bilder kunde inte laddas upp. Själva ärendet är ändå skickat.`)
      }
      navigate(`/mitt-arende/${request.view_token}`)
    } catch (error) {
      resetTurnstile()
      toast.error((error as Error)?.message || 'Något gick fel. Försök igen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Skicka cykelärende — gratis offert i Linköping | Cykelhjälpen</title>
        <meta name="description" content="Beskriv ditt cykelproblem på två minuter och få upp till fem prisförslag från lokala cykelverkstäder i Linköping. Helt gratis." />
        <link rel="canonical" href="https://cykelhjalpen.se/skicka-arende" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Skicka cykelärende — gratis offert i Linköping | Cykelhjälpen" />
        <meta property="og:description" content="Beskriv ditt cykelproblem på två minuter och få upp till fem prisförslag från lokala cykelverkstäder i Linköping." />
        <meta property="og:url" content="https://cykelhjalpen.se/skicka-arende" />
        <meta property="og:image" content="https://cykelhjalpen.se/og/skicka-arende.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Skicka cykelärende — gratis offert i Linköping" />
        <meta name="twitter:description" content="Få upp till fem prisförslag från lokala cykelverkstäder i Linköping." />
        <meta name="twitter:image" content="https://cykelhjalpen.se/og/skicka-arende.jpg" />
      </Helmet>

      <CykelNavbar />

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="sticker bg-brand-sun p-2"><Bike className="h-5 w-5" /></div>
            <div>
              <h1 className="font-display text-3xl font-bold">Få pris på cykelreparation</h1>
              <p className="text-sm text-muted-foreground">Steg {step + 1} av {steps.length}: {steps[step]}</p>
            </div>
          </div>

          <div className="mb-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Gratis och utan konto</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-primary" /> Tar cirka två minuter</span>
          </div>

          <div className="flex gap-2 mb-8" aria-label={`Steg ${step + 1} av ${steps.length}`}>
            {steps.map((label, index) => (
              <div key={label} className={`flex-1 h-2 rounded-full ${index <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          <div className="sticker bg-card p-6 md:p-8 space-y-6">
            {step === 0 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-base">Vilken typ av cykel behöver hjälp?</Label>
                  <p className="text-sm text-muted-foreground mt-1">Välj det alternativ som ligger närmast.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {BIKE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => update('bike_type', type)}
                      className={`text-left px-4 py-3 border-2 border-foreground rounded-md transition ${form.bike_type === type ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      aria-pressed={form.bike_type === type}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div>
                    <Label className="text-base">Vad behöver du hjälp med?</Label>
                    <p className="text-sm text-muted-foreground mt-1">Du behöver inte själv veta exakt vad som är fel.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {REPAIR_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => update('repair_category', category)}
                        className={`text-left px-4 py-3 border-2 border-foreground rounded-md transition ${form.repair_category === category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        aria-pressed={form.repair_category === category}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="desc">Beskriv problemet</Label>
                  <Textarea
                    id="desc"
                    rows={4}
                    value={form.description}
                    onChange={(event) => update('description', event.target.value)}
                    placeholder="Exempel: Bakhjulet vinglar och bromsen tar dåligt. Problemet började i går."
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minst tio tecken · {form.description.length}/2000</p>
                </div>

                <div className="space-y-3 border-t pt-5">
                  <div>
                    <Label>Bilder <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
                    <p className="text-sm text-muted-foreground mt-1">En bild kan ge snabbare och mer träffsäkra prisförslag.</p>
                  </div>
                  <label className="sticker bg-muted/50 p-5 flex items-center justify-center gap-3 cursor-pointer hover:bg-muted">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium">Välj upp till fyra bilder</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFiles} />
                  </label>
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {imagePreviews.map(({ file, url }) => (
                        <div key={`${file.name}-${file.lastModified}-${file.size}`} className="aspect-square sticker bg-muted overflow-hidden">
                          <img src={url} alt="Förhandsvisning av vald cykelbild" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-base">När behöver du hjälp?</Label>
                  <RadioGroup value={form.urgency} onValueChange={(value) => update('urgency', value)} className="mt-3">
                    {URGENCY.map((urgency) => (
                      <div key={urgency.value} className="flex items-center space-x-2 rounded-md border p-3">
                        <RadioGroupItem value={urgency.value} id={urgency.value} />
                        <Label htmlFor={urgency.value} className="flex-1 cursor-pointer">{urgency.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="area">Område <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
                    <Input id="area" value={form.area || ''} onChange={(event) => update('area', event.target.value)} placeholder="Exempel: Ryd" />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postnummer <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
                    <Input id="postcode" inputMode="numeric" value={form.postcode || ''} onChange={(event) => update('postcode', event.target.value)} placeholder="583 30" />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-5">
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <Checkbox id="drop" checked={form.can_drop_off} onCheckedChange={(value) => update('can_drop_off', value === true)} />
                    <Label htmlFor="drop" className="cursor-pointer leading-snug">Jag kan lämna in cykeln på verkstaden</Label>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <Checkbox id="pick" checked={form.wants_pickup} onCheckedChange={(value) => update('wants_pickup', value === true)} />
                    <Label htmlFor="pick" className="cursor-pointer leading-snug">Jag vill helst att verkstaden hämtar cykeln</Label>
                  </div>
                  {!form.can_drop_off && !form.wants_pickup && (
                    <p className="text-sm text-destructive">Välj minst ett av alternativen ovan.</p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-xl bg-muted/60 p-4 text-sm">
                  <div className="font-semibold mb-2">Din förfrågan</div>
                  <div className="grid sm:grid-cols-2 gap-2 text-muted-foreground">
                    <button type="button" onClick={() => setStep(0)} className="text-left hover:text-foreground">
                      Cykel: <span className="text-foreground font-medium">{form.bike_type}</span>
                    </button>
                    <button type="button" onClick={() => setStep(1)} className="text-left hover:text-foreground">
                      Problem: <span className="text-foreground font-medium">{form.repair_category}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Namn</Label>
                  <Input id="name" autoComplete="name" value={form.customer_name} onChange={(event) => update('customer_name', event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">E-post</Label>
                  <Input id="email" type="email" inputMode="email" autoComplete="email" value={form.customer_email} onChange={(event) => update('customer_email', event.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Vi mejlar en personlig länk där du ser och jämför svaren.</p>
                </div>
                <div>
                  <Label htmlFor="phone">Telefon <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
                  <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.customer_phone || ''} onChange={(event) => update('customer_phone', event.target.value)} />
                </div>

                <div className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox id="consent" checked={form.consent} onCheckedChange={(value) => update('consent', value === true)} />
                  <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                    Jag godkänner att uppgifterna delas med anslutna cykelverkstäder som vill lämna offert, enligt{' '}
                    <a href="/integritetspolicy" target="_blank" rel="noreferrer" className="underline">integritetspolicyn</a>.
                  </Label>
                </div>

                <div className="border-t pt-5">
                  <p className="text-sm font-medium mb-2">Säkerhetskontroll</p>
                  <Turnstile
                    onVerify={handleTurnstileVerify}
                    onExpire={handleTurnstileExpire}
                    resetKey={turnstileResetKey}
                  />
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Det kostar ingenting och du förbinder dig inte att välja någon verkstad.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3 mt-6">
            <Button variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || submitting}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
            </Button>

            {step < steps.length - 1 ? (
              <Button onClick={goNext} disabled={!canContinue()} className="min-w-32">
                Fortsätt <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
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
