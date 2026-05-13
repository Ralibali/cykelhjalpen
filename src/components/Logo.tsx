import { Zap } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  return (
    <a href="/" className={`flex items-center gap-1.5 font-display font-bold ${sizes[size]} ${className}`} aria-label="Updro logotyp – marknadsplats för digitala byråer i Sverige">
      <Zap className={`${iconSizes[size]} text-primary fill-primary`} aria-hidden="true" />
      <span className="text-foreground tracking-tight">upd</span>
      <span className="text-primary tracking-tight -ml-1">ro</span>
    </a>
  )
}

export default Logo
