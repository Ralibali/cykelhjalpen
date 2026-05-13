import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Bike, Loader2, Send, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Req {
  id: string
  bike_type: string
  repair_category: string
  description: string
  area: string | null
  postcode: string | null
  urgency: string | null
  can_drop_off: boolean
  wants_pickup: boolean
  status: string
  created_at: string
}

const WorkshopRequests = () => {
  const { workshop }: any = useOutletContext()
  const [requests, setRequests] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<string | null>(null)
  const [responseIds, setResponseIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ message: '', estimated_price_min: '', estimated_price_max: '', estimated_time: '', can_pickup: false })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    // Workshops can read all open requests via RLS only after they have a paid response,
    // so we list "open" requests via a public view of non-PII fields by calling an RPC-less query.
    // Strategy: approved workshops can see masked rows in `bike_repair_requests` for status in ('new','has_offers')
    // because of a separate RLS policy added in migration. If not yet there, fall back to function.
    const { data } = await supabase.functions.invoke('list-open-bike-requests')
    setRequests(data?.requests || [])
    const { data: mine } = await supabase.from('workshop_responses').select('request_id').eq('workshop_id', workshop.id)
    setResponseIds(new Set((mine || []).map((m: any) => m.request_id)))
    setLoading(false)
  }

  useEffect(() => { if (workshop?.approved) load() }, [workshop])

  const submitOffer = async (requestId: string) => {
    if (form.message.trim().length < 20) return toast.error('Beskriv ditt svar lite mer (minst tjugo tecken).')
    setSubmitting(true)
    try {
      const { data: resp, error } = await supabase
        .from('workshop_responses')
        .insert({
          request_id: requestId,
          workshop_id: workshop.id,
          message: form.message,
          estimated_price_min: form.estimated_price_min ? parseInt(form.estimated_price_min) : null,
          estimated_price_max: form.estimated_price_max ? parseInt(form.estimated_price_max) : null,
          estimated_time: form.estimated_time || null,
          can_pickup: form.can_pickup,
          status: 'pending_payment',
        })
        .select('id')
        .single()
      if (error) throw error

      const { data: pay, error: pErr } = await supabase.functions.invoke('create-bike-response-payment', {
        body: { response_id: resp.id },
      })
      if (pErr) throw pErr
      if (pay?.url) window.location.href = pay.url
    } catch (e: any) {
      toast.error(e.message || 'Det gick inte att skapa betalningen.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!workshop?.approved) {
    return <div className="sticker bg-card p-6 text-center text-muted-foreground">Ditt konto väntar på godkännande.</div>
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Öppna ärenden</h1>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="sticker bg-card p-6 text-center text-muted-foreground">Inga öppna ärenden just nu.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const responded = responseIds.has(r.id)
            return (
              <div key={r.id} className="sticker bg-card p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bike className="h-4 w-4" />
                      <span className="font-display font-bold">{r.bike_type}</span>
                      <span className="text-muted-foreground text-sm">· {r.repair_category}</span>
                    </div>
                    <p className="text-sm mt-2">{r.description}</p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {r.area && <span>📍 {r.area}</span>}
                      {r.postcode && <span>{r.postcode}</span>}
                      {r.urgency && <span>⏱ {r.urgency}</span>}
                      {r.wants_pickup && <span>🚐 Vill ha hämtning</span>}
                    </div>
                  </div>
                  {responded ? (
                    <span className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Svarat</span>
                  ) : (
                    <Button size="sm" onClick={() => setActive(active === r.id ? null : r.id)}>
                      {active === r.id ? 'Stäng' : 'Lämna offert'}
                    </Button>
                  )}
                </div>

                {active === r.id && !responded && (
                  <div className="border-t border-border mt-4 pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Pris från (kr)</Label>
                        <Input type="number" value={form.estimated_price_min} onChange={(e) => setForm({ ...form, estimated_price_min: e.target.value })} />
                      </div>
                      <div>
                        <Label>Pris till (kr)</Label>
                        <Input type="number" value={form.estimated_price_max} onChange={(e) => setForm({ ...form, estimated_price_max: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Beräknad tid</Label>
                      <Input value={form.estimated_time} onChange={(e) => setForm({ ...form, estimated_time: e.target.value })} placeholder="T.ex. en timme, eller två arbetsdagar" />
                    </div>
                    <div>
                      <Label>Meddelande till kund</Label>
                      <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Femtio kronor debiteras via Stripe när du skickar offerten. Då frigörs kundens kontaktuppgifter för dig.
                    </div>
                    <Button onClick={() => submitOffer(r.id)} disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Skicka offert (femtio kr)
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WorkshopRequests
