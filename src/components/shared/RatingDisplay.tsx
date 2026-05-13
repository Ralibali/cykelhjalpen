import { Sparkles, Star } from 'lucide-react'

interface RatingDisplayProps {
  avgRating: number
  reviewCount: number
  size?: 'sm' | 'md'
}

const RatingDisplay = ({ avgRating, reviewCount, size = 'sm' }: RatingDisplayProps) => {
  const isNew = reviewCount === 0

  if (isNew) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
        <Sparkles size={12} />
        Ny på Updro!
      </div>
    )
  }

  const starSize = size === 'sm' ? 14 : 16

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={starSize}
            className={i < Math.round(avgRating) ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}
          />
        ))}
      </div>
      <span className={`text-muted-foreground ${size === 'sm' ? 'text-sm' : 'text-base'}`}>
        {avgRating.toFixed(1)} ({reviewCount})
      </span>
    </div>
  )
}

export default RatingDisplay
