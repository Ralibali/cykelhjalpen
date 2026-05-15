import { useState } from 'react'
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
import { Bike, Camera, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Helmet } from 'react-helmet-async'

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
  bike_type: z.string().min(1),
  repair_category: z.string().min(1),
  description: z.string().trim().min(10, 'Beskriv felet med minst tio tecken').max(2000),
  area: z.string().trim().max(80).optional(),
  postcode: z.string().trim().max(10).optional(),
  urgency: z.string().min(1),
  can_drop_off: z.boolean(),
  wants_pickup: z.boolean(),
  customer_name: z.string().trim().min(2).max(80),
  customer_email: z.string().trim().email('Ogiltig e-post').max(160),
  customer_phone: z.string().trim().max(40).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Du måste godkänna villkoren' }) }),
})

const steps = ['Cykel', 'Problem', 'Plats', 'Kontakt', 'Bilder']

const BikeRequestWizard = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [form, setForm] = useState({
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
  })

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const canNext = () => {
    if (step === 0) return !!form.bike_type
    if (step === 1) return !!form.repair_category && form.description.trim().length >= 10
    if (step === 2) return !!form.urgency && (form.can_drop_off || form.wants_pickup)
    if (step === 3) return form.customer_name.length >= 2 && /\S+@\S+\.\S+/.test(form.customer_email) && form.consent
    return true
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    const MAX = 5 * 1024 * 1024
    const list = Array.from(e.target.files || []).slice(0, 4)
    const valid: File[] = []
    for (const f of list) {
      if (!ALLOWED.includes(f.type)) {
        toast.error(`${f.name}: endast JPEG, PNG eller WebP tillåts`)
        continue
      }
      if (f.size > MAX) {
        toast.error(`${f.name}: filen är större än fem MB`)
        continue
      }
      valid.push(f)
    }
    setFiles(valid)
  }

  const submit = async () => {
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Något saknas')
      return
    }
    setSubmitting(true)
    try {
      const { data: rows, error } = await supabase.rpc('submit_bike_repair_request', {
        p_bike_type: form.bike_type,
        p_repair_category: form.repair_category,
        p_description: form.description,
        p_area: form.area || null,
        p_postcode: form.postcode || null,
        p_urgency: form.urgency,
        p_can_drop_off: form.can_drop_off,
        p_wants_pickup: form.wants_pickup,
        p_customer_name: form.customer_name,
        p_customer_email: form.customer_email,
        p_customer_phone: form.customer_phone || null,
        p_city: 'Linköping',
      })
      if (error) throw error
      const req = Array.isArray(rows) ? rows[0] : rows
      if (!req) throw new Error('Kunde inte skapa ärende')

      // Upload images (best-effort)
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${req.id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('bike-images').upload(path, file, { upsert: false })
        if (!upErr) {
          const { data } = supabase.storage.from('bike-images').getPublicUrl(path)
          await supabase.from('bike_request_images').insert({ request_id: req.id, image_url: data.publicUrl })
        }
      }

      toast.success('Tack! Ditt ärende är skickat.')
      navigate(`/mitt-arende/${req.view_token}`)
    } catch (e: any) {
      toast.error(e.message || 'Något gick fel, försök igen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Skicka cykelärende — gratis offert i Linköping | Cykelhjälpen</title>
        <meta name="description" content="Beskriv ditt cykelproblem på två minuter och få upp till fem prisförslag från lokala cykelverkstäder i Linköping. Helt gratis." />
        <link rel="canonical" href="/skicka-arende" />
      </Helmet>
      <CykelNavbar />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="sticker bg-brand-sun p-2"><Bike className="h-5 w-5" /></div>
            <h1 className="font-display text-3xl font-bold">Skicka cykelärende</h1>
          </div>
          <p className="text-muted-foreground mb-8">Gratis. Inget konto. Du får svar inom ett dygn.</p>

          <div className="flex gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s} className={`flex-1 h-2 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          <div className="sticker bg-card p-6 md:p-8 space-y-6">
            {step === 0 && (
              <div className="space-y-3">
                <Label>Vilken typ av cykel?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BIKE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update('bike_type', t)}
                      className={`text-left px-4 py-3 border-2 border-foreground rounded-md transition ${form.bike_type === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Vad är problemet?</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {REPAIR_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => update('repair_category', c)}
                        className={`text-left px-4 py-3 border-2 border-foreground rounded-md transition ${form.repair_category === c ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="desc">Beskriv felet</Label>
                  <Textarea id="desc" rows={5} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="T.ex. 'Bakhjulet vinglar och bromsen tar dåligt.'" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>När behöver du hjälp?</Label>
                  <RadioGroup value={form.urgency} onValueChange={(v) => update('urgency', v)} className="mt-2">
                    {URGENCY.map((u) => (
                      <div key={u.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={u.value} id={u.value} />
                        <Label htmlFor={u.value}>{u.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="area">Område (valfritt)</Label>
                    <Input id="area" value={form.area} onChange={(e) => update('area', e.target.value)} placeholder="T.ex. Ryd, Innerstaden" />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postnummer (valfritt)</Label>
                    <Input id="postcode" value={form.postcode} onChange={(e) => update('postcode', e.target.value)} placeholder="58330" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="drop" checked={form.can_drop_off} onCheckedChange={(v) => update('can_drop_off', !!v)} />
                    <Label htmlFor="drop">Jag kan lämna in cykeln på verkstaden</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="pick" checked={form.wants_pickup} onCheckedChange={(v) => update('wants_pickup', !!v)} />
                    <Label htmlFor="pick">Jag vill helst att verkstaden hämtar cykeln</Label>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Namn</Label>
                  <Input id="name" value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">E-post</Label>
                  <Input id="email" type="email" value={form.customer_email} onChange={(e) => update('customer_email', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon (valfritt)</Label>
                  <Input id="phone" value={form.customer_phone} onChange={(e) => update('customer_phone', e.target.value)} />
                </div>
                <div className="flex items-start gap-2 pt-2">
                  <Checkbox id="consent" checked={form.consent} onCheckedChange={(v) => update('consent', !!v)} />
                  <Label htmlFor="consent" className="text-sm leading-relaxed">
                    Jag godkänner att mina uppgifter delas med anslutna cykelverkstäder som vill lämna offert, enligt{' '}
                    <a href="/integritetspolicy" className="underline">integritetspolicyn</a>.
                  </Label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <Label>Bilder (valfritt — max fyra)</Label>
                <p className="text-sm text-muted-foreground">Hjälper verkstaden ge en mer exakt offert.</p>
                <label className="sticker bg-muted/50 p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted">
                  <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
                  <span className="text-sm">Välj bilder</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                </label>
                {files.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="aspect-square sticker bg-muted overflow-hidden">
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Fortsätt <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Skicka ärende
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
