import { Share2, Linkedin, Facebook, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareButtonsProps {
  url: string
  title: string
}

const ShareButtons = ({ url, title }: ShareButtonsProps) => {
  const encoded = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    {
      label: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    },
    {
      label: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    },
    {
      label: 'X',
      icon: Twitter,
      href: `https://x.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
    },
  ]

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {}
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium mr-1">Dela:</span>
      {links.map(({ label, icon: Icon, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Dela på ${label}`}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        >
          <Icon className="h-3.5 w-3.5" />
        </a>
      ))}
      {typeof navigator !== 'undefined' && navigator.share && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleNativeShare}
          aria-label="Dela"
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

export default ShareButtons
