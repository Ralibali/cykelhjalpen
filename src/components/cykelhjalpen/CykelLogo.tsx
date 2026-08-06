import { Bike } from 'lucide-react'
import { Link } from 'react-router-dom'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'text-lg sm:text-xl', md: 'text-lg sm:text-2xl', lg: 'text-3xl sm:text-4xl' }
const iconSizes = { sm: 'h-5 w-5', md: 'h-5 w-5 sm:h-6 sm:w-6', lg: 'h-7 w-7 sm:h-8 sm:w-8' }

const CykelLogo = ({ size = 'md', className = '' }: LogoProps) => (
  <Link
    to="/"
    className={`flex shrink-0 items-center gap-1.5 sm:gap-2 font-display font-bold ${sizes[size]} ${className}`}
    aria-label="Cykelhjälpen logotyp"
  >
    <Bike className={`shrink-0 ${iconSizes[size]} text-primary`} aria-hidden="true" />
    <span className="text-foreground tracking-tight whitespace-nowrap">
      Cykel<span className="text-primary">hjälpen</span>
    </span>
  </Link>
)

export default CykelLogo
