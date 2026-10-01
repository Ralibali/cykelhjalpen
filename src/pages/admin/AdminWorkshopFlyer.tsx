import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Bike, Check, Printer } from 'lucide-react'
import { AdminLayout } from './AdminDashboard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { SERVICE_CITIES } from '@/lib/cykelCities'
import { summarizeOpenRequestCounts, type OpenRequestCountRow } from '@/lib/openRequestCounts'
import { formatKrFromOre, useV2Pricing } from '@/lib/v2/pricing'
import { workshopFlyerShortUrl, workshopFlyerUrl } from '@/lib/workshopFlyer'

// Bara bladet skrivs ut, på ett A5-ark utan marginaler.
const PRINT_CSS = `
@page { size: A5 portrait; margin: 0; }
@media print {
  body * { visibility: hidden !important; }
  #workshop-flyer, #workshop-flyer * { visibility: visible !important; }
  #workshop-flyer { position: fixed; inset: 0; margin: 0; box-shadow: none; border: 0; border-radius: 0; }
  html, body { background: #fff !important; height: 210mm !important; overflow: hidden !important; }
}
`

const NUMBER_WORDS: Record<number, string> = { 2: 'två', 3: 'tre', 4: 'fyra', 5: 'fem' }

const freeWinsText = (n: number) => {
  if (n <= 0) return null
  if (n === 1) return 'Den första vunna kunden är gratis'
  return `De ${NUMBER_WORDS[n] ?? n} första vunna kunderna är gratis`
}

const AdminWorkshopFlyer = () => {
  const [slug, setSlug] = useState<string>(SERVICE_CITIES[0].slug)
  const [showCount, setShowCount] = useState(true)
  const [qrSvg, setQrSvg] = useState('')
  const city = SERVICE_CITIES.find((c) => c.slug === slug) ?? SERVICE_CITIES[0]
  const pricing = useV2Pricing()
  const feeKr = formatKrFromOre(pricing.amountOre)
  const url = workshopFlyerUrl(city)

  const { data: countRows } = useQuery({
    queryKey: ['cykel-open-request-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cykel_open_request_counts')
      if (error) throw error
      return (data || []) as OpenRequestCountRow[]
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const openCount = summarizeOpenRequestCounts(countRows).byCity.get(city.name) ?? 0

  useEffect(() => {
    let cancelled = false
    QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#12262b', light: '#ffffff' } })
      .then((svg) => { if (!cancelled) setQrSvg(svg) })
      .catch(() => { if (!cancelled) setQrSvg('') })
    return () => { cancelled = true }
  }, [url])

  const today = new Date().toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
  const benefits = [
    '0 kr i månaden och ingen bindningstid',
    'Gratis att registrera sig och att lämna offert',
    `${feeKr} kr exkl. moms först när kunden väljer er`,
    freeWinsText(pricing.freeWinsOnSignup),
    'Ni väljer själva vilka jobb ni svarar på',
  ].filter(Boolean) as string[]

  return (
    <AdminLayout>
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Verkstadsblad</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            A5-blad att lämna på cykelverkstäder. QR-koden leder till verkstadssidan för staden med
            kampanjtaggar (utm_campaign=workshop_recruit_{city.slug}), så att registreringarna går att följa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="flyer-city">Stad</Label>
            <Select value={slug} onValueChange={setSlug}>
              <SelectTrigger id="flyer-city" className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_CITIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Checkbox id="flyer-count" checked={showCount} onCheckedChange={(v) => setShowCount(v === true)} />
            <Label htmlFor="flyer-count" className="text-sm font-normal">Visa antal öppna ärenden</Label>
          </div>
          <Button onClick={() => window.print()} className="mt-5" disabled={!qrSvg}>
            <Printer className="h-4 w-4 mr-2" /> Skriv ut (A5)
          </Button>
        </div>
      </div>

      {/* A5 = 148 × 210 mm. Fast storlek så att förhandsvisningen motsvarar utskriften. */}
      <div
        id="workshop-flyer"
        className="mx-auto bg-white text-[#12262b] shadow-lg border rounded-md overflow-hidden flex flex-col"
        style={{ width: '148mm', height: '210mm', padding: '14mm 13mm 11mm' }}
      >
        <div className="flex items-center gap-2 font-display font-bold text-[20pt] leading-none">
          <Bike className="h-7 w-7 text-[#1a5f62]" aria-hidden="true" />
          <span>Cykel<span className="text-[#1a5f62]">hjälpen</span></span>
        </div>

        <span className="mt-6 self-start rounded-full bg-[#ca4016] px-3 py-1 text-[9pt] font-semibold uppercase tracking-wider text-white">
          Founding Partner · {city.name}
        </span>

        <h2 className="mt-3 font-display font-bold text-[24pt] leading-[1.08]">
          Fler lokala cykeljobb i {city.name} – utan månadsavgift
        </h2>

        <p className="mt-3 text-[11pt] leading-snug text-[#3d4f53]">
          Cyklister i {city.name} beskriver vad som behöver lagas och ber om pris. Ni ser ärendet och
          bestämmer själva om ni vill lämna en offert.
        </p>

        {showCount && openCount > 0 && (
          <p className="mt-4 rounded-lg bg-[#e6f0f0] px-3 py-2 text-[10.5pt] font-semibold">
            {openCount === 1 ? '1 öppet kundärende' : `${openCount} öppna kundärenden`} i {city.name} de senaste 14 dagarna
            <span className="block text-[8.5pt] font-normal text-[#3d4f53]">Per {today}</span>
          </p>
        )}

        <ul className="mt-5 space-y-2">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[11pt] leading-snug">
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#1a5f62]" strokeWidth={3} aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-end gap-5 border-t border-[#d5dcdc] pt-5">
          <div
            className="shrink-0 bg-white [&>svg]:h-full [&>svg]:w-full"
            style={{ width: '36mm', height: '36mm' }}
            aria-label={`QR-kod till ${url}`}
            role="img"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="min-w-0">
            <p className="font-display font-bold text-[14pt] leading-tight">Skanna och registrera verkstaden</p>
            <p className="mt-1 text-[9pt] text-[#3d4f53] break-all">{workshopFlyerShortUrl(city)}</p>
            <p className="mt-2 text-[9pt] text-[#3d4f53]">Frågor? info@cykelhjalpen.se</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminWorkshopFlyer
