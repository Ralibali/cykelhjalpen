import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import { supabase } from '@/integrations/supabase/client'
import { ADMIN_NAV } from './adminNav'
import { Bike, Wrench } from 'lucide-react'

interface Hit { id: string; label: string; sub: string; href: string; kind: 'request' | 'workshop' }

const AdminCommandPalette = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) { setHits([]); return }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      const like = `%${term}%`
      const [requests, workshops] = await Promise.all([
        supabase
          .from('bike_repair_requests')
          .select('id, view_token, customer_name, customer_email, city, repair_category')
          .or(`customer_name.ilike.${like},customer_email.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('workshops')
          .select('id, company_name, email, city')
          .or(`company_name.ilike.${like},email.ilike.${like}`)
          .limit(5),
      ])
      if (cancelled) return
      setHits([
        ...((requests.data || []).map((r) => ({
          id: r.id,
          label: r.customer_name,
          sub: `${r.repair_category} · ${r.city}`,
          href: r.view_token ? `/mitt-arende/${r.view_token}` : '/admin/cykelarenden',
          kind: 'request' as const,
        }))),
        ...((workshops.data || []).map((w) => ({
          id: w.id,
          label: w.company_name,
          sub: `${w.email} · ${w.city}`,
          href: `/admin/verkstader/${w.id}`,
          kind: 'workshop' as const,
        }))),
      ])
    }, 250)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query])

  const go = (href: string) => {
    onOpenChange(false)
    setQuery('')
    navigate(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Sök sida, kund eller verkstad…"
      />
      <CommandList>
        <CommandEmpty>Inga träffar.</CommandEmpty>
        {hits.length > 0 && (
          <>
            <CommandGroup heading="Träffar">
              {hits.map((hit) => (
                <CommandItem key={`${hit.kind}-${hit.id}`} value={`${hit.label} ${hit.sub}`} onSelect={() => go(hit.href)}>
                  {hit.kind === 'request' ? <Bike className="mr-2 h-4 w-4" /> : <Wrench className="mr-2 h-4 w-4" />}
                  <span className="truncate">{hit.label}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{hit.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        {ADMIN_NAV.map((group) => (
          <CommandGroup key={group.title} heading={group.title}>
            {group.items.map((item) => (
              <CommandItem key={item.href} value={`${item.label} ${item.keywords || ''}`} onSelect={() => go(item.href)}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}

export default AdminCommandPalette
