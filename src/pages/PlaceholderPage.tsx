import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useNoindex } from '@/hooks/useNoindex'
import { useEffect } from 'react'
import { setSEOMeta } from '@/lib/seoHelpers'

interface PlaceholderPageProps {
  title: string
  description?: string
}

const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => {
  useNoindex()
  useEffect(() => {
    setSEOMeta({
      title: `${title} | Updro`,
      description: description || 'Denna sida är under konstruktion.',
      noindex: true,
    })
  }, [title, description])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold mb-4">{title}</h1>
          <p className="text-muted-foreground">{description || 'Denna sida är under konstruktion.'}</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default PlaceholderPage
