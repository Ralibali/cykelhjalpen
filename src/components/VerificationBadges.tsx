import { ShieldCheck, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerificationBadgesProps {
  isBankIdVerified?: boolean
  isPhoneVerified?: boolean
  className?: string
}

const VerificationBadges = ({ isBankIdVerified, isPhoneVerified, className }: VerificationBadgesProps) => {
  if (!isBankIdVerified && !isPhoneVerified) return null

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {isBankIdVerified && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
          <ShieldCheck className="h-3 w-3" />
          BankID-verifierad
        </span>
      )}
      {isPhoneVerified && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
          <Smartphone className="h-3 w-3" />
          Mobilverifierad
        </span>
      )}
    </div>
  )
}

export default VerificationBadges
