import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import TrialBanner from '@/components/TrialBanner'
import { Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORIES, CATEGORY_STYLES, BUDGET_LABELS } from '@/lib/constants'
import { timeAgo } from '@/lib/dateUtils'
import { numWord } from '@/lib/numberWords'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const BrowseProjects = () => {
  const { user, supplierProfile, refreshProfile } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [filterCat, setFilterCat] = useState<string>('all')
  const [confirmProject, setConfirmProject] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const { data: proj } = await supabase.from('projects').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(50)
      if (proj) setProjects(proj)

      const { data: leads } = await supabase.from('unlocked_leads').select('project_id').eq('supplier_id', user.id)
      if (leads) setUnlocked(new Set(leads.map(l => l.project_id)))
    }
    fetchData()
  }, [user])

  const handleUnlock = async (projectId: string) => {
    if (!user || !supplierProfile) return
    const credits = supplierProfile.lead_credits || 0
    if (credits <= 0) {
      toast.error('Du har inga lead-krediter. Uppgradera din plan.')
      return
    }

    const isTrialCredit = supplierProfile.plan === 'trial'

    const { error } = await supabase.from('unlocked_leads').insert({
      supplier_id: user.id,
      project_id: projectId,
      used_trial_credit: isTrialCredit,
    })

    if (error) {
      toast.error('Kunde inte låsa upp uppdraget.')
      return
    }

    await supabase.from('supplier_profiles').update({
      lead_credits: credits - 1,
      ...(isTrialCredit ? { trial_leads_used: (supplierProfile.trial_leads_used || 0) + 1 } : {}),
    }).eq('id', user.id)

    setUnlocked(prev => new Set([...prev, projectId]))
    await refreshProfile()
    toast.success('Uppdrag upplåst! 🔓')
    setConfirmProject(null)
  }

  const filtered = filterCat === 'all' ? projects : projects.filter(p => p.category === filterCat)
  const creditsLeft = supplierProfile?.lead_credits || 0

  return (
    <>
      <div className="max-w-4xl">
        <TrialBanner />

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display text-2xl font-bold">Tillgängliga uppdrag</h1>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Alla kategorier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla kategorier</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border p-8 text-center">
            <p className="text-muted-foreground">Inga uppdrag matchar just nu.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(p => {
              const isUnlocked = unlocked.has(p.id)
              const isClosed = (p.offer_count || 0) >= (p.max_offers || 5) || p.status === 'closed'
              return (
                <div key={p.id} className={`bg-card rounded-xl border p-5 transition-all ${isUnlocked ? 'border-accent/30' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_STYLES[p.category] || ''}`}>{p.category}</span>
                    {isUnlocked ? (
                      <span className="text-xs text-accent font-semibold flex items-center gap-1"><Unlock className="h-3 w-3" /> Upplåst</span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Kontaktuppgifter låsta</span>
                    )}
                  </div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{p.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{BUDGET_LABELS[p.budget_range] || ''} · {p.city || 'Sverige'} · {timeAgo(p.created_at)}</p>

                  {isUnlocked ? (
                    <Link to={`/dashboard/supplier/uppdrag/${p.id}`}>
                      <Button size="sm" className="mt-3 bg-primary hover:bg-primary/90">Svara med offert →</Button>
                    </Link>
                  ) : isClosed ? (
                    <span className="inline-block mt-3 text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                      Uppdraget är fullbokat
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      className="mt-3"
                      variant="outline"
                      onClick={() => creditsLeft > 0 ? setConfirmProject(p) : toast.error('Inga lead-krediter kvar. Uppgradera din plan.')}
                    >
                      🔓 Lås upp kontaktuppgifter ({numWord(creditsLeft)} krediter kvar)
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!confirmProject} onOpenChange={() => setConfirmProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lås upp kontaktuppgifter?</DialogTitle>
            <DialogDescription>
              Använd en lead-kredit för att få tillgång till beställarens kontaktuppgifter för "{confirmProject?.title}" och kunna skicka offert.
              Du har {numWord(creditsLeft)} krediter kvar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmProject(null)}>Avbryt</Button>
            <Button onClick={() => handleUnlock(confirmProject.id)} className="bg-primary hover:bg-primary/90">Bekräfta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BrowseProjects
