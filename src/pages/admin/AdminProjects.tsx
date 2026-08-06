import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { CATEGORY_STYLES, BUDGET_LABELS, START_TIME_LABELS } from '@/lib/constants'
import { timeAgo } from '@/lib/dateUtils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Download, CheckCircle, XCircle, ChevronDown, ChevronUp, Mail, Building2, User, Calendar, DollarSign, Clock, FileText, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportCsv } from '@/lib/exportCsv'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useT } from '@/lib/i18n'

const AdminProjects = () => {
  const t = useT()
  const [projects, setProjects] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*, profiles!projects_buyer_id_fkey(full_name, company_name, email, phone, city)').order('created_at', { ascending: false }).limit(500)
    if (data) setProjects(data)
  }

  useEffect(() => { fetchProjects() }, [])

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('projects').update({ status: 'active' }).eq('id', id)
    if (error) { toast.error(t('Kunde inte godkänna.')); return }
    toast.success(t('Uppdrag godkänt! ✅'))
    fetchProjects()
  }

  const handleReject = async (id: string) => {
    const { error } = await supabase.from('projects').update({ status: 'rejected' }).eq('id', id)
    if (error) { toast.error(t('Kunde inte avvisa.')); return }
    toast.success(t('Uppdrag avvisat.'))
    fetchProjects()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (error) { toast.error(t('Kunde inte ta bort: {msg}', { msg: error.message })); return }
    toast.success(t('Uppdraget har tagits bort'))
    setDeleteTarget(null)
    fetchProjects()
  }

  const filtered = projects.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.profiles?.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = projects.filter(p => p.status === 'pending').length

  const handleExport = () => {
    exportCsv(filtered.map(p => ({
      [t('Titel')]: p.title,
      [t('Kategori')]: p.category,
      [t('Budget')]: BUDGET_LABELS[p.budget_range] || '–',
      [t('Beställare')]: p.profiles?.company_name || p.profiles?.full_name || '–',
      [t('Status')]: p.status,
      [t('Offerter')]: p.offer_count || 0,
      [t('Visningar')]: p.view_count || 0,
      [t('Skapad')]: p.created_at ? new Date(p.created_at).toLocaleDateString('sv-SE') : '',
    })), 'uppdrag')
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-accent/10 text-accent'
      case 'pending': return 'bg-yellow-50 text-yellow-700'
      case 'rejected': return 'bg-red-50 text-red-700'
      case 'closed': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">{t('Uppdrag')}</h1>
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-1 rounded-full">
              {t('{count} väntar', { count: pendingCount })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {['all', 'pending', 'active', 'closed', 'rejected', 'completed', 'draft'].map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} className="rounded-xl text-xs" onClick={() => setStatusFilter(s)}>
                {s === 'all' ? t('Alla') : s === 'pending' ? t('Väntar{count}', { count: pendingCount > 0 ? ` (${pendingCount})` : '' }) : s}
              </Button>
            ))}
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Sök uppdrag...')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
          </div>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium w-8"></th>
            <th className="text-left p-3 font-medium">{t('Titel')}</th>
            <th className="text-left p-3 font-medium">{t('Kategori')}</th>
            <th className="text-left p-3 font-medium">{t('Budget')}</th>
            <th className="text-left p-3 font-medium">{t('Beställare')}</th>
            <th className="text-left p-3 font-medium">{t('Status')}</th>
            <th className="text-left p-3 font-medium">{t('Offerter')}</th>
            <th className="text-left p-3 font-medium">{t('Skapad')}</th>
            <th className="text-left p-3 font-medium">{t('Åtgärd')}</th>
          </tr></thead>
          <tbody>
            {filtered.map(p => (
              <>
                <tr
                  key={p.id}
                  className={cn('border-b last:border-0 hover:bg-muted/30 cursor-pointer', p.status === 'pending' && 'bg-yellow-50/30')}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <td className="p-3 text-muted-foreground">
                    {expandedId === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </td>
                  <td className="p-3 font-medium max-w-[200px] truncate">{p.title}</td>
                  <td className="p-3"><span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', CATEGORY_STYLES[p.category] || '')}>{p.category}</span></td>
                  <td className="p-3 text-muted-foreground">{BUDGET_LABELS[p.budget_range] || '–'}</td>
                  <td className="p-3 text-muted-foreground">{p.profiles?.company_name || p.profiles?.full_name || '–'}</td>
                  <td className="p-3"><span className={cn('text-xs font-semibold rounded-full px-2 py-0.5', statusColor(p.status))}>{p.status}</span></td>
                  <td className="p-3">{p.offer_count || 0}</td>
                  <td className="p-3 text-muted-foreground">{timeAgo(p.created_at)}</td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {p.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" className="rounded-lg text-xs h-7 px-2 text-accent border-accent/30 hover:bg-accent/10" onClick={() => handleApprove(p.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> {t('Godkänn')}
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg text-xs h-7 px-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleReject(p.id)}>
                            <XCircle className="h-3 w-3 mr-1" /> {t('Avvisa')}
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="rounded-lg h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(p)} title={t('Ta bort')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr key={`${p.id}-detail`} className="border-b bg-muted/20">
                    <td colSpan={9} className="p-0">
                      <div className="p-5 space-y-4">
                        {/* Description */}
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                            <FileText className="h-3.5 w-3.5" /> {t('Beskrivning')}
                          </div>
                          <p className="text-sm whitespace-pre-wrap bg-background rounded-lg p-3 border">
                            {p.description || t('Ingen beskrivning angiven.')}
                          </p>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-background rounded-lg p-3 border">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <DollarSign className="h-3.5 w-3.5" /> {t('Budget')}
                            </div>
                            <p className="text-sm font-medium">{BUDGET_LABELS[p.budget_range] || '–'}</p>
                          </div>
                          <div className="bg-background rounded-lg p-3 border">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <Clock className="h-3.5 w-3.5" /> {t('Önskad start')}
                            </div>
                            <p className="text-sm font-medium">{START_TIME_LABELS?.[p.start_time] || p.start_time || '–'}</p>
                          </div>
                          <div className="bg-background rounded-lg p-3 border">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              {p.is_company ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />} {t('Typ')}
                            </div>
                            <p className="text-sm font-medium">{p.is_company ? t('Företag') : t('Privatperson')}</p>
                          </div>
                          <div className="bg-background rounded-lg p-3 border">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <Calendar className="h-3.5 w-3.5" /> {t('Skapad')}
                            </div>
                            <p className="text-sm font-medium">{p.created_at ? new Date(p.created_at).toLocaleDateString('sv-SE') : '–'}</p>
                          </div>
                        </div>

                        {/* Buyer info */}
                        <div className="bg-background rounded-lg p-3 border">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">{t('Beställarens uppgifter')}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('Namn:')}</span>{' '}
                              <span className="font-medium">{p.profiles?.full_name || '–'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('Företag:')}</span>{' '}
                              <span className="font-medium">{p.profiles?.company_name || '–'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <a href={`mailto:${p.profiles?.email}`} className="text-primary hover:underline">{p.profiles?.email || '–'}</a>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          {p.status === 'pending' && (
                            <>
                              <Button className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleApprove(p.id)}>
                                <CheckCircle className="h-4 w-4 mr-1.5" /> {t('Godkänn uppdrag')}
                              </Button>
                              <Button variant="outline" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleReject(p.id)}>
                                <XCircle className="h-4 w-4 mr-1.5" /> {t('Avvisa')}
                              </Button>
                            </>
                          )}
                          <Button variant="outline" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="h-4 w-4 mr-1.5" /> {t('Ta bort')}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-muted-foreground">{t('Inga uppdrag hittades.')}</p>}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Ta bort uppdrag?')}</DialogTitle>
            <DialogDescription>
              {t('Vill du verkligen ta bort "{title}"? Alla tillhörande offerter, meddelanden och recensioner tas också bort. Detta kan inte ångras.', { title: deleteTarget?.title })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('Avbryt')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('Tar bort…') : t('Ta bort')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default AdminProjects
