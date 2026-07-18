import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Home } from 'lucide-react'
import { setSEOMeta } from '@/lib/seoHelpers'
import { useNoindex } from '@/hooks/useNoindex'
import { getCurrentHost } from '@/lib/hostConfig'
import { Button } from '@/components/ui/button'
import cykelNotFound from '@/assets/cykel-404.webp'

const NotFound = () => {
  const { pathname } = useLocation()
  useNoindex()
  const host = getCurrentHost()
  const isCykel = host === 'cykelhjalpen'

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', pathname)
    setSEOMeta({
      title: `Sidan hittades inte (404) | ${isCykel ? 'Cykelhjälpen' : 'Updro'}`,
      description: 'Sidan du söker finns inte. Gå tillbaka till startsidan för att hitta rätt.',
      canonical: `${isCykel ? 'https://cykelhjalpen.se' : 'https://updro.se'}${pathname}`,
      noindex: true,
    })

    let prerenderStatus = document.querySelector('meta[name="prerender-status-code"]') as HTMLMetaElement | null
    if (!prerenderStatus) {
      prerenderStatus = document.createElement('meta')
      prerenderStatus.name = 'prerender-status-code'
      document.head.appendChild(prerenderStatus)
    }
    prerenderStatus.content = '404'
  }, [pathname, isCykel])

  if (isCykel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center max-w-4xl w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="font-display text-7xl md:text-8xl text-accent leading-none">404</p>
            <h1 className="font-display text-3xl md:text-4xl mt-3 [text-wrap:balance]">
              Den här sidan har fått punktering
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-md">
              Sidan du letar efter finns inte – kanske flyttad, kanske aldrig publicerad. Vi hjälper dig gärna tillbaka på vägen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="cta-playful rounded-full shadow-brand">
                <Link to="/"><Home className="h-4 w-4 mr-2" /> Till startsidan</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-2">
                <Link to="/skicka-arende">Få prisförslag <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="sticker rounded-[2rem] bg-card overflow-hidden max-w-md w-full mx-auto"
          >
            <img
              src={cykelNotFound}
              alt="Tealfärgad cykel med punktering och ett plåster på däcket"
              width={800}
              height={725}
              className="w-full aspect-square object-cover"
            />
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-6">
      <div className="max-w-xl text-left">
        <h1 className="font-display text-6xl md:text-8xl text-foreground leading-[1.05] tracking-tight [text-wrap:balance]">
          404 – sidan hittades inte
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-md">
          Sidan du letar efter finns inte – kanske flyttad, kanske aldrig publicerad. Härifrån kan du hitta tillbaka.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-base">
          <Link to="/" className="text-foreground font-semibold underline underline-offset-4 decoration-1 hover:decoration-2 transition-all">
            Till startsidan
          </Link>
          <Link
            to="/byraer"
            className="text-foreground font-semibold underline underline-offset-4 decoration-1 hover:decoration-2 transition-all"
          >
            Hitta byrå
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
