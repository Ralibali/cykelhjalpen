import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, MapPin } from 'lucide-react'
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

    setSaving(true)
    const normalizedWebsite = form.website
      ? (/^https?:\/\//i.test(form.website) ? form.website : `https://${form.website}`)
      : null

    const [{ error: workshopError }, { error: profileError }] = await Promise.all([
      supabase
        .from('workshops')
        .update({
          company_name: form.company_name.trim(),
          phone: form.phone || null,
          address: form.address || null,
          website: normalizedWebsite,
          city: form.city,
          sms_notifications: Boolean(form.sms_notifications),
        })
        .eq('id', workshop.id),
      user
        ? supabase.from('profiles').update({ company_name: form.company_name.trim(), phone: form.phone || null, city: form.city }).eq('id', user.id)
        : Promise.resolve({ error: null }),
    ])
    setSaving(false)

    if (workshopError || profileError) {
      toast.error(workshopError?.message || profileError?.message || 'Kunde inte spara')
      return
    }

    setForm((current) => ({ ...current, website: normalizedWebsite }))
    toast.success('Inställningarna är sparade')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Inställningar</h1>
        <p className="text-sm text-muted-foreground mt-1">Håll kontaktuppgifter och serviceområde aktuella.</p>
      </div>

      <div className="sticker bg-card p-6 space-y-5 max-w-xl">
        <div>
          <Label htmlFor="company-name">Verkstadens namn</Label>
          <Input id="company-name" value={form.company_name || ''} onChange={(event) => setForm({ ...form, company_name: event.target.value })} />
        </div>

        <div>
          <Label>Stad</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">Ni får bara ärenden från den valda staden.</p>
          <div className="grid grid-cols-2 gap-2">
            {CYKEL_CITIES.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => setForm({ ...form, city: city.name })}
                aria-pressed={form.city === city.name}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-md border-2 text-sm ${form.city === city.name ? 'bg-primary text-primary-foreground border-primary' : 'border-foreground hover:bg-muted'}`}
              >
                <MapPin className="h-4 w-4" /> {city.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" type="tel" inputMode="tel" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="website">Webbplats</Label>
            <Input id="website" inputMode="url" value={form.website || ''} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://verkstad.se" />
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
