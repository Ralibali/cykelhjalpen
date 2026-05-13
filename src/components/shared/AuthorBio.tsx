import { User } from 'lucide-react'

interface AuthorBioProps {
  name?: string
  role?: string
  description?: string
}

const AuthorBio = ({
  name = 'Updro-redaktionen',
  role = 'Redaktion',
  description = 'Updro-redaktionen skriver om digitala tjänster, byråval och branschtrender. Vi granskar marknaden och hjälper företag att hitta rätt digital partner.',
}: AuthorBioProps) => {
  return (
    <div className="flex items-start gap-4 bg-muted/40 rounded-2xl p-5 border border-border">
      <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="font-display font-semibold text-foreground text-sm">{name}</p>
        <p className="text-xs text-muted-foreground mb-1.5">{role}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

export default AuthorBio
