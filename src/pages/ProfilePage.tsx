import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'

const ProfilePage = () => {
  const { user, profile, supplierProfile, isBuyer, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    company_name: profile?.company_name || '',
    city: profile?.city || '',
    phone: profile?.phone || '',
    bio: supplierProfile?.bio || '',
    website_url: supplierProfile?.website_url || '',
    contact_name: supplierProfile?.contact_name || '',
    contact_email: supplierProfile?.contact_email || '',
    contact_phone: supplierProfile?.contact_phone || '',
    org_number: supplierProfile?.org_number || '',
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(supplierProfile?.logo_url || null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bilden får vara max 5 MB.')
      return
    }

    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const filePath = `${user.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error('Kunde inte ladda upp logotypen.')
      setUploadingLogo(false)
      return
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl + '?t=' + Date.now()

    await supabase.from('supplier_profiles').update({ logo_url: publicUrl }).eq('id', user.id)
    setLogoPreview(publicUrl)
    await refreshProfile()
    setUploadingLogo(false)
    toast.success('Logotyp uppladdad!')
  }

  const handleSave = async () => {
    if (!user) return
    setLoading(true)

    await supabase.from('profiles').update({
      full_name: form.full_name,
      company_name: form.company_name,
      city: form.city,
      phone: form.phone,
    }).eq('id', user.id)

    if (!isBuyer && supplierProfile) {
      await supabase.from('supplier_profiles').update({
        bio: form.bio,
        website_url: form.website_url,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        org_number: form.org_number || null,
      }).eq('id', user.id)
    }

    await refreshProfile()
    setLoading(false)
    toast.success('Profil uppdaterad!')
  }

  return (
      <div className="max-w-lg">
        <h1 className="font-display text-2xl font-bold mb-6">Min profil</h1>

        <div className="space-y-4">
          {/* Logo upload for suppliers */}
          {!isBuyer && (
            <div>
              <Label>Logotyp</Label>
              <div className="mt-2 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative h-20 w-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-muted group"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logotyp" className="h-full w-full object-contain" />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-5 w-5 text-foreground" />
                      </div>
                    </>
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                <div className="text-xs text-muted-foreground">
                  <p>Ladda upp er logotyp</p>
                  <p>PNG eller JPG, max 5 MB</p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          )}

          <div>
            <Label>Namn</Label>
            <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>Företagsnamn</Label>
            <Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>Stad</Label>
            <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl mt-1" />
          </div>

          {!isBuyer && (
            <>
              <div>
                <Label>Beskrivning av företaget</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-1">Berätta om er byrå – vad ni gör, er erfarenhet och vad som gör er unika.</p>
                <Textarea
                  value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  className="rounded-xl mt-1 min-h-[120px]"
                  placeholder="Vi är en fullservice-byrå med 10 års erfarenhet inom..."
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{form.bio.length} / 2 000</p>
              </div>
              <div>
                <Label>Hemsida</Label>
                <Input value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} className="rounded-xl mt-1" placeholder="https://..." />
              </div>
              <div>
                <Label>Org-nummer</Label>
                <Input value={form.org_number} onChange={e => setForm(p => ({ ...p, org_number: e.target.value }))} className="rounded-xl mt-1" placeholder="XXXXXX-XXXX" />
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <h2 className="font-display text-lg font-semibold mb-3">Kontaktperson</h2>
                <p className="text-sm text-muted-foreground mb-4">Visas för beställare som vill nå er direkt.</p>
                <div className="space-y-4">
                  <div>
                    <Label>Kontaktpersonens namn</Label>
                    <Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} className="rounded-xl mt-1" />
                  </div>
                  <div>
                    <Label>Kontakt e-post</Label>
                    <Input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className="rounded-xl mt-1" />
                  </div>
                  <div>
                    <Label>Kontakt telefon</Label>
                    <Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} className="rounded-xl mt-1" />
                  </div>
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={loading} className="w-full bg-primary hover:bg-primary/90 rounded-xl">
            {loading ? 'Sparar...' : 'Spara ändringar'}
          </Button>
        </div>
      </div>
  )
}

export default ProfilePage
