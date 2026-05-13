import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BUDGET_LABELS, START_TIME_LABELS, CATEGORY_STYLES } from '@/lib/constants'
import { timeAgo } from '@/lib/dateUtils'
import { numWord } from '@/lib/numberWords'
import { toast } from 'sonner'
import { Lock, Unlock, Mail, Phone, User, Building2, Paperclip, X, CreditCard, Sparkles, Gauge } from 'lucide-react'

const scoreProject = (project: any) => {
  let score = 0
  const reasons: string[] = []

  const descriptionLength = project?.description?.length || 0
  if (descriptionLength >= 500) {
    score += 30
    reasons.push('Detaljerad brief')
  } else if (descriptionLength >= 220) {
    score += 20
    reasons.push('Tydlig brief')
  } else if (descriptionLength >= 80) {
    score += 10
  }

  if (project?.budget_range && project.budget_range !== 'unknown') {
    score += 25
    reasons.push('Angiven budget')
  }

  if (project?.start_time === 'asap' || project?.start_time === 'within_month') {
    score += 20
    reasons.push('Nära startdatum')
  } else if (project?.start_time) {
    score += 10
  }

  if (project?.is_company) {
    score += 15
    reasons.push('Företagskund')
  }

  if ((project?.offer_count || 0) < 3) {
    score += 10
    reasons.push('Låg konkurrens')
  }

  const normalized = Math.min(100, score)
  const label = normalized >= 75 ? 'Hög kvalitet' : normalized >= 45 ? 'Medel kvalitet' : 'Låg kvalitet'
  const tone = normalized >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : normalized >= 45 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-50 border-slate-200'

  return { score: normalized, label, tone, reasons }
}

const getOfferTemplate = (project: any) => {
  const title = `Offert: ${project?.title || 'digitalt projekt'}`
  const description = `Hej!\n\nTack för en tydlig projektbeskrivning. Vi kan hjälpa er med ${project?.category?.toLowerCase?.() || 'det digitala projektet'} och föreslår att vi börjar med ett kort uppstartsmöte där vi går igenom mål, omfattning, tidsplan och tekniska krav.\n\nFörslag på upplägg:\n1. Uppstart och kravgenomgång\n2. Design/struktur och prioritering av funktioner\n3. Produktion och löpande avstämningar\n4. Test, lansering och överlämning\n\nI offerten ingår tydlig projektledning, löpande kommunikation och rekommendationer för nästa steg.\n\nVänliga hälsningar`
  return { title, description }
}

const ProjectUnlock = () => {
  const { id } = useParams()
  const { user, supplierProfile, refreshProfile, hasActiveSubscription } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState<any>(null)
  const [buyer, setBuyer] = useState<any>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    delivery_weeks: '',
    payment_plan: 'fixed',
  })

  useEffect(() => {
    if (!id || !user) return
    const fetchData = async () => {
      const { data: proj } = await supabase.from('projects').select('*, profiles!projects_buyer_id_fkey(full_name, company_name, email, phone, city)').eq('id', id).single()
      if (proj) {
        setProject(proj)
        setBuyer(proj.profiles)
      }

      const { data: lead } = await supabase.from('unlocked_leads').select('id').eq('supplier_id', user.id).eq('project_id', id).maybeSingle()
      if (lead) setIsUnlocked(true)
    }
    fetchData()
  }, [id, user])

  const leadScore = project ? scoreProject(project) : null

  const applyOfferTemplate = () => {
    if (!project) return
    const template = getOfferTemplate(project)
    setForm(prev => ({ ...prev, title: prev.title || template.title, description: prev.description || template.description }))
    toast.success('Offertmall ifylld')
  }

  const handleUnlock = async () => {
    if (!user || !supplierProfile || !id) return
    const credits = supplierProfile.lead_credits || 0
    if (credits <= 0 && !hasActiveSubscription) {
      toast.error('Inga lead-krediter kvar. Köp lead eller starta månadskort.')
      return
    }

    const isTrialCredit = supplierProfile.plan === 'trial'
    const { error } = await supabase.from('unlocked_leads').insert({
      supplier_id: user.id,
      project_id: id,
      used_trial_credit: isTrialCredit,
    })

    if (error) {
      toast.error('Kunde inte låsa upp uppdraget.')
      return
    }

    if (!hasActiveSubscription) {
      await supabase.from('supplier_profiles').update({
        lead_credits: Math.max(0, credits - 1),
        ...(isTrialCredit ? { trial_leads_used: (supplierProfile.trial_leads_used || 0) + 1 } : {}),
      }).eq('id', user.id)
    }

    setIsUnlocked(true)
    await refreshProfile()
    toast.success('Kontaktuppgifter upplåsta! 🔓')
    setConfirmOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !id) return
    setLoading(true)

    let attachment_url: string | null = null

    // Upload file if selected
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('offer-attachments')
        .upload(path, file, { contentType: file.type })

      if (uploadError) {
        toast.error('Kunde inte ladda upp filen.')
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('offer-attachments')
        .getPublicUrl(path)
      attachment_url = urlData.publicUrl
    }

    const { error } = await supabase.from('offers').insert({
      project_id: id,
      supplier_id: user.id,
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      delivery_weeks: parseInt(form.delivery_weeks) || null,
      payment_plan: form.payment_plan,
      attachment_url,
    } as any)

    if (!error && project) {
      await supabase.from('projects').update({ offer_count: (project.offer_count || 0) + 1 }).eq('id', id)
    }

    setLoading(false)
    if (error) {
      if (error.code === '23505') toast.error('Du har redan skickat en offert på detta uppdrag.')
      else toast.error('Kunde inte skicka offerten.')
    } else {
      toast.success('Offert skickad! 🎉')
      navigate('/dashboard/supplier/offerter')
    }
  }

  const creditsLeft = supplierProfile?.lead_credits || 0
  const canUnlock = creditsLeft > 0 || hasActiveSubscription

  if (!project) return <div className="animate-pulse h-40 bg-muted rounded-xl" />

  return (
    <div className="max-w-3xl">
      {/* Project info – always visible */}
      <div className="bg-card rounded-xl border p-5 mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_STYLES[project.category] || ''}`}>{project.category}</span>
          {leadScore && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${leadScore.tone}`}>
              <Gauge className="h-3.5 w-3.5" /> {leadScore.label} · {leadScore.score}/100
            </span>
          )}
        </div>
        <h1 className="font-display text-xl font-bold">{project.title}</h1>
        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{project.description}</p>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <span>{BUDGET_LABELS[project.budget_range] || ''}</span>
          <span>{START_TIME_LABELS[project.start_time] || ''}</span>
          <span>{project.city || 'Sverige'}</span>
          <span>{timeAgo(project.created_at)}</span>
          <span>{project.offer_count || 0} av max 5 offerter</span>
        </div>
        {leadScore && leadScore.reasons.length > 0 && (
          <div className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Varför detta kan vara ett bra lead:</strong> {leadScore.reasons.join(' · ')}
          </div>
        )}
      </div>

      {/* Contact info – locked or unlocked */}
      {isUnlocked ? (
        <>
          <div className="bg-card rounded-xl border p-5 mb-6 border-accent/30">
            <div className="flex items-center gap-2 mb-3">
              <Unlock className="h-4 w-4 text-accent" />
              <h2 className="font-display text-lg font-semibold">Beställarens kontaktuppgifter</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {buyer?.full_name && (
                <div className="flex items-center gap-2 text-foreground"><User className="h-4 w-4 text-muted-foreground" /> {buyer.full_name}</div>
              )}
              {buyer?.company_name && (
                <div className="flex items-center gap-2 text-foreground"><Building2 className="h-4 w-4 text-muted-foreground" /> {buyer.company_name}</div>
              )}
              {buyer?.email && (
                <a href={`mailto:${buyer.email}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="h-4 w-4" /> {buyer.email}</a>
              )}
              {buyer?.phone && (
                <a href={`tel:${buyer.phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="h-4 w-4" /> {buyer.phone}</a>
              )}
            </div>
          </div>

          {/* Offer form */}
          {(project.offer_count || 0) >= 5 ? (
            <div className="bg-card rounded-xl border p-6 text-center">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h2 className="font-display text-lg font-semibold mb-2">Det här uppdraget har redan fått max antal offerter.</h2>
              <p className="text-sm text-muted-foreground">Beställaren tar inte emot fler offerter just nu.</p>
            </div>
          ) : (
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-lg font-semibold">Skicka offert</h2>
              <Button type="button" variant="outline" size="sm" onClick={applyOfferTemplate} className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Snabb offertmall
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Offert-titel *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl mt-1" required />
              </div>
              <div>
                <Label>Beskrivning *</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl mt-1 min-h-[120px]" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pris (kr) *</Label>
                  <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="rounded-xl mt-1" required />
                </div>
                <div>
                  <Label>Leveranstid (veckor)</Label>
                  <Input type="number" value={form.delivery_weeks} onChange={e => setForm(p => ({ ...p, delivery_weeks: e.target.value }))} className="rounded-xl mt-1" />
                </div>
              </div>
              <div>
                <Label>Betalningsmodell</Label>
                <Select value={form.payment_plan} onValueChange={v => setForm(p => ({ ...p, payment_plan: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fast pris</SelectItem>
                    <SelectItem value="hourly">Timpris</SelectItem>
                    <SelectItem value="milestone">Milstolpar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bifoga fil (PDF, max 10 MB)</Label>
                <div className="mt-1">
                  {file ? (
                    <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 text-sm">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate flex-1">{file.name}</span>
                      <button type="button" onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-xl px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                      <Paperclip className="h-4 w-4" />
                      <span>Välj fil att bifoga...</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f && f.size > 10 * 1024 * 1024) {
                            toast.error('Filen är för stor (max 10 MB).')
                            return
                          }
                          if (f) setFile(f)
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-brand-mint-hover text-accent-foreground rounded-xl py-5">
                {loading ? 'Skickar...' : 'Skicka offert →'}
              </Button>
            </form>
          </div>
          )}
        </>
      ) : (
        <div className="bg-card rounded-xl border p-6 text-center">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold mb-2">Lås upp kontaktuppgifter</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Använd en lead-kredit för att se beställarens kontaktuppgifter och skicka en offert.
          </p>
          {canUnlock ? (
            <Button
              onClick={() => setConfirmOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              🔓 Lås upp ({hasActiveSubscription ? 'obegränsat' : `${numWord(creditsLeft)} krediter kvar`})
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                Du har inga krediter kvar. Köp ett enskilt lead eller starta månadskort för obegränsad tillgång.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/dashboard/supplier/fakturering">
                  <Button className="gap-2 bg-primary hover:bg-primary/90">
                    <CreditCard className="h-4 w-4" /> Köp lead / månadskort
                  </Button>
                </Link>
                <Link to="/priser">
                  <Button variant="outline">Se priser</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lås upp kontaktuppgifter?</DialogTitle>
            <DialogDescription>
              Använd en lead-kredit för att få tillgång till beställarens kontaktuppgifter för "{project?.title}" och kunna skicka offert.
              Du har {hasActiveSubscription ? 'obegränsad tillgång via månadskort' : `${numWord(creditsLeft)} krediter kvar`}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Avbryt</Button>
            <Button onClick={handleUnlock} className="bg-primary hover:bg-primary/90">Bekräfta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProjectUnlock
