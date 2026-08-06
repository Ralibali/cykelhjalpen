import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Save, CreditCard, Shield, ShieldCheck, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { timeAgo } from '@/lib/dateUtils'
import { useT } from '@/lib/i18n'

const AdminUserDetail = () => {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [supplierProfile, setSupplierProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creditsToAdd, setCreditsToAdd] = useState('')

  // Editable fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    if (!id) return
    const fetchUser = async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (p) {
        setProfile(p)
        setFullName(p.full_name || '')
        setEmail(p.email || '')
        setCompanyName(p.company_name || '')
        setPhone(p.phone || '')
        setRole(p.role)
      }

      const { data: sp } = await supabase.from('supplier_profiles').select('*').eq('id', id).single()
      if (sp) setSupplierProfile(sp)

      setLoading(false)
    }
    fetchUser()
  }, [id])

  const handleSaveProfile = async () => {
    if (!id) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      email,
      company_name: companyName || null,
      phone: phone || null,
      role,
    }).eq('id', id)
    setSaving(false)
    if (error) toast.error(t('Kunde inte spara: {msg}', { msg: error.message }))
    else toast.success(t('Profil uppdaterad!'))
  }

  const handleAddCredits = async () => {
    if (!id || !creditsToAdd) return
    const credits = parseInt(creditsToAdd)
    if (isNaN(credits) || credits <= 0) { toast.error(t('Ange ett giltigt antal')); return }

    const currentCredits = supplierProfile?.lead_credits || 0
    const { error } = await supabase.from('supplier_profiles')
      .update({ lead_credits: currentCredits + credits })
      .eq('id', id)

    if (error) toast.error(t('Kunde inte lägga till credits: {msg}', { msg: error.message }))
    else {
      toast.success(t('{count} leads tillagda!', { count: credits }))
      setSupplierProfile({ ...supplierProfile, lead_credits: currentCredits + credits })
      setCreditsToAdd('')

      // Also send notification to user
      await supabase.from('notifications').insert({
        user_id: id,
        type: 'credits_added',
        title: t('Du har fått extra leads!'),
        message: t('Admin har lagt till {count} lead-credits på ditt konto.', { count: credits }),
        link: '/dashboard/supplier/fakturering',
      })
    }
  }

  const handleToggleVerification = async (field: 'is_bankid_verified' | 'is_phone_verified') => {
    if (!id || !profile) return
    const newValue = !profile[field]
    const updates = field === 'is_bankid_verified'
      ? { is_bankid_verified: newValue }
      : { is_phone_verified: newValue }
    const { error } = await supabase.from('profiles').update(updates).eq('id', id)
    if (error) toast.error(t('Kunde inte uppdatera'))
    else {
      setProfile({ ...profile, [field]: newValue })
      toast.success(t('Verifiering uppdaterad'))
    }
  }

  const handleChangePlan = async (plan: string) => {
    if (!id) return
    const updates: any = { plan }
    if (plan === 'trial') {
      const trialEnds = new Date()
      trialEnds.setDate(trialEnds.getDate() + 14)
      updates.trial_ends_at = trialEnds.toISOString()
      updates.lead_credits = (supplierProfile?.lead_credits || 0) + 5
    }
    const { error } = await supabase.from('supplier_profiles').update(updates).eq('id', id)
    if (error) toast.error(t('Kunde inte ändra plan'))
    else {
      setSupplierProfile({ ...supplierProfile, ...updates })
      toast.success(t('Plan ändrad till {plan}', { plan }))
    }
  }

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></AdminLayout>
  if (!profile) return <AdminLayout><p>{t('Användaren hittades inte.')}</p></AdminLayout>

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/anvandare')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t('Tillbaka till användare')}
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {(fullName || '?').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">{fullName || t('Okänd')}</h1>
          <p className="text-sm text-muted-foreground">{email} · {role} · {t('Registrerad {time}', { time: timeAgo(profile.created_at) })}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <h2 className="font-display font-semibold text-lg">{t('Profilinformation')}</h2>
          <div className="space-y-3">
            <div>
              <Label>{t('Namn')}</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>{t('E-post')}</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>{t('Företag')}</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>{t('Telefon')}</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>{t('Roll')}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">{t('Beställare')}</SelectItem>
                  <SelectItem value="supplier">{t('Byrå')}</SelectItem>
                  <SelectItem value="admin">{t('Admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full rounded-xl">
            <Save className="h-4 w-4 mr-2" /> {saving ? t('Sparar...') : t('Spara ändringar')}
          </Button>
        </div>

        {/* Verification & Actions */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <h2 className="font-display font-semibold text-lg">{t('Verifiering')}</h2>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-sm">{t('BankID-verifierad')}</span>
              </div>
              <Button size="sm" variant={profile.is_bankid_verified ? 'default' : 'outline'} onClick={() => handleToggleVerification('is_bankid_verified')} className="rounded-xl">
                {profile.is_bankid_verified ? t('Verifierad ✓') : t('Sätt verifierad')}
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{t('Telefon-verifierad')}</span>
              </div>
              <Button size="sm" variant={profile.is_phone_verified ? 'default' : 'outline'} onClick={() => handleToggleVerification('is_phone_verified')} className="rounded-xl">
                {profile.is_phone_verified ? t('Verifierad ✓') : t('Sätt verifierad')}
              </Button>
            </div>
          </div>

          {/* Supplier-specific */}
          {supplierProfile && (
            <div className="bg-card rounded-xl border p-5 space-y-4">
              <h2 className="font-display font-semibold text-lg">{t('Byrå-inställningar')}</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{t('Lead-credits')}</p>
                  <p className="text-xl font-bold">{supplierProfile.lead_credits || 0}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{t('Plan')}</p>
                  <p className="text-xl font-bold capitalize">{supplierProfile.plan || 'none'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{t('Omdöme')}</p>
                  <p className="text-xl font-bold">{supplierProfile.avg_rating || 0} ★</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{t('Avslutade')}</p>
                  <p className="text-xl font-bold">{supplierProfile.completed_projects || 0}</p>
                </div>
              </div>

              {/* Add credits */}
              <div>
                <Label>{t('Lägg till lead-credits (kompensation)')}</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" placeholder={t('Antal')} value={creditsToAdd} onChange={e => setCreditsToAdd(e.target.value)} className="rounded-xl" />
                  <Button onClick={handleAddCredits} className="rounded-xl shrink-0">
                    <CreditCard className="h-4 w-4 mr-2" /> {t('Lägg till')}
                  </Button>
                </div>
              </div>

              {/* Change plan */}
              <div>
                <Label>{t('Ändra plan')}</Label>
                <Select value={supplierProfile.plan || 'none'} onValueChange={handleChangePlan}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('Ingen plan')}</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="payg">Pay as you go</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle featured */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">{t('Framhävd profil')}</span>
                <Button size="sm" variant={supplierProfile.is_featured ? 'default' : 'outline'}
                  onClick={async () => {
                    const newVal = !supplierProfile.is_featured
                    await supabase.from('supplier_profiles').update({ is_featured: newVal }).eq('id', id)
                    setSupplierProfile({ ...supplierProfile, is_featured: newVal })
                    toast.success(newVal ? t('Profil framhävd') : t('Framhävning borttagen'))
                  }}
                  className="rounded-xl">
                  {supplierProfile.is_featured ? t('Framhävd ★') : t('Gör framhävd')}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">{t('Verifierad byrå')}</span>
                <Button size="sm" variant={supplierProfile.is_verified ? 'default' : 'outline'}
                  onClick={async () => {
                    const newVal = !supplierProfile.is_verified
                    await supabase.from('supplier_profiles').update({ is_verified: newVal }).eq('id', id)
                    setSupplierProfile({ ...supplierProfile, is_verified: newVal })
                    toast.success(newVal ? t('Byrå verifierad') : t('Verifiering borttagen'))
                  }}
                  className="rounded-xl">
                  {supplierProfile.is_verified ? t('Verifierad ✓') : t('Verifiera byrå')}
                </Button>
              </div>
            </div>
          )}

          {/* Delete user */}
          <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-5">
            <h2 className="font-display font-semibold text-lg text-destructive mb-2">{t('Riskzon')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t('Att radera en användare tar bort profilen och all tillhörande data permanent.')}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="rounded-xl">
                  <Trash2 className="h-4 w-4 mr-2" /> {t('Radera användare')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('Radera {name}?', { name: fullName || t('användare') })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('Detta raderar profilen, eventuell byråprofil och all tillhörande data. Åtgärden kan inte ångras.')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">{t('Avbryt')}</AlertDialogCancel>
                  <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                    // Delete supplier profile first if exists
                    if (supplierProfile) {
                      await supabase.from('supplier_profiles').delete().eq('id', id!)
                    }
                    const { error } = await supabase.from('profiles').delete().eq('id', id!)
                    if (error) {
                      toast.error(t('Kunde inte radera: {msg}', { msg: error.message }))
                    } else {
                      toast.success(t('Användaren har raderats'))
                      navigate('/admin/anvandare')
                    }
                  }}>
                    {t('Radera permanent')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminUserDetail
