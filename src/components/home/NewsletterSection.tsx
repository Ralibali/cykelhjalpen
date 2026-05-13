import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const NewsletterSection = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Ange en giltig e-postadress')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: trimmed, source: 'homepage' })
    setLoading(false)
    if (error) {
      if (error.code === '23505') {
        toast.info('Du prenumererar redan!')
        setDone(true)
      } else {
        toast.error('Något gick fel. Försök igen.')
      }
      return
    }
    setDone(true)
    toast.success('Tack! Du är nu prenumerant.')
  }

  return (
    <section className="py-16 bg-[#F8FAFF] dark:bg-muted/20">
      <motion.div
        className="container max-w-xl mx-auto text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Håll dig uppdaterad
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Få tips om byråval, digitala trender och nya guider direkt i din inkorg. Ingen spam – vi skickar max ett par gånger i månaden.
        </p>

        {done ? (
          <div className="flex items-center justify-center gap-2 text-brand-mint font-semibold">
            <CheckCircle className="h-5 w-5" />
            Tack! Vi hörs snart.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="din@epost.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-xl"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl px-5 font-semibold"
            >
              {loading ? '...' : (
                <>Prenumerera <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </form>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Vi delar aldrig din e-post med tredje part. Läs vår{' '}
          <a href="/integritetspolicy" className="text-primary hover:underline">integritetspolicy</a>.
        </p>
      </motion.div>
    </section>
  )
}

export default NewsletterSection
