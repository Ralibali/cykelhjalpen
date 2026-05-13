import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ProjectStep = 'created' | 'reviewing' | 'interested' | 'offers' | 'choosing' | 'review'

const STEPS = [
  {
    id: 'created' as const,
    label: 'Uppdrag publicerat',
    description: 'Ditt uppdrag är live och synligt för byråer.',
  },
  {
    id: 'reviewing' as const,
    label: 'Granskas',
    description: 'Vi säkerställer att uppdraget håller god kvalitet.',
  },
  {
    id: 'interested' as const,
    label: 'Byråer visar intresse',
    description: 'Kvalificerade byråer har börjat titta på ditt uppdrag.',
  },
  {
    id: 'offers' as const,
    label: 'Offerter mottagna',
    description: 'Du har fått offerter att jämföra.',
  },
  {
    id: 'choosing' as const,
    label: 'Jämför & välj byrå',
    description: 'Välj den byrå du vill gå vidare med.',
    cta: true,
  },
  {
    id: 'review' as const,
    label: 'Lämna omdöme',
    description: 'Hjälp andra beställare genom att betygsätta byrån.',
    cta: true,
  },
]

const STEP_ORDER: ProjectStep[] = ['created', 'reviewing', 'interested', 'offers', 'choosing', 'review']

function getStepIndex(step: ProjectStep) {
  return STEP_ORDER.indexOf(step)
}

export function calculateCurrentStep(project: any, offers: any[]): ProjectStep {
  const hasAccepted = offers.some(o => o.status === 'accepted')
  if (hasAccepted) return 'review'
  if (project.status === 'completed') return 'review'

  const pendingOffers = offers.filter(o => o.status === 'pending')
  if (pendingOffers.length > 0) return 'choosing'
  if (offers.length > 0) return 'offers'

  // Check if project has been viewed (unlocked_leads > 0 means interest)
  if ((project.view_count || 0) > 3) return 'interested'

  // Auto-approve after 2h
  const created = new Date(project.created_at).getTime()
  const twoHours = 2 * 60 * 60 * 1000
  if (Date.now() - created > twoHours) return 'interested'

  if (Date.now() - created > 5 * 60 * 1000) return 'reviewing'

  return 'created'
}

interface ProjectStepperProps {
  project: any
  offers: any[]
  compact?: boolean
  onScrollToOffers?: () => void
  onOpenReview?: () => void
}

const ProjectStepper = ({ project, offers, compact = false, onScrollToOffers, onOpenReview }: ProjectStepperProps) => {
  const currentStep = calculateCurrentStep(project, offers)
  const currentIndex = getStepIndex(currentStep)

  const stepsToShow = compact ? STEPS.filter((_, i) => {
    // In compact: show completed + current + next
    return i >= currentIndex - 1 && i <= currentIndex + 1
  }) : STEPS

  return (
    <div className="bg-card border rounded-2xl p-6">
      <h3 className="font-semibold text-foreground mb-6">
        Så funkar Updro
      </h3>
      <div className="flex flex-col gap-0">
        {stepsToShow.map((step, displayIndex) => {
          const actualIndex = STEPS.indexOf(step)
          const isCompleted = currentIndex > actualIndex
          const isCurrent = currentStep === step.id
          const isFuture = currentIndex < actualIndex

          return (
            <div key={step.id} className="flex gap-4">
              {/* Icon + vertical line */}
              <div className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                  ${isCompleted ? 'bg-accent text-accent-foreground' : ''}
                  ${isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                  ${isFuture ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {isCompleted
                    ? <Check size={16} />
                    : <span className="text-xs font-bold">{actualIndex + 1}</span>
                  }
                </div>
                {displayIndex < stepsToShow.length - 1 && (
                  <div className={`w-0.5 h-8 mt-1 ${
                    isCompleted ? 'bg-accent' : 'bg-border'
                  }`} />
                )}
              </div>
              {/* Text + CTA */}
              <div className="pb-6">
                <p className={`font-semibold text-sm ${
                  isFuture ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
                {isCurrent && step.cta && step.id === 'choosing' && onScrollToOffers && (
                  <Button
                    size="sm"
                    onClick={onScrollToOffers}
                    className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                  >
                    Välj byrå →
                  </Button>
                )}
                {isCurrent && step.cta && step.id === 'review' && onOpenReview && (
                  <Button
                    size="sm"
                    onClick={onOpenReview}
                    className="mt-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
                  >
                    Lämna omdöme →
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProjectStepper
