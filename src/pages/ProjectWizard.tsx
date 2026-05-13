import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { toast } from 'sonner'
import { CATEGORIES, CATEGORY_ICONS, BUDGET_OPTIONS, START_TIME_OPTIONS, PROJECT_TEMPLATES } from '@/lib/constants'
import { ArrowLeft, ArrowRight, Check, Building2, User, Sparkles, Mail, Loader2, Wand2, CheckCircle2 } from 'lucide-react'
import AiBriefAssistant from '@/components/project/AiBriefAssistant'
import type { BriefSuggestion } from '@/lib/briefAnalysis'
import type { Category, BudgetRange, StartTime } from '@/types'

const inferTitleFromDescription = (description: string) => {
  const cleaned = description.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  const sentence = cleaned.split(/[.!?]/)[0]?.trim() || cleaned
  return sentence.length > 80 ? `${sentence.slice(0, 77)}...` : sentence
}

const ProjectWizard = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialDescription = searchParams.get('beskrivning')?.trim() || ''
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [submittedAsGuest, setSubmittedAsGuest] = useState(false)

  const [form, setForm] = useState({
    category: '' as Category | '',
    title: inferTitleFromDescription(initialDescription),
    description: initialDescription,
    budget_range: '' as BudgetRange | '',
    start_time: '' as StartTime | '',
    is_company: true,
    company_name: '',
    // Guest contact (step 3)
    full_name: '',
    email: '',
    phone: '',
  })

  const templates = form.category ? PROJECT_TEMPLATES[form.category] || [] : []

  const applyTemplate = (t: typeof templates[0]) => {
    setSelectedTemplate(t.id)
    setForm(prev => ({ ...prev, title: t.title, description: t.description, budget_range: t.budget_hint as BudgetRange }))
  }

  const clearTemplate = () => {
    setSelectedTemplate(null)
    setForm(prev => ({ ...prev, title: '', description: '', budget_range: '' }))
  }

  const applyAiBrief = (brief: BriefSuggestion) => {
    setForm(prev => ({
      ...prev,
      category: brief.category,
      title: brief.title,
      description: brief.description,
      budget_range: brief.budget_range,
      start_time: brief.start_time,
    }))
    setSelectedTemplate(null)
  }

  const handleImproveDescription = async () => {
    if (form.description.length < 10 || !form.category) return
    setAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('improve-description', {
        body: { title: form.title, category: form.category, description: form.description },
      })
      if (error) throw error
      if (data?.improved) {
        setForm(prev => ({ ...prev, description: data.improved }))
        toast.success('Beskrivningen har förbättrats med AI! ✨')
      } else if (data?.error) {
        toast.error(data.error)
      }
    } catch (e) {
      toast.error('Kunde inte förbättra beskrivningen just nu.')
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  const canNext1 = form.category && form.title.length >= 5 && form.description.length >= 20 && form.budget_range && form.start_time

  const handlePublish = async () => {
    setLoading(true)

    // Authenticated buyer → klassiskt projects-flöde
    if (isAuthenticated && user?.id) {
      const { error: projectError } = await supabase.from('projects').insert({
        buyer_id: user.id,
        title: form.title,
        description: form.description,
        category: form.category as string,
        budget_range: form.budget_range as string,
        start_time: form.start_time as string,
        is_company: form.is_company,
        status: 'pending',
      })

      setLoading(false)

      if (projectError) {
        console.error('Project insert error:', projectError)
        toast.error(`Kunde inte publicera uppdraget: ${projectError.message}`)
        return
      }
      toast.success('Uppdraget är inskickat och väntar på godkännande! ✅')
      navigate('/dashboard/buyer')
      return
    }

    // Gäst → spara i guest_leads (e-post först, lösenord ej blockerande)
    if (!form.email || !form.full_name) {
      toast.error('Vi behöver namn och e-post för att skicka leads till byråerna.')
      setLoading(false)
      return
    }

    const { error: guestError } = await (supabase as any).from('guest_leads').insert({
      email: form.email.trim().toLowerCase(),
      full_name: form.full_name.trim(),
      company_name: form.is_company ? form.company_name?.trim() || null : null,
      phone: form.phone?.trim() || null,
      title: form.title,
      description: form.description,
      category: form.category as string,
      budget_range: form.budget_range as string,
      start_time: form.start_time as string,
      is_company: form.is_company,
      source: 'publicera',
    })

    setLoading(false)

    if (guestError) {
      console.error('Guest lead insert error:', guestError)
      toast.error('Kunde inte skicka in uppdraget. Försök igen om en stund.')
      return
    }

    setSubmittedAsGuest(true)
    setStep(4)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Progress value={(step / (isAuthenticated ? 2 : 3)) * 100} className="mb-8 h-2" />

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold">Berätta om ditt uppdrag</h2>

              {/* AI brief assistant */}
              <AiBriefAssistant onAccept={applyAiBrief} initialText={form.description} />

              {/* Category */}
              <div>
                <Label>Kategori *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setForm(prev => ({ ...prev, category: cat })); setSelectedTemplate(null) }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${form.category === cat ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'}`}
                    >
                      <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                      <span className="text-xs text-center">{cat}</span>
                      {form.category === cat && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates */}
              {templates.length > 0 && (
                <div>
                  <Label>Välj en mall att utgå från (valfritt)</Label>
                  <div className="flex gap-3 mt-2 overflow-x-auto pb-2">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className={`flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-xl border w-36 text-xs font-medium transition-all ${selectedTemplate === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                      >
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-center">{t.name}</span>
                      </button>
                    ))}
                  </div>
                  {selectedTemplate && (
                    <button onClick={clearTemplate} className="text-xs text-muted-foreground hover:underline mt-1">
                      ✕ Rensa mall
                    </button>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <Label>Titel *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl mt-1"
                  maxLength={100}
                  placeholder="T.ex. Ny hemsida för restaurang"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">{form.title.length}/100</p>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Beskrivning *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleImproveDescription}
                    disabled={aiLoading || form.description.length < 10 || !form.category}
                    className="text-xs text-primary hover:text-primary/80 gap-1.5"
                  >
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {aiLoading ? 'Förbättrar...' : 'Förbättra med AI'}
                  </Button>
                </div>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl mt-1 min-h-[150px]"
                  placeholder="Beskriv vad du behöver hjälp med..."
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">{form.description.length} tecken · Mer detaljer = bättre offerter</p>
              </div>

              {/* Budget */}
              <div>
                <Label>Budget *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {BUDGET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, budget_range: opt.value as BudgetRange }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${form.budget_range === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                    >
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start time */}
              <div>
                <Label>Önskad start *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {START_TIME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, start_time: opt.value as StartTime }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${form.start_time === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                    >
                      <span>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!canNext1}
                className="w-full bg-primary hover:bg-primary/90 rounded-xl py-5"
              >
                Nästa <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold">Lite om dig</h2>

              <div>
                <Label>Är du företag eller privatperson?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, is_company: true }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${form.is_company ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <Building2 className="h-6 w-6" />
                    <span className="text-sm font-medium">Företag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, is_company: false }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${!form.is_company ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <User className="h-6 w-6" />
                    <span className="text-sm font-medium">Privatperson</span>
                  </button>
                </div>
              </div>

              {form.is_company && (
                <div>
                  <Label>Företagsnamn</Label>
                  <Input
                    value={form.company_name}
                    onChange={e => setForm(prev => ({ ...prev, company_name: e.target.value }))}
                    className="rounded-xl mt-1"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Tillbaka
                </Button>
                <Button
                  onClick={() => isAuthenticated ? handlePublish() : setStep(3)}
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-5"
                >
                  {isAuthenticated ? (loading ? 'Publicerar...' : 'Publicera uppdrag gratis →') : 'Nästa →'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 - Guest contact (e-post först, lösenord ej obligatoriskt) */}
          {step === 3 && !isAuthenticated && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold">Sista steget – kontaktuppgifter</h2>
              <p className="text-sm text-muted-foreground">
                Vi behöver din e-post för att matcha dig med relevanta byråer. Du kan skapa konto efteråt – ditt uppdrag sparas direkt.
              </p>

              <div>
                <Label>Namn *</Label>
                <Input value={form.full_name} onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))} className="rounded-xl mt-1" required />
              </div>
              <div>
                <Label>E-post *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="rounded-xl mt-1" required />
              </div>
              <div>
                <Label>Telefon (valfritt)</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} className="rounded-xl mt-1" />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Tillbaka
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={loading || !form.full_name || !form.email}
                  className="flex-1 bg-accent hover:bg-brand-mint-hover text-accent-foreground rounded-xl py-5"
                >
                  {loading ? 'Skickar...' : (
                    <>
                      Skicka uppdrag gratis
                      <Sparkles className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 - Confirmation */}
          {step === 4 && (
            <div className="space-y-6 text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-bold">Ditt uppdrag är mottaget!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {submittedAsGuest ? (
                  <>Vi matchar dig med relevanta byråer. Bekräftelse skickas till <strong className="text-foreground">{form.email}</strong>.</>
                ) : (
                  <>Vi har skickat ett verifieringsmail till <strong className="text-foreground">{form.email}</strong>.</>
                )}
              </p>
              {submittedAsGuest && (
                <div className="rounded-xl bg-muted/40 p-4 max-w-md mx-auto text-left">
                  <p className="text-sm font-semibold mb-2">Vill du följa offerterna live?</p>
                  <p className="text-xs text-muted-foreground mb-3">Skapa ett gratis konto med samma e-post – vi kopplar leadet automatiskt.</p>
                  <Link to="/registrera">
                    <Button className="w-full rounded-xl">Skapa konto</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ProjectWizard
