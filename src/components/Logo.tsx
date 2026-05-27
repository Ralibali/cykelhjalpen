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
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
}

const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  return (
    <a href="/" className={`flex items-center gap-2 font-display font-bold ${sizes[size]} ${className}`} aria-label="Cykelhjälpen logotyp – jämför cykelverkstäder i Linköping">
      <img src="/logo-icon.png" alt="" className={`${iconSizes[size]} object-contain`} aria-hidden="true" />
      <span className="text-foreground tracking-tight">Cykel</span>
      <span className="text-primary tracking-tight -ml-1">hjälpen</span>
    </a>
  )
}

export default Logo
