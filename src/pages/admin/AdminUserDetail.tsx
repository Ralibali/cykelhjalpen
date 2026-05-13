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

const AdminUserDetail = () => {
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
    if (error) toast.error('Kunde inte spara: ' + error.message)
    else toast.success('Profil uppdaterad!')
  }

  const handleAddCredits = async () => {
    if (!id || !creditsToAdd) return
    const credits = parseInt(creditsToAdd)
    if (isNaN(credits) || credits <= 0) { toast.error('Ange ett giltigt antal'); return }

    const currentCredits = supplierProfile?.lead_credits || 0
    const { error } = await supabase.from('supplier_profiles')
      .update({ lead_credits: currentCredits + credits })
      .eq('id', id)

    if (error) toast.error('Kunde inte lägga till credits: ' + error.message)
    else {
      toast.success(`${credits} leads tillagda!`)
      setSupplierProfile({ ...supplierProfile, lead_credits: currentCredits + credits })
      setCreditsToAdd('')

      // Also send notification to user
      await supabase.from('notifications').insert({
        user_id: id,
        type: 'credits_added',
        title: 'Du har fått extra leads!',
        message: `Admin har lagt till ${credits} lead-credits på ditt konto.`,
        link: '/dashboard/supplier/fakturering',
      })
    }
  }

  const handleToggleVerification = async (field: 'is_bankid_verified' | 'is_phone_verified') => {
    if (!id || !profile) return
    const newValue = !profile[field]
    const { error } = await supabase.from('profiles').update({ [field]: newValue }).eq('id', id)
    if (error) toast.error('Kunde inte uppdatera')
    else {
      setProfile({ ...profile, [field]: newValue })
      toast.success('Verifiering uppdaterad')
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
    if (error) toast.error('Kunde inte ändra plan')
    else {
      setSupplierProfile({ ...supplierProfile, ...updates })
      toast.success('Plan ändrad till ' + plan)
    }
  }

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></AdminLayout>
  if (!profile) return <AdminLayout><p>Användaren hittades inte.</p></AdminLayout>

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/anvandare')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Tillbaka till användare
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {(fullName || '?').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">{fullName || 'Okänd'}</h1>
          <p className="text-sm text-muted-foreground">{email} · {role} · Registrerad {timeAgo(profile.created_at)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <h2 className="font-display font-semibold text-lg">Profilinformation</h2>
          <div className="space-y-3">
            <div>
              <Label>Namn</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>E-post</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Företag</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Roll</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Beställare</SelectItem>
                  <SelectItem value="supplier">Byrå</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full rounded-xl">
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Sparar...' : 'Spara ändringar'}
          </Button>
        </div>

        {/* Verification & Actions */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <h2 className="font-display font-semibold text-lg">Verifiering</h2>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-sm">BankID-verifierad</span>
              </div>
              <Button size="sm" variant={profile.is_bankid_verified ? 'default' : 'outline'} onClick={() => handleToggleVerification('is_bankid_verified')} className="rounded-xl">
                {profile.is_bankid_verified ? 'Verifierad ✓' : 'Sätt verifierad'}
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Telefon-verifierad</span>
              </div>
              <Button size="sm" variant={profile.is_phone_verified ? 'default' : 'outline'} onClick={() => handleToggleVerification('is_phone_verified')} className="rounded-xl">
                {profile.is_phone_verified ? 'Verifierad ✓' : 'Sätt verifierad'}
              </Button>
            </div>
          </div>

          {/* Supplier-specific */}
          {supplierProfile && (
            <div className="bg-card rounded-xl border p-5 space-y-4">
              <h2 className="font-display font-semibold text-lg">Byrå-inställningar</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Lead-credits</p>
                  <p className="text-xl font-bold">{supplierProfile.lead_credits || 0}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-xl font-bold capitalize">{supplierProfile.plan || 'none'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Omdöme</p>
                  <p className="text-xl font-bold">{supplierProfile.avg_rating || 0} ★</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Avslutade</p>
                  <p className="text-xl font-bold">{supplierProfile.completed_projects || 0}</p>
                </div>
              </div>

              {/* Add credits */}
              <div>
                <Label>Lägg till lead-credits (kompensation)</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" placeholder="Antal" value={creditsToAdd} onChange={e => setCreditsToAdd(e.target.value)} className="rounded-xl" />
                  <Button onClick={handleAddCredits} className="rounded-xl shrink-0">
                    <CreditCard className="h-4 w-4 mr-2" /> Lägg till
                  </Button>
                </div>
              </div>

              {/* Change plan */}
              <div>
                <Label>Ändra plan</Label>
                <Select value={supplierProfile.plan || 'none'} onValueChange={handleChangePlan}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen plan</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="payg">Pay as you go</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle featured */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Framhävd profil</span>
                <Button size="sm" variant={supplierProfile.is_featured ? 'default' : 'outline'}
                  onClick={async () => {
                    const newVal = !supplierProfile.is_featured
                    await supabase.from('supplier_profiles').update({ is_featured: newVal }).eq('id', id)
                    setSupplierProfile({ ...supplierProfile, is_featured: newVal })
                    toast.success(newVal ? 'Profil framhävd' : 'Framhävning borttagen')
                  }}
                  className="rounded-xl">
                  {supplierProfile.is_featured ? 'Framhävd ★' : 'Gör framhävd'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Verifierad byrå</span>
                <Button size="sm" variant={supplierProfile.is_verified ? 'default' : 'outline'}
                  onClick={async () => {
                    const newVal = !supplierProfile.is_verified
                    await supabase.from('supplier_profiles').update({ is_verified: newVal }).eq('id', id)
                    setSupplierProfile({ ...supplierProfile, is_verified: newVal })
                    toast.success(newVal ? 'Byrå verifierad' : 'Verifiering borttagen')
                  }}
                  className="rounded-xl">
                  {supplierProfile.is_verified ? 'Verifierad ✓' : 'Verifiera byrå'}
                </Button>
              </div>
            </div>
          )}

          {/* Delete user */}
          <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-5">
            <h2 className="font-display font-semibold text-lg text-destructive mb-2">Riskzon</h2>
            <p className="text-sm text-muted-foreground mb-4">Att radera en användare tar bort profilen och all tillhörande data permanent.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="rounded-xl">
                  <Trash2 className="h-4 w-4 mr-2" /> Radera användare
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Radera {fullName || 'användare'}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Detta raderar profilen, eventuell byråprofil och all tillhörande data. Åtgärden kan inte ångras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
                  <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                    // Delete supplier profile first if exists
                    if (supplierProfile) {
                      await supabase.from('supplier_profiles').delete().eq('id', id!)
                    }
                    const { error } = await supabase.from('profiles').delete().eq('id', id!)
                    if (error) {
                      toast.error('Kunde inte radera: ' + error.message)
                    } else {
                      toast.success('Användaren har raderats')
                      navigate('/admin/anvandare')
                    }
                  }}>
                    Radera permanent
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
