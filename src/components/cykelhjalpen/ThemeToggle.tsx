import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useT } from '@/lib/i18n'

type Theme = 'light' | 'dark'

const getInitial = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('cykel-theme') as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const t = useT()

  useEffect(() => {
    setTheme(getInitial())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('cykel-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? t('Byt till ljust tema') : t('Byt till mörkt tema')}
      className="inline-flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-full border-2 border-[hsl(var(--ink))] bg-card hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
