import { CheckCircle } from 'lucide-react'

interface VerificationChecklistProps {
  isVerified?: boolean
  hasFskatt?: boolean
  creditCheckPassed?: boolean
  completedProjects?: number
}

const VerificationChecklist = ({ isVerified, hasFskatt, creditCheckPassed, completedProjects }: VerificationChecklistProps) => {
  const hasAny = isVerified || hasFskatt || creditCheckPassed || (completedProjects && completedProjects > 0)
  if (!hasAny) return null

  return (
    <div className="flex flex-col gap-1.5 mt-3">
      {isVerified && (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle size={14} className="text-emerald-500 shrink-0" />
          Verifierad byrå på Updro
        </div>
      )}
      {hasFskatt && (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle size={14} className="text-emerald-500 shrink-0" />
          Godkänd F-skatt & moms
        </div>
      )}
      {creditCheckPassed && (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle size={14} className="text-emerald-500 shrink-0" />
          Godkänd kredithistorik & skuldfrihet
        </div>
      )}
      {completedProjects && completedProjects > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle size={14} className="text-muted-foreground shrink-0" />
          {completedProjects} genomförda uppdrag via Updro
        </div>
      )}
    </div>
  )
}

export default VerificationChecklist
