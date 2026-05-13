import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Gift, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { REFERRAL_CREDITS } from '@/lib/constants'
import { numWord } from '@/lib/numberWords'

const ReferralPage = () => {
  const { user, profile } = useAuth()
  const [email, setEmail] = useState('')
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const referralLink = `${window.location.origin}/registrera/byra?ref=${user?.id?.slice(0, 8)}`

  useEffect(() => {
    if (!user) return
    supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setReferrals(data) })
  }, [user])

  const handleInvite = async () => {
    if (!user || !email.trim()) return
    setLoading(true)

    const { error } = await supabase.from('referrals').insert({
      referrer_id: user.id,
      referred_email: email.trim(),
    })

    setLoading(false)
    if (error) {
      toast.error('Kunde inte skicka inbjudan.')
    } else {
      toast.success(`Inbjudan registrerad till ${email}!`)
      setEmail('')
      const { data } = await supabase.from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false })
      if (data) setReferrals(data)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Länk kopierad!')
    setTimeout(() => setCopied(false), 2000)
  }

  const completedReferrals = referrals.filter(r => r.status === 'completed').length
  const creditsEarned = completedReferrals * REFERRAL_CREDITS

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-primary/10 p-3">
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Bjud in en kollega</h1>
          <p className="text-sm text-muted-foreground">Tjäna {numWord(REFERRAL_CREDITS)} gratis leads per inbjuden byrå som registrerar sig</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold font-display text-primary">{referrals.length}</p>
          <p className="text-xs text-muted-foreground">Inbjudna</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold font-display text-emerald-600">{completedReferrals}</p>
          <p className="text-xs text-muted-foreground">Registrerade</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold font-display text-amber-600">{creditsEarned}</p>
          <p className="text-xs text-muted-foreground">Leads intjänade</p>
        </div>
      </div>

      {/* Copy link */}
      <div className="bg-card rounded-xl border p-5 mb-6">
        <Label className="mb-2 block">Din referral-länk</Label>
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="rounded-xl bg-muted text-sm" />
          <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Email invite */}
      <div className="bg-card rounded-xl border p-5 mb-6">
        <Label className="mb-2 block">Bjud in via e-post</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="kollega@byrå.se"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="rounded-xl"
          />
          <Button onClick={handleInvite} disabled={loading || !email.trim()} className="bg-primary hover:bg-primary/90">
            {loading ? 'Skickar...' : 'Bjud in'}
          </Button>
        </div>
      </div>

      {/* History */}
      {referrals.length > 0 && (
        <div>
          <h3 className="font-display font-semibold mb-3">Inbjudningshistorik</h3>
          <div className="space-y-2">
            {referrals.map(r => (
              <div key={r.id} className="bg-card rounded-xl border p-3 flex items-center justify-between">
                <span className="text-sm">{r.referred_email}</span>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                  r.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {r.status === 'completed' ? 'Registrerad' : 'Väntande'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReferralPage
