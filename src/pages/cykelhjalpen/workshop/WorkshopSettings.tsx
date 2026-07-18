import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Lock, MapPin } from 'lucide-react'
import { CYKEL_CITIES, isCykelCity } from '@/lib/cykelCities'
import type { WorkshopContext } from '@/components/cykelhjalpen/WorkshopLayout'
import { useAuth } from '@/hooks/useAuth'

const WorkshopSettings = () => {
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
  const { user } = useAuth()
  const [form, setForm] = useState(workshop)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(workshop) }, [workshop])

  const save = async () => {
    if (form.company_name.trim().length < 2) return toast.error('Ange verkstadens namn')
    if (!isCykelCity(form.city)) return toast.error('Välj en giltig stad')
    if (workshop.approved && form.city !== workshop.city) {
      setForm((current) => ({ ...current, city: workshop.city }))
      return toast.error('En godkänd verkstads serviceort ändras av Cykelhjälpen efter kontroll. Kontakta info@cykelhjalpen.se.')
    }

    setSaving(true)
    const normalizedWebsite = form.website
      ? (/^https?:\/\//i.test(form.website) ? form.website : `https://${form.website}`)
      : null

    const workshopUpdate = {
      company_name: form.company_name.trim(),
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
      website: normalizedWebsite,
      city: workshop.approved ? workshop.city : form.city,
      sms_notifications: Boolean(form.sms_notifications && form.phone),
    }

    const [{ error: workshopError }, { error: profileError }] = await Promise.all([
      supabase.from('workshops').update(workshopUpdate).eq('id', workshop.id),
      user
        ? supabase.from('profiles').update({
            company_name: form.company_name.trim(),
            phone: form.phone?.trim() || null,
            city: workshop.approved ? workshop.city : form.city,
          }).eq('id', user.id)
        : Promise.resolve({ error: null }),
    ])
    setSaving(false)

    if (workshopError || profileError) {
      const message = workshopError?.message?.includes('approved_workshop_city_locked')
        ? 'Serviceorten är låst för godkända verkstäder. Kontakta info@cykelhjalpen.se.'
        : workshopError?.message || profileError?.message || 'Kunde inte spara'
      toast.error(message)
      return
    }

    setForm((current) => ({ ...current, ...workshopUpdate }))
    toast.success('Inställningarna är sparade')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Inställningar</h1>
        <p className="text-sm text-muted-foreground mt-1">Håll kontaktuppgifter och serviceområde aktuella.</p>
      </div>

      <div className="sticker rounded-3xl bg-card p-6 space-y-5 max-w-xl">
        <div>
          <Label htmlFor="company-name">Verkstadens namn</Label>
          <Input id="company-name" value={form.company_name || ''} onChange={(event) => setForm({ ...form, company_name: event.target.value })} />
        </div>

        <div>
          <Label>Stad</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            {workshop.approved
              ? 'Serviceorten är låst efter godkännandet. Kontakta info@cykelhjalpen.se om verksamheten flyttar.'
              : 'Ni får bara ärenden från den valda staden. Orten låses när verkstaden godkänns.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CYKEL_CITIES.map((city) => {
              const disabled = workshop.approved
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => !disabled && setForm({ ...form, city: city.name })}
                  disabled={disabled}
                  aria-pressed={form.city === city.name}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-medium transition ${
                    form.city === city.name
                      ? 'bg-primary text-primary-foreground border-foreground shadow-[3px_3px_0_hsl(var(--ink))]'
                      : 'border-border hover:border-foreground'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  {disabled && form.city === city.name ? <Lock className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  {city.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="website">Webbplats</Label>
            <Input id="website" inputMode="url" autoComplete="url" value={form.website || ''} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://verkstad.se" />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Adress</Label>
          <Input id="address" autoComplete="street-address" value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </div>

        <div className="flex items-start justify-between gap-4 pt-4 border-t">
          <div>
            <Label htmlFor="sms_notifications" className="cursor-pointer">SMS vid nytt ärende</Label>
            <p className="text-xs text-muted-foreground mt-1">Kräver att telefonnummer är ifyllt. SMS skickas bara för ärenden i {form.city}.</p>
          </div>
          <Switch id="sms_notifications" checked={Boolean(form.sms_notifications)} onCheckedChange={(value) => setForm({ ...form, sms_notifications: value })} disabled={!form.phone} />
        </div>

        <Button onClick={save} disabled={saving} className="min-w-28">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? 'Sparar…' : 'Spara'}
        </Button>
      </div>
    </div>
  )
}

export default WorkshopSettings
