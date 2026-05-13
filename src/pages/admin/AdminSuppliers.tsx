import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Star, CheckCircle2, ExternalLink, Download, Plus, Minus, Coins } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { exportCsv } from '@/lib/exportCsv'

const AdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [editSupplier, setEditSupplier] = useState<any>(null)
  const [creditDialog, setCreditDialog] = useState<{ supplier: any; amount: number } | null>(null)
  const [planFilter, setPlanFilter] = useState<string>('all')

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('supplier_profiles')
      .select('*, profiles!supplier_profiles_id_fkey(full_name, email, company_name, city, phone)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (data) setSuppliers(data)
  }

  useEffect(() => { fetchSuppliers() }, [])

  const filtered = suppliers.filter(s => {
    const matchesSearch = (s.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.profiles?.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.profiles?.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.org_number || '').includes(search) ||
      s.slug.toLowerCase().includes(search.toLowerCase())
    const matchesPlan = planFilter === 'all' || (s.plan || 'none') === planFilter
    return matchesSearch && matchesPlan
  })

  const handleSave = async () => {
    if (!editSupplier) return
    const { error } = await supabase.from('supplier_profiles').update({
      is_verified: editSupplier.is_verified,
      has_fskatt: editSupplier.has_fskatt,
      has_fskatt_verified_at: editSupplier.has_fskatt ? new Date().toISOString() : null,
      credit_check_passed: editSupplier.credit_check_passed,
      credit_check_at: editSupplier.credit_check_passed ? new Date().toISOString() : null,
      is_featured: editSupplier.is_featured,
      org_number: editSupplier.org_number,
      plan: editSupplier.plan,
      lead_credits: editSupplier.lead_credits,
    }).eq('id', editSupplier.id)

    if (error) {
      toast.error('Kunde inte spara')
    } else {
      toast.success('Byrå uppdaterad!')
      await supabase.from('notifications').insert({
        user_id: editSupplier.id,
        type: 'supplier_verified',
        title: '✅ Din byrå är nu verifierad på Updro',
        message: 'Grattis! Din byrå har blivit verifierad. Detta visas för beställare och ökar dina chanser att bli vald.',
      })
      setEditSupplier(null)
      fetchSuppliers()
    }
  }

  const handleCreditAdjust = async () => {
    if (!creditDialog) return
    const newCredits = Math.max(0, (creditDialog.supplier.lead_credits || 0) + creditDialog.amount)
    const { error } = await supabase.from('supplier_profiles').update({ lead_credits: newCredits }).eq('id', creditDialog.supplier.id)
    if (error) { toast.error('Kunde inte uppdatera credits'); return }

    // Notify supplier
    const action = creditDialog.amount > 0 ? 'lagt till' : 'dragit av'
    await supabase.from('notifications').insert({
      user_id: creditDialog.supplier.id,
      type: 'credit_adjustment',
      title: `Lead-credits ${action}`,
      message: `Admin har ${action} ${Math.abs(creditDialog.amount)} lead-credits. Ditt nya saldo: ${newCredits} credits.`,
      link: '/dashboard/supplier/fakturering',
    })

    toast.success(`Credits uppdaterade: ${newCredits}`)
    setCreditDialog(null)
    fetchSuppliers()
  }

  const handleExport = () => {
    exportCsv(filtered.map(s => ({
      Byrå: s.profiles?.company_name || s.profiles?.full_name || s.slug,
      'E-post': s.profiles?.email || '–',
      Telefon: s.profiles?.phone || '–',
      Stad: s.profiles?.city || '–',
      'Org.nr': s.org_number || '–',
      Plan: s.plan || 'none',
      Credits: s.lead_credits || 0,
      Betyg: s.avg_rating || 0,
      Omdömen: s.review_count || 0,
      Projekt: s.completed_projects || 0,
      Verifierad: s.is_verified ? 'Ja' : 'Nej',
    })), 'byraer')
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold">Byråer</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {['all', 'none', 'trial', 'monthly', 'lead'].map(p => (
              <Button key={p} size="sm" variant={planFilter === p ? 'default' : 'outline'} className="rounded-xl text-xs" onClick={() => setPlanFilter(p)}>
                {p === 'all' ? 'Alla' : p}
              </Button>
            ))}
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Sök byrå / org.nr..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
          </div>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Byrå</th>
            <th className="text-left p-3 font-medium">Org.nr</th>
            <th className="text-left p-3 font-medium">Kontakt</th>
            <th className="text-left p-3 font-medium">Plan</th>
            <th className="text-left p-3 font-medium">Credits</th>
            <th className="text-left p-3 font-medium">Betyg</th>
            <th className="text-left p-3 font-medium">Verifiering</th>
            <th className="text-left p-3 font-medium">Åtgärd</th>
          </tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <p className="font-medium">{s.profiles?.company_name || s.profiles?.full_name || s.slug}</p>
                  <p className="text-xs text-muted-foreground">{s.profiles?.city}</p>
                </td>
                <td className="p-3 text-muted-foreground font-mono text-xs">{s.org_number || '–'}</td>
                <td className="p-3 text-muted-foreground text-xs">
                  <p>{s.profiles?.email}</p>
                  <p>{s.profiles?.phone}</p>
                </td>
                <td className="p-3">
                  <span className="text-xs font-semibold bg-primary/10 text-primary rounded-full px-2 py-0.5 capitalize">{s.plan || 'none'}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{s.lead_credits || 0}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCreditDialog({ supplier: s, amount: 1 })}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    {s.avg_rating || 0} ({s.review_count || 0})
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-0.5 text-xs">
                    {s.is_verified && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verifierad</span>}
                    {s.has_fskatt && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> F-skatt</span>}
                    {s.credit_check_passed && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Kreditkoll</span>}
                    {!s.is_verified && !s.has_fskatt && !s.credit_check_passed && <span className="text-muted-foreground">Ej verifierad</span>}
                  </div>
                </td>
                <td className="p-3">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => setEditSupplier({ ...s })}>
                    Redigera
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-muted-foreground">Inga byråer hittades.</p>}
      </div>

      {/* Credit adjustment dialog */}
      <Dialog open={!!creditDialog} onOpenChange={() => setCreditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5" /> Justera lead-credits</DialogTitle>
          </DialogHeader>
          {creditDialog && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                <strong>{creditDialog.supplier.profiles?.company_name || creditDialog.supplier.profiles?.full_name}</strong>
                <br />Nuvarande saldo: <strong>{creditDialog.supplier.lead_credits || 0}</strong> credits
              </p>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="outline" className="rounded-xl" onClick={() => setCreditDialog({ ...creditDialog, amount: creditDialog.amount - 1 })}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input type="number" className="text-center rounded-xl" value={creditDialog.amount} onChange={e => setCreditDialog({ ...creditDialog, amount: parseInt(e.target.value) || 0 })} />
                <Button size="icon" variant="outline" className="rounded-xl" onClick={() => setCreditDialog({ ...creditDialog, amount: creditDialog.amount + 1 })}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-center">
                Nytt saldo: <strong>{Math.max(0, (creditDialog.supplier.lead_credits || 0) + creditDialog.amount)}</strong> credits
                <span className={cn('ml-2 text-xs', creditDialog.amount > 0 ? 'text-emerald-600' : creditDialog.amount < 0 ? 'text-destructive' : '')}>
                  ({creditDialog.amount > 0 ? '+' : ''}{creditDialog.amount})
                </span>
              </p>
              <Button onClick={handleCreditAdjust} className="w-full rounded-xl">Bekräfta</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editSupplier} onOpenChange={() => setEditSupplier(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Redigera: {editSupplier?.profiles?.company_name || editSupplier?.profiles?.full_name}
            </DialogTitle>
          </DialogHeader>
          {editSupplier && (
            <div className="space-y-5 mt-2">
              <div>
                <Label className="text-sm font-medium">Organisationsnummer</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={editSupplier.org_number || ''}
                    onChange={e => setEditSupplier({ ...editSupplier, org_number: e.target.value })}
                    placeholder="XXXXXX-XXXX"
                    className="rounded-xl"
                  />
                  {editSupplier.org_number && (
                    <a href={`https://www.allabolag.se/${(editSupplier.org_number || '').replace('-', '')}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="rounded-xl whitespace-nowrap">
                        <ExternalLink className="h-3 w-3 mr-1" /> Allabolag
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-4 border rounded-xl p-4">
                <h4 className="font-semibold text-sm">Verifiering</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Verifierad byrå</Label>
                  <Switch checked={editSupplier.is_verified || false} onCheckedChange={v => setEditSupplier({ ...editSupplier, is_verified: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Godkänd F-skatt & moms</Label>
                  <Switch checked={editSupplier.has_fskatt || false} onCheckedChange={v => setEditSupplier({ ...editSupplier, has_fskatt: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Godkänd kreditkontroll</Label>
                  <Switch checked={editSupplier.credit_check_passed || false} onCheckedChange={v => setEditSupplier({ ...editSupplier, credit_check_passed: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Framhävd (featured)</Label>
                  <Switch checked={editSupplier.is_featured || false} onCheckedChange={v => setEditSupplier({ ...editSupplier, is_featured: v })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Plan</Label>
                  <select
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-background"
                    value={editSupplier.plan || 'none'}
                    onChange={e => setEditSupplier({ ...editSupplier, plan: e.target.value })}
                  >
                    <option value="none">Ingen</option>
                    <option value="trial">Trial</option>
                    <option value="monthly">Månadskort</option>
                    <option value="lead">Pay per lead</option>
                    <option value="payg">Pay as you go</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Lead credits</Label>
                  <Input
                    type="number"
                    className="mt-1 rounded-xl"
                    value={editSupplier.lead_credits || 0}
                    onChange={e => setEditSupplier({ ...editSupplier, lead_credits: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditSupplier(null)}>Avbryt</Button>
                <Button className="flex-1 rounded-xl" onClick={handleSave}>Spara ändringar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default AdminSuppliers
