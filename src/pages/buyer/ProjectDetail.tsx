import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Check, X, Phone, Mail, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BUDGET_LABELS, START_TIME_LABELS, CATEGORY_STYLES } from '@/lib/constants'
import { timeAgo, formatPrice } from '@/lib/dateUtils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import ProjectStepper from '@/components/shared/ProjectStepper'
import BuyerDecisionCard from '@/components/shared/BuyerDecisionCard'
import RatingDisplay from '@/components/shared/RatingDisplay'
import VerificationChecklist from '@/components/shared/VerificationChecklist'

const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState<any>(null)
  const [offers, setOffers] = useState<any[]>([])
  const [confirmOffer, setConfirmOffer] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const offersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
      if (proj) setProject(proj)

      const { data: offs } = await supabase
        .from('offers')
        .select('*, profiles!offers_supplier_id_fkey(full_name, company_name, city, avatar_url, email, phone), supplier_profiles:supplier_id(avg_rating, review_count, is_verified, has_fskatt, credit_check_passed, completed_projects, contact_name, contact_phone, contact_email)')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
      if (offs) setOffers(offs)
    }
    fetchData()
  }, [id])

  const handleAccept = async (offerId: string) => {
    const { error } = await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId)
    if (!error) {
      await supabase.from('offers').update({ status: 'declined' }).eq('project_id', id).neq('id', offerId)
      await supabase.from('projects').update({ status: 'closed' }).eq('id', id)
      toast.success('Offert accepterad! 🎉')
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'accepted' } : { ...o, status: 'declined' }))
      setProject((prev: any) => prev ? { ...prev, status: 'closed' } : prev)
    }
    setConfirmOffer(null)
  }

  const handleDecline = async (offerId: string) => {
    await supabase.from('offers').update({ status: 'declined' }).eq('id', offerId)
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'declined' } : o))
    toast.info('Offert avböjd')
  }

  const scrollToOffers = () => {
    offersRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleProjectClosed = () => {
    setProject((prev: any) => prev ? { ...prev, status: 'closed' } : prev)
    setOffers(prev => prev.map(o => o.status === 'pending' ? { ...o, status: 'declined' } : o))
  }

  const handleDeleteProject = async () => {
    if (!id) return
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    setDeleting(false)
    if (error) {
      toast.error(error.message || 'Kunde inte ta bort uppdraget')
    } else {
      toast.success('Uppdraget har tagits bort')
      navigate('/dashboard/buyer/uppdrag')
    }
    setShowDeleteConfirm(false)
  }

  if (!project) return <div className="animate-pulse h-40 bg-muted rounded-xl" />

  return (
    <>
      <div className="max-w-5xl">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2">
            <div className="mb-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${CATEGORY_STYLES[project.category] || ''}`}>{project.category}</span>
                  <h1 className="font-display text-2xl font-bold">{project.title}</h1>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Ta bort uppdrag"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <span>{BUDGET_LABELS[project.budget_range] || 'Ej angiven'}</span>
                <span>{START_TIME_LABELS[project.start_time] || ''}</span>
                <span>{project.city}</span>
                <span>{timeAgo(project.created_at)}</span>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-5 mb-8">
              <h3 className="font-semibold mb-2">Beskrivning</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
            </div>

            {/* Decision card */}
            <BuyerDecisionCard
              project={project}
              offers={offers}
              onScrollToOffers={scrollToOffers}
              onProjectClosed={handleProjectClosed}
            />

            <div ref={offersRef}>
              <h2 className="font-display text-lg font-semibold mb-4">
                Intresserade byråer ({offers.length})
              </h2>

              {offers.length === 0 ? (
                <div className="bg-card rounded-xl border p-6 text-center">
                  <p className="text-muted-foreground">Inga intresserade byråer ännu. Byråer matchar vanligtvis inom 24 timmar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {offers.map(offer => {
                    const sp = offer.supplier_profiles
                    return (
                      <div key={offer.id} className="bg-card rounded-xl border p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{offer.profiles?.company_name || offer.profiles?.full_name}</h3>
                            <p className="text-xs text-muted-foreground">{offer.profiles?.city} · {timeAgo(offer.created_at)}</p>
                            {sp && (
                              <div className="mt-2">
                                <RatingDisplay avgRating={sp.avg_rating || 0} reviewCount={sp.review_count || 0} />
                              </div>
                            )}
                          </div>
                          <span className={`text-xs font-semibold rounded-full px-2 py-1 ${
                            offer.status === 'accepted' ? 'bg-accent/10 text-accent' :
                            offer.status === 'declined' ? 'bg-destructive/10 text-destructive' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {offer.status === 'pending' ? 'Ny' : offer.status === 'accepted' ? 'Accepterad' : 'Avböjd'}
                          </span>
                        </div>

                        {/* Verification checklist */}
                        {sp && (
                          <VerificationChecklist
                            isVerified={sp.is_verified}
                            hasFskatt={sp.has_fskatt}
                            creditCheckPassed={sp.credit_check_passed}
                            completedProjects={sp.completed_projects}
                          />
                        )}

                        <h4 className="font-medium mt-3">{offer.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="font-bold text-lg text-primary">{formatPrice(offer.price)}</span>
                          {offer.delivery_weeks && <span className="text-muted-foreground">{offer.delivery_weeks} veckor</span>}
                          {offer.payment_plan && <span className="text-muted-foreground capitalize">{offer.payment_plan}</span>}
                        </div>

                        {/* Contact info when accepted */}
                        {offer.status === 'accepted' && offer.profiles && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Kontaktuppgifter</p>
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary border-2 border-accent">
                                {(sp?.contact_name || offer.profiles.full_name || '?')[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {sp?.contact_name || offer.profiles.full_name}
                                </p>
                                {(sp?.contact_phone || offer.profiles.phone) && (
                                  <a
                                    href={`tel:${sp?.contact_phone || offer.profiles.phone}`}
                                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                                  >
                                    <Phone size={12} />
                                    {sp?.contact_phone || offer.profiles.phone}
                                  </a>
                                )}
                                <a
                                  href={`mailto:${sp?.contact_email || offer.profiles.email}`}
                                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <Mail size={12} />
                                  {sp?.contact_email || offer.profiles.email}
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {offer.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" onClick={() => setConfirmOffer(offer)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                              <Check className="mr-1 h-3 w-3" /> Acceptera
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDecline(offer.id)}>
                              <X className="mr-1 h-3 w-3" /> Avböj
                            </Button>
                            <Link to={`/dashboard/buyer/chatt?project=${id}&user=${offer.supplier_id}`}>
                              <Button size="sm" variant="outline">💬 Chatta</Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Stepper */}
          <div className="hidden md:block">
            <div className="sticky top-24">
              <ProjectStepper
                project={project}
                offers={offers}
                onScrollToOffers={scrollToOffers}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirm accept dialog */}
      <Dialog open={!!confirmOffer} onOpenChange={() => setConfirmOffer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acceptera offert?</DialogTitle>
            <DialogDescription>
              Acceptera offert från {confirmOffer?.profiles?.company_name || confirmOffer?.profiles?.full_name}?
              Övriga offerter markeras som avböjda.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmOffer(null)}>Avbryt</Button>
            <Button onClick={() => handleAccept(confirmOffer.id)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Bekräfta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ta bort uppdrag?</DialogTitle>
            <DialogDescription>
              Vill du verkligen ta bort "{project?.title}"? Alla tillhörande offerter tas också bort. Detta kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Avbryt</Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleting}>
              {deleting ? 'Tar bort…' : 'Ta bort'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ProjectDetail
