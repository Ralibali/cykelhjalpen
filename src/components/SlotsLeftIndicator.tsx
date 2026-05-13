import { cn } from '@/lib/utils'

interface SlotsLeftIndicatorProps {
  slotsLeft: number
  className?: string
}

const SlotsLeftIndicator = ({ slotsLeft, className }: SlotsLeftIndicatorProps) => {
  if (slotsLeft <= 0) {
    return (
      <span className={cn('text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full', className)}>
        Stängd
      </span>
    )
  }

  const isUrgent = slotsLeft <= 2

  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1',
        isUrgent
          ? 'bg-orange-100 text-orange-700 border border-orange-300'
          : 'bg-muted text-muted-foreground',
        className
      )}
    >
      {isUrgent && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
        </span>
      )}
      {slotsLeft} till kan besvara
    </span>
  )
}

export default SlotsLeftIndicator
