import { Bike } from 'lucide-react'
import { Link } from 'react-router-dom'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }
const iconSizes = { sm: 'h-5 w-5', md: 'h-6 w-6', lg: 'h-8 w-8' }

const CykelLogo = ({ size = 'md', className = '' }: LogoProps) => (
  <Link
    to="/"
    className={`flex items-center gap-2 font-display font-bold ${sizes[size]} ${className}`}
    aria-label="Cykelhjälpen logotyp"
  >
    <Bike className={`${iconSizes[size]} text-primary`} aria-hidden="true" />
    <span className="text-foreground tracking-tight">
      Cykel<span className="text-primary">hjälpen</span>
    </span>
  </Link>
)

export default CykelLogo
