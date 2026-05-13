import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2, CheckCircle2, Wand2, Users, Gauge } from 'lucide-react'
import { toast } from 'sonner'
import { analyzeBriefLocally, type BriefSuggestion } from '@/lib/briefAnalysis'
import { CATEGORY_ICONS, BUDGET_LABELS, START_TIME_LABELS } from '@/lib/constants'

interface AiBriefAssistantProps {
  onAccept: (brief: BriefSuggestion) => void
  initialText?: string
}

const AiBriefAssistant = ({ onAccept, initialText = '' }: AiBriefAssistantProps) => {
  const [text, setText] = useState(initialText)
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<BriefSuggestion | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)

  const analyze = async () => {
    if (text.trim().length < 10) {
      toast.error('Beskriv ditt behov med minst 10 tecken.')
      return
    }
    setLoading(true)
    setSuggestion(null)
    setUsedFallback(false)
    try {
      const { data, error } = await supabase.functions.invoke('analyze-brief', { body: { text } })
      if (error) throw error
      if (data?.brief) {
        setSuggestion(data.brief as BriefSuggestion)
      } else {
        throw new Error(data?.error || 'Inget AI-svar')
      }
    } catch (e) {
      console.warn('AI-analys misslyckades, använder lokal fallback', e)
      setSuggestion(analyzeBriefLocally(text))
      setUsedFallback(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-display font-semibold text-sm">AI-projektassistent</p>
          <p className="text-xs text-muted-foreground">Skriv kort vad du behöver – vi föreslår resten.</p>
        </div>
      </div>

      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ex: Vi behöver en ny webbplats med bokningssystem för vår klinik. Ungefär 80k budget, vill starta inom en månad."
        className="rounded-xl min-h-[100px] bg-background"
      />

      <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">{text.length} tecken</p>
        <Button
          type="button"
          onClick={analyze}
          disabled={loading || text.trim().length < 10}
          className="rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {loading ? 'Analyserar...' : 'Få AI-förslag'}
        </Button>
      </div>

      {suggestion && (
        <div className="mt-5 rounded-xl bg-card border p-4 space-y-3">
          {usedFallback && (
            <p className="text-[11px] text-muted-foreground">Lokal analys används (AI ej tillgänglig just nu).</p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold">
              {CATEGORY_ICONS[suggestion.category] || '✨'} {suggestion.category}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              💰 {BUDGET_LABELS[suggestion.budget_range] || suggestion.budget_range}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              ⏱️ {START_TIME_LABELS[suggestion.start_time] || suggestion.start_time}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs font-semibold">
              <Gauge className="h-3 w-3" /> Lead score {suggestion.lead_score}/100
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-xs font-semibold">
              <Users className="h-3 w-3" /> ~{suggestion.estimated_matching_agencies} matchande byråer
            </span>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Förslag på titel</p>
            <p className="text-sm font-medium">{suggestion.title}</p>
          </div>

          {suggestion.requirements?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Kravlista</p>
              <ul className="text-sm space-y-1">
                {suggestion.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestion.questions_for_agencies?.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Frågor byråer brukar ställa</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {suggestion.questions_for_agencies.map((q, i) => (
                  <li key={i}>• {q}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={() => { onAccept(suggestion); toast.success('Förslag används – du kan justera fritt nedan.') }}
              className="flex-1 rounded-xl"
            >
              <CheckCircle2 className="h-4 w-4" /> Använd förslag
            </Button>
            <Button type="button" variant="outline" onClick={() => setSuggestion(null)} className="rounded-xl">
              Avfärda
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AiBriefAssistant
