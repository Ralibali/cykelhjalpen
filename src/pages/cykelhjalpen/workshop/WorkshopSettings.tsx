import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Lock, MapPin, Upload, Trash2, ExternalLink } from 'lucide-react'
import { CYKEL_CITIES, isCykelCity } from '@/lib/cykelCities'
import { validateNewPassword } from '@/lib/authRecovery'
import { savePublicProfileConsent, workshopProfilePath } from '@/lib/v2/directory'
import type { WorkshopContext } from '@/components/cykelhjalpen/WorkshopLayout'
import WorkshopRetentionPanel from '@/components/cykelhjalpen/WorkshopRetentionPanel'
import { useAuth } from '@/hooks/useAuth'
import { useV2Flag } from '@/hooks/useV2Flag'
import { useT } from '@/lib/i18n'

const BIO_SHORT_MAX = 280

const WorkshopSettings = () => {
  const t = useT()
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
  const { user } = useAuth()
  const [form, setForm] = useState(workshop)
  const [saving, setSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [changing, setChanging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savingPublic, setSavingPublic] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // V2 QA fix: the public-directory opt-in is flag-gated
  // (v2.directory.public_profiles). With the flag OFF the section renders
  // nothing — the surface is off and the RPC v2_set_public_profile rejects
  // opt-in server-side too.
  const publicProfilesOn = useV2Flag('v2.directory.public_profiles') === true

  // V2 S4: publik profil (kontrakt §2.4) — samtycke + kort beskrivning sparas
  // via RPC:n v2_set_public_profile som också tilldelar slug vid opt-in.
  const savePublicProfile = async () => {
    if (!workshop.approved) {
      return toast.error(t('Profilen kan publiceras först när verkstaden är godkänd.'))
    }
    const bio = form.bio_short?.trim() || null
    if (bio && bio.length > BIO_SHORT_MAX) {
      return toast.error(t('Kort beskrivning får vara max {max} tecken.', { max: BIO_SHORT_MAX }))
    }
    setSavingPublic(true)
    const result = await savePublicProfileConsent({ bioShort: bio, optIn: Boolean(form.public_profile_opt_in) })
    setSavingPublic(false)
    if ('error' in result) {
      return toast.error(result.error === 'network' ? t('Kunde inte spara') : result.error)
    }
    setForm((current) => ({
      ...current,
      bio_short: result.bio_short,
      public_profile_opt_in: result.public_profile_opt_in,
      slug: result.slug ?? current.slug,
    }))
    toast.success(result.public_profile_opt_in
      ? t('Profilen är nu publik i verkstadskatalogen.')
      : t('Profilen är inte längre publik.'))
  }

  const uploadLogo = async (file: File) => {
    if (!user) return
    if (!file.type.startsWith('image/')) return toast.error(t('Välj en bildfil (PNG, JPG eller SVG).'))
    if (file.size > 2 * 1024 * 1024) return toast.error(t('Bilden får vara max 2 MB.'))

    setUploading(true)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${user.id}/logo-${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      toast.error(t('Kunde inte ladda upp logotypen.'))
      return
    }

    const { data: publicUrl } = supabase.storage.from('logos').getPublicUrl(path)
    const { error } = await supabase.from('workshops').update({ logo_url: publicUrl.publicUrl }).eq('id', workshop.id)
    setUploading(false)

    if (error) return toast.error(t('Kunde inte spara logotypen.'))
    setForm((current) => ({ ...current, logo_url: publicUrl.publicUrl }))
    toast.success(t('Logotypen är uppdaterad.'))
  }

  const removeLogo = async () => {
    const { error } = await supabase.from('workshops').update({ logo_url: null }).eq('id', workshop.id)
    if (error) return toast.error(t('Kunde inte ta bort logotypen.'))
    setForm((current) => ({ ...current, logo_url: null }))
    toast.success(t('Logotypen är borttagen.'))
  }


  const changePassword = async () => {
    if (changing) return
    const validationError = validateNewPassword(password, confirmation)
    if (validationError) return toast.error(t(validationError))

    setChanging(true)
    const { error } = await supabase.auth.updateUser({ password })
    setChanging(false)

    if (error) {
      toast.error(t('Kunde inte uppdatera lösenordet. Försök igen.'))
      return
    }
    setPassword('')
    setConfirmation('')
    toast.success(t('Lösenordet är uppdaterat.'))
  }

  useEffect(() => { setForm(workshop) }, [workshop])

  const save = async () => {
    if (form.company_name.trim().length < 2) return toast.error(t('Ange verkstadens namn'))
    if (!isCykelCity(form.city)) return toast.error(t('Välj en giltig stad'))
    if (workshop.approved && form.city !== workshop.city) {
      setForm((current) => ({ ...current, city: workshop.city }))
      return toast.error(t('En godkänd verkstads serviceort ändras av Cykelhjälpen efter kontroll. Kontakta info@cykelhjalpen.se.'))
    }

    setSaving(true)
    const normalizedWebsite = form.website
      ? (/^https?:\/\//i.test(form.website) ? form.website : `https://${form.website}`)
      : null

    const normalizeUrl = (value?: string | null) => {
      const trimmed = value?.trim()
      if (!trimmed) return null
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    }

    const workshopUpdate = {
      company_name: form.company_name.trim(),
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
      website: normalizedWebsite,
      city: workshop.approved ? workshop.city : form.city,
      sms_notifications: Boolean(form.sms_notifications && form.phone),
      description: form.description?.trim() || null,
      opening_hours: form.opening_hours?.trim() || null,
      org_number: form.org_number?.trim() || null,
      founded_year: form.founded_year ? Number(form.founded_year) : null,
      price_info: form.price_info?.trim() || null,
      facebook_url: normalizeUrl(form.facebook_url),
      instagram_url: normalizeUrl(form.instagram_url),
      booking_url: normalizeUrl(form.booking_url),
      services: (form.services || []).filter(Boolean),
      areas_served: (form.areas_served || []).filter(Boolean),
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
        ? t('Serviceorten är låst för godkända verkstäder. Kontakta info@cykelhjalpen.se.')
        : workshopError?.message || profileError?.message || t('Kunde inte spara')
      toast.error(message)
      return
    }

    setForm((current) => ({ ...current, ...workshopUpdate }))
    toast.success(t('Inställningarna är sparade'))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">{t('Inställningar')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('Håll kontaktuppgifter och serviceområde aktuella.')}</p>
      </div>

      <div className="sticker rounded-3xl bg-card p-6 space-y-5 max-w-xl">
        <div>
          <Label htmlFor="company-name">{t('Verkstadens namn')}</Label>
          <Input id="company-name" value={form.company_name || ''} onChange={(event) => setForm({ ...form, company_name: event.target.value })} />
        </div>

        <div>
          <Label>{t('Stad')}</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            {workshop.approved
              ? t('Serviceorten är låst efter godkännandet. Kontakta info@cykelhjalpen.se om verksamheten flyttar.')
              : t('Ni får bara ärenden från den valda staden. Orten låses när verkstaden godkänns.')}
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
            <Label htmlFor="phone">{t('Telefon')}</Label>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="website">{t('Webbplats')}</Label>
            <Input id="website" inputMode="url" autoComplete="url" value={form.website || ''} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://verkstad.se" />
          </div>
        </div>

        <div>
          <Label htmlFor="address">{t('Adress')}</Label>
          <Input id="address" autoComplete="street-address" value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </div>

        <div className="pt-4 border-t space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold">{t('Verkstadens profil')}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t('Frivilligt, men gör att kunder väljer er oftare.')}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 rounded-2xl border bg-muted/40 overflow-hidden flex items-center justify-center">
              {form.logo_url
                ? <img src={form.logo_url} alt={t('Verkstadens logotyp')} className="h-full w-full object-contain" />
                : <span className="text-[11px] text-muted-foreground text-center px-2">{t('Ingen logotyp')}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) uploadLogo(file)
                  event.target.value = ''
                }}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {t('Ladda upp logotyp')}
              </Button>
              {form.logo_url && (
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo}>
                  <Trash2 className="h-4 w-4 mr-2" /> {t('Ta bort')}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('Presentation av verkstaden')}</Label>
            <Textarea
              id="description"
              rows={4}
              maxLength={1200}
              value={form.description || ''}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder={t('Berätta kort om verkstaden, erfarenhet och vad ni är bäst på.')}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opening_hours">{t('Öppettider')}</Label>
              <Input id="opening_hours" value={form.opening_hours || ''} onChange={(event) => setForm({ ...form, opening_hours: event.target.value })} placeholder={t('Vardagar nio till sjutton')} />
            </div>
            <div>
              <Label htmlFor="price_info">{t('Prisinformation')}</Label>
              <Input id="price_info" value={form.price_info || ''} onChange={(event) => setForm({ ...form, price_info: event.target.value })} placeholder={t('Exempel: service från 495 kr')} />
            </div>
            <div>
              <Label htmlFor="org_number">{t('Organisationsnummer')}</Label>
              <Input id="org_number" value={form.org_number || ''} onChange={(event) => setForm({ ...form, org_number: event.target.value })} placeholder="556677-8899" />
            </div>
            <div>
              <Label htmlFor="founded_year">{t('Grundat år')}</Label>
              <Input
                id="founded_year"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                value={form.founded_year ?? ''}
                onChange={(event) => setForm({ ...form, founded_year: event.target.value ? Number(event.target.value) : null })}
              />
            </div>
            <div>
              <Label htmlFor="facebook_url">Facebook</Label>
              <Input id="facebook_url" value={form.facebook_url || ''} onChange={(event) => setForm({ ...form, facebook_url: event.target.value })} placeholder="facebook.com/verkstad" />
            </div>
            <div>
              <Label htmlFor="instagram_url">Instagram</Label>
              <Input id="instagram_url" value={form.instagram_url || ''} onChange={(event) => setForm({ ...form, instagram_url: event.target.value })} placeholder="instagram.com/verkstad" />
            </div>
          </div>

          <div>
            <Label htmlFor="booking_url">{t('Länk till bokning')}</Label>
            <Input id="booking_url" value={form.booking_url || ''} onChange={(event) => setForm({ ...form, booking_url: event.target.value })} placeholder="https://boka.verkstad.se" />
          </div>

          <div>
            <Label htmlFor="services">{t('Tjänster (kommaseparerat)')}</Label>
            <Input
              id="services"
              value={(form.services || []).join(', ')}
              onChange={(event) => setForm({ ...form, services: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
              placeholder={t('Service, punktering, växeljustering, elcykel')}
            />
          </div>

          <div>
            <Label htmlFor="areas_served">{t('Områden ni täcker (kommaseparerat)')}</Label>
            <Input
              id="areas_served"
              value={(form.areas_served || []).join(', ')}
              onChange={(event) => setForm({ ...form, areas_served: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
              placeholder={t('Ryd, Innerstaden, Vallastaden')}
            />
          </div>
        </div>



        <div className="flex items-start justify-between gap-4 pt-4 border-t">
          <div>
            <Label htmlFor="sms_notifications" className="cursor-pointer">{t('SMS vid nytt ärende')}</Label>
            <p className="text-xs text-muted-foreground mt-1">{t('Kräver att telefonnummer är ifyllt. SMS skickas bara för ärenden i {city}.', { city: form.city })}</p>
          </div>
          <Switch id="sms_notifications" checked={Boolean(form.sms_notifications)} onCheckedChange={(value) => setForm({ ...form, sms_notifications: value })} disabled={!form.phone} />
        </div>

        <Button onClick={save} disabled={saving} className="min-w-28">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? t('Sparar…') : t('Spara')}
        </Button>
      </div>

      {publicProfilesOn && (
      <div className="sticker rounded-3xl bg-card p-6 space-y-5 max-w-xl mt-6">
        <div>
          <h2 className="font-display text-xl font-bold">{t('Publik profil i verkstadskatalogen')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t('Väljs det här visas verkstaden på Cykelhjälpens publika stadssidor med namn, stad, tjänster, områden, logotyp, webbplats, kort beskrivning och publicerade recensioner. E-post, telefon och adress visas aldrig.')}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="bio_short">{t('Kort beskrivning (visas publikt)')}</Label>
            <span className="text-xs text-muted-foreground">{(form.bio_short || '').length}/{BIO_SHORT_MAX}</span>
          </div>
          <Textarea
            id="bio_short"
            rows={3}
            maxLength={BIO_SHORT_MAX}
            value={form.bio_short || ''}
            onChange={(event) => setForm({ ...form, bio_short: event.target.value })}
            placeholder={t('Exempel: Familjeverkstad sedan 1998. Snabb hjälp med punktering, service och elcyklar.')}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="public_profile_opt_in" className="cursor-pointer">{t('Visa verkstaden i den publika katalogen')}</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {workshop.approved
                ? t('Ni kan stänga av visningen när som helst – profilen försvinner då direkt från de publika sidorna.')
                : t('Profilen kan publiceras först när verkstaden är godkänd av Cykelhjälpen.')}
            </p>
          </div>
          <Switch
            id="public_profile_opt_in"
            checked={Boolean(form.public_profile_opt_in)}
            onCheckedChange={(value) => setForm({ ...form, public_profile_opt_in: value })}
            disabled={!workshop.approved}
          />
        </div>

        {form.public_profile_opt_in && form.slug && (
          <p className="text-sm">
            <Link to={workshopProfilePath(form.slug)} className="inline-flex items-center gap-1 underline underline-offset-4" target="_blank">
              {t('Se er publika profil')} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </p>
        )}

        <Button onClick={savePublicProfile} disabled={savingPublic || !workshop.approved} variant="outline" className="min-w-28">
          {savingPublic && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {savingPublic ? t('Sparar…') : t('Spara publik profil')}
        </Button>
      </div>
      )}

      <div className="sticker rounded-3xl bg-card p-6 space-y-5 max-w-xl mt-6">
        <div>
          <h2 className="font-display text-xl font-bold">{t('Byt lösenord')}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t('Minst åtta tecken.')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="new-password">{t('Nytt lösenord')}</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              wrapperClassName="mt-1"
              placeholder="••••••••"
              showLabel={t('Visa lösenord')}
              hideLabel={t('Dölj lösenord')}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">{t('Bekräfta lösenord')}</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              minLength={8}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              wrapperClassName="mt-1"
              placeholder="••••••••"
              showLabel={t('Visa lösenord')}
              hideLabel={t('Dölj lösenord')}
            />
          </div>
        </div>

        <Button onClick={changePassword} disabled={changing} variant="outline" className="min-w-28">
          {changing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {changing ? t('Sparar…') : t('Byt lösenord')}
        </Button>
      </div>

      {workshop.approved && <WorkshopRetentionPanel workshopId={workshop.id} />}
    </div>
  )
}

export default WorkshopSettings
